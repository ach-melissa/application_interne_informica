import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import GroupAttendance from './GroupAttendance';
import ProfGroupSchedule from './ProfGroupSchedule';

const API = import.meta.env.VITE_API_URL;

const ProfGroupDetail = () => {
  const { formationId, groupId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pointage');

  const [group, setGroup] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/api/profs/me/groups`, { headers }).then((r) => { if (!r.ok) throw new Error('Erreur serveur'); return r.json(); }),
      fetch(`${API}/api/profs/me/groups/${groupId}/students`, { headers }).then((r) => { if (!r.ok) throw new Error('Erreur serveur'); return r.json(); }),
      fetch(`${API}/api/profs/me/groups/${groupId}/attendance`, { headers }).then((r) => { if (!r.ok) throw new Error('Erreur serveur'); return r.json(); }),
    ])
      .then(([groups, studentsData, attendanceData]) => {
        setGroup(groups.find((g) => String(g.id) === String(groupId)) ?? null);
        setStudents(studentsData ?? []);
        setSessions(attendanceData.sessions ?? []);
        setRecords(attendanceData.records ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [groupId]);

  // GroupAttendance appelle ça après chaque ajout/suppression/modification de séance ou pointage
  const handleUpdate = (_groupId, { sessions: s, records: r }) => {
    setSessions(s);
    setRecords(r);
  };

  const TABS = [
    { key: 'pointage',   label: 'Pointage' },
    { key: 'emploi',     label: 'Emploi du temps' },
  ];

  return (
    <>
      {/* Breadcrumb — matches admin's Groups.jsx / ProfGroups.jsx: back button + trail in one row */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate(`/prof/formations/${formationId}/groups`)}
          className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition flex-shrink-0"
        >
          <ArrowLeft size={16} className="text-[#0369A1]" />
        </button>
        <div className="flex items-center gap-1.5 text-xs">
          <button onClick={() => navigate('/prof/formations')} className="text-slate-400 hover:text-[#0369A1] transition">
            Formations
          </button>
          <span className="text-slate-300">›</span>
          <button onClick={() => navigate(`/prof/formations/${formationId}/groups`)} className="text-slate-400 hover:text-[#0369A1] transition">
            {group?.formations?.nom ?? 'Groupes'}
          </button>
          <span className="text-slate-300">›</span>
          <span className="text-[#0369A1] font-medium">{group?.nom ?? 'Groupe'}</span>
        </div>
      </div>
      <p className="mb-5 text-xs text-slate-400 ml-12">{students.length} étudiant(s)</p>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-[#0F2A4A] text-white'
                : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      )}

      {!loading && !error && (
        <>
          {activeTab === 'pointage' && (
            <GroupAttendance
              groupId={groupId}
              group={group}
              sessions={sessions}
              records={records}
              students={students}
              onUpdate={handleUpdate}
            />
          )}
          {activeTab === 'emploi' && <ProfGroupSchedule groupId={groupId} />}
        </>
      )}
    </>
  );
};

export default ProfGroupDetail;