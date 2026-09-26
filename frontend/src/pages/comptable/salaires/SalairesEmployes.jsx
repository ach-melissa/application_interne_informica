import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Wallet, Pencil, Phone, Users2, Calendar, ChevronRight, ChevronDown, X, Trash2, AlertTriangle } from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';
import EmployeModal, { StatTile, TYPES, typeOf, nomComplet, tarifLabel, totalEmploye, fmt, initiales, formatDate, joursParSemaine, cap, posteToApi, employeFromApi } from './EmployeModal';
const BASE_PATH = '/comptable/salaires/employes';
const API_URL = `${import.meta.env.VITE_API_URL}/api/employes`;


const EmployeCard = ({ employe, onOpen, onEdit, onDelete }) => (
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
      <button
        onClick={onDelete}
        disabled={employe.nb_mouvements > 0}
        title={employe.nb_mouvements > 0 ? `${employe.nb_mouvements} mouvement(s) de salaire lié(s) : suppression impossible` : undefined}
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition ${
          employe.nb_mouvements > 0
            ? 'text-slate-300 bg-slate-50 border-slate-200 cursor-not-allowed'
            : 'text-red-600 bg-red-50 border-red-600/20 hover:bg-red-100 active:scale-95'
        }`}
      >
        <Trash2 size={13} /> Supprimer
      </button>
      <span className="ml-auto text-sm font-bold text-slate-700">{fmt(totalEmploye(employe))}</span>
    </div>
    {employe.nb_mouvements > 0 && (
      <p className="text-[10px] text-slate-400 mt-2">
        {employe.nb_mouvements} mouvement(s) lié(s) — non supprimable
      </p>
    )}
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
  const [deleteError, setDeleteError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
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

const dansPeriode = (e) => {
  if (!dateDebut && !dateFin) return true;
  return e.postes.some(p => {
    if (!p.dateDebut) return false;
    if (dateDebut && p.dateDebut < dateDebut) return false;
    if (dateFin && p.dateDebut > dateFin) return false;
    return true;
  });
};
const filtered = employes.filter(e =>
  nomComplet(e).toLowerCase().includes(search.toLowerCase()) &&
  (!typeFiltre || e.postes.some(p => p.type === typeFiltre)) &&
  dansPeriode(e)
);
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

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${API_URL}/${confirmDelete.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Erreur lors de la suppression");
      setEmployes(prev => prev.filter(e => e.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(err.message);
      setConfirmDelete(null); // ferme le modal de confirmation pour laisser voir le message d'erreur
    } finally {
      setDeleting(false);
    }
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

      {deleteError && (
        <div className="mb-4 flex items-center justify-between gap-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
        </div>
      )}

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
          {filtered.map(e => <EmployeCard key={e.id} employe={e} onOpen={() => navigate(`${BASE_PATH}/${e.id}`, { state: { employe: e, employes: filtered } })} onEdit={() => setModal({ employe: e })} onDelete={() => setConfirmDelete(e)} />)}
        </div>
      ) : <p className="text-slate-400 text-sm">Aucun employé ne correspond à ces filtres.</p>}

      {modal && <EmployeModal employe={modal.employe} onClose={() => setModal(null)} onSave={handleSave} />}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !deleting && setConfirmDelete(null)}>
          <div onClick={ev => ev.stopPropagation()} className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center shrink-0"><Trash2 size={15} className="text-white" /></div>
                <h2 className="text-sm font-semibold text-slate-800">Supprimer l'employé</h2>
              </div>
              <button onClick={() => setConfirmDelete(null)} className="text-slate-300 hover:text-slate-600 flex-shrink-0"><X size={16} /></button>
            </div>
            <div className="px-5 py-4">
              <div className="bg-red-50 rounded-md p-3">
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="flex-shrink-0" />
                  {confirmDelete.nb_mouvements > 0
                    ? `Suppression impossible : ${confirmDelete.nb_mouvements} mouvement(s) de salaire sont liés à ${nomComplet(confirmDelete)} (avances, retenues, primes...).`
                    : `Supprimer définitivement ${nomComplet(confirmDelete)} ? Action irréversible.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#F1F5F9]">
              <button onClick={() => setConfirmDelete(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100">Annuler</button>
              <button onClick={doDelete} disabled={deleting || confirmDelete.nb_mouvements > 0}
                className="text-xs px-3 py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-40">
                {deleting ? '...' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ComptableLayout>
  );
};

export default SalairesEmployes;