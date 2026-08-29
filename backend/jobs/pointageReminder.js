const supabase = require('../supabaseClient');

// 0 7 * * *
//│ │ │ │ │
//│ │ │ │ └── jour de la semaine (0-6, dimanche=0)  → * = tous les jours
//│ │ │ └──── mois (1-12)                            → * = tous les mois
//│ │ └────── jour du mois (1-31)                    → * = tous les jours du mois
//│ └──────── heure (0-23)                           → 7 = 7h
//└────────── minute (0-59)                          → 0 = minute 0 

const runPointageReminder = async () => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const jourAujourdhui = today.toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();

  const { data: groupes, error } = await supabase
    .from('groups')
    .select('id, nom, jours_formation, heure_formation, teacher_id, teachers:teacher_id(user_id)')
    .eq('archived', false)
    .not('teacher_id', 'is', null);

  if (error) {
    console.error('Erreur récupération groupes pour rappel de pointage:', error.message);
    return;
  }
  if (!groupes || groupes.length === 0) return;

  for (const groupe of groupes) {
    const jours = Array.isArray(groupe.jours_formation)
      ? groupe.jours_formation
      : (groupe.jours_formation || '').split(',').map((j) => j.trim());

    if (!jours.map((j) => j.toLowerCase()).includes(jourAujourdhui)) continue;

    const profUserId = groupe.teachers?.user_id;
    if (!profUserId) continue;

    const { data: existingNotif, error: exErr } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'rappel_pointage')
      .eq('destinataire_id', profUserId)
      .eq('data->>groupe_id', String(groupe.id))
      .eq('data->>date', todayStr)
      .maybeSingle();

    if (exErr) {
      console.error(`Erreur vérif notif existante (groupe ${groupe.id}):`, exErr.message);
      continue;
    }
    if (existingNotif) continue; // déjà notifié aujourd'hui

    const { error: insErr } = await supabase
      .from('notifications')
      .insert({
        type: 'rappel_pointage',
        destinataire_id: profUserId,
        destinataire_role: 'prof',
        titre: `Pointage aujourd'hui - ${groupe.nom}`,
        message: `N'oubliez pas de pointer pour le groupe ${groupe.nom} à ${groupe.heure_formation?.slice(0, 5) || ''}.`,
        lu: false,
        lu_admin: false,
        data: {
          groupe_id: groupe.id,
          groupe_nom: groupe.nom,
          heure_formation: groupe.heure_formation,
          date: todayStr,
        },
      });

    if (insErr) console.error(`Erreur création notif pointage (groupe ${groupe.id}):`, insErr.message);
  }
};

module.exports = { runPointageReminder };