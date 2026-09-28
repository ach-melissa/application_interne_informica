const supabase = require('../supabaseClient');
const crypto = require('crypto');
const { logHistorique } = require('../utils/historique');
const BONS_BUCKET = 'bons-salaires';

const TYPE_LABEL = { avance: 'une avance', retenue: 'une retenue', prime: 'une prime' };
const typeLabel = (t) => TYPE_LABEL[t] ?? 'un mouvement';
const dz = (n) => Math.abs(Number(n) || 0).toLocaleString('fr-FR') + ' DA';

const nomEmploye = async (id) => {
  if (!id) return '—';
  const { data } = await supabase.from('employes').select('nom, prenom').eq('id', id).single();
  return data ? `${data.prenom} ${data.nom}` : '—';
};

const withSignedUrls = async (bons) => {
  if (!bons || bons.length === 0) return [];
  const paths = bons.map((b) => b.storage_path);
  const { data, error } = await supabase.storage.from(BONS_BUCKET).createSignedUrls(paths, 3600);
  if (error) throw error;
  return bons.map((b, i) => ({ id: b.id, nom: b.nom_fichier, url: data[i]?.signedUrl || null }));
};

// ============================================================
// MOUVEMENTS — list
// ============================================================
const getMouvements = async (req, res) => {
  try {
    const { employe_id, mois, annee } = req.query;
    if (!employe_id || !mois || !annee) {
      return res.status(400).json({ message: 'employe_id, mois et annee sont requis' });
    }

    const debut = `${annee}-${String(mois).padStart(2, '0')}-01`;
    const finDate = new Date(Number(annee), Number(mois), 0);
    const fin = finDate.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('mouvements_salaire')
      .select('*')
      .eq('employe_id', employe_id)
      .gte('date', debut)
      .lte('date', fin)
      .order('date');

    if (error) return res.status(500).json({ message: error.message });

    const withUrls = await Promise.all(
      data.map(async (m) => ({ ...m, bons: await withSignedUrls(m.bons) }))
    );
    res.json(withUrls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// MOUVEMENTS — create
// ============================================================
const createMouvement = async (req, res) => {
  try {
    const { employe_id, poste_id, date, type, description, montant } = req.body;
    if (!employe_id || !type || !description || montant === undefined) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    const { data, error } = await supabase
      .from('mouvements_salaire')
      .insert({
        employe_id,
        poste_id: poste_id || null,
        date: date || new Date().toISOString().slice(0, 10),
        type,
        description,
        montant,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });

    await logHistorique({
      req, perimetre: 'comptable', action: 'creation', entite: 'mouvement_salaire', entite_id: data.id,
      description: `a ajouté ${typeLabel(data.type)} de ${dz(data.montant)} pour ${await nomEmploye(data.employe_id)} : "${data.description}"`,
    });

    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// MOUVEMENTS — update
// ============================================================
const updateMouvement = async (req, res) => {
  try {
    const { poste_id, type, description, montant } = req.body;

    const { data: before } = await supabase
      .from('mouvements_salaire')
      .select('type, description, montant, employe_id')
      .eq('id', req.params.id)
      .single();

    const { data, error } = await supabase
      .from('mouvements_salaire')
      .update({ poste_id: poste_id || null, type, description, montant })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });

    if (before) {
      const changes = [];
      if (before.type !== type) changes.push(`type : "${before.type}" → "${type}"`);
      if (Number(before.montant) !== Number(montant)) changes.push(`montant : "${dz(before.montant)}" → "${dz(montant)}"`);
      if ((before.description ?? '') !== (description ?? '')) changes.push(`description : "${before.description ?? '—'}" → "${description ?? '—'}"`);

      if (changes.length > 0) {
        await logHistorique({
          req, perimetre: 'comptable', action: 'modification', entite: 'mouvement_salaire', entite_id: req.params.id,
          description: `a modifié ${typeLabel(before.type)} de ${await nomEmploye(before.employe_id)} : ${changes.join(' | ')}`,
        });
      }
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// MOUVEMENTS — delete
// ============================================================
const deleteMouvement = async (req, res) => {
  try {
    const { data: before } = await supabase
      .from('mouvements_salaire')
      .select('type, description, montant, employe_id')
      .eq('id', req.params.id)
      .single();

    const { error } = await supabase.from('mouvements_salaire').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ message: error.message });

    if (before) {
      await logHistorique({
        req, perimetre: 'comptable', action: 'suppression', entite: 'mouvement_salaire', entite_id: req.params.id,
        description: `a supprimé ${typeLabel(before.type)} de ${dz(before.montant)} pour ${await nomEmploye(before.employe_id)} : "${before.description}"`,
      });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// BONS
// ============================================================
const uploadBon = async (req, res) => {
  try {
    const { id: mouvementId } = req.params;
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu' });

    const { data: mouvement, error: mvtError } = await supabase
      .from('mouvements_salaire')
      .select('id, bons, type, employe_id')
      .eq('id', mouvementId)
      .single();
    if (mvtError || !mouvement) return res.status(404).json({ message: 'Mouvement introuvable' });

    const ext = req.file.originalname.split('.').pop();
    const storagePath = `${mouvementId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BONS_BUCKET)
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (uploadError) return res.status(500).json({ message: uploadError.message });

    const nouveauBon = {
      id: crypto.randomUUID(),
      storage_path: storagePath,
      nom_fichier: req.file.originalname,
      created_at: new Date().toISOString(),
    };
    const bons = [...(mouvement.bons || []), nouveauBon];

    const { error: updError } = await supabase
      .from('mouvements_salaire')
      .update({ bons })
      .eq('id', mouvementId);
    if (updError) {
      await supabase.storage.from(BONS_BUCKET).remove([storagePath]);
      return res.status(500).json({ message: updError.message });
    }

    await logHistorique({
      req, perimetre: 'comptable', action: 'creation', entite: 'bon_mouvement', entite_id: mouvementId,
      description: `a ajouté un bon à ${typeLabel(mouvement.type)} de ${await nomEmploye(mouvement.employe_id)}`,
    });

    const [withUrl] = await withSignedUrls([nouveauBon]);
    res.status(201).json(withUrl);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const deleteBon = async (req, res) => {
  try {
    const { id: mouvementId, bonId } = req.params;
    const { data: mouvement, error: fetchError } = await supabase
      .from('mouvements_salaire')
      .select('bons, type, employe_id')
      .eq('id', mouvementId)
      .single();
    if (fetchError || !mouvement) return res.status(404).json({ message: 'Mouvement introuvable' });

    const bon = (mouvement.bons || []).find((b) => b.id === bonId);
    if (!bon) return res.status(404).json({ message: 'Bon introuvable' });

    const bons = mouvement.bons.filter((b) => b.id !== bonId);
    const { error: updError } = await supabase
      .from('mouvements_salaire')
      .update({ bons })
      .eq('id', mouvementId);
    if (updError) return res.status(500).json({ message: updError.message });

    await supabase.storage.from(BONS_BUCKET).remove([bon.storage_path]);

    await logHistorique({
      req, perimetre: 'comptable', action: 'suppression', entite: 'bon_mouvement', entite_id: mouvementId,
      description: `a supprimé un bon de ${typeLabel(mouvement.type)} de ${await nomEmploye(mouvement.employe_id)}`,
    });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { getMouvements, createMouvement, updateMouvement, deleteMouvement, uploadBon, deleteBon };