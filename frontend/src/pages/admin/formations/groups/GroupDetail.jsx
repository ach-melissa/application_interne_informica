import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import AdminLayout from '../../../../layouts/AdminLayout';
import PaymentsTab from './PaymentsTab';
import PaymentHistoryModal from './PaymentHistoryModal';
import ScheduleTab from './ScheduleTab';
import PointageTab from './PointageTab';

const GroupDetail = () => {
  const { id: formation_id, groupId } = useParams();
  const navigate = useNavigate();
  const [etudiants, setEtudiants] = useState([]);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('etudiants'); // 'etudiants' | 'paiements' | 'emploi'
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [resGroup, resEtudiants] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/groups?formation_id=${formation_id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${import.meta.env.VITE_API_URL}/api/groups/${groupId}/etudiants`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
        ]);
        const groups = await resGroup.json();
        const etudiantsData = await resEtudiants.json();
        setGroup(groups.find((g) => g.id === groupId));
        setEtudiants(etudiantsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [groupId]);

  const TABS = [
    { key: 'etudiants', label: 'Étudiants' },
    { key: 'paiements', label: 'Paiements' },
    { key: 'emploi',    label: 'Emploi du temps' },
    { key: 'pointage',  label: 'Pointage' },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/admin/formations/${formation_id}/groups`)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] hover:bg-gray-100 transition"
        >
          <ArrowLeft size={16} className="text-[#64748B]" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">{group?.nom ?? 'Groupe'}</h1>
          <p className="text-[#64748B] text-sm mt-0.5">
            Professeur : {group?.teacher ? `${group.teacher.nom} ${group.teacher.prenom}` : 'Non assigné'}
            {' · '}{etudiants.length} étudiant(s)
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-[#E2E8F0]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              activeTab === tab.key
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Étudiants ── */}
      {activeTab === 'etudiants' && (
        <>
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
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Étudiant</th>
                    <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Téléphone</th>
                    <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Email</th>
                    <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Niveau</th>
                    <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Adresse</th>
                    <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Date naissance</th>
                    <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {etudiants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-[#94A3B8]">
                        Aucun étudiant dans ce groupe.
                      </td>
                    </tr>
                  ) : (
                    etudiants.map((i) => (
                      <tr key={i.id} className="hover:bg-[#F8FAFC] transition">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                              <User size={14} className="text-[#2563EB]" />
                            </div>
                            <span className="font-medium text-[#1E293B]">
                              {i.etudiant?.nom} {i.etudiant?.prenom}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{i.etudiant?.telephone ?? '—'}</td>
                        <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{i.etudiant?.email ?? '—'}</td>
                        <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{i.etudiant?.niveau_scolaire ?? '—'}</td>
                        <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{i.etudiant?.adresse ?? '—'}</td>
                        <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
                          {i.etudiant?.date_naissance ? new Date(i.etudiant.date_naissance).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            i.statut === 'confirmed' ? 'bg-green-100 text-green-600' :
                            i.statut === 'pending'   ? 'bg-yellow-100 text-yellow-600' :
                                                       'bg-red-100 text-red-500'
                          }`}>
                            {i.statut === 'confirmed' ? 'Confirmé' :
                             i.statut === 'pending'   ? 'En attente' : 'Non confirmé'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Paiements ── */}
      {activeTab === 'paiements' && (
        <PaymentsTab groupId={groupId} onSelectStudent={setSelectedStudent} />
      )}

      {/* ── Emploi du temps ── */}
      {activeTab === 'emploi' && (
        <ScheduleTab groupId={groupId} />
      )}
      {/* ── Pointage ── */}
{activeTab === 'pointage' && (
  <PointageTab
    groupId={groupId}
    etudiants={etudiants.map(i => i.etudiant)}
    group={group}
  />
)}
      <PaymentHistoryModal
        student={selectedStudent}
        formationId={group?.formation_id}
        onClose={() => setSelectedStudent(null)}
      />
    </AdminLayout>
  );
};

export default GroupDetail;