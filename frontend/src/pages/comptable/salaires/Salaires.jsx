import { useEffect, useState } from 'react';
import { Plus, Search, User, Shield, CalendarDays, Wallet, MessageSquare, CheckCircle2 } from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';

const STATUT_STYLES = {
  'payé':       'bg-emerald-50 text-emerald-700',
  'en_attente': 'bg-amber-50 text-amber-700',
  'partiel':    'bg-[#DCEBFA] text-[#0369A1]',
};
const STATUT_OPTIONS = ['en_attente', 'payé', 'partiel'];

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const COLS = [
  { label: 'Employé', icon: User },
  { label: 'Rôle',    icon: Shield },
  { label: 'Mois',    icon: CalendarDays },
  { label: 'Montant', icon: Wallet },
  { label: 'Note',    icon: MessageSquare },
  { label: 'Statut',  icon: CheckCircle2 },
];

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
      {/* Header — matches Utilisateurs header + button style */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Salaires</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            {MONTHS[filterMois - 1]} {filterAnnee} — {filtered.length} / {salaires.length} fiche(s)
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-lg text-xs font-medium
            shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all"
        >
          <Plus size={14} /> Nouveau salaire
        </button>
      </div>

      {error && (
        <div className="mb-4 flex justify-between items-center text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
          <button onClick={() => setError(null)} className="font-bold text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Filter bar — pill style matching Utilisateurs */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative min-w-[160px] flex-1 max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher employé…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
          />
        </div>
        <div className="w-px h-5 bg-[#E2E8F0]" />
        <div className="relative flex items-center">
          <select
            value={filterMois}
            onChange={(e) => setMois(Number(e.target.value))}
            className="text-xs rounded-full py-1.5 px-3 bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer text-[#0369A1] font-medium"
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="relative flex items-center">
          <select
            value={filterAnnee}
            onChange={(e) => setAnnee(Number(e.target.value))}
            className="text-xs rounded-full py-1.5 px-3 bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer text-[#0369A1] font-medium"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#0F2A4A] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#DCEBFA]">
                <tr>
                  {COLS.map(({ label, icon: Icon }, i) => (
                    <th key={label} className={`text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] ${i === 0 ? 'border-l border-[#E2E8F0]' : ''}`}>
                      <span className="flex items-center gap-1.5">
                        <Icon size={12} />
                        {label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400 bg-white">Aucun salaire pour cette période.</td></tr>
                ) : filtered.map((s, idx) => (
                  <tr key={s.id} className={`hover:bg-[#DCEBFA]/30 transition ${idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}`}>
                    <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap border-b border-l border-[#E2E8F0]">
                      {s.users?.nom} {s.users?.prenom}
                    </td>
                    <td className="px-3 py-2.5 border-b border-[#E2E8F0]">
                      <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize font-medium">
                        {s.users?.role ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">{MONTHS[s.mois - 1]} {s.annee}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700 whitespace-nowrap border-b border-[#E2E8F0]">
                      {parseFloat(s.montant).toLocaleString('fr-DZ')} DA
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 truncate border-b border-[#E2E8F0]">{s.note || '—'}</td>
                    <td className="px-3 py-2.5 border-b border-[#E2E8F0]">
                      <select
                        value={s.statut}
                        onChange={(e) => updateStatut(s.id, e.target.value)}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 ${STATUT_STYLES[s.statut] ?? 'bg-slate-100 text-slate-500'}`}
                      >
                        {STATUT_OPTIONS.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Salaire Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">Nouveau salaire</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Employé</label>
                <select
                  value={form.user_id}
                  onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
                >
                  <option value="">Sélectionner un employé</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.prenom} {u.nom} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Montant (DA)</label>
                <input
                  type="number"
                  value={form.montant}
                  onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Mois</label>
                  <select
                    value={form.mois}
                    onChange={(e) => setForm((f) => ({ ...f, mois: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
                  >
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Année</label>
                  <input
                    type="number"
                    value={form.annee}
                    onChange={(e) => setForm((f) => ({ ...f, annee: e.target.value }))}
                    className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Statut</label>
                <select
                  value={form.statut}
                  onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
                >
                  {STATUT_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Note (optionnel)</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
                  placeholder="ex: Prime incluse"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setError(null); }}
                className="flex-1 border border-[#E2E8F0] text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.user_id || !form.montant}
                className="flex-1 bg-[#0F2A4A] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#16385f] disabled:opacity-50 transition"
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