import { useState } from 'react';
import { X, Tag } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';
const AjouterValeurModal = ({ categorie, valeurs = [], onClose, onSuccess }) => {
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

    const handleSubmit = async () => {
    const trimmed = label.trim();
    if (!trimmed) { setError('Ce champ est requis.'); return; }
    const exists = valeurs.some(v => v.label.trim().toLowerCase() === trimmed.toLowerCase());
    if (exists) { setError('Cette valeur existe déjà.'); return; }
    setSubmitting(true); setError(null);
    try {
          const res = await fetch(`${API}/api/parametres`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ categorie, valeur: label.trim(), label: label.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Erreur serveur');
      onSuccess?.();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
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
              Ajouter une valeur
            </h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>
          {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 mx-5 mb-3 rounded-md">{error}</p>}
        </div>
        <div className="p-5 space-y-3">
          <div>
            <p className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">
  <Tag size={10} className="text-slate-500" />Libellé<span className="text-red-500 ml-0.5">*</span>
</p>
            <input value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} className={inp} autoFocus />
          </div>
          <div className="flex justify-end gap-2 pt-1">
  <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
  <button onClick={handleSubmit} disabled={submitting}
    className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] disabled:opacity-40 transition-all font-medium">
    {submitting ? 'Ajout...' : 'Ajouter'}
  </button>
</div>
        </div>
      </div>
    </div>
  );
};

export default AjouterValeurModal;