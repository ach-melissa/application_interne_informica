const supabase = require('../supabaseClient');
const { resolveGroupPeriods, computeStudentTotal } = require('../utils/periods');
const {
  buildProfesseurs,
  applyBilan,
  loadBilanData,
  bilanDataOf,
  loadRevenusFormations,
} = require('./salairesProfesseursController');

// ============================================================
// Helpers période
// ============================================================
const pad = (n) => String(n).padStart(2, '0');

// [start, end[ du mois — end exclusif
const monthBounds = (mois, annee) => {
  const next = mois === 12 ? { y: annee + 1, m: 1 } : { y: annee, m: mois + 1 };
  return { start: `${annee}-${pad(mois)}-01`, end: `${next.y}-${pad(next.m)}-01` };
};

// Un bilan (mois, annee) est retenu si son mois chevauche [dateFrom, dateTo]
const monthOverlapsRange = (mois, annee, dateFrom, dateTo) => {
  const { start, end } = monthBounds(mois, annee);
  return (!dateFrom || end > dateFrom) && (!dateTo || start <= dateTo);
};

const inRange = (dateStr, dateFrom, dateTo) =>
  (!dateFrom || dateStr >= dateFrom) && (!dateTo || dateStr <= dateTo);

const sum = (list, key = 'montant') => list.reduce((s, x) => s + Number(x[key] ?? 0), 0);

// ============================================================
// 1. Formations actives + niveaux + attendu/encaissé/crédit réels
//    (réutilise computeStudentTotal/resolveGroupPeriods — mêmes règles
//    que comptablePaymentController pour niveaux, promotions, prix_uniforme)
// ============================================================
const getFormationsEtEcheances = async (dateFrom, dateTo) => {
  const { data: formations, error } = await supabase
    .from('formations')
    .select('id, nom, prix, prix_etudiant, prix_uniforme, a_niveaux')
    .eq('statut', 'active');
  if (error) throw error;
  if (!formations.length) return [];

  const formationIds = formations.map((f) => f.id);

  const { data: niveauxData } = await supabase
    .from('formation_niveaux')
    .select('id, formation_id, nom, prix')
    .in('formation_id', formationIds)
    .order('ordre', { ascending: true });

  const { data: groupesActifs } = await supabase
    .from('groups')
    .select('id, formation_id')
    .in('formation_id', formationIds)
    .eq('archived', false);

  const { data: inscriptions } = await supabase
    .from('inscriptions')
    .select(`
      id, etudiant_id, formation_id, niveau_id, group_id, statut_scolarite,
      en_promotion, prix_promotion,
      formation:formation_id ( prix, prix_etudiant, prix_uniforme ),
      niveau:niveau_id ( prix ),
      group:group_id ( id, formation_id, niveau_id, date_debut, date_fin, statut, archived,
                        use_default_periods, en_promotion, prix_promotion )
    `)
    .in('formation_id', formationIds)
    .eq('statut', 'confirmed')
    .eq('archived', false);

  // Actifs uniquement : pas abandonné, groupe non archivé (ou pas de groupe)
  const inscActives = (inscriptions ?? []).filter(
    (i) => i.statut_scolarite !== 'abandonne' && (!i.group || i.group.archived === false)
  );

  const etudiantIds = [...new Set(inscActives.map((i) => i.etudiant_id))];
  const { data: payments } = await supabase
    .from('payments')
    .select('etudiant_id, formation_id, montant, date_paiement')
    .in('formation_id', formationIds)
    .in('etudiant_id', etudiantIds.length ? etudiantIds : ['00000000-0000-0000-0000-000000000000']);

  const paymentsByKey = new Map();
  (payments ?? []).forEach((p) => {
    const key = `${p.etudiant_id}_${p.formation_id}`;
    if (!paymentsByKey.has(key)) paymentsByKey.set(key, []);
    paymentsByKey.get(key).push(p);
  });

  const parFormation = {};
  const parNiveau = {};
  formations.forEach((f) => {
    parFormation[f.id] = { attendu: 0, encaisse: 0, etudiantsEnCredit: new Set() };
  });
  (niveauxData ?? []).forEach((n) => {
    parNiveau[n.id] = { nom: n.nom, prix: Number(n.prix || 0), nb_etudiants: 0, attendu: 0 };
  });

  for (const i of inscActives) {
    const key = `${i.etudiant_id}_${i.formation_id}`;
    const studentPayments = paymentsByKey.get(key) ?? [];
    const encaisseTotal = sum(studentPayments);
    // si un filtre de période est actif, l'encaissé (et donc le crédit) suit la période
    const encaissePeriode = (dateFrom || dateTo)
      ? sum(studentPayments.filter((p) => inRange(p.date_paiement, dateFrom, dateTo)))
      : encaisseTotal;

    let attendu;
    if (i.group) {
      const baseTotal = i.formation?.prix_uniforme === false
        ? Number(i.niveau?.prix ?? 0)
        : Number(i.formation?.prix_etudiant ?? i.formation?.prix ?? 0);
      attendu = computeStudentTotal(baseTotal, i, i.group);
    } else {
      attendu = Number(i.formation?.prix_etudiant ?? i.formation?.prix ?? 0);
    }

    const pf = parFormation[i.formation_id];
    pf.attendu += attendu;
    pf.encaisse += encaissePeriode;
    if (attendu - encaissePeriode > 0.01) pf.etudiantsEnCredit.add(i.etudiant_id);

    if (i.niveau_id && parNiveau[i.niveau_id]) {
      parNiveau[i.niveau_id].nb_etudiants += 1;
      parNiveau[i.niveau_id].attendu += attendu;
    }
  }

  const nbGroupesByFormation = {};
  (groupesActifs ?? []).forEach((g) => {
    nbGroupesByFormation[g.formation_id] = (nbGroupesByFormation[g.formation_id] || 0) + 1;
  });

  return formations.map((f) => {
    const pf = parFormation[f.id];
    const niveaux = (niveauxData ?? [])
      .filter((n) => n.formation_id === f.id)
      .map((n) => ({
        id: n.id,
        nom: n.nom,
        prix: Number(n.prix || 0),
        nb_etudiants: parNiveau[n.id].nb_etudiants,
        attendu: parNiveau[n.id].attendu, // 0 si aucun étudiant sur ce niveau
      }));

    const nb_etudiants = f.a_niveaux
      ? niveaux.reduce((s, n) => s + n.nb_etudiants, 0)
      : inscActives.filter((i) => i.formation_id === f.id).length;

    const credit = Math.max(pf.attendu - pf.encaisse, 0);

    return {
      id: f.id,
      nom: f.nom,
      a_niveaux: f.a_niveaux,
      nb_groupes: nbGroupesByFormation[f.id] || 0,
      nb_etudiants,
      niveaux, // [] si !a_niveaux
      attendu: pf.attendu,
      encaisse: pf.encaisse, // = "revenus" de la formation pour la période filtrée
      credit,
      nbCredit: pf.etudiantsEnCredit.size,
    };
  });
};

// ============================================================
// 2. Autres revenus
// ============================================================
const getAutresRevenusPeriode = async (dateFrom, dateTo) => {
  let q = supabase.from('autres_revenus').select('categorie, montant, date');
  if (dateFrom) q = q.gte('date', dateFrom);
  if (dateTo) q = q.lte('date', dateTo);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
};

// ============================================================
// 3. Charges — "formation" (attribuées, formations actives seulement)
//    + "autre" (jamais réparties par formation, seulement dans le total global)
// ============================================================
const getChargesPeriode = async (formationIds, dateFrom, dateTo) => {
  let q = supabase.from('charges').select('type, categorie, montant, date, formation_id');
  if (dateFrom) q = q.gte('date', dateFrom);
  if (dateTo) q = q.lte('date', dateTo);
  const { data, error } = await q;
  if (error) throw error;
  const all = data ?? [];
  return {
    chargesFormation: all.filter((c) => c.type === 'formation' && formationIds.includes(c.formation_id)),
    chargesAutres: all.filter((c) => c.type === 'autre'),
  };
};

// ============================================================
// 4. Part enseignant — UNIQUEMENT les bilans validés dont le mois
//    chevauche la période filtrée (mois/annee du bilan, pas date_validation)
// ============================================================
const getPartEnseignantParFormation = async (dateFrom, dateTo) => {
  const { data: bilansValides, error } = await supabase
    .from('bilans_salaires')
    .select('id, teacher_id, mois, annee')
    .eq('valide', true);
  if (error) throw error;

  const bilansRetenus = (bilansValides ?? []).filter((b) => monthOverlapsRange(b.mois, b.annee, dateFrom, dateTo));
  if (!bilansRetenus.length) return { parFormation: {}, total: 0 };

  // regroupe par (mois, annee) pour ne rebâtir les professeurs qu'une fois par période
  const parPeriode = {};
  bilansRetenus.forEach((b) => {
    const k = `${b.annee}-${b.mois}`;
    (parPeriode[k] ??= { mois: b.mois, annee: b.annee, teacherIds: [] }).teacherIds.push(b.teacher_id);
  });

  const parFormation = {};
  let total = 0;

  for (const { mois, annee, teacherIds } of Object.values(parPeriode)) {
    const [professeurs, all] = await Promise.all([
      buildProfesseurs(mois, annee),
      loadBilanData(teacherIds, mois, annee),
    ]);
    const profsRetenus = professeurs.filter((p) => teacherIds.includes(p.id));

    const formationIds = [...new Set(
      profsRetenus.flatMap((p) => p.formations.filter((f) => f.typeSalaire === 'Pourcentage').map((f) => f.id))
    )];
    const revenusMap = await loadRevenusFormations(formationIds, mois, annee);

    profsRetenus.forEach((p) => {
      const r = applyBilan(p, bilanDataOf(all, p.id), revenusMap);
      r.formations.forEach((f) => {
        parFormation[f.id] = (parFormation[f.id] || 0) + f.montantPeriode;
        total += f.montantPeriode;
      });
    });
  }

  return { parFormation, total };
};

// ============================================================
// 5. Salaires employés — individuels, hors profs, mois/annee dans la période
// ============================================================
const getSalairesEmployesPeriode = async (dateFrom, dateTo) => {
  const { data: staff, error } = await supabase
    .from('users')
    .select('id, nom, prenom, role')
    .eq('archived', false)
    .neq('role', 'prof');
  if (error) throw error;

  const { data: salairesMensuels, error: smErr } = await supabase
    .from('salaires_mensuels')
    .select('employe_id, mois, annee, montant_paye');
  if (smErr) throw smErr;

  const retenus = (salairesMensuels ?? []).filter((s) => monthOverlapsRange(s.mois, s.annee, dateFrom, dateTo));

  const parEmploye = {};
  (staff ?? []).forEach((u) => {
    parEmploye[u.id] = { id: u.id, nom: `${u.nom ?? ''} ${u.prenom ?? ''}`.trim(), role: u.role, montant: 0 };
  });
  retenus.forEach((s) => {
    if (parEmploye[s.employe_id]) parEmploye[s.employe_id].montant += Number(s.montant_paye || 0);
  });

  return Object.values(parEmploye);
};

// ============================================================
// Endpoint principal — GET /api/comptable/statistiques?dateFrom=&dateTo=
// ============================================================
const getStatistiques = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const formations = await getFormationsEtEcheances(dateFrom, dateTo);
    const formationIds = formations.map((f) => f.id);

    const [autresRevenus, chargesRes, partEnseignant, salairesEmployes] = await Promise.all([
      getAutresRevenusPeriode(dateFrom, dateTo),
      getChargesPeriode(formationIds, dateFrom, dateTo),
      getPartEnseignantParFormation(dateFrom, dateTo),
      getSalairesEmployesPeriode(dateFrom, dateTo),
    ]);
    const { chargesFormation, chargesAutres } = chargesRes;

    const chargesParFormation = {};
    chargesFormation.forEach((c) => {
      chargesParFormation[c.formation_id] = (chargesParFormation[c.formation_id] || 0) + Number(c.montant);
    });

    const formationsFinal = formations.map((f) => {
      const charges = chargesParFormation[f.id] || 0;
      const partEns = partEnseignant.parFormation[f.id] || 0;
      const revenus = f.encaisse;
      return {
        ...f,
        revenus,
        charges,
        partEns,
        coutTotal: charges + partEns,
        benefice: revenus - charges - partEns,
      };
    });

    const totalChargesFormation = sum(chargesFormation);
    const totalChargesAutres = sum(chargesAutres);
    const totalCharges = totalChargesFormation + totalChargesAutres;
    const revenusFormations = sum(formationsFinal, 'revenus');
    const totalAutresRevenus = sum(autresRevenus);
    const totalRevenus = revenusFormations + totalAutresRevenus;
    const totalEmployes = sum(salairesEmployes, 'montant');
    const totalPartEnseignants = partEnseignant.total;
    const beneficeInformica = totalRevenus - totalCharges - totalPartEnseignants - totalEmployes;

    const dettes = sum(formationsFinal, 'credit');
    const clientsCredit = formationsFinal.reduce((s, f) => s + f.nbCredit, 0);

    const topBy = (list, key = 'categorie') => {
      const map = {};
      list.forEach((x) => { map[x[key]] = (map[x[key]] || 0) + Number(x.montant); });
      const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
      return entries.length ? { nom: entries[0][0], montant: entries[0][1] } : null;
    };
    const best = (key, dir) => [...formationsFinal].sort((a, b) => dir * (b[key] - a[key]))[0] || null;

    res.json({
      formations: formationsFinal,
      autresRevenus,
      chargesFormation,
      chargesAutres,
      salairesEmployes,
      totaux: {
        totalRevenus, revenusFormations, totalAutresRevenus,
        totalCharges, totalChargesFormation, totalChargesAutres,
        partEnseignants: totalPartEnseignants, totalEmployes,
        beneficeInformica, dettes, clientsCredit,
      },
      classement: {
        topCharge: topBy([...chargesFormation, ...chargesAutres]),
        topRevenu: topBy(autresRevenus),
        plusRentable: best('benefice', 1),
        moinsRentable: best('benefice', -1),
        plusRevenus: best('revenus', 1),
        plusCharges: best('coutTotal', 1),
      },
    });
  } catch (err) {
    console.error('getStatistiques:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

module.exports = { getStatistiques };