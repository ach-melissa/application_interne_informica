import { X, Calendar } from 'lucide-react';

const PaiementDetailModal = ({ row, onClose }) => {
  if (!row) return null;

  const trancheNumbers = Object.keys(row.tranches)
    .map(Number)
    .sort((a, b) => a - b);

  const paid = trancheNumbers.reduce((s, n) => s + Number(row.tranches[n].montant), 0);
  const reste = row.prix != null ? row.prix - paid : null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#DCEBFA]">
          <div>
            <h3 className="text-sm font-bold text-[#0F2A4A]">{row.nom}</h3>
            <p className="text-[11px] text-[#0369A1]">{row.formationNom}</p>
          </div>
          <button onClick={onClose} className="text-[#0369A1] hover:text-[#0F2A4A]">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {trancheNumbers.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-8">Aucune tranche enregistrée.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-[#0369A1] border-b border-[#E2E8F0]">
                  <th className="text-left py-2">Tranche</th>
                  <th className="text-right py-2">Montant</th>
                  <th className="text-right py-2">Date de paiement</th>
                </tr>
              </thead>
              <tbody>
                {trancheNumbers.map((n) => {
                  const t = row.tranches[n];
                  // Le champ date exact dépend du backend — à ajuster si le nom diffère
                  // (ex: date_paiement, date, created_at).
                  const date = t.date_paiement ?? t.date ?? t.created_at ?? null;
                  return (
                    <tr key={n} className="border-b border-[#E2E8F0] last:border-0">
                      <td className="py-2 font-medium text-slate-700">{n}ère Tranche</td>
                      <td className="py-2 text-right font-semibold text-slate-700">
                        {Number(t.montant).toLocaleString('fr-DZ')} DA
                      </td>
                      <td className="py-2 text-right text-slate-500">
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

          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex justify-between text-xs">
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