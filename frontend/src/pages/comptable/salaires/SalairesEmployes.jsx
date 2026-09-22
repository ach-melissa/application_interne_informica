import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Wallet, Pencil, Phone, Users2, Calendar, ChevronRight, ChevronDown, X } from 'lucide-react';

import ComptableLayout from '../../../layouts/ComptableLayout';
import EmployeModal, { StatTile, JOURS, TYPES, typeOf, nomComplet, tarifLabel, totalEmploye, fmt, initiales, formatDate, joursParSemaine, cap, posteFromApi, posteToApi, employeFromApi } from './EmployeModal';
const BASE_PATH = '/comptable/salaires/employes';
const API_URL = `${import.meta.env.VITE_API_URL}/api/employes`;
const mkPoste = (id, poste, type, montant, extra = {}) => ({ id, poste, type, montant, joursFixes: true, jours: JOURS.slice(0, 5), nbJours: 5, heuresParJour: 8, dateDebut: '2024-01-01', ...extra });

// NOTE: gardé pour l'instant uniquement comme fallback dans DetailEmploye.jsx
// (pas encore branché sur l'API) — à supprimer une fois cette page migrée aussi.
export const EMPLOYES_INITIAL = [
  { id: 1, nom: 'Bekkar', prenom: 'Salima', telephone: '0555 12 34 56', statut: 'payé', postes: [mkPoste(101, 'Secrétaire', 'mensuel', 120000, { dateDebut: '2024-09-01' })] },
  { id: 2, nom: 'Meziane', prenom: 'Yacine', telephone: '0661 45 78 90', statut: 'en_attente', postes: [
    mkPoste(201, "Agent d'entretien", 'mensuel', 65000, { dateDebut: '2023-01-15' }),
    mkPoste(202, 'Gardien de nuit', 'jour', 1500, { jours: ['jeudi', 'vendredi', 'samedi'], heuresParJour: 10, dateDebut: '2024-06-01' }),
  ] },
  { id: 3, nom: 'Belkacem', prenom: 'Omar', telephone: '0770 23 45 67', statut: 'payé', postes: [mkPoste(301, 'Technicien informatique', 'heure', 600, { joursFixes: false, nbJours: 3, heuresParJour: 4, dateDebut: '2025-03-01' })] },
  { id: 4, nom: 'Cherif', prenom: 'Nadia', telephone: '0550 98 76 54', statut: 'en_attente', postes: [mkPoste(401, 'Commercial', 'jour', 2000, { dateDebut: '2024-11-01' })] },
];

const EmployeCard = ({ employe, onOpen, onEdit }) => (
  <div className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] transition flex flex-col h-full">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 bg-[#DCEBFA] rounded-full flex items-center justify-center text-sm font-bold text-[#0369A1] shrink-0">{initiales(nomComplet(employe))}</div>
      <div className="min-w-0">
        <h2 className="text-slate-800 font-semibold text-base truncate">{nomComplet(employe)}</h2>
        {employe.telephone && <p className="text-xs text-slate-400 flex items-center gap-1 truncate"><Phone size={11} className="text-[#0369A1] shrink-0" /> {employe.telephone}</p>}
      </div>
    </div>

  <div className="space-y-2 mb-5 flex-1">
  {employe.postes.map(p => {
    const Icon = typeOf(p.type).icon;
    return (
      <div key={p.id} className="text-xs">
        <div className="flex items-center justify-between gap-2 text-slate-500 font-medium">
          <span className="flex items-center gap-1.5 min-w-0"><Icon size={13} className="text-[#0369A1] shrink-0" /> <span className="truncate">{p.poste}</span></span>
          <span className="whitespace-nowrap">{tarifLabel(p)}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 pl-[19px] flex-wrap">
  {p.type !== 'mensuel' && (
    <span>{p.joursFixes ? p.jours.map(j => cap(j).slice(0, 3)).join(', ') : `${joursParSemaine(p)} j/sem`}</span>
  )}
  {p.dateDebut && <span>{p.type !== 'mensuel' && '· '}Depuis le {formatDate(p.dateDebut)}</span>}
</div>
      </div>
    );
  })}
</div>

    <div className="flex items-center gap-2 flex-wrap mt-auto pt-3 border-t border-[#F1F5F9]">
      <button onClick={onOpen} className="flex items-center gap-1.5 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] border border-[#0369A1]/20 px-3 py-1.5 rounded-full hover:bg-[#c9e2f7] active:scale-95 transition">
        <Users2 size={13} /> Détails <ChevronRight size={13} />
      </button>
      <button onClick={onEdit} className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-700/20 px-3 py-1.5 rounded-full hover:bg-amber-100 active:scale-95 transition">
        <Pencil size={13} /> Modifier
      </button>
      <span className="ml-auto text-sm font-bold text-slate-700">{fmt(totalEmploye(employe))}</span>
    </div>
  </div>
);

const SalairesEmployes = () => {
  const navigate = useNavigate();
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [search, setSearch] = useState('');
  const [typeFiltre, setTypeFiltre] = useState('');
  const [modal, setModal] = useState(null);
  

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(API_URL)
      .then(res => { if (!res.ok) throw new Error('Erreur lors du chargement des employés'); return res.json(); })
      .then(data => { if (!cancelled) { setEmployes(data.map(employeFromApi)); setLoadError(null); } })
      .catch(err => { if (!cancelled) setLoadError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = employes.filter(e => nomComplet(e).toLowerCase().includes(search.toLowerCase()) && (!typeFiltre || e.postes.some(p => p.type === typeFiltre)));
  const total = filtered.reduce((s, e) => s + totalEmploye(e), 0);
  const payes = filtered.filter(e => e.statut === 'payé').reduce((s, e) => s + totalEmploye(e), 0);

  const handleSave = async (employe) => {
    const isEdit = employes.some(e => e.id === employe.id);
    const url = isEdit ? `${API_URL}/${employe.id}` : API_URL;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...employe, postes: employe.postes.map(posteToApi) }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Erreur lors de l'enregistrement");
    }
    const saved = employeFromApi(await res.json());
    setEmployes(prev => isEdit ? prev.map(e => e.id === saved.id ? saved : e) : [...prev, saved]);
  };

  const hasFilters = search || typeFiltre || dateDebut || dateFin;
  const clearFilters = () => { setSearch(''); setTypeFiltre(''); setDateDebut(''); setDateFin(''); };

  return (
    <ComptableLayout>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0"><Wallet size={22} className="text-white" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Salaires des employés</h1>
            <p className="text-slate-400 text-xs mt-0.5">{filtered.length} / {employes.length} employé(s)</p>
          </div>
        </div>
        <button onClick={() => setModal({})} className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all">
          <Plus size={14} /> Ajouter un employé
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatTile icon={Wallet} label="Total des salaires (estimé)" value={fmt(total)} color="blue" />
        <StatTile icon={Users2} label="Nombre d'employés" value={filtered.length} color="blue" />
        <StatTile icon={Wallet} label="Salaires payés" value={fmt(payes)} color="emerald" />
        <StatTile icon={Wallet} label="Salaires restants" value={fmt(total - payes)} color="amber" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <div className="relative min-w-[160px] flex-1 max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
        </div>
        <div className="w-px h-5 bg-[#E2E8F0]" />
        <div className="relative flex items-center">
          <Wallet size={13} className="absolute left-2 text-[#0369A1] pointer-events-none" />
          <select value={typeFiltre} onChange={e => setTypeFiltre(e.target.value)} className={`appearance-none text-xs rounded-full py-1.5 pr-7 pl-7 bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer transition ${typeFiltre ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}>
            <option value="">Type de rémunération</option>
            {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          {typeFiltre ? <button onClick={() => setTypeFiltre('')} className="absolute right-2 text-slate-300 hover:text-red-400"><X size={11} /></button> : <ChevronDown size={11} className="absolute right-2 text-slate-400 pointer-events-none" />}
        </div>
        <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 border border-[#E2E8F0]">
          <Calendar size={12} className="text-[#0369A1] flex-shrink-0" />
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className={`text-xs bg-transparent focus:outline-none transition ${dateDebut ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
          <span className="text-[#0369A1]/40 text-[10px] font-bold px-0.5">–</span>
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className={`text-xs bg-transparent focus:outline-none transition ${dateFin ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
        </div>
        {hasFilters && <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50"><X size={11} /> Tout effacer</button>}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Chargement des employés…</p>
      ) : loadError ? (
        <p className="text-red-500 text-sm">{loadError}</p>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(e => <EmployeCard key={e.id} employe={e} onOpen={() => navigate(`${BASE_PATH}/${e.id}`, { state: { employe: e, employes: filtered } })} onEdit={() => setModal({ employe: e })} />)}
        </div>
      ) : <p className="text-slate-400 text-sm">Aucun employé ne correspond à ces filtres.</p>}

      {modal && <EmployeModal employe={modal.employe} onClose={() => setModal(null)} onSave={handleSave} />}
    </ComptableLayout>
  );
};

export default SalairesEmployes;