import { useState } from 'react';
import { X, Tag, Check, CheckCircle2, AlertTriangle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';
const StatusToggle = ({ active, onChange }) => (
  <div className="flex items-center justify-between bg-white border border-slate-200 rounded px-2.5 py-1.5">
    <span className={`flex items-center gap-1.5 text-xs font-medium ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
      <CheckCircle2 size={13} />{active ? 'Actif' : 'Inactif'}
    </span>
    <button type="button" onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${active ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  </div>
);
const ModifierValeurModal = ({ valeur, valeurs = [], onClose, onSuccess }) => {
  const [label, setLabel] = useState(valeur.label);
  const [submitting, setSubmitting] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [error, setError] = useState(null);
  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const handleSave = async () => {
    const trimmed = label.trim();
    if (!trimmed) { setError('Ce champ est requis.'); return; }
    const exists = valeurs.some(v => v.id !== valeur.id && v.label.trim().toLowerCase() === trimmed.toLowerCase());
    if (exists) { setError('Cette valeur existe déjà.'); return; }
    setSubmitting(true); setError(null);
    try {
         const res = await fetch(`${API}/api/parametres/${valeur.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ label: label.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Erreur serveur');
      onSuccess?.();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleToggle = async () => {
    setSubmitting(true); setError(null);
    try {
      const action = valeur.actif ? 'desactiver' : 'reactiver';
      const res = await fetch(`${API}/api/parametres/${valeur.id}/${action}`, { method: 'PATCH', headers: headers() });
      if (!res.ok) throw new Error('Erreur serveur');
      onSuccess?.();
    } catch (err) { setError(err.message); setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
                <Tag size={14} className="text-white" />
              </span>
              Modifier la valeur
            </h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>
                    {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 mx-5 mb-3 rounded-md">{error}</p>}
          {confirmToggle && (
            <div className={`flex items-center justify-between gap-3 mx-5 mb-3 rounded-md p-3 ${valeur.actif ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <p className="text-xs flex items-center gap-1.5"><AlertTriangle size={13} /> {valeur.actif ? 'Désactiver cette valeur ?' : 'Réactiver cette valeur ?'}</p>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setConfirmToggle(false)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                <button onClick={handleToggle} disabled={submitting}
                  className={`text-xs px-3 py-1.5 rounded-md text-white disabled:opacity-40 ${valeur.actif ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                  {submitting ? '...' : 'Oui'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 space-y-3">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Libellé *</p>
            <input value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} className={inp} autoFocus />
          </div>

                     <div className="pt-1">
            <StatusToggle active={valeur.actif} onChange={() => setConfirmToggle(true)} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
  <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
  <button onClick={handleSave} disabled={submitting}
    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] disabled:opacity-40 transition-all font-medium">
    <Check size={11} /> {submitting ? 'Enregistrement...' : 'Enregistrer'}
  </button>
</div>
        </div>
      </div>
    </div>
  );
};

export default ModifierValeurModal;