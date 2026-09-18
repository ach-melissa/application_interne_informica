// PaiementsFormationPage.jsx
import { useEffect, useState } from 'react';
import ComptableLayout from '../../../layouts/ComptableLayout';
import { Wallet } from 'lucide-react';
import PaiementsGlobale from './PaiementsGlobale';

const PaiementsFormationPage = () => {
  const [paiements, setPaiements] = useState([]);
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = () => localStorage.getItem('token');
  const api = import.meta.env.VITE_API_URL;

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

  const handleStatutChange = async (paymentId, statut) => {
    const res = await fetch(`${api}/api/comptable/paiements/${paymentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ statut }),
    });
    if (res.ok) fetchPaiements();
  };

  return (
    <ComptableLayout>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
            <Wallet size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Revenu  Par formation</h1>
            <p className="text-slate-400 text-xs mt-0.5">{paiements.length} paiement(s)</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex justify-between items-center text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
          <button onClick={() => setError(null)} className="font-bold text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <PaiementsGlobale
        paiements={paiements}
        formations={formations}
        loading={loading}
        onStatutChange={handleStatutChange}
      />
    </ComptableLayout>
  );
};

export default PaiementsFormationPage;