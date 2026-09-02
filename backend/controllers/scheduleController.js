const supabase = require('../supabaseClient');
const { logHistorique } = require('../utils/historique');
const todayStr = () => new Date().toISOString().slice(0, 10);
// Cache une séance si son groupe est terminé ou si le créneau est expiré,
// et ajoute un badge "à venir" pour les remplacements/changements pas encore effectifs.
const filtrerCreneauxActifs = (schedules) => {
  const today = todayStr();
  return schedules
    .filter((s) => !s.expire_le || s.expire_le >= today)
    .filter((s) => !s.groups || !s.groups.date_fin || s.groups.date_fin >= today)
    .filter((s) => !s.groups || s.groups.archived !== true)
    .filter((s) => !s.groups || !s.groups.statut || s.groups.statut === 'active')
    .map((s) => {
      let badge = null;
      if (s.type_special === 'remplacement' && s.expire_le) {
        badge = s.expire_le === today ? "Remplacement aujourd'hui" : `Remplacement prévu le ${s.expire_le}`;
      } else if (s.type_special === 'changement' && s.applicable_depuis && s.applicable_depuis > today) {
        badge = `Nouvel horaire à partir du ${s.applicable_depuis}`;
      }
      return { ...s, badge };
    });
};
const getGroupSchedule = async (req, res) => {
  const { groupId } = req.params;

  if (req.user.role === 'prof') {
    const { data: teacher, error: tErr } = await supabase
      .from('teachers').select('id').eq('user_id', req.user.id).single();
    if (tErr || !teacher) return res.status(404).json({ error: 'Professeur introuvable' });

    const { data: group, error: gErr } = await supabase
      .from('groups').select('teacher_id').eq('id', groupId).single();
    if (gErr || !group) return res.status(404).json({ error: 'Groupe introuvable' });

    if (group.teacher_id !== teacher.id) {
      return res.status(403).json({ error: "Vous n'enseignez pas ce groupe." });
    }
  }

const { data, error } = await supabase
  .from('schedules')
  .select('id, jour_semaine, salle, periode, contenu, heure_debut, heure_fin, type_special, expire_le, applicable_depuis, groups(nom, date_fin, archived, statut, niveau:formation_niveaux(id, nom))')
  .eq('group_id', groupId);
if (error) return res.status(500).json({ error: error.message });
res.json(data);
};

const createSchedule = async (req, res) => {
  const { group_id, jour_semaine, salle, periode, contenu, heure_debut, heure_fin } = req.body;
if (heure_debut < '08:00' || heure_fin > '16:00' || heure_debut >= heure_fin) {
  return res.status(400).json({ error: 'Les horaires doivent être compris entre 08:00 et 16:00.' });
}
  const { data: rawConflicts, error: conflictErr } = await supabase
    .from('schedules')
    .select('id, heure_debut, heure_fin, groups(statut)')
    .eq('salle', salle)
    .eq('jour_semaine', jour_semaine)
    .lt('heure_debut', heure_fin)
    .gt('heure_fin', heure_debut);

  if (conflictErr) return res.status(500).json({ error: conflictErr.message });
  const conflicts = (rawConflicts || []).filter((c) => c.groups?.statut !== 'terminer');
  if (conflicts.length > 0) {
    return res.status(409).json({
      error: `${salle} est déjà occupée ce jour-là de ${conflicts[0].heure_debut} à ${conflicts[0].heure_fin}.`,
    });
  }
  const { data, error } = await supabase 
    .from('schedules')
    .insert({ group_id, jour_semaine, salle, periode, contenu, heure_debut, heure_fin })
    .select('*, groups:group_id(nom)')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  await logHistorique({
    req, perimetre: 'admin', action: 'creation', entite: 'creneau', entite_id: data.id,
    description: `a ajouté un créneau pour le groupe "${data.groups?.nom}" — ${jour_semaine} ${heure_debut?.slice(0,5)}-${heure_fin?.slice(0,5)} (${salle})`,
  });

  res.json(data);
};

const updateSchedule = async (req, res) => {
  const { id } = req.params;
  const { contenu, heure_debut, heure_fin } = req.body;

  const { data: before } = await supabase
    .from('schedules')
    .select('contenu, heure_debut, heure_fin, jour_semaine, salle, groups:group_id(nom)')
    .eq('id', id)
    .single();

  // ← NOUVEAU : tout ce bloc n'existait pas avant
  if (heure_debut && heure_fin) {
    if (heure_debut < '08:00' || heure_fin > '16:00' || heure_debut >= heure_fin) {
  return res.status(400).json({ error: 'Les horaires doivent être compris entre 08:00 et 16:00.' });
}
    const { data: current, error: curErr } = await supabase
      .from('schedules')
      .select('salle, jour_semaine')
      .eq('id', id)
      .single();
    if (curErr) return res.status(500).json({ error: curErr.message });

    const { data: rawConflicts, error: conflictErr } = await supabase
      .from('schedules')
      .select('id, heure_debut, heure_fin, groups(statut)')
      .eq('salle', current.salle)
      .eq('jour_semaine', current.jour_semaine)
      .neq('id', id)
      .lt('heure_debut', heure_fin)
      .gt('heure_fin', heure_debut);

    if (conflictErr) return res.status(500).json({ error: conflictErr.message });
    const conflicts = (rawConflicts || []).filter((c) => c.groups?.statut !== 'terminer');
    if (conflicts.length > 0) {
      return res.status(409).json({
        error: `${current.salle} est déjà occupée ce jour-là de ${conflicts[0].heure_debut} à ${conflicts[0].heure_fin}.`,
      });
    }
  }

  const { data, error } = await supabase 
    .from('schedules')
    .update({ contenu, heure_debut, heure_fin })
    .eq('id', id)
    .select('*, groups:group_id(nom)')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  const changes = [];
  if (contenu !== undefined && contenu !== before?.contenu) changes.push(`contenu : "${before?.contenu ?? '—'}" → "${contenu}"`);
  if (heure_debut !== undefined && heure_debut !== before?.heure_debut) changes.push(`heure début : "${before?.heure_debut?.slice(0,5) ?? '—'}" → "${heure_debut.slice(0,5)}"`);
  if (heure_fin !== undefined && heure_fin !== before?.heure_fin) changes.push(`heure fin : "${before?.heure_fin?.slice(0,5) ?? '—'}" → "${heure_fin.slice(0,5)}"`);

  if (changes.length > 0) {
    await logHistorique({
      req, perimetre: 'admin', action: 'modification', entite: 'creneau', entite_id: id,
      description: `a modifié le créneau du groupe "${data.groups?.nom}" (${before?.jour_semaine}, ${before?.salle}) — ${changes.join(', ')}`,
      details: { changes },
    });
  }

  res.json(data);
};

const deleteSchedule = async (req, res) => {
  const { id } = req.params;

  const { data: toDelete } = await supabase
    .from('schedules')
    .select('jour_semaine, heure_debut, heure_fin, salle, groups:group_id(nom)')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('schedules').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  await logHistorique({
    req, perimetre: 'admin', action: 'suppression', entite: 'creneau', entite_id: id,
    description: `a supprimé un créneau du groupe "${toDelete?.groups?.nom}" — ${toDelete?.jour_semaine} ${toDelete?.heure_debut?.slice(0,5)}-${toDelete?.heure_fin?.slice(0,5)} (${toDelete?.salle})`,
  });

  res.json({ success: true });
};
const deleteSalle = async (req, res) => {
  const { id } = req.params;

  const { data: salle, error: salleErr } = await supabase
    .from('salles').select('id, nom').eq('id', id).single();
  if (salleErr || !salle) return res.status(404).json({ error: 'Salle introuvable.' });

  // Les créneaux "normaux" (groupes) stockent le nom dans la colonne `salle`.
  // Les créneaux issus de notifications approuvées stockent aussi `salle_id`.
  // On doit vérifier les deux pour ne rien manquer.
  const { count, error: checkErr } = await supabase
    .from('schedules')
    .select('id', { count: 'exact', head: true })
    .or(`salle.eq.${salle.nom},salle_id.eq.${id}`);

  if (checkErr) return res.status(500).json({ error: checkErr.message });

  if (count > 0) {
    return res.status(409).json({
      error: `Impossible de supprimer : la salle "${salle.nom}" est utilisée dans ${count} créneau(x). Retirez-les ou changez de salle d'abord.`,
    });
  }

  const { error } = await supabase.from('salles').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  await logHistorique({
    req, perimetre: 'admin', action: 'suppression', entite: 'salle', entite_id: id,
    description: `a supprimé la salle "${salle.nom}"`,
  });

  res.json({ success: true });
};
const renameSalle = async (req, res) => {
  const { id, newName } = req.body;
  if (!id || !newName?.trim()) return res.status(400).json({ error: 'id et newName requis' });

  const { data: current, error: curErr } = await supabase
    .from('salles').select('nom').eq('id', id).single();
  if (curErr || !current) return res.status(404).json({ error: 'Salle introuvable.' });

  const { data, error } = await supabase
    .from('salles')
    .update({ nom: newName.trim() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: `La salle "${newName.trim()}" existe déjà.` });
    return res.status(500).json({ error: error.message });
  }

  // Cascade : aligne le nom stocké dans schedules avec le nouveau nom
  const { error: cascadeErr } = await supabase
    .from('schedules')
    .update({ salle: newName.trim() })
    .or(`salle.eq.${current.nom},salle_id.eq.${id}`);
  if (cascadeErr) {
    return res.status(500).json({ error: `Salle renommée mais synchronisation des créneaux échouée : ${cascadeErr.message}` });
  }

  await logHistorique({
    req, perimetre: 'admin', action: 'modification', entite: 'salle', entite_id: id,
    description: `a renommé la salle "${current.nom}" en "${newName.trim()}"`,
  });

  res.json(data);
};

const getProfSchedule = async (req, res) => {
  const userId = req.user.id;

  // 1) Trouver le teacher_id lié à cet utilisateur connecté
  const { data: teacher, error: tErr } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (tErr || !teacher) {
    return res.status(404).json({ error: 'Professeur introuvable' });
  }

  // 2) Trouver les groupes assignés à ce prof
const { data: groups, error: gErr } = await supabase
  .from('groups')
  .select('id')
  .eq('teacher_id', teacher.id)
  .eq('archived', false);

  if (gErr) return res.status(500).json({ error: gErr.message });

  const groupIds = groups.map((g) => g.id);
  if (groupIds.length === 0) return res.json([]);

  // 3) Récupérer les schedules de ces groupes uniquement
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      id, jour_semaine, salle, periode, contenu, heure_debut, heure_fin,
      type_special, expire_le, applicable_depuis,
      groups(id, nom, date_fin, niveau:formation_niveaux(id, nom))
    `)
    .in('group_id', groupIds);

  if (error) return res.status(500).json({ error: error.message });
  res.json(filtrerCreneauxActifs(data));
};

const getSchedulesByFormation = async (req, res) => {
  const { formation_id } = req.params;

  // d'abord récupère les group_ids de cette formation
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id')
    .eq('formation_id', formation_id);

  if (groupsError) return res.status(500).json({ error: groupsError.message });

  const groupIds = groups.map((g) => g.id);

  if (groupIds.length === 0) return res.json([]);

   const { data, error } = await supabase
    .from('schedules')
    .select('*, groups(id, nom, date_fin, archived, statut, niveau:formation_niveaux(id, nom))')
    .in('group_id', groupIds);

  if (error) return res.status(500).json({ error: error.message });
  res.json(filtrerCreneauxActifs(data));
};
const getAllSchedules = async (req, res) => {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
     groups (
        id,
        nom,
        date_fin,
        archived,
        statut,
        niveau:formation_niveaux (
          id,
          nom
        ),
        formations (
          id,
          nom
        )
      ),
users:prof_id (
  id,
  nom,
  prenom
)
    `);

 if (error) return res.status(500).json({ error: error.message });
  res.json(filtrerCreneauxActifs(data));
};

// Aperçu de l'emploi du temps global — accessible aux profs pour les aider
// à choisir un créneau libre avant de faire une demande de salle.
const getScheduleApercu = async (req, res) => {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      id, jour_semaine, salle, periode, contenu, heure_debut, heure_fin,
      type_special, expire_le, applicable_depuis,
            groups ( id, nom, date_fin, archived, statut, niveau:formation_niveaux ( nom ), formations ( nom ) )
    `);
  if (error) return res.status(500).json({ error: error.message });
  res.json(filtrerCreneauxActifs(data));
};

const getJours = async (req, res) => {
  const { data, error } = await supabase.rpc('get_day_enum_values');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const getSalles = async (req, res) => {
  const { data, error } = await supabase.from('salles').select('id, nom').order('nom');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const createSalle = async (req, res) => {
  const { nom } = req.body;
  if (!nom?.trim()) return res.status(400).json({ error: 'nom requis' });
  const { data, error } = await supabase
    .from('salles')
    .insert({ nom: nom.trim() })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: `La salle "${nom.trim()}" existe déjà.` });
    return res.status(500).json({ error: error.message });
  }

  await logHistorique({
    req, perimetre: 'admin', action: 'creation', entite: 'salle', entite_id: data.id,
    description: `a créé la salle "${data.nom}"`,
  });

  res.json(data);
};

module.exports = { getGroupSchedule, createSchedule, updateSchedule, deleteSchedule, renameSalle, getProfSchedule, getSchedulesByFormation, getAllSchedules, getScheduleApercu, getJours, getSalles, createSalle, deleteSalle };