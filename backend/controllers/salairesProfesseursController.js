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
/* ------------------------------------------------------------------ */
/*  Bilan mensuel                                                      */
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

// GET /api/salaires-professeurs/:teacherId/bilan?mois=&annee=
const getBilan = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const def = currentMonthDZ();
    const mois = Number(req.query.mois) || def.mois;
    const annee = Number(req.query.annee) || def.annee;

    const [professeurs, bilanRes, chargesRes] = await Promise.all([
      buildProfesseurs(mois, annee, teacherId),
      supabase.from('bilans_salaires').select('*').eq('teacher_id', teacherId).eq('mois', mois).eq('annee', annee).maybeSingle(),
      supabase.from('charges').select('id, description, montant'),
    ]);
    if (bilanRes.error) throw bilanRes.error;
    if (chargesRes.error) throw chargesRes.error;

    const professeur = professeurs[0];
    if (!professeur) return res.status(404).json({ error: 'Professeur introuvable.' });

    const bilan = bilanRes.data;
    let details = [];
    let mouvements = [];
    if (bilan) {
      const [detRes, mvtRes] = await Promise.all([
        supabase.from('bilan_formation_details').select('*').eq('bilan_id', bilan.id),
        supabase.from('mouvements_salaire_professeurs').select('*').eq('bilan_id', bilan.id).order('created_at', { ascending: true }),
      ]);
      if (detRes.error) throw detRes.error;
      if (mvtRes.error) throw mvtRes.error;
      details = detRes.data ?? [];
      mouvements = mvtRes.data ?? [];
    }
    const detailOf = (formationId) => details.find((d) => d.formation_id === formationId);
    const charges = chargesRes.data ?? [];

    const formations = professeur.formations.map((f) => {
      const d = detailOf(f.id);
      if (f.typeSalaire === 'Pourcentage') {
        const part = d?.part_pourcentage ?? (Number(f.montant) || 40);
        const selected = d?.charges_selectionnees ?? [];
        const revenus = d?.revenus_override ?? 0; // TODO: calcul auto en attente (point 4)
        const totalCharges = charges.filter((c) => selected.includes(c.id)).reduce((s, c) => s + Number(c.montant), 0);
        return { ...f, part, charges: selected, revenusOverride: d?.revenus_override ?? null, montantPeriode: Math.round((revenus - totalCharges) * (part / 100)) };
      }
      if (f.typeSalaire === "À l'heure" && d?.seances != null) {
        return { ...f, nbSeances: d.seances, montantPeriode: Math.round(Number(f.montant) * d.seances) };
      }
      return f;
    });

    const totalFormations = formations.reduce((s, f) => s + f.montantPeriode, 0);
    const totalMouvements = mouvements.reduce((s, m) => s + SIGNE_MVT[m.type] * Number(m.montant), 0);
    const totalCalcule = totalFormations + totalMouvements;

    res.json({
      formations,
      mouvements,
      charges,
      totalCalcule,
      totalOverride: bilan?.total_override ?? null,
      total: bilan?.total_override ?? totalCalcule,
      paye: 0, // TODO: paiements réels non gérés
      valide: bilan?.valide ?? false,
      envoye: bilan?.envoye ?? false,
    });
  } catch (err) {
    console.error('getBilan:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

// PUT /api/salaires-professeurs/:teacherId/bilan/formation/:formationId
// body: { mois, annee, seances?, revenusOverride?, part?, charges? }
const upsertBilanFormationDetail = async (req, res) => {
  try {
    const { teacherId, formationId } = req.params;
    const { mois, annee, seances, revenusOverride, part, charges } = req.body;
    if (!mois || !annee) return res.status(400).json({ error: 'Mois et année requis.' });

    const bilan = await getOrCreateBilan(teacherId, Number(mois), Number(annee));
    const patch = { bilan_id: bilan.id, formation_id: formationId, updated_at: new Date().toISOString() };
    if (seances !== undefined) patch.seances = Number(seances) || 0;
    if (revenusOverride !== undefined) patch.revenus_override = revenusOverride === null ? null : Number(revenusOverride);
    if (part !== undefined) patch.part_pourcentage = Number(part);
    if (charges !== undefined) patch.charges_selectionnees = charges;

    const { error } = await supabase.from('bilan_formation_details').upsert(patch, { onConflict: 'bilan_id,formation_id' });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('upsertBilanFormationDetail:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

// POST /api/salaires-professeurs/:teacherId/bilan/mouvements
// body: { mois, annee, type, description, montant }
const addMouvement = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { mois, annee, type, description, montant } = req.body;
    if (!mois || !annee) return res.status(400).json({ error: 'Mois et année requis.' });
    if (!TYPES_MVT_VALID.includes(type)) return res.status(400).json({ error: 'Type de mouvement invalide.' });
    if (!description?.trim()) return res.status(400).json({ error: 'Description requise.' });
    const m = Number(montant);
    if (!(m > 0)) return res.status(400).json({ error: 'Montant invalide.' });

    const bilan = await getOrCreateBilan(teacherId, Number(mois), Number(annee));
    const { data, error } = await supabase
      .from('mouvements_salaire_professeurs')
      .insert({ bilan_id: bilan.id, type, description: description.trim(), montant: m })
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('addMouvement:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

// DELETE /api/salaires-professeurs/mouvements/:mouvementId
const deleteMouvement = async (req, res) => {
  try {
    const { error } = await supabase.from('mouvements_salaire_professeurs').delete().eq('id', req.params.mouvementId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteMouvement:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

// PUT /api/salaires-professeurs/:teacherId/bilan/total  body: { mois, annee, totalOverride }
const setTotalOverride = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { mois, annee, totalOverride } = req.body;
    if (!mois || !annee) return res.status(400).json({ error: 'Mois et année requis.' });
    const bilan = await getOrCreateBilan(teacherId, Number(mois), Number(annee));
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

// POST /api/salaires-professeurs/:teacherId/bilan/valider  body: { mois, annee }
const validerBilan = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { mois, annee } = req.body;
    if (!mois || !annee) return res.status(400).json({ error: 'Mois et année requis.' });
    const bilan = await getOrCreateBilan(teacherId, Number(mois), Number(annee));
    const { error } = await supabase.from('bilans_salaires')
      .update({ valide: true, date_validation: new Date().toISOString() })
      .eq('id', bilan.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('validerBilan:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

// POST /api/salaires-professeurs/:teacherId/bilan/envoyer  body: { mois, annee }
const envoyerBilan = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { mois, annee } = req.body;
    if (!mois || !annee) return res.status(400).json({ error: 'Mois et année requis.' });
    const bilan = await getOrCreateBilan(teacherId, Number(mois), Number(annee));
    if (!bilan.valide) return res.status(400).json({ error: 'Le bilan doit être validé avant envoi.' });
    const { error } = await supabase.from('bilans_salaires')
      .update({ envoye: true, date_envoi: new Date().toISOString() })
      .eq('id', bilan.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('envoyerBilan:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};
module.exports = {
  getProfesseurs, buildProfesseurs, updateFormationRemuneration,
  getBilan, upsertBilanFormationDetail, addMouvement, deleteMouvement,
  setTotalOverride, validerBilan, envoyerBilan,
};