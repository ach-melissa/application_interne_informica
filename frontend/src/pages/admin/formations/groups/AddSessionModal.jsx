import { useState, useEffect } from 'react';
import { X, CalendarDays } from 'lucide-react';
import { computeNextSessionDate } from '../../../../utils/pointageHelpers';
const AddSessionModal = ({ onClose, onConfirm, joursFormation, lastSessionDate, isHourBased }) => {
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState('normale');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [dureeEffectuee, setDureeEffectuee] = useState('');
  const [dureeTouched, setDureeTouched] = useState(false);

  useEffect(() => {
    setNewDate(computeNextSessionDate(joursFormation, lastSessionDate));
  }, [joursFormation, lastSessionDate]);

  useEffect(() => {
    if (isHourBased && heureDebut && heureFin && !dureeTouched) {
      const [sh, sm] = heureDebut.split(':').map(Number);
      const [eh, em] = heureFin.split(':').map(Number);
      const diff = Math.max(0, (eh + em / 60) - (sh + sm / 60));
      setDureeEffectuee(diff ? diff.toFixed(2) : '');
    }
  }, [heureDebut, heureFin, isHourBased, dureeTouched]);

  const canConfirm = newDate && heureDebut && (!isHourBased || (heureFin && dureeEffectuee));

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      date: newDate, type_seance: newType, heure_debut: heureDebut,
      heure_fin: isHourBased ? heureFin : null,
      duree_effectuee: isHourBased ? Number(dureeEffectuee) : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
              <CalendarDays size={14} className="text-white" />
            </span>
            Ajouter une séance
          </h2>
          <button onClick={onClose}><X size={16} className="text-slate-300 hover:text-slate-600" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Date de la séance <span className="text-red-500">*</span></p>
            <input
              type="date" value={newDate} autoFocus
              onChange={e => setNewDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors"
            />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Type de séance</p>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors"
            >
              <option value="normale">Normale</option>
              <option value="remplacement">Remplacement</option>
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Heure début <span className="text-red-500">*</span></p>
              <input
                type="time" value={heureDebut}
                onChange={e => setHeureDebut(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors"
              />
            </div>
                      {isHourBased && (
              <div className="flex-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Heure fin <span className="text-red-500">*</span></p>
                <input
                  type="time" value={heureFin}
                  onChange={e => setHeureFin(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors"
                />
              </div>
            )}
          </div>
          {isHourBased && (
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Durée de la séance (heures) <span className="text-red-500">*</span></p>
              <input
                type="number" step="0.25" min="0" value={dureeEffectuee}
                onChange={e => { setDureeEffectuee(e.target.value); setDureeTouched(true); }}
                placeholder="ex: 2"
                className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
            <button onClick={handleConfirm} disabled={!canConfirm}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] disabled:opacity-40 transition-all font-medium">
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddSessionModal;