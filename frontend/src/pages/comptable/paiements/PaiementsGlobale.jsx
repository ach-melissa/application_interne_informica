import { useState, useMemo } from 'react';
import { Search, User, GraduationCap, Users, Eye } from 'lucide-react';
import PaiementDetailModal from './PaiementDetailModal';

const STATUTS = ['Non payé', 'Payé'];

const PaiementsGlobale = ({ paiements = [], formations = [], loading, statutMap = {}, onStatutChange }) => {
  const [search, setSearch] = useState('');
  const [formationFilter, setFormationFilter] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);

  const rows = useMemo(() => {
    const map = new Map();
    for (const p of paiements) {
      if (!p.etudiant_id) continue; // paiements sans étudiant = "autres", gérés dans l'onglet Autre
      const key = `${p.etudiant_id}_${p.formation_id}`;
      if (!map.has(key)) {
        const formation = formations.find((f) => String(f.id) === String(p.formation_id));
        const prix = formation?.prix_etudiant ?? formation?.prix ?? formation?.tarif ?? null;
        map.set(key, {
          key,
          etudiantId: p.etudiant_id,
          formationId: p.formation_id,
          nom: `${p.etudiants?.nom ?? ''} ${p.etudiants?.prenom ?? ''}`.trim(),
          formationNom: p.formations?.nom ?? formation?.nom ?? '—',
          prix,
          tranches: {},
        });
      }
      map.get(key).tranches[p.tranche] = {
        montant: p.montant,
        date_paiement: p.date_paiement ?? p.date ?? p.created_at,
      };
    }
    return Array.from(map.values());
  }, [paiements, formations]);

  const filtered = rows.filter((r) => {
    const matchSearch = !search || `${r.nom} ${r.formationNom}`.toLowerCase().includes(search.toLowerCase());
    const matchFormation = !formationFilter || String(r.formationId) === String(formationFilter);
    return matchSearch && matchFormation;
  });

  const totalPayeEtudiants = useMemo(
    () => rows.reduce((s, r) => s + Object.values(r.tranches).reduce((ss, t) => ss + Number(t.montant), 0), 0),
    [rows]
  );

  return (
    <>
      {/* Card */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3 bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] px-4 py-3 min-w-[220px]">
          <div className="w-9 h-9 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[#0369A1]">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total payé — Étudiants</p>
            <p className="text-sm font-bold text-[#0F2A4A]">{totalPayeEtudiants.toLocaleString('fr-DZ')} DA</p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
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

        <div className="relative flex items-center">
          <GraduationCap size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none z-10" />
          <select
            value={formationFilter}
            onChange={(e) => setFormationFilter(e.target.value)}
            className={`pl-8 pr-4 py-1.5 text-xs rounded-full bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer min-w-[200px]
              ${formationFilter ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}
          >
            <option value="">Toutes les formations</option>
            {formations.map((f) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
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
                  <th className="text-right px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] whitespace-nowrap">
                    Prix total
                  </th>
                  <th className="text-right px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] whitespace-nowrap">
                    Total payé
                  </th>
                  <th className="text-right px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] whitespace-nowrap">
                    Reste à payer
                  </th>
                  <th className="text-center px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] whitespace-nowrap">
                    Statut
                  </th>
                  <th className="text-center px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-r border-[#E2E8F0] whitespace-nowrap">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 bg-white">
                      Aucun revenu trouvé.
                    </td>
                  </tr>
                ) : filtered.map((row, idx) => {
                  const paid = Object.values(row.tranches).reduce((s, t) => s + Number(t.montant), 0);
                  const reste = row.prix != null ? row.prix - paid : null;
                  const statut = statutMap[row.key] ?? 'Non payé';

                  return (
                    <tr key={row.key} className={`hover:bg-[#DCEBFA]/30 transition ${idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}`}>
                      <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap border-b border-l border-[#E2E8F0]">
                        {row.nom}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">
                        {row.formationNom}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-600 whitespace-nowrap border-b border-[#E2E8F0]">
                        {row.prix != null ? `${Number(row.prix).toLocaleString('fr-DZ')} DA` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-[#E2E8F0]">
                        {paid.toLocaleString('fr-DZ')} DA
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap border-b border-[#E2E8F0]">
                        {reste != null ? (
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            reste <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {reste.toLocaleString('fr-DZ')} DA
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap border-b border-[#E2E8F0]">
                        <select
                          value={statut}
                          onChange={(e) => onStatutChange?.(row.key, e.target.value)}
                          className={`text-[11px] font-medium rounded-full px-2.5 py-1 border-none focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer ${
                            statut === 'Payé' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {STATUTS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap border-b border-r border-[#E2E8F0]">
                        <button
                          onClick={() => setSelectedRow(row)}
                          className="text-[#0369A1] hover:text-[#0F2A4A] inline-flex items-center"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PaiementDetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />
    </>
  );
};

export default PaiementsGlobale; 