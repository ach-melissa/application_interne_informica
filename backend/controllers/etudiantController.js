// etudiantController.js 
const supabase = require('../supabaseClient');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const getEtudiants = async (req, res) => {
  const { data, error } = await supabase
    .from('inscriptions')
    .select(`
      *,
      etudiant:etudiant_id(*),
      formation:formation_id(nom)
    `)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const updateInscription = async (req, res) => {
  const { id } = req.params;
  const { source, registered_by, statut, first_try, second_try, third_try } = req.body;

  const updates = { 
  source: source || null, 
  registered_by: registered_by || null, 
  statut, 
  first_try: first_try || null, 
  second_try: second_try || null, 
  third_try: third_try || null 
};
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
const createEtudiant = async (req, res) => {
  const {
    nom, prenom, telephone, email, adresse,
    niveau_scolaire, date_naissance, lieu_naissance,
    formation_id, source, registered_by,
  } = req.body;

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
    photo = supabase.storage.from('etudiants-docs').getPublicUrl(path).data.publicUrl; // 👈 photo not updates.photo
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
    .insert({ nom, prenom, telephone, email, adresse, niveau_scolaire, date_naissance, lieu_naissance, photo, piece_identite })
    .select()
    .single();

  if (etudiantErr) return res.status(500).json({ error: etudiantErr.message });

  const { data: inscription, error: insErr } = await supabase
    .from('inscriptions')
    .insert({
      etudiant_id: etudiant.id,
      formation_id, source, registered_by,
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
  const { nom, prenom, telephone, email, adresse, niveau_scolaire, date_naissance, lieu_naissance } = req.body;
  const updates = { nom, prenom, telephone, email, adresse, niveau_scolaire, date_naissance, lieu_naissance };
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

module.exports = { getEtudiants, updateInscription, createEtudiant, updateEtudiant, deleteEtudiant, upload };