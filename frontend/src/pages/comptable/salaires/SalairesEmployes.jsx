import { useState, useMemo } from 'react';
import {
  Plus, Search, User, Wallet, Briefcase, ShieldCheck, X, Pencil,
  Tag, CalendarDays, Percent, Clock, Users2, Calendar,
} from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

const STATUT_STYLES = {
  payé: 'bg-emerald-50 text-emerald-700',
  en_attente: 'bg-amber-50 text-amber-700',
  à_saisir: 'bg-slate-100 text-slate-500',
};

const TYPES_SALAIRE = ['Fixe', "À l'heure", 'Pourcentage'];

// --- static mock data (à remplacer par l'API plus tard) ---
const EMPLOYES_INITIAL = [
  {
    id: 1, nom: 'Salima Bekkar', poste: 'Secrétaire', categorie: 'Administration',
    typeSalaire: 'Fixe', montant: 120000, montantPeriode: 120000,
    dateDebut: '2024-09-01', statut: 'payé',
  },
  {
    id: 2, nom: "Yacine Meziane", poste: "Agent d'entretien", categorie: 'Entretien',
    typeSalaire: 'Fixe', montant: 65000, montantPeriode: 65000,
    dateDebut: '2023-01-15', statut: 'en_attente',
  },
  {
    id: 3, nom: 'Omar Belkacem', poste: 'Technicien informatique', categorie: 'Technique',
    typeSalaire: "À l'heure", montant: 600, montantPeriode: 600 * 38,
    dateDebut: '2025-03-01', statut: 'payé',
  },
  {
    id: 4, nom: 'Nadia Cherif', poste: 'Commercial', categorie: 'Administration',
    typeSalaire: 'Pourcentage', montant: 8, montantPeriode: 34000,
    dateDebut: '2024-11-01', statut: 'en_attente',
  },
];

const fmt = (n) => n.toLocaleString('fr-DZ') + ' DA';

const montantLabel = (emp) => {
  if (emp.typeSalaire === 'Fixe') return fmt(emp.montant) + ' / mois';
  if (emp.typeSalaire === "À l'heure") return fmt(emp.montant) + ' / h';
  return emp.montant + ' %';
};

const Badge = ({ statut }) => (
  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${STATUT_STYLES[statut] ?? 'bg-slate-100 text-slate-500'}`}>
    {statut.replace('_', ' ')}
  </span>
);

const StatCard = ({ label, value, accent, icon: Icon }) => (
  <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] px-4 py-3">
    <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
      {Icon && <Icon size={12} />} {label}
    </p>
    <p className={`text-lg font-bold ${accent ?? 'text-slate-700'}`}>{value}</p>
  </div>
);

const typeIcon = (type) => {
  if (type === "À l'heure") return Clock;
  if (type === 'Pourcentage') return Percent;
  return Wallet;
};

// --- Modal partagé Ajout / Modification ---
const EmployeModal = ({ mode, employe, onClose, onSave }) => {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    nom: employe?.nom ?? '',
    poste: employe?.poste ?? '',
    categorie: employe?.categorie ?? 'Administration',
    typeSalaire: employe?.typeSalaire ?? 'Fixe',
    montant: employe?.montant ?? '',
    dateDebut: employe?.dateDebut ?? '',
  });

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const montantSuffix = form.typeSalaire === 'Fixe' ? 'DA / mois'
    : form.typeSalaire === "À l'heure" ? 'DA / heure'
    : '%';

  const handleSubmit = () => {
    if (!form.nom || !form.poste || !form.montant) return;
    onSave({
      ...(employe ?? { id: Date.now(), statut: 'en_attente', montantPeriode: 0 }),
      ...form,
      montant: Number(form.montant),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">
            {isEdit ? "Modifier l'employé" : 'Ajouter un employé'}
          </h2>
          <button onClick={onClose}><X size={16} className="text-slate-400" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
              <User size={13} className="text-[#0369A1]" /> Nom
            </label>
            <input
              value={form.nom} onChange={update('nom')}
              className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm"
              placeholder="Ahmed"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
              <Briefcase size={13} className="text-[#0369A1]" /> Poste
            </label>
            <input
              value={form.poste} onChange={update('poste')}
              className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm"
              placeholder="Secrétaire"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
              <Tag size={13} className="text-[#0369A1]" /> Catégorie
            </label>
            <input
              value={form.categorie} onChange={update('categorie')}
              className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm"
              placeholder="Administration"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
              <ShieldCheck size={13} className="text-[#0369A1]" /> Type de salaire
            </label>
            <select
              value={form.typeSalaire} onChange={update('typeSalaire')}
              className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm"
            >
              {TYPES_SALAIRE.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
              <Wallet size={13} className="text-[#0369A1]" /> Montant ou tarif
            </label>
            <div className="relative">
              <input
                type="number" value={form.montant} onChange={update('montant')}
                className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm pr-20"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                {montantSuffix}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
              <CalendarDays size={13} className="text-[#0369A1]" /> Date de début
            </label>
            <input
              type="date" value={form.dateDebut} onChange={update('dateDebut')}
              className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-[#E2E8F0] text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">
            Annuler
          </button>
          <button onClick={handleSubmit} className="flex-1 bg-[#0F2A4A] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#16385f]">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

const SalairesEmployes = () => {
  const [employes, setEmployes] = useState(EMPLOYES_INITIAL);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [search, setSearch] = useState('');
  const [categorieFiltre, setCategorieFiltre] = useState('toutes');
  const [typeFiltre, setTypeFiltre] = useState('tous');
  const [modal, setModal] = useState(null); // { mode: 'add' | 'edit', employe? }

  const categories = useMemo(
    () => ['toutes', ...new Set(employes.map((e) => e.categorie))],
    [employes]
  );

  const filtered = employes.filter((e) =>
    e.nom.toLowerCase().includes(search.toLowerCase()) &&
    (categorieFiltre === 'toutes' || e.categorie === categorieFiltre) &&
    (typeFiltre === 'tous' || e.typeSalaire === typeFiltre)
  );

  const totalSalaires = filtered.reduce((s, e) => s + e.montantPeriode, 0);
  const salairesPayes = filtered.filter((e) => e.statut === 'payé').reduce((s, e) => s + e.montantPeriode, 0);
  const salairesRestants = totalSalaires - salairesPayes;

  const handleSave = (employe) => {
    setEmployes((prev) => {
      const exists = prev.some((e) => e.id === employe.id);
      return exists ? prev.map((e) => (e.id === employe.id ? employe : e)) : [...prev, employe];
    });
  };

  return (
    <ComptableLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Salaires des employés</h1>
        </div>
        <div className="flex items-center gap-1 bg-white rounded-full border border-[#E2E8F0] px-3 py-1.5 text-xs text-slate-500">
          <Calendar size={13} className="text-[#0369A1]" />
          <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="outline-none text-xs w-[110px]" />
          <span>→</span>
          <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="outline-none text-xs w-[110px]" />
        </div>
      </div>

      {/* Cartes — se recalculent selon les filtres actifs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total des salaires" value={fmt(totalSalaires)} icon={Wallet} />
        <StatCard label="Nombre d'employés" value={filtered.length} icon={Users2} />
        <StatCard label="Salaires payés" value={fmt(salairesPayes)} accent="text-emerald-600" icon={ShieldCheck} />
        <StatCard label="Salaires restants" value={fmt(salairesRestants)} accent="text-amber-600" icon={ShieldCheck} />
      </div>

      {/* Recherche + filtres (catégorie, type de salaire — la période est gérée par mois/année ci-dessus) */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative max-w-[220px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1]" />
            <input
              type="text" placeholder="Rechercher…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
            />
          </div>
          <select
            value={categorieFiltre}
            onChange={(e) => setCategorieFiltre(e.target.value)}
            className="text-xs rounded-full py-1.5 px-3 bg-white border border-[#E2E8F0] text-[#0369A1] font-medium"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'toutes' ? 'Toutes les catégories' : c}</option>
            ))}
          </select>
          <select
            value={typeFiltre}
            onChange={(e) => setTypeFiltre(e.target.value)}
            className="text-xs rounded-full py-1.5 px-3 bg-white border border-[#E2E8F0] text-[#0369A1] font-medium"
          >
            <option value="tous">Tous les types</option>
            {TYPES_SALAIRE.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3 py-1.5 rounded-lg text-xs font-medium
            shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] transition-all"
        >
          <Plus size={13} /> Ajouter un employé
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#DCEBFA]">
            <tr>
              {[
                { label: 'Employé', icon: User },
                { label: 'Poste', icon: Briefcase },
                { label: 'Type de salaire', icon: ShieldCheck },
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
            {filtered.map((e, i) => {
              const TypeIcon = typeIcon(e.typeSalaire);
              return (
                <tr key={e.id} className={i % 2 ? 'bg-[#F8FCFF]' : 'bg-white'}>
                  <td className="px-3 py-2.5 font-medium text-slate-700 border-b border-[#E2E8F0]">{e.nom}</td>
                  <td className="px-3 py-2.5 text-slate-500 border-b border-[#E2E8F0]">{e.poste}</td>
                  <td className="px-3 py-2.5 text-slate-500 border-b border-[#E2E8F0]">
                    <span className="flex items-center gap-1.5"><TypeIcon size={12} className="text-[#0369A1]" />{e.typeSalaire}</span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-700 border-b border-[#E2E8F0]">{montantLabel(e)}</td>
                  <td className="px-3 py-2.5 border-b border-[#E2E8F0]"><Badge statut={e.statut} /></td>
                  <td className="px-3 py-2.5 border-b border-[#E2E8F0] text-right">
                    <button
                      onClick={() => setModal({ mode: 'edit', employe: e })}
                      className="text-[#0369A1] text-[11px] font-medium hover:underline flex items-center gap-1 ml-auto"
                    >
                      <Pencil size={11} /> Modifier
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400 text-xs">
                  Aucun employé ne correspond à ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <EmployeModal
          mode={modal.mode}
          employe={modal.employe}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </ComptableLayout>
  );
};

export default SalairesEmployes;