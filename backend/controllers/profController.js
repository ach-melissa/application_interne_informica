const supabase = require('../supabaseClient');

// Helper : capitalise "lundi" → "Lundi"
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// ============================================================
// ADMIN — liste tous les profs avec leurs groupes/formations
// ============================================================
const getProfs = async (req, res) => {
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      id,
      user:user_id(id, nom, prenom, email, telephone),
      groups(
        id, nom,
        formation:formation_id(nom)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const result = data.map((t) => ({
    id: t.id,
    nom: t.user?.nom ?? '',
    prenom: t.user?.prenom ?? '',
    email: t.user?.email ?? '',
    telephone: t.user?.telephone ?? '',
    formations: [...new Set(t.groups?.map((g) => g.formation?.nom).filter(Boolean))],
    groups: t.groups ?? [],
  }));

  res.json(result);
};

// ============================================================
// ADMIN — pointage d'un groupe par group_id (query param)
// ============================================================
const getProfPointage = async (req, res) => {
  const { group_id } = req.query;

  const { data: sessions, error: sessError } = await supabase
    .from('sessions')
    .select('id, date, statut')
    .eq('group_id', group_id)
    .order('date', { ascending: true });

  if (sessError) return res.status(500).json({ error: sessError.message });

  const { data: inscriptions, error: insError } = await supabase
    .from('inscriptions')
    .select('etudiant:etudiant_id(id, nom, prenom)')
    .eq('group_id', group_id);

  if (insError) return res.status(500).json({ error: insError.message });

  const sessionIds = sessions.map((s) => s.id);

  let attendance = [];
  if (sessionIds.length > 0) {
    const { data: attData, error: attError } = await supabase
      .from('attendance')
      .select('session_id, etudiant_id, statut')
      .in('session_id', sessionIds);

    if (attError) return res.status(500).json({ error: attError.message });
    attendance = attData;
  }

  res.json({ sessions, inscriptions, attendance });
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

    const result = groups.map((g) => {
      const scheduleMap = {};
      (g.schedules || []).forEach((s) => {
        const jour = capitalize(s.jour_semaine);
        if (!scheduleMap[jour]) scheduleMap[jour] = [];
        const debut = s.heure_debut?.slice(0, 5);
        const fin = s.heure_fin?.slice(0, 5);
        scheduleMap[jour].push(`${debut} - ${fin}`);
      });
      return { ...g, schedule: scheduleMap };
    });

    res.json(result);
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
// schedule body: { schedule: { "Lundi": ["09:00 - 11:00"], ... } }
// Strategy: delete existing rows, insert new ones
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

    const { schedule } = req.body; // { Lundi: ['09:00 - 11:00'], ... }

    // Delete all existing schedules for this group
    const { error: delErr } = await supabase
      .from('schedules')
      .delete()
      .eq('group_id', req.params.groupId);

    if (delErr) return res.status(500).json({ message: 'Erreur suppression horaires' });

    // Build rows to insert
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
      .select('id, date, statut')
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
// PROF — créer une séance pour un groupe
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

    const { date } = req.body;
    if (!date) return res.status(400).json({ message: 'Date requise' });

    const { data, error } = await supabase
      .from('sessions')
      .insert({ group_id: req.params.groupId, date, statut: 'planifiée' })
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
// PROF — modifier une séance (date, durée)
// ============================================================
const updateProfGroupSession = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (tErr || !teacher) return res.status(404).json({ message: 'Professeur introuvable' });

    // Make sure session belongs to a group owned by this prof
    const { data: session } = await supabase
      .from('sessions')
      .select('id, group_id, groups(teacher_id)')
      .eq('id', req.params.sessionId)
      .single();

    if (!session || session.groups?.teacher_id !== teacher.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const { date, duree_minutes, statut } = req.body;
    const patch = {};
    if (date !== undefined) patch.date = date;
    if (duree_minutes !== undefined) patch.duree_minutes = duree_minutes;
    if (statut !== undefined) patch.statut = statut;

    const { data, error } = await supabase
      .from('sessions')
      .update(patch)
      .eq('id', req.params.sessionId)
      .select()
      .single();

    if (error) return res.status(500).json({ message: 'Erreur serveur' });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};


const deleteProfGroupSession = async (req, res) => {
  try {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (tErr || !teacher) return res.status(404).json({ message: 'Professeur introuvable' });

    // Make sure session belongs to a group owned by this prof
    const { data: session } = await supabase
      .from('sessions')
      .select('id, group_id, groups(teacher_id)')
      .eq('id', req.params.sessionId)
      .single();

    if (!session || session.groups?.teacher_id !== teacher.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Delete attendance records first (if no cascade constraint)
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
  getProfPointage,
  getProfGroups,
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