const supabase = require('../supabaseClient');

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const getDashboardStats = async (req, res) => {
  try {
    const today = JOURS[new Date().getDay()];

    const [
      { count: formationsActives },
      { count: inscriptionsEnAttente },
      { data: groupsAujourdhui },
      { data: sansGroupeData },
      { data: formationsData },
    ] = await Promise.all([
      supabase.from('formations').select('*', { count: 'exact', head: true }).eq('statut', 'active').eq('archived', false),
      supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('statut', 'pending'),
      supabase.from('schedules').select('group_id, jour_semaine, heure_debut, heure_fin, group:group_id(nom, formation:formation_id(nom))').eq('jour_semaine', today),
      // confirmed + no group yet, joined to formation name + capacity
      supabase.from('inscriptions').select('formation_id, formations:formation_id(nom, capacite_groupe)').eq('statut', 'confirmed').is('group_id', null),
      supabase.from('formations').select('id, prix_etudiant'),
    ]);

    const { data: paymentsData } = await supabase
      .from('payments')
      .select('etudiant_id, formation_id, montant');

    const { data: inscriptionsForPayments } = await supabase
      .from('inscriptions')
      .select('etudiant_id, formation_id')
      .eq('statut', 'confirmed')
      .not('group_id', 'is', null);

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
      const total = prixMap[i.formation_id] ?? 0;
      if (paid < total) incomplets++;
    });

    // ── Group "waiting for group" inscriptions by formation ─────────
    const waitlistMap = {};
    sansGroupeData?.forEach((i) => {
      const fid = i.formation_id;
      if (!waitlistMap[fid]) {
        waitlistMap[fid] = {
          formation_id: fid,
          nom: i.formations?.nom ?? 'Formation inconnue',
          capacite: i.formations?.capacite_groupe ?? 20,
          count: 0,
        };
      }
      waitlistMap[fid].count += 1;
    });

    const formationsEnAttenteGroupe = Object.values(waitlistMap)
      .sort((a, b) => (b.count / b.capacite) - (a.count / a.capacite));

    res.json({
      formationsActives: formationsActives ?? 0,
      inscriptionsEnAttente: inscriptionsEnAttente ?? 0,
      sansGroupe: sansGroupeData?.length ?? 0,
      paiementsIncomplets: incomplets,
      groupsAujourdhui: groupsAujourdhui ?? [],
      formationsEnAttenteGroupe,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getDashboardStats };