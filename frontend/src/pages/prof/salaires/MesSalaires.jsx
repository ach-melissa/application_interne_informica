import { useState, useEffect, useMemo } from 'react';
import { Wallet, CalendarDays, ChevronDown, Coins } from 'lucide-react';
const USE_FAKE = true; // set to false when the endpoint is ready

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const now = new Date();
const fmt = (n) => Math.round(Number(n || 0)).toLocaleString('fr-DZ') + ' DA';

const FAKE = [
  { mois: 9, statut: 'attente', total: 96600, formations: [
    { formation_nom: 'Anglais', type: 'heure', taux_horaire: 1500, montant: 48000, groupes: [
      { nom: 'Groupe A', heures: 14, montant: 21000 },
      { nom: 'Groupe B', heures: 10, montant: 15000 },
      { nom: 'Groupe C', heures: 8,  montant: 12000 },
    ]},
    { formation_nom: 'Développement Web', type: 'pourcentage', pourcentage: 60, montant: 48600, groupes: [
      { nom: 'Groupe 1', montant: 30000 },
      { nom: 'Groupe 2', montant: 18600 },
    ]},
  ]},
  { mois: 8, statut: 'paye', total: 70000, formations: [
    { formation_nom: 'Anglais', type: 'heure', taux_horaire: 1500, montant: 48000, groupes: [
      { nom: 'Groupe A', heures: 20, montant: 30000 },
      { nom: 'Groupe B', heures: 12, montant: 18000 },
    ]},
    { formation_nom: 'Marketing', type: 'pourcentage', pourcentage: 40, montant: 22000, groupes: [
      { nom: 'Groupe 1', montant: 22000 },
    ]},
  ]},
  { mois: 7, statut: 'paye', total: 75000, formations: [
    { formation_nom: 'Anglais', type: 'heure', taux_horaire: 1500, montant: 24000, groupes: [
      { nom: 'Groupe A', heures: 16, montant: 24000 },
    ]},
    { formation_nom: 'Développement Web', type: 'pourcentage', pourcentage: 60, montant: 51000, groupes: [
      { nom: 'Groupe 1', montant: 27000 },
      { nom: 'Groupe 2', montant: 15000 },
      { nom: 'Groupe 3', montant: 9000 },
    ]},
  ]},
  { mois: 6, statut: 'paye', total: 77200, formations: [
    { formation_nom: 'Marketing', type: 'pourcentage', pourcentage: 40, montant: 34000, groupes: [
      { nom: 'Groupe 1', montant: 20000 },
      { nom: 'Groupe 2', montant: 14000 },
    ]},
    { formation_nom: 'Informatique', type: 'heure', taux_horaire: 1800, montant: 43200, groupes: [
      { nom: 'Groupe A', heures: 18, montant: 32400 },
      { nom: 'Groupe B', heures: 6,  montant: 10800 },
    ]},
  ]},
];

const STAT_COLORS = {
  blue:    { bg: 'bg-[#DCEBFA]',  text: 'text-[#0369A1]' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
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

const Line = ({ label, value }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-xs">
    <span className="text-slate-400">{label}</span>
    <span className="font-medium text-slate-700">{value}</span>
  </div>
);

const FormationBlock = ({ f }) => {
  const isHeure = f.type === 'heure';
  const groupes = f.groupes || [];
  const totalHeures = groupes.reduce((a, g) => a + Number(g.heures || 0), 0);

  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-sm font-semibold text-slate-800 truncate">{f.formation_nom}</p>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${
          isHeure ? 'bg-[#DCEBFA] text-[#0369A1]' : 'bg-purple-50 text-purple-600'
        }`}>
          {isHeure ? 'Par heure' : 'Pourcentage'}
        </span>
      </div>

      <Line label="Nombre de groupes" value={groupes.length} />
      {isHeure ? (
        <>
          <Line label="Total des heures" value={`${totalHeures} h`} />
          <Line label="Taux horaire" value={`${fmt(f.taux_horaire)}/h`} />
        </>
      ) : (
        <Line label="Ma part" value={`${f.pourcentage} %`} />
      )}

      <p className="text-[11px] font-medium text-slate-500 mt-3 mb-0.5">Détail par groupe</p>
      {groupes.map((g, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0 text-xs">
          <div className="min-w-0">
            <p className="text-slate-700 truncate">{g.nom}</p>
            {isHeure && (
              <p className="text-[11px] text-slate-400">{g.heures} h × {fmt(f.taux_horaire)}/h</p>
            )}
          </div>
          <span className="font-semibold text-slate-700 whitespace-nowrap">{fmt(g.montant)}</span>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-200 text-xs">
        <span className="font-semibold text-slate-700">Total de la formation</span>
        <span className="font-bold text-[#0369A1]">{fmt(f.montant)}</span>
      </div>
    </div>
  );
};

const MesSalaires = () => {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 0 = all months
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/salaires-professeurs/me?annee=${year}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error();
        setData(await res.json());
      } catch {
        setData([]);
        setError('Impossible de charger les salaires');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year]);

  const months = useMemo(
    () => data
      .filter((m) => month === 0 || Number(m.mois) === month)
      .sort((a, b) => Number(b.mois) - Number(a.mois)),
    [data, month]
  );

  const totals = useMemo(() => ({
    all: months.reduce((a, m) => a + Number(m.total || 0), 0),
  }), [months]);

  const selectCls = 'appearance-none text-xs rounded-full py-1.5 pr-7 pl-8 bg-white border border-[#E2E8F0] text-[#0369A1] font-medium focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
          <Wallet size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Mes salaires</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            {month === 0 ? `Tous les mois — ${year}` : `${MOIS[month - 1]} ${year}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative flex items-center">
          <CalendarDays size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none" />
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selectCls}>
            <option value={0}>Tous les mois</option>
            {MOIS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2.5 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative flex items-center">
          <CalendarDays size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none" />
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectCls}>
            {[0, 1, 2, 3].map((i) => {
              const y = now.getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
          <ChevronDown size={11} className="absolute right-2.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

      {loading ? (
        <p className="text-xs text-slate-400 text-center py-10">Chargement…</p>
      ) : months.length === 0 ? (
        <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] py-10">
          <p className="text-xs text-slate-400 text-center">Aucun salaire pour cette période</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <StatTile icon={Coins} label="Total de la période" value={fmt(totals.all)} color="blue" />
          </div>

          {/* One full-width card per month */}
          <div className="space-y-4">
            {months.map((m) => {
              const paid = m.statut === 'paye';
              return (
                <div key={m.mois} className="w-full bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-[#0F2A4A]">
                    <p className="text-sm font-semibold text-white">{MOIS[Number(m.mois) - 1]} {year}</p>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                      paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {paid ? 'Payé' : 'En attente'}
                    </span>
                  </div>

                  <div className="p-5 grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                    {m.formations.map((f, i) => <FormationBlock key={i} f={f} />)}
                  </div>

                  <div className="flex items-center justify-between px-5 py-3 bg-[#DCEBFA]/50">
                    <span className="text-xs font-bold text-[#0F2A4A]">Total du mois</span>
                    <span className="text-sm font-bold text-[#0369A1]">{fmt(m.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default MesSalaires;