const supabase = require('../supabaseClient');

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const getDashboardStats = async (req, res) => {
  try {
    const today = JOURS[new Date().getDay()];

    const [
      { count: formationsActives },
      { count: inscriptionsEnAttente },
      { count: sansGroupe },
      { data: groupsAujourdhui },
      { data: inscriptionsData },
    ] = await Promise.all([
      supabase.from('formations').select('*', { count: 'exact', head: true }).eq('statut', 'active').eq('archived', false),
      supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('statut', 'pending'),
      supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('statut', 'confirmed').is('group_id', null),
      supabase.from('schedules').select('group_id, jour_semaine, heure_debut, heure_fin, group:group_id(nom, formation:formation_id(nom))').eq('jour_semaine', today),
      supabase.from('inscriptions').select('etudiant_id, formation_id, group_id').eq('statut', 'confirmed').not('group_id', 'is', null),
    ]);

    // compute incomplete payments
    // get all payments
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('etudiant_id, formation_id, montant');

    // get formation prices
    const { data: formationsData } = await supabase
      .from('formations')
      .select('id, prix_etudiant');

    const prixMap = {};
    formationsData?.forEach((f) => { prixMap[f.id] = Number(f.prix_etudiant ?? 0); });

    const paidMap = {};
    paymentsData?.forEach((p) => {
      const key = `${p.etudiant_id}_${p.formation_id}`;
      paidMap[key] = (paidMap[key] ?? 0) + Number(p.montant);
    });

    let incomplets = 0;
    inscriptionsData?.forEach((i) => {
      const key = `${i.etudiant_id}_${i.formation_id}`;
      const paid = paidMap[key] ?? 0;
      const total = prixMap[i.formation_id] ?? 0;
      if (paid < total) incomplets++;
    });

    res.json({
      formationsActives: formationsActives ?? 0,
      inscriptionsEnAttente: inscriptionsEnAttente ?? 0,
      sansGroupe: sansGroupe ?? 0,
      paiementsIncomplets: incomplets,
      groupsAujourdhui: groupsAujourdhui ?? [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getDashboardStats };