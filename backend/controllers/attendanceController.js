const supabase = require('../supabaseClient');
const { logHistorique } = require('../utils/historique');

const getAttendance = async (req, res) => {
  const { group_id } = req.query;
  const { data: sessions } = await supabase
    .from('sessions').select('id').eq('group_id', group_id);
  const sessionIds = (sessions ?? []).map(s => s.id);
  if (!sessionIds.length) return res.json([]);

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .in('session_id', sessionIds);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const STATUT_LABEL = { present: 'présent', absent: 'absent', retard: 'retard' };

const createAttendance = async (req, res) => {
  const { session_id, etudiant_id, statut } = req.body;
  const { data, error } = await supabase
    .from('attendance')
    .insert({ session_id, etudiant_id, statut })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (req.user?.role === 'admin') {
    const [{ data: session }, { data: etudiant }] = await Promise.all([
      supabase.from('sessions').select('date, groups(nom, formations:formation_id(nom), niveau:niveau_id(nom))').eq('id', session_id).single(),
      supabase.from('etudiants').select('nom, prenom').eq('id', etudiant_id).single(),
    ]);
    const contexte = session?.groups?.niveau?.nom
      ? `${session.groups.formations?.nom} — ${session.groups.niveau.nom}`
      : session?.groups?.formations?.nom;
    await logHistorique({
      req, perimetre: 'admin', action: 'modification', entite: 'pointage', entite_id: data.id,
      description: `a pointé ${etudiant?.nom ?? ''} ${etudiant?.prenom ?? ''} comme ${STATUT_LABEL[statut] ?? statut} (séance du ${session?.date ?? '—'}, groupe "${session?.groups?.nom ?? '—'}", ${contexte ?? '—'})`,
    });
  }

  res.json(data);
};

const updateAttendance = async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;

  const { data: before } = await supabase
    .from('attendance')
    .select('statut, session_id, etudiant:etudiant_id(nom, prenom), sessions(date, groups(nom, formations:formation_id(nom), niveau:niveau_id(nom)))')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('attendance')
    .update({ statut })
    .eq('id', id)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (req.user?.role === 'admin') {
    const nomEtudiant = before?.etudiant ? `${before.etudiant.nom} ${before.etudiant.prenom}` : 'étudiant';
    const groupe = before?.sessions?.groups;
    const contexte = groupe?.niveau?.nom ? `${groupe.formations?.nom} — ${groupe.niveau.nom}` : groupe?.formations?.nom;
    await logHistorique({
      req, perimetre: 'admin', action: 'modification', entite: 'pointage', entite_id: id,
      description: `a modifié le pointage de ${nomEtudiant} (séance du ${before?.sessions?.date ?? '—'}, groupe "${groupe?.nom ?? '—'}", ${contexte ?? '—'}) : ${STATUT_LABEL[before?.statut] ?? before?.statut ?? '—'} → ${STATUT_LABEL[statut] ?? statut}`,
    });
  }

  res.json(data);
};
const deleteAttendance = async (req, res) => {
  const { id } = req.params;

  const { data: before } = await supabase
    .from('attendance')
    .select('statut, etudiant:etudiant_id(nom, prenom), sessions(date, groups(nom, formations:formation_id(nom), niveau:niveau_id(nom)))')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('attendance').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  if (req.user?.role === 'admin') {
    const nomEtudiant = before?.etudiant ? `${before.etudiant.nom} ${before.etudiant.prenom}` : 'étudiant';
    const groupe = before?.sessions?.groups;
    const contexte = groupe?.niveau?.nom ? `${groupe.formations?.nom} — ${groupe.niveau.nom}` : groupe?.formations?.nom;
    await logHistorique({
      req, perimetre: 'admin', action: 'modification', entite: 'pointage', entite_id: id,
      description: `a effacé le pointage (${STATUT_LABEL[before?.statut] ?? before?.statut ?? '—'}) de ${nomEtudiant} (séance du ${before?.sessions?.date ?? '—'}, groupe "${groupe?.nom ?? '—'}", ${contexte ?? '—'})`,
    });
  }

  res.json({ success: true });
};

const batchAttendance = async (req, res) => {
  const { session_id, entries } = req.body; // entries: [{ etudiant_id, statut }]
  if (!session_id || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'session_id et entries sont requis.' });
  }

  const { data: existing, error: exErr } = await supabase
    .from('attendance')
    .select('id, etudiant_id')
    .eq('session_id', session_id);
  if (exErr) return res.status(500).json({ error: exErr.message });

  const existingMap = {};
  (existing ?? []).forEach(a => { existingMap[a.etudiant_id] = a.id; });

  const toInsert = [];
  const toUpdate = [];
  const toDeleteIds = [];

  for (const e of entries) {
    const existingId = existingMap[e.etudiant_id];
    if (!e.statut) {
      if (existingId) toDeleteIds.push(existingId);
    } else if (existingId) {
      toUpdate.push({ id: existingId, statut: e.statut });
    } else {
      toInsert.push({ session_id, etudiant_id: e.etudiant_id, statut: e.statut });
    }
  }

  if (toDeleteIds.length) {
    const { error } = await supabase.from('attendance').delete().in('id', toDeleteIds);
    if (error) return res.status(500).json({ error: error.message });
  }
  if (toInsert.length) {
    const { error } = await supabase.from('attendance').insert(toInsert);
    if (error) return res.status(500).json({ error: error.message });
  }
  for (const u of toUpdate) {
    const { error } = await supabase.from('attendance').update({ statut: u.statut }).eq('id', u.id);
    if (error) return res.status(500).json({ error: error.message });
  }

  const { error: finErr } = await supabase
    .from('sessions')
    .update({ finalized_at: new Date().toISOString() })
    .eq('id', session_id);
  if (finErr) return res.status(500).json({ error: finErr.message });

  if (req.user?.role === 'admin') {
    const { data: session } = await supabase
      .from('sessions').select('date, groups(nom, formations:formation_id(nom), niveau:niveau_id(nom))').eq('id', session_id).single();
    const nbPresent = entries.filter(e => e.statut === 'present' || e.statut === 'retard').length;
    const contexte = session?.groups?.niveau?.nom
      ? `${session.groups.formations?.nom} — ${session.groups.niveau.nom}`
      : session?.groups?.formations?.nom;
    await logHistorique({
      req, perimetre: 'admin', action: 'modification', entite: 'pointage', entite_id: session_id,
      description: `a finalisé le pointage de la séance du ${session?.date ?? '—'} du groupe "${session?.groups?.nom ?? '—'}" (${contexte ?? '—'}) — ${nbPresent}/${entries.length} présent(s)`,
    });
  }

  res.json({ success: true });
};
// Liste les étudiants éligibles au rattrapage pour une formation donnée :
// confirmés, dans un groupe différent du groupe hôte, dont le groupe est
// actif OU archivé depuis moins d'1 an (approximé via date_fin).
const getRattrapageCandidates = async (req, res) => {
  const { formation_id, exclude_group_id } = req.query;
  if (!formation_id) return res.status(400).json({ error: 'formation_id requis' });

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = oneYearAgo.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('inscriptions')
    .select(`
      id, etudiant_id, group_id,
      etudiant:etudiant_id(id, nom, prenom),
      groups(id, nom, archived, date_fin)
    `)
    .eq('formation_id', formation_id)
    .eq('statut', 'confirmed')
    .eq('archived', false);
  if (error) return res.status(500).json({ error: error.message });

  const eligible = (data ?? []).filter((i) => {
    if (!i.groups) return true;
    if (exclude_group_id && i.group_id === exclude_group_id) return false;
    if (!i.groups.archived) return true;
    return i.groups.date_fin && i.groups.date_fin >= oneYearAgoStr;
  });

  res.json(eligible.map((i) => ({
    inscription_id: i.id,
    etudiant_id: i.etudiant_id,
    nom: i.etudiant?.nom,
    prenom: i.etudiant?.prenom,
     groupe_origine: i.groups?.nom ?? 'Sans groupe',
  })));
};

// Crée un enregistrement de rattrapage dans le groupe hôte (session_id fourni),
// pour un étudiant qui n'est pas inscrit dans ce groupe.
const createRattrapage = async (req, res) => {
  const { session_id, etudiant_id } = req.body;
  if (!session_id || !etudiant_id) {
    return res.status(400).json({ error: 'session_id et etudiant_id requis' });
  }

  // Un prof ne peut ajouter un rattrapage que sur une séance de son propre
  // groupe, et seulement le jour même (même règle que le reste du pointage).
  if (req.user?.role === 'teacher') {
    const { data: teacher } = await supabase
      .from('teachers').select('id').eq('user_id', req.user.id).single();
    const { data: session } = await supabase
      .from('sessions').select('date, groups(teacher_id)').eq('id', session_id).single();
    if (!session || session.groups?.teacher_id !== teacher?.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Algiers' });
    if (session.date?.slice(0, 10) !== today) {
      return res.status(403).json({ error: 'Cette séance ne peut plus être modifiée (jour passé)' });
    }
  }

  const { data, error } = await supabase
    .from('attendance')
    .insert({ session_id, etudiant_id, statut: 'rattrapage' })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  if (req.user?.role === 'admin') {
    const [{ data: session }, { data: etudiant }] = await Promise.all([
      supabase.from('sessions').select('date, groups(nom)').eq('id', session_id).single(),
      supabase.from('etudiants').select('nom, prenom').eq('id', etudiant_id).single(),
    ]);
    await logHistorique({
      req, perimetre: 'admin', action: 'modification', entite: 'pointage', entite_id: data.id,
      description: `a ajouté ${etudiant?.nom ?? ''} ${etudiant?.prenom ?? ''} en rattrapage (séance du ${session?.date ?? '—'}, groupe "${session?.groups?.nom ?? '—'}")`,
    });
  }

  res.json(data);
};

// Retire un rattrapage.
const deleteRattrapage = async (req, res) => {
  const { id } = req.params;

  const { data: before } = await supabase
    .from('attendance')
    .select('etudiant_id, session_id, etudiant:etudiant_id(nom, prenom), sessions(date, groups(nom, teacher_id))')
    .eq('id', id)
    .single();

  if (req.user?.role === 'teacher') {
    const { data: teacher } = await supabase
      .from('teachers').select('id').eq('user_id', req.user.id).single();
    if (!before || before.sessions?.groups?.teacher_id !== teacher?.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Algiers' });
    if (before.sessions?.date?.slice(0, 10) !== today) {
      return res.status(403).json({ error: 'Ce rattrapage ne peut plus être retiré (jour passé)' });
    }
  }

  const { error } = await supabase.from('attendance').delete().eq('id', id).eq('statut', 'rattrapage');
  if (error) return res.status(500).json({ error: error.message });

  if (req.user?.role === 'admin' && before) {
    const nomEtudiant = before?.etudiant ? `${before.etudiant.nom} ${before.etudiant.prenom}` : 'étudiant';
    const groupe = before?.sessions?.groups;
    await logHistorique({
      req, perimetre: 'admin', action: 'modification', entite: 'pointage', entite_id: id,
      description: `a retiré ${nomEtudiant} du rattrapage (séance du ${before?.sessions?.date ?? '—'}, groupe "${groupe?.nom ?? '—'}")`,
    });
  }

  res.json({ success: true });
};
// Retire un étudiant de la liste des rattrapages d'un groupe : supprime
// TOUTES ses marques de rattrapage dans les séances de ce groupe.
const deleteRattrapageStudent = async (req, res) => {
  const { group_id, etudiant_id } = req.query;
  if (!group_id || !etudiant_id) {
    return res.status(400).json({ error: 'group_id et etudiant_id requis' });
  }

  const { data: sessions } = await supabase
    .from('sessions').select('id').eq('group_id', group_id);
  const sessionIds = (sessions ?? []).map(s => s.id);
  if (!sessionIds.length) return res.json({ success: true, deleted: 0 });

  const { data: toDelete, error: findErr } = await supabase
    .from('attendance')
    .select('id')
    .in('session_id', sessionIds)
    .eq('etudiant_id', etudiant_id)
    .eq('statut', 'rattrapage');
  if (findErr) return res.status(500).json({ error: findErr.message });

  const ids = (toDelete ?? []).map(r => r.id);
  if (ids.length) {
    const { error } = await supabase.from('attendance').delete().in('id', ids);
    if (error) return res.status(500).json({ error: error.message });
  }

  if (req.user?.role === 'admin' && ids.length) {
    try {
      const [{ data: etudiant }, { data: group }] = await Promise.all([
        supabase.from('etudiants').select('nom, prenom').eq('id', etudiant_id).single(),
        supabase.from('groups').select('nom').eq('id', group_id).single(),
      ]);
      await logHistorique({
        req, perimetre: 'admin', action: 'modification', entite: 'pointage', entite_id: group_id,
        description: `a retiré ${etudiant?.nom ?? ''} ${etudiant?.prenom ?? ''} de la liste des rattrapages (${ids.length} marque(s) supprimée(s), groupe "${group?.nom ?? '—'}")`,
      });
    } catch (logErr) {
      console.error('logHistorique failed:', logErr);
    }
  }

  res.json({ success: true, deleted: ids.length });
};

// Badge : total de présences (présent + rattrapage) par étudiant, tous groupes confondus.
const getPresenceCounts = async (req, res) => {
  const { etudiant_ids } = req.query;
  const ids = (etudiant_ids || '').split(',').filter(Boolean);
  if (!ids.length) return res.json({});

  const { data, error } = await supabase
    .from('attendance')
    .select('etudiant_id')
    .in('statut', ['present', 'retard', 'rattrapage'])
    .in('etudiant_id', ids);
  if (error) return res.status(500).json({ error: error.message });

  const counts = {};
  (data ?? []).forEach((r) => { counts[r.etudiant_id] = (counts[r.etudiant_id] ?? 0) + 1; });
  res.json(counts);
};
// Liste les rattrapages enregistrés dans les séances de ce groupe (groupe hôte),
// avec le nom de l'étudiant et la date de la séance concernée.
const getGroupRattrapages = async (req, res) => {
  const { group_id } = req.query;
  if (!group_id) return res.status(400).json({ error: 'group_id requis' });

  const { data: sessions } = await supabase
    .from('sessions').select('id, date').eq('group_id', group_id);
  const sessionIds = (sessions ?? []).map((s) => s.id);
  if (!sessionIds.length) return res.json([]);

  const { data, error } = await supabase
    .from('attendance')
    .select('id, session_id, etudiant_id, statut, etudiant:etudiant_id(nom, prenom)')
    .in('session_id', sessionIds)
    .eq('statut', 'rattrapage');
  if (error) return res.status(500).json({ error: error.message });

  const sessionDateById = {};
  (sessions ?? []).forEach((s) => { sessionDateById[s.id] = s.date; });

  res.json((data ?? []).map((r) => ({
    id: r.id,
    session_id: r.session_id,
    date: sessionDateById[r.session_id],
    etudiant_id: r.etudiant_id,
    nom: r.etudiant?.nom,
    prenom: r.etudiant?.prenom,
  })));
};
module.exports = {
  getAttendance, createAttendance, updateAttendance, deleteAttendance, batchAttendance,
  getRattrapageCandidates, createRattrapage, deleteRattrapage, deleteRattrapageStudent, getPresenceCounts,
  getGroupRattrapages,
};