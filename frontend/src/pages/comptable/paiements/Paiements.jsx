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

  const [autresRevenus, setAutresRevenus] = useState([]);

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
const fetchAutresRevenus = async () => {
  try {
    const res = await fetch(`${api}/api/comptable/autres-revenus`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (res.ok) setAutresRevenus(await res.json());
  } catch { /* silent */ }
};

useEffect(() => {
  fetchPaiements();
  fetchFormations();
  fetchAutresRevenus();
}, []);

const handleStatutChange = async (paymentId, statut) => {
  const res = await fetch(`${api}/api/comptable/paiements/${paymentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: JSON.stringify({ statut }),
  });
  if (res.ok) fetchPaiements(); // recharger pour refléter le vrai statut
};

const handleAddAutre = async (entry) => {
  try {
    const res = await fetch(`${api}/api/comptable/autres-revenus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(entry),
    });
    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({}));
      setError(msg || 'Erreur ajout revenu.');
      return false;
    }
    const created = await res.json();          // ← résoudre d'abord
    setAutresRevenus((prev) => [...prev, created]); // ← puis utiliser la valeur
    return true;
  } catch {
    setError('Erreur réseau.');
    return false;
  }
};

const handleRemoveAutre = async (id) => {
  try {
    const res = await fetch(`${api}/api/comptable/autres-revenus/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) { setError('Erreur suppression.'); return false; }
    setAutresRevenus((prev) => prev.filter((a) => a.id !== id));
    return true;
  } catch {
    setError('Erreur réseau.');
    return false;
  }
};

const handleEditAutre = async (id, updated) => {
  try {
    const res = await fetch(`${api}/api/comptable/autres-revenus/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(updated),
    });
    if (!res.ok) { setError('Erreur modification.'); return false; }
    const updatedData = await res.json();
    setAutresRevenus((prev) => prev.map((a) => (a.id === id ? updatedData : a)));
    return true;
  } catch {
    setError('Erreur réseau.');
    return false;
  }
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
  onEdit={handleEditAutre}
  onRemove={handleRemoveAutre}
/>
      )}
    </ComptableLayout>
  );
};

export default Paiements;