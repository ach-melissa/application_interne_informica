import { useState, useEffect } from 'react';
import { Users, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import ProfLayout from '../../../layouts/ProfLayout';
import GroupStudents from './GroupStudents';
import GroupAttendance from './GroupAttendance';

const TABS = [
  { key: 'students',   label: 'Étudiants',  Icon: Users },
  { key: 'attendance', label: 'Pointage',   Icon: ClipboardList },
];

const GroupsProf = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openGroup, setOpenGroup] = useState(null);
  const [activeTab, setActiveTab] = useState({});

  const [students, setStudents] = useState({});
  const [attendance, setAttendance] = useState({});
  const [loadingTab, setLoadingTab] = useState({});

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profs/me/groups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Erreur serveur');
        const data = await res.json();
        setGroups(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const toggleGroup = (groupId) => {
    if (openGroup === groupId) {
      setOpenGroup(null);
    } else {
      setOpenGroup(groupId);
      if (!activeTab[groupId]) {
        setActiveTab((prev) => ({ ...prev, [groupId]: 'students' }));
        fetchStudents(groupId);
      }
    }
  };

  const switchTab = (groupId, tab) => {
    setActiveTab((prev) => ({ ...prev, [groupId]: tab }));
    if (tab === 'students' && !students[groupId]) fetchStudents(groupId);
    if (tab === 'attendance') {
      if (!attendance[groupId]) fetchAttendance(groupId);
      if (!students[groupId]) fetchStudents(groupId);
    }
  };

  const fetchStudents = async (groupId) => {
    if (students[groupId]) return;
    setLoadingTab((prev) => ({ ...prev, [groupId]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/profs/me/groups/${groupId}/students`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStudents((prev) => ({ ...prev, [groupId]: data }));
    } catch {
      setStudents((prev) => ({ ...prev, [groupId]: [] }));
    } finally {
      setLoadingTab((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const fetchAttendance = async (groupId) => {
    if (attendance[groupId]) return;
    setLoadingTab((prev) => ({ ...prev, [groupId]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/profs/me/groups/${groupId}/attendance`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAttendance((prev) => ({ ...prev, [groupId]: data }));
    } catch {
      setAttendance((prev) => ({ ...prev, [groupId]: { sessions: [], records: [] } }));
    } finally {
      setLoadingTab((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  const handleAttendanceUpdate = (groupId, updated) => {
    setAttendance((prev) => ({ ...prev, [groupId]: updated }));
  };

  return (
    <ProfLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E293B]">Mes Groupes</h1>
        <p className="text-[#64748B] text-sm mt-1">{groups.length} groupe(s) assigné(s)</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {groups.length === 0 ? (
            <p className="text-[#64748B] text-sm">Aucun groupe assigné.</p>
          ) : (
            groups.map((g) => (
              <div
                key={g.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleGroup(g.id)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F8FAFC] transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                      <Users size={18} className="text-[#2563EB]" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-[#1E293B]">{g.nom}</p>
                      <p className="text-xs text-[#64748B]">{g.formations?.nom ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        g.statut === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {g.statut ?? '—'}
                    </span>
                    {openGroup === g.id ? (
                      <ChevronUp size={18} className="text-[#94A3B8]" />
                    ) : (
                      <ChevronDown size={18} className="text-[#94A3B8]" />
                    )}
                  </div>
                </button>

                {openGroup === g.id && (
                  <div className="border-t border-[#E2E8F0]">
                    <div className="flex border-b border-[#E2E8F0] px-6 gap-1">
                      {TABS.map(({ key, label, Icon }) => (
                        <button
                          key={key}
                          onClick={() => switchTab(g.id, key)}
                          className={`flex items-center gap-1.5 text-sm px-3 py-3 font-medium border-b-2 transition ${
                            activeTab[g.id] === key
                              ? 'border-[#2563EB] text-[#2563EB]'
                              : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
                          }`}
                        >
                          <Icon size={15} />
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="p-6">
                      {loadingTab[g.id] ? (
                        <div className="flex justify-center py-8">
                          <div className="w-6 h-6 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (
                        <>
                          {activeTab[g.id] === 'students' && (
                            <GroupStudents students={students[g.id] ?? []} />
                          )}
                          {activeTab[g.id] === 'attendance' && (
                            <GroupAttendance
                              groupId={g.id}
                              group={g}
                              sessions={attendance[g.id]?.sessions ?? []}
                              records={attendance[g.id]?.records ?? []}
                              students={students[g.id] ?? []}
                              onUpdate={handleAttendanceUpdate}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </ProfLayout>
  );
};

export default GroupsProf;