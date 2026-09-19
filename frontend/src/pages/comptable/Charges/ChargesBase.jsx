import { useState, useMemo, useEffect } from 'react';
import { Search, Tag, Calendar, Plus, Receipt, CalendarDays, X, GraduationCap } from 'lucide-react';
import { ChargeFormModal, CategoryManagerModal } from './ChargesModals';

const API = import.meta.env.VITE_API_URL;
const request = async (path, options = {}) => {
  const res = await fetch(`${API}/api/comptable${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  if (!res.ok) { const { error } = await res.json().catch(() => ({})); throw new Error(error || 'Erreur serveur.'); }
  return res.status === 204 ? null : res.json().catch(() => null);
};
const requestForm = async (path, formData) => {
  const res = await fetch(`${API}/api/comptable${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: formData,
  });
  if (!res.ok) { const { error } = await res.json().catch(() => ({})); throw new Error(error || 'Erreur serveur.'); }
  return res.json().catch(() => null);
};

const COLOR_PALETTE = [
  { bg: 'bg-sky-50', text: 'text-sky-700' }, { bg: 'bg-amber-50', text: 'text-amber-700' },
  { bg: 'bg-violet-50', text: 'text-violet-700' }, { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { bg: 'bg-rose-50', text: 'text-rose-700' }, { bg: 'bg-cyan-50', text: 'text-cyan-700' },
];
const emptyForm = { categorie: '', montant: '', date: '', description: '', formation_id: '', group_id: '' };

const ChargesBase = ({ type }) => {
  const [charges, setCharges] = useState([]);
  const [categories, setCategories] = useState([]);
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [formationFilter, setFormationFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editingCharge, setEditingCharge] = useState(null); // full row, for bons
  const [confirm, setConfirm] = useState(null);
  const [formError, setFormError] = useState(null);

  const [pendingBons, setPendingBons] = useState([]); // [{ file, preview }] staged before charge exists
  const [uploadingBon, setUploadingBon] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryError, setCategoryError] = useState(null);
  const [categoryConfirm, setCategoryConfirm] = useState(null); // { id, name } | null
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setFormationFilter('');
    Promise.all([request(`/charges?type=${type}`), request(`/charges/categories?type=${type}`)])
      .then(([c, cat]) => { if (!cancelled) { setCharges(c); setCategories(cat); setError(''); } })
      .catch(() => !cancelled && setError('Impossible de charger les charges.'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [type]);

  useEffect(() => {
    if (type !== 'formation') return;
    request('/charges/formations').then(setFormations).catch(() => setError('Impossible de charger les formations.'));
  }, [type]);

  const activeCategories = categories.filter((c) => c.active);
  const categoryColors = useMemo(() => {
    const map = {};
    categories.forEach((c, i) => { map[c.name] = COLOR_PALETTE[i % COLOR_PALETTE.length]; });
    return map;
  }, [categories]);

  const openAdd = () => {
    setEditingId(null); setEditingCharge(null); setForm(emptyForm);
    setFormError(null); setConfirm(null); setPendingBons([]);
    setShowForm(true);
  };
  const openEdit = (c) => {
    setEditingId(c.id); setEditingCharge(c);
    setForm({ categorie: c.categorie, montant: c.montant, date: c.date, description: c.description, formation_id: c.formation_id ?? '', group_id: c.group_id ?? '' });
    setFormError(null); setConfirm(null); setPendingBons([]);
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false); setEditingId(null); setEditingCharge(null);
    setFormError(null); setConfirm(null);
    pendingBons.forEach((p) => URL.revokeObjectURL(p.preview));
    setPendingBons([]);
  };

  const requestSave = () => {
    if (!form.categorie || !form.montant || !form.date) { setFormError('Catégorie, montant et date sont obligatoires.'); return; }
    if (type === 'formation' && !form.formation_id) { setFormError('La formation est obligatoire.'); return; }
    setFormError(null);
    editingId ? setConfirm('save') : doSave();
  };

  const doSave = async () => {
    setConfirm(null);
    try {
      const body = JSON.stringify({ ...form, montant: Number(form.montant), type });
      if (editingId) {
        const data = await request(`/charges/${editingId}`, { method: 'PATCH', body });
        setCharges((prev) => prev.map((c) => (c.id === editingId ? data : c)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
        closeForm();
      } else {
        const created = await request('/charges', { method: 'POST', body });
        setCharges((prev) => [...prev, created].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
        // Stay open, flip into edit mode so bons can be attached right away.
        setEditingId(created.id);
        setEditingCharge({ ...created, bons: created.bons || [] });

        for (const { file } of pendingBons) {
          await uploadBon(created.id, file);
        }
        pendingBons.forEach((p) => URL.revokeObjectURL(p.preview));
        setPendingBons([]);
      }
    } catch (err) { setFormError(err.message || "Échec de l'enregistrement."); }
  };

  const requestDelete = () => setConfirm('delete');
  const doDelete = async () => {
    try {
      await request(`/charges/${editingId}`, { method: 'DELETE' });
      setCharges((prev) => prev.filter((c) => c.id !== editingId));
      closeForm();
    } catch (err) { setFormError(err.message || 'Échec de la suppression.'); }
  };

  const uploadBon = async (chargeId, file) => {
    setUploadingBon(true);
    try {
      const formData = new FormData();
      formData.append('bon', file);
      const data = await requestForm(`/charges/${chargeId}/bons`, formData);
      setEditingCharge((prev) => prev ? { ...prev, bons: [...(prev.bons || []), data] } : prev);
      setCharges((prev) => prev.map((c) => c.id === chargeId ? { ...c, bons: [...(c.bons || []), data] } : c));
    } catch (err) {
      setFormError(err.message || "Échec de l'upload.");
    } finally {
      setUploadingBon(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (editingId) {
      uploadBon(editingId, file);
    } else {
      setPendingBons((prev) => [...prev, { file, preview: URL.createObjectURL(file) }]);
    }
    e.target.value = '';
  };

  const handleRemovePendingBon = (idx) => {
    setPendingBons((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const requestDeleteBon = (bonId) => setConfirm({ type: 'delete-bon', bonId });
  const doDeleteBon = async (bonId) => {
    setConfirm(null);
    try {
      await request(`/charges/bons/${bonId}`, { method: 'DELETE' });
      setEditingCharge((prev) => prev ? { ...prev, bons: (prev.bons || []).filter((b) => b.id !== bonId) } : prev);
      setCharges((prev) => prev.map((c) => c.id === editingId ? { ...c, bons: (c.bons || []).filter((b) => b.id !== bonId) } : c));
    } catch (err) {
      setFormError(err.message || 'Échec de la suppression du bon.');
    }
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name || categories.some((c) => c.name === name)) return;
    try {
      const data = await request('/charges/categories', { method: 'POST', body: JSON.stringify({ type, name }) });
      setCategories((prev) => [...prev, data]);
      setNewCategory('');
      setCategoryError(null);
    } catch (err) { setCategoryError(err.message || "Échec de l'ajout de la catégorie."); }
  };

  const handleRenameCategory = async (oldName, newName) => {
    const name = newName.trim();
    const cat = categories.find((c) => c.name === oldName);
    if (!name || name === oldName || !cat) { setEditingCategory(null); return; }
    try {
      await request(`/charges/categories/${cat.id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, name } : c)));
      setCharges((prev) => prev.map((c) => (c.categorie === oldName ? { ...c, categorie: name } : c)));
      setCategoryError(null);
    } catch (err) { setCategoryError(err.message || 'Échec du renommage.'); }
    setEditingCategory(null);
  };

  const requestRemoveCategory = (name) => {
    const cat = categories.find((c) => c.name === name);
    if (!cat) return;
    setCategoryConfirm({ id: cat.id, name: cat.name });
  };

  const doRemoveCategory = async () => {
    if (!categoryConfirm) return;
    const { id, name } = categoryConfirm;
    setCategoryConfirm(null);
    try {
      await request(`/charges/categories/${id}`, { method: 'DELETE' });
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setCategoryError(null);
    } catch (err) {
      setCategoryError(err.message || 'Échec de la suppression.');
    }
  };

  const filtered = useMemo(() => charges.filter((c) => {
    const matchSearch = !search || c.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || c.categorie === categoryFilter;
    const matchFrom = !dateFrom || c.date >= dateFrom;
    const matchTo = !dateTo || c.date <= dateTo;
    const matchFormation = !formationFilter || c.formation_id === formationFilter;
    return matchSearch && matchCategory && matchFrom && matchTo && matchFormation;
  }), [charges, search, categoryFilter, dateFrom, dateTo, formationFilter]);

  const totalFiltre = useMemo(() => filtered.reduce((s, c) => s + Number(c.montant || 0), 0), [filtered]);
  const currentMonthKey = useMemo(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }, []);
  const chargesDuMois = useMemo(() => charges
    .filter((c) => c.date?.slice(0, 7) === currentMonthKey)
    .filter((c) => !categoryFilter || c.categorie === categoryFilter)
    .filter((c) => !formationFilter || c.formation_id === formationFilter)
    .filter((c) => !search || c.description.toLowerCase().includes(search.toLowerCase()))
    .reduce((s, c) => s + Number(c.montant || 0), 0), [charges, categoryFilter, formationFilter, search, currentMonthKey]);

  const activeFilterCount = (search ? 1 : 0) + (categoryFilter ? 1 : 0) + (formationFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0);
  const clearFilters = () => { setSearch(''); setCategoryFilter(''); setFormationFilter(''); setDateFrom(''); setDateTo(''); };

  const isFormation = type === 'formation';
  const headers = isFormation
    ? ['Catégorie', 'Formation', 'Groupe', 'Description', 'Bons', 'Montant', 'Date']
    : ['Catégorie', 'Description', 'Bons', 'Montant', 'Date'];

  return (
    <>
      {error && (
        <div className="mb-4 flex justify-between items-center text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}<button onClick={() => setError('')} className="font-bold text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-3">
        <div className="flex items-center gap-3 bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] px-4 py-3 min-w-[220px]">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600"><Receipt size={16} /></div>
          <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Total des charges</p><p className="text-sm font-bold text-[#0F2A4A]">{totalFiltre.toLocaleString('fr-DZ')} DA</p></div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] px-4 py-3 min-w-[220px]">
          <div className="w-9 h-9 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[#0369A1]"><CalendarDays size={16} /></div>
          <div><p className="text-[10px] text-slate-400 uppercase tracking-wide">Charges du mois</p><p className="text-sm font-bold text-[#0F2A4A]">{chargesDuMois.toLocaleString('fr-DZ')} DA</p></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center mb-3">
        <div className="relative min-w-[200px] flex-1 max-w-[240px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input type="text" placeholder="Description…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
        </div>

        <div className="w-px h-5 bg-[#E2E8F0]" />
        <div className="relative flex items-center">
          <Tag size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none z-10" />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className={`appearance-none pl-8 pr-7 py-1.5 text-xs rounded-full bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer min-w-[200px] ${categoryFilter ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}>
            <option value="">Toutes les catégories</option>
            {activeCategories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          {categoryFilter && (
            <button onClick={() => setCategoryFilter('')} className="absolute right-2 text-slate-300 hover:text-red-400"><X size={11} /></button>
          )}
        </div>

        {isFormation && (
          <>
            <div className="w-px h-5 bg-[#E2E8F0]" />
            <div className="relative flex items-center">
              <GraduationCap size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none z-10" />
              <select value={formationFilter} onChange={(e) => setFormationFilter(e.target.value)}
                className={`appearance-none pl-8 pr-7 py-1.5 text-xs rounded-full bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer min-w-[200px] ${formationFilter ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}>
                <option value="">Toutes les formations</option>
                {formations.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
              {formationFilter && (
                <button onClick={() => setFormationFilter('')} className="absolute right-2 text-slate-300 hover:text-red-400"><X size={11} /></button>
              )}
            </div>
          </>
        )}

        <div className="w-px h-5 bg-[#E2E8F0]" />
        <div className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] rounded-full pl-3 pr-1.5 py-1.5">
          <Calendar size={13} className="text-[#0369A1]" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-xs text-slate-500 focus:outline-none bg-transparent w-[110px]" />
          <span className="text-slate-300 text-xs">→</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-xs text-slate-500 focus:outline-none bg-transparent w-[110px]" />
        </div>

        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
            <X size={11} /> Tout effacer
          </button>
        )}
        <span className="text-[11px] text-slate-400 bg-[#F8FCFF] border border-[#E2E8F0] px-2.5 py-1 rounded-full">{filtered.length} / {charges.length}</span>
      </div>

      <div className="flex flex-wrap gap-2 justify-end mb-5">
        <button onClick={() => { setShowCategoryManager(true); setCategoryError(null); setEditingCategory(null); }} className="flex items-center gap-1.5 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] hover:bg-[#c9e2f7] px-3.5 py-2 rounded-md transition">
          <Tag size={14} /> Catégories
        </button>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all">
          <Plus size={14} /> Ajouter une charge
        </button>
      </div>

      <ChargeFormModal
        show={showForm} type={type} formations={formations} onClose={closeForm} activeCategories={activeCategories}
        form={form} setForm={setForm} editingId={editingId} editingCharge={editingCharge}
        confirm={confirm} setConfirm={setConfirm} formError={formError}
        onRequestSave={requestSave} onSave={doSave} onRequestDelete={requestDelete} onDelete={doDelete}
        pendingBons={pendingBons} onFileChange={handleFileChange} onRemovePendingBon={handleRemovePendingBon}
        uploadingBon={uploadingBon} onRequestDeleteBon={requestDeleteBon} onDeleteBon={doDeleteBon}
        lightboxUrl={lightboxUrl} setLightboxUrl={setLightboxUrl}
      />
      <CategoryManagerModal
        show={showCategoryManager} onClose={() => { setShowCategoryManager(false); setCategoryConfirm(null); }}
        categories={categories} editingCategory={editingCategory} setEditingCategory={setEditingCategory}
        onRename={handleRenameCategory} onToggle={handleToggleCategory}
        newCategory={newCategory} setNewCategory={setNewCategory} onAdd={handleAddCategory}
        categoryError={categoryError}
        categoryConfirm={categoryConfirm} onRequestRemove={requestRemoveCategory} onConfirmRemove={doRemoveCategory} onCancelRemove={() => setCategoryConfirm(null)}
      />

      <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden mb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#0F2A4A]">
              <tr>
                {headers.map((h, i) => (
                  <th key={h} className={`${i >= headers.length - 2 ? 'text-right' : 'text-left'} px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] ${i === 0 ? 'border-l' : ''} ${i === headers.length - 1 ? 'border-r' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={headers.length} className="text-center py-10 text-slate-400 bg-white">{loading ? 'Chargement…' : 'Aucune charge trouvée.'}</td></tr>
              ) : filtered.map((c, idx) => (
                <tr key={c.id} onClick={() => openEdit(c)} className={`cursor-pointer hover:bg-slate-50/60 transition ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                  <td className="px-3 py-2.5 whitespace-nowrap border-b border-l border-[#E2E8F0]">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#DCEBFA] text-[#0369A1]">{c.categorie}</span>
                  </td>
                  {isFormation && (
                    <>
                      <td className="px-3 py-2.5 font-medium text-slate-700 border-b border-[#E2E8F0]">{c.formation?.nom || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500 border-b border-[#E2E8F0]">{c.groupe?.nom || '—'}</td>
                    </>
                  )}
                  <td className="px-3 py-2.5 font-medium text-slate-700 border-b border-[#E2E8F0]">{c.description}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap border-b border-[#E2E8F0]">
                    {(c.bons?.length ?? 0) === 0 ? (
                      <span className="text-xs text-slate-300">—</span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#DCEBFA] text-[#0369A1]">{c.bons.length}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-[#E2E8F0]">{Number(c.montant).toLocaleString('fr-DZ')} DA</td>
                  <td className="px-3 py-2.5 text-right text-slate-500 whitespace-nowrap border-b border-r border-[#E2E8F0]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} />
                      {c.date ? new Date(c.date).toLocaleDateString('fr-DZ') : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ChargesBase;