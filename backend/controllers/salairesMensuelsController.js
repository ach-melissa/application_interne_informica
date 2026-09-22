const supabase = require('../supabaseClient');

const calculStatut = (montantPaye, montantNet) => {
  if (montantPaye <= 0) return 'non_paye';
  if (montantPaye < montantNet) return 'partiel';
  return 'paye';
};

// ============================================================
// SALAIRES MENSUELS — get one (employe_id + mois + annee)
// ============================================================
// Renvoie null (200) si aucun enregistrement : ça veut dire que le mois
// n'a jamais été validé, le frontend retombe alors sur le calcul auto.
const getSalaireMensuel = async (req, res) => {
  try {
    const { employe_id, mois, annee } = req.query;
    if (!employe_id || !mois || !annee) {
      return res.status(400).json({ message: 'employe_id, mois et annee sont requis' });
    }

    const { data, error } = await supabase
      .from('salaires_mensuels')
      .select('*')
      .eq('employe_id', employe_id)
      .eq('mois', mois)
      .eq('annee', annee)
      .maybeSingle();

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// SALAIRES MENSUELS — valider / mettre à jour (upsert)
// ============================================================
// Appelé par le bouton "Valider le salaire". Fige le montant net du mois
// et enregistre le montant payé, pour que "Reste à payer" et le statut
// survivent à un refresh au lieu d'être recalculés à chaque fois.
const validerSalaireMensuel = async (req, res) => {
  try {
    const { employe_id, mois, annee, montant_net, montant_paye } = req.body;
    if (!employe_id || !mois || !annee || montant_net === undefined) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    const paye = montant_paye ?? montant_net;
    const statut = calculStatut(Number(paye), Number(montant_net));

    const { data, error } = await supabase
      .from('salaires_mensuels')
      .upsert(
        {
          employe_id,
          mois,
          annee,
          montant_net,
          montant_paye: paye,
          statut,
          valide_le: new Date().toISOString(),
        },
        { onConflict: 'employe_id,mois,annee' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { getSalaireMensuel, validerSalaireMensuel };