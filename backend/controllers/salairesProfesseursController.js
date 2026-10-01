const supabase = require('../supabaseClient');
const crypto = require('crypto');
/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, '0');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// [start, end[  →  first day of the month / first day of the next month
const monthRange = (mois, annee) => {
  const next = mois === 12 ? { y: annee + 1, m: 1 } : { y: annee, m: mois + 1 };
  return {
    start: `${annee}-${pad(mois)}-01`,
    end: `${next.y}-${pad(next.m)}-01`,
  };
};

// Today's date (YYYY-MM-DD) in Algeria time
const todayDZ = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Algiers' });

// Current month in Algeria time (used when ?mois=&annee= are missing)
const currentMonthDZ = () => {
  const [y, m] = todayDZ().split('-').map(Number);
  return { mois: m, annee: y };
};

// Reads ?mois=&annee= (defaults to the current month). Returns null if mois is invalid.
const readPeriode = (source) => {
  const def = currentMonthDZ();
  const mois = Number(source.mois) || def.mois;
  const annee = Number(source.annee) || def.annee;
  if (mois < 1 || mois > 12) return null;
  return { mois, annee };
};

// DB values <-> labels used by the frontend
const TYPE_TO_LABEL = { fixe: 'Fixe', heure: "À l'heure", pourcentage: 'Pourcentage' };
const LABEL_TO_TYPE = { Fixe: 'fixe', "À l'heure": 'heure', Pourcentage: 'pourcentage' };

// hours between two 'HH:MM[:SS]' strings (null if missing or end <= start)
const hoursBetween = (debut, fin) => {
  if (!debut || !fin) return null;
  const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
  const diff = toMin(fin) - toMin(debut);
  return diff > 0 ? diff / 60 : null;
};

// hours of ONE finished séance: real duration if entered, else end - start, else null (missing)
const sessionHours = (s) => {
  if (s.duree_effectuee !== null && s.duree_effectuee !== undefined && Number(s.duree_effectuee) > 0) return Number(s.duree_effectuee);
  return hoursBetween(s.heure_debut, s.heure_fin);
};

// Amount for the month of ONE formation.
// - fixe: the fixed amount
// - heure: rate x hours done (real hours if the formation is counted in hours, else séances)
// - pourcentage: needs students x price -> computed in the bilan step (0 here for now)
const computeMontantPeriode = (f) => {
  if (f.typeSalaire === 'Fixe') return f.montant;
  if (f.typeSalaire === "À l'heure") return Math.round(f.montant * f.heuresEffectuees);
  return 0;
};

const { logHistorique } = require('../utils/historique');

const dz = (n) => Math.abs(Number(n) || 0).toLocaleString('fr-FR') + ' DA';
const periodeLabel = (mois, annee) => `${pad(mois)}/${annee}`;
const TYPE_MVT_LABEL = { avance: 'une avance', retenue: 'une retenue', prime: 'une prime', particulier: 'un mouvement particulier' };

const nomProf = async (teacherId) => {
  const { data } = await supabase.from('teachers').select('user:user_id(nom, prenom)').eq('id', teacherId).maybeSingle();
  return data?.user ? [data.user.prenom, data.user.nom].filter(Boolean).join(' ') : '—';
};
/* ------------------------------------------------------------------ */
/*  Core: professors + their formations + séances for the month        */
/*  (exported so GET /:id can reuse it with teacherId)                 */
/* ------------------------------------------------------------------ */
const fetchAllSessions = async (groupIds, start, end) => {
  const PAGE = 1000;
  let from = 0;
  const all = [];
  while (true) {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, group_id, duree_effectuee, heure_debut, heure_fin')
      .in('group_id', groupIds)
      .eq('statut', 'effectuee')
      .gte('date', start)
      .lt('date', end)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if ((data ?? []).length < PAGE) break;
    from += PAGE;
  }
  return all;
};
const buildProfesseurs = async (mois, annee, teacherId = null) => {
  const { start, end } = monthRange(mois, annee);

  // 1. Professors with their groups and their declared formations
  let tq = supabase
    .from('teachers')
    .select(`
      id,
      user:user_id(id, nom, prenom, telephone, archived),
groups(
  id, nom, archived, formation_id, use_default_duree, type_duree,
  formation:formation_id(id, nom, type_duree)
),
      teacher_formations(
        formation:formation_id(id, nom, type_duree)
      )
    `)
    .order('created_at', { ascending: false });
  if (teacherId) tq = tq.eq('id', teacherId);

  const { data: teachers, error: tErr } = await tq;
  if (tErr) throw tErr;

  const activeTeachers = (teachers ?? []).filter((t) => t.user && !t.user.archived);
  if (!activeTeachers.length) return [];

  // 1b. Pay configuration per (professor, formation)
  const { data: configs, error: cErr } = await supabase
    .from('professeur_formations')
    .select('teacher_id, formation_id, type_salaire, montant, heures')
    .in('teacher_id', activeTeachers.map((t) => t.id));
  if (cErr) throw cErr;
  const configOf = (tid, fid) => (configs ?? []).find((c) => c.teacher_id === tid && c.formation_id === fid);

  // 2. Séances of the month = sessions already validated in pointage
  //    (finalized_at is set when "Terminer" is clicked)
  //    The professor is the one of the GROUP (sessions.prof_id is only the creator).
  const groupIds = activeTeachers.flatMap((t) => t.groups.map((g) => g.id));
  const perGroup = {}; // group_id → { nb, heures, sansDuree }
if (groupIds.length) {
  const sessions = await fetchAllSessions(groupIds, start, end);
  sessions.forEach((s) => {
    const acc = (perGroup[s.group_id] ??= { nb: 0, heures: 0, sansDuree: 0 });
    acc.nb += 1;
    const h = sessionHours(s);
    if (h === null) acc.sansDuree += 1;
    else acc.heures += h;
  });
}

  // 3. Assemble: professor → formations
  return activeTeachers.map((t) => {
    const byFormation = {};

    const ensure = (formation, typeDuree) => {
      if (!byFormation[formation.id]) {
        const cfg = configOf(t.id, formation.id);
byFormation[formation.id] = {
  id: formation.id,
  nom: formation.nom,
  typeDuree: typeDuree ?? formation.type_duree,
  nbGroupes: 0,
  nbSeances: 0,
  heuresEffectuees: 0,
  seancesSansDuree: 0,
  typeSalaire: cfg ? TYPE_TO_LABEL[cfg.type_salaire] : null,
  montant: cfg ? Number(cfg.montant) : 0,
  heures: cfg ? Number(cfg.heures) : 0,
  montantPeriode: 0,
  groupIds: [],
  groupes: [], 
};
      }
      return byFormation[formation.id];
    };

    // a) formations declared for the teacher (even without group yet)
    t.teacher_formations.forEach((tf) => tf.formation && ensure(tf.formation));

    // b) formations of his groups: active ones, or archived ones that still had séances this month
    t.groups
      .filter((g) => g.formation && (!g.archived || perGroup[g.id]))
      .forEach((g) => {
        // a group can override the duration type of its formation
        const typeDuree = g.use_default_duree === false && g.type_duree ? g.type_duree : g.formation.type_duree;
        const f = ensure(g.formation, typeDuree);
f.nbGroupes += 1;
f.nbSeances += perGroup[g.id]?.nb ?? 0;
f.heuresEffectuees += perGroup[g.id]?.heures ?? 0;
f.seancesSansDuree += perGroup[g.id]?.sansDuree ?? 0;
f.groupIds.push(g.id);   // ← ADD THIS LINE
f.groupes.push({
  id: g.id,
  nom: g.nom,
  heures: Math.round((perGroup[g.id]?.heures ?? 0) * 100) / 100,
  nbSeances: perGroup[g.id]?.nb ?? 0,
  sansDuree: perGroup[g.id]?.sansDuree ?? 0,
});   
});

    return {
      id: t.id,
      nom: [t.user.nom, t.user.prenom].filter(Boolean).join(' '),
      poste: 'Formateur', // no column for it in users/teachers
      telephone: t.user.telephone ?? null,
      statut: 'à_saisir', // overridden by toListItem from the bilan of the month
      formations: Object.values(byFormation).map((f) => ({
        ...f,
        montantPeriode: computeMontantPeriode(f),
        heuresEffectuees: Math.round(f.heuresEffectuees * 100) / 100,
      })),
    };
  });
};

/* ------------------------------------------------------------------ */
/*  Bilan mensuel — helpers                                            */
/* ------------------------------------------------------------------ */

const SIGNE_MVT = { avance: -1, retenue: -1, prime: 1, particulier: 1 };
const TYPES_MVT_VALID = Object.keys(SIGNE_MVT);

const getOrCreateBilan = async (teacherId, mois, annee) => {
  const { data: existing, error: selErr } = await supabase
    .from('bilans_salaires')
    .select('*')
    .eq('teacher_id', teacherId).eq('mois', mois).eq('annee', annee)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing;

  const { data: created, error: insErr } = await supabase
    .from('bilans_salaires')
    .insert({ teacher_id: teacherId, mois, annee })
    .select('*')
    .single();
  if (insErr) throw insErr;
  return created;
};

// Status of the month, derived from the bilan:
//  - not validated            → à_saisir
//  - validated, nothing paid  → en_attente
//  - validated, partly paid   → partiel
//  - validated, fully paid    → payé
const computeStatut = (valide, total, paye) => {
  if (!valide) return 'à_saisir';
  if (total > 0 && paye >= total) return 'payé';
  if (paye > 0) return 'partiel';
  return 'en_attente';
};

// Applies the bilan data (manual hours, percentage settings, movements, total override, payments) to a professor.
// Shared by GET /:teacherId/bilan and the professors list, so both always show the same numbers.
const applyBilan = (professeur, { bilan, details, mouvements, charges }, revenusMap = {}, revenusProfMap = {}) => {
  const detailOf = (formationId) => details.find((d) => d.formation_id === formationId);

  const formations = professeur.formations.map((f) => {
    const d = detailOf(f.id);
  if (f.typeSalaire === 'Pourcentage') {
    const part = f.montant != null ? Number(f.montant) : 40;
    const selected = d?.charges_selectionnees ?? [];
    const revenusOverride = d?.revenus_override != null ? Number(d.revenus_override) : null;
    const revenusAuto = Number(revenusMap[f.id] ?? 0);
    const revenusProfesseur = Number(revenusProfMap[f.id] ?? 0);   // ← new, note-only
    const revenus = revenusOverride ?? revenusAuto;
    const totalCharges = charges.filter((c) => selected.includes(c.id)).reduce((s, c) => s + Number(c.montant), 0);
    return { ...f, part, charges: selected, revenusOverride, revenusAuto, revenusProfesseur, montantPeriode: Math.round((revenus - totalCharges) * (part / 100)) };
  }
    if (f.typeSalaire === "À l'heure" && d?.seances != null) {
      const heures = Number(d.seances);
      return { ...f, heuresEffectuees: heures, heuresOverride: heures, montantPeriode: Math.round(Number(f.montant) * heures) };
    }
    return f;
  });

  const totalFormations = formations.reduce((s, f) => s + f.montantPeriode, 0);
  const totalMouvements = mouvements.reduce((s, m) => s + SIGNE_MVT[m.type] * Number(m.montant), 0);
  const totalCalcule = totalFormations + totalMouvements;
  const totalOverride = bilan?.total_override != null ? Number(bilan.total_override) : null;
  const total = totalOverride ?? totalCalcule;
  const paye = Number(bilan?.deja_paye ?? 0);
  const valide = bilan?.valide ?? false;

  return {
    formations,
    totalCalcule,
    totalOverride,
    total,
    totalCalculeValide: bilan?.total_calcule_valide != null ? Number(bilan.total_calcule_valide) : null,
    totalCalculeEnvoye: bilan?.total_calcule_envoye != null ? Number(bilan.total_calcule_envoye) : null,
    dateValidation: bilan?.date_validation ?? null,
    paye,
    valide,
    envoye: bilan?.envoye ?? false,
    statut: computeStatut(valide, total, paye),
  };
};
// Revenu total encaissé pour chaque formation (même donnée que "Revenu par formation")
const loadRevenusFormations = async (formationIds, mois, annee) => {
  if (!formationIds.length) return {};
  const { start, end } = monthRange(mois, annee);
  const { data, error } = await supabase
    .from('payments')
    .select('formation_id, montant')
    .in('formation_id', formationIds)
    .gte('date_paiement', start)
    .lt('date_paiement', end);
  if (error) throw error;
  const map = {};
  (data ?? []).forEach((p) => { map[p.formation_id] = (map[p.formation_id] ?? 0) + Number(p.montant); });
  return map;
};

// Revenue of a formation, restricted to a given professor's own group(s) — display-only note.
const loadRevenusParGroupes = async (formationId, groupIds, mois, annee) => {
  if (!groupIds?.length) return 0;

  const { data: inscriptions, error: insErr } = await supabase
    .from('inscriptions')
    .select('etudiant_id')
    .eq('formation_id', formationId)
    .in('group_id', groupIds);
  if (insErr) throw insErr;

  const etudiantIds = [...new Set((inscriptions ?? []).map((i) => i.etudiant_id))];
  if (!etudiantIds.length) return 0;

  const { start, end } = monthRange(mois, annee);
  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('montant')
    .eq('formation_id', formationId)
    .in('etudiant_id', etudiantIds)
    .gte('date_paiement', start)
    .lt('date_paiement', end);
  if (payErr) throw payErr;

  return (payments ?? []).reduce((s, p) => s + Number(p.montant), 0);
};

// Découpe montantPeriode d'une formation entre ses groupes.
// Utilisé UNIQUEMENT par getMesSalaires — ne touche pas l'écran comptable.
const computeGroupesForFormation = async (f, mois, annee) => {
  const groupes = f.groupes ?? [];
  if (!groupes.length) return [];

  if (f.typeSalaire === "À l'heure") {
    const heuresBrutesTotal = groupes.reduce((s, g) => s + g.heures, 0);
    // si le comptable a saisi un nombre d'heures manuel, on garde la même proportion
    const scale = heuresBrutesTotal > 0 && f.heuresEffectuees != null ? f.heuresEffectuees / heuresBrutesTotal : 1;
    return groupes.map((g) => {
      const heures = Math.round(g.heures * scale * 100) / 100;
      return { nom: g.nom, heures, montant: Math.round(Number(f.montant) * heures) };
    });
  }

  if (f.typeSalaire === 'Pourcentage') {
    const revenus = await Promise.all(groupes.map((g) => loadRevenusParGroupes(f.id, [g.id], mois, annee)));
    const totalRevenus = revenus.reduce((s, r) => s + r, 0);
    let restant = f.montantPeriode;
    return groupes.map((g, i) => {
      const part = totalRevenus > 0 ? revenus[i] / totalRevenus : 1 / groupes.length;
      const montant = i === groupes.length - 1 ? restant : Math.round(f.montantPeriode * part);
      restant -= montant;
      return { nom: g.nom, montant };
    });
  }
  return [];
};

/* GET /api/salaires-professeurs/me?annee=  — vue du prof sur SES salaires */
const getMesSalaires = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers').select('id').eq('user_id', req.user.id).maybeSingle();
    if (tErr) throw tErr;
    if (!teacher) return res.status(403).json({ error: "Ce compte n'est pas un compte professeur." });

    const teacherId = teacher.id;
    const { mois: moisCourant, annee: anneeCourante } = currentMonthDZ();
    const annee = Number(req.query.annee) || anneeCourante;
    const dernierMois = annee === anneeCourante ? moisCourant : 12;

const { data: bilans, error: bErr } = await supabase
   .from('bilans_salaires').select('mois, valide, envoye, total_calcule_envoye')
  .eq('teacher_id', teacherId).eq('annee', annee).lte('mois', dernierMois);
if (bErr) throw bErr;
if (!bilans?.length) return res.json([]);

const resultats = await Promise.all(bilans.map(async (b) => {
if (!b.envoye) return { mois: b.mois, statut: 'attente', total: 0, formations: [], mouvements: [] }; 
  const [professeurs, all] = await Promise.all([
        buildProfesseurs(b.mois, annee, teacherId),
        loadBilanData([teacherId], b.mois, annee),
      ]);
      const professeur = professeurs[0];
    if (!professeur) return { mois: b.mois, statut: 'attente', total: 0, formations: [], mouvements: [] };
      const pctFormations = professeur.formations.filter((f) => f.typeSalaire === 'Pourcentage');
const revenusMap = await loadRevenusFormations(pctFormations.map((f) => f.id), b.mois, annee); 
      const bilanData = bilanDataOf(all, teacherId);
const r = applyBilan(professeur, bilanData, revenusMap);

// the teacher only sees what was sent: if the calculation changed since the last send, hide until resent
if (b.total_calcule_envoye != null && Number(b.total_calcule_envoye) !== Number(r.totalCalcule)) {
  return { mois: b.mois, statut: 'attente', total: 0, formations: [], mouvements: [] };
}
// APRÈS
const formations = await Promise.all(
  r.formations
    .filter((f) => f.typeSalaire) // skip formations with no pay configured
    .map(async (f) => {
      const hasGroupes = (f.groupes ?? []).length > 0;
      const type = f.typeSalaire === "À l'heure" ? 'heure'
                 : f.typeSalaire === 'Fixe' ? 'fixe'
                 : 'pourcentage';
      return {
        formation_nom: f.nom,
        type,
        ...(type === 'heure' ? { taux_horaire: Number(f.montant) } : {}),
        ...(type === 'pourcentage' ? { pourcentage: Number(f.part ?? f.montant) } : {}),
        ...(type === 'fixe' ? { forfait: Number(f.montant) } : {}),
            montant: f.montantPeriode,
        ...(type === 'heure' ? { heures: f.heuresEffectuees } : {}),
        groupes: type !== 'fixe' && hasGroupes ? await computeGroupesForFormation(f, b.mois, annee) : [],
      };
    })
);

// Le total du mois doit rester cohérent avec les montants affichés ci-dessus
// (sauf si le comptable a fixé un total manuel — dans ce cas on le respecte tel quel)
const totalMouvements = bilanData.mouvements.reduce((s, m) => s + SIGNE_MVT[m.type] * Number(m.montant), 0);
const totalAffiche = r.totalOverride != null
  ? r.total
  : formations.reduce((s, f) => s + f.montant, 0) + totalMouvements;

return {
  mois: b.mois,
  statut: r.paye >= totalAffiche && totalAffiche > 0 ? 'paye' : 'attente',
  total: totalAffiche,
  formations,
  mouvements: bilanData.mouvements.map((m) => ({
    id: m.id,
    type: m.type,                    // avance | retenue | prime | particulier
    description: m.description,
    montant: Number(m.montant),
    date: m.date,
    bons: (m.bons ?? []).map((b) => ({ id: b.id ?? b.url, url: b.url })), // optional
  })),
};
    }));

    res.json(resultats.sort((a, b) => b.mois - a.mois));
  } catch (err) {
    console.error('getMesSalaires:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

// Bilan data of one or several professors for a month, in a fixed number of queries.
const loadBilanData = async (teacherIds, mois, annee) => {
const [bilansRes, chargesRes] = await Promise.all([
  supabase.from('bilans_salaires').select('*').in('teacher_id', teacherIds).eq('mois', mois).eq('annee', annee),
  supabase.from('charges').select('id, description, montant, formation_id').eq('type', 'formation'),
]);
  if (bilansRes.error) throw bilansRes.error;
  if (chargesRes.error) throw chargesRes.error;

  const bilans = bilansRes.data ?? [];
  let details = [];
  let mouvements = [];
  if (bilans.length) {
    const ids = bilans.map((b) => b.id);
    const [detRes, mvtRes] = await Promise.all([
      supabase.from('bilan_formation_details').select('*').in('bilan_id', ids),
      supabase.from('mouvements_salaire_professeurs').select('*').in('bilan_id', ids).order('created_at', { ascending: true }),
    ]);
    if (detRes.error) throw detRes.error;
    if (mvtRes.error) throw mvtRes.error;
    details = detRes.data ?? [];
    mouvements = mvtRes.data ?? [];
  }
  return { bilans, details, mouvements, charges: chargesRes.data ?? [] };
};

// Picks ONE professor's part out of loadBilanData's result
const bilanDataOf = (all, teacherId) => {
  const bilan = all.bilans.find((b) => b.teacher_id === teacherId) ?? null;
  return {
    bilan,
    details: bilan ? all.details.filter((d) => d.bilan_id === bilan.id) : [],
    mouvements: bilan ? all.mouvements.filter((m) => m.bilan_id === bilan.id) : [],
    charges: all.charges,
  };
};

// A professor as shown in the list and on the detail page: formations + total + paid + status of the month
const toListItem = (professeur, all, revenusMap = {}) => {
  const r = applyBilan(professeur, bilanDataOf(all, professeur.id), revenusMap);
  return { ...professeur, formations: r.formations, total: r.total, paye: r.paye, statut: r.statut };
};

/* ------------------------------------------------------------------ */
/*  GET /api/salaires-professeurs?mois=&annee=                         */
/* ------------------------------------------------------------------ */

// APRÈS
const getProfesseurs = async (req, res) => {
  try {
    const periode = readPeriode(req.query);
    if (!periode) return res.status(400).json({ error: 'Mois invalide (1 à 12).' });
    const { mois, annee } = periode;

    const professeurs = await buildProfesseurs(mois, annee);
    if (!professeurs.length) return res.json([]);

    const all = await loadBilanData(professeurs.map((p) => p.id), mois, annee);
    const formationIds = [...new Set(
      professeurs.flatMap((p) => p.formations.filter((f) => f.typeSalaire === 'Pourcentage').map((f) => f.id))
    )];
   const revenusMap = await loadRevenusFormations(formationIds, mois, annee);
    res.json(professeurs.map((p) => toListItem(p, all, revenusMap)));
  } catch (err) {
    console.error('getProfesseurs:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

/* ------------------------------------------------------------------ */
/*  GET /api/salaires-professeurs/:teacherId?mois=&annee=              */
/* ------------------------------------------------------------------ */

const getProfesseur = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const periode = readPeriode(req.query);
    if (!periode) return res.status(400).json({ error: 'Mois invalide (1 à 12).' });
    const { mois, annee } = periode;

    const [professeurs, all] = await Promise.all([
      buildProfesseurs(mois, annee, teacherId),
      loadBilanData([teacherId], mois, annee),
    ]);
    const professeur = professeurs[0];
    if (!professeur) return res.status(404).json({ error: 'Professeur introuvable.' });

    const formationIds = professeur.formations.filter((f) => f.typeSalaire === 'Pourcentage').map((f) => f.id);
    const revenusMap = await loadRevenusFormations(formationIds, mois, annee);
    res.json(toListItem(professeur, all, revenusMap));
  } catch (err) {
    console.error('getProfesseur:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

/* ------------------------------------------------------------------ */
/*  PUT /api/salaires-professeurs/:teacherId/formations/:formationId   */
/*  body: { typeSalaire, montant, heures }                             */
/* ------------------------------------------------------------------ */

const updateFormationRemuneration = async (req, res) => {
  try {
    const { teacherId, formationId } = req.params;
    const { typeSalaire, montant } = req.body;

    const type = LABEL_TO_TYPE[typeSalaire];
    if (!type) return res.status(400).json({ error: 'Type de rémunération invalide.' });

    const m = Number(montant);
    if (!(m > 0)) return res.status(400).json({ error: 'Montant invalide.' });
    if (type === 'pourcentage' && m > 100) return res.status(400).json({ error: 'Le pourcentage doit être entre 1 et 100.' });

    const { data: before } = await supabase
      .from('professeur_formations')
      .select('type_salaire, montant')
      .eq('teacher_id', teacherId).eq('formation_id', formationId)
      .maybeSingle();

    const { error } = await supabase.from('professeur_formations').upsert(
      {
        teacher_id: teacherId,
        formation_id: formationId,
        type_salaire: type,
        montant: m,
        heures: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'teacher_id,formation_id' }
    );
    if (error) throw error;

    const fmtRem = (t, v) => !t ? 'non défini' : t === 'pourcentage' ? `${Number(v)}%` : t === 'heure' ? `${dz(v)} / h` : `${dz(v)} / mois`;
    const avant = before ? fmtRem(before.type_salaire, before.montant) : 'non défini';
    const apres = fmtRem(type, m);
      if (!before || before.type_salaire !== type || Number(before.montant) !== m) {
      const [nom, { data: fo }] = await Promise.all([
        nomProf(teacherId),
        supabase.from('formations').select('nom').eq('id', formationId).maybeSingle(),
      ]);
      await logHistorique({
        req, perimetre: 'comptable', action: before ? 'modification' : 'creation', entite: 'remuneration_prof', entite_id: formationId,
        description: `a modifié la rémunération de ${nom} pour la formation "${fo?.nom ?? '—'}" : "${before ? `${TYPE_TO_LABEL[before.type_salaire]} ${avant}` : 'non défini'}" → "${typeSalaire} ${apres}"`,
      });
    }

    res.json({ typeSalaire, montant: m, heures: 0 });
  } catch (err) {
    console.error('updateFormationRemuneration:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

/* ------------------------------------------------------------------ */
/*  GET /api/salaires-professeurs/:teacherId/bilan?mois=&annee=        */
/* ------------------------------------------------------------------ */

const getBilan = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const periode = readPeriode(req.query);
    if (!periode) return res.status(400).json({ error: 'Mois invalide (1 à 12).' });
    const { mois, annee } = periode;

    const [professeurs, all] = await Promise.all([
      buildProfesseurs(mois, annee, teacherId),
      loadBilanData([teacherId], mois, annee),
    ]);
    const professeur = professeurs[0];
    if (!professeur) return res.status(404).json({ error: 'Professeur introuvable.' });

const pctFormations = professeur.formations.filter((f) => f.typeSalaire === 'Pourcentage');
const formationIds = pctFormations.map((f) => f.id);
const revenusMap = await loadRevenusFormations(formationIds, mois, annee);

const revenusProfMap = {};
await Promise.all(pctFormations.map(async (f) => {
  revenusProfMap[f.id] = await loadRevenusParGroupes(f.id, f.groupIds, mois, annee);
}));

const bilanData = bilanDataOf(all, teacherId);
const r = applyBilan(professeur, bilanData, revenusMap);

    res.json({
      formations: r.formations,
         mouvements: bilanData.mouvements.map((m) => ({
        ...m,
        bons: (m.bons ?? []).map((b) => ({ ...b, id: b.id ?? b.url })),
      })),
      charges: bilanData.charges,
       totalCalcule: r.totalCalcule,
      totalCalculeValide: r.totalCalculeValide,
      totalCalculeEnvoye: r.totalCalculeEnvoye,
      dateValidation: r.dateValidation,
      totalOverride: r.totalOverride,
      total: r.total,
      paye: r.paye,
      valide: r.valide,
      envoye: r.envoye,
      statut: r.statut,
    });
  } catch (err) {
    console.error('getBilan:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

/* ------------------------------------------------------------------ */
/*  PUT /api/salaires-professeurs/:teacherId/bilan/formation/:formationId */
/*  body: { mois, annee, seances?, revenusOverride?, part?, charges? } */
/* ------------------------------------------------------------------ */

const upsertBilanFormationDetail = async (req, res) => {
  try {
    const { teacherId, formationId } = req.params;
    const { mois, annee, seances, revenusOverride, part, charges } = req.body;
    if (!mois || !annee) return res.status(400).json({ error: 'Mois et année requis.' });

    const bilan = await getOrCreateBilan(teacherId, Number(mois), Number(annee));

    const { data: before } = await supabase
      .from('bilan_formation_details')
      .select('seances, revenus_override, charges_selectionnees')
      .eq('bilan_id', bilan.id).eq('formation_id', formationId)
      .maybeSingle();

    const patch = { bilan_id: bilan.id, formation_id: formationId, updated_at: new Date().toISOString() };
    if (seances !== undefined) patch.seances = seances === null ? null : Number(seances) || 0;
    if (revenusOverride !== undefined) patch.revenus_override = revenusOverride === null ? null : Number(revenusOverride);
    let partAvant = null;
    if (part !== undefined) {
      const { data: cfg } = await supabase.from('professeur_formations')
        .select('montant').eq('teacher_id', teacherId).eq('formation_id', formationId).maybeSingle();
      partAvant = cfg?.montant != null ? Number(cfg.montant) : null;
      patch.part_pct = Number(part);
      const { error: pfErr } = await supabase.from('professeur_formations')
        .update({ montant: Number(part), updated_at: new Date().toISOString() })
        .eq('teacher_id', teacherId)
        .eq('formation_id', formationId);
      if (pfErr) throw pfErr;
    }
    if (charges !== undefined) patch.charges_selectionnees = charges;

    const { error } = await supabase.from('bilan_formation_details').upsert(patch, { onConflict: 'bilan_id,formation_id' });
    if (error) throw error;

    // history log: only what really changed
    const n = (v) => (v == null ? null : Number(v));
    const changes = [];
    if (seances !== undefined && n(before?.seances) !== n(patch.seances)) {
      changes.push(`heures : "${before?.seances ?? 'auto'}" → "${patch.seances ?? 'auto'}"`);
    }
    if (revenusOverride !== undefined && n(before?.revenus_override) !== n(patch.revenus_override)) {
      changes.push(`revenus : "${before?.revenus_override != null ? dz(before.revenus_override) : 'auto'}" → "${patch.revenus_override != null ? dz(patch.revenus_override) : 'auto'}"`);
    }
    if (part !== undefined && partAvant !== Number(part)) changes.push(`part professeur : ${partAvant ?? '—'}% → ${Number(part)}%`);
    if (charges !== undefined) {
      const a = JSON.stringify([...(before?.charges_selectionnees ?? [])].sort());
      const b = JSON.stringify([...charges].sort());
      if (a !== b) changes.push(`charges : ${(before?.charges_selectionnees ?? []).length} → ${charges.length} sélectionnée(s)`);
    }
    if (changes.length > 0) {
      const [nom, { data: fo }] = await Promise.all([
        nomProf(teacherId),
        supabase.from('formations').select('nom').eq('id', formationId).maybeSingle(),
      ]);
      await logHistorique({
        req, perimetre: 'comptable', action: 'modification', entite: 'bilan_formation', entite_id: bilan.id,
        description: `a modifié la formation "${fo?.nom ?? '—'}" dans le bilan de ${nom} (${periodeLabel(mois, annee)}) : ${changes.join(' | ')}`,
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('upsertBilanFormationDetail:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

/* ------------------------------------------------------------------ */
/*  POST /api/salaires-professeurs/:teacherId/bilan/mouvements         */
/*  body: { mois, annee, type, description, montant, formationId? }    */
/* ------------------------------------------------------------------ */

const uploadBonMouvement = async (req, res) => {
  try {
    const { mouvementId } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Aucun fichier reçu' });

    const { data: mvt, error: selErr } = await supabase
      .from('mouvements_salaire_professeurs')
      .select('id, bons, teacher_id, type')
      .eq('id', mouvementId)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!mvt) return res.status(404).json({ error: 'Mouvement introuvable.' });
    const ext = file.mimetype.split('/')[1] || 'jpg';
    const path = `mouvements/${mouvementId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('bons-paiement')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('bons-paiement').getPublicUrl(path);

    const bon = { id: crypto.randomUUID(), url: publicUrl, path };
    const newBons = [...(mvt.bons ?? []), bon];
    const { error } = await supabase
      .from('mouvements_salaire_professeurs')
      .update({ bons: newBons })
      .eq('id', mouvementId);
    if (error) throw error;

    await logHistorique({
      req, perimetre: 'comptable', action: 'creation', entite: 'bon_mouvement_prof', entite_id: mouvementId,
      description: `a ajouté un bon à ${TYPE_MVT_LABEL[mvt.type] ?? 'un mouvement'} de ${await nomProf(mvt.teacher_id)}`,
    });
    res.status(201).json(bon);
  } catch (err) {
    console.error('uploadBonMouvement:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};
// old bons have no id → the url is used as key
const bonKey = (b) => b.id ?? b.url;
const bonPath = (b) => b.path ?? decodeURIComponent((b.url ?? '').split('/bons-paiement/')[1] ?? '');

const deleteBonMouvement = async (req, res) => {
  try {
    const { mouvementId, bonId } = req.params;
    const { data: mvt, error: selErr } = await supabase
      .from('mouvements_salaire_professeurs')
      .select('id, bons, teacher_id, type')
      .eq('id', mouvementId)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!mvt) return res.status(404).json({ error: 'Mouvement introuvable.' });

    const bons = mvt.bons ?? [];
    const bon = bons.find((b) => bonKey(b) === bonId);
    if (!bon) return res.status(404).json({ error: 'Bon introuvable.' });

    const path = bonPath(bon);
    if (path) {
      const { error: rmErr } = await supabase.storage.from('bons-paiement').remove([path]);
      if (rmErr) console.error('deleteBonMouvement storage:', rmErr);
    }

    const { error } = await supabase
      .from('mouvements_salaire_professeurs')
      .update({ bons: bons.filter((b) => bonKey(b) !== bonId) })
      .eq('id', mouvementId);
    if (error) throw error;

    await logHistorique({
      req, perimetre: 'comptable', action: 'suppression', entite: 'bon_mouvement_prof', entite_id: mouvementId,
      description: `a supprimé un bon de ${TYPE_MVT_LABEL[mvt.type] ?? 'un mouvement'} de ${await nomProf(mvt.teacher_id)}`,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteBonMouvement:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};
const addMouvement = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { mois, annee, type, description, montant, formationId } = req.body;
    if (!mois || !annee) return res.status(400).json({ error: 'Mois et année requis.' });
    if (!TYPES_MVT_VALID.includes(type)) return res.status(400).json({ error: 'Type de mouvement invalide.' });
    if (!description?.trim()) return res.status(400).json({ error: 'Description requise.' });
    const m = Number(montant);
    if (!(m > 0)) return res.status(400).json({ error: 'Montant invalide.' });

    const moisN = Number(mois);
    const anneeN = Number(annee);
    const bilan = await getOrCreateBilan(teacherId, moisN, anneeN);

    // date of the movement: today if it is in the bilan's month, else the first day of that month
    const today = todayDZ();
    const date = today.startsWith(`${anneeN}-${pad(moisN)}`) ? today : monthRange(moisN, anneeN).start;

    const { data, error } = await supabase
      .from('mouvements_salaire_professeurs')
      .insert({
        teacher_id: teacherId,
        bilan_id: bilan.id,
        formation_id: formationId || null,
        date,
        type,
        description: description.trim(),
        montant: m,
      })
      .select('*')
      .single();
    if (error) throw error;
    await logHistorique({
      req, perimetre: 'comptable', action: 'creation', entite: 'mouvement_salaire_prof', entite_id: data.id,
      description: `a ajouté ${TYPE_MVT_LABEL[type]} de ${dz(m)} pour ${await nomProf(teacherId)} (${periodeLabel(moisN, anneeN)}) : "${description.trim()}"`,
    });
    res.status(201).json(data);
  } catch (err) {
    console.error('addMouvement:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

/* ------------------------------------------------------------------ */
/*  DELETE /api/salaires-professeurs/mouvements/:mouvementId           */
/* ------------------------------------------------------------------ */
const updateMouvement = async (req, res) => {
  try {
    const { mouvementId } = req.params;
    const { type, description, montant, formationId } = req.body;
    if (!TYPES_MVT_VALID.includes(type)) return res.status(400).json({ error: 'Type de mouvement invalide.' });
    if (!description?.trim()) return res.status(400).json({ error: 'Description requise.' });
    const m = Number(montant);
    if (!(m > 0)) return res.status(400).json({ error: 'Montant invalide.' });

    const { data: before, error: selErr } = await supabase
      .from('mouvements_salaire_professeurs')
      .select('type, description, montant, teacher_id')
      .eq('id', mouvementId)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!before) return res.status(404).json({ error: 'Mouvement introuvable.' });

    const patch = { type, description: description.trim(), montant: m };
    if (formationId !== undefined) patch.formation_id = formationId || null;

    const { data, error } = await supabase
      .from('mouvements_salaire_professeurs')
      .update(patch)
      .eq('id', mouvementId)
      .select('*')
      .single();
    if (error) throw error;

    const changes = [];
    if (before.type !== type) changes.push(`type : "${before.type}" → "${type}"`);
    if (Number(before.montant) !== m) changes.push(`montant : "${dz(before.montant)}" → "${dz(m)}"`);
    if ((before.description ?? '') !== description.trim()) changes.push(`description : "${before.description ?? '—'}" → "${description.trim()}"`);
    if (changes.length > 0) {
      await logHistorique({
        req, perimetre: 'comptable', action: 'modification', entite: 'mouvement_salaire_prof', entite_id: mouvementId,
        description: `a modifié ${TYPE_MVT_LABEL[before.type] ?? 'un mouvement'} de ${await nomProf(before.teacher_id)} : ${changes.join(' | ')}`,
      });
    }
    res.json(data);
  } catch (err) {
    console.error('updateMouvement:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};
const deleteMouvement = async (req, res) => {
  try {
    const { data: mvt, error: selErr } = await supabase
      .from('mouvements_salaire_professeurs')
      .select('id, teacher_id, type, description, montant')
      .eq('id', req.params.mouvementId)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!mvt) return res.status(404).json({ error: 'Mouvement introuvable.' });

    const { error } = await supabase.from('mouvements_salaire_professeurs').delete().eq('id', req.params.mouvementId);
    if (error) throw error;

    await logHistorique({
      req, perimetre: 'comptable', action: 'suppression', entite: 'mouvement_salaire_prof', entite_id: mvt.id,
      description: `a supprimé ${TYPE_MVT_LABEL[mvt.type] ?? 'un mouvement'} de ${dz(mvt.montant)} pour ${await nomProf(mvt.teacher_id)} : "${mvt.description}"`,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteMouvement:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

/* ------------------------------------------------------------------ */
/*  PUT /api/salaires-professeurs/:teacherId/bilan/total               */
/*  body: { mois, annee, totalOverride }                               */
/* ------------------------------------------------------------------ */

const setTotalOverride = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { mois, annee, totalOverride } = req.body;
    if (!mois || !annee) return res.status(400).json({ error: 'Mois et année requis.' });

    const bilan = await getOrCreateBilan(teacherId, Number(mois), Number(annee));
    const apres = totalOverride === null ? null : Number(totalOverride);
    const avant = bilan.total_override != null ? Number(bilan.total_override) : null;

    const { error } = await supabase.from('bilans_salaires')
      .update({ total_override: apres, updated_at: new Date().toISOString() })
      .eq('id', bilan.id);
    if (error) throw error;

    if (avant !== apres) {
      await logHistorique({
        req, perimetre: 'comptable', action: 'modification', entite: 'bilan_salaire', entite_id: bilan.id,
        description: `a modifié le total du mois de ${await nomProf(teacherId)} pour ${periodeLabel(mois, annee)} : "${avant != null ? dz(avant) : 'calcul auto'}" → "${apres != null ? dz(apres) : 'calcul auto'}"`,
      });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('setTotalOverride:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

/* ------------------------------------------------------------------ */
/*  POST /api/salaires-professeurs/:teacherId/bilan/valider            */
/*  body: { mois, annee }                                              */
/* ------------------------------------------------------------------ */

const validerBilan = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { mois, annee } = req.body;
    if (!mois || !annee) return res.status(400).json({ error: 'Mois et année requis.' });
    const moisN = Number(mois);
    const anneeN = Number(annee);

    const bilan = await getOrCreateBilan(teacherId, moisN, anneeN);

    const [professeurs, all] = await Promise.all([
      buildProfesseurs(moisN, anneeN, teacherId),
      loadBilanData([teacherId], moisN, anneeN),
    ]);
    if (!professeurs[0]) return res.status(404).json({ error: 'Professeur introuvable.' });
    const formationIds = professeurs[0].formations.filter((f) => f.typeSalaire === 'Pourcentage').map((f) => f.id);
    const revenusMap = await loadRevenusFormations(formationIds, moisN, anneeN);
    const { total, totalCalcule } = applyBilan(professeurs[0], bilanDataOf(all, teacherId), revenusMap);

    const { error } = await supabase.from('bilans_salaires')
      .update({
        valide: true,
        date_validation: new Date().toISOString(),
        total_calcule_valide: totalCalcule, // reference for the "Recalculer" warning
        updated_at: new Date().toISOString(),
      })
      .eq('id', bilan.id);
    if (error) throw error;

    const nom = await nomProf(teacherId);
    const periode = periodeLabel(moisN, anneeN);
    await logHistorique({
      req, perimetre: 'comptable', action: bilan.valide ? 'modification' : 'creation', entite: 'bilan_salaire', entite_id: bilan.id,
      description: bilan.valide
        ? `a mis à jour le salaire validé de ${nom} pour ${periode} : ${dz(total)}`
        : `a validé le salaire de ${nom} pour ${periode} : ${dz(total)}`,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('validerBilan:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

/* ------------------------------------------------------------------ */
/*  POST /api/salaires-professeurs/:teacherId/bilan/envoyer            */
/*  body: { mois, annee }                                              */
/* ------------------------------------------------------------------ */

const envoyerBilan = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { mois, annee } = req.body;
    if (!mois || !annee) return res.status(400).json({ error: 'Mois et année requis.' });

    const bilan = await getOrCreateBilan(teacherId, Number(mois), Number(annee));
    if (!bilan.valide) return res.status(400).json({ error: 'Le bilan doit être validé avant envoi.' });

     const { error } = await supabase.from('bilans_salaires')
      .update({
        envoye: true,
        date_envoi: new Date().toISOString(),
        total_calcule_envoye: bilan.total_calcule_valide,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bilan.id);
    if (error) throw error;
    await logHistorique({
      req, perimetre: 'comptable', action: 'modification', entite: 'bilan_salaire', entite_id: bilan.id,
         description: `a ${bilan.envoye ? 'renvoyé' : 'envoyé'} le bilan de ${await nomProf(teacherId)} pour ${periodeLabel(mois, annee)} au professeur`,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('envoyerBilan:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

/* ------------------------------------------------------------------ */
/*  PUT /api/salaires-professeurs/:teacherId/bilan/paye                */
/*  body: { mois, annee, montant }  → montant = total déjà payé        */
/*  (le bilan doit être validé ; 0 <= montant <= total du mois)        */
/* ------------------------------------------------------------------ */

const setPaye = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { mois, annee, montant } = req.body;
    if (!mois || !annee) return res.status(400).json({ error: 'Mois et année requis.' });

    const m = Number(montant);
    if (Number.isNaN(m) || m < 0) return res.status(400).json({ error: 'Montant invalide.' });

    const moisN = Number(mois);
    const anneeN = Number(annee);
    const bilan = await getOrCreateBilan(teacherId, moisN, anneeN);
    if (!bilan.valide) return res.status(400).json({ error: 'Le bilan doit être validé avant d’enregistrer un paiement.' });

    // recompute the month's total to check the payment does not exceed it
    const [professeurs, all] = await Promise.all([
      buildProfesseurs(moisN, anneeN, teacherId),
      loadBilanData([teacherId], moisN, anneeN),
    ]);
  if (!professeurs[0]) return res.status(404).json({ error: 'Professeur introuvable.' });
    const formationIds = professeurs[0].formations.filter((f) => f.typeSalaire === 'Pourcentage').map((f) => f.id);
    const revenusMap = await loadRevenusFormations(formationIds, moisN, anneeN);
    const { total } = applyBilan(professeurs[0], bilanDataOf(all, teacherId), revenusMap);
    if (m > total) return res.status(400).json({ error: 'Le montant payé dépasse le total du mois.' });
    const { error } = await supabase.from('bilans_salaires')
      .update({ deja_paye: m, updated_at: new Date().toISOString() })
      .eq('id', bilan.id);
    if (error) throw error;
    if (Number(bilan.deja_paye ?? 0) !== m) {
      await logHistorique({
        req, perimetre: 'comptable', action: 'modification', entite: 'bilan_salaire', entite_id: bilan.id,
        description: `a modifié le montant payé de ${await nomProf(teacherId)} pour ${periodeLabel(moisN, anneeN)} : "${dz(bilan.deja_paye)}" → "${dz(m)}"`,
      });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('setPaye:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

/* ------------------------------------------------------------------ */
/*  GET /api/salaires-professeurs/:teacherId/historique                */
/*  Bilans validés des 12 derniers mois enregistrés, du plus récent    */
/*  au plus ancien : [{ mois, annee, montant, paye, statut }]          */
/*  statut : 'paye' | 'partiel' | 'non_paye'                           */
/* ------------------------------------------------------------------ */

const HISTORIQUE_LIMIT = 12;

const getHistorique = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const { data: bilans, error } = await supabase
      .from('bilans_salaires')
      .select('id, mois, annee, deja_paye')
      .eq('teacher_id', teacherId)
      .eq('valide', true)
      .order('annee', { ascending: false })
      .order('mois', { ascending: false })
      .limit(HISTORIQUE_LIMIT);
    if (error) throw error;
    if (!bilans?.length) return res.json([]);

    // Total of each month, computed exactly like the bilan screen
    const rows = await Promise.all(bilans.map(async (b) => {
      const [professeurs, all] = await Promise.all([
        buildProfesseurs(b.mois, b.annee, teacherId),
        loadBilanData([teacherId], b.mois, b.annee),
      ]);
      if (!professeurs[0]) return null;
      const formationIds = professeurs[0].formations.filter((f) => f.typeSalaire === 'Pourcentage').map((f) => f.id);
      const revenusMap = await loadRevenusFormations(formationIds, b.mois, b.annee);
      const r = applyBilan(professeurs[0], bilanDataOf(all, teacherId), revenusMap);
      const statut = r.statut === 'payé' ? 'paye' : r.statut === 'partiel' ? 'partiel' : 'non_paye';
        return { mois: b.mois, annee: b.annee, montant: r.total, paye: r.paye, statut };
    }));

    res.json(rows.filter(Boolean));
  } catch (err) {
    console.error('getHistorique:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

module.exports = {
  getProfesseurs, getProfesseur, buildProfesseurs, updateFormationRemuneration,
 getBilan, upsertBilanFormationDetail, addMouvement, updateMouvement, deleteMouvement,
  setTotalOverride, validerBilan, envoyerBilan, setPaye, getHistorique,
   uploadBonMouvement, deleteBonMouvement, upload,
  applyBilan, loadBilanData, bilanDataOf, loadRevenusFormations,getMesSalaires 
};