const supabase = require('../supabaseClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const { identifier, password } = req.body;

  console.log('--- Tentative de login ---');
  console.log('identifier reçu:', JSON.stringify(identifier));

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Identifiant et mot de passe requis' });
  }

  try {
let { data: user, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', identifier)
  .maybeSingle();

if (error) {
  console.error('Erreur Supabase (email):', error);
  return res.status(500).json({ message: 'Erreur serveur' });
}

if (!user) {
  const { data: userByUsername, error: error2 } = await supabase
    .from('users')
    .select('*')
    .eq('nom_utilisateur', identifier)
    .maybeSingle();

  if (error2) {
    console.error('Erreur Supabase (username):', error2);
    return res.status(500).json({ message: 'Erreur serveur' });
  }

  user = userByUsername;
}

    if (!user) {
      return res.status(401).json({ message: 'Utilisateur introuvable' });
    }

    if (user.role === 'etudiant') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const validPassword = await bcrypt.compare(password, user.mot_de_passe);
    if (!validPassword) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { login };