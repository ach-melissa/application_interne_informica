import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Clock, DollarSign, BookOpen, UserCheck, Phone, Mail, MapPin, CalendarDays, CheckCircle2, GraduationCap, Pencil, Trash2, ChevronRight, ArrowLeft, Gauge, Activity, X, ChevronDown, AlertTriangle, Layers, UserCircle, UserX } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';
import AddFormationModal from './AddFormationModal';
import EtudiantDetailModal from '../students/EtudiantDetailModal';

const API = import.meta.env.VITE_API_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const STATUT_SCOLARITE_META = {
  en_cours:  { label: 'En cours',  cls: 'bg-blue-50 text-blue-600' },
  abandonne: { label: 'Abandonné', cls: 'bg-red-50 text-red-500' },
  termine:   { label: 'Terminé',   cls: 'bg-slate-100 text-slate-500' },
};
const FORMATION_STATUT_META = {
  active:     { label: 'Active',     cls: 'bg-emerald-50 text-emerald-600' },
  non_active: { label: 'Non active', cls: 'bg-slate-100 text-slate-500' },
};
const INSCRIPTION_STATUT_META = {
  confirmed: { label: 'Confirmé',     cls: 'bg-emerald-50 text-emerald-600' },
  pending:   { label: 'En attente',   cls: 'bg-amber-50 text-amber-700' },
};
const StatTile = ({ icon: Icon, label, value, color = 'blue' }) => {
  const COLORS = { blue: { bg: 'bg-[#DCEBFA]', text: 'text-[#0369A1]' }, red: { bg: 'bg-red-50', text: 'text-red-500' }, emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' } };
  const c = COLORS[color] ?? COLORS.blue;
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-[#F1F5F9] px-4 py-3">
      <div className={`w-9 h-9 rounded-full ${c.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} className={c.text} />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
};
const FilterSelect = ({ icon: Icon, label, value, onChange, opts, display }) => (
  <div className="relative flex items-center">
    {Icon && <Icon size={13} className="absolute left-2 text-[#0369A1] pointer-events-none" />}
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      className={`appearance-none text-xs rounded-full py-1.5 pr-7 pl-7 bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer transition ${value ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}>
      <option value="">{label}</option>
      {opts.map(o => <option key={o} value={o}>{display ? display(o) : o}</option>)}
    </select>
    {value ? <button onClick={() => onChange('')} className="absolute right-2 text-slate-300 hover:text-red-400"><X size={11} /></button>
      : <ChevronDown size={11} className="absolute right-2 text-slate-400 pointer-events-none" />}
  </div>
);

const COLS = [
  { label: 'Étudiant',  Icon: null,          width: 160 },
  { label: 'Tél.',      Icon: Phone,         width: 100 },
  { label: 'Email',     Icon: Mail,          width: 170 },
  { label: 'Niveau',    Icon: GraduationCap, width: 90  },
  { label: 'Formation', Icon: Users,         width: 150 },
  { label: 'Niveau de formation', Icon: Layers, width: 130 }, // NEW
  { label: 'Date',      Icon: CalendarDays,  width: 90  },
  { label: 'Statut',    Icon: CheckCircle2,  width: 100 },
  { label: 'Scolarité', Icon: Activity,      width: 110 },
];

const Formations = () => {
  const navigate = useNavigate();
  const isGroupLocked = dateFin => {
    if (!dateFin) return false;
    const limit = new Date(dateFin);
    limit.setDate(limit.getDate() + 30);
    return new Date() > limit;
  };
  const [showAddModal, setShowAddModal] = useState(false);
  const [formations, setFormations] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('formations');
  const [loading, setLoading] = useState(true);
  const [loadingInscriptions, setLoadingInscriptions] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [editingFormation, setEditingFormation] = useState(null);
  const [filterFormationId, setFilterFormationId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterScolarite, setFilterScolarite] = useState('');
  const [filterNiveau, setFilterNiveau] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedInscription, setSelectedInscription] = useState(null);

  const [statutOpts, setStatutOpts] = useState(['active', 'non_active']);
  const [statutScolariteOpts, setStatutScolariteOpts] = useState(['en_cours', 'abandonne', 'termine']);

  useEffect(() => {
    fetch(`${API}/api/formations`, { headers: headers() })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Erreur serveur')))
      .then(setFormations).catch(err => setError(err.message)).finally(() => setLoading(false));

    fetch(`${API}/api/formations/statut-options`, { headers: headers() })
      .then(r => r.ok ? r.json() : null).then(d => d?.length && setStatutOpts(d)).catch(() => {});
    fetch(`${API}/api/formations/statut-scolarite-options`, { headers: headers() })
      .then(r => r.ok ? r.json() : null).then(d => d?.length && setStatutScolariteOpts(d)).catch(() => {});
  }, []);

  const fetchInscriptionsConfirmed = async () => {
    setLoadingInscriptions(true);
    try {
      const res = await fetch(`${API}/api/inscriptions?statut=confirmed`, { headers: headers() });
      if (!res.ok) throw new Error('Erreur serveur');
      setInscriptions(await res.json());
    } catch (err) { setError(err.message); } finally { setLoadingInscriptions(false); }
  };

  const fetchInscriptionsByFormation = async (formation) => {
    setLoadingInscriptions(true);
    setSelectedFormation(formation);
    try {
      const res = await fetch(`${API}/api/inscriptions?formation_id=${formation.id}&statut=confirmed`, { headers: headers() });
      if (!res.ok) throw new Error('Erreur serveur');
      setInscriptions(await res.json());
    } catch (err) { setError(err.message); } finally { setLoadingInscriptions(false); }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true); setError(null);
    try {
      const res = await fetch(`${API}/api/formations/${confirmDelete.id}`, { method: 'DELETE', headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setFormations(prev => prev.filter(f => f.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      setError(err.message);
      setConfirmDelete(null); // ferme le modal de confirmation pour laisser voir le message d'erreur
    } finally { setDeleting(false); }
  };

  const handleStatutScolariteChange = async (inscriptionId, value) => {
    try {
      const res = await fetch(`${API}/api/etudiants/${inscriptionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ statut_scolarite: value }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      const updated = await res.json();
      setInscriptions(prev => prev.map(i => i.id === inscriptionId ? { ...i, statut_scolarite: updated.statut_scolarite } : i));
    } catch (err) { setError(err.message); }
  };

  const refetchInscriptions = () => {
    if (view === 'formation_inscriptions' && selectedFormation) fetchInscriptionsByFormation(selectedFormation);
    else fetchInscriptionsConfirmed();
  };

  const filtered = formations.filter(f =>
    f.nom.toLowerCase().includes(search.toLowerCase()) && (!filterStatut || f.statut === filterStatut));

 const filteredInscriptions = inscriptions.filter(i => {
    if (i.archived) return false;
    const txt = `${i.etudiant?.nom} ${i.etudiant?.prenom}`.toLowerCase();
    if (search && !txt.includes(search.toLowerCase()) && !i.etudiant?.telephone?.includes(search) && !i.formation?.nom?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterFormationId && i.formation?.nom !== filterFormationId) return false;
    if (filterNiveau && i.niveau?.nom !== filterNiveau) return false;
    if (filterScolarite && (i.statut_scolarite || 'en_cours') !== filterScolarite) return false;   
    if (i.date_inscription) {
      const d = new Date(i.date_inscription);
      if (filterDateFrom && d < new Date(filterDateFrom)) return false;
      if (filterDateTo && d > new Date(`${filterDateTo}T23:59:59`)) return false;
    } else if (filterDateFrom || filterDateTo) return false;
    return i.statut === 'confirmed';
  });
    const totalInscriptionsCount = filteredInscriptions.length;
  const abandonnesCount = filteredInscriptions.filter(i => i.statut_scolarite === 'abandonne').length;
  const nonAbandonnesCount = totalInscriptionsCount - abandonnesCount;

  const InscriptionsTable = () => (
    <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
      <div className="overflow-x-auto">
        <table style={{ tableLayout: 'fixed', width: '100%' }} className="text-xs">
          <colgroup>{COLS.map(c => <col key={c.label} style={{ width: `${c.width}px` }} />)}</colgroup>
          <thead className="bg-[#0F2A4A]">
            <tr>
              {COLS.map(({ label, Icon }, i) => (
                <th key={label} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] overflow-hidden ${i === 0 ? 'border-l border-[#0F2A4A]' : ''}`}>
                  <div className="flex items-center gap-1">
                    {Icon && <Icon size={11} className="text-white/70 flex-shrink-0" />}
                    <span className="truncate">{label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredInscriptions.length === 0 ? (
              <tr><td colSpan={COLS.length} className="text-center py-10 text-slate-400 bg-white">Aucun étudiant trouvé.</td></tr>
            ) : filteredInscriptions.map((i, idx) => (
              <tr key={i.id} onClick={() => setSelectedInscription(i)}
                className={`hover:bg-slate-50 transition cursor-pointer ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                <td className="px-3 py-2 overflow-hidden border-b border-l border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                      {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-700 truncate">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-500 truncate border-b border-slate-100">{i.etudiant?.telephone ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500 truncate border-b border-slate-100">{i.etudiant?.email ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500 truncate border-b border-slate-100">{i.etudiant?.niveau_scolaire ?? '—'}</td>
                <td className="px-3 py-2 overflow-hidden border-b border-slate-100">
                  {i.formation?.nom
                    ? <span className="inline-block bg-[#DCEBFA] text-[#0369A1] px-2 py-0.5 rounded-full text-[11px] font-medium truncate max-w-full">{i.formation.nom}</span>
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2 overflow-hidden border-b border-slate-100">
  {i.niveau?.nom
    ? <span className="inline-block bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full text-[11px] font-medium truncate max-w-full">{i.niveau.nom}</span>
    : <span className="text-slate-300">—</span>}
</td>
                <td className="px-3 py-2 text-slate-400 truncate border-b border-slate-100">
                  {i.date_inscription ? new Date(i.date_inscription).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-3 py-2 overflow-hidden border-b border-slate-100">
                  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${INSCRIPTION_STATUT_META[i.statut]?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                    {INSCRIPTION_STATUT_META[i.statut]?.label ?? i.statut}
                  </span>
                </td>
                <td className="px-2 py-2 overflow-hidden border-b border-slate-100" onClick={e => e.stopPropagation()}>
                  <select value={i.statut_scolarite || 'en_cours'} onChange={e => handleStatutScolariteChange(i.id, e.target.value)}
    disabled={isGroupLocked(i.groups?.date_fin)}
    className={`w-full text-[11px] font-medium rounded-full px-2 py-0.5 border-none focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 ${isGroupLocked(i.groups?.date_fin) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${STATUT_SCOLARITE_META[i.statut_scolarite || 'en_cours']?.cls ?? 'bg-slate-100 text-slate-500'}`}>
    {statutScolariteOpts.map(o => <option key={o} value={o}>{STATUT_SCOLARITE_META[o]?.label ?? o}</option>)}
  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCard = (f) => (
      <div key={f.id} className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] transition flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-[#DCEBFA] rounded-full flex items-center justify-center"><BookOpen size={20} className="text-[#0369A1]" /></div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${FORMATION_STATUT_META[f.statut]?.cls ?? 'bg-slate-100 text-slate-500'}`}>
          {FORMATION_STATUT_META[f.statut]?.label ?? f.statut}
        </span>
      </div>
      <h2 className="text-slate-800 font-semibold text-base mb-3">{f.nom}</h2>

      

          <div className="flex items-center gap-4 text-xs text-slate-400 mb-2">
  {f.a_niveaux ? (
    <span className="flex items-center gap-1"><Layers size={13} className="text-[#0369A1]" /> {f.niveaux?.length ?? 0} niveau(x)</span>
  ) : (
    <>
      <span className="flex items-center gap-1"><Gauge size={13} className="text-[#0369A1]" /> {f.capacite_groupe ?? 20} capacité</span>
      <span className="flex items-center gap-1"><Users size={13} className="text-[#0369A1]" /> {f.nb_groupes ?? 0} groupe(s)</span>
    </>
  )}
  <span className="flex items-center gap-1"><UserCheck size={13} className="text-[#0369A1]" /> {f.nb_etudiants ?? 0} étudiant(s)</span>
</div>
      <div className="flex items-center gap-4 text-xs text-slate-400 mb-5">
   {!f.a_niveaux && f.heures > 0 && (
  <span className="flex items-center gap-1">
    <Clock size={13} /> {f.heures} {f.type_duree === 'seances' ? 'séances' : 'h'}
  </span>
)}
        {!f.a_niveaux && (
        <span className="flex items-center gap-1"><DollarSign size={13} /> {Number(f.prix).toLocaleString()} DA</span>
        )}
      </div>

       <div className="flex items-center gap-2 flex-wrap mt-auto pt-3">
    <button onClick={() => navigate(f.a_niveaux ? `/admin/formations/${f.id}/niveaux` : `/admin/formations/${f.id}/groups`)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] border border-[#0369A1]/20 px-3 py-1.5 rounded-full hover:bg-[#c9e2f7] active:scale-95 transition">
          {f.a_niveaux ? <Layers size={13} /> : <Users size={13} />} {f.a_niveaux ? 'Niveaux' : 'Groupes'} <ChevronRight size={13} />
        </button>
       <button onClick={() => { setSearch(''); setFilterNiveau(''); fetchInscriptionsByFormation(f); setView('formation_inscriptions'); }}
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-600/20 px-3 py-1.5 rounded-full hover:bg-emerald-100 active:scale-95 transition">
          <UserCheck size={13} /> Inscriptions <ChevronRight size={13} />
        </button>
        <button onClick={() => navigate(`/admin/formations/${f.id}/emplois`)}
          className="flex items-center gap-1.5 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-600/20 px-3 py-1.5 rounded-full hover:bg-violet-100 active:scale-95 transition">
          <CalendarDays size={13} /> Emplois <ChevronRight size={13} />
        </button>
        <button onClick={() => setEditingFormation(f)}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-700/20 px-3 py-1.5 rounded-full hover:bg-amber-100 active:scale-95 transition">
          <Pencil size={13} /> Modifier
        </button>
<button onClick={async () => {
            try {
              const res = await fetch(`${API}/api/formations`, { headers: headers() });
              if (!res.ok) throw new Error('Erreur serveur');
              const fresh = await res.json();
              setFormations(fresh);
              setConfirmDelete(fresh.find(x => x.id === f.id) || f);
            } catch (err) { setError(err.message); }
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-red-500 bg-red-50 border border-red-500/20 px-3 py-1.5 rounded-full hover:bg-red-100 active:scale-95 transition">
          <Trash2 size={13} /> Supprimer
        </button>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0"><BookOpen size={22} className="text-white" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Formations</h1>
            <p className="text-slate-400 text-xs mt-0.5">{filtered.length} / {formations.length} formation(s)</p>
          </div>
        </div>
        {view === 'formations' && (
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all">
            <Plus size={14} /> Ajouter une formation
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 rounded-md px-3 py-2 flex items-center justify-between gap-3">
          <p className="text-red-500 text-xs flex items-center gap-1.5"><AlertTriangle size={13} /> {error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X size={13} /></button>
        </div>
      )}

      {view !== 'formation_inscriptions' && (
        <div className="flex items-center gap-2 mb-6">
      <button onClick={() => { setView('formations'); setSearch(''); setSelectedFormation(null); }}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition ${view === 'formations' ? 'bg-[#0F2A4A] text-white' : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'}`}>
            Formations
          </button>
          <button onClick={() => { setView('all_inscriptions'); setSearch(''); setSelectedFormation(null); fetchInscriptionsConfirmed(); }}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition ${view === 'all_inscriptions' ? 'bg-[#0F2A4A] text-white' : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'}`}>
            Toutes les inscriptions
          </button>
        </div>
      )}

      {(loading || loadingInscriptions) && (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" /></div>
      )}

      {view === 'formations' && !loading && (
        <>
          <div className="mb-6 flex flex-wrap gap-2 items-center">
            <div className="relative min-w-[160px] flex-1 max-w-[220px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
              <input placeholder="Rechercher une formation..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
            </div>
            <div className="w-px h-5 bg-[#E2E8F0]" />
            <FilterSelect icon={CheckCircle2} label="Statut" value={filterStatut} onChange={setFilterStatut} opts={statutOpts} display={o => FORMATION_STATUT_META[o]?.label ?? o} />
            {(search || filterStatut) && (
              <button onClick={() => { setSearch(''); setFilterStatut(''); }} className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
                <X size={11} /> Tout effacer
              </button>
            )}
          </div>
          {filtered.length === 0 ? <p className="text-slate-400 text-sm">Aucune formation trouvée.</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{filtered.map(renderCard)}</div>
          )}
        </>
      )}

      {view === 'all_inscriptions' && !loadingInscriptions && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatTile icon={UserCircle} label="Total inscriptions" value={totalInscriptionsCount} color="blue" />
            <StatTile icon={UserCheck} label="Non abandonnés" value={nonAbandonnesCount} color="emerald" />
            <StatTile icon={UserX} label="Abandonnés" value={abandonnesCount} color="red" />
          </div>
          <div className="mb-6 flex flex-wrap gap-2 items-center">
            <div className="relative min-w-[160px] flex-1 max-w-[220px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
              <input placeholder="Rechercher (nom, formation, téléphone)..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
            </div>
            <div className="w-px h-5 bg-[#E2E8F0]" />
<FilterSelect icon={Users} label="Formation" value={filterFormationId}
  onChange={v => { setFilterFormationId(v); setFilterNiveau(''); }}
  opts={formations.map(f => f.nom)} />
{filterFormationId && formations.find(f => f.nom === filterFormationId)?.a_niveaux && (
  <>
    <div className="w-px h-5 bg-[#E2E8F0]" />
    <FilterSelect icon={Layers} label="Niveau" value={filterNiveau} onChange={setFilterNiveau}
      opts={formations.find(f => f.nom === filterFormationId)?.niveaux?.map(n => n.nom) ?? []} />
  </>
)}

<div className="w-px h-5 bg-[#E2E8F0]" />
<FilterSelect icon={Activity} label="Scolarité" value={filterScolarite} onChange={setFilterScolarite}
  opts={statutScolariteOpts} display={o => STATUT_SCOLARITE_META[o]?.label ?? o} />
            <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 border border-[#E2E8F0]">
              <CalendarDays size={12} className="text-[#0369A1] flex-shrink-0" />
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className={`text-xs bg-transparent focus:outline-none transition ${filterDateFrom ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
              <span className="text-[#0369A1]/40 text-[10px] font-bold px-0.5">–</span>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className={`text-xs bg-transparent focus:outline-none transition ${filterDateTo ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
            </div>
      {(filterFormationId || filterDateFrom || filterDateTo || filterScolarite || filterNiveau) && (
  <button onClick={() => { setFilterFormationId(''); setFilterDateFrom(''); setFilterDateTo(''); setFilterScolarite(''); setFilterNiveau(''); }}
    className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
    <X size={11} /> Tout effacer
  </button>
)}
          </div>
          <InscriptionsTable />
        </>
      )}

      {view === 'formation_inscriptions' && !loadingInscriptions && (
        <>
          <div className="flex items-center gap-3 mb-2">
<button onClick={() => { setView('formations'); setSelectedFormation(null); setSearch(''); setFilterNiveau(''); }}
  className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition flex-shrink-0">
  <ArrowLeft size={16} className="text-[#0369A1]" />
</button>
<div className="flex items-center gap-1.5 text-xs">
  <button onClick={() => { setView('formations'); setSelectedFormation(null); setSearch(''); setFilterNiveau(''); }} className="text-slate-400 hover:text-[#0369A1] transition">Formations</button>
              <span className="text-slate-300">›</span>
              <span className="text-[#0369A1] font-medium">Inscriptions • {selectedFormation?.nom}</span>
            </div>
          </div>
          <p className="mb-4 text-xs text-slate-400 ml-12">{filteredInscriptions.length} étudiant(s)</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatTile icon={UserCircle} label="Total inscriptions" value={totalInscriptionsCount} color="blue" />
            <StatTile icon={UserCheck} label="Non abandonnés" value={nonAbandonnesCount} color="emerald" />
            <StatTile icon={UserX} label="Abandonnés" value={abandonnesCount} color="red" />
          </div>
         <div className="mb-6 flex flex-wrap items-center gap-2 max-w-xl">
  <div className="relative flex-1 min-w-[160px] max-w-xs">
    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
    <input placeholder="Rechercher un étudiant..." value={search} onChange={e => setSearch(e.target.value)}
      className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
  </div>
<FilterSelect icon={Activity} label="Scolarité" value={filterScolarite} onChange={setFilterScolarite}
    opts={statutScolariteOpts} display={o => STATUT_SCOLARITE_META[o]?.label ?? o} />

  {selectedFormation?.a_niveaux && (
    <FilterSelect icon={Layers} label="Niveau" value={filterNiveau} onChange={setFilterNiveau}
      opts={selectedFormation.niveaux?.map(n => n.nom) ?? []} />
  )}
</div>
          <InscriptionsTable />
        </>
      )}

      {showAddModal && (
        <AddFormationModal onClose={() => setShowAddModal(false)}
          onSuccess={(f) => { setFormations(p => [f, ...p]); setShowAddModal(false); }} />
      )}
      {editingFormation && (
        <AddFormationModal formation={editingFormation} onClose={() => setEditingFormation(null)}
          onSuccess={(u) => { setFormations(p => p.map(f => f.id === u.id ? u : f)); setEditingFormation(null); }} />
      )}
      {selectedInscription && (
        <EtudiantDetailModal inscription={selectedInscription} onClose={() => setSelectedInscription(null)}
          onSuccess={() => { setSelectedInscription(null); refetchInscriptions(); }} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !deleting && setConfirmDelete(null)}>
          <div onClick={ev => ev.stopPropagation()} className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center shrink-0"><Trash2 size={15} className="text-white" /></div>
                <h2 className="text-sm font-semibold text-slate-800">Supprimer la formation</h2>
              </div>
              <button onClick={() => setConfirmDelete(null)} className="text-slate-300 hover:text-slate-600 flex-shrink-0"><X size={16} /></button>
            </div>
            <div className="px-5 py-4">
              <div className="bg-red-50 rounded-md p-3">
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="flex-shrink-0" />
{confirmDelete.nb_inscriptions_total > 0
    ? `Suppression impossible : des étudiants sont ou ont été inscrits dans « ${confirmDelete.nom} » (actifs, abandonnés ou archivés).`
    : confirmDelete.nb_groupes_archives > 0
    ? `Suppression impossible : « ${confirmDelete.nom} » a ${confirmDelete.nb_groupes_archives} groupe(s) archivé(s). L'historique doit être conservé.`
    : confirmDelete.nb_groupes > 0
    ? `Supprimer « ${confirmDelete.nom} » supprimera aussi ${confirmDelete.nb_groupes} groupe(s) vide(s). Action irréversible.`
    : `Supprimer définitivement « ${confirmDelete.nom} » ? Action irréversible.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#F1F5F9]">
              <button onClick={() => setConfirmDelete(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100">Annuler</button>
<button onClick={doDelete} disabled={deleting || confirmDelete.nb_inscriptions_total > 0 || confirmDelete.nb_groupes_archives > 0}
             className="text-xs px-3 py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-40">
                {deleting ? '...' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Formations;