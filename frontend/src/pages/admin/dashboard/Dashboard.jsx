import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, CreditCard, UserX, Clock, UserPlus, Layers } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';
import AddEtudiantModal from '../students/AddEtudiantModal';
import AddUserModal from '../utilisateurs/AddUserModal';
import AddFormationModal from '../formations/AddFormationModal';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddEtudiant, setShowAddEtudiant] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddFormation, setShowAddFormation] = useState(false);
  const [formations, setFormations] = useState([]);

  const fetchAll = async () => {
    try {
      const [statsRes, studentsRes, formationsRes] = await Promise.all([
        fetch(`${API}/api/dashboard/stats`, { headers: getHeaders() }),
        fetch(`${API}/api/etudiants`, { headers: getHeaders() }),
        fetch(`${API}/api/formations`, { headers: getHeaders() }),
      ]);
      setStats(await statsRes.json());
      setRecentStudents((await studentsRes.json()).slice(0, 5));
      setFormations(await formationsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const statCards = stats ? [
    { label: 'Formations actives', value: stats.formationsActives, icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
    { label: 'Groupes aujourd\'hui', value: stats.groupsAujourdhui?.length ?? 0, icon: Layers, color: 'bg-green-50 text-green-600' },
    { label: 'Paiements incomplets', value: stats.paiementsIncomplets, icon: CreditCard, color: 'bg-orange-50 text-orange-600' },
    { label: 'Sans groupe', value: stats.sansGroupe, icon: UserX, color: 'bg-red-50 text-red-600' },
    { label: 'Inscriptions en attente', value: stats.inscriptionsEnAttente, icon: Clock, color: 'bg-purple-50 text-purple-600' },
  ] : [];

  const quickActions = [
    { label: 'Ajouter étudiant', icon: UserPlus, color: 'bg-[#b8995a] hover:bg-[#a0854d]', onClick: () => setShowAddEtudiant(true) },
    { label: 'Ajouter utilisateur', icon: Users, color: 'bg-slate-600 hover:bg-slate-700', onClick: () => setShowAddUser(true) },
    { label: 'Ajouter formation', icon: BookOpen, color: 'bg-green-600 hover:bg-green-700', onClick: () => setShowAddFormation(true) },
  ];

  if (loading) return (
    <AdminLayout>
      <div className="flex justify-center items-center py-40">
        <div className="w-8 h-8 border-4 border-[#b8995a] border-t-transparent rounded-full animate-spin" />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-[#1E293B] mb-6">Tableau de bord</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-[#1E293B]">{s.value}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Today's groups */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4">Groupes d'aujourd'hui</h2>
          {stats?.groupsAujourdhui?.length === 0 ? (
            <p className="text-sm text-[#94A3B8]">Aucun groupe prévu aujourd'hui.</p>
          ) : (
            <div className="space-y-3">
              {stats?.groupsAujourdhui?.map((g) => (
                <div key={g.group_id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1E293B]">{g.group?.nom}</p>
                    <p className="text-xs text-[#94A3B8]">{g.group?.formation?.nom}</p>
                  </div>
                  <span className="text-xs bg-[#F1F5F9] text-[#475569] px-3 py-1 rounded-lg">
                    {g.heure_debut?.slice(0, 5)} — {g.heure_fin?.slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl text-white text-xs font-medium transition ${a.color}`}
                >
                  <Icon size={18} />
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent students */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1E293B] mb-4">Derniers étudiants ajoutés</h2>
        {recentStudents.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">Aucun étudiant récent.</p>
        ) : (
          <div className="space-y-3">
            {recentStudents.map((i) => (
              <div key={i.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#f1ede6] flex items-center justify-center text-[#b8995a] text-xs font-bold">
                    {i.etudiant?.nom?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1E293B]">{i.etudiant?.nom} {i.etudiant?.prenom}</p>
                    <p className="text-xs text-[#94A3B8]">{i.formation?.nom ?? '—'}</p>
                  </div>
                </div>
                <span className="text-xs text-[#94A3B8]">
                  {i.date_inscription ? new Date(i.date_inscription).toLocaleDateString('fr-FR') : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddEtudiant && (
        <AddEtudiantModal onClose={() => setShowAddEtudiant(false)} onSuccess={() => { fetchAll(); setShowAddEtudiant(false); }} />
      )}
      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} />}
      {showAddFormation && (
        <AddFormationModal onClose={() => setShowAddFormation(false)} onSuccess={() => { fetchAll(); setShowAddFormation(false); }} />
      )}
    </AdminLayout>
  );
};

export default Dashboard;