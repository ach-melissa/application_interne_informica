import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, ChevronRight, Phone, Mail, GraduationCap, MapPin, CalendarDays, CheckCircle2 } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';
import PaymentsTab from '../formations/groups/PaymentsTab';
import PaymentHistoryModal from '../formations/groups/PaymentHistoryModal';
import ScheduleTab from '../formations/groups/ScheduleTab';
import PointageTab from '../formations/groups/PointageTab';

const API = import.meta.env.VITE_API_URL;

const statutMeta = {
  confirmed:     { label: 'Confirmé',     cls: 'bg-emerald-50 text-emerald-700' },
  pending:       { label: 'En attente',   cls: 'bg-amber-50 text-amber-700' },
  non_confirmed: { label: 'Non confirmé', cls: 'bg-red-50 text-red-500' },
};

const COLS = [
  { label: 'Étudiant',       Icon: null },
  { label: 'Téléphone',      Icon: Phone },
  { label: 'Email',          Icon: Mail },
  { label: 'Niveau',         Icon: GraduationCap },
  { label: 'Adresse',        Icon: MapPin },
  { label: 'Date naissance', Icon: CalendarDays },
  { label: 'Statut',         Icon: CheckCircle2 },
];

const ArchiveGroupDetail = () => {
  const { year, formationId, groupId } = useParams();
  const navigate = useNavigate();
  const [etudiants, setEtudiants] = useState([]);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [activeTab, setActiveTab] = useState('etudiants');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/groups?formation_id=${formationId}&archived=true&annee_scolaire=${year}`, { headers }).then(r => r.json()),
      fetch(`${API}/api/groups/${groupId}/etudiants`, { headers }).then(r => r.json()),
    ])
      .then(([groups, etudiantsData]) => {
        setGroup(groups.find(g => g.id === groupId));
        setEtudiants(etudiantsData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [groupId]);

  const restoreGroup = async () => {
    setRestoring(true);
    const token = localStorage.getItem('token');
    await fetch(`${API}/api/groups/${groupId}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setRestoring(false);
    navigate(`/admin/archive/${year}/${formationId}`);
  };

  const TABS = [
    { key: 'etudiants', label: 'Étudiants' },
    { key: 'paiements', label: 'Paiements' },
    { key: 'emploi',    label: 'Emploi du temps' },
    { key: 'pointage',  label: 'Pointage' },
  ];

  return (
    <AdminLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs mb-3">
        <button onClick={() => navigate('/admin/archive')} className="text-slate-400 hover:text-[#0369A1] hover:underline transition">
          Archive
        </button>
        <ChevronRight size={12} className="text-slate-300" />
        <button onClick={() => navigate(`/admin/archive/${year}`)} className="text-slate-400 hover:text-[#0369A1] hover:underline transition">
          {year}
        </button>
        <ChevronRight size={12} className="text-slate-300" />
        <button onClick={() => navigate(`/admin/archive/${year}/${formationId}`)} className="text-slate-400 hover:text-[#0369A1] hover:underline transition">
          Groupes
        </button>
        <ChevronRight size={12} className="text-slate-300" />
        <span className="text-[#0369A1] font-medium">{group?.nom ?? 'Groupe'}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/admin/archive/${year}/${formationId}`)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-[#F1F5F9] hover:bg-[#DCEBFA] transition">
            <ArrowLeft size={15} className="text-[#0369A1]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{group?.nom ?? 'Groupe'}</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Prof : {group?.teacher?.user ? `${group.teacher.user.nom} ${group.teacher.user.prenom}` : 'Non assigné'}
              {' · '}{etudiants.length} étudiant(s)
              {' · '}Année {year}
            </p>
          </div>
        </div>
        <button
          onClick={restoreGroup}
          disabled={restoring}
          className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#0F2A4A] border  px-3 py-1.5 rounded-lg hover:bg-[#12335b] hover:shadow-sm active:scale-95 transition disabled:opacity-40"
        >
          <RotateCcw size={13} /> {restoring ? 'Restauration...' : 'Restaurer le groupe'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-[#0F2A4A] text-white'
                : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">Erreur : {error}</p>}

      {/* Étudiants tab */}
      {!loading && !error && activeTab === 'etudiants' && (
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#DCEBFA]">
                <tr>
                  {COLS.map(({ label, Icon }, i) => (
                    <th key={label} className={`text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] whitespace-nowrap ${i === 0 ? 'border-l border-[#E2E8F0]' : ''}`}>
                      <div className="flex items-center gap-1">
                        {Icon && <Icon size={11} className="text-[#0369A1] flex-shrink-0" />}
                        <span>{label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {etudiants.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400 bg-white">Aucun étudiant trouvé.</td></tr>
                ) : etudiants.map((i, idx) => {
                  const sm = statutMeta[i.statut];
                  return (
                    <tr key={i.id} className={`hover:bg-[#DCEBFA]/30 transition ${idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}`}>
                      <td className="px-3 py-2.5 border-b border-l border-[#E2E8F0]">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                            {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-700 whitespace-nowrap">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">{i.etudiant?.telephone ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">{i.etudiant?.email ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">{i.etudiant?.niveau_scolaire ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500 max-w-[150px] truncate border-b border-[#E2E8F0]">{i.etudiant?.adresse ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">
                        {i.etudiant?.date_naissance ? new Date(i.etudiant.date_naissance).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-3 py-2.5 border-b border-[#E2E8F0]">
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

      {!loading && !error && activeTab === 'paiements' && (
        <PaymentsTab groupId={groupId} onSelectStudent={setSelectedStudent} />
      )}
      {!loading && !error && activeTab === 'emploi' && (
        <ScheduleTab groupId={groupId} readOnly />
      )}
      {!loading && !error && activeTab === 'pointage' && (
        <PointageTab groupId={groupId} etudiants={etudiants.map(i => i.etudiant)} group={group} readOnly />
      )}

      <PaymentHistoryModal
        student={selectedStudent}
        formationId={group?.formation_id}
        onClose={() => setSelectedStudent(null)}
        readOnly
      />
    </AdminLayout>
  );
};

export default ArchiveGroupDetail;