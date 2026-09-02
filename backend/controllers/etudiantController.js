// etudiantController.js 
const supabase = require('../supabaseClient');
const multer = require('multer');
const { logHistorique, FIELD_LABELS, buildDiffDescription } = require('../utils/historique');
const upload = multer({ storage: multer.memoryStorage() });


const getEtudiants = async (req, res) => {
  const archived = req.query.archived === 'true';

 
  let query = supabase
    .from('inscriptions')
        .select(`
      *,
      etudiant:etudiant_id(*),
      formation:formation_id(nom),
      niveau:niveau_id(id, nom),
            groups(nom, jours_formation, heure_formation, date_fin)
    `)
    .eq('archived', archived)
    .order('created_at', { ascending: false });

  if (req.query.formation_id) {
    query = query.eq('formation_id', req.query.formation_id);
  }
  if (req.query.annee_scolaire) {
    query = query.eq('annee_scolaire', req.query.annee_scolaire);
  }
  if (req.query.niveau_id) {
    query = query.eq('niveau_id', req.query.niveau_id);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const LOCKED_FIELDS = ['statut', 'first_try', 'second_try', 'third_try', 'statut_scolarite', 'formation_id', 'niveau_id'];
const updateInscription = async (req, res) => {
  const { id } = req.params;
  const updates = {};

  const { data: before } = await supabase.from('inscriptions').select('*').eq('id', id).single();

  if (LOCKED_FIELDS.some(f => f in req.body)) {
    const { data: insc } = await supabase
      .from('inscriptions').select('groups(date_fin)').eq('id', id).single();
    const dateFin = insc?.groups?.date_fin;
    if (dateFin) {
      const limit = new Date(dateFin);
      limit.setDate(limit.getDate() + 30);
      if (new Date() > limit) {
        return res.status(403).json({ error: 'Ce groupe est terminé depuis plus de 30 jours : modification impossible.' });
      }
    }
  }

  if ('source' in req.body)        updates.source        = req.body.source || null;
  if ('registered_by' in req.body) updates.registered_by = req.body.registered_by || null;
  if ('statut' in req.body)        updates.statut        = req.body.statut;
  if ('first_try' in req.body)     updates.first_try     = req.body.first_try || null;
  if ('second_try' in req.body)    updates.second_try    = req.body.second_try || null;
  if ('third_try' in req.body)     updates.third_try     = req.body.third_try || null;
    if ('formation_id' in req.body)  updates.formation_id  = req.body.formation_id || null;
  if ('niveau_id' in req.body)     updates.niveau_id     = req.body.niveau_id || null;
  if ('statut_scolarite' in req.body) {
    updates.statut_scolarite = req.body.statut_scolarite || 'en_cours';
    updates.abandonne_at = updates.statut_scolarite === 'abandonne' ? new Date().toISOString() : null;
  }
  if ('en_promotion' in req.body)     updates.en_promotion     = !!req.body.en_promotion;
  if ('prix_promotion' in req.body)   updates.prix_promotion   = req.body.en_promotion ? (req.body.prix_promotion || null) : null;
if ('statut' in req.body && req.body.statut !== 'confirmed') {
  updates.group_id = null;
}
  console.log('updateInscription id:', id);
  console.log('updateInscription updates:', updates);

  const { data, error } = await supabase
    .from('inscriptions')
    .update(updates)
    .eq('id', id)
    .select('*, etudiant:etudiant_id(nom, prenom)')
    .single();

  console.log('supabase error:', error);
  console.log('supabase data:', data);

  if (error) return res.status(500).json({ error: error.message });

  const { abandonne_at, ...updatesForLog } = updates;
  const changes = buildDiffDescription(before, updatesForLog);
  if (changes.length > 0) {
    await logHistorique({
      req, perimetre: 'admin', action: 'modification', entite: 'etudiant', entite_id: id,
      description: `a modifié l'inscription de ${data.etudiant?.nom} ${data.etudiant?.prenom} — ${changes.join(', ')}`,
      details: { changes },
    });
  }

  res.json(data);
};
const archiveInscription = async (req, res) => {
  const { id } = req.params;
  const { annee_scolaire } = req.body || {};

  const { data: current, error: fetchErr } = await supabase
    .from('inscriptions').select('group_id, groups(date_fin)').eq('id', id).single();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  const today = new Date().toISOString().slice(0, 10);
  if (current.group_id && (!current.groups?.date_fin || current.groups.date_fin > today)) {
    return res.status(400).json({ error: "Ce groupe n'est pas encore terminé — impossible d'archiver cet étudiant." });
  }

  const updates = { archived: true };
  if (annee_scolaire?.trim()) updates.annee_scolaire = annee_scolaire.trim();

  const { data, error } = await supabase
    .from('inscriptions')
    .update(updates)
    .eq('id', id)
    .select('*, etudiant:etudiant_id(nom, prenom)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await logHistorique({
    req, perimetre: 'admin', action: 'modification', entite: 'etudiant', entite_id: id,
    description: `a archivé l'inscription de ${data.etudiant?.nom} ${data.etudiant?.prenom} (année ${data.annee_scolaire || '—'})`,
  });

  res.json(data);
};

const archiveMultipleInscriptions = async (req, res) => {
  const { ids, annee_scolaire } = req.body || {};

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Aucun étudiant sélectionné.' });
  }

  const { data: selected, error: fetchErr } = await supabase
    .from('inscriptions')
    .select('id, group_id, groups(date_fin)')
    .in('id', ids);
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  const today = new Date().toISOString().slice(0, 10);
  const notFinished = selected.filter(i => i.group_id && (!i.groups?.date_fin || i.groups.date_fin > today));
  if (notFinished.length > 0) {
    return res.status(400).json({
      error: `${notFinished.length} étudiant(s) sélectionné(s) appartiennent à un groupe non terminé. Désélectionnez-les avant d'archiver.`,
    });
  }

  const updates = { archived: true };
  if (annee_scolaire?.trim()) updates.annee_scolaire = annee_scolaire.trim();

  const { data, error } = await supabase
    .from('inscriptions')
    .update(updates)
    .in('id', ids)
    .select('*, etudiant:etudiant_id(nom, prenom)');

  if (error) return res.status(500).json({ error: error.message });

  const noms = data.map((i) => `${i.etudiant?.nom} ${i.etudiant?.prenom}`);
  const preview = noms.slice(0, 5).join(', ') + (noms.length > 5 ? `, +${noms.length - 5} autre(s)` : '');

  await logHistorique({
    req, perimetre: 'admin', action: 'modification', entite: 'etudiant',
    description: `a archivé ${data.length} inscription(s) (année ${annee_scolaire || '—'}) — ${preview}`,
    details: { noms },
  });

  res.json({ success: true, count: data.length, data });
};
const restoreInscription = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('inscriptions')
    .update({ archived: false })
    .eq('id', id)
    .select('*, etudiant:etudiant_id(nom, prenom), formation:formation_id(nom), niveau:niveau_id(nom)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const contexte = data.niveau?.nom
    ? `${data.formation?.nom} — ${data.niveau.nom}`
    : data.formation?.nom;

  await logHistorique({
    req,
    perimetre: 'admin',
    action: 'modification',
    entite: 'inscription',
    entite_id: id,
    description: `a restauré l'inscription de ${data.etudiant?.nom} ${data.etudiant?.prenom} (${contexte})`,
  });

  res.json(data);
};
const createEtudiant = async (req, res) => {
  const {
    nom, prenom, telephone, email, adresse,
    niveau_scolaire, date_naissance, lieu_naissance, wilaya,
    formation_id, niveau_id, source, registered_by,
  } = req.body;

    let addedByName = null;
if (req.user?.id) {
  const { data: adminUser, error: adminErr } = await supabase
    .from('users')
    .select('nom')
    .eq('id', req.user.id)
    .single();
  if (adminErr) console.error('added_by lookup error:', adminErr);
  addedByName = adminUser?.nom ?? null;
} else {
  addedByName = 'En ligne';
}

  let photo = null;
  let piece_identite = null;

  if (req.files?.photo?.[0]) {
    const file = req.files.photo[0];
    const ext = file.originalname.split('.').pop() || 'jpg';
    const path = `photos/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('etudiants-docs')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (uploadError) return res.status(500).json({ error: uploadError.message });
    photo = supabase.storage.from('etudiants-docs').getPublicUrl(path).data.publicUrl;
  }

  if (req.files?.piece_identite?.[0]) {
    const file = req.files.piece_identite[0];
    const ext = file.mimetype.split('/')[1] || 'jpg';
    const path = `pieces/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('etudiants-docs')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) return res.status(500).json({ error: error.message });
    piece_identite = supabase.storage.from('etudiants-docs').getPublicUrl(path).data.publicUrl;
  }

  const { data: etudiant, error: etudiantErr } = await supabase
    .from('etudiants')
    .insert({ nom, prenom, telephone, email, adresse, niveau_scolaire, date_naissance, lieu_naissance, wilaya, photo, piece_identite })
    .select()
    .single();

  if (etudiantErr) return res.status(500).json({ error: etudiantErr.message });

    const { data: inscription, error: insErr } = await supabase
    .from('inscriptions')
    .insert({
      etudiant_id: etudiant.id,
      formation_id, niveau_id: niveau_id || null, source, registered_by,
      added_by: addedByName,
      date_inscription: new Date().toISOString().split('T')[0],
      statut: 'pending',
    })
    .select('*, formation:formation_id(nom), niveau:niveau_id(nom)')
    .single();

  if (insErr) return res.status(500).json({ error: insErr.message });

  if (req.user?.id) {
    const contexte = inscription.niveau?.nom
      ? `${inscription.formation?.nom} — ${inscription.niveau.nom}`
      : inscription.formation?.nom;

    await logHistorique({
      req, perimetre: 'admin', action: 'creation', entite: 'etudiant', entite_id: etudiant.id,
      description: `a ajouté l'étudiant ${etudiant.nom} ${etudiant.prenom} (${contexte || 'aucune formation'})`,
    });
  }

  res.json({ etudiant, inscription });
};

const updateEtudiant = async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, telephone, email, adresse, niveau_scolaire, date_naissance, lieu_naissance, wilaya } = req.body;
  const updates = { nom, prenom, telephone, email, adresse, niveau_scolaire, date_naissance, lieu_naissance, wilaya };

  if (updates.date_naissance === '') updates.date_naissance = null;

  const { data: before } = await supabase.from('etudiants').select('*').eq('id', id).single();
  console.log('updateEtudiant id:', id);
  console.log('updateEtudiant body:', req.body);
  console.log('updateEtudiant files:', req.files);
  if (req.files?.photo?.[0]) {
    const file = req.files.photo[0];
    const ext = file.originalname.split('.').pop() || 'jpg';
    const path = `photos/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('etudiants-docs')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    console.log('photo upload error:', uploadError); // 👈 here
    if (uploadError) return res.status(500).json({ error: uploadError.message });
    updates.photo = supabase.storage.from('etudiants-docs').getPublicUrl(path).data.publicUrl;
  }

  if (req.files?.piece_identite?.[0]) {
    const file = req.files.piece_identite[0];
    const ext = file.originalname.split('.').pop() || 'jpg';
    const path = `pieces/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('etudiants-docs')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    console.log('piece_identite upload error:', uploadError); // 👈 and here
    if (uploadError) return res.status(500).json({ error: uploadError.message });
    updates.piece_identite = supabase.storage.from('etudiants-docs').getPublicUrl(path).data.publicUrl;
  }

  const { data, error } = await supabase
    .from('etudiants')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
   console.log('updateEtudiant supabase error:', error);
  console.log('updateEtudiant supabase data:', data);
  if (error) return res.status(500).json({ error: error.message });

  const changes = buildDiffDescription(before, updates);
  if (changes.length > 0) {
    await logHistorique({
      req, perimetre: 'admin', action: 'modification', entite: 'etudiant', entite_id: id,
      description: `a modifié l'étudiant ${data.nom} ${data.prenom} — ${changes.join(', ')}`,
      details: { changes },
    });
  }

  res.json(data);
};
const deleteEtudiant = async (req, res) => {
  const { id } = req.params;

  const { data: toDelete } = await supabase
    .from('inscriptions')
    .select('*, etudiant:etudiant_id(nom, prenom)')
    .eq('id', id)
    .single();

  // deleting the inscription (id = inscription id)
  const { error } = await supabase
    .from('inscriptions')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  await logHistorique({
    req, perimetre: 'admin', action: 'suppression', entite: 'etudiant', entite_id: id,
    description: `a supprimé l'inscription de ${toDelete?.etudiant?.nom} ${toDelete?.etudiant?.prenom}`,
  });

  res.json({ success: true });
};

const getGroupsByFormation = async (req, res) => {
  const { formation_id } = req.params;
  const { niveau_id } = req.query;

  const { data: formation, error: formationErr } = await supabase
    .from('formations')
    .select('capacite_groupe, a_niveaux')
    .eq('id', formation_id)
    .single();

  if (formationErr) return res.status(500).json({ error: formationErr.message });

  let query = supabase
    .from('groups')
    .select(`
      id, nom, jours_formation, heure_formation, statut, date_debut, date_fin, niveau_id,
      teachers ( users ( nom, prenom ) ),
      inscriptions ( id, archived ),
      sessions ( id, statut )
    `)
    .eq('formation_id', formation_id)
    .eq('archived', false);

  if (formation.a_niveaux && niveau_id) query = query.eq('niveau_id', niveau_id);

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  const today = new Date().toISOString().slice(0, 10);

  const enriched = data.map(g => {
    const nb_etudiants = (g.inscriptions || []).filter(i => !i.archived).length;
    const nb_sessions  = (g.sessions || []).filter(s => s.statut === 'effectuee').length;
    const termine = !!g.date_fin && g.date_fin < today;

    return {
      id: g.id,
      nom: g.nom,
      jours_formation: g.jours_formation,
      heure_formation: g.heure_formation,
      date_debut: g.date_debut,
      date_fin: g.date_fin,
      statut: g.statut,
      teacher: g.teachers?.users ? { nom: g.teachers.users.nom, prenom: g.teachers.users.prenom } : null,
      nb_etudiants,
      nb_sessions,
      capacite: formation.capacite_groupe,
      termine,
    };
  });

  res.json(enriched);
};
const assignGroup = async (req, res) => {
  const { id } = req.params;
  const { group_id, niveau_id } = req.body;

  const { data: current } = await supabase
    .from('inscriptions').select('groups(date_fin)').eq('id', id).single();
  const dateFin = current?.groups?.date_fin;
  if (dateFin) {
    const limit = new Date(dateFin);
    limit.setDate(limit.getDate() + 30);
    if (new Date() > limit) {
      return res.status(403).json({ error: 'Ce groupe est terminé depuis plus de 30 jours : modification impossible.' });
    }
  }

  const { data: before } = await supabase
    .from('inscriptions')
    .select('etudiant:etudiant_id(nom, prenom), groups:group_id(nom)')
    .eq('id', id)
    .single();
  const ancienGroupe = before?.groups?.nom || null;

  const updates = { group_id: group_id || null };
  if (niveau_id !== undefined) updates.niveau_id = niveau_id || null;

  const { data, error } = await supabase
    .from('inscriptions')
    .update(updates)
    .eq('id', id)
    .select('*, etudiant:etudiant_id(nom, prenom), groups:group_id(nom)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const nom = `${data.etudiant?.nom} ${data.etudiant?.prenom}`;
  let description;
  if (group_id && ancienGroupe) {
    description = `a changé ${nom} du groupe "${ancienGroupe}" vers "${data.groups?.nom}"`;
  } else if (group_id) {
    description = `a affecté ${nom} au groupe "${data.groups?.nom}"`;
  } else {
    description = `a retiré ${nom} du groupe "${ancienGroupe || '—'}"`;
  }

  await logHistorique({
    req, perimetre: 'admin', action: 'modification', entite: 'etudiant', entite_id: id,
    description,
  });

  res.json(data);
};
const getInscriptionStatutOptions = async (req, res) => {
  const { data, error } = await supabase.rpc('get_inscription_status_values');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const logImpressionFiche = async (req, res) => {
  const { ids } = req.body; // tableau d'UUIDs d'inscriptions

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids requis' });
  }

  const { data: inscriptions, error } = await supabase
    .from('inscriptions')
    .select('id, etudiant:etudiant_id(nom, prenom)')
    .in('id', ids);

  if (error) return res.status(500).json({ error: error.message });

  const noms = inscriptions.map(i => `${i.etudiant?.nom} ${i.etudiant?.prenom}`);
  const description = ids.length === 1
    ? `a imprimé la fiche d'inscription de ${noms[0] || '—'}`
    : `a imprimé ${ids.length} fiches d'inscription — ${noms.slice(0, 5).join(', ')}${noms.length > 5 ? `, +${noms.length - 5} autre(s)` : ''}`;

  await logHistorique({
    req, perimetre: 'admin', action: 'modification', entite: 'etudiant',
    entite_id: ids.length === 1 ? ids[0] : null,
    description,
    details: { ids },
  });

  res.json({ success: true });
};

module.exports = { getEtudiants, updateInscription, createEtudiant, updateEtudiant, deleteEtudiant, upload, getGroupsByFormation, assignGroup, archiveInscription, archiveMultipleInscriptions, restoreInscription, getInscriptionStatutOptions, logImpressionFiche };