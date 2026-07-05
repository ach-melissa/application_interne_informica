import { useState, useMemo } from 'react';
import { Search, User, GraduationCap } from 'lucide-react';

const PaiementsGlobale = ({ paiements = [], loading }) => {
  const [search, setSearch] = useState('');

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

  const totalCols = 2 + maxTranches + 1;

  return (
    <>
      {/* Filter bar — pill search matching Utilisateurs/GroupDetail */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="relative min-w-[200px] flex-1 max-w-[260px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input
            type="text"
            placeholder="Nom, formation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
          />
        </div>
        <span className="text-[11px] text-slate-400 bg-[#F8FCFF] border border-[#E2E8F0] px-2.5 py-1 rounded-full">
          {filtered.length} / {rows.length}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#0F2A4A] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#DCEBFA]">
                <tr>
                  <th className="text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-l border-[#E2E8F0]">
                    <span className="flex items-center gap-1.5"><User size={12} /> Étudiant</span>
                  </th>
                  <th className="text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0]">
                    <span className="flex items-center gap-1.5"><GraduationCap size={12} /> Formation</span>
                  </th>
                  {Array.from({ length: maxTranches }, (_, i) => (
                    <th key={i} className="text-center px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] min-w-[110px]">
                      {i + 1}ère Tranche
                    </th>
                  ))}
                  <th className="text-right px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] whitespace-nowrap">
                    Total payé
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={totalCols} className="text-center py-10 text-slate-400 bg-white">
                      Aucun paiement trouvé.
                    </td>
                  </tr>
                ) : filtered.map((row, idx) => {
                  const paid = Object.values(row.tranches).reduce((s, t) => s + Number(t.montant), 0);
                  return (
                    <tr key={row.key} className={`hover:bg-[#DCEBFA]/30 transition ${idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}`}>
                      <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap border-b border-l border-[#E2E8F0]">
                        {row.nom}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">
                        {row.formationNom}
                      </td>
                      {Array.from({ length: maxTranches }, (_, i) => {
                        const t = row.tranches[i + 1];
                        return (
                          <td key={i} className="px-3 py-2.5 text-center border-b border-[#E2E8F0]">
                            {t ? (
                              <span className="font-semibold text-slate-700 text-xs">
                                {Number(t.montant).toLocaleString('fr-DZ')} DA
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-[#E2E8F0]">
                        {paid.toLocaleString('fr-DZ')} DA
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default PaiementsGlobale;