import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, Tag, Percent, X, Check, Clock } from 'lucide-react';
import { typeIcon } from './SalairesProfesseurs';

const TYPES_REM = ['Fixe', "À l'heure", 'Pourcentage'];

const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';
const Label = ({ icon: Icon, text, required }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} />} {text}{required && <span className="text-red-500 ml-0.5">*</span>}
  </p>
);

/* Formatte le résumé affiché dans le tableau */
export const montantLabel = (f) => {
  if (f.typeSalaire === 'Fixe') return `${f.montant} DA / mois`;
  if (f.typeSalaire === 'Pourcentage') return `${f.montant} %`;
  if (f.typeSalaire === "À l'heure") return `${f.heures || 0}h → ${f.montant} DA/h`;
  return '—';
};

/* ------------------------------------------------------------------ */
/*  Modal d'édition d'une formation                                    */
/* ------------------------------------------------------------------ */
const EditFormationModal = ({ formation, onClose, onSave }) => {
  const [typeSalaire, setTypeSalaire] = useState(formation.typeSalaire || "À l'heure");
  const [montant, setMontant] = useState(formation.montant || '');
  const [heures, setHeures] = useState(formation.heures || '');
  const [error, setError] = useState('');

  const submit = () => {
    if (typeSalaire === 'Fixe') {
      if (!(Number(montant) > 0)) return setError('Renseignez un montant fixe valide.');
      onSave({ typeSalaire, montant: Number(montant), heures: 0 });
    } else if (typeSalaire === 'Pourcentage') {
      if (!(Number(montant) > 0 && Number(montant) <= 100)) return setError('Le pourcentage doit être entre 1 et 100.');
      onSave({ typeSalaire, montant: Number(montant), heures: 0 });
    } else {
      if (!(Number(heures) > 0)) return setError('Renseignez le nombre d\'heures.');
      if (!(Number(montant) > 0)) return setError('Renseignez le tarif horaire.');
      onSave({ typeSalaire, montant: Number(montant), heures: Number(heures) });
    }
    setError('');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0"><Wallet size={14} className="text-white" /></span>
              Modifier la rémunération
            </h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>
          {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 mx-5 mb-3 rounded-md">{error}</p>}
        </div>

        <div className="p-5 space-y-3">
          <div>
            <Label icon={Tag} text="Formation" />
            <input disabled value={formation.nom} className={`${inp} bg-slate-100 text-slate-500`} />
          </div>

          <div>
            <Label icon={Wallet} text="Type de rémunération" required />
            <select value={typeSalaire} onChange={(e) => setTypeSalaire(e.target.value)} className={inp}>
              {TYPES_REM.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {typeSalaire === "À l'heure" && (
            <div>
              <Label icon={Clock} text="Nombre d'heures" required />
              <input type="number" min="0" value={heures} onChange={(e) => setHeures(e.target.value)} className={inp} placeholder="0" />
            </div>
          )}

          <div>
            <Label icon={typeSalaire === 'Pourcentage' ? Percent : Wallet} text={typeSalaire === 'Pourcentage' ? 'Pourcentage' : typeSalaire === 'Fixe' ? 'Montant fixe' : 'Tarif horaire'} required />
            <div className="flex min-w-0 rounded-md border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#0369A1]/40">
              <input type="number" min="0" max={typeSalaire === 'Pourcentage' ? 100 : undefined} value={montant} onChange={(e) => setMontant(e.target.value)} className="flex-1 min-w-0 px-2.5 py-1.5 text-xs focus:outline-none" placeholder={typeSalaire === 'Pourcentage' ? '60' : '0'} />
              <span className="flex items-center px-2.5 text-[11px] text-slate-500 bg-slate-50 border-l border-slate-200 whitespace-nowrap">
                {typeSalaire === 'Pourcentage' ? '%' : typeSalaire === 'Fixe' ? 'DA / mois' : 'DA / h'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
            <button onClick={submit} className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white hover:bg-[#16385f] font-medium flex items-center gap-1">
              <Check size={12} /> Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ------------------------------------------------------------------ */
/*  Tableau                                                             */
/* ------------------------------------------------------------------ */
const FormationsTab = ({ formations, onUpdate }) => {
  const [editIdx, setEditIdx] = useState(null);

  return (
    <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100"><p className="text-sm font-semibold text-slate-800">Formations & rémunération</p></div>
      <table className="w-full text-xs">
        <thead className="bg-[#0F2A4A]">
          <tr>
            {['Formation', 'Type de paiement', 'Heures / Tarif'].map((h, i, arr) => (
              <th key={h} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] ${i === 0 ? 'border-l' : ''} ${i === arr.length - 1 ? 'text-right border-r' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {formations.map((f, i) => {
            const TypeIcon = f.typeSalaire ? typeIcon(f.typeSalaire) : null;
            return (
              <tr key={i} onClick={() => setEditIdx(i)} className={`cursor-pointer hover:bg-slate-50/60 transition ${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                <td className="px-3 py-2.5 text-slate-700 font-medium border-b border-l border-slate-100">{f.nom}</td>
                <td className="px-3 py-2.5 text-slate-500 border-b border-slate-100">
                  <span className="flex items-center gap-1.5">{TypeIcon && <TypeIcon size={12} className="text-[#0369A1]" />} {f.typeSalaire || 'Non défini'}</span>
                </td>
                <td className="px-3 py-2.5 text-right font-medium text-slate-700 border-b border-r border-slate-100">
                  {f.typeSalaire ? montantLabel(f) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editIdx !== null && (
        <EditFormationModal
          formation={formations[editIdx]}
          onClose={() => setEditIdx(null)}
          onSave={(patch) => onUpdate(editIdx, patch)}
        />
      )}
    </div>
  );
};

export default FormationsTab;