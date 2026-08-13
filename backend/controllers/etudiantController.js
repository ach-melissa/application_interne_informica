// etudiantController.js 
const supabase = require('../supabaseClient');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });


const getEtudiants = async (req, res) => {
  const archived = req.query.archived === 'true';

  let query = supabase
    .from('inscriptions')
    .select(`
      *,
      etudiant:etudiant_id(*),
      formation:formation_id(nom),
      groups(nom, jours_formation, heure_formation)
    `)
    .eq('archived', archived)
    .order('created_at', { ascending: false });

  if (req.query.formation_id) {
    query = query.eq('formation_id', req.query.formation_id);
  }
  if (req.query.annee_scolaire) {
    query = query.eq('annee_scolaire', req.query.annee_scolaire);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const updateInscription = async (req, res) => {
  const { id } = req.params;
  const updates = {};

  if ('source' in req.body)        updates.source        = req.body.source || null;
  if ('registered_by' in req.body) updates.registered_by = req.body.registered_by || null;
  if ('statut' in req.body)        updates.statut        = req.body.statut;
  if ('first_try' in req.body)     updates.first_try     = req.body.first_try || null;
  if ('second_try' in req.body)    updates.second_try    = req.body.second_try || null;
  if ('third_try' in req.body)     updates.third_try     = req.body.third_try || null;
  if ('formation_id' in req.body)  updates.formation_id  = req.body.formation_id || null;
  if ('statut_scolarite' in req.body) updates.statut_scolarite = req.body.statut_scolarite || 'en_cours';
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
    .select()
    .single();

  console.log('supabase error:', error);
  console.log('supabase data:', data);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
const archiveInscription = async (req, res) => {
  const { id } = req.params;
const { annee_scolaire } = req.body || {};

  const updates = { archived: true };
  if (annee_scolaire?.trim()) updates.annee_scolaire = annee_scolaire.trim();

  const { data, error } = await supabase
    .from('inscriptions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const restoreInscription = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('inscriptions')
    .update({ archived: false })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
const createEtudiant = async (req, res) => {
  const {
    nom, prenom, telephone, email, adresse,
    niveau_scolaire, date_naissance, lieu_naissance, wilaya,
    formation_id, source, registered_by,
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
  addedByName = 'En ligne'; // 👈 au lieu de rester null
}

  if (nom && prenom && formation_id) {
    const { data: duplicate, error: dupErr } = await supabase
      .from('inscriptions')
      .select('id, etudiant:etudiant_id!inner(nom, prenom)')
      .eq('formation_id', formation_id)
      .eq('archived', false)
      .ilike('etudiant.nom', nom.trim())
      .ilike('etudiant.prenom', prenom.trim());

    if (dupErr) return res.status(500).json({ error: dupErr.message });
    if (duplicate?.length > 0) {
      return res.status(400).json({ error: 'Cet étudiant est déjà inscrit dans cette formation.' });
    }
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
      formation_id, source, registered_by,
      added_by: addedByName,
      date_inscription: new Date().toISOString().split('T')[0],
      statut: 'pending',
    })
    .select()
    .single();

  if (insErr) return res.status(500).json({ error: insErr.message });
  res.json({ etudiant, inscription });
};

const updateEtudiant = async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, telephone, email, adresse, niveau_scolaire, date_naissance, lieu_naissance, wilaya } = req.body;
  const updates = { nom, prenom, telephone, email, adresse, niveau_scolaire, date_naissance, lieu_naissance, wilaya };
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
  res.json(data);
 
};
const deleteEtudiant = async (req, res) => {
  const { id } = req.params;

  // deleting the inscription (id = inscription id)
  const { error } = await supabase
    .from('inscriptions')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

const getGroupsByFormation = async (req, res) => {
  const { formation_id } = req.params;

  const { data, error } = await supabase
    .from('groups')
    .select('id, nom, jours_formation, heure_formation')
    .eq('formation_id', formation_id)
    .eq('archived', false);   // 👈 ajouté

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const assignGroup = async (req, res) => {
  const { id } = req.params;
  const { group_id } = req.body;

  const { data, error } = await supabase
    .from('inscriptions')
    .update({ group_id: group_id || null })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
module.exports = { getEtudiants, updateInscription, createEtudiant, updateEtudiant, deleteEtudiant, upload, getGroupsByFormation, assignGroup, archiveInscription, restoreInscription };