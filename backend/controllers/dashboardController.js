const supabase = require('../supabaseClient');

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Algiers' });
    const today = JOURS[new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Algiers' })).getDay()];

   const [
  { count: formationsActivesCount },
  { count: inscriptionsEnAttente },
  { data: groupsAujourdhui },
  { data: pendingData },
  { data: formationsData },
] = await Promise.all([
  supabase.from('formations').select('*', { count: 'exact', head: true }).eq('statut', 'active'),
  supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('statut', 'pending').eq('archived', false),
    supabase.from('schedules').select('group_id, jour_semaine, heure_debut, heure_fin, group:group_id(nom, archived, statut, date_fin, formation:formation_id(nom))').eq('jour_semaine', today),
  supabase.from('inscriptions').select('formation_id').eq('statut', 'pending').eq('archived', false),
    supabase.from('formations').select('id, nom, prix_etudiant, capacite_groupe, a_niveaux, capacite_uniforme').eq('statut', 'active'),
]);
    const { data: paymentsData } = await supabase.from('payments').select('etudiant_id, formation_id, montant');
    const { data: inscriptionsForPayments } = await supabase
      .from('inscriptions').select('etudiant_id, formation_id')
      .eq('statut', 'confirmed').eq('archived', false).not('group_id', 'is', null);

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
    // ── Capacité réelle pour les formations à niveaux avec capacité non uniforme ──
    const niveauFormationIds = (formationsData ?? [])
      .filter((f) => f.a_niveaux && f.capacite_uniforme === false)
      .map((f) => f.id);

      let niveauCapaciteMap = {};
    if (niveauFormationIds.length) {
      const { data: niveauxData } = await supabase
        .from('formation_niveaux')
        .select('formation_id, capacite_groupe')
        .in('formation_id', niveauFormationIds);

      (niveauxData ?? []).forEach((n) => {
        niveauCapaciteMap[n.formation_id] = (niveauCapaciteMap[n.formation_id] ?? 0) + Number(n.capacite_groupe ?? 0);
      });
    }
 const formationsEnAttenteGroupe = (formationsData ?? [])
      .map((f) => ({
        formation_id: f.id,
        nom: f.nom,
                capacite: f.a_niveaux && f.capacite_uniforme === false
          ? (niveauCapaciteMap[f.id] || 20)
          : (f.capacite_groupe ?? 20),
        count: countMap[f.id] ?? 0,
      }))
      .sort((a, b) => (b.count / b.capacite) - (a.count / a.capacite));
      // Un groupe peut avoir plusieurs créneaux le même jour (matin + midi) —
    // on regroupe par groupe, mais on garde TOUS ses créneaux du jour.
    const isGroupCurrent = (g) => {
      if (!g) return false;
      if (g.archived) return false;
      if (g.statut && g.statut !== 'active') return false;
      if (g.date_fin && g.date_fin < todayStr) return false;
      return true;
    };

    const groupsAujourdhuiMap = {};
    (groupsAujourdhui ?? [])
      .filter((g) => isGroupCurrent(g.group))
      .forEach((g) => {
        if (!groupsAujourdhuiMap[g.group_id]) {
          groupsAujourdhuiMap[g.group_id] = { group_id: g.group_id, group: g.group, creneaux: [] };
        }
        groupsAujourdhuiMap[g.group_id].creneaux.push({ heure_debut: g.heure_debut, heure_fin: g.heure_fin });
      });

    const groupsAujourdhuiDedup = Object.values(groupsAujourdhuiMap)
      .map((g) => ({ ...g, creneaux: g.creneaux.sort((a, b) => (a.heure_debut ?? '').localeCompare(b.heure_debut ?? '')) }))
      .sort((a, b) => (a.creneaux[0]?.heure_debut ?? '').localeCompare(b.creneaux[0]?.heure_debut ?? ''));

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