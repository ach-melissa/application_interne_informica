const supabase = require('../supabaseClient');
const { logHistorique, buildDiffDescription } = require('../utils/historique');

const getSessions = async (req, res) => {
  const { group_id } = req.query;
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('group_id', group_id)
    .order('date', { ascending: true });  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
const createSession = async (req, res) => {
  const { group_id, date, statut, type_seance, heure_debut, heure_fin, duree_effectuee } = req.body;
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      group_id, date, statut: statut ?? 'effectuee', type_seance: type_seance ?? 'normale',
      heure_debut: heure_debut || null,
      heure_fin: heure_fin || null,
      duree_effectuee: duree_effectuee ?? null,
    })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (req.user?.role === 'admin') {
    const { data: group } = await supabase
      .from('groups')
      .select('nom, formations:formation_id(nom), niveau:niveau_id(nom)')
      .eq('id', group_id)
      .single();
    const contexte = group?.niveau?.nom
      ? `${group.formations?.nom} — ${group.niveau.nom}`
      : group?.formations?.nom;
    await logHistorique({
      req, perimetre: 'admin', action: 'creation', entite: 'seance', entite_id: data.id,
      description: `a ajouté une séance du ${date} pour le groupe "${group?.nom ?? '—'}" (${contexte ?? '—'})`,
    });
  }

  res.json(data);
};

const deleteSession = async (req, res) => {
  const { id } = req.params;

  const { data: before } = await supabase
    .from('sessions')
    .select('date, groups(nom, formations:formation_id(nom), niveau:niveau_id(nom))')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  if (req.user?.role === 'admin') {
    const contexte = before?.groups?.niveau?.nom
      ? `${before.groups.formations?.nom} — ${before.groups.niveau.nom}`
      : before?.groups?.formations?.nom;
    await logHistorique({
      req, perimetre: 'admin', action: 'suppression', entite: 'seance', entite_id: id,
      description: `a supprimé la séance du ${before?.date ?? '—'} du groupe "${before?.groups?.nom ?? '—'}" (${contexte ?? '—'})`,
    });
  }

  res.json({ success: true });
};
const updateSession = async (req, res) => {
  const { id } = req.params;

  const { data: before } = await supabase
    .from('sessions')
    .select('*, groups(nom, formations:formation_id(nom), niveau:niveau_id(nom))')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('sessions').update(req.body).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (req.user?.role === 'admin') {
    const changes = buildDiffDescription(before, req.body);
    if (changes.length > 0) {
      const contexte = before?.groups?.niveau?.nom
        ? `${before.groups.formations?.nom} — ${before.groups.niveau.nom}`
        : before?.groups?.formations?.nom;
      await logHistorique({
        req, perimetre: 'admin', action: 'modification', entite: 'seance', entite_id: id,
        description: `a modifié la séance du ${before?.date ?? '—'} du groupe "${before?.groups?.nom ?? '—'}" (${contexte ?? '—'}) — ${changes.join(', ')}`,
        details: { changes },
      });
    }
  }

  res.json(data);
};
module.exports = { getSessions, createSession, deleteSession, updateSession };