const bcrypt = require('bcryptjs');
const supabase = require('../supabaseClient');

const SAFE_FIELDS = 'id, nom, prenom, email, nom_utilisateur, telephone, date_naissance, role, created_at, archived, photo_path';
const AVATAR_BUCKET = 'avatars';
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 7; // 7 jours

// Remplace photo_path par une URL signée temporaire (bucket privé)
const withPhotoUrl = async (userRow) => {
  if (!userRow) return userRow;
  if (!userRow.photo_path) return { ...userRow, photo_url: null };

  const { data, error } = await supabase
    .storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(userRow.photo_path, SIGNED_URL_EXPIRY);

  return { ...userRow, photo_url: error ? null : data.signedUrl };
};

// ============================================================
// GET /api/users/me
// ============================================================
const getMe = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(SAFE_FIELDS)
      .eq('id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(await withPhotoUrl(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PATCH /api/users/me
// ============================================================
const updateMe = async (req, res) => {
  try {
    const { nom, prenom, email, nom_utilisateur, telephone, date_naissance } = req.body;

    const patch = {};
    if (nom            !== undefined) patch.nom            = nom;
    if (prenom         !== undefined) patch.prenom         = prenom;
    if (email          !== undefined) patch.email          = email;
    if (nom_utilisateur !== undefined) patch.nom_utilisateur = nom_utilisateur;
    if (telephone      !== undefined) patch.telephone      = telephone;
    if (date_naissance !== undefined) patch.date_naissance = date_naissance;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', req.user.id)
      .select(SAFE_FIELDS)
      .single();

    if (error) {
      if (error.code === '23505') {
        const field = error.message.includes('email') ? 'Cet email' : "Ce nom d'utilisateur";
        return res.status(409).json({ message: `${field} est déjà utilisé` });
      }
      console.error('updateMe:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }

    res.json(await withPhotoUrl(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PUT /api/users/me/password
// ============================================================
const changeMyPassword = async (req, res) => {
  try {
    const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;

    if (!ancien_mot_de_passe || !nouveau_mot_de_passe) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }
    if (nouveau_mot_de_passe.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }

    const { data: userRow, error: fetchErr } = await supabase
      .from('users')
      .select('mot_de_passe')
      .eq('id', req.user.id)
      .single();

    if (fetchErr || !userRow) return res.status(404).json({ message: 'Utilisateur introuvable' });

    const match = await bcrypt.compare(ancien_mot_de_passe, userRow.mot_de_passe);
    if (!match) return res.status(401).json({ message: 'Mot de passe actuel incorrect' });

    const hashed = await bcrypt.hash(nouveau_mot_de_passe, 10);

    const { error: updateErr } = await supabase
      .from('users')
      .update({ mot_de_passe: hashed })
      .eq('id', req.user.id);

    if (updateErr) {
      console.error('changeMyPassword:', updateErr);
      return res.status(500).json({ message: 'Erreur serveur' });
    }

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// POST /api/users/me/photo — upload / remplace la photo de profil
// (multer fournit req.file en mémoire via upload.single('photo'))
// ============================================================
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

const uploadMyPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu' });
    if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Format non supporté (jpg, png ou webp uniquement)' });
    }
    if (req.file.size > MAX_SIZE) {
      return res.status(400).json({ message: 'Le fichier ne doit pas dépasser 5 Mo' });
    }

    // Supprime les anciennes photos de l'utilisateur (évite l'accumulation de fichiers)
    const { data: existing } = await supabase.storage.from(AVATAR_BUCKET).list(req.user.id);
    if (existing?.length) {
      await supabase.storage
        .from(AVATAR_BUCKET)
        .remove(existing.map((f) => `${req.user.id}/${f.name}`));
    }

    const ext = req.file.mimetype.split('/')[1];
    const path = `${req.user.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (uploadErr) {
      console.error('uploadMyPhoto:', uploadErr);
      return res.status(500).json({ message: "Erreur lors de l'upload" });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ photo_path: path })
      .eq('id', req.user.id)
      .select(SAFE_FIELDS)
      .single();

    if (error) {
      console.error('uploadMyPhoto (db):', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }

    res.json(await withPhotoUrl(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// DELETE /api/users/me/photo — supprimer la photo de profil
// ============================================================
const deleteMyPhoto = async (req, res) => {
  try {
    const { data: existing } = await supabase.storage.from(AVATAR_BUCKET).list(req.user.id);
    if (existing?.length) {
      await supabase.storage
        .from(AVATAR_BUCKET)
        .remove(existing.map((f) => `${req.user.id}/${f.name}`));
    }

    const { data, error } = await supabase
      .from('users')
      .update({ photo_path: null })
      .eq('id', req.user.id)
      .select(SAFE_FIELDS)
      .single();

    if (error) return res.status(500).json({ message: 'Erreur serveur' });
    res.json(await withPhotoUrl(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const getUsers = async (req, res) => {
  try {
    let query = supabase
      .from('users')
      .select(SAFE_FIELDS)
      .order('created_at', { ascending: false });

    if (req.query.archived !== undefined) {
      query = query.eq('archived', req.query.archived === 'true');
    }
    if (req.query.role) query = query.eq('role', req.query.role);
    
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const withPhotos = await Promise.all(data.map(withPhotoUrl));
    res.json(withPhotos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PATCH /api/users/:id/archive — désactive un utilisateur
// ============================================================
const archiveUser = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ archived: true })
      .eq('id', req.params.id)
      .select(SAFE_FIELDS)
      .single();

    if (error) return res.status(500).json({ message: 'Erreur serveur' });
    res.json(await withPhotoUrl(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PATCH /api/users/:id/restore — réactive un utilisateur
// ============================================================
const restoreUser = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ archived: false })
      .eq('id', req.params.id)
      .select(SAFE_FIELDS)
      .single();

    if (error) return res.status(500).json({ message: 'Erreur serveur' });
    res.json(await withPhotoUrl(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
const createUser = async (req, res) => {
  try {
    const { nom, prenom, email, nom_utilisateur, mot_de_passe, telephone, date_naissance, role } = req.body;

    if (!nom || !prenom || !email || !nom_utilisateur || !mot_de_passe || !role) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    if (req.file) {
      if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
        return res.status(400).json({ message: 'Format non supporté (jpg, png ou webp uniquement)' });
      }
      if (req.file.size > MAX_SIZE) {
        return res.status(400).json({ message: 'Le fichier ne doit pas dépasser 5 Mo' });
      }
    }

    const hashed = await bcrypt.hash(mot_de_passe, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        nom, prenom, email, nom_utilisateur,
        mot_de_passe: hashed,
        telephone: telephone || null,
        date_naissance: date_naissance || null,
        role,
      })
      .select(SAFE_FIELDS)
      .single();

    if (error) {
      if (error.code === '23505') {
        const field = error.message.includes('email') ? 'Cet email' : "Ce nom d'utilisateur";
        return res.status(409).json({ message: `${field} est déjà utilisé` });
      }
      console.error('createUser:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }

    if (!req.file) {
      return res.status(201).json(await withPhotoUrl(newUser));
    }

    // Upload de la photo maintenant qu'on a l'id du nouvel utilisateur
    const ext = req.file.mimetype.split('/')[1];
    const path = `${newUser.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (uploadErr) {
      console.error('createUser (photo upload):', uploadErr);
      return res.status(201).json(await withPhotoUrl(newUser)); // user créé, photo échouée — pas bloquant
    }

    const { data: withPhoto, error: photoErr } = await supabase
      .from('users')
      .update({ photo_path: path })
      .eq('id', newUser.id)
      .select(SAFE_FIELDS)
      .single();

    if (photoErr) {
      console.error('createUser (photo db):', photoErr);
      return res.status(201).json(await withPhotoUrl(newUser));
    }

    res.status(201).json(await withPhotoUrl(withPhoto));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PATCH /api/users/:id — modifier un utilisateur (admin)
// ============================================================
const updateUser = async (req, res) => {
  try {
    const { nom, prenom, email, nom_utilisateur, telephone, date_naissance, role, mot_de_passe } = req.body;

    const patch = {};
    if (nom             !== undefined) patch.nom             = nom;
    if (prenom          !== undefined) patch.prenom          = prenom;
    if (email           !== undefined) patch.email           = email;
    if (nom_utilisateur !== undefined) patch.nom_utilisateur = nom_utilisateur;
    if (telephone       !== undefined) patch.telephone       = telephone;
    if (date_naissance  !== undefined) patch.date_naissance  = date_naissance;
    if (role            !== undefined) patch.role            = role;
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', req.params.id)
      .select(SAFE_FIELDS)
      .single();

    if (error) {
      if (error.code === '23505') {
        const field = error.message.includes('email') ? 'Cet email' : "Ce nom d'utilisateur";
        return res.status(409).json({ message: `${field} est déjà utilisé` });
      }
      console.error('updateUser:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }

    res.json(await withPhotoUrl(data));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// DELETE /api/users/:id — supprimer un utilisateur (admin)
// ============================================================
const deleteUser = async (req, res) => {
  try {
    const { data: existing } = await supabase.storage.from(AVATAR_BUCKET).list(req.params.id);
    if (existing?.length) {
      await supabase.storage
        .from(AVATAR_BUCKET)
        .remove(existing.map((f) => `${req.params.id}/${f.name}`));
    }

    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    if (error) {
      console.error('deleteUser:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }

    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
module.exports = {
  getMe, updateMe, changeMyPassword, uploadMyPhoto, deleteMyPhoto,
  getUsers, createUser, updateUser, deleteUser, archiveUser, restoreUser,
};