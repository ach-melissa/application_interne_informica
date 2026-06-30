import { useState } from 'react';
import { X, BookOpen, DollarSign, Clock, FileText } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

const inp = 'w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';
const Label = ({ icon: Icon, text }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} />}{text}
  </p>
);

const AddFormationModal = ({ onClose, onSuccess, formation = null }) => {
const isEdit = !!formation;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
const [form, setForm] = useState({
  nom: formation?.nom || '',
  prix: formation?.prix ?? '',
  heures: formation?.heures ?? '',
  description: formation?.description || '',
});
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.nom.trim() || !form.prix || !form.heures) {
      setError('Nom, prix et heures sont obligatoires.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
const res = await fetch(
  isEdit ? `${API}/api/formations/${formation.id}` : `${API}/api/formations`,
  {
    method: isEdit ? 'PATCH' : 'POST',
    headers: getHeaders(),
    body: JSON.stringify(form),
  }
);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess?.(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-blue-50 sticky top-0 bg-white z-10">
<h2 className="text-sm font-semibold text-slate-800">{isEdit ? 'Modifier la formation' : 'Ajouter une formation'}</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          {/* Formation info */}
          <div className="bg-blue-50/40 rounded-xl border border-blue-100 p-4 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label icon={BookOpen} text="Nom de la formation *" />
              <input value={form.nom} onChange={set('nom')} className={inp} placeholder="Ex: Anglais débutant" />
            </div>
            <div>
              <Label icon={DollarSign} text="Prix (DA) *" />
              <input type="number" min="0" step="0.01" value={form.prix} onChange={set('prix')} className={inp} placeholder="0" />
            </div>
            <div>
              <Label icon={Clock} text="Heures *" />
              <input type="number" min="1" value={form.heures} onChange={set('heures')} className={inp} placeholder="0" />
            </div>
            <div className="col-span-2">
              <Label icon={FileText} text="Description" />
              <textarea value={form.description} onChange={set('description')} rows={3} className={`${inp} resize-none`} placeholder="Optionnel" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">Annuler</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 font-medium">
              {submitting ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddFormationModal;