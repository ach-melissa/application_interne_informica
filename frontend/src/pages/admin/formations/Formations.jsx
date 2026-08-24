import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Clock, DollarSign, BookOpen, UserCheck, Phone, Mail, MapPin, CalendarDays, CheckCircle2, GraduationCap, Pencil, Trash2, ChevronRight, ArrowLeft, Gauge ,Activity } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';
import AddFormationModal from './AddFormationModal';

const statutScolariteMeta = {
  en_cours:  { label: 'En cours',  cls: 'bg-blue-50 text-blue-600' },
  abandonne: { label: 'Abandonné', cls: 'bg-red-50 text-red-500' },
  termine:   { label: 'Terminé',   cls: 'bg-slate-100 text-slate-500' },
};
const STATUT_SCOLARITE_OPTS = ['en_cours', 'abandonne', 'termine'];
const Formations = () => {
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
const [expandedId, setExpandedId] = useState(null);
const [filterFormationId, setFilterFormationId] = useState('');
const [filterDateFrom, setFilterDateFrom] = useState('');
const [filterDateTo, setFilterDateTo] = useState('');
const [filterStatut, setFilterStatut] = useState(''); // '' | 'active' | 'non_active'
  const navigate = useNavigate();


  useEffect(() => {
    const fetchFormations = async () => {
      try {
const token = localStorage.getItem('token');
const res = await fetch(`${import.meta.env.VITE_API_URL}/api/formations`, {
  headers: { Authorization: `Bearer ${token}` }
});
if (!res.ok) throw new Error('Erreur serveur');
        const data = await res.json();
        setFormations(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFormations();
  }, []);

  const fetchInscriptionsConfirmed = async () => {
    setLoadingInscriptions(true);
    try {
const token = localStorage.getItem('token');
const res = await fetch(`${import.meta.env.VITE_API_URL}/api/inscriptions?statut=confirmed`, {
  headers: { Authorization: `Bearer ${token}` }
});
if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      setInscriptions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingInscriptions(false);
    }
  };

  const fetchInscriptionsByFormation = async (formation) => {
    setLoadingInscriptions(true);
    setSelectedFormation(formation);
    try {
const token = localStorage.getItem('token');
const res = await fetch(`${import.meta.env.VITE_API_URL}/api/inscriptions?formation_id=${formation.id}&statut=confirmed`, {
   headers: { Authorization: `Bearer ${token}` }
});
if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      setInscriptions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingInscriptions(false);
    }
  };


const handleDelete = async (formation) => {
  const nbGroupes = formation.nb_groupes ?? 0;
  const nbEtudiants = formation.nb_etudiants ?? 0;
  const message = (nbGroupes > 0 || nbEtudiants > 0)
    ? `Supprimer "${formation.nom}" supprimera aussi définitivement ${nbGroupes} groupe(s) et ${nbEtudiants} inscription(s) d'étudiants. Cette action est irréversible. Continuer ?`
    : `Supprimer définitivement "${formation.nom}" ? Cette action est irréversible.`;
  if (!window.confirm(message)) return;
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/formations/${formation.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Erreur serveur');
    setFormations((prev) => prev.filter((f) => f.id !== formation.id));
  } catch (err) {
    setError(err.message);
  }
};

const handleStatutScolariteChange = async (inscriptionId, value) => {
  const token = localStorage.getItem('token');
  try {
const res = await fetch(`${import.meta.env.VITE_API_URL}/api/etudiants/${inscriptionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ statut_scolarite: value }),
    });
    if (!res.ok) throw new Error('Erreur serveur');
    const updated = await res.json();
    setInscriptions(prev => prev.map(i => i.id === inscriptionId ? { ...i, statut_scolarite: updated.statut_scolarite } : i));
  } catch (err) {
    setError(err.message);
  }
};

 const filtered = formations.filter((f) => {
  const matchesSearch = f.nom.toLowerCase().includes(search.toLowerCase());
  const matchesStatut = !filterStatut || f.statut === filterStatut;
  return matchesSearch && matchesStatut;
});


const filteredInscriptions = inscriptions.filter((i) => {
    const matchesSearch =
      `${i.etudiant?.nom} ${i.etudiant?.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
      i.etudiant?.telephone?.includes(search) ||
      i.formation?.nom?.toLowerCase().includes(search.toLowerCase());

    const matchesFormation =
      !filterFormationId || i.formation?.nom === filterFormationId;

    const matchesDate = (() => {
      if (!filterDateFrom && !filterDateTo) return true;
      if (!i.date_inscription) return false;
      const d = new Date(i.date_inscription);
      if (filterDateFrom && d < new Date(filterDateFrom)) return false;
      if (filterDateTo && d > new Date(`${filterDateTo}T23:59:59`)) return false;
      return true;
    })();

    const matchesStatut = i.statut === 'confirmed';

    return matchesSearch && matchesFormation && matchesDate && matchesStatut;
  });

const COLS = [
  { label: 'Étudiant',  Icon: null,         width: 150 },
  { label: 'Tél.',      Icon: Phone,        width: 100 },
  { label: 'Email',     Icon: Mail,         width: 180 },
  { label: 'Niveau',    Icon: GraduationCap,width: 90  },
  { label: 'Adresse',   Icon: MapPin,       width: 160 },
  { label: 'Formation', Icon: Users,        width: 160 },
  { label: 'Date',      Icon: CalendarDays, width: 100 },
  { label: 'Statut',    Icon: CheckCircle2, width: 100 },
  { label: 'Scolarité', Icon: Activity,     width: 120 },
];

 const InscriptionsTable = () => (
  <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden inline-block max-w-full">
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead className="bg-[#0F2A4A]">
          <tr>
            {COLS.map(({ label, Icon }, i) => (
              <th key={label} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] ${i === 0 ? 'border-l border-[#0F2A4A]' : ''}`}>
                <div className="flex items-center gap-1">
                  {Icon && <Icon size={11} className="text-white/70 flex-shrink-0" />}
                  <span>{label}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredInscriptions.length === 0 ? (
            <tr><td colSpan={COLS.length} className="text-center py-10 text-slate-400 bg-white">Aucun étudiant trouvé.</td></tr>
          ) : filteredInscriptions.map((i, idx) => (
            <tr key={i.id} className={`hover:bg-slate-50 transition ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
              <td className="px-3 py-2 border-b border-l border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                    {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-700">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-slate-500 whitespace-nowrap border-b border-slate-100">{i.etudiant?.telephone ?? '—'}</td>
              <td className="px-3 py-2 text-slate-500 whitespace-nowrap border-b border-slate-100">{i.etudiant?.email ?? '—'}</td>
              <td className="px-3 py-2 text-slate-500 whitespace-nowrap border-b border-slate-100">{i.etudiant?.niveau_scolaire ?? '—'}</td>
              <td className="px-3 py-2 text-slate-500 whitespace-nowrap border-b border-slate-100">{i.etudiant?.adresse ?? '—'}</td>
              <td className="px-3 py-2 border-b border-slate-100">
                {i.formation?.nom
                  ? <span className="bg-[#DCEBFA] text-[#0369A1] px-2 py-0.5 rounded-full text-[11px] font-medium block">{i.formation.nom}</span>
                  : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-3 py-2 text-slate-400 whitespace-nowrap border-b border-slate-100">
                {i.date_inscription ? new Date(i.date_inscription).toLocaleDateString('fr-FR') : '—'}
              </td>
              <td className="px-3 py-2 border-b border-slate-100">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  i.statut === 'confirmed' ? 'bg-emerald-50 text-emerald-600' :
                  i.statut === 'pending' ? 'bg-amber-50 text-amber-700' :
                  'bg-red-50 text-red-500'
                }`}>
                  {i.statut === 'confirmed' ? 'Confirmé' :
                   i.statut === 'pending' ? 'En attente' : 'Non confirmé'}
                </span>
              </td>
              <td className="px-3 py-2 border-b border-slate-100">
                <select
                  value={i.statut_scolarite || 'en_cours'}
                  onChange={e => handleStatutScolariteChange(i.id, e.target.value)}
                  className={`w-full text-[11px] font-medium rounded-full pl-2 pr-5 py-0.5 border-none focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer ${statutScolariteMeta[i.statut_scolarite || 'en_cours']?.cls ?? 'bg-slate-100 text-slate-500'}`}
                >
                  {STATUT_SCOLARITE_OPTS.map(o => <option key={o} value={o}>{statutScolariteMeta[o].label}</option>)}
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
    <div key={f.id} className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] transition">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-[#DCEBFA] rounded-full flex items-center justify-center">
          <BookOpen size={20} className="text-[#0369A1]" />
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          f.statut === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
        }`}>
          {f.statut === 'active' ? 'Active' : 'Non active'}
        </span>
      </div>
      <h2 className="text-slate-800 font-semibold text-base mb-3">{f.nom}</h2>

      {f.a_niveaux && f.niveaux?.length > 0 && (
        <div className="mb-3">
          <button type="button" onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
            className="text-[11px] font-medium text-[#0369A1] flex items-center gap-1 mb-1.5">
            {f.niveaux.length} niveau(x) {expandedId === f.id ? '▲' : '▼'}
          </button>
          <div className="grid grid-cols-3 gap-1.5">
            {f.niveaux.map((n) => (
              <span key={n.id} className="text-[11px] font-medium h-9 flex items-center justify-center rounded-full bg-[#DCEBFA] text-[#0369A1] px-1 text-center">
                {n.nom}
              </span>
            ))}
          </div>
          {expandedId === f.id && (
            <div className="mt-2 space-y-1">
              {f.niveaux.map((n) => (
                <div key={n.id} className="flex items-center justify-between text-[11px] text-slate-500 bg-[#F8FAFC] rounded-lg px-2 py-1">
                  <span>{n.nom}</span>
                  <span>
                    {n.prix != null ? `${Number(n.prix).toLocaleString()} DA` : '—'}
                    {n.duree_valeur != null ? ` · ${n.duree_valeur} ${n.type_duree === 'seances' ? 'séances' : 'h'}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

<div className="flex items-center gap-4 text-xs text-slate-400 mb-5">
  <span className="flex items-center gap-1"><Users size={13} className="text-[#0369A1]" /> {f.nb_groupes ?? 0} groupe(s)</span>
  <span className="flex items-center gap-1"><UserCheck size={13} className="text-[#0369A1]" /> {f.nb_etudiants ?? 0} étudiant(s)</span>
 <span className="flex items-center gap-1">
  <Gauge size={13} className="text-[#0369A1]" />
  {f.capacite_groupe ?? 20} capacité
</span>
</div>
      <div className="flex items-center gap-4 text-xs text-slate-400 mb-5">
        {f.heures > 0 && (
          <span className="flex items-center gap-1"><Clock size={13} /> {f.heures}h</span>
        )}
        <span className="flex items-center gap-1">
          <DollarSign size={13} /> {Number(f.prix).toLocaleString()} DA
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => navigate(`/admin/formations/${f.id}/groups`)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] border border-[#0369A1]/20 px-3 py-1.5 rounded-full hover:bg-[#c9e2f7] hover:shadow-sm active:scale-95 transition"
        >
          <Users size={13} /> Groupes <ChevronRight size={13} />
        </button>
        <button
          onClick={() => {
            setSearch('');
            fetchInscriptionsByFormation(f);
            setView('formation_inscriptions');
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-600/20 px-3 py-1.5 rounded-full hover:bg-emerald-100 hover:shadow-sm active:scale-95 transition"
        >
          <UserCheck size={13} /> Inscriptions <ChevronRight size={13} />
        </button>
        <button
          onClick={() => navigate(`/admin/formations/${f.id}/emplois`)}
          className="flex items-center gap-1.5 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-600/20 px-3 py-1.5 rounded-full hover:bg-violet-100 hover:shadow-sm active:scale-95 transition"
        >
          <CalendarDays size={13} /> Emplois global <ChevronRight size={13} />
        </button>
        <button
          onClick={() => setEditingFormation(f)}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-700/20 px-3 py-1.5 rounded-full hover:bg-amber-100 hover:shadow-sm active:scale-95 transition"
        >
          <Pencil size={13} /> Modifier
        </button>

        <button
          onClick={() => handleDelete(f)}
          className="flex items-center gap-1.5 text-xs font-medium text-red-500 bg-red-50 border border-red-500/20 px-3 py-1.5 rounded-full hover:bg-red-100 hover:shadow-sm active:scale-95 transition"
        >
          <Trash2 size={13} /> Supprimer
        </button>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      {/* Header */}
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-3">
    <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
      <BookOpen size={22} className="text-white" />
    </div>
    <h1 className="text-xl font-bold text-slate-800">Formations</h1>
  </div>
        {view === 'formations' && (
         <button
  onClick={() => setShowAddModal(true)}
  className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium
            shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all"
>
  <Plus size={18} />
  Ajouter une formation
</button>
        )}
      </div>

      {/* Tabs — only formations & all_inscriptions, NOT formation_inscriptions */}
      {view !== 'formation_inscriptions' && (
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => { setView('formations'); setSearch(''); setSelectedFormation(null); setExpandedId(null); }}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition ${
              view === 'formations'
                ? 'bg-[#0F2A4A] text-white'
                : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'
            }`}
          >
            Formations
          </button>
          <button
            onClick={() => { setView('all_inscriptions'); setSearch(''); setSelectedFormation(null); setExpandedId(null); fetchInscriptionsConfirmed(); }}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition ${
              view === 'all_inscriptions'
                ? 'bg-[#0F2A4A] text-white'
                : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'
            }`}
          >
            Toutes les inscriptions
          </button>
        </div>
      )}


      {/* Loading */}
      {(loading || loadingInscriptions) && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      )}

         {view === 'formations' && !loading && !error && (
  <>
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher une formation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
        />
      </div>

      <select
        value={filterStatut}
        onChange={(e) => setFilterStatut(e.target.value)}
        className="px-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
      >
        <option value="">Toutes les formations</option>
        <option value="active">Active</option>
        <option value="non_active">Non active</option>
      </select>

      {(search || filterStatut) && (
        <button
          onClick={() => { setSearch(''); setFilterStatut(''); }}
          className="text-xs text-slate-400 hover:text-red-500 underline"
        >
          Réinitialiser
        </button>
      )}
    </div>

    {filtered.length === 0 ? (
      <p className="text-slate-400 text-sm">Aucune formation trouvée.</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(renderCard)}
      </div>
    )}
  </>
)}

      {/* VIEW: Tout les inscriptions confirmés */}
{view === 'all_inscriptions' && !loadingInscriptions && !error && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher (nom, formation, téléphone)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
              />
            </div>

<select
  value={filterFormationId}
  onChange={(e) => setFilterFormationId(e.target.value)}
  className="px-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
>
  <option value="">Toutes les formations</option>
  {formations.map((f) => (
    <option key={f.id} value={f.nom}>{f.nom}</option>
  ))}
</select>

            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
            />
            <span className="text-slate-400 text-xs">→</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
            />

            {(filterFormationId || filterDateFrom || filterDateTo) && (
              <button
                onClick={() => { setFilterFormationId(''); setFilterDateFrom(''); setFilterDateTo(''); }}
                className="text-xs text-slate-400 hover:text-red-500 underline"
              >
                Réinitialiser
              </button>
            )}
          </div>
          <InscriptionsTable />
        </>
      )}

      {/* VIEW: Inscriptions par formation */}
      {view === 'formation_inscriptions' && !loadingInscriptions && !error && (
        <>
          <div className="flex items-center gap-1.5 text-xs mb-2">
            <button onClick={() => { setView('formations'); setSelectedFormation(null); setSearch(''); setExpandedId(null); }} className="text-slate-400 hover:text-[#0369A1] hover:underline transition">
              Formations
            </button>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-[#0369A1] font-medium">Inscriptions — {selectedFormation?.nom}</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => { setView('formations'); setSelectedFormation(null); setSearch(''); setExpandedId(null); }}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-[#F1F5F9] hover:bg-[#DCEBFA] transition"
            >
              <ArrowLeft size={16} className="text-[#0369A1]" />
            </button>
            <h2 className="text-lg font-bold text-slate-800">Inscriptions — {selectedFormation?.nom}</h2>
          </div>
          <p className="mb-4 text-sm text-slate-400 ml-11">
            {filteredInscriptions.length} étudiant(s)
          </p>
          
      {/* Search */}
      <div className="relative mb-6 max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
        <input
          type="text"
          placeholder={view === 'formations' ? 'Rechercher une formation...' : 'Rechercher un étudiant...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
        />
      </div>
          <InscriptionsTable />
        </>
      )}
      {showAddModal && (
  <AddFormationModal
    onClose={() => setShowAddModal(false)}
    onSuccess={(newFormation) => {
      setFormations((prev) => [newFormation, ...prev]);
      setShowAddModal(false);
    }}
  />
)}
{editingFormation && (
  <AddFormationModal
    formation={editingFormation}
    onClose={() => setEditingFormation(null)}
    onSuccess={(updated) => {
      setFormations((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setEditingFormation(null);
    }}
  />
)}
    </AdminLayout>
  );
};

export default Formations;