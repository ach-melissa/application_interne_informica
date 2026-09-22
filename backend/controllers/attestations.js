const supabase = require('../supabaseClient');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const generateAttestations = async (req, res) => {
  const { ids, periode, dateSignature, format } = req.body;

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

  const etudiantsData = inscriptions.map((i) => ({
    nom: i.etudiant?.nom ?? '',
    prenom: i.etudiant?.prenom ?? '',
    sexe: i.etudiant?.sexe === 'M' ? 'Masculin' : 'Féminin',
    date_naissance: i.etudiant?.date_naissance
      ? new Date(i.etudiant.date_naissance).toLocaleDateString('fr-FR')
      : '',
    formation_nom: i.formation?.nom ?? '',
  }));

  doc.render({ etudiants: etudiantsData, periode, date_signature: dateSignature });
  const docxBuf = doc.getZip().generate({ type: 'nodebuffer' });

  res.setHeader('Content-Disposition', `attachment; filename=attestations.docx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.send(docxBuf);
};

module.exports = { generateAttestations };