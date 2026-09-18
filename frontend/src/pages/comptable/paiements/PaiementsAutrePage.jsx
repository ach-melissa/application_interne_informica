// PaiementsAutrePage.jsx
import { useEffect, useState } from 'react';
import ComptableLayout from '../../../layouts/ComptableLayout';
import { Wallet } from 'lucide-react';
import PaiementsAutre from './PaiementsAutre';

const PaiementsAutrePage = () => {
  const [autresRevenus, setAutresRevenus] = useState([]);
  const [error, setError] = useState(null);

  const token = () => localStorage.getItem('token');
  const api = import.meta.env.VITE_API_URL;

  const fetchAutresRevenus = async () => {
    try {
      const res = await fetch(`${api}/api/comptable/autres-revenus`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setAutresRevenus(await res.json());
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchAutresRevenus();
  }, []);

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
       const created = await res.json();
      setAutresRevenus((prev) => [...prev, created]);
      return created;
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

  return (
    <ComptableLayout>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
            <Wallet size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Revenu  Autre</h1>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex justify-between items-center text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
          <button onClick={() => setError(null)} className="font-bold text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <PaiementsAutre
        autresRevenus={autresRevenus}
        onAdd={handleAddAutre}
        onEdit={handleEditAutre}
        onRemove={handleRemoveAutre}
      />
    </ComptableLayout>
  );
};

export default PaiementsAutrePage;