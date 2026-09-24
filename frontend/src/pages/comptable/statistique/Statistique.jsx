import { useMemo, useState } from 'react';
import {
  Wallet, GraduationCap, CreditCard, TrendingUp, TrendingDown, AlertCircle,
  PiggyBank, Building2, Briefcase, Users, Trophy, Frown, Flame, Coins, Award,
  Layers, CalendarDays, X, BarChart3,
} from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';

// ============================================================
// Données de test — à remplacer par l'API (paiements, charges, salaires)
// ============================================================


const FORMATIONS = [
  { nom: 'Comptabilité', etudiants: 45, groupes: 2, prix: 25000 },
  { nom: 'Informatique', etudiants: 20, groupes: 1, prix: 30000 },
  { nom: 'Marketing',    etudiants: 18, groupes: 1, prix: 22000 },
];

const toRows = (list, keys) => list.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i]])));

const PAIEMENTS = toRows([
  ['Comptabilité', '2026-09-05', 180000], ['Comptabilité', '2026-08-12', 220000],
  ['Comptabilité', '2026-06-20', 250000], ['Comptabilité', '2026-02-10', 200000],
  ['Informatique', '2026-09-08', 120000], ['Informatique', '2026-07-15', 160000],
  ['Informatique', '2026-03-05', 200000],
  ['Marketing',    '2026-09-02', 90000],  ['Marketing',    '2026-08-01', 110000],
  ['Marketing',    '2026-04-18', 120000],
], ['formation', 'date', 'montant']);

const AUTRES_REVENUS = toRows([
  ['Dons / subventions', '2026-08-20', 170000], ['Partenariats / sponsoring', '2026-09-10', 85000],
  ["Frais d'événements", '2026-07-05', 39500],  ['Location de salle', '2026-09-15', 24800],
  ['Vente de matériel', '2026-05-12', 12800],
], ['categorie', 'date', 'montant']);

const CHARGES = toRows([
  ['Loyer', '2026-09-01', 80000], ['Loyer', '2026-08-01', 80000],
  ['Matériel pédagogique', '2026-09-12', 60000],
  ['Électricité / eau', '2026-09-20', 25000], ['Électricité / eau', '2026-08-20', 25000],
  ['Entretien', '2026-08-25', 30000],
], ['categorie', 'date', 'montant']);

const SALAIRES_PROFS = toRows([
  ['Comptabilité', '2026-09-01', 24000], ['Comptabilité', '2026-08-01', 24000],
  ['Informatique', '2026-09-01', 16000], ['Informatique', '2026-08-01', 16000],
  ['Marketing',    '2026-09-01', 11000], ['Marketing',    '2026-08-01', 11000],
], ['formation', 'date', 'montant']);

const SALAIRES_EMPLOYES = toRows([
  ['Secrétaire', '2026-09-01', 60000], ['Secrétaire', '2026-08-01', 60000],
  ["Agent d'entretien", '2026-09-01', 32500], ["Agent d'entretien", '2026-08-01', 32500],
], ['nom', 'date', 'montant']);

// ── Helpers ──
const fmt = (n) => Math.round(n).toLocaleString('fr-DZ') + ' DA';
const sum = (list) => list.reduce((s, x) => s + x.montant, 0);

const topBy = (list) => {
  const map = {};
  list.forEach((x) => { map[x.categorie] = (map[x.categorie] || 0) + x.montant; });
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return entries.length ? { nom: entries[0][0], montant: entries[0][1] } : null;
};

// ── Composants (même style que Préinscription) ──
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

  const s = useMemo(() => {
    // Sans filtre : tout est compté (totaux)
    const inRange = (r) => (!dateFrom || r.date >= dateFrom) && (!dateTo || r.date <= dateTo);

    const charges  = CHARGES.filter(inRange);
    const autres   = AUTRES_REVENUS.filter(inRange);
    const paiP     = PAIEMENTS.filter(inRange);
    const profs    = SALAIRES_PROFS.filter(inRange);
    const employes = SALAIRES_EMPLOYES.filter(inRange);

    const totalCharges = sum(charges);
    const totalEtudiants = FORMATIONS.reduce((a, f) => a + f.etudiants, 0) || 1;

    const formations = FORMATIONS.map((f) => {
      const revenus = sum(paiP.filter((p) => p.formation === f.nom));
      const partEns = sum(profs.filter((p) => p.formation === f.nom));
      const chargesF = totalCharges * (f.etudiants / totalEtudiants);
      const attendu = f.etudiants * f.prix;
      const encaisse = sum(PAIEMENTS.filter((p) => p.formation === f.nom)); // cumul
      const credit = Math.max(attendu - encaisse, 0);
      return {
        ...f, revenus, partEns, charges: chargesF, coutTotal: chargesF + partEns,
        benefice: revenus - chargesF - partEns, attendu, encaisse, credit,
        nbCredit: credit > 0 ? Math.max(1, Math.round(credit / f.prix)) : 0,
      };
    });

    const revenusFormations = formations.reduce((a, f) => a + f.revenus, 0);
    const best = (key, dir) => [...formations].sort((a, b) => dir * (b[key] - a[key]))[0];

    return {
      formations, totalCharges, revenusFormations,
      totalRevenus: revenusFormations + sum(autres),
      partEnseignants: sum(profs),
      totalEmployes: sum(employes),
      dettes: formations.reduce((a, f) => a + f.credit, 0),
      clientsCredit: formations.reduce((a, f) => a + f.nbCredit, 0),
      topCharge: topBy(charges),
      topRevenu: topBy(autres),
      plusRentable: best('benefice', 1),
      moinsRentable: best('benefice', -1),
      plusRevenus: best('revenus', 1),
      plusCharges: best('coutTotal', 1),
    };
  }, [dateFrom, dateTo]);

  const beneficeInformica = s.totalRevenus - s.totalCharges - s.partEnseignants - s.totalEmployes;
  const th = 'text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase whitespace-nowrap';
  const td = 'px-3 py-2.5 border-b border-slate-100 whitespace-nowrap';

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
      </div>

      {/* Cartes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatTile icon={PiggyBank}   label="Total des revenus"       value={fmt(s.totalRevenus)}      color="blue" />
        <StatTile icon={Wallet}      label="Revenus des formations"  value={fmt(s.revenusFormations)} color="navy" />
<StatTile icon={Briefcase}   label="Part des enseignants et autres employés" value={fmt(s.partEnseignants + s.totalEmployes)}   color="purple" />
        <StatTile icon={beneficeInformica >= 0 ? TrendingUp : TrendingDown}
                  label="Bénéfices d'Informica" value={fmt(beneficeInformica)}
                  color={beneficeInformica >= 0 ? 'emerald' : 'red'} />
        <StatTile icon={CreditCard}  label="Dettes des étudiants"    value={fmt(s.dettes)}            color="amber" />
        <StatTile icon={AlertCircle} label="Clients en crédit"       value={s.clientsCredit}          color="red" />
        <StatTile icon={Building2}   label="Total des charges"       value={fmt(s.totalCharges)}      color="slate" />
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
              {s.formations.map((f, i) => (
                <tr key={f.nom} className={`hover:bg-slate-50 transition ${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                  <td className={td}>
                    <span className="bg-[#DCEBFA] text-[#0369A1] px-2 py-0.5 rounded-full text-[11px] font-medium">{f.nom}</span>
                  </td>
                  <td className={`${td} text-center text-slate-500`}>{f.etudiants}</td>
                  <td className={`${td} text-center text-slate-500`}>{f.groupes}</td>
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
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 px-5 py-3">
          Revenus, charges, part enseignant et bénéfices suivent la période choisie. Attendu, encaissé et crédit sont toujours cumulés.
        </p>
      </div>

      {/* Personnel + Classement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card icon={Briefcase} title="Paiements du personnel">
          <div className="space-y-3">
            <Highlight icon={GraduationCap} tone="blue" label="Total payé aux professeurs" name="Enseignants" value={fmt(s.partEnseignants)} />
            <Highlight icon={Users} tone="amber" label="Total payé aux employés" name="Tous les autres employés" value={fmt(s.totalEmployes)} />
          </div>
        </Card>

        <Card icon={Trophy} title="Classement rentabilité">
          <div className="space-y-3">
            <Highlight icon={Trophy} tone="emerald" label="Formation la plus rentable"
              name={s.plusRentable?.nom} value={fmt(s.plusRentable?.benefice ?? 0)}
              sub={`${s.plusRentable?.etudiants ?? 0} étudiants`} />
            <Highlight icon={Frown} tone="red" label="Formation la moins rentable"
              name={s.moinsRentable?.nom} value={fmt(s.moinsRentable?.benefice ?? 0)}
              sub={`${s.moinsRentable?.etudiants ?? 0} étudiants`} />
          </div>
        </Card>
      </div>

      {/* Points clés */}
      <Card icon={Layers} title="Points clés">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Highlight icon={Flame} tone="red" label="Catégorie de charges la plus coûteuse"
            name={s.topCharge?.nom} value={fmt(s.topCharge?.montant ?? 0)}
            sub={s.totalCharges > 0 && s.topCharge ? `${((s.topCharge.montant / s.totalCharges) * 100).toFixed(0)}% des charges` : null} />
          <Highlight icon={Coins} tone="emerald" label="Catégorie de revenu la plus rentable"
            name={s.topRevenu?.nom} value={fmt(s.topRevenu?.montant ?? 0)} />
          <Highlight icon={Award} tone="blue" label="Formation avec le plus de revenus"
            name={s.plusRevenus?.nom} value={fmt(s.plusRevenus?.revenus ?? 0)}
            sub={`${s.plusRevenus?.etudiants ?? 0} étudiants`} />
          <Highlight icon={Building2} tone="amber" label="Formation avec le plus de charges"
            name={s.plusCharges?.nom} value={fmt(s.plusCharges?.coutTotal ?? 0)}
            sub={`${s.plusCharges?.etudiants ?? 0} étudiants · charges + part enseignant`} />
        </div>
      </Card>
    </ComptableLayout>
  );
};

export default Statistique;