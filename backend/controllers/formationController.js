const supabase = require('../supabaseClient');

const getFormations = async (req, res) => {
  const { data, error } = await supabase
    .from('formations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const result = await Promise.all(
    data.map(async (f) => {
      const { count: nb_groupes } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true })
        .eq('formation_id', f.id)
        .eq('archived', false);

      const { count: nb_etudiants } = await supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('formation_id', f.id)
        .eq('statut', 'confirmed');

      return { ...f, nb_groupes: nb_groupes ?? 0, nb_etudiants: nb_etudiants ?? 0 };
    })
  );

  res.json(result);
};
const getFormationById = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('formations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return res.status(404).json({ error: 'Formation introuvable.' });
  res.json(data);
};
const createFormation = async (req, res) => {
const { nom, prix, heures, description, capacite_groupe, a_niveaux, type_duree, prix_uniforme, duree_uniforme, type_duree_uniforme, statut } = req.body;
  if (type_duree && !['heures', 'seances'].includes(type_duree)) {
    return res.status(400).json({ error: "type_duree doit être 'heures' ou 'seances'." });
  }
  if (!nom || !nom.trim()) {
    return res.status(400).json({ error: 'Le nom de la formation est obligatoire.' });
  }
  if (prix === undefined || prix === null || isNaN(prix) || Number(prix) < 0) {
    return res.status(400).json({ error: 'Le prix doit être un nombre valide.' });
  }
  if (heures === undefined || heures === null || isNaN(heures) || Number(heures) <= 0) {
    return res.status(400).json({ error: "Le nombre d'heures doit être un nombre valide." });
  }
 if (capacite_groupe === undefined || capacite_groupe === null || isNaN(capacite_groupe) || Number(capacite_groupe) <= 0) {
  return res.status(400).json({ error: "La capacité est obligatoire et doit être un nombre valide." });
}
  const { data, error } = await supabase
    .from('formations')
      .insert([{
  nom: nom.trim(),
  prix: Number(prix),
  heures: Number(heures),
  description: description?.trim() || null,
  capacite_groupe: Number(capacite_groupe),
  a_niveaux: !!a_niveaux,
  type_duree: type_duree || 'heures',
  prix_uniforme: prix_uniforme === undefined ? true : !!prix_uniforme,
  duree_uniforme: duree_uniforme === undefined ? true : !!duree_uniforme,
  type_duree_uniforme: type_duree_uniforme === undefined ? true : !!type_duree_uniforme,
  statut: statut === 'non_active' ? 'non_active' : 'active',
}])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
};

const updateFormation = async (req, res) => {
  const { id } = req.params;
const { nom, prix, heures, description, capacite_groupe, a_niveaux, type_duree, prix_uniforme, duree_uniforme, type_duree_uniforme, statut } = req.body;
  if (type_duree && !['heures', 'seances'].includes(type_duree)) {
    return res.status(400).json({ error: "type_duree doit être 'heures' ou 'seances'." });
  }

  if (!nom || !nom.trim()) {
    return res.status(400).json({ error: 'Le nom de la formation est obligatoire.' });
  }
  if (prix === undefined || prix === null || isNaN(prix) || Number(prix) < 0) {
    return res.status(400).json({ error: 'Le prix doit être un nombre valide.' });
  }
   if (heures === undefined || heures === null || isNaN(heures) || Number(heures) <= 0) {
    return res.status(400).json({ error: "Le nombre d'heures doit être un nombre valide." });
  }
  if (capacite_groupe === undefined || capacite_groupe === null || isNaN(capacite_groupe) || Number(capacite_groupe) <= 0) {
    return res.status(400).json({ error: "La capacité est obligatoire et doit être un nombre valide." });
  }

 const { data, error } = await supabase
    .from('formations')
 .update({
  nom: nom.trim(),
  prix: Number(prix),
  heures: Number(heures),
  description: description?.trim() || null,
  capacite_groupe: Number(capacite_groupe),
  a_niveaux: !!a_niveaux,
  type_duree: type_duree || 'heures',
  prix_uniforme: prix_uniforme === undefined ? true : !!prix_uniforme,
  duree_uniforme: duree_uniforme === undefined ? true : !!duree_uniforme,
  type_duree_uniforme: type_duree_uniforme === undefined ? true : !!type_duree_uniforme,
  statut: statut === 'non_active' ? 'non_active' : 'active',
})
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const archiveFormation = async (req, res) => {
  const { id } = req.params;
  const { annee_scolaire } = req.body;

  const updates = { archived: true };
  if (annee_scolaire?.trim()) updates.annee_scolaire = annee_scolaire.trim();

  const { data, error } = await supabase
    .from('formations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const restoreFormation = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('formations')
    .update({ archived: false })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const deleteFormation = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('formations')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

// GET /api/formations/:id/periods
const getFormationPeriods = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('formation_payment_periods')
    .select('*')
    .eq('formation_id', id)
    .order('numero', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// PUT /api/formations/:id/periods — remplace la liste entière (le tableau vient de l'éditeur)
const setFormationPeriods = async (req, res) => {
  const { id } = req.params;
  const { periods } = req.body; // [{ jours_offset, montant }, ...]

  if (!Array.isArray(periods)) {
    return res.status(400).json({ error: 'periods doit être un tableau.' });
  }
  for (const p of periods) {
    if (p.jours_offset === undefined || p.jours_offset === null || isNaN(p.jours_offset)) {
      return res.status(400).json({ error: 'Chaque période doit avoir un décalage en jours valide.' });
    }
    if (p.montant === undefined || p.montant === null || isNaN(p.montant) || Number(p.montant) <= 0) {
      return res.status(400).json({ error: 'Chaque période doit avoir un montant valide.' });
    }
  }
if (periods.length > 0) {
    const { data: formation, error: fErr } = await supabase
      .from('formations')
      .select('prix, prix_etudiant')
      .eq('id', id)
      .single();
    if (fErr) return res.status(500).json({ error: fErr.message });

    const expectedTotal = Number(formation.prix_etudiant ?? formation.prix ?? 0);
    const sum = periods.reduce((s, p) => s + Number(p.montant), 0);
    if (Math.abs(sum - expectedTotal) > 0.01) {
      return res.status(400).json({
        error: `Le total des tranches (${sum.toLocaleString('fr-FR')} DA) doit être égal au prix de la formation (${expectedTotal.toLocaleString('fr-FR')} DA).`,
      });
    }
  }
  const { error: delErr } = await supabase.from('formation_payment_periods').delete().eq('formation_id', id);
  if (delErr) return res.status(500).json({ error: delErr.message });

  if (periods.length === 0) return res.json([]);

  const rows = periods.map((p, idx) => ({
    formation_id: id,
    numero: idx + 1,
    jours_offset: Number(p.jours_offset),
    montant: Number(p.montant),
  }));

  const { data, error } = await supabase.from('formation_payment_periods').insert(rows).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
module.exports = { getFormations, getFormationById, createFormation, updateFormation, archiveFormation, restoreFormation, deleteFormation, getFormationPeriods, setFormationPeriods };