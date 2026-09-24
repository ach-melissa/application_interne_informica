const supabase = require('../supabaseClient');

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, '0');

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

const MSG_BILAN_VALIDE = 'Ce bilan est validé : il ne peut plus être modifié.';

/* ------------------------------------------------------------------ */
/*  Core: professors + their formations + séances for the month        */
/*  (exported so GET /:id can reuse it with teacherId)                 */
/* ------------------------------------------------------------------ */

const buildProfesseurs = async (mois, annee, teacherId = null) => {
  const { start, end } = monthRange(mois, annee);

  // 1. Professors with their groups and their declared formations
  let tq = supabase
    .from('teachers')
    .select(`
      id,
      user:user_id(id, nom, prenom, telephone, archived),
      groups(
        id, archived, formation_id, use_default_duree, type_duree,
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
    const { data: sessions, error: sErr } = await supabase
      .from('sessions')
      .select('group_id, duree_effectuee, heure_debut, heure_fin')
      .in('group_id', groupIds)
      .eq('statut', 'effectuee')
      .not('finalized_at', 'is', null)
      .gte('date', start)
      .lt('date', end);
    if (sErr) throw sErr;

    (sessions ?? []).forEach((s) => {
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
          typeDuree: typeDuree ?? formation.type_duree, // 'seances' | 'heures'
          nbGroupes: 0,
          nbSeances: 0,
          heuresEffectuees: 0,
          seancesSansDuree: 0,
          typeSalaire: cfg ? TYPE_TO_LABEL[cfg.type_salaire] : null,
          montant: cfg ? Number(cfg.montant) : 0,
          heures: cfg ? Number(cfg.heures) : 0,
          montantPeriode: 0,
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
const applyBilan = (professeur, { bilan, details, mouvements, charges }) => {
  const detailOf = (formationId) => details.find((d) => d.formation_id === formationId);

  const formations = professeur.formations.map((f) => {
    const d = detailOf(f.id);
    if (f.typeSalaire === 'Pourcentage') {
      const part = d?.part_pct != null ? Number(d.part_pct) : (Number(f.montant) || 40);
      const selected = d?.charges_selectionnees ?? [];
      const revenusOverride = d?.revenus_override != null ? Number(d.revenus_override) : null;
      const revenus = revenusOverride ?? 0; // TODO: calcul auto en attente
      const totalCharges = charges.filter((c) => selected.includes(c.id)).reduce((s, c) => s + Number(c.montant), 0);
      return { ...f, part, charges: selected, revenusOverride, montantPeriode: Math.round((revenus - totalCharges) * (part / 100)) };
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
    paye,
    valide,
    envoye: bilan?.envoye ?? false,
    statut: computeStatut(valide, total, paye),
  };
};

// Bilan data of one or several professors for a month, in a fixed number of queries.
const loadBilanData = async (teacherIds, mois, annee) => {
  const [bilansRes, chargesRes] = await Promise.all([
    supabase.from('bilans_salaires').select('*').in('teacher_id', teacherIds).eq('mois', mois).eq('annee', annee),
    supabase.from('charges').select('id, description, montant'),
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
const toListItem = (professeur, all) => {
  const r = applyBilan(professeur, bilanDataOf(all, professeur.id));
  return { ...professeur, formations: r.formations, total: r.total, paye: r.paye, statut: r.statut };
};

/* ------------------------------------------------------------------ */
/*  GET /api/salaires-professeurs?mois=&annee=                         */
/* ------------------------------------------------------------------ */

const getProfesseurs = async (req, res) => {
  try {
    const periode = readPeriode(req.query);
    if (!periode) return res.status(400).json({ error: 'Mois invalide (1 à 12).' });
    const { mois, annee } = periode;

    const professeurs = await buildProfesseurs(mois, annee);
    if (!professeurs.length) return res.json([]);

    const all = await loadBilanData(professeurs.map((p) => p.id), mois, annee);
    res.json(professeurs.map((p) => toListItem(p, all)));
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

    res.json(toListItem(professeur, all));
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

    const data = bilanDataOf(all, teacherId);
    const r = applyBilan(professeur, data);

    res.json({
      formations: r.formations,
      mouvements: data.mouvements,
      charges: data.charges,
      totalCalcule: r.totalCalcule,
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
    if (bilan.valide) return res.status(409).json({ error: MSG_BILAN_VALIDE });

    const patch = { bilan_id: bilan.id, formation_id: formationId, updated_at: new Date().toISOString() };
    if (seances !== undefined) patch.seances = seances === null ? null : Number(seances) || 0;
    if (revenusOverride !== undefined) patch.revenus_override = revenusOverride === null ? null : Number(revenusOverride);
    if (part !== undefined) patch.part_pct = Number(part);
    if (charges !== undefined) patch.charges_selectionnees = charges;

    const { error } = await supabase.from('bilan_formation_details').upsert(patch, { onConflict: 'bilan_id,formation_id' });
    if (error) throw error;
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
    if (bilan.valide) return res.status(409).json({ error: MSG_BILAN_VALIDE });

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
    res.status(201).json(data);
  } catch (err) {
    console.error('addMouvement:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

/* ------------------------------------------------------------------ */
/*  DELETE /api/salaires-professeurs/mouvements/:mouvementId           */
/* ------------------------------------------------------------------ */

const deleteMouvement = async (req, res) => {
  try {
    const { data: mvt, error: selErr } = await supabase
      .from('mouvements_salaire_professeurs')
      .select('id, bilan:bilan_id(valide)')
      .eq('id', req.params.mouvementId)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!mvt) return res.status(404).json({ error: 'Mouvement introuvable.' });
    if (mvt.bilan?.valide) return res.status(409).json({ error: MSG_BILAN_VALIDE });

    const { error } = await supabase.from('mouvements_salaire_professeurs').delete().eq('id', req.params.mouvementId);
    if (error) throw error;
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
    if (bilan.valide) return res.status(409).json({ error: MSG_BILAN_VALIDE });

    const { error } = await supabase.from('bilans_salaires')
      .update({ total_override: totalOverride === null ? null : Number(totalOverride), updated_at: new Date().toISOString() })
      .eq('id', bilan.id);
    if (error) throw error;
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

    const bilan = await getOrCreateBilan(teacherId, Number(mois), Number(annee));
    if (bilan.valide) return res.json({ ok: true }); // déjà validé : rien à faire

    const { error } = await supabase.from('bilans_salaires')
      .update({ valide: true, date_validation: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', bilan.id);
    if (error) throw error;
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
      .update({ envoye: true, date_envoi: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', bilan.id);
    if (error) throw error;
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
    const { total } = applyBilan(professeurs[0], bilanDataOf(all, teacherId));
    if (m > total) return res.status(400).json({ error: 'Le montant payé dépasse le total du mois.' });

    const { error } = await supabase.from('bilans_salaires')
      .update({ deja_paye: m, updated_at: new Date().toISOString() })
      .eq('id', bilan.id);
    if (error) throw error;
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
      const r = applyBilan(professeurs[0], bilanDataOf(all, teacherId));
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
  getBilan, upsertBilanFormationDetail, addMouvement, deleteMouvement,
  setTotalOverride, validerBilan, envoyerBilan, setPaye, getHistorique,
};