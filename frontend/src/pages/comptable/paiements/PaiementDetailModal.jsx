// PaiementDetailModal.jsx
import { X, Calendar, User } from 'lucide-react';

const PaiementDetailModal = ({ row, onClose }) => {
  if (!row) return null;

  const trancheNumbers = Object.keys(row.tranches).map(Number).sort((a, b) => a - b);
  const paid = trancheNumbers.reduce((s, n) => s + Number(row.tranches[n].montant), 0);
  const reste = row.prix != null ? row.prix - paid : null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-md shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
                <User size={14} className="text-white" />
              </span>
              <span className="truncate">{row.nom}</span>
            </h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600 shrink-0"><X size={16} /></button>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4">
            <p className="text-[11px] text-[#0369A1] font-medium">{row.formationNom} — {row.groupeNom}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Début du groupe : {row.groupeDateDebut ? new Date(row.groupeDateDebut).toLocaleDateString('fr-DZ') : '—'}
              {' · '}Fin : {row.groupeDateFin ? new Date(row.groupeDateFin).toLocaleDateString('fr-DZ') : '—'}
              {' · '}
              <span className={row.groupeStatut === 'termine' ? 'text-slate-500' : 'text-emerald-600 font-medium'}>
                {row.groupeStatut === 'termine' ? 'Terminé' : 'En cours'}
              </span>
            </p>
          </div>

          {trancheNumbers.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-8">Aucune tranche enregistrée.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-[#0369A1] border-b border-slate-100">
                  <th className="text-left py-2">Tranche</th>
                  <th className="text-right py-2">Montant payé</th>
                  <th className="text-right py-2">Date de paiement</th>
                </tr>
              </thead>
              <tbody>
                {trancheNumbers.map((n) => {
                  const t = row.tranches[n];
                  const date = t.date_paiement ?? t.date ?? t.created_at ?? null;
                  const enRetard = t.statut === 'en_attente';
                  return (
                    <tr key={n} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 font-medium text-slate-700">{n}ère Tranche</td>
                      <td className={`py-2 text-right font-semibold ${enRetard ? 'text-red-600' : 'text-slate-700'}`}>
                        {Number(t.montant).toLocaleString('fr-DZ')} DA
                      </td>
                      <td className={`py-2 text-right ${enRetard ? 'text-red-600' : 'text-slate-500'}`}>
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={11} />
                          {date ? new Date(date).toLocaleDateString('fr-DZ') : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs">
            <span className="text-slate-500">Total payé</span>
            <span className="font-bold text-[#0369A1]">{paid.toLocaleString('fr-DZ')} DA</span>
          </div>
          {reste != null && (
            <div className="flex justify-between text-xs mt-1">
              <span className="text-slate-500">Reste à payer</span>
              <span className={`font-bold ${reste <= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {reste.toLocaleString('fr-DZ')} DA
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaiementDetailModal;