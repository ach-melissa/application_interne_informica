import ChargesBase from './ChargesBase';

const CATEGORIES_AUTRE = [
  'Loyer',
  'Électricité',
  'Eau',
  'Internet',
  'Maintenance',
  'Publicité Facebook',
];

// Données de test uniquement — à supprimer une fois l'API branchée.
// TODO: remplacer par un fetch vers /api/comptable/charges?type=autre
const SAMPLE_CHARGES_AUTRE = [
  { id: 1, date: '2026-04-05', description: 'Loyer local avril', montant: 45000, categorie: 'Loyer' },
  { id: 2, date: '2026-04-12', description: 'Facture électricité', montant: 8200, categorie: 'Électricité' },
  { id: 3, date: '2026-04-28', description: 'Facture eau', montant: 2100, categorie: 'Eau' },
  { id: 4, date: '2026-05-05', description: 'Loyer local mai', montant: 45000, categorie: 'Loyer' },
  { id: 5, date: '2026-05-10', description: 'Réparation climatiseur', montant: 6300, categorie: 'Maintenance' },
  { id: 6, date: '2026-05-15', description: 'Abonnement internet', montant: 4500, categorie: 'Internet' },
  { id: 7, date: '2026-06-03', description: 'Loyer local juin', montant: 45000, categorie: 'Loyer' },
  { id: 8, date: '2026-06-18', description: 'Campagne publicitaire Facebook', montant: 7000, categorie: 'Publicité Facebook' },
  { id: 9, date: '2026-06-25', description: 'Maintenance ordinateurs', montant: 7400, categorie: 'Maintenance' },
];

const ChargesAutre = () => (
  <ChargesBase
    title="Autre charge"
    defaultCategories={CATEGORIES_AUTRE}
    sampleCharges={SAMPLE_CHARGES_AUTRE}
  />
);

export default ChargesAutre;