const supabase = require('../supabaseClient');
const { resolveGroupPeriods, computeStudentTotal } = require('../utils/periods');

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
      .from('inscriptions')
      .select(`
        etudiant_id, formation_id, group_id, en_promotion, prix_promotion, statut_scolarite,
        etudiant:etudiant_id(nom, prenom),
        formation:formation_id(nom)
      `)
      .eq('statut', 'confirmed')
      .eq('archived', false)
      .neq('statut_scolarite', 'abandonne')
      .not('group_id', 'is', null);

    const validKeys = new Set(
      inscriptionsForPayments?.map((i) => `${i.etudiant_id}_${i.formation_id}`) ?? []
    );

    const paidMap = {};
    paymentsData?.forEach((p) => {
      const key = `${p.etudiant_id}_${p.formation_id}`;
      if (!validKeys.has(key)) return;
      paidMap[key] = (paidMap[key] ?? 0) + Number(p.montant);
    });

    const allGroupIds = [...new Set((inscriptionsForPayments ?? []).map((i) => i.group_id).filter(Boolean))];

    let groupMap = {};
    let allFormationPeriods = [];
    let allGroupPeriods = [];

    if (allGroupIds.length) {
      const { data: groupsData } = await supabase
        .from('groups')
        .select('id, nom, formation_id, niveau_id, en_promotion, prix_promotion, date_debut, use_default_periods, formation:formation_id(prix, prix_etudiant, prix_uniforme), niveau:niveau_id(prix)')
        .in('id', allGroupIds);

      (groupsData ?? []).forEach((g) => { groupMap[g.id] = g; });

      const relevantFormationIds = [...new Set((groupsData ?? []).map((g) => g.formation_id))];
      const { data: fp } = await supabase
        .from('formation_payment_periods')
        .select('formation_id, niveau_id, numero, jours_offset, montant')
        .in('formation_id', relevantFormationIds.length ? relevantFormationIds : ['00000000-0000-0000-0000-000000000000']);
      allFormationPeriods = fp ?? [];

      const customGroupIds = (groupsData ?? []).filter((g) => !g.use_default_periods).map((g) => g.id);
      if (customGroupIds.length) {
        const { data: gp } = await supabase
          .from('group_payment_periods')
          .select('group_id, numero, jours_offset, montant')
          .in('group_id', customGroupIds);
        allGroupPeriods = gp ?? [];
      }
    }

    const EPSILON = 0.01;

    let incomplets = 0;
    let paiementsIncompletsListe = [];

    (inscriptionsForPayments ?? []).forEach((i) => {
      const group = groupMap[i.group_id];
      const key = `${i.etudiant_id}_${i.formation_id}`;
      const paid = paidMap[key] ?? 0;

      let total = 0;
      let prochaineEcheance = null;
      let isOverdue = false;

      if (group) {
        const baseTotal = group.formation?.prix_uniforme === false
          ? Number(group.niveau?.prix ?? 0)
          : Number(group.formation?.prix_etudiant ?? group.formation?.prix ?? 0);

        const formationPeriods = allFormationPeriods.filter((p) =>
          p.formation_id === group.formation_id &&
          (group.niveau_id ? p.niveau_id === group.niveau_id : p.niveau_id === null)
        );
        const groupPeriods = allGroupPeriods.filter((p) => p.group_id === group.id);
        const resolvedPeriods = resolveGroupPeriods(group, formationPeriods, groupPeriods);
        total = computeStudentTotal(baseTotal, i, group);

        let running = 0;
        for (const per of resolvedPeriods) {
          running += Number(per.montant);
          if (paid < running - EPSILON) {
            prochaineEcheance = per.due_date;
            isOverdue = per.due_date && per.due_date <= todayStr;
            break;
          }
        }
      }

      if (paid < total - EPSILON) {
        incomplets++;
        paiementsIncompletsListe.push({
          studentId: i.etudiant_id,
          nom: `${i.etudiant?.nom ?? ''} ${i.etudiant?.prenom ?? ''}`.trim(),
          formationId: i.formation_id,
          formationNom: i.formation?.nom ?? group?.formation?.nom ?? '',
          groupId: i.group_id,
          groupNom: group?.nom ?? '—',
          total,
          paid,
          remaining: total - paid,
          prochaineEcheance,
          isOverdue,
        });
      }
    });

    paiementsIncompletsListe.sort((a, b) => (b.isOverdue - a.isOverdue) || (b.remaining - a.remaining));

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
        const cap = Number(n.capacite_groupe ?? 0);
        niveauCapaciteMap[n.formation_id] = Math.max(niveauCapaciteMap[n.formation_id] ?? 0, cap);
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
      paiementsIncompletsListe,
      groupsAujourdhui: groupsAujourdhuiDedup,
      formationsEnAttenteGroupe,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getDashboardStats };