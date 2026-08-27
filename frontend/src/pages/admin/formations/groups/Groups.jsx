import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Pencil, Trash2, X, ChevronRight, Search, AlertTriangle, Archive } from 'lucide-react';
import AdminLayout from '../../../../layouts/AdminLayout';
import GroupFormModal from './GroupFormModal';

const API = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// Shared small dialog used for delete-confirm, delete-blocked and archive prompts.
const Dialog = ({ icon: Icon = AlertTriangle, iconBg, title, children, onClose, actions }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div onClick={ev => ev.stopPropagation()} className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}><Icon size={15} className="text-white" /></div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-600 flex-shrink-0"><X size={16} /></button>
      </div>
      <div className="px-5 py-4">{children}</div>
      <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#F1F5F9]">{actions}</div>
    </div>
  </div>
);

const Groups = () => {
  const { id: formation_id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const niveauId = searchParams.get('niveau_id');

  const [groups, setGroups] = useState([]);
  const [formation, setFormation] = useState(null);
  const niveau = formation?.niveaux?.find(n => n.id === niveauId);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [archivingGroup, setArchivingGroup] = useState(null);
  const [archiveYear, setArchiveYear] = useState('');
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [blockedDelete, setBlockedDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filteredGroups = groups.filter(g => g.nom.toLowerCase().includes(search.toLowerCase()));

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const url = `${API}/api/groups?formation_id=${formation_id}${niveauId ? `&niveau_id=${niveauId}` : ''}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error('Erreur serveur');
      setGroups(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetch(`${API}/api/formations/${formation_id}`, { headers: authHeaders() }).then(r => r.json()).then(setFormation).catch(() => {});
    fetch(`${API}/api/teachers?formation_id=${formation_id}`, { headers: authHeaders() }).then(r => r.json()).then(setTeachers).catch(() => {});
  }, [formation_id, niveauId]);

  const openAdd = () => { setEditGroup(null); setShowModal(true); };
  const openEdit = (g) => { setEditGroup(g); setShowModal(true); };
  const closeModal = () => setShowModal(false);
  const onSaved = () => { fetchGroups(); setShowModal(false); };

  const handleDelete = (group) => group.nb_etudiants > 0 ? setBlockedDelete(group) : setConfirmDelete(group);

  const doDeleteGroup = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/groups/${confirmDelete.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Erreur serveur');
      setConfirmDelete(null);
      fetchGroups();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const getAnneesScolaires = () => {
    const now = new Date();
    const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return Array.from({ length: 6 }, (_, i) => `${startYear + 1 - i}-${startYear + 2 - i}`);
  };

  const confirmArchiveGroup = async () => {
    await fetch(`${API}/api/groups/${archivingGroup}/archive`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ annee_scolaire: archiveYear || null }),
    });
    setArchivingGroup(null);
    setArchiveYear('');
    fetchGroups();
  };

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => niveauId ? navigate(`/admin/formations/${formation_id}/niveaux`) : navigate('/admin/formations')}
          className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition flex-shrink-0">
          <ArrowLeft size={16} className="text-[#0369A1]" />
        </button>
        <div className="flex items-center gap-1.5 text-xs">
          <button onClick={() => navigate('/admin/formations')} className="text-slate-400 hover:text-[#0369A1] transition">Formations</button>
          {niveauId && (
            <>
              <span className="text-slate-300">›</span>
              <button onClick={() => navigate(`/admin/formations/${formation_id}/niveaux`)} className="text-slate-400 hover:text-[#0369A1] transition">Niveaux • {formation?.nom}</button>
            </>
          )}
          <span className="text-slate-300">›</span>
          <span className="text-[#0369A1] font-medium">Groupes • {niveau ? niveau.nom : formation?.nom ?? ''}</span>
        </div>
      </div>
      <p className="mb-4 text-xs text-slate-400 ml-12">{filteredGroups.length} / {groups.length} groupe(s)</p>

      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <div className="relative min-w-[160px] flex-1 max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input placeholder="Rechercher un groupe..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
        </div>
        <button onClick={openAdd} className="ml-auto flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all">
          <Plus size={14} /> Ajouter un groupe
        </button>
      </div>

      {loading && <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" /></div>}
      {error && <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">Erreur : {error}</p>}

      {!loading && !error && (
        <>
          {filteredGroups.length === 0 ? <p className="text-slate-400 text-sm">Aucun groupe trouvé.</p> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGroups.map((g) => (
                <div key={g.id} className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] transition">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center"><Users size={20} className="text-emerald-600" /></div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${g.statut === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {g.statut === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <h2 className="text-slate-800 font-semibold text-base mb-1">{g.nom}</h2>
                  <p className="text-slate-400 text-xs mb-1">{g.teacher?.user ? `${g.teacher.user.nom} ${g.teacher.user.prenom}` : 'Aucun professeur assigné'}</p>
                  {g.en_promotion && g.prix_promotion && (
                    <p className="text-xs font-medium text-amber-700 bg-amber-50 inline-block px-2 py-0.5 rounded-full mb-3">Promo: {Number(g.prix_promotion).toLocaleString()} DA</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-5">
                    <span className="flex items-center gap-1"><Users size={13} className="text-[#0369A1]" /> {g.nb_etudiants} étudiant(s)</span>
                    {g.created_at && <span>Créé le {new Date(g.created_at).toLocaleDateString('fr-FR')}</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => navigate(`/admin/formations/${formation_id}/groups/${g.id}`)} className="flex items-center gap-1 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] border border-[#0369A1]/20 px-3 py-1.5 rounded-full hover:bg-[#c9e2f7] hover:shadow-sm active:scale-95 transition">
                      Voir détails <ChevronRight size={13} />
                    </button>
                    <button onClick={() => openEdit(g)} className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-700/20 px-3 py-1.5 rounded-full hover:bg-amber-100 hover:shadow-sm active:scale-95 transition">
                      <Pencil size={12} /> Modifier
                    </button>
                    <button onClick={() => handleDelete(g)} className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 border border-red-500/20 px-3 py-1.5 rounded-full hover:bg-red-100 hover:shadow-sm active:scale-95 transition">
                      <Trash2 size={12} /> Supprimer
                    </button>
                    <button onClick={() => setArchivingGroup(g.id)} className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-500/20 px-3 py-1.5 rounded-full hover:bg-slate-200 hover:shadow-sm active:scale-95 transition">
                      Archiver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

         {archivingGroup && (
  <Dialog title="Archiver le groupe" iconBg="bg-slate-500" icon={Archive} onClose={() => { setArchivingGroup(null); setArchiveYear(''); }}
    actions={<>
      <button onClick={() => { setArchivingGroup(null); setArchiveYear(''); }} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100">Annuler</button>
      <button onClick={confirmArchiveGroup} className="text-xs px-3 py-1.5 rounded-md bg-slate-500 text-white hover:bg-slate-600">Archiver</button>
    </>}>
    <div className="space-y-2.5">
      <p className="text-xs text-slate-500">Ce groupe sera déplacé vers les archives.</p>
      <select value={archiveYear} onChange={e => setArchiveYear(e.target.value)}
        className="w-full bg-[#F8FAFC] border border-transparent rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors">
        <option value="">— Année scolaire (optionnel) —</option>
        {getAnneesScolaires().map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  </Dialog>
)}

          {confirmDelete && (
            <Dialog title="Supprimer le groupe" iconBg="bg-red-500" icon={Trash2} onClose={() => setConfirmDelete(null)}
              actions={<>
                <button onClick={() => setConfirmDelete(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100">Annuler</button>
                <button onClick={doDeleteGroup} disabled={deleting} className="text-xs px-3 py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-40">{deleting ? '...' : 'Oui, supprimer'}</button>
              </>}>
              <div className="bg-red-50 rounded-md p-3">
                <p className="text-xs text-red-600 flex items-center gap-1.5"><AlertTriangle size={13} className="flex-shrink-0" /> Supprimer définitivement « {confirmDelete.nom} » ? Action irréversible.</p>
              </div>
            </Dialog>
          )}

          {blockedDelete && (
            <Dialog title="Suppression impossible" iconBg="bg-red-500" onClose={() => setBlockedDelete(null)}
              actions={<button onClick={() => setBlockedDelete(null)} className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white hover:bg-[#0A1E36]">Compris</button>}>
              <div className="bg-red-50 rounded-md p-3">
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertTriangle size={13} className="flex-shrink-0" />
                  Ce groupe a {blockedDelete.nb_etudiants} étudiant(s) inscrit(s). Retirez-les ou réaffectez-les à un autre groupe avant de le supprimer.
                </p>
              </div>
            </Dialog>
          )}
        </>
      )}

           {showModal && (
        <GroupFormModal formation_id={formation_id} niveauId={niveauId} formation={formation} niveau={niveau} teachers={teachers}
          editGroup={editGroup} onClose={closeModal} onSaved={onSaved} />
      )}
    </AdminLayout>
  );
};

export default Groups;