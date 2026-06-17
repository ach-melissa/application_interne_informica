const supabase = require('../supabaseClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const { identifier, password } = req.body;

  try {
    // STEP 1: search by email
    const { data: byEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', identifier)
      .single();

    // STEP 2: if not found, search by username
    let user = byEmail;

    if (!user) {
      const { data: byUsername } = await supabase
        .from('users')
        .select('*')
        .eq('nom_utilisateur', identifier)
        .single();

      user = byUsername;
    }

    // STEP 3: check user exists
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur introuvable' });
    }

    // STEP 4: block student
    if (user.role === 'etudiant') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // STEP 5: check password
    const validPassword = await bcrypt.compare(password, user.mot_de_passe);

    if (!validPassword) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    // STEP 6: generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // STEP 7: response
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