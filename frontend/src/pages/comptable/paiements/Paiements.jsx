import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';

const STATUT_STYLES = {
  'payé':       'bg-green-100 text-green-700',
  'en_attente': 'bg-orange-100 text-orange-600',
  'partiel':    'bg-blue-100 text-blue-600',
};
const STATUT_OPTIONS = ['en_attente', 'payé', 'partiel'];

const Paiements = () => {
  const [paiements, setPaiements] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [formations, setFormations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  const [form, setForm] = useState({
    etudiant_id: '', formation_id: '', montant: '',
    tranche: '', date_paiement: '', statut: 'en_attente',
  });

  const token = () => localStorage.getItem('token');
  const api   = import.meta.env.VITE_API_URL;

  // ── Fetch ──────────────────────────────────────────────────
  const fetchPaiements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api}/api/comptable/paiements`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      setPaiements(await res.json());
    } catch { setError('Erreur chargement paiements.'); }
    finally { setLoading(false); }
  };

  const fetchDropdowns = async () => {
    try {
      const [etRes, foRes] = await Promise.all([
        fetch(`${api}/api/comptable/etudiants`, { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${api}/api/comptable/formations`, { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      if (etRes.ok) setEtudiants(await etRes.json());
      if (foRes.ok) setFormations(await foRes.json());
    } catch { /* silent */ }
  };

  useEffect(() => { fetchPaiements(); }, []);
  useEffect(() => { fetchDropdowns(); }, []);

  // ── Update statut inline ───────────────────────────────────
  const updateStatut = async (id, statut) => {
    try {
      await fetch(`${api}/api/comptable/paiements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ statut }),
      });
      setPaiements((prev) => prev.map((p) => p.id === id ? { ...p, statut } : p));
    } catch { setError('Erreur mise à jour.'); }
  };

  // ── Add paiement ───────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.etudiant_id || !form.formation_id || !form.montant) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${api}/api/comptable/paiements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, montant: parseFloat(form.montant) }),
      });
      if (!res.ok) throw new Error();
      setShowModal(false);
      setForm({ etudiant_id: '', formation_id: '', montant: '', tranche: '', date_paiement: '', statut: 'en_attente' });
      fetchPaiements();
    } catch { setError("Erreur lors de l'ajout."); }
    finally { setSaving(false); }
  };

  const filtered = paiements.filter((p) => {
    const name = `${p.etudiants?.nom ?? ''} ${p.etudiants?.prenom ?? ''} ${p.formations?.nom ?? ''}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchStatut = !filterStatut || p.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  return (
    <ComptableLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Paiements</h1>
          <p className="text-gray-500 text-sm mt-1">{paiements.length} paiement(s)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-blue-700 transition"
        >
          <Plus size={16} /> Nouveau paiement
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex justify-between">
          {error} <button onClick={() => setError(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher étudiant ou formation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-64"
          />
        </div>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Tous les statuts</option>
          {STATUT_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Étudiant', 'Formation', 'Tranche', 'Montant', 'Date', 'Statut'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Aucun paiement trouvé.</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 font-medium text-gray-800 whitespace-nowrap">
                    {p.etudiants?.nom} {p.etudiants?.prenom}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{p.formations?.nom ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{p.tranche || '—'}</td>
                  <td className="px-5 py-3 font-semibold text-gray-800">
                    {parseFloat(p.montant).toLocaleString('fr-DZ')} DA
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {p.date_paiement ? new Date(p.date_paiement).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={p.statut}
                      onChange={(e) => updateStatut(p.id, e.target.value)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${STATUT_STYLES[p.statut] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {STATUT_OPTIONS.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Paiement Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-5">Nouveau paiement</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Étudiant</label>
                <select
                  value={form.etudiant_id}
                  onChange={(e) => setForm((f) => ({ ...f, etudiant_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un étudiant</option>
                  {etudiants.map((et) => (
                    <option key={et.id} value={et.id}>{et.prenom} {et.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Formation</label>
                <select
                  value={form.formation_id}
                  onChange={(e) => setForm((f) => ({ ...f, formation_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner une formation</option>
                  {formations.map((fo) => (
                    <option key={fo.id} value={fo.id}>{fo.nom}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Montant (DA)</label>
                  <input
                    type="number"
                    value={form.montant}
                    onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Tranche</label>
                  <input
                    type="text"
                    value={form.tranche}
                    onChange={(e) => setForm((f) => ({ ...f, tranche: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: 1/3"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Date de paiement</label>
                <input
                  type="date"
                  value={form.date_paiement}
                  onChange={(e) => setForm((f) => ({ ...f, date_paiement: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Statut</label>
                <select
                  value={form.statut}
                  onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUT_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setError(null); }}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.etudiant_id || !form.formation_id || !form.montant}
                className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ComptableLayout>
  );
};

export default Paiements;