import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Search, X, GraduationCap, Phone, Mail, MapPin } from 'lucide-react';
import AdminLayout from '../../../../layouts/AdminLayout';
import PaymentsTab from './PaymentsTab';
import PaymentHistoryModal from './PaymentHistoryModal';
import ScheduleTab from './ScheduleTab';
import PointageTab from './PointageTab';
import AttestationsTab from './AttestationsTab';

const API = import.meta.env.VITE_API_URL;

const STATUT_OPTS = ['confirmed', 'pending', 'non_confirmed'];
const statutMeta = {
  confirmed:     { label: 'Confirmé',     cls: 'bg-emerald-100 text-emerald-700' },
  pending:       { label: 'En attente',   cls: 'bg-amber-100 text-amber-700' },
  non_confirmed: { label: 'Non confirmé', cls: 'bg-red-100 text-red-600' },
};

const NIVEAU_OPTS = ['Primaire','Moyen','Secondaire','Bac','Licence','Master','Doctorat','Autre'];

const GroupDetail = () => {
  const { id: formation_id, groupId } = useParams();
  const navigate = useNavigate();
  const [etudiants, setEtudiants] = useState([]);
  const [group, setGroup]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState('etudiants');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // filters
  const [search, setSearch]   = useState('');
  const [statut, setStatut]   = useState('');
  const [niveau, setNiveau]   = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    Promise.all([
      fetch(`${API}/api/groups?formation_id=${formation_id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/groups/${groupId}/etudiants`,         { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([groups, etudiantsData]) => { setGroup(groups.find(g => g.id === groupId)); setEtudiants(etudiantsData); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId]);

  const filtered = etudiants.filter(i => {
    const name = `${i.etudiant?.nom} ${i.etudiant?.prenom}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase()) && !i.etudiant?.telephone?.includes(search)) return false;
    if (statut && i.statut !== statut) return false;
    if (niveau && i.etudiant?.niveau_scolaire !== niveau) return false;
    return true;
  });

  const hasFilters = search || statut || niveau;
  const clearAll = () => { setSearch(''); setStatut(''); setNiveau(''); };

  const TABS = [
    { key: 'etudiants', label: 'Étudiants' },
    { key: 'paiements', label: 'Paiements' },
    { key: 'emploi',    label: 'Emploi du temps' },
    { key: 'pointage',  label: 'Pointage' },
    { key: 'attestations', label: 'Attestations' }, 
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(`/admin/formations/${formation_id}/groups`)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-blue-100 hover:bg-blue-50 transition">
          <ArrowLeft size={15} className="text-blue-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{group?.nom ?? 'Groupe'}</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Prof : {group?.teacher ? `${group.teacher.nom} ${group.teacher.prenom}` : 'Non assigné'}
            {' · '}{etudiants.length} étudiant(s)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-blue-100">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Etudiants tab */}
      {activeTab === 'etudiants' && (
        <>
          {/* Filter bar */}
          <div className="bg-white border border-blue-100 rounded-xl px-3 py-2.5 mb-4 flex flex-wrap gap-2 items-center shadow-sm">
            <div className="relative min-w-[160px] flex-1 max-w-[220px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
              <input placeholder="Nom, téléphone…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-blue-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
            </div>

            <div className="w-px h-5 bg-blue-100" />

         

            {/* Niveau filter */}
            <div className="relative flex items-center">
              <select value={niveau} onChange={e => setNiveau(e.target.value)}
                className={`text-xs border rounded-lg py-1.5 pl-2 pr-6 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer
                  ${niveau ? 'border-blue-400 text-blue-700 font-medium' : 'border-blue-200 text-slate-500'}`}>
                <option value="">Niveau</option>
                {NIVEAU_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {niveau && <button onClick={() => setNiveau('')} className="absolute right-1.5 text-slate-300 hover:text-red-400"><X size={10} /></button>}
            </div>

            {hasFilters && (
              <button onClick={clearAll} className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
                <X size={11} /> Tout effacer
              </button>
            )}
          </div>

          <p className="text-slate-400 text-xs mb-3">{filtered.length} / {etudiants.length} étudiant(s)</p>

          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">Erreur : {error}</p>}

          {!loading && !error && (
            <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-blue-50 border-b border-blue-100">
                    <tr>
                      {['Étudiant','Téléphone','Email','Niveau','Adresse','Date naissance','Statut'].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-blue-500 font-semibold text-[10px] tracking-wide uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-10 text-slate-400">Aucun étudiant trouvé.</td></tr>
                    ) : filtered.map(i => {
                      const sm = statutMeta[i.statut];
                      return (
                        <tr key={i.id} className="hover:bg-blue-50/40 transition">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">
                                {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-700 whitespace-nowrap">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{i.etudiant?.telephone ?? '—'}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{i.etudiant?.email ?? '—'}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{i.etudiant?.niveau_scolaire ?? '—'}</td>
                          <td className="px-3 py-2.5 text-slate-500 max-w-[150px] truncate">{i.etudiant?.adresse ?? '—'}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                            {i.etudiant?.date_naissance ? new Date(i.etudiant.date_naissance).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sm?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                              {sm?.label ?? i.statut}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

{activeTab === 'paiements'    && <PaymentsTab groupId={groupId} onSelectStudent={setSelectedStudent} />}
{activeTab === 'emploi'       && <ScheduleTab groupId={groupId} />}
{activeTab === 'pointage'     && <PointageTab groupId={groupId} etudiants={etudiants.map(i => i.etudiant)} group={group} />}
{activeTab === 'attestations' && <AttestationsTab etudiants={etudiants} formationId={formation_id} groupId={groupId} />}
      <PaymentHistoryModal student={selectedStudent} formationId={group?.formation_id} onClose={() => setSelectedStudent(null)} />
    </AdminLayout>
  );
};

export default GroupDetail;