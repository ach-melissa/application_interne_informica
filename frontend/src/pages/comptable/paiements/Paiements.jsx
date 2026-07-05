import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';
import PaiementsGlobale   from './PaiementsGlobale';
import PaiementsFormation from './PaiementsFormation';

const Paiements = () => {
  const [paiements,  setPaiements]  = useState([]);
  const [formations, setFormations] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [activeTab,  setActiveTab]  = useState('globale');

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

  const handleUpdateStatut = async (id, statut) => {
    try {
      await fetch(`${api}/api/comptable/paiements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ statut }),
      });
      setPaiements((prev) => prev.map((p) => (p.id === id ? { ...p, statut } : p)));
    } catch {
      setError('Erreur mise à jour statut.');
    }
  };

  const TABS = [
    { key: 'globale',   label: 'Vue globale' },
    { key: 'formation', label: 'Vue par formation' },
  ];

  return (
    <ComptableLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Paiements</h1>
          <p className="text-slate-400 text-xs mt-0.5">{paiements.length} paiement(s)</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex justify-between items-center text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
          <button onClick={() => setError(null)} className="font-bold text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Tabs — same pill pattern as GroupDetail */}
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
          loading={loading}
          onUpdateStatut={handleUpdateStatut}
        />
      )}

      {activeTab === 'formation' && (
        <PaiementsFormation
          formations={formations}
          token={token}
          api={api}
        />
      )}
    </ComptableLayout>
  );
};

export default Paiements;