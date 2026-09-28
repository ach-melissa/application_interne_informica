const supabase = require('../supabaseClient');
const { logHistorique } = require('../utils/historique');

const calculStatut = (montantPaye, montantNet) => {
  if (montantPaye <= 0) return 'non_paye';
  if (montantPaye < montantNet) return 'partiel';
  return 'paye';
};

const dz = (n) => Math.abs(Number(n) || 0).toLocaleString('fr-FR') + ' DA';

const nomEmploye = async (id) => {
  if (!id) return '—';
  const { data } = await supabase.from('employes').select('nom, prenom').eq('id', id).single();
  return data ? `${data.prenom} ${data.nom}` : '—';
};

// ============================================================
// SALAIRES MENSUELS — get one (employe_id + mois + annee)
// ============================================================
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
const validerSalaireMensuel = async (req, res) => {
  try {
   const { employe_id, mois, annee, montant_net, montant_calcule, montant_paye } = req.body;
    if (!employe_id || !mois || !annee || montant_net === undefined) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    // état avant, pour savoir s'il s'agit d'une validation ou d'une modification
    const { data: before } = await supabase
      .from('salaires_mensuels')
      .select('montant_net, montant_paye')
      .eq('employe_id', employe_id)
      .eq('mois', mois)
      .eq('annee', annee)
      .maybeSingle();

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
          montant_calcule: montant_calcule ?? null,
          montant_paye: paye,
          statut,
          valide_le: new Date().toISOString(),
        },
        { onConflict: 'employe_id,mois,annee' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });

    const periode = `${String(mois).padStart(2, '0')}/${annee}`;
    const nom = await nomEmploye(employe_id);

    if (!before) {
      await logHistorique({
        req, perimetre: 'comptable', action: 'creation', entite: 'salaire_mensuel', entite_id: data.id,
        description: `a validé le salaire de ${nom} pour ${periode} : ${dz(montant_net)}`,
      });
    } else {
      const changes = [];
      if (Number(before.montant_net) !== Number(montant_net)) {
        changes.push(`salaire net : "${dz(before.montant_net)}" → "${dz(montant_net)}"`);
      }
      if (Number(before.montant_paye) !== Number(paye)) {
        changes.push(`payé : "${dz(before.montant_paye)}" → "${dz(paye)}"`);
      }
      if (changes.length > 0) {
        await logHistorique({
          req, perimetre: 'comptable', action: 'modification', entite: 'salaire_mensuel', entite_id: data.id,
          description: `a modifié le salaire de ${nom} pour ${periode} : ${changes.join(' | ')}`,
        });
      }
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// SALAIRES MENSUELS — historique (N derniers mois d'un employé)
// ============================================================
const getHistoriqueSalaires = async (req, res) => {
  try {
    const { employe_id, limit = 12 } = req.query;
    if (!employe_id) {
      return res.status(400).json({ message: 'employe_id est requis' });
    }

    const { data, error } = await supabase
      .from('salaires_mensuels')
      .select('*')
      .eq('employe_id', employe_id)
      .order('annee', { ascending: false })
      .order('mois', { ascending: false })
      .limit(Number(limit));

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
const getSalairesDuMois = async (req, res) => {
  try {
    const { debut, fin } = req.query;
    if (!debut || !fin) return res.status(400).json({ message: 'debut et fin sont requis' });
    const { data, error } = await supabase
      .from('salaires_mensuels')
      .select('employe_id, montant_net, montant_paye, statut, valide_le')
      .gte('valide_le', `${debut}T00:00:00`)
      .lte('valide_le', `${fin}T23:59:59.999`);
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { getSalaireMensuel, validerSalaireMensuel, getHistoriqueSalaires, getSalairesDuMois };