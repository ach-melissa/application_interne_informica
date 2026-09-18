import { useState, useMemo, useEffect, useRef } from 'react';
import { Wallet, Plus, X, Calendar, Tag, Pencil, TrendingUp, Camera, ZoomIn, Image as ImageIcon, Loader2 } from 'lucide-react';
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
  const [editingEntry, setEditingEntry] = useState(null); // full row, so we can read/refresh its bons
  const [uploadingBon, setUploadingBon] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const fileInputRef = useRef(null);
  const [pendingBons, setPendingBons] = useState([]); // [{ file, preview }] staged before the revenu exists
  const [confirm, setConfirm] = useState(null); // 'save' | 'delete' | { type: 'delete-bon', bonId } | null
  const [formError, setFormError] = useState(null);

  const [categoryConfirm, setCategoryConfirm] = useState(null); // { name } | null
  const [categoryError, setCategoryError] = useState(null);
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

  const requestSave = () => {
    if (!form.libelle || !form.montant) {
      setFormError('Libellé et montant sont obligatoires.');
      return;
    }
    setFormError(null);
    if (editingId) {
      setConfirm('save');
    } else {
      doSave();
    }
  };

  const doSave = async () => {
    setConfirm(null);
    if (editingId) {
      const ok = await onEdit?.(editingId, form);
      if (!ok) { setFormError('Erreur lors de la modification.'); return; }
      setForm({ libelle: '', montant: '', date: '', categorie: categories[0] });
      setEditingId(null);
      setEditingEntry(null);
      setShowForm(false);
    } else {
      const created = await onAdd?.(form);
      if (!created) { setFormError('Erreur lors de la création.'); return; }
      // Stay open, flip into "edit" mode so the user can attach bons right away.
      setEditingId(created.id);
      setEditingEntry({ ...created, bons: created.bons || [] });

      // Upload any photos the user staged before the revenu existed.
      for (const { file } of pendingBons) {
        await uploadBon(created.id, file);
      }
      pendingBons.forEach((p) => URL.revokeObjectURL(p.preview));
      setPendingBons([]);
    }
  };

  const handleStartEdit = (entry) => {
    setForm({
      libelle: entry.libelle,
      montant: entry.montant,
      date: entry.date,
      categorie: entry.categorie,
    });
    setEditingId(entry.id);
    setEditingEntry(entry);
    setFormError(null);
    setConfirm(null);
    setShowForm(true);
  };

  const requestRemove = () => setConfirm('delete');

  const doRemove = async () => {
    setConfirm(null);
    const ok = await onRemove?.(editingId);
    if (!ok) { setFormError('Erreur lors de la suppression.'); return; }
    setEditingId(null);
    setEditingEntry(null);
    setShowForm(false);
  };
  const uploadBon = async (autreRevenuId, file) => {
    setUploadingBon(true);
    try {
      const formData = new FormData();
      formData.append('bon', file);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/comptable/autres-revenus/${autreRevenuId}/bons`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur upload');
      setEditingEntry((prev) => prev ? { ...prev, bons: [...(prev.bons || []), data] } : prev);
      onEdit?.(autreRevenuId, {}); // trigger parent refresh so the list stays in sync, no field change needed
    } catch (err) {
      setFormError(err.message);
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/comptable/autres-revenus/bons/${bonId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Erreur suppression');
      setEditingEntry((prev) => prev ? { ...prev, bons: (prev.bons || []).filter((b) => b.id !== bonId) } : prev);
    } catch (err) {
      setFormError(err.message);
    }
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
        setCategoryError(null);
      } else {
        setCategoryError("Erreur lors de l'ajout de la catégorie.");
      }
    } catch {
      setCategoryError('Erreur réseau.');
    }
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

  const requestRemoveCategory = (name) => setCategoryConfirm({ name });

  const doRemoveCategory = async () => {
    const name = categoryConfirm?.name;
    setCategoryConfirm(null);
    if (!name) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/comptable/autres-revenus/categories`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ nom: name }),
      });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c !== name));
        setCategoryError(null);
      } else {
        setCategoryError('Erreur lors de la suppression.');
      }
    } catch {
      setCategoryError('Erreur réseau.');
    }
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
          onClick={() => { setShowCategoryManager(true); setCategoryError(null); setCategoryConfirm(null); }}
          className="flex items-center gap-1.5 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] hover:bg-[#c9e2f7] px-3.5 py-2 rounded-md transition"
        >
          <Tag size={14} /> Catégories
        </button>
        <button
          onClick={() => { setEditingId(null); setForm({ libelle: '', montant: '', date: '', categorie: categories[0] }); setFormError(null); setConfirm(null); setShowForm(true); }}

          className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all"
        >
          <Plus size={14} /> Ajouter un revenu
        </button>
      </div>

      {/* Add / Edit modal — restyled to match AddUserModal.jsx */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={() => { setShowForm(false); setEditingEntry(null); setEditingId(null); setFormError(null); setConfirm(null); pendingBons.forEach((p) => URL.revokeObjectURL(p.preview)); setPendingBons([]); }}
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
                <button onClick={() => { setShowForm(false); setEditingEntry(null); setEditingId(null); setFormError(null); setConfirm(null); pendingBons.forEach((p) => URL.revokeObjectURL(p.preview)); setPendingBons([]); }} className="text-slate-300 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              {formError && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 mx-5 mb-3 rounded-md">{formError}</p>}
              {confirm === 'save' && (
                <div className="flex items-center justify-between gap-3 mx-5 mb-3 rounded-md p-3 bg-[#DCEBFA]/50 text-[#0369A1]">
                  <p className="text-xs">Confirmer la modification de cette ligne ?</p>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setConfirm(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                    <button onClick={doSave} className="text-xs px-3 py-1.5 rounded-md text-white bg-[#0F2A4A] hover:bg-[#16385f]">Oui</button>
                  </div>
                </div>
              )}
              {confirm === 'delete' && (
                <div className="flex items-center justify-between gap-3 mx-5 mb-3 rounded-md p-3 bg-red-50 text-red-600">
                  <p className="text-xs">Supprimer cette ligne de revenu ? Action irréversible.</p>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setConfirm(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                    <button onClick={doRemove} className="text-xs px-3 py-1.5 rounded-md text-white bg-red-500 hover:bg-red-600">Oui</button>
                  </div>
                </div>
              )}
              {confirm?.type === 'delete-bon' && (
                <div className="flex items-center justify-between gap-3 mx-5 mb-3 rounded-md p-3 bg-red-50 text-red-600">
                  <p className="text-xs">Supprimer cette photo de bon ?</p>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setConfirm(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                    <button onClick={() => doDeleteBon(confirm.bonId)} className="text-xs px-3 py-1.5 rounded-md text-white bg-red-500 hover:bg-red-600">Oui</button>
                  </div>
                </div>
              )}
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

              <div>
                <Label icon={ImageIcon} text="Bons (photos)" />
                <div className="flex flex-wrap gap-2">
                  {editingId
                    ? (editingEntry?.bons || []).map((b) => (
                        <div key={b.id} className="relative group">
                          <button type="button" onClick={() => setLightboxUrl(b.url)}>
                            <img src={b.url} alt="bon" className="w-14 h-14 rounded-md object-cover border border-slate-200 group-hover:opacity-80 transition" />
                            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                              <ZoomIn size={14} className="text-white drop-shadow" />
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDeleteBon(b.id)}
                            className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow text-slate-400 hover:text-red-500 transition"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))
                    : pendingBons.map((p, idx) => (
                        <div key={idx} className="relative group">
                          <button type="button" onClick={() => setLightboxUrl(p.preview)}>
                            <img src={p.preview} alt="bon" className="w-14 h-14 rounded-md object-cover border border-slate-200 group-hover:opacity-80 transition" />
                            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                              <ZoomIn size={14} className="text-white drop-shadow" />
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePendingBon(idx)}
                            className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow text-slate-400 hover:text-red-500 transition"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))
                  }
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingBon}
                    className="w-14 h-14 rounded-md border border-dashed border-slate-300 hover:border-[#0369A1]/50 flex items-center justify-center text-slate-400 hover:text-[#0369A1] transition disabled:opacity-40"
                  >
                    {uploadingBon ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {editingId && (
                  <button
                    onClick={requestRemove}
                    className="text-xs px-3 py-1.5 rounded-md text-red-600 bg-red-50 hover:bg-red-100 mr-auto font-medium"
                  >
                    Supprimer
                  </button>
                )}
                <button onClick={() => { setShowForm(false); setEditingEntry(null); setEditingId(null); setFormError(null); setConfirm(null); pendingBons.forEach((p) => URL.revokeObjectURL(p.preview)); setPendingBons([]); }} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">
                  Annuler
                </button>
                <button
                  onClick={requestSave}
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
          onClick={() => { setShowCategoryManager(false); setCategoryError(null); setCategoryConfirm(null); }}
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
                <button onClick={() => { setShowCategoryManager(false); setCategoryError(null); setCategoryConfirm(null); }} className="text-slate-300 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              {categoryError && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 mx-5 mb-3 rounded-md">{categoryError}</p>}
              {categoryConfirm && (
                <div className="flex items-center justify-between gap-3 mx-5 mb-3 rounded-md p-3 bg-red-50 text-red-600">
                  <p className="text-xs">Supprimer la catégorie "{categoryConfirm.name}" ?</p>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setCategoryConfirm(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                    <button onClick={doRemoveCategory} className="text-xs px-3 py-1.5 rounded-md text-white bg-red-500 hover:bg-red-600">Oui</button>
                  </div>
                </div>
              )}
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
                          <button onClick={() => requestRemoveCategory(c)} className="text-slate-400 hover:text-red-500">
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
    <th className="text-right px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A]">
      Date
    </th>
    <th className="text-right px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-r border-[#0F2A4A]">
      Bons
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
                    <td className="px-3 py-2.5 text-right text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">
  <span className="inline-flex items-center gap-1">
    <Calendar size={11} />
    {a.date ? new Date(a.date).toLocaleDateString('fr-DZ') : '—'}
  </span>
</td>
<td className="px-3 py-2.5 text-right whitespace-nowrap border-b border-r border-[#E2E8F0]">
  {(a.bons?.length ?? 0) === 0 ? (
    <span className="text-xs text-slate-300">—</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#DCEBFA] text-[#0369A1]">
      <ImageIcon size={11} />
      {a.bons.length}
    </span>
  )}
</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightboxUrl(null)} className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg text-slate-700 hover:text-red-400 transition z-10">
              <X size={16} />
            </button>
            <img src={lightboxUrl} alt="Bon" className="w-full rounded-md shadow-2xl object-contain max-h-[80vh]" />
          </div>
        </div>
      )}
    </>
  );
};

export default PaiementsAutre;