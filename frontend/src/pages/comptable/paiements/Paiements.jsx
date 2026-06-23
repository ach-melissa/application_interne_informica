import { useEffect, useState } from 'react';
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

  // ── Fetch all payments (for globale tab) ────────────────────────────────
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

  // ── Fetch formations (needed by the "Vue par formation" tab) ────────────
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

  // ── Inline statut update ─────────────────────────────────────────────────
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

  return (
    <ComptableLayout>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Paiements</h1>
          <p className="text-gray-500 text-sm mt-1">{paiements.length} paiement(s)</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'globale',    label: 'Vue globale' },
          { key: 'formation',  label: 'Vue par formation' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
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