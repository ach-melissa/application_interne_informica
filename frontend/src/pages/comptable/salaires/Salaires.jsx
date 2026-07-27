import { useState } from 'react';
import { Plus, Search, User, Wallet, CalendarDays, Clock, Users2, X, Pencil, GraduationCap, Briefcase, ShieldCheck } from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];
const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

const STATUT_STYLES = {
  'payé':      'bg-emerald-50 text-emerald-700',
  'en_attente':'bg-amber-50 text-amber-700',
  'à_saisir':  'bg-slate-100 text-slate-500',
};

// --- static mock data (à remplacer par l'API plus tard) ---
const ENSEIGNANTS = [
  {
    id: 1, nom: 'Karim Traoré', statut: 'en_attente',
    formations: [
      { nom: 'Comptabilité', groupes: 2, eleves: 45, heures: 24, taux: 2000 },
      { nom: 'Informatique', groupes: 1, eleves: 20, heures: 16, taux: 2000 },
    ],
  },
  {
    id: 2, nom: 'Amina Diallo', statut: 'payé',
    formations: [
      { nom: 'Marketing', groupes: 1, eleves: 18, heures: 10, taux: 2200 },
    ],
  },
  { id: 3, nom: 'Fatou Ndiaye', statut: 'à_saisir', formations: [] },
];

const PERSONNEL = [
  { id: 1, nom: 'Salima Bekkar', poste: 'Secrétaire', salaire: 120000, statut: 'payé' },
  { id: 2, nom: 'Yacine Meziane', poste: 'Agent d\'entretien', salaire: 65000, statut: 'en_attente' },
];

// listes existantes (viennent de la page Gestion des employés/enseignants)
const PROFS_DISPONIBLES = ['Karim Traoré', 'Amina Diallo', 'Fatou Ndiaye', 'Nadia Cherif'];
const EMPLOYES_DISPONIBLES = ['Salima Bekkar', 'Yacine Meziane', 'Omar Belkacem'];
const FORMATIONS_ACTIVES = ['Comptabilité', 'Informatique', 'Marketing'];

const totalEnseignant = (e) => e.formations.reduce((s, f) => s + f.heures * f.taux, 0);
const fmt = (n) => n.toLocaleString('fr-DZ') + ' DA';

const Badge = ({ statut }) => (
  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${STATUT_STYLES[statut] ?? 'bg-slate-100 text-slate-500'}`}>
    {statut.replace('_', ' ')}
  </span>
);

const StatCard = ({ label, value, accent }) => (
  <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] px-4 py-3">
    <p className="text-[11px] text-slate-400 mb-1">{label}</p>
    <p className={`text-lg font-bold ${accent ?? 'text-slate-700'}`}>{value}</p>
  </div>
);

const Salaires = () => {
  const [mois, setMois] = useState(currentMonth);
  const [annee, setAnnee] = useState(currentYear);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [tab, setTab] = useState('enseignants');
  const [statutFiltre, setStatutFiltre] = useState('tous');

  const enseignants = ENSEIGNANTS.filter((e) =>
    e.nom.toLowerCase().includes(search.toLowerCase()) &&
    (statutFiltre === 'tous' || e.statut === statutFiltre)
  );
  const personnel = PERSONNEL.filter((p) =>
    p.nom.toLowerCase().includes(search.toLowerCase()) &&
    (statutFiltre === 'tous' || p.statut === statutFiltre)
  );

  const changeTab = (key) => { setTab(key); setStatutFiltre('tous'); };
  const statutOptions = tab === 'enseignants'
    ? ['tous', 'payé', 'en_attente', 'à_saisir']
    : ['tous', 'payé', 'en_attente'];

  const masseSalariale = enseignants.reduce((s, e) => s + totalEnseignant(e), 0)
    + personnel.reduce((s, p) => s + p.salaire, 0);
  const dejaVerse = enseignants.filter((e) => e.statut === 'payé').reduce((s, e) => s + totalEnseignant(e), 0)
    + personnel.filter((p) => p.statut === 'payé').reduce((s, p) => s + p.salaire, 0);
  const enAttente = masseSalariale - dejaVerse;
  const nbEmployes = enseignants.length + personnel.length;

  return (
    <ComptableLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Salaires</h1>
          <p className="text-slate-400 text-xs mt-0.5">{MONTHS[mois - 1]} {annee}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={mois} onChange={(e) => setMois(Number(e.target.value))}
            className="text-xs rounded-full py-1.5 px-3 bg-white border border-[#E2E8F0] text-[#0369A1] font-medium">
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))}
            className="text-xs rounded-full py-1.5 px-3 bg-white border border-[#E2E8F0] text-[#0369A1] font-medium">
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Masse salariale" value={fmt(masseSalariale)} />
        <StatCard label="Déjà versé" value={fmt(dejaVerse)} accent="text-emerald-600" />
        <StatCard label="En attente" value={fmt(enAttente)} accent="text-amber-600" />
        <StatCard label="Employés" value={nbEmployes} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4  w-fit ">
        {[
          { key: 'enseignants', label: 'Enseignants' },
          { key: 'personnel', label: 'Personnel administratif' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => changeTab(t.key)}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-full transition-all ${
              tab === t.key ? 'bg-[#0F2A4A] text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative max-w-[240px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1]" />
            <input
              type="text" placeholder="Rechercher…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
            />
          </div>
          <select
            value={statutFiltre}
            onChange={(e) => setStatutFiltre(e.target.value)}
            className="text-xs rounded-full py-1.5 px-3 bg-white border border-[#E2E8F0] text-[#0369A1] font-medium capitalize"
          >
            {statutOptions.map((s) => (
              <option key={s} value={s}>{s === 'tous' ? 'Tous les statuts' : s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => (tab === 'enseignants' ? setShowAddTeacher(true) : setShowAddStaff(true))}
          className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3 py-1.5 rounded-lg text-xs font-medium
            shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] transition-all"
        >
          <Plus size={13} /> {tab === 'enseignants' ? 'Ajouter un enseignant' : 'Ajouter un employé'}
        </button>
      </div>

      {tab === 'enseignants' ? (
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[#DCEBFA]">
              <tr>
                {[
                  { label: 'Nom', icon: User },
                  { label: 'Formation(s)', icon: GraduationCap },
                  { label: 'Heures', icon: Clock },
                  { label: 'Montant', icon: Wallet },
                  { label: 'Statut', icon: ShieldCheck },
                  { label: '', icon: null },
                ].map(({ label, icon: Icon }) => (
                  <th key={label || 'actions'} className="text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] uppercase border-b border-[#E2E8F0]">
                    <span className="flex items-center gap-1.5">{Icon && <Icon size={12} />}{label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enseignants.map((e, i) => (
                <tr key={e.id} className={i % 2 ? 'bg-[#F8FCFF]' : 'bg-white'}>
                  <td className="px-3 py-2.5 font-medium text-slate-700 border-b border-[#E2E8F0]">{e.nom}</td>
                  <td className="px-3 py-2.5 text-slate-500 border-b border-[#E2E8F0]">
                    {e.formations.length ? e.formations.map((f) => f.nom).join(', ') : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 border-b border-[#E2E8F0]">
                    {e.formations.reduce((s, f) => s + f.heures, 0)}h
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-700 border-b border-[#E2E8F0]">{fmt(totalEnseignant(e))}</td>
                  <td className="px-3 py-2.5 border-b border-[#E2E8F0]"><Badge statut={e.statut} /></td>
                  <td className="px-3 py-2.5 border-b border-[#E2E8F0] text-right">
                    <button onClick={() => setDetail(e)} className="text-[#0369A1] text-[11px] font-medium hover:underline">
                      {e.formations.length ? 'Voir détail' : 'Saisir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-[#DCEBFA]">
              <tr>
                {[
                  { label: 'Nom', icon: User },
                  { label: 'Poste', icon: Briefcase },
                  { label: 'Salaire', icon: Wallet },
                  { label: 'Statut', icon: ShieldCheck },
                ].map(({ label, icon: Icon }) => (
                  <th key={label} className="text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] uppercase border-b border-[#E2E8F0]">
                    <span className="flex items-center gap-1.5"><Icon size={12} />{label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {personnel.map((p, i) => (
                <tr key={p.id} className={i % 2 ? 'bg-[#F8FCFF]' : 'bg-white'}>
                  <td className="px-3 py-2.5 font-medium text-slate-700 border-b border-[#E2E8F0]">{p.nom}</td>
                  <td className="px-3 py-2.5 text-slate-500 border-b border-[#E2E8F0]">{p.poste}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-700 border-b border-[#E2E8F0]">{fmt(p.salaire)}</td>
                  <td className="px-3 py-2.5 border-b border-[#E2E8F0]"><Badge statut={p.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal détail enseignant */}
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">{detail.nom} — {MONTHS[mois - 1]} {annee}</h2>
              <button onClick={() => setDetail(null)}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="space-y-2 mb-4">
              {detail.formations.length === 0 && (
                <p className="text-xs text-slate-400">Aucune heure saisie ce mois-ci.</p>
              )}
              {detail.formations.map((f) => (
                <div key={f.nom} className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{f.nom}</span>
                    <span className="text-slate-400">{f.groupes} groupe(s) · {f.eleves} élèves</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><Clock size={11} /> {f.heures}h (auto, pointage) × {fmt(f.taux)}</span>
                    <span className="font-semibold text-slate-700">{fmt(f.heures * f.taux)}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="flex items-center gap-1.5 text-[#0369A1] text-xs font-medium mb-4">
              <Pencil size={12} /> Corriger un pointage manquant
            </button>
            <div className="border-t border-[#E2E8F0] pt-3 flex justify-between items-center mb-5">
              <span className="text-xs text-slate-400">Total</span>
              <span className="text-lg font-bold text-slate-800">{fmt(totalEnseignant(detail))}</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDetail(null)} className="flex-1 border border-[#E2E8F0] text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">
                Fermer
              </button>
              <button className="flex-1 bg-[#0F2A4A] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#16385f]">
                Valider et payer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajout employé */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">Ajouter un employé</h2>
              <button onClick={() => setShowAddStaff(false)}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
                  <User size={13} className="text-[#0369A1]" /> Employé
                </label>
                <select className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm">
                  <option value="">Sélectionner dans la liste</option>
                  {EMPLOYES_DISPONIBLES.map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
                  <Briefcase size={13} className="text-[#0369A1]" /> Poste
                </label>
                <input className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm" placeholder="Secrétaire" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
                  <Wallet size={13} className="text-[#0369A1]" /> Salaire fixe mensuel
                </label>
                <input type="number" className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm" placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
                  <ShieldCheck size={13} className="text-[#0369A1]" /> Statut
                </label>
                <select className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm">
                  <option>Actif</option>
                  <option>Inactif</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddStaff(false)} className="flex-1 border border-[#E2E8F0] text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={() => setShowAddStaff(false)} className="flex-1 bg-[#0F2A4A] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#16385f]">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal ajout enseignant */}
      {showAddTeacher && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">Ajouter un enseignant</h2>
              <button onClick={() => setShowAddTeacher(false)}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
                  <User size={13} className="text-[#0369A1]" /> Enseignant
                </label>
                <select className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm">
                  <option value="">Sélectionner dans la liste</option>
                  {PROFS_DISPONIBLES.map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
                  <GraduationCap size={13} className="text-[#0369A1]" /> Formations qu'il peut enseigner
                </label>
                <select multiple className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm h-24">
                  {FORMATIONS_ACTIVES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
                  <Wallet size={13} className="text-[#0369A1]" /> Taux horaire par défaut
                </label>
                <input type="number" className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm" placeholder="2000" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
                  <ShieldCheck size={13} className="text-[#0369A1]" /> Statut
                </label>
                <select className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm">
                  <option>Actif</option>
                  <option>Inactif</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAddTeacher(false)} className="flex-1 border border-[#E2E8F0] text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">
                Annuler
              </button>
              <button onClick={() => setShowAddTeacher(false)} className="flex-1 bg-[#0F2A4A] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#16385f]">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </ComptableLayout>
  );
};

export default Salaires;