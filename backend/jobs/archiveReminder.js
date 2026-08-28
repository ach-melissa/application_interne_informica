const supabase = require('../supabaseClient');

const runArchiveReminder = async () => {
  const today = new Date().toISOString().slice(0, 10);

  const { data: groupes, error } = await supabase
    .from('groups')
    .select('id, nom, date_fin, formation_id, formations:formation_id(nom)')
    .eq('archived', false)
    .not('date_fin', 'is', null)
    .lte('date_fin', today);

  if (error) {
    console.error('Erreur récupération groupes à archiver:', error.message);
    return;
  }
  if (!groupes || groupes.length === 0) return;

  for (const groupe of groupes) {
    const { data: existingNotif, error: exErr } = await supabase
  .from('notifications')
  .select('id')
  .eq('type', 'groupe_a_archiver')
  .eq('destinataire_role', 'admin')
  .eq('lu_admin', false)
  .eq('data->>groupe_id', String(groupe.id))
  .maybeSingle();

    if (exErr) {
      console.error(`Erreur vérif notif existante (groupe ${groupe.id}):`, exErr.message);
      continue;
    }
    if (existingNotif) continue; // déjà notifié et pas encore lu

    const { error: insErr } = await supabase
      .from('notifications')
      .insert({
        type: 'groupe_a_archiver',
        destinataire_role: 'admin',
        titre: `À archiver - ${groupe.nom}`,
        message: `${groupe.formations?.nom || ''} — ce groupe est terminé depuis le ${new Date(groupe.date_fin).toLocaleDateString('fr-FR')}. Pensez à l'archiver avant la nouvelle année.`,
        lu: false,
        lu_admin: false,
        data: {
          groupe_id: groupe.id,
          groupe_nom: groupe.nom,
          formation_id: groupe.formation_id,
          formation_nom: groupe.formations?.nom || null,
        },
      });

    if (insErr) console.error(`Erreur création notif (groupe ${groupe.id}):`, insErr.message);
  }
};

module.exports = { runArchiveReminder };