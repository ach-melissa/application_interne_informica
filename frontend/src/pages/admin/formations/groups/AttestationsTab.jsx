// AttestationsTab.jsx
import { useState, useEffect } from 'react';
import { Printer, FileDown, Phone, Mail, GraduationCap, MapPin, CalendarDays, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const statutMeta = {
  confirmed:     { label: 'Confirmé',     cls: 'bg-emerald-50 text-emerald-700' },
  pending:       { label: 'En attente',   cls: 'bg-amber-50 text-amber-700' },
  non_confirmed: { label: 'Non confirmé', cls: 'bg-red-50 text-red-500' },
};

const COLS = [
  { label: 'Étudiant',       Icon: null },
  { label: 'Téléphone',      Icon: Phone },
  { label: 'Email',          Icon: Mail },
  { label: 'Niveau',         Icon: GraduationCap },
  { label: 'Adresse',        Icon: MapPin },
  { label: 'Date naissance', Icon: CalendarDays },
  { label: 'Attestation',    Icon: FileDown },   
  { label: 'Statut',         Icon: CheckCircle2 },
];

const AttestationsTab = ({ etudiants, formationId, formationNom, groupId }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [periode, setPeriode] = useState('');
  const [dateSignature, setDateSignature] = useState('');
  const [payments, setPayments] = useState([]);
  const [justPrinted, setJustPrinted] = useState(new Set());

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/group/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setPayments(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPayments();
  }, [groupId]);

  const isPrinted = (inscriptionId, attestationImprimee) =>
    attestationImprimee || justPrinted.has(inscriptionId);

  const isEligible = (inscription) => {
    const p = payments.find(p => p.studentId === inscription.etudiant?.id);
    const paid = !p || p.remaining <= 0;
    const printed = isPrinted(inscription.id, inscription.attestation_imprimee);
    return paid && !printed;
  };

  const toggle = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const eligibleIds = etudiants.filter(i => isEligible(i)).map(i => i.id);
    setSelectedIds(prev =>
      prev.size === eligibleIds.length && eligibleIds.length > 0 ? new Set() : new Set(eligibleIds)
    );
  };

  const handlePrintClick = () => {
    if (selectedIds.size === 0) return;
    setShowPrintModal(true);
  };

  const handleConfirmPrint = async () => {
    const idsArray = Array.from(selectedIds);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/inscriptions/mark-printed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: idsArray }),
      });

      if (res.ok) {
        setJustPrinted(prev => new Set([...prev, ...idsArray]));
      }
    } catch (err) {
      console.error(err);
    }

    const params = new URLSearchParams({
      ids: idsArray.join(','),
      periode,
      dateSignature,
    });
    window.open(
      `/admin/formations/${formationId}/groups/${groupId}/attestations/print?${params.toString()}`,
      '_blank'
    );
    setShowPrintModal(false);
    setSelectedIds(new Set()); 
  };

  const handleExportExcel = () => {
    const rows = etudiants
      .filter(i => selectedIds.has(i.id))
      .map(i => ({
        Nom: i.etudiant?.nom ?? '',
        Prénom: i.etudiant?.prenom ?? '',
        'Date de naissance': i.etudiant?.date_naissance
          ? new Date(i.etudiant.date_naissance).toLocaleDateString('fr-FR')
          : '',
        Formation: formationNom ?? '',
      }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attestations');
    XLSX.writeFile(wb, `attestations_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-400 text-xs">{selectedIds.size} / {etudiants.length} sélectionné(s)</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-600/20 px-3 py-1.5 rounded-full hover:bg-emerald-100 hover:shadow-sm active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <FileDown size={13} /> Exporter Excel ({selectedIds.size})
          </button>
          <button
            onClick={handlePrintClick}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#0369A1] px-3 py-1.5 rounded-full hover:bg-[#065e8f] active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <Printer size={13} /> Imprimer ({selectedIds.size})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#0F2A4A]">
              <tr>
                <th className="px-3 py-2.5 w-8 border-b border-l border-[#0F2A4A]">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === etudiants.filter(i => isEligible(i.etudiant?.id)).length && etudiants.length > 0}
                    onChange={toggleAll}
                    className="cursor-pointer accent-[#0369A1]"
                  />
                </th>
                {COLS.map(({ label, Icon }) => (
                  <th key={label} className="text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {Icon && <Icon size={11} className="text-white/70 flex-shrink-0" />}
                      <span>{label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {etudiants.length === 0 ? (
                <tr><td colSpan={COLS.length + 1} className="text-center py-10 text-slate-400 bg-white">Aucun étudiant trouvé.</td></tr>
              ) : etudiants.map((i, idx) => {
                const sm = statutMeta[i.statut];
                const checked = selectedIds.has(i.id);
                const eligible = isEligible(i);
                return (
<tr
  onClick={() => eligible && toggle(i.id)}
  className={`transition ${eligible ? 'cursor-pointer hover:bg-[#DCEBFA]/30' : 'cursor-not-allowed opacity-50'} ${checked ? 'bg-[#DCEBFA]/40' : idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}`}
>
                    <td className="px-3 py-2.5 border-b border-l border-[#E2E8F0]" onClick={(e) => e.stopPropagation()}>
<input
  type="checkbox"
  checked={checked}
  disabled={!eligible}
  onChange={() => eligible && toggle(i.id)}
  className="cursor-pointer accent-[#0369A1] disabled:cursor-not-allowed disabled:opacity-40"
/>
                    </td>
                    <td className="px-3 py-2.5 border-b border-[#E2E8F0]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                          {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-700 whitespace-nowrap">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">{i.etudiant?.telephone ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">{i.etudiant?.email ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">{i.etudiant?.niveau_scolaire ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-[150px] truncate border-b border-[#E2E8F0]">{i.etudiant?.adresse ?? '—'}</td>
 <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">
                      {i.etudiant?.date_naissance ? new Date(i.etudiant.date_naissance).toLocaleDateString('fr-FR') : '—'}
                    </td>
<td className="px-3 py-2.5 border-b border-[#E2E8F0]">
  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
    isPrinted(i.id, i.attestation_imprimee) ? 'bg-slate-100 text-slate-500' : 'bg-sky-50 text-sky-600'
  }`}>
    {isPrinted(i.id, i.attestation_imprimee) ? 'Oui' : 'Non'}
  </span>
</td>
                    <td className="px-3 py-2.5 border-b border-[#E2E8F0]">
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
          <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-lg w-full max-w-sm p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">
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
              className="w-full border border-[#E2E8F0] rounded-full px-3.5 py-2 text-xs mb-3 focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
            />

            <label className="block text-xs text-slate-500 mb-1">
              Date de signature
            </label>
            <input
              type="text"
              value={dateSignature}
              onChange={(e) => setDateSignature(e.target.value)}
              placeholder="15 Juin 2026"
              className="w-full border border-[#E2E8F0] rounded-full px-3.5 py-2 text-xs mb-4 focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-xs font-medium text-slate-500 px-3.5 py-1.5 rounded-full hover:bg-slate-100 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPrint}
                disabled={!periode || !dateSignature}
                className="text-xs font-medium text-white bg-[#0369A1] px-3.5 py-1.5 rounded-full hover:bg-[#065e8f] active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
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