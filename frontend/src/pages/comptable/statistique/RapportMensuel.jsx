import { useMemo, useState } from 'react';
import {
  FileText, X, CalendarDays, GraduationCap, Receipt, Wallet, Users, Briefcase, ChevronDown,
} from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';

// ============================================================
// Données de test — à remplacer par l'API
// ============================================================
const FORMATIONS = [
  { nom: 'Comptabilité', tarifMensuel: 12000, groupes: [{ nom: 'Groupe 1', etudiants: 25 }, { nom: 'Groupe 2', etudiants: 20 }] },
  { nom: 'Informatique', tarifMensuel: 15000, groupes: [{ nom: 'Groupe 1', etudiants: 20 }] },
  { nom: 'Marketing',    tarifMensuel: 10000, groupes: [{ nom: 'Groupe 1', etudiants: 18 }] },
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

const CHARGES_FORMATION = toRows([
  ['Comptabilité', 'Matériel pédagogique', '2026-09-12', 40000],
  ['Informatique', 'Licences logiciels',   '2026-09-14', 35000],
  ['Marketing',    'Supports de cours',    '2026-08-18', 15000],
  ['Marketing',    'Location matériel',    '2026-09-18', 12000],
  ['Comptabilité', 'Supports de cours',    '2026-08-10', 20000],
], ['formation', 'categorie', 'date', 'montant']);

const CHARGES_AUTRES = toRows([
  ['Loyer', '2026-09-01', 80000], ['Loyer', '2026-08-01', 80000],
  ['Électricité / eau', '2026-09-20', 25000], ['Électricité / eau', '2026-08-20', 25000],
  ['Entretien', '2026-08-25', 30000],
], ['categorie', 'date', 'montant']);

// Mode de rémunération de chaque professeur : 'heure' | 'pourcentage' | 'fixe'
const PROFS_INFO = {
  'M. Benali': { formation: 'Comptabilité', type: 'pourcentage', pourcentage: 40 },
  'Mme Saidi': { formation: 'Informatique', type: 'heure', tauxHeure: 800 },
  'M. Kaci':   { formation: 'Marketing',    type: 'fixe' },
};

const SALAIRES_PROFS = toRows([
  ['M. Benali', 'Comptabilité', '2026-09-01', 24000], ['M. Benali', 'Comptabilité', '2026-08-01', 24000],
  ['Mme Saidi', 'Informatique', '2026-09-01', 16000], ['Mme Saidi', 'Informatique', '2026-08-01', 16000],
  ['M. Kaci',   'Marketing',    '2026-09-01', 11000], ['M. Kaci',   'Marketing',    '2026-08-01', 11000],
], ['nom', 'formation', 'date', 'montant']);

// Mode de rémunération de chaque employé : 'fixe' | 'jour' | 'heure'
const EMPLOYES = [
  { nom: 'Nadia Hamidi', poste: 'Secrétaire',        type: 'fixe', salaire: 60000 },
  { nom: 'Karim Bouzid', poste: "Agent d'entretien", type: 'jour', tauxJour: 1500 },
];

const SALAIRES_EMPLOYES = toRows([
  ['Nadia Hamidi', '2026-09-01', 60000], ['Nadia Hamidi', '2026-08-01', 60000],
  ['Karim Bouzid', '2026-09-01', 32500], ['Karim Bouzid', '2026-08-01', 32500],
], ['nom', 'date', 'montant']);

// ── Helpers ──
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const fmt = (n) => Math.round(n).toLocaleString('fr-DZ') + ' DA';
const sum = (list) => list.reduce((s, x) => s + x.montant, 0);
const ym = (year, m) => `${year}-${String(m + 1).padStart(2, '0')}`;

const profDetail = (nom, montant) => {
  const info = PROFS_INFO[nom];
  if (!info) return '';
  if (info.type === 'heure') return `${(montant / info.tauxHeure).toFixed(1)} h × ${fmt(info.tauxHeure)}/h`;
  if (info.type === 'pourcentage') return `${info.pourcentage}% du revenu de la formation`;
  return 'Fixe';
};

const empDetail = (e, montant) => {
  if (e.type === 'jour') return `${Math.round(montant / e.tauxJour)} j × ${fmt(e.tauxJour)}/j`;
  if (e.type === 'heure') return `${(montant / e.tauxHeure).toFixed(1)} h × ${fmt(e.tauxHeure)}/h`;
  return 'Fixe';
};

const buildReport = (key) => {
  const inMonth = (r) => r.date.startsWith(key);
  const paiements = PAIEMENTS.filter(inMonth);
  const autresRev = AUTRES_REVENUS.filter(inMonth);
  const chF = CHARGES_FORMATION.filter(inMonth);
  const chA = CHARGES_AUTRES.filter(inMonth);
  const profs = SALAIRES_PROFS.filter(inMonth);
  const emp = SALAIRES_EMPLOYES.filter(inMonth);

  const formations = FORMATIONS.map((f) => {
    const etudiants = f.groupes.reduce((a, g) => a + g.etudiants, 0);
    const charges = chF.filter((c) => c.formation === f.nom);
    return {
      ...f,
      etudiants,
      obtenu: sum(paiements.filter((p) => p.formation === f.nom)),
      attendu: etudiants * f.tarifMensuel,
      charges,
      chargesTotal: sum(charges),
      profPaiements: profs.filter((p) => p.formation === f.nom),
      profTotal: sum(profs.filter((p) => p.formation === f.nom)),
    };
  }).map((f) => ({ ...f, benefice: f.obtenu - f.chargesTotal - f.profTotal }));

  const revenuAttenduTotal = formations.reduce((a, f) => a + f.attendu, 0);
  const revenuObtenuTotal = sum(paiements);
  const chFTotal = sum(chF);
  const autresRevTotal = sum(autresRev);
  const chATotal = sum(chA);
  const profsTotal = sum(profs);
  const empTotal = sum(emp);
  const totalSalaires = profsTotal + empTotal;
  const totalRevenus = revenuObtenuTotal + autresRevTotal;
  const totalCharges = chFTotal + chATotal + totalSalaires;

  return {
    formations, autresRev, chF, chA, profs, emp,
    revenuAttenduTotal, revenuObtenuTotal, chFTotal, autresRevTotal, chATotal,
    profsTotal, empTotal, totalSalaires, totalRevenus, totalCharges,
    benefice: totalRevenus - totalCharges,
    empty: totalRevenus === 0 && totalCharges === 0,
  };
};

const allYears = () => {
  const set = new Set([String(new Date().getFullYear())]);
  [PAIEMENTS, AUTRES_REVENUS, CHARGES_FORMATION, CHARGES_AUTRES, SALAIRES_PROFS, SALAIRES_EMPLOYES]
    .forEach((list) => list.forEach((r) => set.add(r.date.slice(0, 4))));
  return [...set].sort().reverse();
};

// ── Petits composants du rapport ──
const Section = ({ icon: Icon, title, children }) => (
  <div>
    <h3 className="text-xs font-semibold text-[#1E293B] mb-2 flex items-center gap-1.5">
      <Icon size={13} className="text-[#0369A1]" /> {title}
    </h3>
    {children}
  </div>
);

const Row = ({ left, sub, right, bold }) => (
  <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0 text-xs">
    <div className="min-w-0">
      <p className={`truncate ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{left}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
    <span className={`whitespace-nowrap ${bold ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>{right}</span>
  </div>
);

const Empty = () => <p className="text-[11px] text-slate-400 py-1">Aucune donnée ce mois-ci.</p>;

const Total = ({ label, value, color }) => (
  <div className={`rounded-xl px-3 py-2.5 ${color}`}>
    <p className="text-[11px] opacity-80">{label}</p>
    <p className="text-sm font-bold">{value}</p>
  </div>
);

const FormationBlock = ({ f }) => (
  <div className="mb-3 last:mb-0 rounded-lg border border-slate-100 p-2.5">
    <div className="flex items-center justify-between text-xs mb-0.5">
      <p className="font-semibold text-slate-800">{f.nom}</p>
      <span className="text-[11px] text-slate-400">{f.etudiants} étudiants</span>
    </div>
    <p className="text-[11px] text-slate-400 mb-1.5">
      {f.groupes.map((g) => `${g.nom} (${g.etudiants})`).join(', ')}
    </p>
    <div className="grid grid-cols-2 gap-2 mb-1.5">
      <div className="text-[11px] text-slate-500">Attendu
        <span className="block font-semibold text-slate-700">{fmt(f.attendu)}</span>
      </div>
      <div className="text-[11px] text-slate-500">Obtenu
        <span className="block font-semibold text-[#0369A1]">{fmt(f.obtenu)}</span>
      </div>
    </div>
    <p className="text-[11px] font-medium text-slate-500 mb-0.5">Charges ({f.charges.length})</p>
    {f.charges.length === 0 ? <Empty /> : f.charges.map((c, i) => (
      <Row key={i} left={c.categorie} sub={c.date} right={fmt(c.montant)} />
    ))}
    {f.charges.length > 0 && <Row bold left="Total charges de la formation" right={fmt(f.chargesTotal)} />}
    {f.profPaiements.map((p, i) => (
      <Row key={i} left={p.nom} sub={profDetail(p.nom, p.montant)} right={fmt(p.montant)} />
    ))}
    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
      <span className="font-semibold text-slate-700">Bénéfice de la formation</span>
      <span className={`font-bold ${f.benefice >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(f.benefice)}</span>
    </div>
  </div>
);

const ReportModal = ({ title, r, onClose }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-white rounded-md shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
        <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
            <FileText size={14} className="text-white" />
          </span>
          Rapport — {title}
        </h2>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-3 gap-2">
          <Total label="Revenu total" value={fmt(r.totalRevenus)} color="bg-[#DCEBFA] text-[#0369A1]" />
          <Total label="Charges totales" value={fmt(r.totalCharges)} color="bg-slate-100 text-slate-700" />
          <Total label="Bénéfices de l'école" value={fmt(r.benefice)} color={r.benefice >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'} />
        </div>

        <Section icon={GraduationCap} title="Formations — revenus et charges">
          {r.formations.map((f) => <FormationBlock key={f.nom} f={f} />)}
          <div className="grid grid-cols-3 gap-2 mt-1 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <div>Total attendu<span className="block font-bold text-slate-800">{fmt(r.revenuAttenduTotal)}</span></div>
            <div>Total obtenu<span className="block font-bold text-[#0369A1]">{fmt(r.revenuObtenuTotal)}</span></div>
            <div>Total charges<span className="block font-bold text-slate-800">{fmt(r.chFTotal)}</span></div>
          </div>
        </Section>

        <Section icon={Wallet} title="Autres revenus">
          {r.autresRev.length === 0 ? <Empty /> : r.autresRev.map((x, i) => (
            <Row key={i} left={x.categorie} sub={x.date} right={fmt(x.montant)} />
          ))}
          {r.autresRev.length > 0 && <Row bold left="Total autres revenus" right={fmt(r.autresRevTotal)} />}
        </Section>

        <Section icon={Receipt} title="Autres charges">
          {r.chA.length === 0 ? <Empty /> : r.chA.map((x, i) => (
            <Row key={i} left={x.categorie} sub={x.date} right={fmt(x.montant)} />
          ))}
          {r.chA.length > 0 && <Row bold left="Total autres charges" right={fmt(r.chATotal)} />}
        </Section>

        <Section icon={Briefcase} title="Professeurs">
          {r.profs.length === 0 ? <Empty /> : r.profs.map((x, i) => (
            <Row key={i} left={x.nom}
              sub={`${(PROFS_INFO[x.nom] || {}).formation || x.formation} · ${profDetail(x.nom, x.montant)}`}
              right={fmt(x.montant)} />
          ))}
          {r.profs.length > 0 && <Row bold left="Total professeurs" right={fmt(r.profsTotal)} />}
        </Section>

        <Section icon={Users} title="Employés">
          {r.emp.length === 0 ? <Empty /> : r.emp.map((p, i) => {
            const e = EMPLOYES.find((x) => x.nom === p.nom) || {};
            return (
              <Row key={i} left={p.nom} sub={`${e.poste || ''} · ${empDetail(e, p.montant)}`} right={fmt(p.montant)} />
            );
          })}
          {r.emp.length > 0 && <Row bold left="Total employés" right={fmt(r.empTotal)} />}
        </Section>
      </div>
    </div>
  </div>
);

const RapportMensuel = () => {
  const years = useMemo(allYears, []);
  const [year, setYear] = useState(years[0]);
  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => MOIS.map((nom, m) => ({ nom, ...buildReport(ym(year, m)) })), [year]);
  const totals = useMemo(() => ({
    revenus: rows.reduce((a, r) => a + r.totalRevenus, 0),
    charges: rows.reduce((a, r) => a + r.totalCharges, 0),
    benefice: rows.reduce((a, r) => a + r.benefice, 0),
  }), [rows]);

  const th = 'text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase whitespace-nowrap';
  const td = 'px-3 py-2.5 border-b border-slate-100 whitespace-nowrap';
  const benefClass = (v) => (v >= 0 ? 'text-emerald-700' : 'text-red-600');

  return (
    <ComptableLayout>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
          <FileText size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Rapport mensuel</h1>
          <p className="text-slate-400 text-xs mt-0.5">Cliquez sur un mois pour voir son rapport détaillé</p>
        </div>
      </div>

      <div className="mb-4 flex items-center">
        <div className="relative flex items-center">
          <CalendarDays size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none" />
          <select value={year} onChange={(e) => setYear(e.target.value)}
            className="appearance-none text-xs rounded-full py-1.5 pr-7 pl-8 bg-white border border-[#E2E8F0] text-[#0369A1] font-medium focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <ChevronDown size={11} className="absolute right-2.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#0F2A4A]">
              <tr>
                <th className={th}>Mois</th>
                <th className={`${th} text-right`}>Total revenus</th>
                <th className={`${th} text-right`}>Total charges</th>
                <th className={`${th} text-right`}>Bénéfices</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.nom} onClick={() => setSelected(i)}
                  className={`cursor-pointer hover:bg-[#DCEBFA]/30 transition ${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'} ${r.empty ? 'text-slate-300' : ''}`}>
                  <td className={`${td} font-medium ${r.empty ? '' : 'text-slate-700'}`}>{r.nom} {year}</td>
                  <td className={`${td} text-right ${r.empty ? '' : 'font-semibold text-[#0369A1]'}`}>{r.empty ? '—' : fmt(r.totalRevenus)}</td>
                  <td className={`${td} text-right ${r.empty ? '' : 'text-slate-600'}`}>{r.empty ? '—' : fmt(r.totalCharges)}</td>
                  <td className={`${td} text-right ${r.empty ? '' : `font-semibold ${benefClass(r.benefice)}`}`}>{r.empty ? '—' : fmt(r.benefice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#DCEBFA]/50">
                <td className="px-3 py-2.5 font-bold text-[#0F2A4A]">Total {year}</td>
                <td className="px-3 py-2.5 text-right font-bold text-[#0369A1]">{fmt(totals.revenus)}</td>
                <td className="px-3 py-2.5 text-right font-bold text-slate-700">{fmt(totals.charges)}</td>
                <td className={`px-3 py-2.5 text-right font-bold ${benefClass(totals.benefice)}`}>{fmt(totals.benefice)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-3">
        Total charges = charges des formations + autres charges + salaires (professeurs et employés).
      </p>

      {selected !== null && (
        <ReportModal title={`${rows[selected].nom} ${year}`} r={rows[selected]} onClose={() => setSelected(null)} />
      )}
    </ComptableLayout>
  );
};

export default RapportMensuel;