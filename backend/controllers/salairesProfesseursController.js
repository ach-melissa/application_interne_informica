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

// Current month in Algeria time (used when ?mois=&annee= are missing)
const currentMonthDZ = () => {
  const [y, m] = new Date()
    .toLocaleDateString('en-CA', { timeZone: 'Africa/Algiers' })
    .split('-')
    .map(Number);
  return { mois: m, annee: y };
};

// DB values <-> labels used by the frontend
const TYPE_TO_LABEL = { fixe: 'Fixe', heure: "À l'heure", pourcentage: 'Pourcentage' };
const LABEL_TO_TYPE = { Fixe: 'fixe', "À l'heure": 'heure', Pourcentage: 'pourcentage' };

// Amount for the month of ONE formation.
// - fixe: the fixed amount
// - heure: rate x hours done (real hours if the formation is counted in hours, else séances)
// - pourcentage: needs students x price -> computed in the bilan step (0 here for now)
const computeMontantPeriode = (f) => {
  if (f.typeSalaire === 'Fixe') return f.montant;
  if (f.typeSalaire === "À l'heure") {
    const units = f.typeDuree === 'heures' ? f.heuresEffectuees : f.nbSeances;
    return Math.round(f.montant * units);
  }
  return 0;
};

/* ------------------------------------------------------------------ */
/*  Core: professors + their formations + séances for the month        */
/*  (exported so GET /:id can reuse it later with teacherId)           */
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
  const perGroup = {}; // group_id → { nb, heures }
  if (groupIds.length) {
    const { data: sessions, error: sErr } = await supabase
      .from('sessions')
      .select('group_id, duree_effectuee')
      .in('group_id', groupIds)
      .eq('statut', 'effectuee')
      .not('finalized_at', 'is', null)
      .gte('date', start)
      .lt('date', end);
    if (sErr) throw sErr;

    (sessions ?? []).forEach((s) => {
      const acc = (perGroup[s.group_id] ??= { nb: 0, heures: 0 });
      acc.nb += 1;
      acc.heures += Number(s.duree_effectuee) || 0;
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
      });

    return {
      id: t.id,
      nom: [t.user.nom, t.user.prenom].filter(Boolean).join(' '),
      poste: 'Formateur', // no column for it in users/teachers
      telephone: t.user.telephone ?? null,
      statut: 'à_saisir', // TODO: computed from salaires_professeurs in a later step
      formations: Object.values(byFormation).map((f) => ({ ...f, montantPeriode: computeMontantPeriode(f) })),
    };
  });
};

/* ------------------------------------------------------------------ */
/*  GET /api/salaires-professeurs?mois=&annee=                         */
/* ------------------------------------------------------------------ */

const getProfesseurs = async (req, res) => {
  try {
    const def = currentMonthDZ();
    const mois = Number(req.query.mois) || def.mois;
    const annee = Number(req.query.annee) || def.annee;

    if (mois < 1 || mois > 12) {
      return res.status(400).json({ error: 'Mois invalide (1 à 12).' });
    }

    res.json(await buildProfesseurs(mois, annee));
  } catch (err) {
    console.error('getProfesseurs:', err);
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
    const { typeSalaire, montant, heures } = req.body;

    const type = LABEL_TO_TYPE[typeSalaire];
    if (!type) return res.status(400).json({ error: 'Type de rémunération invalide.' });

    const m = Number(montant);
    const h = Number(heures) || 0;
    if (!(m > 0)) return res.status(400).json({ error: 'Montant invalide.' });
    if (type === 'pourcentage' && m > 100) return res.status(400).json({ error: 'Le pourcentage doit être entre 1 et 100.' });
    if (type === 'heure' && !(h > 0)) return res.status(400).json({ error: "Renseignez le nombre d'heures." });

    const { error } = await supabase.from('professeur_formations').upsert(
      {
        teacher_id: teacherId,
        formation_id: formationId,
        type_salaire: type,
        montant: m,
        heures: type === 'heure' ? h : 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'teacher_id,formation_id' }
    );
    if (error) throw error;

    res.json({ typeSalaire, montant: m, heures: type === 'heure' ? h : 0 });
  } catch (err) {
    console.error('updateFormationRemuneration:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

module.exports = { getProfesseurs, buildProfesseurs, updateFormationRemuneration };