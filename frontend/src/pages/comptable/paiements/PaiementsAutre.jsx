import { useState, useMemo } from 'react';
import { Wallet, Plus, X, Calendar, Tag, Pencil, TrendingUp } from 'lucide-react';

const DEFAULT_CATEGORIES = [
  'Location de salle',
  'Dons / subventions',
  'Vente de matériel',
  "Frais d'événements",
  'Partenariats / sponsoring',
];

const DEFAULT_CATEGORY_COLORS = {
  'Location de salle': { bg: 'bg-[#DCEBFA]', text: 'text-[#0369A1]' },
  'Dons / subventions': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'Vente de matériel': { bg: 'bg-violet-50', text: 'text-violet-700' },
  "Frais d'événements": { bg: 'bg-amber-50', text: 'text-amber-700' },
  'Partenariats / sponsoring': { bg: 'bg-rose-50', text: 'text-rose-700' },
};

const COLOR_PALETTE = [
  { bg: 'bg-sky-50', text: 'text-sky-700' },
  { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700' },
  { bg: 'bg-lime-50', text: 'text-lime-700' },
  { bg: 'bg-orange-50', text: 'text-orange-700' },
];

const PaiementsAutre = ({ autresRevenus = [], onAdd, onEdit, onRemove }) => {
  const [showForm, setShowForm] = useState(false);
const [categoryFilter, setCategoryFilter] = useState('');
const [dateDebut, setDateDebut] = useState('');
const [dateFin, setDateFin] = useState('');
const [montantMin, setMontantMin] = useState('');
const [montantMax, setMontantMax] = useState('');
const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
const [categoryColors, setCategoryColors] = useState(DEFAULT_CATEGORY_COLORS);
const [form, setForm] = useState({ libelle: '', montant: '', date: '', categorie: categories[0] });

const [showCategoryManager, setShowCategoryManager] = useState(false);
const [newCategory, setNewCategory] = useState('');
const [editingCategory, setEditingCategory] = useState(null);

const [editingId, setEditingId] = useState(null); 

const filtered = useMemo(
  () => autresRevenus.filter((a) => {
    if (categoryFilter && a.categorie !== categoryFilter) return false;
if (dateDebut && new Date(a.date) < new Date(dateDebut)) return false;
if (dateFin && new Date(a.date) > new Date(dateFin)) return false;
    const m = Number(a.montant || 0);
    if (montantMin && m < Number(montantMin)) return false;
    if (montantMax && m > Number(montantMax)) return false;
    return true;
  }),
  [autresRevenus, categoryFilter, dateDebut, dateFin, montantMin, montantMax]
);

  const total = useMemo(
    () => filtered.reduce((s, a) => s + Number(a.montant || 0), 0),
    [filtered]
  );

  const categorieTop = useMemo(() => {
  const totals = {};
  filtered.forEach((a) => {
    const cat = a.categorie || 'Sans catégorie';
    totals[cat] = (totals[cat] || 0) + Number(a.montant || 0);
  });
  const entries = Object.entries(totals);
  if (entries.length === 0) return null;
  return entries.reduce((max, curr) => (curr[1] > max[1] ? curr : max));
}, [filtered]);

const handleSave = () => {
  if (!form.libelle || !form.montant) return;

  if (editingId) {
    if (!window.confirm('Confirmer la modification de cette ligne ?')) return;
    onEdit?.(editingId, form);
  } else {
    onAdd?.(form);
  }

  setForm({ libelle: '', montant: '', date: '', categorie: categories[0] });
  setEditingId(null);
  setShowForm(false);
};

const handleStartEdit = (entry) => {
  setForm({
    libelle: entry.libelle,
    montant: entry.montant,
    date: entry.date,
    categorie: entry.categorie,
  });
  setEditingId(entry.id);
  setShowForm(true);
};

const handleRemove = (id) => {
  if (!window.confirm('Supprimer cette ligne de revenu ? Cette action est irréversible.')) return;
  onRemove?.(id);
  setEditingId(null);
  setShowForm(false);
};

const handleAddCategory = () => {
  const name = newCategory.trim();
  if (!name || categories.includes(name)) return;
  setCategories((prev) => [...prev, name]);
  setCategoryColors((prev) => ({
    ...prev,
    [name]: COLOR_PALETTE[Object.keys(prev).length % COLOR_PALETTE.length],
  }));
  setNewCategory('');
};

const handleRenameCategory = (oldName, newName) => {
  const name = newName.trim();
  if (!name || name === oldName) { setEditingCategory(null); return; }
  setCategories((prev) => prev.map((c) => (c === oldName ? name : c)));
  setCategoryColors((prev) => {
    const { [oldName]: color, ...rest } = prev;
    return { ...rest, [name]: color };
  });
  autresRevenus
    .filter((a) => a.categorie === oldName)
    .forEach((a) => onEdit?.(a.id, { categorie: name }));
  setEditingCategory(null);
};

const handleDeleteCategory = (name) => {
  const enUsage = autresRevenus.some((a) => a.categorie === name);
  const msg = enUsage
    ? `Supprimer "${name}" ? Des revenus existants utilisent cette catégorie et la garderont, mais elle ne sera plus proposée dans le formulaire.`
    : `Supprimer la catégorie "${name}" ?`;
  if (!window.confirm(msg)) return;
  setCategories((prev) => prev.filter((c) => c !== name));
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
<div className="flex items-center gap-3 bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] px-4 py-3 min-w-[220px]">
  <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-700">
    <TrendingUp size={16} />
  </div>
  <div>
    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Catégorie la plus rentable</p>
    <p className="text-sm font-bold text-[#0F2A4A]">{categorieTop ? categorieTop[0] : '—'}</p>
    {categorieTop && (
      <p className="text-[10px] text-slate-400">{categorieTop[1].toLocaleString('fr-DZ')} DA</p>
    )}
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
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
<div className="flex items-center gap-1 bg-white rounded-full border border-[#E2E8F0] px-3 py-1.5 text-xs text-slate-500">
  <Calendar size={13} className="text-[#0369A1]" />
  <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="outline-none text-xs w-[110px]" />
  <span>→</span>
  <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="outline-none text-xs w-[110px]" />
</div>

<div className="flex items-center gap-1 bg-white rounded-full border border-[#E2E8F0] px-3 py-1.5 text-xs text-slate-500">
  <input type="number" placeholder="Min DA" value={montantMin} onChange={(e) => setMontantMin(e.target.value)} className="w-16 outline-none text-xs" />
  <span>–</span>
  <input type="number" placeholder="Max DA" value={montantMax} onChange={(e) => setMontantMax(e.target.value)} className="w-16 outline-none text-xs" />
</div>
        <button
          onClick={() => setShowCategoryManager(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#0369A1] bg-white border border-[#E2E8F0] hover:bg-[#DCEBFA] px-4 py-2 rounded-full transition"
        >
          <Tag size={14} /> Catégories
        </button>
        <button
          onClick={() => { setEditingId(null); setForm({ libelle: '', montant: '', date: '', categorie: categories[0] }); setShowForm(true); }}
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
        <h3 className="text-sm font-bold text-[#0F2A4A]">
  {editingId ? 'Modifier le revenu' : 'Ajouter un revenu'}
</h3>
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
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
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

      {editingId ? (
        <div className="flex gap-2 mt-4">
          <button onClick={() => handleRemove(editingId)}
            className="px-4 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
            Supprimer
          </button>
          <button onClick={() => setShowForm(false)}
            className="flex-1 px-4 py-2 text-xs font-medium text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100">
            Annuler
          </button>
          <button onClick={handleSave}
            className="flex-1 px-4 py-2 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#0F2A4A]/90">
            Modifier
          </button>
        </div>
      ) : (
        <button onClick={handleSave}
          className="mt-4 w-full px-4 py-2 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#0F2A4A]/90">
          Ajouter
        </button>
      )}
    </div>
  </div>
)}
{showCategoryManager && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
    onClick={() => setShowCategoryManager(false)}
  >
    <div
      className="bg-white rounded-xl shadow-xl w-full max-w-md p-5"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#0F2A4A]">Gérer les catégories</h3>
        <button onClick={() => setShowCategoryManager(false)} className="text-[#0369A1] hover:text-[#0F2A4A]">
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-4">
        {categories.map((c) => (
          <div key={c} className="flex items-center gap-2">
            {editingCategory?.old === c ? (
              <input
                autoFocus
                value={editingCategory.value}
                onChange={(e) => setEditingCategory({ old: c, value: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameCategory(c, editingCategory.value)}
                className="flex-1 px-2 py-1 text-xs rounded border border-[#0369A1]/40 focus:outline-none"
              />
            ) : (
              <span className="flex-1 text-xs text-slate-700">{c}</span>
            )}

            {editingCategory?.old === c ? (
              <button onClick={() => handleRenameCategory(c, editingCategory.value)} className="text-[10px] text-emerald-600 font-medium">
                OK
              </button>
            ) : (
              <button onClick={() => setEditingCategory({ old: c, value: c })} className="text-[10px] text-[#0369A1] font-medium">
                Modifier
              </button>
            )}
            <button onClick={() => handleDeleteCategory(c)} className="text-slate-300 hover:text-red-500">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
          placeholder="Nouvelle catégorie"
          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
        />
        <button onClick={handleAddCategory} className="px-3 py-1.5 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg">
          <Plus size={14} />
        </button>
      </div>
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
  Catégorie
</th>
<th className="text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0]">
  Description
</th>
                <th className="text-right px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0]">
                  Montant
                </th>
                <th className="text-right px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-r border-[#E2E8F0]">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, idx) => {
                const colors = categoryColors[a.categorie] ?? { bg: 'bg-slate-50', text: 'text-slate-600' };
                return (
                 <tr
  key={a.id}
  onClick={() => handleStartEdit(a)}
  className={`cursor-pointer hover:bg-[#DCEBFA]/30 transition ${idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}`}
  title="Cliquer pour modifier ou supprimer"
>
<td className="px-3 py-2.5 whitespace-nowrap border-b border-l border-[#E2E8F0]">
  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
    {a.categorie ?? '—'}
  </span>
</td>
<td className="px-3 py-2.5 font-medium text-slate-700 border-b border-[#E2E8F0]">
  {a.libelle}
</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-[#E2E8F0]">
                      {Number(a.montant).toLocaleString('fr-DZ')} DA
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-500 whitespace-nowrap border-b border-r border-[#E2E8F0]">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={11} />
                        {a.date ? new Date(a.date).toLocaleDateString('fr-DZ') : '—'}
                      </span>
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