import { useEffect, useState } from 'react';
import ComptableLayout from '../../../layouts/ComptableLayout';
import PaiementsGlobale from './PaiementsGlobale';
import PaiementsAutre from './PaiementsAutre';

const Paiements = () => {
  const [paiements,  setPaiements]  = useState([]);
  const [formations, setFormations] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [activeTab,  setActiveTab]  = useState('globale');

  // Statut manuel (payé/non payé), indépendant du montant — pas encore de champ
  // backend dédié à l'agrégat étudiant+formation. Levé ici pour survivre au
  // changement d'onglet. TODO: brancher sur une route API une fois validée.
  const [statutMap, setStatutMap] = useState({});

  // Revenus "autres" = argent payé par des personnes qui ne sont pas des étudiants.
  // Saisie manuelle locale, levée ici pour survivre au changement d'onglet.
  // Données de test uniquement — à supprimer une fois vérifié visuellement
  // (ou une fois l'API branchée).
  const SAMPLE_AUTRES = [
    { id: 1, libelle: 'Location salle informatique — assoc. locale', montant: 15000, date: '2026-05-10', categorie: 'Location de salle' },
    { id: 2, libelle: 'Don entreprise partenaire TechCorp', montant: 50000, date: '2026-05-18', categorie: 'Dons / subventions' },
    { id: 3, libelle: 'Subvention ministère de la Formation', montant: 120000, date: '2026-06-02', categorie: 'Dons / subventions' },
    { id: 4, libelle: 'Vente de livres — promo Informatique', montant: 8600, date: '2026-06-08', categorie: 'Vente de matériel' },
    { id: 5, libelle: 'Vente uniformes', montant: 4200, date: '2026-06-15', categorie: 'Vente de matériel' },
    { id: 6, libelle: 'Cérémonie remise de diplômes — billetterie', montant: 22000, date: '2026-06-25', categorie: "Frais d'événements" },
    { id: 7, libelle: 'Kermesse annuelle', montant: 17500, date: '2026-07-05', categorie: "Frais d'événements" },
    { id: 8, libelle: 'Sponsoring — société Média Plus', montant: 60000, date: '2026-07-12', categorie: 'Partenariats / sponsoring' },
    { id: 9, libelle: 'Location salle pour séminaire externe', montant: 9800, date: '2026-07-20', categorie: 'Location de salle' },
    { id: 10, libelle: 'Partenariat librairie El Amal', montant: 25000, date: '2026-07-24', categorie: 'Partenariats / sponsoring' },
  ];

  const [autresRevenus, setAutresRevenus] = useState(SAMPLE_AUTRES);

  const token = () => localStorage.getItem('token');
  const api   = import.meta.env.VITE_API_URL;

  const fetchPaiements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api}/api/comptable/paiements`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      setPaiements(await res.json());
    } catch {
      setError('Erreur chargement paiements.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormations = async () => {
    try {
      const res = await fetch(`${api}/api/comptable/formations`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setFormations(await res.json());
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchPaiements();
    fetchFormations();
  }, []);

  const handleStatutChange = (key, statut) => {
    setStatutMap((prev) => ({ ...prev, [key]: statut }));
  };

  const handleAddAutre = (entry) => {
    setAutresRevenus((prev) => [...prev, { id: Date.now(), ...entry }]);
  };

  const handleRemoveAutre = (id) => {
    setAutresRevenus((prev) => prev.filter((a) => a.id !== id));
  };

  const TABS = [
    { key: 'globale', label: 'Formation' },
    { key: 'autre',   label: 'Autre' },
  ];

  return (
    <ComptableLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Revenu</h1>
          <p className="text-slate-400 text-xs mt-0.5">{paiements.length} paiement(s)</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex justify-between items-center text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
          <button onClick={() => setError(null)} className="font-bold text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-[#0F2A4A] text-white'
                : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'globale' && (
        <PaiementsGlobale
          paiements={paiements}
          formations={formations}
          loading={loading}
          statutMap={statutMap}
          onStatutChange={handleStatutChange}
        />
      )}

      {activeTab === 'autre' && (
        <PaiementsAutre
          autresRevenus={autresRevenus}
          onAdd={handleAddAutre}
          onRemove={handleRemoveAutre}
        />
      )}
    </ComptableLayout>
  );
};

export default Paiements;