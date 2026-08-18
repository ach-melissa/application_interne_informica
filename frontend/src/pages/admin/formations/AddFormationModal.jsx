import { useState, useEffect } from 'react';
import { X, BookOpen, DollarSign, Clock, FileText, Users } from 'lucide-react';
const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

const inp = 'w-full bg-[#F8FAFC] border border-transparent rounded-lg px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors';
const Label = ({ icon: Icon, text }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} className="text-[#0369A1]" />}{text}
  </p>
);
const Section = ({ children }) => (
  <div className="p-2 grid grid-cols-2 gap-3">{children}</div>
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
  capacite_groupe: formation?.capacite_groupe ?? '',
});
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const [periods, setPeriods] = useState([]);

  useEffect(() => {
    if (isEdit) {
      fetch(`${API}/api/formations/${formation.id}/periods`, { headers: getHeaders() })
        .then(r => r.json())
        .then(data => setPeriods(data.map(p => ({ jours_offset: p.jours_offset, montant: p.montant }))))
        .catch(() => {});
    }
  }, [isEdit, formation]);

const periodsTotal = periods.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const periodsMismatch = periods.length > 0 && form.prix && Math.abs(periodsTotal - Number(form.prix)) > 0.01;
  const addPeriod = () => setPeriods(prev => [...prev, { jours_offset: 0, montant: '' }]);
  const removePeriod = (idx) => setPeriods(prev => prev.filter((_, i) => i !== idx));
  const updatePeriod = (idx, field, value) => setPeriods(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
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

      const validPeriods = periods.filter(p => p.montant !== '' && p.montant !== null);
      if (validPeriods.length > 0) {
        await fetch(`${API}/api/formations/${data.id}/periods`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ periods: validPeriods }),
        });
      }

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] sticky top-0 bg-white z-10">
          <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#DCEBFA] text-[#0369A1] flex items-center justify-center">
              <BookOpen size={14} />
            </span>
            {isEdit ? 'Modifier la formation' : 'Ajouter une formation'}
          </h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {/* Formation info */}
          <Section>
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
       <div>
  <Label icon={Users} text="Capacité (étudiants)" />
  <input type="number" min="1" value={form.capacite_groupe} onChange={set('capacite_groupe')} className={inp} placeholder="Ex: 20" />
</div>
          </Section>

          <div className="border-t border-[#F1F5F9] pt-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-semibold text-slate-600">Échéancier de paiement par défaut</p>
                <p className="text-[10px] text-slate-400">Proposé à la création d'un groupe — modifiable ensuite pour chaque groupe.</p>
              </div>
              <button type="button" onClick={addPeriod} className="text-[11px] font-medium text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1 rounded-full hover:bg-[#c9e2f7] transition flex-shrink-0">
                + Période
              </button>
            </div>

            {periods.length === 0 ? (
              <p className="text-[11px] text-slate-400">Aucune période — paiement libre sans échéancier.</p>
            ) : (
              <div className="space-y-1.5">
                {periods.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-[#F8FAFC] rounded-lg px-2.5 py-1.5">
                    <span className="text-[10px] text-slate-400 w-10 flex-shrink-0">P{idx + 1}</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={p.jours_offset}
                        onChange={e => updatePeriod(idx, 'jours_offset', e.target.value)}
                        placeholder="Jour (ex: 0, 15, 30)"
                        className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={p.montant}
                        onChange={e => updatePeriod(idx, 'montant', e.target.value)}
                        placeholder="Montant (DA)"
                        className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
                      />
                    </div>
                    <button type="button" onClick={() => removePeriod(idx)} className="text-slate-300 hover:text-red-400 flex-shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                )
                )}

                <div className="flex items-center justify-end pt-1">
                  <span className={`text-[11px] font-medium ${periodsMismatch ? 'text-red-500' : 'text-emerald-600'}`}>
                    Total : {periodsTotal.toLocaleString('fr-FR')} / {Number(form.prix || 0).toLocaleString('fr-FR')} DA
                  </span>
                </div>
              </div>
              
            )}
          </div>

      <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
            <button onClick={handleSubmit} disabled={submitting || periodsMismatch}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40 font-medium">
              {submitting ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddFormationModal;