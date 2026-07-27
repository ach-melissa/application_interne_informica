import { useState, useMemo } from 'react';
import ComptableLayout from '../../../layouts/ComptableLayout';
import { Search, Tag, Calendar, Plus, X, Receipt } from 'lucide-react';

const CATEGORIES = [
  'Loyer',
  'Matériel pédagogique',
  'Salaires',
  'Électricité / eau / internet',
  'Entretien et réparations',
];

const CATEGORY_COLORS = {
  'Loyer': { bg: 'bg-[#DCEBFA]', text: 'text-[#0369A1]' },
  'Matériel pédagogique': { bg: 'bg-violet-50', text: 'text-violet-700' },
  'Salaires': { bg: 'bg-amber-50', text: 'text-amber-700' },
  'Électricité / eau / internet': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'Entretien et réparations': { bg: 'bg-red-50', text: 'text-red-600' },
};

const monthLabel = (ym) => {
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
};

const MonthlyChart = ({ data }) => {
  if (data.length === 0) {
    return <p className="text-center text-slate-400 text-xs py-14">Pas encore de charges à afficher.</p>;
  }

  const max = Math.max(...data.map((d) => d.total), 1);
  const width = Math.max(data.length * 70, 320);
  const height = 220;
  const topMargin = 34;
  const bottomMargin = 30;
  const barWidth = 32;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block overflow-visible">
        {data.map((d, i) => {
          const barHeight = (d.total / max) * (height - topMargin - bottomMargin);
          const x = i * 70 + 20;
          const y = height - bottomMargin - barHeight;
          return (
            <g key={d.month}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                className="fill-[#0369A1]"
              />
              <text
                x={x + barWidth / 2}
                y={y - 10}
                textAnchor="middle"
                className="fill-slate-600 text-[10px] font-semibold"
              >
                {d.total.toLocaleString('fr-DZ')}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - 12}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] capitalize"
              >
                {monthLabel(d.month)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Données de test uniquement — à supprimer une fois l'API branchée et le
// rendu vérifié (table, graphe, filtres).
const SAMPLE_CHARGES = [
  { id: 1, date: '2026-04-05', description: 'Loyer local avril', montant: 45000, categorie: 'Loyer' },
  { id: 2, date: '2026-04-12', description: 'Facture électricité', montant: 8200, categorie: 'Électricité / eau / internet' },
  { id: 3, date: '2026-04-20', description: 'Livres formation comptabilité', montant: 12500, categorie: 'Matériel pédagogique' },
  { id: 4, date: '2026-04-28', description: 'Salaires équipe avril', montant: 180000, categorie: 'Salaires' },
  { id: 5, date: '2026-05-05', description: 'Loyer local mai', montant: 45000, categorie: 'Loyer' },
  { id: 6, date: '2026-05-10', description: 'Réparation climatiseur', montant: 6300, categorie: 'Entretien et réparations' },
  { id: 7, date: '2026-05-15', description: 'Internet + téléphone', montant: 4500, categorie: 'Électricité / eau / internet' },
  { id: 8, date: '2026-05-28', description: 'Salaires équipe mai', montant: 182000, categorie: 'Salaires' },
  { id: 9, date: '2026-06-03', description: 'Loyer local juin', montant: 45000, categorie: 'Loyer' },
  { id: 10, date: '2026-06-09', description: 'Fournitures de classe', montant: 9800, categorie: 'Matériel pédagogique' },
  { id: 11, date: '2026-06-18', description: 'Eau', montant: 2100, categorie: 'Électricité / eau / internet' },
  { id: 12, date: '2026-06-25', description: 'Maintenance ordinateurs', montant: 7400, categorie: 'Entretien et réparations' },
  { id: 13, date: '2026-06-28', description: 'Salaires équipe juin', montant: 179500, categorie: 'Salaires' },
  { id: 14, date: '2026-07-05', description: 'Loyer local juillet', montant: 45000, categorie: 'Loyer' },
  { id: 15, date: '2026-07-14', description: 'Facture électricité', montant: 9100, categorie: 'Électricité / eau / internet' },
  { id: 16, date: '2026-07-22', description: 'Peinture salle 2', montant: 15200, categorie: 'Entretien et réparations' },
  { id: 17, date: '2026-07-27', description: 'Factures courantes de fonctionnement', montant: 12000, categorie: 'Électricité / eau / internet' },
];

const Charges = () => {
  // Pas encore de route backend dédiée aux charges — données stockées en local
  // pour valider l'UI. TODO: brancher sur GET/POST/DELETE /api/comptable/charges
  // une fois l'API prête (remplacer ce useState par un fetch, comme pour paiements).
  // Initialisé avec SAMPLE_CHARGES juste pour vérifier visuellement le rendu —
  // remets useState([]) une fois que c'est validé.
  const [charges, setCharges] = useState(SAMPLE_CHARGES);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', description: '', montant: '', categorie: CATEGORIES[0] });

  const handleAdd = () => {
    if (!form.date || !form.description || !form.montant) return;
    setCharges((prev) => [...prev, { id: Date.now(), ...form }]);
    setForm({ date: '', description: '', montant: '', categorie: CATEGORIES[0] });
    setShowForm(false);
  };

  const handleRemove = (id) => {
    setCharges((prev) => prev.filter((c) => c.id !== id));
  };

  const filtered = useMemo(() => {
    return charges.filter((c) => {
      const matchSearch = !search || c.description.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || c.categorie === categoryFilter;
      const matchFrom = !dateFrom || c.date >= dateFrom;
      const matchTo = !dateTo || c.date <= dateTo;
      return matchSearch && matchCategory && matchFrom && matchTo;
    });
  }, [charges, search, categoryFilter, dateFrom, dateTo]);

  const total = useMemo(() => filtered.reduce((s, c) => s + Number(c.montant || 0), 0), [filtered]);

  const monthlyTotals = useMemo(() => {
    const map = {};
    charges.forEach((c) => {
      if (!c.date) return;
      const month = c.date.slice(0, 7);
      map[month] = (map[month] || 0) + Number(c.montant || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total }));
  }, [charges]);

  return (
    <ComptableLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Charges</h1>
          <p className="text-slate-400 text-xs mt-0.5">{charges.length} charge(s)</p>
        </div>
      </div>

      {/* Card + add button */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3 bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] px-4 py-3 min-w-[220px]">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <Receipt size={16} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total charges (filtré)</p>
            <p className="text-sm font-bold text-[#0F2A4A]">{total.toLocaleString('fr-DZ')} DA</p>
          </div>
        </div>

        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] hover:bg-[#c9e2f7] px-4 py-2 rounded-full transition"
        >
          <Plus size={14} /> Ajouter une charge
        </button>
      </div>

      {showForm && (
        <div className="mb-5 bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] p-4 flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 uppercase">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-[10px] text-slate-400 uppercase">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
              placeholder="Ex: Facture électricité juillet"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 uppercase">Montant (DA)</label>
            <input
              type="number"
              value={form.montant}
              onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 w-32"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 uppercase">Catégorie</label>
            <select
              value={form.categorie}
              onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 min-w-[180px]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-1.5 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#0F2A4A]/90"
          >
            Ajouter
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="relative min-w-[200px] flex-1 max-w-[240px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input
            type="text"
            placeholder="Description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
          />
        </div>

        <div className="relative flex items-center">
          <Tag size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none z-10" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`pl-8 pr-4 py-1.5 text-xs rounded-full bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer min-w-[200px]
              ${categoryFilter ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}
          >
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar size={13} className="text-[#0369A1]" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-full bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
          />
          <span className="text-slate-300 text-xs">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-full bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
          />
        </div>

        <span className="text-[11px] text-slate-400 bg-[#F8FCFF] border border-[#E2E8F0] px-2.5 py-1 rounded-full">
          {filtered.length} / {charges.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#DCEBFA]">
              <tr>
                <th className="text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-l border-[#E2E8F0] whitespace-nowrap">
                  Date
                </th>
                <th className="text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0]">
                  Description
                </th>
                <th className="text-right px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] whitespace-nowrap">
                  Montant
                </th>
                <th className="text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] whitespace-nowrap">
                  Catégorie
                </th>
                <th className="w-10 border-b border-r border-[#E2E8F0]"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 bg-white">
                    Aucune charge trouvée.
                  </td>
                </tr>
              ) : filtered.map((c, idx) => {
                const colors = CATEGORY_COLORS[c.categorie] ?? { bg: 'bg-slate-50', text: 'text-slate-600' };
                return (
                  <tr key={c.id} className={`hover:bg-[#DCEBFA]/30 transition ${idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}`}>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-l border-[#E2E8F0]">
                      {c.date ? new Date(c.date).toLocaleDateString('fr-DZ') : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-700 border-b border-[#E2E8F0]">
                      {c.description}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-[#E2E8F0]">
                      {Number(c.montant).toLocaleString('fr-DZ')} DA
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap border-b border-[#E2E8F0]">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {c.categorie}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-r border-[#E2E8F0]">
                      <button onClick={() => handleRemove(c.id)} className="text-slate-300 hover:text-red-500">
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

        {/* Chart */}
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] p-4 mb-5">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Dépenses par mois
        </p>
        <MonthlyChart data={monthlyTotals} />
      </div>
    </ComptableLayout>
  );
};

export default Charges;