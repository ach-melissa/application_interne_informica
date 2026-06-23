import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

/**
 * PaiementsGlobale
 * Props:
 *   paiements – array from GET /api/comptable/paiements
 *   loading   – boolean
 *
 * Shows ONE row per (étudiant + formation) pair, with one column per tranche,
 * across ALL formations and groupes — matching the tranche-matrix style used
 * in the "Vue par formation" tab, just unfiltered/ungrouped.
 */
const PaiementsGlobale = ({ paiements = [], loading }) => {
  const [search, setSearch] = useState('');

  // ── Group raw payment rows into one row per (étudiant, formation) ───────
  const rows = useMemo(() => {
    const map = new Map();
    for (const p of paiements) {
      const key = `${p.etudiant_id}_${p.formation_id}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          nom: `${p.etudiants?.nom ?? ''} ${p.etudiants?.prenom ?? ''}`.trim(),
          formationNom: p.formations?.nom ?? '—',
          tranches: {},
        });
      }
      map.get(key).tranches[p.tranche] = { montant: p.montant };
    }
    return Array.from(map.values());
  }, [paiements]);

  // ── Max tranche number across every row (columns must line up) ──────────
  const maxTranches = useMemo(() => {
    if (rows.length === 0) return 1;
    const maxes = rows.map((r) => {
      const keys = Object.keys(r.tranches).map(Number);
      return keys.length > 0 ? Math.max(...keys) : 0;
    });
    return Math.max(...maxes, 1);
  }, [rows]);

  const filtered = rows.filter((r) => {
    const name = `${r.nom} ${r.formationNom}`.toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  const totalCols = 2 + maxTranches + 1; // Étudiant + Formation + tranches + Total payé

  return (
    <>
      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher étudiant ou formation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-64"
          />
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Étudiant
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Formation
                </th>
                {Array.from({ length: maxTranches }, (_, i) => (
                  <th
                    key={i}
                    className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[110px]"
                  >
                    {i + 1}ère Tranche
                  </th>
                ))}
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Total payé
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} className="text-center py-10 text-gray-400">
                    Aucun paiement trouvé.
                  </td>
                </tr>
              ) : filtered.map((row) => {
                const paid = Object.values(row.tranches).reduce((s, t) => s + Number(t.montant), 0);
                return (
                  <tr key={row.key} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium text-gray-800 whitespace-nowrap">
                      {row.nom}
                    </td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                      {row.formationNom}
                    </td>

                    {Array.from({ length: maxTranches }, (_, i) => {
                      const t = row.tranches[i + 1];
                      return (
                        <td key={i} className="px-3 py-3 text-center">
                          {t ? (
                            <span className="font-semibold text-gray-800 text-sm">
                              {Number(t.montant).toLocaleString('fr-DZ')} DA
                            </span>
                          ) : (
                            <span className="text-gray-300 text-sm">—</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="px-5 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                      {paid.toLocaleString('fr-DZ')} DA
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default PaiementsGlobale;