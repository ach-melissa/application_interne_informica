const supabase = require('../supabaseClient');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const civiliteToNe = (civilite) => (civilite === 'M.' ? 'né' : 'née');

const generateAttestations = async (req, res) => {
  const { ids, periode, dateSignature, civilites = {}, ref } = req.body;

  const { data: inscriptions, error } = await supabase
    .from('inscriptions')
    .select(`
      id, formation:formation_id(nom, template_attestation_url),
      etudiant:etudiant_id(nom, prenom, sexe, date_naissance)
    `)
    .in('id', ids);

  if (error || !inscriptions?.length) return res.status(404).json({ error: 'Étudiants introuvables' });

  const templateUrl = inscriptions[0].formation?.template_attestation_url;
  if (!templateUrl) return res.status(404).json({ error: 'Aucun modèle défini pour cette formation' });

  const fileRes = await fetch(templateUrl);
  const arrayBuffer = await fileRes.arrayBuffer();
  const zip = new PizZip(Buffer.from(arrayBuffer));
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  const etudiantsData = inscriptions.map((i, idx) => {
    const civilite = civilites[i.id] || 'Mme';
    return {
      ref: inscriptions.length > 1 ? `${ref}-${idx + 1}` : ref,
      civilite,
      ne: civiliteToNe(civilite),
      nom: i.etudiant?.nom ?? '',
      prenom: i.etudiant?.prenom ?? '',
      date_naissance: i.etudiant?.date_naissance
        ? new Date(i.etudiant.date_naissance).toLocaleDateString('fr-FR')
        : '',
      formation_nom: i.formation?.nom ?? '',
    };
  });

  doc.render({ etudiants: etudiantsData, periode, date: dateSignature });
  const docxBuf = doc.getZip().generate({ type: 'nodebuffer' });

  res.setHeader('Content-Disposition', `attachment; filename=attestations.docx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.send(docxBuf);
};

const getTemplate = async (req, res) => {
  const { formationId } = req.params;
  const { data, error } = await supabase
    .from('formations')
    .select('template_attestation_url')
    .eq('id', formationId)
    .single();

  if (error) return res.status(404).json({ error: 'Formation introuvable' });
  res.json({ template_attestation_url: data.template_attestation_url });
};

const uploadTemplate = async (req, res) => {
  const { formationId } = req.params;
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });

  const fileName = `formation_${formationId}_${Date.now()}.docx`;

  const { error: uploadError } = await supabase.storage
    .from('templates')
    .upload(fileName, req.file.buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    });

  if (uploadError) return res.status(500).json({ error: uploadError.message });

  const { data: publicUrlData } = supabase.storage.from('templates').getPublicUrl(fileName);
  const publicUrl = publicUrlData.publicUrl;

  const { error: updateError } = await supabase
    .from('formations')
    .update({ template_attestation_url: publicUrl })
    .eq('id', formationId);

  if (updateError) return res.status(500).json({ error: updateError.message });

  res.json({ template_attestation_url: publicUrl });
};

module.exports = { generateAttestations, getTemplate, uploadTemplate };