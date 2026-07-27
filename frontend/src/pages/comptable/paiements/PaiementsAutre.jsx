import { useState, useMemo } from 'react';
import { Wallet, Plus, X, Calendar, Tag } from 'lucide-react';

const CATEGORIES = [
  'Location de salle',
  'Dons / subventions',
  'Vente de matériel',
  "Frais d'événements",
  'Partenariats / sponsoring',
];

const CATEGORY_COLORS = {
  'Location de salle': { bg: 'bg-[#DCEBFA]', text: 'text-[#0369A1]' },
  'Dons / subventions': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'Vente de matériel': { bg: 'bg-violet-50', text: 'text-violet-700' },
  "Frais d'événements": { bg: 'bg-amber-50', text: 'text-amber-700' },
  'Partenariats / sponsoring': { bg: 'bg-rose-50', text: 'text-rose-700' },
};

const PaiementsAutre = ({ autresRevenus = [], onAdd, onRemove }) => {
  const [showForm, setShowForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [form, setForm] = useState({ libelle: '', montant: '', date: '', categorie: CATEGORIES[0] });

  const filtered = useMemo(
    () => autresRevenus.filter((a) => !categoryFilter || a.categorie === categoryFilter),
    [autresRevenus, categoryFilter]
  );

  const total = useMemo(
    () => filtered.reduce((s, a) => s + Number(a.montant || 0), 0),
    [filtered]
  );

  const handleAdd = () => {
    if (!form.libelle || !form.montant) return;
    onAdd?.(form);
    setForm({ libelle: '', montant: '', date: '', categorie: CATEGORIES[0] });
    setShowForm(false);
  };

  return (
    <>
      {/* Card + filter + add button */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="flex items-center gap-3 bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] px-4 py-3 min-w-[220px]">
          <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700">
            <Wallet size={16} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total payé — Autres</p>
            <p className="text-sm font-bold text-[#0F2A4A]">{total.toLocaleString('fr-DZ')} DA</p>
          </div>
        </div>

        <div className="relative flex items-center">
          <Tag size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none z-10" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`pl-8 pr-4 py-1.5 text-xs rounded-full bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer min-w-[220px]
              ${categoryFilter ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}
          >
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] hover:bg-[#c9e2f7] px-4 py-2 rounded-full transition"
        >
          <Plus size={14} /> Ajouter un revenu
        </button>
      </div>

{showForm && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
    onClick={() => setShowForm(false)}
  >
    <div
      className="bg-white rounded-xl shadow-xl w-full max-w-md p-5"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#0F2A4A]">Ajouter un revenu</h3>
        <button onClick={() => setShowForm(false)} className="text-[#0369A1] hover:text-[#0F2A4A]">
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 uppercase">Libellé</label>
          <input type="text" value={form.libelle}
            onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
            placeholder="Ex: Location salle informatique" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 uppercase">Catégorie</label>
          <select value={form.categorie}
            onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 uppercase">Montant (DA)</label>
          <input type="number" value={form.montant}
            onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 uppercase">Date</label>
          <input type="date" value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
        </div>
      </div>

      <button onClick={handleAdd}
        className="mt-4 w-full px-4 py-2 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#0F2A4A]/90">
        Ajouter
      </button>
    </div>
  </div>
)}

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          Aucun revenu autre enregistré pour le moment.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[#DCEBFA]">
              <tr>
                <th className="text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-l border-[#E2E8F0]">
                  Libellé
                </th>
                <th className="text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0]">
                  Catégorie
                </th>
                <th className="text-right px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0]">
                  Montant
                </th>
                <th className="text-right px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0]">
                  Date
                </th>
                <th className="w-10 border-b border-r border-[#E2E8F0]"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, idx) => {
                const colors = CATEGORY_COLORS[a.categorie] ?? { bg: 'bg-slate-50', text: 'text-slate-600' };
                return (
                  <tr key={a.id} className={idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}>
                    <td className="px-3 py-2.5 font-medium text-slate-700 border-b border-l border-[#E2E8F0]">
                      {a.libelle}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap border-b border-[#E2E8F0]">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {a.categorie ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-[#E2E8F0]">
                      {Number(a.montant).toLocaleString('fr-DZ')} DA
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={11} />
                        {a.date ? new Date(a.date).toLocaleDateString('fr-DZ') : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right border-b border-r border-[#E2E8F0]">
                      <button onClick={() => onRemove?.(a.id)} className="text-slate-300 hover:text-red-500">
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default PaiementsAutre;