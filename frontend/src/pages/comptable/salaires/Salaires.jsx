import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';

const STATUT_STYLES = {
  'payé':       'bg-green-100 text-green-700',
  'en_attente': 'bg-orange-100 text-orange-600',
  'partiel':    'bg-blue-100 text-blue-600',
};
const STATUT_OPTIONS = ['en_attente', 'payé', 'partiel'];

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const Salaires = () => {
  const [salaires, setSalaires]   = useState([]);
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterMois, setMois]     = useState(currentMonth);
  const [filterAnnee, setAnnee]   = useState(currentYear);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  const [form, setForm] = useState({
    user_id: '', montant: '', mois: currentMonth,
    annee: currentYear, statut: 'en_attente', note: '',
  });

  const token = () => localStorage.getItem('token');
  const api   = import.meta.env.VITE_API_URL;

  // ── Fetch ──────────────────────────────────────────────────
  const fetchSalaires = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${api}/api/comptable/salaires?mois=${filterMois}&annee=${filterAnnee}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      if (!res.ok) throw new Error();
      setSalaires(await res.json());
    } catch { setError('Erreur chargement salaires.'); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${api}/api/comptable/staff`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch { /* silent */ }
  };

  useEffect(() => { fetchSalaires(); }, [filterMois, filterAnnee]);
  useEffect(() => { fetchUsers(); }, []);

  // ── Update statut inline ───────────────────────────────────
  const updateStatut = async (id, statut) => {
    try {
      await fetch(`${api}/api/comptable/salaires/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ statut }),
      });
      setSalaires((prev) => prev.map((s) => s.id === id ? { ...s, statut } : s));
    } catch { setError('Erreur mise à jour.'); }
  };

  // ── Add salaire ────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.user_id || !form.montant) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${api}/api/comptable/salaires`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, montant: parseFloat(form.montant), mois: parseInt(form.mois), annee: parseInt(form.annee) }),
      });
      if (!res.ok) throw new Error();
      setShowModal(false);
      setForm({ user_id: '', montant: '', mois: currentMonth, annee: currentYear, statut: 'en_attente', note: '' });
      fetchSalaires();
    } catch { setError("Erreur lors de l'ajout."); }
    finally { setSaving(false); }
  };

  const filtered = salaires.filter((s) => {
    const name = `${s.users?.nom ?? ''} ${s.users?.prenom ?? ''} ${s.users?.role ?? ''}`.toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  return (
    <ComptableLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Salaires</h1>
          <p className="text-gray-500 text-sm mt-1">
            {MONTHS[filterMois - 1]} {filterAnnee} — {salaires.length} fiche(s)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-blue-700 transition"
        >
          <Plus size={16} /> Nouveau salaire
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
            placeholder="Rechercher employé..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-56"
          />
        </div>
        <select
          value={filterMois}
          onChange={(e) => setMois(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select
          value={filterAnnee}
          onChange={(e) => setAnnee(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
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
                {['Employé', 'Rôle', 'Mois', 'Montant', 'Note', 'Statut'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Aucun salaire pour cette période.</td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 font-medium text-gray-800 whitespace-nowrap">
                    {s.users?.nom} {s.users?.prenom}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                      {s.users?.role ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{MONTHS[s.mois - 1]} {s.annee}</td>
                  <td className="px-5 py-3 font-semibold text-gray-800">
                    {parseFloat(s.montant).toLocaleString('fr-DZ')} DA
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{s.note || '—'}</td>
                  <td className="px-5 py-3">
                    <select
                      value={s.statut}
                      onChange={(e) => updateStatut(s.id, e.target.value)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${STATUT_STYLES[s.statut] ?? 'bg-gray-100 text-gray-600'}`}
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

      {/* Add Salaire Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-5">Nouveau salaire</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Employé</label>
                <select
                  value={form.user_id}
                  onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un employé</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.prenom} {u.nom} ({u.role})</option>
                  ))}
                </select>
              </div>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Mois</label>
                  <select
                    value={form.mois}
                    onChange={(e) => setForm((f) => ({ ...f, mois: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Année</label>
                  <input
                    type="number"
                    value={form.annee}
                    onChange={(e) => setForm((f) => ({ ...f, annee: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Note (optionnel)</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ex: Prime incluse"
                />
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
                disabled={saving || !form.user_id || !form.montant}
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

export default Salaires;