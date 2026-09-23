const supabase = require('../supabaseClient');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const DocxMerger = require('docx-merger');
const civiliteToNe = (civilite) => (civilite === 'M.' ? 'né' : 'née');

const generateAttestations = async (req, res) => {
  const { ids, periode, dateSignature, civilites = {}, refs = {}, formationNom } = req.body;
  const { data: inscriptions, error } = await supabase
    .from('inscriptions')
    .select(`
      id, formation:formation_id(nom, template_attestation_url),
      etudiant:etudiant_id(nom, prenom, date_naissance)
    `)
    .in('id', ids);

  if (error || !inscriptions?.length) return res.status(404).json({ error: 'Étudiants introuvables' });

  const templateUrl = inscriptions[0].formation?.template_attestation_url;
  if (!templateUrl) return res.status(404).json({ error: 'Aucun modèle défini pour cette formation' });

  const fileRes = await fetch(templateUrl);
  const arrayBuffer = await fileRes.arrayBuffer();
  const templateBuffer = Buffer.from(arrayBuffer);

  const buffers = inscriptions.map((i) => {
    const civilite = civilites[i.id] || 'Mme';
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });

    doc.render({
      ref: refs[i.id] || '',
      civilite,
      ne: civiliteToNe(civilite),
      nom: i.etudiant?.nom ?? '',
      prenom: i.etudiant?.prenom ?? '',
      date_naissance: i.etudiant?.date_naissance
        ? new Date(i.etudiant.date_naissance).toLocaleDateString('fr-FR')
        : '',
     formation_nom: formationNom || i.formation?.nom || '',
      periode,
      date: dateSignature,
    });

    return doc.getZip().generate({ type: 'nodebuffer' });
  });

  const merger = new DocxMerger({}, buffers);
  const docxBuf = await new Promise((resolve, reject) => {
    merger.save('nodebuffer', (data) => resolve(data));
  });

  await Promise.all(
    inscriptions
      .filter(i => refs[i.id])
      .map(i => supabase.from('inscriptions').update({ attestation_ref: refs[i.id] }).eq('id', i.id))
  );

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
const getNextRef = async (req, res) => {
  const { formationId } = req.params;

  const { data, error } = await supabase
    .from('inscriptions')
    .select('attestation_ref')
    .eq('formation_id', formationId)
    .not('attestation_ref', 'is', null);

  if (error) return res.status(500).json({ error: error.message });

  let maxNum = 0;
  let prefix = '';
  (data || []).forEach(row => {
    const match = row.attestation_ref?.match(/^(.*?)(\d+)$/);
    if (match) {
      const num = parseInt(match[2], 10);
      if (num > maxNum) {
        maxNum = num;
        prefix = match[1];
      }
    }
  });

  const next = maxNum > 0 ? `${prefix}${String(maxNum + 1).padStart(3, '0')}` : '';
  res.json({ next_ref: next });
};
module.exports = { generateAttestations, getTemplate, uploadTemplate, getNextRef };