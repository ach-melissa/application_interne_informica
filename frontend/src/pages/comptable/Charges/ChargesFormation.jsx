import ChargesBase from './ChargesBase';

const CATEGORIES_FORMATION = [
  'Matières premières',
  'Outils',
  'Certificats',
  'Impressions',
];

// Données de test uniquement — à supprimer une fois l'API branchée.
// TODO: remplacer par un fetch vers /api/comptable/charges?type=formation
const SAMPLE_CHARGES_FORMATION = [
  { id: 1, date: '2026-04-05', description: 'Achat papier et matériel d’impression', montant: 12500, categorie: 'Matières premières' },
  { id: 2, date: '2026-04-18', description: 'Cartouches d’encre imprimante', montant: 8200, categorie: 'Impressions' },
  { id: 3, date: '2026-05-03', description: 'Kits d’outils atelier informatique', montant: 21000, categorie: 'Outils' },
  { id: 4, date: '2026-05-14', description: 'Frais de certification comptabilité', montant: 15000, categorie: 'Certificats' },
  { id: 5, date: '2026-06-02', description: 'Matériel pédagogique design graphique', montant: 9800, categorie: 'Matières premières' },
  { id: 6, date: '2026-06-20', description: 'Impression supports de cours', montant: 4300, categorie: 'Impressions' },
  { id: 7, date: '2026-07-08', description: 'Certificats de fin de formation', montant: 6000, categorie: 'Certificats' },
];

const ChargesFormation = () => (
  <ChargesBase
    title="Charges de formation"
    defaultCategories={CATEGORIES_FORMATION}
    sampleCharges={SAMPLE_CHARGES_FORMATION}
  />
);

export default ChargesFormation;