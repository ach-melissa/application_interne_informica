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

module.exports = { getAttendance, createAttendance, updateAttendance, deleteAttendance, batchAttendance };