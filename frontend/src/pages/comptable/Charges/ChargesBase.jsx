import { useState, useMemo, useEffect } from 'react';
import ComptableLayout from '../../../layouts/ComptableLayout';
import {
  Search, Tag, Calendar, Plus, Receipt, CalendarDays,
  X, Pencil, Trash2, AlertTriangle,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const request = async (path, options = {}) => {
  const res = await fetch(`${API}/api/comptable${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || 'Erreur serveur.');
  }
  return res.status === 204 ? null : res.json().catch(() => null);
};

// Palette assignée automatiquement aux catégories, dans l'ordre où elles
// existent. Ajouter une catégorie prend simplement la couleur suivante.
const COLOR_PALETTE = [
  { bg: 'bg-sky-50', text: 'text-sky-700' },
  { bg: 'bg-amber-50', text: 'text-amber-700' },
  { bg: 'bg-violet-50', text: 'text-violet-700' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { bg: 'bg-rose-50', text: 'text-rose-700' },
  { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700' },
  { bg: 'bg-orange-50', text: 'text-orange-700' },
];

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
              <rect x={x} y={y} width={barWidth} height={barHeight} rx={4} className="fill-[#0369A1]" />
              <text x={x + barWidth / 2} y={y - 10} textAnchor="middle" className="fill-slate-600 text-[10px] font-semibold">
                {d.total.toLocaleString('fr-DZ')}
              </text>
              <text x={x + barWidth / 2} y={height - 12} textAnchor="middle" className="fill-slate-400 text-[10px] capitalize">
                {monthLabel(d.month)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const emptyForm = { categorie: '', montant: '', date: '', description: '' };

/**
 * ChargesBase — composant générique réutilisé par "Charges de formation"
 * et "Autre charge". Seules les catégories et les données de départ
 * changent d'une page à l'autre (voir props).
 *
 * props:
 *  - title            : titre affiché en haut de page
 *  - type             : 'formation' ou 'autre' (filtre envoyé à l'API)
 */
const ChargesBase = ({ title, type }) => {
  const [charges, setCharges] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
request(`/charges?type=${type}`),
request(`/charges/categories?type=${type}`),
    ])
      .then(([c, cat]) => {
        if (cancelled) return;
setCharges(c);
setCategories(cat);
        setError('');
      })
      .catch(() => { if (!cancelled) setError('Impossible de charger les charges.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [type]);

  const activeCategories = categories.filter((c) => c.active);

  const categoryColors = useMemo(() => {
    const map = {};
    categories.forEach((c, i) => { map[c.name] = COLOR_PALETTE[i % COLOR_PALETTE.length]; });
    return map;
  }, [categories]);

  // --- Filtres : catégorie + période ---
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // --- Ajout ---
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // --- Modification / suppression (clic sur une ligne) ---
  const [selectedCharge, setSelectedCharge] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // --- Gestion des catégories ---
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);

const handleAdd = async () => {
  if (!form.categorie || !form.montant || !form.date) return;
  try {
const data = await request('/charges', { method: 'POST', body: JSON.stringify({ ...form, montant: Number(form.montant), type }) });
    setCharges((prev) => [...prev, data]);
    setForm(emptyForm);
    setShowForm(false);
  } catch { setError("Échec de l'ajout."); }
};

  const openRow = (charge) => {
    setSelectedCharge(charge);
    setEditForm({
      categorie: charge.categorie,
      montant: charge.montant,
      date: charge.date,
      description: charge.description,
    });
  };

  const closeRow = () => {
    setSelectedCharge(null);
    setEditForm(emptyForm);
  };

const handleSaveEdit = async () => {
  if (!editForm.categorie || !editForm.montant || !editForm.date) return;
  try {
const data = await request(`/charges/${selectedCharge.id}`, { method: 'PATCH', body: JSON.stringify({ ...editForm, montant: Number(editForm.montant), type }) });
    setCharges((prev) => prev.map((c) => (c.id === selectedCharge.id ? data : c)));
    closeRow();
  } catch { setError('Échec de la modification.'); }
};

  const askDelete = () => setConfirmDeleteId(selectedCharge.id);

const confirmDelete = async () => {
  try {
    await request(`/charges/${confirmDeleteId}`, { method: 'DELETE' });
    setCharges((prev) => prev.filter((c) => c.id !== confirmDeleteId));
    setConfirmDeleteId(null);
    closeRow();
  } catch { setError('Échec de la suppression.'); }
};

const handleAddCategory = async () => {
  const name = newCategory.trim();
  if (!name || categories.some((c) => c.name === name)) return;
  try {
    const data = await request('/charges/categories', { method: 'POST', body: JSON.stringify({ type, name }) });
    setCategories((prev) => [...prev, data]);
    setNewCategory('');
  } catch { setError("Échec de l'ajout de la catégorie."); }
};

const handleRenameCategory = async (oldName, newName) => {
  const name = newName.trim();
  const cat = categories.find((c) => c.name === oldName);
  if (!name || name === oldName || !cat) { setEditingCategory(null); return; }
  try {
    await request(`/charges/categories/${cat.id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, name } : c)));
    setCharges((prev) => prev.map((c) => (c.categorie === oldName ? { ...c, categorie: name } : c)));
  } catch { setError('Échec du renommage.'); }
  setEditingCategory(null);
};

const handleToggleCategory = async (name) => {
  const cat = categories.find((c) => c.name === name);
  if (!cat) return;
  try {
    await request(`/charges/categories/${cat.id}`, { method: 'PATCH', body: JSON.stringify({ active: !cat.active }) });
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, active: !c.active } : c)));
  } catch { setError('Échec de la mise à jour.'); }
};

  // --- Filtrage catégorie + période ---
  const filtered = useMemo(() => {
    return charges.filter((c) => {
      const matchSearch = !search || c.description.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || c.categorie === categoryFilter;
      const matchFrom = !dateFrom || c.date >= dateFrom;
      const matchTo = !dateTo || c.date <= dateTo;
      return matchSearch && matchCategory && matchFrom && matchTo;
    });
  }, [charges, search, categoryFilter, dateFrom, dateTo]);

  // Carte "Total des charges" : dépend de TOUS les filtres actifs
  // (catégorie + période + recherche).
  const totalFiltre = useMemo(
    () => filtered.reduce((s, c) => s + Number(c.montant || 0), 0),
    [filtered]
  );

  // Carte "Charges du mois" : toujours le mois en cours, mais respecte le
  // filtre de catégorie/recherche choisi (indépendante de la période choisie
  // dans les filtres, puisqu'elle répond à une question différente : "et ce
  // mois-ci ?").
    const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const chargesDuMois = useMemo(() => {
    return charges
      .filter((c) => c.date && c.date.slice(0, 7) === currentMonthKey)
      .filter((c) => !categoryFilter || c.categorie === categoryFilter)
      .filter((c) => !search || c.description.toLowerCase().includes(search.toLowerCase()))
      .reduce((s, c) => s + Number(c.montant || 0), 0);
  }, [charges, categoryFilter, search, currentMonthKey]);

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
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-400 text-xs mt-0.5">{charges.length} charge(s)</p>
        </div>
      </div>
{error && (
  <div className="mb-4 flex justify-between items-center text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
    {error}
    <button onClick={() => setError('')} className="font-bold text-red-400 hover:text-red-600">✕</button>
  </div>
)}

      {/* Cartes dynamiques */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3 bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] px-4 py-3 min-w-[220px]">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <Receipt size={16} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total des charges</p>
            <p className="text-sm font-bold text-[#0F2A4A]">{totalFiltre.toLocaleString('fr-DZ')} DA</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] px-4 py-3 min-w-[220px]">
          <div className="w-9 h-9 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[#0369A1]">
            <CalendarDays size={16} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Charges du mois</p>
            <p className="text-sm font-bold text-[#0F2A4A]">{chargesDuMois.toLocaleString('fr-DZ')} DA</p>
          </div>
        </div>

        <button
          onClick={() => setShowCategoryManager(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#0369A1] bg-white border border-[#E2E8F0] hover:bg-[#DCEBFA] px-4 py-2 rounded-full transition"
        >
          <Tag size={14} /> Catégories
        </button>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] hover:bg-[#c9e2f7] px-4 py-2 rounded-full transition"
        >
          <Plus size={14} /> Ajouter une charge
        </button>
      </div>

      {/* Modale d'ajout */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#0F2A4A]">Ajouter une charge</h3>
              <button onClick={() => setShowForm(false)} className="text-[#0369A1] hover:text-[#0F2A4A]">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 uppercase">Catégorie</label>
                <select
                  value={form.categorie}
                  onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
                >
                  <option value="">Sélectionner</option>
                  {activeCategories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 uppercase">Montant (DA)</label>
                <input
                  type="number"
                  value={form.montant}
                  onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 uppercase">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 uppercase">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 resize-none"
                  placeholder="Ex: Facture électricité juillet"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 text-xs font-medium text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100">
                Annuler
              </button>
              <button onClick={handleAdd} className="flex-1 px-4 py-2 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#0F2A4A]/90">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de modification / suppression — ouverte au clic sur une ligne */}
      {selectedCharge && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={closeRow}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#0F2A4A]">Modifier la charge</h3>
              <button onClick={closeRow} className="text-[#0369A1] hover:text-[#0F2A4A]">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 uppercase">Catégorie</label>
                <select
                  value={editForm.categorie}
                  onChange={(e) => setEditForm((f) => ({ ...f, categorie: e.target.value }))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
                >
                  {activeCategories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 uppercase">Montant (DA)</label>
                <input
                  type="number"
                  value={editForm.montant}
                  onChange={(e) => setEditForm((f) => ({ ...f, montant: e.target.value }))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 uppercase">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 uppercase">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={askDelete} className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                <Trash2 size={13} /> Supprimer
              </button>
              <button onClick={closeRow} className="flex-1 px-4 py-2 text-xs font-medium text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100">
                Annuler
              </button>
              <button onClick={handleSaveEdit} className="flex-1 px-4 py-2 text-xs font-medium text-white bg-[#0F2A4A] rounded-lg hover:bg-[#0F2A4A]/90">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation de suppression */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] px-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle size={16} />
              </div>
              <h3 className="text-sm font-bold text-[#0F2A4A]">Supprimer cette charge ?</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Cette action est irréversible. La dépense sera définitivement supprimée.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-2 text-xs font-medium text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100">
                Annuler
              </button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gestion des catégories */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setShowCategoryManager(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#0F2A4A]">Gérer les catégories</h3>
              <button onClick={() => setShowCategoryManager(false)} className="text-[#0369A1] hover:text-[#0F2A4A]">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-4">
              {categories.map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  {editingCategory?.old === c.name ? (
                    <input
                      autoFocus
                      value={editingCategory.value}
                      onChange={(e) => setEditingCategory({ old: c.name, value: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleRenameCategory(c.name, editingCategory.value)}
                      className="flex-1 px-2 py-1 text-xs rounded border border-[#0369A1]/40 focus:outline-none"
                    />
                  ) : (
                    <span className={`flex-1 text-xs ${c.active ? 'text-slate-700' : 'text-slate-300 line-through'}`}>
                      {c.name}
                    </span>
                  )}

                  {editingCategory?.old === c.name ? (
                    <button onClick={() => handleRenameCategory(c.name, editingCategory.value)} className="text-[10px] text-emerald-600 font-medium">
                      OK
                    </button>
                  ) : (
                    <button onClick={() => setEditingCategory({ old: c.name, value: c.name })} className="text-slate-300 hover:text-[#0369A1]">
                      <Pencil size={13} />
                    </button>
                  )}

                  <button
                    onClick={() => handleToggleCategory(c.name)}
                    className={`text-[10px] font-medium ${c.active ? 'text-red-500' : 'text-emerald-600'}`}
                  >
                    {c.active ? 'Désactiver' : 'Réactiver'}
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

      {/* Barre de filtres : catégorie + période */}
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
            {activeCategories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
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

        {(categoryFilter || dateFrom || dateTo) && (
          <button
            onClick={() => { setCategoryFilter(''); setDateFrom(''); setDateTo(''); }}
            className="text-[11px] text-[#0369A1] hover:underline"
          >
            Réinitialiser
          </button>
        )}

        <span className="text-[11px] text-slate-400 bg-[#F8FCFF] border border-[#E2E8F0] px-2.5 py-1 rounded-full">
          {filtered.length} / {charges.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden mb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-xs table-fixed">
            <colgroup>
              <col className="w-[20%]" />  {/* Catégorie */}
              <col className="w-[42%]" />  {/* Description */}
              <col className="w-[19%]" />  {/* Montant */}
              <col className="w-[19%]" />  {/* Date */}
            </colgroup>
            <thead className="bg-[#DCEBFA]">
              <tr>
                <th className="text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-l border-[#E2E8F0] whitespace-nowrap">Catégorie</th>
                <th className="text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0]">Description</th>
                <th className="text-right px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] whitespace-nowrap">Montant</th>
                <th className="text-right px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-r border-[#E2E8F0] whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400 bg-white">{loading ? 'Chargement…' : 'Aucune charge trouvée.'}</td>
                </tr>
              ) : filtered.map((c, idx) => {
                const colors = categoryColors[c.categorie] ?? { bg: 'bg-slate-50', text: 'text-slate-600' };
                return (
                  <tr
                    key={c.id}
                    onClick={() => openRow(c)}
                    className={`cursor-pointer hover:bg-[#DCEBFA]/30 transition ${idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}`}
                    title="Cliquer pour modifier ou supprimer"
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap border-b border-l border-[#E2E8F0]">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>{c.categorie}</span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-700 border-b border-[#E2E8F0]">{c.description}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-[#E2E8F0]">{Number(c.montant).toLocaleString('fr-DZ')} DA</td>
                    <td className="px-3 py-2.5 text-right text-slate-500 whitespace-nowrap border-b border-r border-[#E2E8F0]">{c.date ? new Date(c.date).toLocaleDateString('fr-DZ') : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Graphe mensuel */}
      <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] p-4 mb-5">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Dépenses par mois
        </p>
        <MonthlyChart data={monthlyTotals} />
      </div>
    </ComptableLayout>
  );
};

export default ChargesBase;