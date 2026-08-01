import { useMemo } from 'react';
import {
  Wallet, Users, GraduationCap, CreditCard, TrendingUp, TrendingDown,
  AlertCircle, PiggyBank, ArrowDownRight, Building2, Briefcase,
  Layers, Trophy, Frown,
} from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';

// ============================================================
// Données de test uniquement — à remplacer par l'API une fois prête.
// Sources visées, une fois branché :
//  - encaissement/crédit + revenu étudiants -> /api/comptable/paiements  (comme PaiementsGlobale)
//  - autres revenus par catégorie           -> /api/comptable/paiements (paiements sans étudiant_id)
//  - coût enseignants + personnel admin     -> /api/comptable/salaires (comme Salaires.jsx)
//  - charges globales                       -> /api/comptable/charges  (comme Charges.jsx)
// ============================================================
const FORMATIONS_STATS = [
  { nom: 'Comptabilité', etudiants: 45, groupes: 2, prixUnitaire: 25000, encaisse: 850000, coutEnseignants: 48000 },
  { nom: 'Informatique', etudiants: 20, groupes: 1, prixUnitaire: 30000, encaisse: 480000, coutEnseignants: 32000 },
  { nom: 'Marketing',    etudiants: 18, groupes: 1, prixUnitaire: 22000, encaisse: 320000, coutEnseignants: 22000 },
];

const AUTRES_REVENUS_CATEGORIES = [
  { categorie: 'Dons / subventions',          montant: 170000 },
  { categorie: 'Partenariats / sponsoring',   montant: 85000 },
  { categorie: "Frais d'événements",          montant: 39500 },
  { categorie: 'Location de salle',           montant: 24800 },
  { categorie: 'Vente de matériel',           montant: 12800 },
];

const PERSONNEL_ADMIN = [
  { nom: 'Secrétaire',            montant: 120000 },
  { nom: "Agent d'entretien",     montant: 65000 },
];

// Charges hors salaires (loyer, matériel pédagogique, électricité/eau, entretien) —
// réparties par formation au prorata du nombre d'étudiants faute d'affectation directe.
const CHARGES_GLOBALES = 300000;

// Étudiants avec le plus gros reste à payer — à terme dérivé des mêmes
// "rows" que PaiementsGlobale.jsx (prix - Σ tranches.montant), triés desc.
const CLIENTS_A_RISQUE = [
  { nom: 'Yacine Benali',    formation: 'Comptabilité', prix: 25000, paye: 10000, tranchesVersees: 1 },
  { nom: 'Sara Meddah',      formation: 'Informatique', prix: 30000, paye: 15000, tranchesVersees: 1 },
  { nom: 'Riad Cherfaoui',   formation: 'Comptabilité', prix: 25000, paye: 12500, tranchesVersees: 1 },
  { nom: 'Ines Bouzid',      formation: 'Marketing',    prix: 22000, paye: 11000, tranchesVersees: 1 },
  { nom: 'Amine Kaci',       formation: 'Comptabilité', prix: 25000, paye: 15000, tranchesVersees: 2 },
];

const fmt = (n) => Math.round(n).toLocaleString('fr-DZ') + ' DA';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="relative bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
    <div className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
      <Icon size={15} />
    </div>
    <p className="text-xs text-[#64748B] pr-8">{label}</p>
    <p className="text-2xl font-bold text-[#1E293B] mt-2">{value}</p>
  </div>
);

// ── Barre proportionnelle simple (2 segments) — pour "Étudiants vs Autres" ──
const SplitBar = ({ segments }) => {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div className="flex w-full h-4 rounded-full overflow-hidden bg-slate-100">
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${(s.value / total) * 100}%` }} className={s.color} />
        ))}
      </div>
      <div className="flex flex-wrap gap-4 mt-3">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className={`w-2.5 h-2.5 rounded-sm inline-block ${s.color}`} />
            {s.label} — <span className="font-semibold text-slate-700">{fmt(s.value)}</span>
            <span className="text-slate-400">({((s.value / total) * 100).toFixed(0)}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Liste à barres horizontales — pour "Autres revenus par catégorie" ──
const HorizontalBarList = ({ items, colorClass }) => {
  const max = Math.max(...items.map((i) => i.montant), 1);
  return (
    <div className="space-y-2.5">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600">{i.label}</span>
            <span className="font-semibold text-slate-700">{fmt(i.montant)}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${colorClass}`}
              style={{ width: `${(i.montant / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Graphique barres empilées : Encaissé (bas) + Crédit (haut), par formation ──
const CreditParFormationChart = ({ data }) => {
  if (data.length === 0) {
    return <p className="text-center text-slate-400 text-xs py-14">Pas encore de données à afficher.</p>;
  }

  const max = Math.max(...data.map((d) => d.attendu), 1);
  const width = Math.max(data.length * 110, 320);
  const height = 240;
  const topMargin = 34;
  const bottomMargin = 34;
  const barWidth = 46;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block overflow-visible">
        {data.map((d, i) => {
          const scale = (height - topMargin - bottomMargin) / max;
          const encaisseHeight = d.encaisse * scale;
          const creditHeight = d.credit * scale;
          const x = i * 110 + 30;
          const yEncaisseTop = height - bottomMargin - encaisseHeight;
          const yCreditTop = yEncaisseTop - creditHeight;

          return (
            <g key={d.nom}>
              {d.credit > 0 && (
                <rect x={x} y={yCreditTop} width={barWidth} height={creditHeight} rx={4} className="fill-amber-400" />
              )}
              <rect x={x} y={yEncaisseTop} width={barWidth} height={encaisseHeight} rx={4} className="fill-[#0369A1]" />
              <text x={x + barWidth / 2} y={yCreditTop - 8} textAnchor="middle" className="fill-slate-600 text-[10px] font-semibold">
                {fmt(d.attendu)}
              </text>
              <text x={x + barWidth / 2} y={height - 14} textAnchor="middle" className="fill-slate-500 text-[10px] font-medium">
                {d.nom}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 pl-2">
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#0369A1] inline-block" /> Encaissé
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Crédit (impayé)
        </span>
      </div>
    </div>
  );
};

// ── Graphique barres groupées : Revenu vs Coût total, par formation ──
const RevenuVsCoutChart = ({ data }) => {
  if (data.length === 0) {
    return <p className="text-center text-slate-400 text-xs py-14">Pas encore de données à afficher.</p>;
  }

  const max = Math.max(...data.map((d) => Math.max(d.encaisse, d.coutTotal)), 1);
  const width = Math.max(data.length * 130, 320);
  const height = 220;
  const topMargin = 30;
  const bottomMargin = 30;
  const barWidth = 26;
  const gap = 8;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block overflow-visible">
        {data.map((d, i) => {
          const scale = (height - topMargin - bottomMargin) / max;
          const revenuH = d.encaisse * scale;
          const coutH = d.coutTotal * scale;
          const groupX = i * 130 + 30;

          return (
            <g key={d.nom}>
              <rect x={groupX} y={height - bottomMargin - revenuH} width={barWidth} height={revenuH} rx={4} className="fill-emerald-500" />
              <rect x={groupX + barWidth + gap} y={height - bottomMargin - coutH} width={barWidth} height={coutH} rx={4} className="fill-red-400" />
              <text x={groupX + barWidth + gap / 2} y={height - 12} textAnchor="middle" className="fill-slate-500 text-[10px] font-medium">
                {d.nom}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-2 pl-2">
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Revenu
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> Coût total (enseignants + charges allouées)
        </span>
      </div>
    </div>
  );
};

const Statistique = () => {
  // Pas encore de route backend dédiée — données locales pour valider l'UI.
  // TODO: brancher sur les mêmes sources que Paiements.jsx, Charges.jsx et
  // Salaires.jsx une fois validé visuellement.
  const totalEtudiants = useMemo(
    () => FORMATIONS_STATS.reduce((s, f) => s + f.etudiants, 0),
    []
  );

  const formations = useMemo(() => {
    return FORMATIONS_STATS.map((f) => {
      const attendu = f.etudiants * f.prixUnitaire;
      const credit = Math.max(attendu - f.encaisse, 0);
      const tauxRecouvrement = attendu > 0 ? (f.encaisse / attendu) * 100 : 0;
      const nbEnCredit = credit > 0 ? Math.max(1, Math.round(credit / f.prixUnitaire)) : 0;

      const chargesAllouees = CHARGES_GLOBALES * (f.etudiants / totalEtudiants);
      const coutTotal = f.coutEnseignants + chargesAllouees;
      const margeNette = f.encaisse - coutTotal;
      const margeNettePct = f.encaisse > 0 ? (margeNette / f.encaisse) * 100 : 0;

      const revenuMoyenParEtudiant = f.etudiants > 0 ? f.encaisse / f.etudiants : 0;
      const moyenneElevesParGroupe = f.groupes > 0 ? f.etudiants / f.groupes : 0;

      return {
        ...f, attendu, credit, tauxRecouvrement, nbEnCredit,
        chargesAllouees, coutTotal, margeNette, margeNettePct,
        revenuMoyenParEtudiant, moyenneElevesParGroupe,
      };
    });
  }, [totalEtudiants]);

  // ── KPI globaux ──
  const totalEncaisse = formations.reduce((s, f) => s + f.encaisse, 0);
  const totalAttendu  = formations.reduce((s, f) => s + f.attendu, 0);
  const totalCredit   = formations.reduce((s, f) => s + f.credit, 0);
  const totalNbCredit = formations.reduce((s, f) => s + f.nbEnCredit, 0);
  const tauxGlobal    = totalAttendu > 0 ? (totalEncaisse / totalAttendu) * 100 : 0;

  const revenuAutres  = AUTRES_REVENUS_CATEGORIES.reduce((s, c) => s + c.montant, 0);
  const revenuTotal   = totalEncaisse + revenuAutres;

  const masseSalarialeEnseignants = formations.reduce((s, f) => s + f.coutEnseignants, 0);
  const masseSalarialeAdmin       = PERSONNEL_ADMIN.reduce((s, p) => s + p.montant, 0);
  const masseSalarialeTotal       = masseSalarialeEnseignants + masseSalarialeAdmin;

  const resultatNet = revenuTotal - masseSalarialeTotal - CHARGES_GLOBALES;

  const clientsARisque = useMemo(() => {
    return CLIENTS_A_RISQUE
      .map((c) => ({ ...c, reste: c.prix - c.paye }))
      .sort((a, b) => b.reste - a.reste);
  }, []);

  const meilleureFormation = useMemo(
    () => [...formations].sort((a, b) => b.margeNettePct - a.margeNettePct)[0],
    [formations]
  );
  const moinsBonneFormation = useMemo(
    () => [...formations].sort((a, b) => a.margeNettePct - b.margeNettePct)[0],
    [formations]
  );

  return (
    <ComptableLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Statistiques</h1>
          <p className="text-slate-400 text-xs mt-0.5">Vue par formation — encaissement, crédit et rentabilité</p>
        </div>
      </div>

      {/* KPI — Encaissement & crédit */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Wallet}       label="Total encaissé"          value={fmt(totalEncaisse)}          color="text-[#0F2A4A] bg-[#0F2A4A]/5" />
        <StatCard icon={CreditCard}   label="Total en crédit (DA)"    value={fmt(totalCredit)}            color="text-amber-600 bg-amber-50" />
        <StatCard icon={AlertCircle}  label="Clients en crédit"       value={totalNbCredit}               color="text-red-600 bg-red-50" />
        <StatCard icon={TrendingUp}   label="Taux de recouvrement"    value={`${tauxGlobal.toFixed(1)}%`} color="text-emerald-600 bg-emerald-50" />
      </div>

      {/* KPI — Vue financière globale */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={PiggyBank}    label="Revenu total (étudiants + autres)" value={fmt(revenuTotal)}            color="text-[#0369A1] bg-[#DCEBFA]" />
        <StatCard icon={Briefcase}    label="Masse salariale totale"           value={fmt(masseSalarialeTotal)}    color="text-purple-600 bg-purple-50" />
        <StatCard icon={Building2}    label="Charges globales"                value={fmt(CHARGES_GLOBALES)}       color="text-slate-600 bg-slate-100" />
        <StatCard icon={resultatNet >= 0 ? TrendingUp : TrendingDown}
                  label="Résultat net"
                  value={fmt(resultatNet)}
                  color={resultatNet >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'} />
      </div>

      {/* Table Encaissement & Crédit par formation */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
          <GraduationCap size={16} className="text-[#0284C7]" />
          Encaissement &amp; crédit par formation
        </h2>
        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs text-[#0369A1] bg-[#DCEBFA]">
                <th className="py-2.5 px-3 font-medium border-b border-l border-[#E2E8F0]">Formation</th>
                <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0] text-center">Étudiants</th>
                <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0] text-right">Attendu</th>
                <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0] text-right">Encaissé</th>
                <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0] text-right">Crédit (DA)</th>
                <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0] text-center">Nb en crédit</th>
                <th className="py-2.5 px-3 font-medium border-b border-r border-[#E2E8F0] text-right">Recouvrement</th>
              </tr>
            </thead>
            <tbody>
              {formations.map((f, idx) => (
                <tr key={f.nom} className={idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}>
                  <td className="py-3 px-3 border-b border-l border-[#E2E8F0] font-medium text-[#1E293B]">{f.nom}</td>
                  <td className="py-3 px-3 border-b border-[#E2E8F0] text-center text-[#64748B]">{f.etudiants}</td>
                  <td className="py-3 px-3 border-b border-[#E2E8F0] text-right text-[#64748B]">{fmt(f.attendu)}</td>
                  <td className="py-3 px-3 border-b border-[#E2E8F0] text-right font-semibold text-[#0369A1]">{fmt(f.encaisse)}</td>
                  <td className="py-3 px-3 border-b border-[#E2E8F0] text-right">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      f.credit > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {fmt(f.credit)}
                    </span>
                  </td>
                  <td className="py-3 px-3 border-b border-[#E2E8F0] text-center text-[#64748B]">{f.nbEnCredit}</td>
                  <td className="py-3 px-3 border-b border-r border-[#E2E8F0] text-right font-medium text-[#1E293B]">
                    {f.tauxRecouvrement.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Graphique Encaissé vs Crédit par formation */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
          <Wallet size={16} className="text-[#0284C7]" />
          Répartition encaissé / crédit par formation
        </h2>
        <CreditParFormationChart data={formations} />
      </div>

      {/* Rentabilité + Revenu vs coût */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
            <PiggyBank size={16} className="text-[#0284C7]" />
            Rentabilité par formation
          </h2>
          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs text-[#0369A1] bg-[#DCEBFA]">
                  <th className="py-2.5 px-3 font-medium border-b border-l border-[#E2E8F0]">Formation</th>
                  <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0] text-right">Coût ens.</th>
                  <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0] text-right">Charges allouées</th>
                  <th className="py-2.5 px-3 font-medium border-b border-r border-[#E2E8F0] text-right">Marge nette</th>
                </tr>
              </thead>
              <tbody>
                {formations.map((f, idx) => (
                  <tr key={f.nom} className={idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}>
                    <td className="py-3 px-3 border-b border-l border-[#E2E8F0] font-medium text-[#1E293B]">{f.nom}</td>
                    <td className="py-3 px-3 border-b border-[#E2E8F0] text-right text-[#64748B]">{fmt(f.coutEnseignants)}</td>
                    <td className="py-3 px-3 border-b border-[#E2E8F0] text-right text-[#64748B]">{fmt(f.chargesAllouees)}</td>
                    <td className="py-3 px-3 border-b border-r border-[#E2E8F0] text-right">
                      <span className={`font-semibold ${f.margeNette >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {fmt(f.margeNette)}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1.5">({f.margeNettePct.toFixed(0)}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Charges allouées = charges globales réparties au prorata du nombre d'étudiants par formation.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-[#0284C7]" />
            Revenu vs coût total par formation
          </h2>
          <RevenuVsCoutChart data={formations} />
        </div>
      </div>

      {/* Répartition des revenus + Autres revenus par catégorie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
            <Users size={16} className="text-[#0284C7]" />
            Répartition des revenus
          </h2>
          <SplitBar
            segments={[
              { label: 'Étudiants', value: totalEncaisse, color: 'bg-[#0369A1]' },
              { label: 'Autres revenus', value: revenuAutres, color: 'bg-emerald-500' },
            ]}
          />
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
            <Wallet size={16} className="text-[#0284C7]" />
            Autres revenus par catégorie
          </h2>
          <HorizontalBarList
            items={AUTRES_REVENUS_CATEGORIES.map((c) => ({ label: c.categorie, montant: c.montant }))}
            colorClass="bg-emerald-500"
          />
        </div>
      </div>

      {/* Masse salariale + Groupes & remplissage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
            <Briefcase size={16} className="text-[#0284C7]" />
            Masse salariale
          </h2>
          <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">Enseignants — par formation</p>
          <div className="space-y-2 mb-4">
            {formations.map((f) => (
              <div key={f.nom} className="flex justify-between text-xs">
                <span className="text-slate-600">{f.nom}</span>
                <span className="font-semibold text-slate-700">{fmt(f.coutEnseignants)}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">Personnel administratif</p>
          <div className="space-y-2">
            {PERSONNEL_ADMIN.map((p) => (
              <div key={p.nom} className="flex justify-between text-xs">
                <span className="text-slate-600">{p.nom}</span>
                <span className="font-semibold text-slate-700">{fmt(p.montant)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
            <Layers size={16} className="text-[#0284C7]" />
            Groupes &amp; remplissage par formation
          </h2>
          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs text-[#0369A1] bg-[#DCEBFA]">
                  <th className="py-2.5 px-3 font-medium border-b border-l border-[#E2E8F0]">Formation</th>
                  <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0] text-center">Groupes</th>
                  <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0] text-center">Moy. élèves/groupe</th>
                  <th className="py-2.5 px-3 font-medium border-b border-r border-[#E2E8F0] text-right">Revenu moy./étudiant</th>
                </tr>
              </thead>
              <tbody>
                {formations.map((f, idx) => (
                  <tr key={f.nom} className={idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}>
                    <td className="py-3 px-3 border-b border-l border-[#E2E8F0] font-medium text-[#1E293B]">{f.nom}</td>
                    <td className="py-3 px-3 border-b border-[#E2E8F0] text-center text-[#64748B]">{f.groupes}</td>
                    <td className="py-3 px-3 border-b border-[#E2E8F0] text-center text-[#64748B]">{f.moyenneElevesParGroupe.toFixed(1)}</td>
                    <td className="py-3 px-3 border-b border-r border-[#E2E8F0] text-right font-medium text-[#1E293B]">{fmt(f.revenuMoyenParEtudiant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Clients à risque + Meilleure / moins bonne formation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
            <ArrowDownRight size={16} className="text-red-500" />
            Clients à relancer en priorité
          </h2>
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {clientsARisque.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl border border-[#F1F5F9] px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-[#1E293B]">{c.nom}</p>
                  <p className="text-xs text-[#94A3B8] flex items-center gap-1 mt-0.5">
                    <GraduationCap size={11} /> {c.formation} · {c.tranchesVersees} tranche(s) versée(s)
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 whitespace-nowrap">
                  {fmt(c.reste)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-[#0284C7]" />
            Classement rentabilité
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <Trophy size={16} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] text-emerald-700 uppercase tracking-wide font-medium">Formation la plus rentable</p>
                <p className="text-sm font-semibold text-slate-800">{meilleureFormation?.nom}</p>
              </div>
              <span className="text-sm font-bold text-emerald-700">{meilleureFormation?.margeNettePct.toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 px-3 py-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Frown size={16} />
              </div>
              <div className="flex-1">
                <p className="text-[11px] text-red-600 uppercase tracking-wide font-medium">Formation la moins rentable</p>
                <p className="text-sm font-semibold text-slate-800">{moinsBonneFormation?.nom}</p>
              </div>
              <span className="text-sm font-bold text-red-600">{moinsBonneFormation?.margeNettePct.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>
    </ComptableLayout>
  );
};

export default Statistique;