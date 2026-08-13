const supabase = require('../supabaseClient');

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const getDashboardStats = async (req, res) => {
  try {
    const today = JOURS[new Date().getDay()];

   const [
  { count: formationsActivesCount },
  { count: inscriptionsEnAttente },
  { data: groupsAujourdhui },
  { data: pendingData },
  { data: formationsData },
] = await Promise.all([
  supabase.from('formations').select('*', { count: 'exact', head: true }).eq('statut', 'active'),
  supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('statut', 'pending'),
  supabase.from('schedules').select('group_id, jour_semaine, heure_debut, heure_fin, group:group_id(nom, formation:formation_id(nom))').eq('jour_semaine', today),
  supabase.from('inscriptions').select('formation_id').eq('statut', 'pending'),
  supabase.from('formations').select('id, nom, prix_etudiant, capacite_groupe').eq('statut', 'active'),
]);
    const { data: paymentsData } = await supabase.from('payments').select('etudiant_id, formation_id, montant');
    const { data: inscriptionsForPayments } = await supabase
      .from('inscriptions').select('etudiant_id, formation_id')
      .eq('statut', 'confirmed').not('group_id', 'is', null);

    const prixMap = {};
    formationsData?.forEach((f) => { prixMap[f.id] = Number(f.prix_etudiant ?? 0); });

    const paidMap = {};
    paymentsData?.forEach((p) => {
      const key = `${p.etudiant_id}_${p.formation_id}`;
      paidMap[key] = (paidMap[key] ?? 0) + Number(p.montant);
    });

    let incomplets = 0;
    inscriptionsForPayments?.forEach((i) => {
      const key = `${i.etudiant_id}_${i.formation_id}`;
      const paid = paidMap[key] ?? 0;
      if (paid < (prixMap[i.formation_id] ?? 0)) incomplets++;
    });

    // ── Pending count per formation, 0 included ─────────────────────
    const countMap = {};
    pendingData?.forEach((i) => { countMap[i.formation_id] = (countMap[i.formation_id] ?? 0) + 1; });

 const formationsEnAttenteGroupe = (formationsData ?? [])
      .map((f) => ({
        formation_id: f.id,
        nom: f.nom,
        capacite: f.capacite_groupe ?? 20,
        count: countMap[f.id] ?? 0,
      }))
      .sort((a, b) => (b.count / b.capacite) - (a.count / a.capacite));
    // Un groupe peut avoir plusieurs créneaux le même jour (matin + midi) —
    // on garde un seul créneau par groupe (le plus tôt) pour l'affichage dashboard.
    const groupsAujourdhuiMap = {};
    (groupsAujourdhui ?? []).forEach((g) => {
      const existing = groupsAujourdhuiMap[g.group_id];
      if (!existing || (g.heure_debut ?? '') < (existing.heure_debut ?? '')) {
        groupsAujourdhuiMap[g.group_id] = g;
      }
    });
    const groupsAujourdhuiDedup = Object.values(groupsAujourdhuiMap);

    res.json({
      formationsActives: formationsActivesCount ?? 0,
      inscriptionsEnAttente: inscriptionsEnAttente ?? 0,
      sansGroupe: pendingData?.length ?? 0,
      paiementsIncomplets: incomplets,
      groupsAujourdhui: groupsAujourdhuiDedup,
      formationsEnAttenteGroupe,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getDashboardStats };