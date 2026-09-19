// ChargesModals.jsx
import { useRef } from 'react';
import { Receipt, Tag, Wallet, Calendar, FileText, Trash2, Pencil, X, Plus, GraduationCap, Users, Camera, ZoomIn, Image as ImageIcon, Loader2 } from 'lucide-react';

const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';
const Label = ({ icon: Icon, text, required }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} />} {text}{required && <span className="text-red-500 ml-0.5">*</span>}
  </p>
);

export const ChargeFormModal = ({
  show, type, formations = [], onClose, activeCategories, form, setForm, editingId, editingCharge,
  confirm, setConfirm, formError, onRequestSave, onSave, onRequestDelete, onDelete,
  pendingBons, onFileChange, onRemovePendingBon, uploadingBon, onRequestDeleteBon, onDeleteBon,
  lightboxUrl, setLightboxUrl,
}) => {
  const fileInputRef = useRef(null);
  if (!show) return null;
  const groupesDisponibles = formations.find((f) => f.id === form.formation_id)?.groupes ?? [];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
        <div className="bg-white rounded-md shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
                  <Receipt size={14} className="text-white" />
                </span>
                {editingId ? 'Modifier la charge' : 'Ajouter une charge'}
              </h2>
              <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
            </div>
            {formError && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 mx-5 mb-3 rounded-md">{formError}</p>}
            {confirm === 'save' && (
              <div className="flex items-center justify-between gap-3 mx-5 mb-3 rounded-md p-3 bg-[#DCEBFA]/50 text-[#0369A1]">
                <p className="text-xs">Confirmer la modification ?</p>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setConfirm(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                  <button onClick={onSave} className="text-xs px-3 py-1.5 rounded-md text-white bg-[#0F2A4A] hover:bg-[#16385f]">Oui</button>
                </div>
              </div>
            )}
            {confirm === 'delete' && (
              <div className="flex items-center justify-between gap-3 mx-5 mb-3 rounded-md p-3 bg-red-50 text-red-600">
                <p className="text-xs">Supprimer cette charge ? Action irréversible.</p>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setConfirm(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                  <button onClick={onDelete} className="text-xs px-3 py-1.5 rounded-md text-white bg-red-500 hover:bg-red-600">Oui</button>
                </div>
              </div>
            )}
            {confirm?.type === 'delete-bon' && (
              <div className="flex items-center justify-between gap-3 mx-5 mb-3 rounded-md p-3 bg-red-50 text-red-600">
                <p className="text-xs">Supprimer cette photo de bon ?</p>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setConfirm(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                  <button onClick={() => onDeleteBon(confirm.bonId)} className="text-xs px-3 py-1.5 rounded-md text-white bg-red-500 hover:bg-red-600">Oui</button>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 space-y-3">
            <div>
              <Label icon={Tag} text="Catégorie" required />
              <select value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))} className={inp}>
                <option value="">Sélectionner</option>
                {activeCategories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {type === 'formation' && (
              <>
                <div>
                  <Label icon={GraduationCap} text="Formation" required />
                  <select value={form.formation_id} onChange={(e) => setForm((f) => ({ ...f, formation_id: e.target.value, group_id: '' }))} className={inp}>
                    <option value="">Sélectionner</option>
                    {formations.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
                <div>
                  <Label icon={Users} text="Groupe" />
                  <select value={form.group_id} onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))} disabled={!form.formation_id} className={`${inp} disabled:bg-slate-50 disabled:text-slate-400`}>
                    <option value="">{form.formation_id ? 'Aucun groupe' : "Choisir une formation d'abord"}</option>
                    {groupesDisponibles.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
                  </select>
                </div>
              </>
            )}

            <div>
              <Label icon={Wallet} text="Montant (DA)" required />
              <input type="number" value={form.montant} onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))} className={inp} />
            </div>
            <div>
              <Label icon={Calendar} text="Date" required />
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inp} />
            </div>
            <div>
              <Label icon={FileText} text="Description" />
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className={`${inp} resize-none`} placeholder="Ex: Facture électricité juillet" />
            </div>

            <div>
              <Label icon={ImageIcon} text="Bons (photos)" />
              <div className="flex flex-wrap gap-2">
                {editingId
                  ? (editingCharge?.bons || []).map((b) => (
                      <div key={b.id} className="relative group">
                        <button type="button" onClick={() => setLightboxUrl(b.url)}>
                          <img src={b.url} alt="bon" className="w-14 h-14 rounded-md object-cover border border-slate-200 group-hover:opacity-80 transition" />
                          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <ZoomIn size={14} className="text-white drop-shadow" />
                          </span>
                        </button>
                        <button type="button" onClick={() => onRequestDeleteBon(b.id)} className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow text-slate-400 hover:text-red-500 transition">
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
                        <button type="button" onClick={() => onRemovePendingBon(idx)} className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow text-slate-400 hover:text-red-500 transition">
                          <X size={11} />
                        </button>
                      </div>
                    ))
                }
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingBon}
                  className="w-14 h-14 rounded-md border border-dashed border-slate-300 hover:border-[#0369A1]/50 flex items-center justify-center text-slate-400 hover:text-[#0369A1] transition disabled:opacity-40">
                  {uploadingBon ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              {editingId && (
                <button onClick={onRequestDelete} className="text-xs px-3 py-1.5 rounded-md text-red-600 bg-red-50 hover:bg-red-100 mr-auto font-medium flex items-center gap-1">
                  <Trash2 size={12} /> Supprimer
                </button>
              )}
              <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
              <button onClick={onRequestSave} className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white hover:bg-[#16385f] font-medium flex items-center gap-1">
                <Plus size={12} /> {editingId ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      </div>

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

export const CategoryManagerModal = ({
  show, onClose, categories, editingCategory, setEditingCategory,
  onRename, onToggle, newCategory, setNewCategory, onAdd, categoryError,
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-md shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0"><Tag size={14} className="text-white" /></span>
              Gérer les catégories
            </h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>
          {categoryError && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 mx-5 mb-3 rounded-md">{categoryError}</p>}
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {categories.map((c) => (
              <div key={c.name} className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2.5 py-1.5">
                {editingCategory?.old === c.name ? (
                  <input autoFocus value={editingCategory.value}
                    onChange={(e) => setEditingCategory({ old: c.name, value: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && onRename(c.name, editingCategory.value)}
                    className={`${inp} flex-1`} />
                ) : (
                  <span className={`flex-1 text-xs ${c.active ? 'text-slate-700 font-medium' : 'text-slate-300 line-through'}`}>{c.name}</span>
                )}
                {editingCategory?.old === c.name ? (
                  <button onClick={() => onRename(c.name, editingCategory.value)} className="text-[10px] text-emerald-600 font-medium">OK</button>
                ) : (
                  <button onClick={() => setEditingCategory({ old: c.name, value: c.name })} className="text-slate-400 hover:text-[#0369A1]"><Pencil size={12} /></button>
                )}
                <button onClick={() => onToggle(c.name)} className={`text-[10px] font-medium ${c.active ? 'text-red-500' : 'text-emerald-600'}`}>
                  {c.active ? 'Désactiver' : 'Réactiver'}
                </button>
              </div>
            ))}
          </div>
          <div>
            <Label icon={Plus} text="Nouvelle catégorie" />
            <div className="flex gap-2">
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onAdd()} placeholder="Nom" className={inp} />
              <button onClick={onAdd} className="px-3 py-1.5 text-xs font-medium text-white bg-[#0F2A4A] rounded-md hover:bg-[#16385f] shrink-0"><Plus size={14} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};