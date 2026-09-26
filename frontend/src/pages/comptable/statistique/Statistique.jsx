import { useEffect, useState, Fragment } from 'react';
import {
  Wallet, GraduationCap, CreditCard, TrendingUp, TrendingDown, AlertCircle,
  PiggyBank, Building2, Briefcase, Users, Trophy, Frown, Flame, Coins, Award,
  Layers, CalendarDays, X, BarChart3, ChevronDown, ChevronRight,
} from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';

// ── Helpers ──
const fmt = (n) => Math.round(n || 0).toLocaleString('fr-DZ') + ' DA';

// ── Composants (même style que Préinscription, inchangés) ──
const STAT_COLORS = {
  blue:    { bg: 'bg-[#DCEBFA]',  text: 'text-[#0369A1]' },
  navy:    { bg: 'bg-[#0F2A4A]/5', text: 'text-[#0F2A4A]' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  red:     { bg: 'bg-red-50',     text: 'text-red-500' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-600' },
  slate:   { bg: 'bg-slate-100',  text: 'text-slate-600' },
};

const StatTile = ({ icon: Icon, label, value, color = 'blue' }) => {
  const c = STAT_COLORS[color];
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-[#F1F5F9] px-4 py-3">
      <div className={`w-9 h-9 rounded-full ${c.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} className={c.text} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-slate-800 leading-none truncate">{value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
};

const TONES = {
  emerald: { box: 'border-emerald-100 bg-emerald-50/50', icon: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-700' },
  red:     { box: 'border-red-100 bg-red-50/50',         icon: 'bg-red-100 text-red-600',         text: 'text-red-600' },
  amber:   { box: 'border-amber-100 bg-amber-50/50',     icon: 'bg-amber-100 text-amber-700',     text: 'text-amber-700' },
  blue:    { box: 'border-sky-100 bg-[#DCEBFA]/40',      icon: 'bg-[#DCEBFA] text-[#0369A1]',     text: 'text-[#0369A1]' },
};

const Highlight = ({ icon: Icon, label, name, value, sub, tone }) => {
  const t = TONES[tone];
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${t.box}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.icon}`}><Icon size={16} /></div>
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] uppercase tracking-wide font-medium ${t.text}`}>{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{name || '—'}</p>
        {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
      </div>
      <span className={`text-sm font-bold whitespace-nowrap ${t.text}`}>{value}</span>
    </div>
  );
};

const Card = ({ icon: Icon, title, children, className = '' }) => (
  <div className={`bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] p-5 ${className}`}>
    <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
      <Icon size={15} className="text-[#0369A1]" /> {title}
    </h2>
    {children}
  </div>
);

const Statistique = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const hasFilter = !!(dateFrom || dateTo);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [expanded, setExpanded] = useState({}); // { [formationId]: bool } — replie/déplie les niveaux

  useEffect(() => {
    let cancelled = false;

    const fetchStatistiques = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const params = new URLSearchParams();
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);

        // TODO : adapter à ton client API existant (base URL + header d'auth).
        // Exemple ci-dessous avec un token stocké en localStorage — remplace
        // par ton instance axios / apiFetch si tu en as déjà une dans le projet.
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/comptable/statistiques?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Erreur lors du chargement des statistiques.');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setErrorMsg(err.message || 'Erreur serveur');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStatistiques();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  const toggleNiveaux = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const th = 'text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase whitespace-nowrap';
  const td = 'px-3 py-2.5 border-b border-slate-100 whitespace-nowrap';

  if (loading && !data) {
    return (
      <ComptableLayout>
        <p className="text-sm text-slate-400 py-10 text-center">Chargement des statistiques…</p>
      </ComptableLayout>
    );
  }

  if (errorMsg && !data) {
    return (
      <ComptableLayout>
        <p className="text-sm text-red-500 py-10 text-center">{errorMsg}</p>
      </ComptableLayout>
    );
  }

  const t = data?.totaux ?? {};
  const c = data?.classement ?? {};
  const formations = data?.formations ?? [];

  return (
    <ComptableLayout>
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
          <BarChart3 size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Statistiques</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            {hasFilter ? `Période : ${dateFrom || '…'} → ${dateTo || '…'}` : 'Totaux — toutes les périodes'}
          </p>
        </div>
      </div>

      {/* Filtre période */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 border border-[#E2E8F0]">
          <CalendarDays size={12} className="text-[#0369A1] flex-shrink-0" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className={`text-xs bg-transparent focus:outline-none transition ${dateFrom ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
          <span className="text-[#0369A1]/40 text-[10px] font-bold px-0.5">–</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className={`text-xs bg-transparent focus:outline-none transition ${dateTo ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
        </div>
        {hasFilter && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
            <X size={11} /> Tout effacer
          </button>
        )}
        {loading && <span className="text-[11px] text-slate-400 ml-2">Actualisation…</span>}
      </div>

      {/* Cartes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatTile icon={PiggyBank}   label="Total des revenus"       value={fmt(t.totalRevenus)}      color="blue" />
        <StatTile icon={Wallet}      label="Revenus des formations"  value={fmt(t.revenusFormations)} color="navy" />
        <StatTile icon={Briefcase}   label="Part des enseignants et autres employés" value={fmt((t.partEnseignants || 0) + (t.totalEmployes || 0))} color="purple" />
        <StatTile icon={(t.beneficeInformica ?? 0) >= 0 ? TrendingUp : TrendingDown}
                  label="Bénéfices d'Informica" value={fmt(t.beneficeInformica)}
                  color={(t.beneficeInformica ?? 0) >= 0 ? 'emerald' : 'red'} />
        <StatTile icon={CreditCard}  label="Dettes des étudiants"    value={fmt(t.dettes)}            color="amber" />
        <StatTile icon={AlertCircle} label="Clients en crédit"       value={t.clientsCredit ?? 0}      color="red" />
        <StatTile icon={Building2}   label="Total des charges"       value={fmt(t.totalCharges)}      color="slate" />
      </div>

      {/* Tableau */}
      <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden mb-4">
        <div className="px-5 pt-4 pb-3">
          <h2 className="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
            <GraduationCap size={15} className="text-[#0369A1]" /> Encaissement &amp; crédit par formation
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#0F2A4A]">
              <tr>
                <th className={th}>Formation</th>
                <th className={`${th} text-center`}>Étudiants</th>
                <th className={`${th} text-center`}>Groupes</th>
                <th className={`${th} text-right`}>Revenus</th>
                <th className={`${th} text-right`}>Charges</th>
                <th className={`${th} text-right`}>Part enseignant</th>
                <th className={`${th} text-right`}>Bénéfices</th>
                <th className={`${th} text-right`}>Attendu</th>
                <th className={`${th} text-right`}>Encaissé</th>
                <th className={`${th} text-right`}>Crédit</th>
                <th className={`${th} text-center`}>Nb en crédit</th>
              </tr>
            </thead>
            <tbody>
              {formations.map((f, i) => (
                <Fragment key={f.id}>
                  <tr className={`hover:bg-slate-50 transition ${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                    <td className={td}>
                      <button
                        type="button"
                        disabled={!f.a_niveaux}
                        onClick={() => toggleNiveaux(f.id)}
                        className={`flex items-center gap-1 ${f.a_niveaux ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        {f.a_niveaux && (
                          expanded[f.id]
                            ? <ChevronDown size={12} className="text-slate-400" />
                            : <ChevronRight size={12} className="text-slate-400" />
                        )}
                        <span className="bg-[#DCEBFA] text-[#0369A1] px-2 py-0.5 rounded-full text-[11px] font-medium">{f.nom}</span>
                      </button>
                    </td>
                    <td className={`${td} text-center text-slate-500`}>{f.nb_etudiants}</td>
                    <td className={`${td} text-center text-slate-500`}>{f.nb_groupes}</td>
                    <td className={`${td} text-right font-semibold text-[#0369A1]`}>{fmt(f.revenus)}</td>
                    <td className={`${td} text-right text-slate-500`}>{fmt(f.charges)}</td>
                    <td className={`${td} text-right text-slate-500`}>{fmt(f.partEns)}</td>
                    <td className={`${td} text-right font-semibold ${f.benefice >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(f.benefice)}</td>
                    <td className={`${td} text-right text-slate-500`}>{fmt(f.attendu)}</td>
                    <td className={`${td} text-right text-slate-500`}>{fmt(f.encaisse)}</td>
                    <td className={`${td} text-right`}>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${f.credit > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {fmt(f.credit)}
                      </span>
                    </td>
                    <td className={`${td} text-center text-slate-500`}>{f.nbCredit}</td>
                  </tr>

                  {/* Détail par niveau — visible seulement si la formation a des niveaux et est dépliée */}
                  {f.a_niveaux && expanded[f.id] && f.niveaux.map((n) => (
                    <tr key={n.id} className="bg-[#F8FBFF]">
                      <td className={`${td} pl-9 text-slate-500`}>{n.nom}</td>
                      <td className={`${td} text-center text-slate-400`}>{n.nb_etudiants}</td>
                      <td className={td}></td>
                      <td className={td}></td>
                      <td className={td}></td>
                      <td className={td}></td>
                      <td className={td}></td>
                      <td className={`${td} text-right text-slate-400`}>{fmt(n.attendu)}</td>
                      <td className={td}></td>
                      <td className={td}></td>
                      <td className={td}></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 px-5 py-3">
          Revenus, charges, part enseignant et crédit suivent la période choisie. Attendu est le total dû (calculé selon niveaux/promotions/échéancier).
        </p>
      </div>

      {/* Personnel + Classement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card icon={Briefcase} title="Paiements du personnel">
          <div className="space-y-3">
            <Highlight icon={GraduationCap} tone="blue" label="Total payé aux professeurs" name="Enseignants" value={fmt(t.partEnseignants)} />
            <Highlight icon={Users} tone="amber" label="Total payé aux employés" name="Tous les autres employés" value={fmt(t.totalEmployes)} />
          </div>
        </Card>

        <Card icon={Trophy} title="Classement rentabilité">
          <div className="space-y-3">
            <Highlight icon={Trophy} tone="emerald" label="Formation la plus rentable"
              name={c.plusRentable?.nom} value={fmt(c.plusRentable?.benefice ?? 0)}
              sub={`${c.plusRentable?.nb_etudiants ?? 0} étudiants`} />
            <Highlight icon={Frown} tone="red" label="Formation la moins rentable"
              name={c.moinsRentable?.nom} value={fmt(c.moinsRentable?.benefice ?? 0)}
              sub={`${c.moinsRentable?.nb_etudiants ?? 0} étudiants`} />
          </div>
        </Card>
      </div>

      {/* Points clés */}
      <Card icon={Layers} title="Points clés">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Highlight icon={Flame} tone="red" label="Catégorie de charges la plus coûteuse"
            name={c.topCharge?.nom} value={fmt(c.topCharge?.montant ?? 0)}
            sub={t.totalCharges > 0 && c.topCharge ? `${((c.topCharge.montant / t.totalCharges) * 100).toFixed(0)}% des charges` : null} />
          <Highlight icon={Coins} tone="emerald" label="Catégorie de revenu la plus rentable"
            name={c.topRevenu?.nom} value={fmt(c.topRevenu?.montant ?? 0)} />
          <Highlight icon={Award} tone="blue" label="Formation avec le plus de revenus"
            name={c.plusRevenus?.nom} value={fmt(c.plusRevenus?.revenus ?? 0)}
            sub={`${c.plusRevenus?.nb_etudiants ?? 0} étudiants`} />
          <Highlight icon={Building2} tone="amber" label="Formation avec le plus de charges"
            name={c.plusCharges?.nom} value={fmt(c.plusCharges?.coutTotal ?? 0)}
            sub={`${c.plusCharges?.nb_etudiants ?? 0} étudiants · charges + part enseignant`} />
        </div>
      </Card>
    </ComptableLayout>
  );
};

export default Statistique;