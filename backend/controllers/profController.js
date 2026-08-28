const supabase = require('../supabaseClient');

// Helper : capitalise "lundi" → "Lundi"
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// Helper : date du jour en Algérie, format YYYY-MM-DD
const todayAlgeria = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Algiers' });

const getJourSemaine = (dateStr) =>
  new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'Africa/Algiers' });

// Helper : compare une date de séance (YYYY-MM-DD ou ISO) à aujourd'hui
const isSessionToday = (sessionDate) => {
  if (!sessionDate) return false;
  return sessionDate.slice(0, 10) === todayAlgeria();
};

// ============================================================
// ADMIN — liste tous les profs avec leurs groupes/formations
// ============================================================
const AVATAR_BUCKET = 'avatars';
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 7; // 7 jours

const getProfPhotoUrl = async (photoPath) => {
  if (!photoPath) return null;
  const { data, error } = await supabase
    .storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(photoPath, SIGNED_URL_EXPIRY);
  return error ? null : data.signedUrl;
};

const isGroupCurrent = (g) => {
  if (g.archived) return false;
  if (g.statut && g.statut !== 'active') return false;
  if (g.date_fin && new Date(g.date_fin) < new Date()) return false;
  return true;
};

const getProfs = async (req, res) => {
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      id,
      user:user_id(id, nom, prenom, email, telephone, archived, photo_path),
groups(
  id, nom, archived, statut, date_fin,
  formation:formation_id(id, nom)
),
teacher_formations(
  formation:formation_id(id, nom)
)
    `)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const result = await Promise.all(
    data.map(async (t) => {
      const currentGroups = (t.groups ?? []).filter(isGroupCurrent);
      const groupsWithCounts = await Promise.all(
        currentGroups.map(async (g) => {
          const { count } = await supabase
            .from('inscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', g.id);
          return { ...g, nb_etudiants: count ?? 0 };
        })
      );

      const photo_url = await getProfPhotoUrl(t.user?.photo_path);

      return {
        id: t.id,
        nom: t.user?.nom ?? '',
        prenom: t.user?.prenom ?? '',
        email: t.user?.email ?? '',
        telephone: t.user?.telephone ?? '',
        archived: t.user?.archived ?? false,
        photo_url,
           formations: [...new Map(
          (t.teacher_formations ?? [])
            .filter((tf) => tf.formation?.id)
            .map((tf) => [tf.formation.id, { id: tf.formation.id, nom: tf.formation.nom }])
        ).values()],
        groups: groupsWithCounts,
      };
    })
  );

  res.json(result);
};

// ============================================================
// PROF — ses propres groupes + formations + schedules
// ============================================================
const getProfGroups = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (tErr || !teacher) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    const { data: groups, error } = await supabase
      .from('groups')
      .select('*, formations(nom), schedules(jour_semaine, heure_debut, heure_fin)')
      .eq('teacher_id', teacher.id)
      .eq('archived', false);

    if (error) return res.status(500).json({ message: 'Erreur serveur' });

const result = await Promise.all(
      groups.map(async (g) => {
        const scheduleMap = {};
        (g.schedules || []).forEach((s) => {
          const jour = capitalize(s.jour_semaine);
          if (!scheduleMap[jour]) scheduleMap[jour] = [];
          const debut = s.heure_debut?.slice(0, 5);
          const fin = s.heure_fin?.slice(0, 5);
          scheduleMap[jour].push(`${debut} - ${fin}`);
        });

        const { count } = await supabase
          .from('inscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id);

        return { ...g, schedule: scheduleMap, nb_etudiants: count ?? 0 };
      })
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PROF — détail d'un seul groupe (fiche: formation, prof, dates)
// ============================================================
const getProfGroup = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id, user:user_id(nom, prenom)')
      .eq('user_id', req.user.id)
      .single();

    if (tErr || !teacher) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    const { data: group, error } = await supabase
      .from('groups')
      .select('id, nom, date_debut, date_fin, formations(nom)')
      .eq('id', req.params.groupId)
      .eq('teacher_id', teacher.id)
      .single();

    if (error || !group) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const { data: joursOrdre, error: joursErr } = await supabase.rpc('get_day_enum_values');
    if (joursErr) return res.status(500).json({ message: joursErr.message });
    const ordre = joursOrdre || [];
    const jourRank = (j) => {
      const i = ordre.indexOf((j || '').toLowerCase());
      return i === -1 ? ordre.length : i;
    };

    const { data: schedules, error: schedErr } = await supabase
      .from('schedules')
      .select('jour_semaine, heure_debut, heure_fin')
      .eq('group_id', req.params.groupId);
    if (schedErr) return res.status(500).json({ message: schedErr.message });

    const sorted = (schedules || []).slice().sort((a, b) => {
      const r = jourRank(a.jour_semaine) - jourRank(b.jour_semaine);
      return r !== 0 ? r : (a.heure_debut || '').localeCompare(b.heure_debut || '');
    });
    const jours_formation = [...new Set(sorted.map((s) => s.jour_semaine))]
      .sort((a, b) => jourRank(a) - jourRank(b))
      .map(capitalize)
      .join(', ');
    const heure_formation = sorted
      .filter((s) => s.heure_debut && s.heure_fin)
      .map((s) => `${capitalize(s.jour_semaine)} : ${s.heure_debut.slice(0, 5)}-${s.heure_fin.slice(0, 5)}`)
      .join(', ');

    res.json({ ...group, jours_formation, heure_formation, teacher: { user: teacher.user } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PROF — étudiants confirmés d'un de ses groupes
// ============================================================
const getProfGroupStudents = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (tErr || !teacher) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', req.params.groupId)
      .eq('teacher_id', teacher.id)
      .single();

    if (!group) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const { data: students, error } = await supabase
      .from('inscriptions')
      .select('id, etudiant_id, etudiants(id, nom, prenom, telephone, email, niveau_scolaire)')
      .eq('group_id', req.params.groupId)
      .eq('statut', 'confirmed');

    if (error) return res.status(500).json({ message: 'Erreur serveur' });
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PROF — modifier les infos d'un étudiant (tél, email, niveau)
// ============================================================
const updateProfGroupStudent = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (tErr || !teacher) return res.status(404).json({ message: 'Professeur introuvable' });

    // Vérifie que ce groupe appartient bien à ce prof
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', req.params.groupId)
      .eq('teacher_id', teacher.id)
      .single();

    if (!group) return res.status(403).json({ message: 'Accès refusé' });

    const { telephone, email, niveau_scolaire } = req.body;
    const allowedFields = {};
    if (telephone !== undefined) allowedFields.telephone = telephone;
    if (email !== undefined) allowedFields.email = email;
    if (niveau_scolaire !== undefined) allowedFields.niveau_scolaire = niveau_scolaire;

    const { data, error } = await supabase
      .from('etudiants')
      .update(allowedFields)
      .eq('id', req.params.etudiantId)
      .select()
      .single();

    if (error) return res.status(500).json({ message: 'Erreur serveur' });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PROF — modifier le planning d'un groupe
// ============================================================
const updateProfGroupSchedule = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (tErr || !teacher) return res.status(404).json({ message: 'Professeur introuvable' });

    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', req.params.groupId)
      .eq('teacher_id', teacher.id)
      .single();

    if (!group) return res.status(403).json({ message: 'Accès refusé' });

    const { schedule } = req.body;

    const { error: delErr } = await supabase
      .from('schedules')
      .delete()
      .eq('group_id', req.params.groupId);

    if (delErr) return res.status(500).json({ message: 'Erreur suppression horaires' });

    const rows = [];
    for (const [jour, slots] of Object.entries(schedule ?? {})) {
      for (const slot of slots) {
        const [debut, fin] = slot.split(' - ');
        rows.push({
          group_id: req.params.groupId,
          jour_semaine: jour.toLowerCase(),
          heure_debut: debut?.trim(),
          heure_fin: fin?.trim(),
        });
      }
    }

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('schedules').insert(rows);
      if (insErr) return res.status(500).json({ message: 'Erreur insertion horaires' });
    }

    res.json({ message: 'Horaires mis à jour', schedule });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PROF — pointage (sessions + attendance) d'un de ses groupes
// ============================================================
const getProfGroupAttendance = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (tErr || !teacher) {
      return res.status(404).json({ message: 'Professeur introuvable' });
    }

    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', req.params.groupId)
      .eq('teacher_id', teacher.id)
      .single();

    if (!group) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const { data: sessions, error: sErr } = await supabase
      .from('sessions')
      .select('id, date, statut, duree, type_seance, prof_id')
      .eq('group_id', req.params.groupId)
      .order('date', { ascending: true });

    if (sErr) return res.status(500).json({ message: 'Erreur serveur' });

    if (!sessions || sessions.length === 0) {
      return res.json({ sessions: [], records: [] });
    }

    const sessionIds = sessions.map((s) => s.id);

    const { data: records, error: aErr } = await supabase
      .from('attendance')
      .select('id, session_id, etudiant_id, statut')
      .in('session_id', sessionIds);

    if (aErr) return res.status(500).json({ message: 'Erreur serveur' });

    res.json({ sessions, records: records ?? [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PROF — créer une séance
// ============================================================
const createProfGroupSession = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (tErr || !teacher) return res.status(404).json({ message: 'Professeur introuvable' });

    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', req.params.groupId)
      .eq('teacher_id', teacher.id)
      .single();

    if (!group) return res.status(403).json({ message: 'Accès refusé' });

    const { date, type_seance } = req.body;
    if (!date) return res.status(400).json({ message: 'Date requise' });

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        group_id: req.params.groupId,
        date,
        type_seance: type_seance === 'remplacement' ? 'remplacement' : 'normale',
        statut: 'effectuee',
        prof_id: req.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('createProfGroupSession:', error);
      return res.status(500).json({ message: error.message });
    }
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PROF — modifier une séance (date, durée)
// Verrouillé dès que la date de la séance n'est plus aujourd'hui
// ============================================================
const updateProfGroupSession = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (tErr || !teacher) return res.status(404).json({ message: 'Professeur introuvable' });

    const { data: session } = await supabase
      .from('sessions')
      .select('id, group_id, date, groups(teacher_id)')
      .eq('id', req.params.sessionId)
      .single();

    if (!session || session.groups?.teacher_id !== teacher.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    if (!isSessionToday(session.date)) {
      return res.status(403).json({ message: 'Cette séance ne peut plus être modifiée (jour passé)' });
    }

    const { date, duree, emarg_enseignant, emarg_stagiaires, statut, type_seance } = req.body;
    const patch = {};
    if (date              !== undefined) patch.date              = date;
    if (duree             !== undefined) patch.duree             = duree;
    if (emarg_enseignant  !== undefined) patch.emarg_enseignant  = emarg_enseignant;
    if (emarg_stagiaires  !== undefined) patch.emarg_stagiaires  = emarg_stagiaires;
    if (statut            !== undefined) patch.statut            = statut;
    if (type_seance       !== undefined) patch.type_seance       = type_seance;

    const { data, error } = await supabase
      .from('sessions')
      .update(patch)
      .eq('id', req.params.sessionId)
      .select()
      .single();

    if (error) {
      console.error('updateProfGroupSession:', error);
      return res.status(500).json({ message: error.message });
    }
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PROF — supprimer une séance
// Verrouillé dès que la date de la séance n'est plus aujourd'hui
// ============================================================
const deleteProfGroupSession = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (tErr || !teacher) return res.status(404).json({ message: 'Professeur introuvable' });

    const { data: session } = await supabase
      .from('sessions')
      .select('id, group_id, date, groups(teacher_id)')
      .eq('id', req.params.sessionId)
      .single();

    if (!session || session.groups?.teacher_id !== teacher.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    if (!isSessionToday(session.date)) {
      return res.status(403).json({ message: 'Cette séance ne peut plus être supprimée (jour passé)' });
    }

    await supabase.from('attendance').delete().eq('session_id', req.params.sessionId);

    const { error } = await supabase.from('sessions').delete().eq('id', req.params.sessionId);
    if (error) return res.status(500).json({ message: 'Erreur serveur' });

    res.json({ message: 'Séance supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PROF — créer un enregistrement d'attendance
// Verrouillé dès que la date de la séance n'est plus aujourd'hui
// ============================================================
const createAttendanceRecord = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (tErr || !teacher) return res.status(404).json({ message: 'Professeur introuvable' });

    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', req.params.groupId)
      .eq('teacher_id', teacher.id)
      .single();

    if (!group) return res.status(403).json({ message: 'Accès refusé' });

    const { session_id, etudiant_id, statut } = req.body;

    const { data: session } = await supabase
      .from('sessions')
      .select('id, date')
      .eq('id', session_id)
      .eq('group_id', req.params.groupId)
      .single();

    if (!session) return res.status(404).json({ message: 'Séance introuvable' });

    if (!isSessionToday(session.date)) {
      return res.status(403).json({ message: 'Cette séance ne peut plus être pointée (jour passé)' });
    }

    const { data, error } = await supabase
      .from('attendance')
      .insert({ session_id, etudiant_id, statut })
      .select()
      .single();

    if (error) return res.status(500).json({ message: 'Erreur serveur' });
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PROF — modifier un enregistrement d'attendance
// Verrouillé dès que la date de la séance n'est plus aujourd'hui
// ============================================================
const updateAttendanceRecord = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (tErr || !teacher) return res.status(404).json({ message: 'Professeur introuvable' });

    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', req.params.groupId)
      .eq('teacher_id', teacher.id)
      .single();

    if (!group) return res.status(403).json({ message: 'Accès refusé' });

    const { data: record } = await supabase
      .from('attendance')
      .select('id, session_id, sessions(date, group_id)')
      .eq('id', req.params.recordId)
      .single();

    if (!record || record.sessions?.group_id !== req.params.groupId) {
      return res.status(404).json({ message: 'Enregistrement introuvable' });
    }

    if (!isSessionToday(record.sessions?.date)) {
      return res.status(403).json({ message: 'Ce pointage ne peut plus être modifié (jour passé)' });
    }

    const { statut } = req.body;

    const { data, error } = await supabase
      .from('attendance')
      .update({ statut })
      .eq('id', req.params.recordId)
      .select()
      .single();

    if (error) return res.status(500).json({ message: 'Erreur serveur' });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PROF — supprimer un enregistrement d'attendance
// Verrouillé dès que la date de la séance n'est plus aujourd'hui
// ============================================================
const deleteAttendanceRecord = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (tErr || !teacher) return res.status(404).json({ message: 'Professeur introuvable' });

    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('id', req.params.groupId)
      .eq('teacher_id', teacher.id)
      .single();

    if (!group) return res.status(403).json({ message: 'Accès refusé' });

    const { data: record } = await supabase
      .from('attendance')
      .select('id, session_id, sessions(date, group_id)')
      .eq('id', req.params.recordId)
      .single();

    if (!record || record.sessions?.group_id !== req.params.groupId) {
      return res.status(404).json({ message: 'Enregistrement introuvable' });
    }

    if (!isSessionToday(record.sessions?.date)) {
      return res.status(403).json({ message: 'Ce pointage ne peut plus être supprimé (jour passé)' });
    }

    const { error } = await supabase.from('attendance').delete().eq('id', req.params.recordId);
    if (error) return res.status(500).json({ message: 'Erreur serveur' });

    res.json({ message: 'Enregistrement supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  getProfs,
  getProfGroups,
  getProfGroup,
  getProfGroupStudents,
  updateProfGroupStudent,
  updateProfGroupSchedule,
  getProfGroupAttendance,
  createProfGroupSession,
  updateProfGroupSession,
  deleteProfGroupSession,
  createAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,
};