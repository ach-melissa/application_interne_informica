import { useState, useMemo, useEffect } from 'react';
import { Wallet, Plus, X, Calendar, Tag, Pencil, TrendingUp } from 'lucide-react';

const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';

const Label = ({ icon: Icon, text, required }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} className="text-slate-500" />}
    {text}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </p>
);

const PaiementsAutre = ({ autresRevenus = [], onAdd, onEdit, onRemove }) => {
  const [showForm, setShowForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [montantMin, setMontantMin] = useState('');
  const [montantMax, setMontantMax] = useState('');
  const [categories, setCategories] = useState([]);
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

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/comptable/autres-revenus/categories`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(async (r) => {
        if (!r.ok) {
          console.error('Erreur chargement catégories, statut HTTP:', r.status);
          return [];
        }
        return r.json();
      })
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.categories)
            ? data.categories
            : Array.isArray(data?.data)
              ? data.data
              : [];
        if (!Array.isArray(data) && list.length === 0) {
          console.warn('Réponse catégories inattendue:', data);
        }
        setCategories(list);
      })
      .catch((err) => console.error('Erreur réseau catégories:', err));
  }, []);

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

  const activeCount = (categoryFilter ? 1 : 0) + (dateDebut || dateFin ? 1 : 0) + (montantMin || montantMax ? 1 : 0);
  const clearAll = () => {
    setCategoryFilter('');
    setDateDebut('');
    setDateFin('');
    setMontantMin('');
    setMontantMax('');
  };

  const handleSave = async () => {
    if (!form.libelle || !form.montant) return;

    if (editingId) {
      if (!window.confirm('Confirmer la modification de cette ligne ?')) return;
      const ok = await onEdit?.(editingId, form);
      if (!ok) return;
    } else {
      const ok = await onAdd?.(form);
      if (!ok) return;
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

  const handleRemove = async (id) => {
    if (!window.confirm('Supprimer cette ligne de revenu ? Cette action est irréversible.')) return;
    const ok = await onRemove?.(id);
    if (!ok) return;
    setEditingId(null);
    setShowForm(false);
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name || categories.includes(name)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/comptable/autres-revenus/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ nom: name }),
      });
      if (res.ok) {
        setCategories((prev) => [...prev, name]);
        setNewCategory('');
      }
    } catch { /* silent */ }
  };

  const handleRenameCategory = async (oldName, newName) => {
    const name = newName.trim();
    if (!name || name === oldName) { setEditingCategory(null); return; }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/comptable/autres-revenus/categories`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ancien: oldName, nouveau: name }),
      });
      if (res.ok) {
        setCategories((prev) => prev.map((c) => (c === oldName ? name : c)));
        autresRevenus
          .filter((a) => a.categorie === oldName)
          .forEach((a) => onEdit?.(a.id, { categorie: name }));
      }
    } catch { /* silent */ }
    setEditingCategory(null);
  };

  const handleRemoveCategory = async (name) => {
    if (!window.confirm(`Supprimer la catégorie "${name}" ?`)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/comptable/autres-revenus/categories`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ nom: name }),
      });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c !== name));
      }
    } catch { /* silent */ }
  };

  return (
    <>
      {/* Card + filter + add button */}
     <div className="flex flex-wrap gap-3 mb-3">
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
               </div>

      <div className="flex flex-wrap gap-2 items-center mb-3">
        <div className="relative flex items-center">
          <Tag size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none z-10" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`appearance-none pl-8 pr-7 py-1.5 text-xs rounded-full bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer min-w-[200px]
              ${categoryFilter ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {categoryFilter && (
            <button onClick={() => setCategoryFilter('')} className="absolute right-2 text-slate-300 hover:text-red-400">
              <X size={11} />
            </button>
          )}
        </div>

        <div className="w-px h-5 bg-[#E2E8F0]" />

        <div className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] rounded-full pl-3 pr-1.5 py-1.5">
          <Calendar size={13} className="text-[#0369A1]" />
          <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="text-xs text-slate-500 focus:outline-none bg-transparent w-[110px]" />
          <span className="text-slate-300 text-xs">→</span>
          <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="text-xs text-slate-500 focus:outline-none bg-transparent w-[110px]" />
        </div>

        <div className="w-px h-5 bg-[#E2E8F0]" />

        <div className="flex items-center gap-1 bg-white rounded-full border border-[#E2E8F0] px-3 py-1.5 text-xs text-slate-500">
          <input type="number" placeholder="Min DA" value={montantMin} onChange={(e) => setMontantMin(e.target.value)} className="w-16 outline-none text-xs bg-transparent" />
          <span className="text-slate-300">–</span>
          <input type="number" placeholder="Max DA" value={montantMax} onChange={(e) => setMontantMax(e.target.value)} className="w-16 outline-none text-xs bg-transparent" />
        </div>

        {activeCount > 0 && (
          <button onClick={clearAll} className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
            <X size={11} /> Tout effacer
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-end mb-5">
        <button
          onClick={() => setShowCategoryManager(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] hover:bg-[#c9e2f7] px-3.5 py-2 rounded-md transition"
        >
          <Tag size={14} /> Catégories
        </button>
        <button
          onClick={() => { setEditingId(null); setForm({ libelle: '', montant: '', date: '', categorie: categories[0] }); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all"
        >
          <Plus size={14} /> Ajouter un revenu
        </button>
      </div>

      {/* Add / Edit modal — restyled to match AddUserModal.jsx */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => setShowForm(false)}
        >
          <div className="bg-white rounded-md shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
                    <Wallet size={14} className="text-white" />
                  </span>
                  {editingId ? 'Modifier le revenu' : 'Ajouter un revenu'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-slate-300 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label icon={Tag} text="Libellé" required />
                  <input
                    type="text"
                    value={form.libelle}
                    onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))}
                    className={inp}
                    placeholder="Ex: Location salle informatique"
                  />
                </div>
                <div>
                  <Label icon={Tag} text="Catégorie" />
                  <select
                    value={form.categorie}
                    onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
                    className={inp}
                  >
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label icon={Wallet} text="Montant (DA)" required />
                  <input
                    type="number"
                    value={form.montant}
                    onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                    className={inp}
                  />
                </div>
                <div className="col-span-2">
                  <Label icon={Calendar} text="Date" />
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className={inp}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {editingId && (
                  <button
                    onClick={() => handleRemove(editingId)}
                    className="text-xs px-3 py-1.5 rounded-md text-red-600 bg-red-50 hover:bg-red-100 mr-auto font-medium"
                  >
                    Supprimer
                  </button>
                )}
                <button onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white hover:bg-[#16385f] font-medium flex items-center gap-1"
                >
                  <Plus size={12} />
                  {editingId ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category manager modal — restyled to match AddUserModal.jsx */}
      {showCategoryManager && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => setShowCategoryManager(false)}
        >
          <div className="bg-white rounded-md shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
                    <Tag size={14} className="text-white" />
                  </span>
                  Gérer les catégories
                </h2>
                <button onClick={() => setShowCategoryManager(false)} className="text-slate-300 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {categories.map((c) => (
                  <div key={c} className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2.5 py-1.5">
                    {editingCategory?.old === c ? (
                      <input
                        autoFocus
                        value={editingCategory.value}
                        onChange={(e) => setEditingCategory({ old: c, value: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameCategory(c, editingCategory.value)}
                        className={`${inp} flex-1`}
                      />
                    ) : (
                      <span className="flex-1 text-xs text-slate-700 font-medium">{c}</span>
                    )}

                    {editingCategory?.old === c ? (
                      <button onClick={() => handleRenameCategory(c, editingCategory.value)} className="text-[10px] text-emerald-600 font-medium">
                        OK
                      </button>
                    ) : (
                      <>
                        <button onClick={() => setEditingCategory({ old: c, value: c })} className="text-slate-400 hover:text-[#0369A1]">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleRemoveCategory(c)} className="text-slate-400 hover:text-red-500">
                          <X size={13} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <Label icon={Plus} text="Nouvelle catégorie" />
                <div className="flex gap-2">
                  <input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="Nom de la catégorie"
                    className={inp}
                  />
                  <button onClick={handleAddCategory} className="px-3 py-1.5 text-xs font-medium text-white bg-[#0F2A4A] rounded-md hover:bg-[#16385f] shrink-0">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          Aucun revenu autre enregistré pour le moment.
        </div>
      ) : (
        <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[#0F2A4A]">
              <tr>
                <th className="text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-l border-[#0F2A4A]">
                  Catégorie
                </th>
                <th className="text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A]">
                  Description
                </th>
                <th className="text-right px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A]">
                  Montant
                </th>
                <th className="text-right px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-r border-[#0F2A4A]">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, idx) => {
                const colors = { bg: 'bg-[#DCEBFA]', text: 'text-[#0369A1]' };
                return (
                  <tr
                    key={a.id}
                    onClick={() => handleStartEdit(a)}
                    className={`cursor-pointer hover:bg-slate-50/60 transition ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
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