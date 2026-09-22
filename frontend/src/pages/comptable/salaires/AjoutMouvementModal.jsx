// AjoutMouvementModal.jsx
import { useRef } from 'react';
import { Wallet, Tag, FileText, Briefcase, Trash2, X, Plus, Camera, ZoomIn, Image as ImageIcon, Loader2 } from 'lucide-react';
import { MOUVEMENT_TYPES } from './EmployeModal';
const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';
const Label = ({ icon: Icon, text, required }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} />} {text}{required && <span className="text-red-500 ml-0.5">*</span>}
  </p>
);

const AjoutMouvementModal = ({
  show, postes = [], onClose, form, setForm, editingId, editingMouvement,
  confirm, setConfirm, formError, onRequestSave, onSave, onRequestDelete, onDelete,
  pendingBons = [], onFileChange, onRemovePendingBon, uploadingBon, onDeleteExistingBon,
  lightboxUrl, setLightboxUrl,
}) => {
  const fileInputRef = useRef(null);
  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
        <div className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0"><Wallet size={14} className="text-white" /></span>
                {editingId ? 'Modifier le mouvement' : 'Ajouter un mouvement'}
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
                <p className="text-xs">Supprimer ce mouvement ? Action irréversible.</p>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setConfirm(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                  <button onClick={onDelete} className="text-xs px-3 py-1.5 rounded-md text-white bg-red-500 hover:bg-red-600">Oui</button>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 space-y-3">
            <div>
              <Label icon={Tag} text="Type" required />
<select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inp}>
  {MOUVEMENT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
</select>
            </div>

            {postes.length > 1 && (
              <div>
                <Label icon={Briefcase} text="Salaire concerné" />
                <select value={form.posteId} onChange={(e) => setForm((f) => ({ ...f, posteId: e.target.value }))} className={inp}>
                  <option value="">Tous / non spécifié</option>
                  {postes.map((p) => <option key={p.id} value={p.id}>{p.poste}</option>)}
                </select>
              </div>
            )}

            <div>
              <Label icon={FileText} text="Description" required />
              <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inp} placeholder="Ex: Avance de septembre" />
            </div>

            <div>
              <Label icon={Wallet} text="Montant (DA)" required />
              <input type="number" value={form.montant} onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))} className={inp} />
            </div>

            {/* Bons (photos) — mock only pour l'instant. TODO API: brancher upload/delete réels
                comme uploadBon()/doDeleteBon() dans ChargesBase.jsx, sur des endpoints du style
                POST /api/comptable/salaires/mouvements/:id/bons et DELETE /.../bons/:bonId */}
            <div>
              <Label icon={ImageIcon} text="Bons (photos)" />
              <div className="flex flex-wrap gap-2">
                {editingId
                  ? (editingMouvement?.bons || []).map((b) => (
                      <div key={b.id} className="relative group">
                        <button type="button" onClick={() => setLightboxUrl(b.url)}>
                          <img src={b.url} alt="bon" className="w-14 h-14 rounded-md object-cover border border-slate-200 group-hover:opacity-80 transition" />
                          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <ZoomIn size={14} className="text-white drop-shadow" />
                          </span>
                        </button>
                        <button type="button" onClick={() => onDeleteExistingBon(b.id)} className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow text-slate-400 hover:text-red-500 transition">
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

export default AjoutMouvementModal;