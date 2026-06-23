import { useEffect, useState, useMemo } from 'react';

// ─── TrancheCell (read-only) ──────────────────────────────────────────────
const TrancheCell = ({ paiement }) => (
  <td className="px-3 py-2 text-center min-w-[110px]">
    {paiement ? (
      <span className="font-semibold text-gray-800 text-sm">
        {Number(paiement.montant).toLocaleString('fr-DZ')} DA
      </span>
    ) : (
      <span className="text-gray-300 text-sm">—</span>
    )}
  </td>
);

// ─── PaiementsFormation ───────────────────────────────────────────────────────
const PaiementsFormation = ({ formations = [], token, api }) => {
  const [selectedFormation, setSelectedFormation] = useState('');
  const [groups,  setGroups]  = useState([]); // [{ groupId, groupNom, students: [...] }]
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

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
      const data = await res.json();
      setGroups(data);
    } catch (e) {
      setError(e.message);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormationData(selectedFormation);
  }, [selectedFormation]);

  // Flatten all students across all groups (used for tranche-count + totals)
  const allStudents = useMemo(() => groups.flatMap((g) => g.students), [groups]);
  const totalStudents = allStudents.length;

  // Max tranche number across all students of all groups (columns must line up)
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
    selectedFormationObj?.prix          ??
    selectedFormationObj?.tarif         ??
    null;

  const totalCols = 2 + maxTranches + 1 + (prix != null ? 1 : 0);

  return (
    <>
      {/* ── Formation selector ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select
          value={selectedFormation}
          onChange={(e) => { setSelectedFormation(e.target.value); setGroups([]); }}
          className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[260px]"
        >
          <option value="">— Sélectionner une formation —</option>
          {formations.map((f) => (
            <option key={f.id} value={f.id}>{f.nom}</option>
          ))}
        </select>

        {selectedFormationObj && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
              {totalStudents} étudiant(s)
            </span>
            {prix != null && (
              <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-medium">
                Prix : {Number(prix).toLocaleString('fr-DZ')} DA
              </span>
            )}
            <span className="text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg font-medium">
              {maxTranches} tranche(s)
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
              {groups.length} groupe(s)
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {!selectedFormation ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          Sélectionnez une formation pour afficher le tableau des tranches.
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          Aucun étudiant inscrit à cette formation.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">
                  N°
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Nom et Prénom
                </th>
                {Array.from({ length: maxTranches }, (_, i) => (
                  <th
                    key={i}
                    className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[110px]"
                  >
                    {i + 1}ère Tranche
                  </th>
                ))}
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Total payé
                </th>
                {prix != null && (
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    Restant
                  </th>
                )}
              </tr>
            </thead>

            {groups.map((group) => (
              <tbody key={group.groupId} className="divide-y divide-gray-50">
                {/* ── Group section header ─────────────────────────────── */}
                <tr className="bg-blue-50/60">
                  <td
                    colSpan={totalCols}
                    className="px-4 py-2 text-xs font-bold text-blue-700 uppercase tracking-wide"
                  >
                    {group.groupNom || 'Groupe'} — {group.students.length} étudiant(s)
                  </td>
                </tr>

                {group.students.map((row, idx) => {
                  const paid      = Object.values(row.tranches).reduce((s, t) => s + Number(t.montant), 0);
                  const remaining = prix != null ? prix - paid : null;

                  return (
                    <tr key={row.studentId} className="hover:bg-gray-50/60 transition">
                      <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{row.nom}</td>

                      {Array.from({ length: maxTranches }, (_, i) => (
                        <TrancheCell key={i} paiement={row.tranches[i + 1] ?? null} />
                      ))}

                      <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                        {paid.toLocaleString('fr-DZ')} DA
                      </td>

                      {prix != null && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            remaining <= 0
                              ? 'bg-green-100 text-green-600'
                              : 'bg-amber-100 text-amber-700'
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

            {/* ── Footer totals (across all groups) ───────────────────── */}
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Total formation
                </td>
                {Array.from({ length: maxTranches }, (_, i) => {
                  const colTotal = allStudents.reduce(
                    (s, r) => s + (r.tranches[i + 1] ? Number(r.tranches[i + 1].montant) : 0),
                    0
                  );
                  return (
                    <td key={i} className="px-3 py-3 text-center text-xs font-semibold text-gray-700">
                      {colTotal > 0 ? `${colTotal.toLocaleString('fr-DZ')} DA` : '—'}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right text-xs font-bold text-blue-700 whitespace-nowrap">
                  {allStudents
                    .reduce((s, r) => s + Object.values(r.tranches).reduce((ss, t) => ss + Number(t.montant), 0), 0)
                    .toLocaleString('fr-DZ')}{' '}DA
                </td>
                {prix != null && (
                  <td className="px-4 py-3 text-right text-xs font-bold text-amber-700 whitespace-nowrap">
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
      )}
    </>
  );
};

export default PaiementsFormation;