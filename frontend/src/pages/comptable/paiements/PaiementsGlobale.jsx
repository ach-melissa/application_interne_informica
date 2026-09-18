// PaiementsGlobale.jsx
import { useState, useMemo } from 'react';
import { Search, User, GraduationCap, Wallet, AlertCircle, Users, Clock, CalendarRange, X } from 'lucide-react';
import PaiementDetailModal from './PaiementDetailModal';

const RETARD_JOURS = 30;

const PaiementsGlobale = ({ paiements = [], formations = [], loading }) => {
  const [search, setSearch] = useState('');
  const [formationFilter, setFormationFilter] = useState('');
  const [periodeDebut, setPeriodeDebut] = useState('');
  const [periodeFin, setPeriodeFin] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);

  const rows = useMemo(() => {
    const map = new Map();
    for (const p of paiements) {
      if (!p.etudiant_id) continue;
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
          telephone: p.etudiants?.telephone ?? '—',
          groupeNom: p.groupe?.nom ?? '—',
          professeurNom: p.groupe?.teacher?.user ? `${p.groupe.teacher.user.nom} ${p.groupe.teacher.user.prenom}` : '—',
          groupeDateDebut: p.groupe?.date_debut ?? null,
          groupeDateFin: p.groupe?.date_fin ?? null,
          groupeStatut: p.groupe?.statut ?? null,
          prix,
          tranches: {},
        });
      }
      map.get(key).tranches[p.tranche] = {
        montant: p.montant,
        date_paiement: p.date_paiement ?? p.date ?? p.created_at,
        statut: p.statut,
      };
    }
    return Array.from(map.values());
  }, [paiements, formations]);

  const totalPaye = (row) => Object.values(row.tranches).reduce((s, t) => s + Number(t.montant), 0);
  const resteAPayer = (row) => (row.prix != null ? row.prix - totalPaye(row) : null);

  const dernierPaiement = (row) => {
    const dates = Object.values(row.tranches).map((t) => t.date_paiement).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : null;
  };

  const estEnRetard = (row) => {
    const reste = resteAPayer(row);
    if (reste == null || reste <= 0) return false;
    const dernier = dernierPaiement(row);
    if (!dernier) return true;
    const jours = (Date.now() - new Date(dernier).getTime()) / (1000 * 60 * 60 * 24);
    return jours > RETARD_JOURS;
  };

  const dateDansPeriode = (dateStr) => {
    if (!periodeDebut && !periodeFin) return true;
    if (!dateStr) return false;
    const d = String(dateStr).slice(0, 10);
    if (periodeDebut && d < periodeDebut) return false;
    if (periodeFin && d > periodeFin) return false;
    return true;
  };

  const rowMatchPeriode = (row) => {
    if (!periodeDebut && !periodeFin) return true;
    return Object.values(row.tranches).some((t) => dateDansPeriode(t.date_paiement));
  };

  const payeSurPeriode = (row) => {
    if (!periodeDebut && !periodeFin) return totalPaye(row);
    return Object.values(row.tranches).filter((t) => dateDansPeriode(t.date_paiement)).reduce((s, t) => s + Number(t.montant), 0);
  };

  const filtered = rows.filter((r) => {
    const matchSearch = !search || `${r.nom} ${r.formationNom}`.toLowerCase().includes(search.toLowerCase());
    const matchFormation = !formationFilter || String(r.formationId) === String(formationFilter);
    return matchSearch && matchFormation && rowMatchPeriode(r);
  });

  const stats = useMemo(() => {
    const totalPayePeriode = filtered.reduce((s, r) => s + payeSurPeriode(r), 0);
    const totalRestant = filtered.reduce((s, r) => {
      const reste = resteAPayer(r);
      return s + (reste != null && reste > 0 ? reste : 0);
    }, 0);
    return { totalPayePeriode, totalRestant, nbEtudiants: filtered.length, nbEnRetard: filtered.filter(estEnRetard).length };
  }, [filtered]);

  const periodeActive = Boolean(periodeDebut || periodeFin);
  const resetPeriode = () => { setPeriodeDebut(''); setPeriodeFin(''); };
  const activeCount = (search ? 1 : 0) + (formationFilter ? 1 : 0) + (periodeActive ? 1 : 0);
  const clearAll = () => { setSearch(''); setFormationFilter(''); resetPeriode(); };

  const CARDS = [
    { label: periodeActive ? 'Total payé — période' : 'Total payé — Étudiants', value: `${stats.totalPayePeriode.toLocaleString('fr-DZ')} DA`, icon: Wallet, bg: 'bg-[#DCEBFA]', color: 'text-[#0369A1]' },
    { label: 'Total restant', value: `${stats.totalRestant.toLocaleString('fr-DZ')} DA`, icon: AlertCircle, bg: 'bg-amber-50', color: 'text-amber-700' },
    { label: 'Étudiants', value: stats.nbEtudiants, icon: Users, bg: 'bg-[#DCEBFA]', color: 'text-[#0369A1]' },
    { label: 'En retard', value: stats.nbEnRetard, icon: Clock, bg: 'bg-red-50', color: 'text-red-600' },
  ];

  const COLS = [
    { label: 'Étudiant', icon: User },
    { label: 'Numero tel', icon: User },
    { label: 'Formation', icon: GraduationCap },
    { label: 'Groupe' },
    { label: 'Professeur' },
    { label: 'Prix à payer' },
    { label: 'Payé' },
    { label: 'Restant' },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-5">
        {CARDS.map((c) => (
          <div key={c.label} className="flex items-center gap-3 bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] px-4 py-3 min-w-[200px] flex-1">
            <div className={`w-9 h-9 rounded-full ${c.bg} flex items-center justify-center ${c.color} shrink-0`}>
              <c.icon size={16} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{c.label}</p>
              <p className="text-sm font-bold text-[#0F2A4A]">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

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

        <div className="w-px h-5 bg-[#E2E8F0]" />

        <div className="relative flex items-center">
          <GraduationCap size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none z-10" />
          <select
            value={formationFilter}
            onChange={(e) => setFormationFilter(e.target.value)}
            className={`appearance-none pl-8 pr-7 py-1.5 text-xs rounded-full bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer min-w-[200px]
              ${formationFilter ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}
          >
            <option value="">Toutes les formations</option>
            {formations.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          {formationFilter && (
            <button onClick={() => setFormationFilter('')} className="absolute right-2 text-slate-300 hover:text-red-400">
              <X size={11} />
            </button>
          )}
        </div>

        <div className="w-px h-5 bg-[#E2E8F0]" />

        <div className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] rounded-full pl-3 pr-1.5 py-1.5">
          <CalendarRange size={13} className="text-[#0369A1]" />
          <input type="date" value={periodeDebut} onChange={(e) => setPeriodeDebut(e.target.value)} className="text-xs text-slate-500 focus:outline-none bg-transparent" />
          <span className="text-slate-300 text-xs">→</span>
          <input type="date" value={periodeFin} onChange={(e) => setPeriodeFin(e.target.value)} className="text-xs text-slate-500 focus:outline-none bg-transparent" />
        </div>

        {activeCount > 0 && (
          <button onClick={clearAll} className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
            <X size={11} /> Tout effacer
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#0F2A4A] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#0F2A4A]">
                <tr>
                  {COLS.map(({ label, icon: Icon }, i) => (
                    <th
                      key={label}
                      className={`${i >= 3 ? 'text-right' : 'text-left'} px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] whitespace-nowrap ${i === 0 ? 'border-l' : ''} ${i === COLS.length - 1 ? 'border-r' : ''}`}
                    >
                      <span className={`flex items-center gap-1.5 ${i >= 3 ? 'justify-end' : ''}`}>
                        {Icon && <Icon size={12} className="text-white/70" />}
                        {label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400 bg-white">Aucun revenu trouvé.</td>
                  </tr>
                ) : filtered.map((row, idx) => {
                  const paid = totalPaye(row);
                  const reste = resteAPayer(row);
                  const enRetard = estEnRetard(row);

                  return (
                    <tr
                      key={row.key}
                      onClick={() => setSelectedRow(row)}
                      className={`hover:bg-slate-50 transition cursor-pointer ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
                    >
                      <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap border-b border-l border-slate-100">
                        <span className="inline-flex items-center gap-1.5">
                          {row.nom}
                          {enRetard && (
                            <span title={`En retard (> ${RETARD_JOURS} j sans paiement)`} className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-slate-100">{row.telephone}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-slate-100">{row.formationNom}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500 whitespace-nowrap border-b border-slate-100">{row.groupeNom}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500 whitespace-nowrap border-b border-slate-100">{row.professeurNom}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600 whitespace-nowrap border-b border-slate-100">
                        {row.prix != null ? `${Number(row.prix).toLocaleString('fr-DZ')} DA` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap border-b border-slate-100">
                        {paid.toLocaleString('fr-DZ')} DA
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap border-b border-r border-slate-100">
                        {reste != null ? (
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${reste <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {reste.toLocaleString('fr-DZ')} DA
                          </span>
                        ) : '—'}
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