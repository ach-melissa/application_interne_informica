import { useEffect, useState, useMemo } from 'react';
import { BookOpen, Users, Layers, Wallet } from 'lucide-react';

const TrancheCell = ({ paiement }) => (
  <td className="px-3 py-2.5 text-center min-w-[110px] border-b border-[#E2E8F0]">
    {paiement ? (
      <span className="font-semibold text-slate-700 text-xs">
        {Number(paiement.montant).toLocaleString('fr-DZ')} DA
      </span>
    ) : (
      <span className="text-slate-300 text-xs">—</span>
    )}
  </td>
);

const PaiementsFormation = ({ formations = [], token, api }) => {
  const [selectedFormation, setSelectedFormation] = useState('');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFormationData = async (formationId) => {
    if (!formationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${api}/api/comptable/paiements/formation/${formationId}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      if (!res.ok) throw new Error('Erreur chargement données formation.');
      setGroups(await res.json());
    } catch (e) {
      setError(e.message);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFormationData(selectedFormation); }, [selectedFormation]);

  const allStudents = useMemo(() => groups.flatMap((g) => g.students), [groups]);
  const totalStudents = allStudents.length;

  const maxTranches = useMemo(() => {
    if (allStudents.length === 0) return 1;
    const maxes = allStudents.map((s) => {
      const keys = Object.keys(s.tranches).map(Number);
      return keys.length > 0 ? Math.max(...keys) : 0;
    });
    return Math.max(...maxes, 1);
  }, [allStudents]);

  const selectedFormationObj = formations.find((f) => String(f.id) === String(selectedFormation));
  const prix =
    selectedFormationObj?.prix_etudiant ??
    selectedFormationObj?.prix ??
    selectedFormationObj?.tarif ??
    null;

  const totalCols = 2 + maxTranches + 1 + (prix != null ? 1 : 0);

  return (
    <>
      {/* Selector + badges — pill style matching admin filter bars */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative flex items-center">
          <BookOpen size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none z-10" />
          <select
            value={selectedFormation}
            onChange={(e) => { setSelectedFormation(e.target.value); setGroups([]); }}
            className={`pl-8 pr-4 py-1.5 text-xs rounded-full bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer min-w-[240px]
              ${selectedFormation ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}
          >
            <option value="">— Sélectionner une formation —</option>
            {formations.map((f) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
        </div>

        {selectedFormationObj && (
          <>
            <div className="w-px h-5 bg-[#E2E8F0]" />
            <span className="flex items-center gap-1.5 text-[11px] text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1.5 rounded-full font-medium">
              <Users size={12} /> {totalStudents} étudiant(s)
            </span>
            {prix != null && (
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-full font-medium">
                <Wallet size={12} /> {Number(prix).toLocaleString('fr-DZ')} DA
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[11px] text-violet-700 bg-violet-50 px-2.5 py-1.5 rounded-full font-medium">
              <Layers size={12} /> {maxTranches} tranche(s)
            </span>
            <span className="text-[11px] text-slate-400 bg-[#F8FCFF] border border-[#E2E8F0] px-2.5 py-1.5 rounded-full">
              {groups.length} groupe(s)
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {!selectedFormation ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          Sélectionnez une formation pour afficher le tableau des tranches.
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#0F2A4A] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">
          Aucun étudiant inscrit à cette formation.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#DCEBFA]">
                <tr>
                  <th className="text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-l border-[#E2E8F0] w-10">
                    N°
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0]">
                    Nom et Prénom
                  </th>
                  {Array.from({ length: maxTranches }, (_, i) => (
                    <th key={i} className="text-center px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] min-w-[110px]">
                      {i + 1}ère Tranche
                    </th>
                  ))}
                  <th className="text-right px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] whitespace-nowrap">
                    Total payé
                  </th>
                  {prix != null && (
                    <th className="text-right px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] whitespace-nowrap">
                      Restant
                    </th>
                  )}
                </tr>
              </thead>

              {groups.map((group) => (
                <tbody key={group.groupId}>
                  <tr className="bg-[#DCEBFA]/50">
                    <td colSpan={totalCols} className="px-3 py-2 text-[10px] font-bold text-[#0369A1] uppercase tracking-wide border-b border-l border-[#E2E8F0]">
                      {group.groupNom || 'Groupe'} — {group.students.length} étudiant(s)
                    </td>
                  </tr>

                  {group.students.map((row, idx) => {
                    const paid = Object.values(row.tranches).reduce((s, t) => s + Number(t.montant), 0);
                    const remaining = prix != null ? prix - paid : null;

                    return (
                      <tr key={row.studentId} className={`hover:bg-[#DCEBFA]/30 transition ${idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}`}>
                        <td className="px-3 py-2.5 text-slate-400 text-[11px] border-b border-l border-[#E2E8F0]">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-slate-700 whitespace-nowrap border-b border-[#E2E8F0]">{row.nom}</td>

                        {Array.from({ length: maxTranches }, (_, i) => (
                          <TrancheCell key={i} paiement={row.tranches[i + 1] ?? null} />
                        ))}

                        <td className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-[#E2E8F0]">
                          {paid.toLocaleString('fr-DZ')} DA
                        </td>

                        {prix != null && (
                          <td className="px-3 py-2.5 text-right whitespace-nowrap border-b border-[#E2E8F0]">
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                              remaining <= 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {remaining.toLocaleString('fr-DZ')} DA
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              ))}

              <tfoot className="bg-[#F8FCFF] border-t border-[#E2E8F0]">
                <tr>
                  <td colSpan={2} className="px-3 py-2.5 text-[10px] font-semibold text-slate-500 uppercase border-l border-[#E2E8F0]">
                    Total formation
                  </td>
                  {Array.from({ length: maxTranches }, (_, i) => {
                    const colTotal = allStudents.reduce(
                      (s, r) => s + (r.tranches[i + 1] ? Number(r.tranches[i + 1].montant) : 0),
                      0
                    );
                    return (
                      <td key={i} className="px-3 py-2.5 text-center text-[11px] font-semibold text-slate-600">
                        {colTotal > 0 ? `${colTotal.toLocaleString('fr-DZ')} DA` : '—'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 text-right text-[11px] font-bold text-[#0369A1] whitespace-nowrap">
                    {allStudents
                      .reduce((s, r) => s + Object.values(r.tranches).reduce((ss, t) => ss + Number(t.montant), 0), 0)
                      .toLocaleString('fr-DZ')}{' '}DA
                  </td>
                  {prix != null && (
                    <td className="px-3 py-2.5 text-right text-[11px] font-bold text-amber-700 whitespace-nowrap">
                      {allStudents
                        .reduce((s, r) => {
                          const paid = Object.values(r.tranches).reduce((ss, t) => ss + Number(t.montant), 0);
                          return s + Math.max(prix - paid, 0);
                        }, 0)
                        .toLocaleString('fr-DZ')}{' '}DA
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default PaiementsFormation;