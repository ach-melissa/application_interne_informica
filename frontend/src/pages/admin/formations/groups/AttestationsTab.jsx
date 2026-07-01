// AttestationsTab.jsx
import { useState } from 'react';
import { Printer } from 'lucide-react';

const statutMeta = {
  confirmed:     { label: 'Confirmé',     cls: 'bg-emerald-100 text-emerald-700' },
  pending:       { label: 'En attente',   cls: 'bg-amber-100 text-amber-700' },
  non_confirmed: { label: 'Non confirmé', cls: 'bg-red-100 text-red-600' },
};

const AttestationsTab = ({ etudiants, formationId, groupId }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [periode, setPeriode] = useState('');
  const [dateSignature, setDateSignature] = useState('');

  const toggle = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(prev =>
      prev.size === etudiants.length ? new Set() : new Set(etudiants.map(i => i.id))
    );
  };

  const handlePrintClick = () => {
    if (selectedIds.size === 0) return;
    setShowPrintModal(true);
  };

  const handleConfirmPrint = () => {
    const ids = Array.from(selectedIds).join(',');
    const params = new URLSearchParams({
      ids,
      periode,
      dateSignature,
    });
    window.open(
      `/admin/formations/${formationId}/groups/${groupId}/attestations/print?${params.toString()}`,
      '_blank'
    );
    setShowPrintModal(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-xs">{selectedIds.size} / {etudiants.length} sélectionné(s)</p>
        <button
          onClick={handlePrintClick}
          disabled={selectedIds.size === 0}
          className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Printer size={13} /> Imprimer ({selectedIds.size})
        </button>
      </div>

      <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-blue-50 border-b border-blue-100">
              <tr>
                <th className="px-3 py-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === etudiants.length && etudiants.length > 0}
                    onChange={toggleAll}
                    className="cursor-pointer accent-blue-600"
                  />
                </th>
                {['Étudiant', 'Téléphone', 'Email', 'Niveau', 'Adresse', 'Date naissance', 'Statut'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-blue-500 font-semibold text-[10px] tracking-wide uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {etudiants.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Aucun étudiant trouvé.</td></tr>
              ) : etudiants.map(i => {
                const sm = statutMeta[i.statut];
                const checked = selectedIds.has(i.id);
                return (
                  <tr
                    key={i.id}
                    onClick={() => toggle(i.id)}
                    className={`cursor-pointer transition ${checked ? 'bg-blue-50' : 'hover:bg-blue-50/40'}`}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(i.id)}
                        className="cursor-pointer accent-blue-600"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">
                          {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-700 whitespace-nowrap">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{i.etudiant?.telephone ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{i.etudiant?.email ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{i.etudiant?.niveau_scolaire ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-[150px] truncate">{i.etudiant?.adresse ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                      {i.etudiant?.date_naissance ? new Date(i.etudiant.date_naissance).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sm?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                        {sm?.label ?? i.statut}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showPrintModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              Informations de l'attestation
            </h3>

            <label className="block text-xs text-slate-500 mb-1">
              Période (ex: du 01 Janvier 2026 au 30 Mars 2026)
            </label>
            <input
              type="text"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              placeholder="du 01 Janvier 2026 au 30 Mars 2026"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <label className="block text-xs text-slate-500 mb-1">
              Date de signature
            </label>
            <input
              type="text"
              value={dateSignature}
              onChange={(e) => setDateSignature(e.target.value)}
              placeholder="15 Juin 2026"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-xs font-medium text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPrint}
                disabled={!periode || !dateSignature}
                className="text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttestationsTab;