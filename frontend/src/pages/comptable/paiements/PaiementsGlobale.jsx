// PaiementsGlobale.jsx
import { useState, useMemo } from 'react';
import { Search, User, GraduationCap, Wallet, AlertCircle, Users, Clock, CalendarRange, X, Layers } from 'lucide-react';
import PaiementDetailModal from './PaiementDetailModal';

const PaiementsGlobale = ({ paiements = [], formations = [], loading }) => {
  const [search, setSearch] = useState('');
  const [formationFilter, setFormationFilter] = useState('');
  const [groupeFilter, setGroupeFilter] = useState('');
  const [niveauFilter, setNiveauFilter] = useState('');
  const [statutPaiementFilter, setStatutPaiementFilter] = useState('');
  const [periodeDebut, setPeriodeDebut] = useState('');
  const [periodeFin, setPeriodeFin] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);
  const rows = useMemo(() => {
    return (paiements ?? [])
      .filter((p) => p.etudiant_id)
      .map((p) => ({
        key: `${p.etudiant_id}_${p.formation_id}`,
        etudiantId: p.etudiant_id,
        formationId: p.formation_id,
        nom: `${p.etudiants?.nom ?? ''} ${p.etudiants?.prenom ?? ''}`.trim(),
        formationNom: p.formations?.nom ?? '—',
        telephone: p.etudiants?.telephone ?? '—',
        groupeNom: p.groupe?.nom ?? '—',
        professeurNom: p.professeurNom ?? '—',
        groupeDateDebut: p.groupe?.date_debut ?? null,
        groupeDateFin: p.groupe?.date_fin ?? null,
        groupeStatut: p.groupe?.statut ?? null,
        statutScolarite: p.statutScolarite ?? 'en_cours',
        niveauNom: p.niveauNom ?? null,
        formationANiveaux: p.formationANiveaux ?? false,
        prix: p.total,
        paid: p.paid,
        reste: p.remaining,
        enRetard: p.isOverdue,
        enPromotion: p.enPromotion,
        prixPromotion: p.prixPromotion,
        groupEnPromotion: p.groupEnPromotion,
        groupPrixPromotion: p.groupPrixPromotion,
        tranches: p.tranches ?? {},
      }));
  }, [paiements]);
  const groupesDisponibles = useMemo(() => {
    const scoped = formationFilter
      ? rows.filter((r) => String(r.formationId) === String(formationFilter))
      : rows;
    const noms = new Set(scoped.map((r) => r.groupeNom).filter((n) => n && n !== '—'));
    return Array.from(noms).sort((a, b) => a.localeCompare(b));
  }, [rows, formationFilter]);

  // The level filter only makes sense once a specific formation is chosen
  // AND that formation actually supports levels (a_niveaux).
  const formationSelectionneeANiveaux = useMemo(() => {
    if (!formationFilter) return false;
    const f = formations.find((f) => String(f.id) === String(formationFilter));
    return f?.a_niveaux ?? false;
  }, [formationFilter, formations]);

  const niveauxDisponibles = useMemo(() => {
    if (!formationSelectionneeANiveaux) return [];
    const scoped = rows.filter((r) => String(r.formationId) === String(formationFilter));
    const noms = new Set(scoped.map((r) => r.niveauNom).filter(Boolean));
    return Array.from(noms).sort((a, b) => a.localeCompare(b));
  }, [rows, formationFilter, formationSelectionneeANiveaux]);

  const totalPaye = (row) => row.paid ?? 0;
  const resteAPayer = (row) => row.reste ?? null;
  const estEnRetard = (row) => !!row.enRetard;

  // 'complet' | 'en_retard' | 'en_attente' — same buckets as the row color logic.
  const statutPaiement = (row) => {
    const reste = resteAPayer(row);
    if (reste != null && reste <= 0) return 'complet';
    if (estEnRetard(row)) return 'en_retard';
    return 'en_attente';
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
    const matchGroupe = !groupeFilter || r.groupeNom === groupeFilter;
    const matchNiveau = !formationSelectionneeANiveaux || !niveauFilter || r.niveauNom === niveauFilter;
    const matchStatutPaiement = !statutPaiementFilter || statutPaiement(r) === statutPaiementFilter;
    return matchSearch && matchFormation && matchGroupe && matchNiveau && matchStatutPaiement && rowMatchPeriode(r);
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
  const activeCount = (search ? 1 : 0) + (formationFilter ? 1 : 0) + (groupeFilter ? 1 : 0) + (niveauFilter ? 1 : 0) + (statutPaiementFilter ? 1 : 0) + (periodeActive ? 1 : 0);
  const clearAll = () => { setSearch(''); setFormationFilter(''); setGroupeFilter(''); setNiveauFilter(''); setStatutPaiementFilter(''); resetPeriode(); };
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
    { label: 'Scolarité' },
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
            onChange={(e) => { setFormationFilter(e.target.value); setGroupeFilter(''); setNiveauFilter(''); }}
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

        <div className="relative flex items-center">
          <Users size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none z-10" />
          <select
            value={groupeFilter}
            onChange={(e) => setGroupeFilter(e.target.value)}
            className={`appearance-none pl-8 pr-7 py-1.5 text-xs rounded-full bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer min-w-[180px]
              ${groupeFilter ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}
          >
            <option value="">Tous les groupes</option>
            {groupesDisponibles.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          {groupeFilter && (
            <button onClick={() => setGroupeFilter('')} className="absolute right-2 text-slate-300 hover:text-red-400">
              <X size={11} />
            </button>
          )}
        </div>

        {formationSelectionneeANiveaux && (
          <>
            <div className="w-px h-5 bg-[#E2E8F0]" />
            <div className="relative flex items-center">
              <GraduationCap size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none z-10" />
              <select
                value={niveauFilter}
                onChange={(e) => setNiveauFilter(e.target.value)}
                className={`appearance-none pl-8 pr-7 py-1.5 text-xs rounded-full bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer min-w-[160px]
                  ${niveauFilter ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}
              >
                <option value="">Tous les niveaux</option>
                {niveauxDisponibles.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              {niveauFilter && (
                <button onClick={() => setNiveauFilter('')} className="absolute right-2 text-slate-300 hover:text-red-400">
                  <X size={11} />
                </button>
              )}
            </div>
          </>
        )}

        <div className="w-px h-5 bg-[#E2E8F0]" />

        <div className="relative flex items-center">
          <Clock size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none z-10" />
          <select
            value={statutPaiementFilter}
            onChange={(e) => setStatutPaiementFilter(e.target.value)}
            className={`appearance-none pl-8 pr-7 py-1.5 text-xs rounded-full bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer min-w-[170px]
              ${statutPaiementFilter ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}
          >
            <option value="">Tous les statuts</option>
            <option value="en_retard">En retard</option>
            <option value="en_attente">En attente</option>
            <option value="complet">Soldé</option>
          </select>
          {statutPaiementFilter && (
            <button onClick={() => setStatutPaiementFilter('')} className="absolute right-2 text-slate-300 hover:text-red-400">
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
                    <td colSpan={9} className="text-center py-10 text-slate-400 bg-white">Aucun revenu trouvé.</td>
                  </tr>
                ) : filtered.map((row) => {
                  const paid = totalPaye(row);
                  const reste = resteAPayer(row);
                  const enRetard = estEnRetard(row);
                  const rowBg = enRetard ? 'bg-red-50' : (reste != null && reste <= 0) ? 'bg-emerald-50' : 'bg-amber-50';

                  return (
                    <tr
                      key={row.key}
                      onClick={() => setSelectedRow(row)}
                      className={`hover:opacity-80 transition cursor-pointer ${rowBg}`}
                    >
<td className="px-3 py-2.5 font-medium text-slate-700 text-[11px] border-b border-l border-slate-100">
                        <span className="inline-flex items-center gap-1.5">
                          {row.nom}
                                                 {enRetard && (
                            <span title="En retard — échéance dépassée" className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                          )}
                          {row.enPromotion && (
                            <span title={`Promo étudiant — ${row.prixPromotion != null ? Number(row.prixPromotion).toLocaleString('fr-DZ') : '—'} DA`}
                              className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#0369A1] text-white whitespace-nowrap">
                              <User size={9} /> Promo
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-slate-100">{row.telephone}</td>
                     <td className="px-3 py-2.5 text-slate-500 border-b border-slate-100 max-w-[150px] truncate">
  <span className="inline-flex items-center gap-1.5">
    {row.formationNom}
    {row.formationANiveaux && row.niveauNom && (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">
        {row.niveauNom}
      </span>
    )}
  </span>
</td>
                      <td className="px-3 py-2.5 text-right text-slate-500 whitespace-nowrap border-b border-slate-100">
                        <span className="inline-flex items-center gap-1.5 justify-end">
                          {row.groupeNom}
                          {row.groupEnPromotion && (
                            <span title={`Promo groupe — ${row.groupPrixPromotion != null ? Number(row.groupPrixPromotion).toLocaleString('fr-DZ') : '—'} DA`}
                              
                              className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 whitespace-nowrap">
                              <Users size={9} /> Promo
                            </span>
                          )}
                          {row.groupeStatut && (
                            <span title={`Statut du groupe — ${row.groupeStatut}`}
                              className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                                row.groupeStatut === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                row.groupeStatut === 'termine' ? 'bg-slate-200 text-slate-600' :
                                row.groupeStatut === 'suspendu' ? 'bg-red-100 text-red-600' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                              <Layers size={9} /> {row.groupeStatut}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-500 whitespace-nowrap border-b border-slate-100">{row.professeurNom}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap border-b border-slate-100">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          row.statutScolarite === 'abandonne' ? 'bg-red-50 text-red-500' :
                          row.statutScolarite === 'termine' ? 'bg-slate-100 text-slate-500' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {row.statutScolarite === 'abandonne' ? 'Abandonné' : row.statutScolarite === 'termine' ? 'Terminé' : 'En cours'}
                        </span>
                      </td>
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