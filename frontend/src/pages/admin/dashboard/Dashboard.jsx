import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, CreditCard, UserX, Clock, UserPlus, Layers,
  User, GraduationCap, CalendarDays, Inbox,
} from 'lucide-react';
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

  const fetchAll = async () => {
    try {
      const [statsRes, studentsRes] = await Promise.all([
        fetch(`${API}/api/dashboard/stats`, { headers: getHeaders() }),
        fetch(`${API}/api/etudiants`, { headers: getHeaders() }),
      ]);
      setStats(await statsRes.json());
      setRecentStudents((await studentsRes.json()).slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const statCards = stats ? [
    { label: 'Formations actives',        value: stats.formationsActives,             icon: BookOpen,  color: 'text-[#0F2A4A] bg-[#0F2A4A]/5' },
    { label: 'Groupes aujourd\'hui',      value: stats.groupsAujourdhui?.length ?? 0, icon: Layers,    color: 'text-[#0284C7] bg-[#0284C7]/10' },
    { label: 'Paiements incomplets',      value: stats.paiementsIncomplets,           icon: CreditCard, color: 'text-orange-600 bg-orange-50' },
    { label: 'Sans groupe',               value: stats.sansGroupe,                    icon: UserX,     color: 'text-red-600 bg-red-50' },
    { label: 'Inscriptions en attente',   value: stats.inscriptionsEnAttente,         icon: Clock,     color: 'text-purple-600 bg-purple-50' },
  ] : [];

  const quickActions = [
    { label: 'Ajouter étudiant',    icon: UserPlus, color: 'bg-[#0F2A4A] hover:bg-[#16385f]', onClick: () => setShowAddEtudiant(true) },
    { label: 'Ajouter utilisateur', icon: Users,    color: 'bg-[#0284C7] hover:bg-[#0369A1]', onClick: () => setShowAddUser(true) },
    { label: 'Ajouter formation',   icon: BookOpen, color: 'bg-orange-500 hover:bg-orange-600', onClick: () => setShowAddFormation(true) },
  ];

  // Sort today's groups by start time, without touching the source data
  const sortedGroupsAujourdhui = [...(stats?.groupsAujourdhui ?? [])].sort((a, b) =>
    (a.heure_debut ?? '').localeCompare(b.heure_debut ?? '')
  );

  if (loading) return (
    <AdminLayout>
      <div className="flex justify-center items-center py-40">
        <div className="w-8 h-8 border-4 border-[#0F2A4A] border-t-transparent rounded-full animate-spin" />
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
            <div key={s.label} className="relative bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
              <div className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center ${s.color}`}>
                <Icon size={15} />
              </div>
              <p className="text-xs text-[#64748B] pr-8">{s.label}</p>
              <p className="text-3xl font-bold text-[#1E293B] mt-2">{s.value}</p>
            </div>
          );
        })}
      </div>
{stats?.formationsEnAttenteGroupe?.length > 0 && (() => {
  const withCount = stats.formationsEnAttenteGroupe.filter((f) => f.count > 0);
  const zeroCount = stats.formationsEnAttenteGroupe.filter((f) => f.count === 0);

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm mb-6">
      <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
        <Users size={16} className="text-[#0284C7]" />
        
Pré inscriptions en attente

      </h2>

      {withCount.length > 0 && (
        <div className="space-y-3 mb-4">
          {withCount.map((f) => {
            const pct = Math.min((f.count / f.capacite) * 100, 100);
            const tier =
              pct >= 100 ? { bar: 'bg-red-500',    badge: 'bg-red-50 text-red-600',       label: ' — Complet !' } :
              pct >= 70  ? { bar: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700', label: '' } :
              pct >= 40  ? { bar: 'bg-yellow-500', badge: 'bg-yellow-50 text-yellow-700', label: '' } :
                           { bar: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-700', label: '' };
            return (
              <div key={f.formation_id}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-[#1E293B]">{f.nom}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tier.badge}`}>
                    {f.count} / {f.capacite}{tier.label}
                  </span>
                </div>
                <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${tier.bar}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

    {zeroCount.length > 0 && (
  <div className="pt-3 border-t border-[#F1F5F9]">
    <p className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
      <Inbox size={16} className="text-[#0284C7]" />
      Aucune pré-inscription en attente
    </p>
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
      {zeroCount.map((f) => (
  <div
    key={f.formation_id}
    className="flex items-center justify-between gap-2 text-xs bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-lg"
  >
    <span className="text-slate-500 truncate">{f.nom}</span>
    <span className="font-semibold text-sky-600 shrink-0">
      {f.count} / {f.capacite}
    </span>
  </div>
))}
    </div>
  </div>
)}
    </div>
  );
})()}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 items-start">
        {/* Today's groups — mini schedule, sorted by time, fixed height so layout stays stable */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-[#0284C7]" />
            Groupes d'aujourd'hui
          </h2>
          {sortedGroupsAujourdhui.length === 0 ? (
            <p className="text-sm text-[#94A3B8]">Aucun groupe prévu aujourd'hui.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {sortedGroupsAujourdhui.map((g) => (
                <div key={g.group_id} className="flex items-stretch gap-3 rounded-xl border border-[#F1F5F9] overflow-hidden">
                  <div className="w-20 shrink-0 bg-[#DCEBFA] text-[#0369A1] flex flex-col items-center justify-center py-2 text-xs font-semibold gap-0.5">
                    <Clock size={13} />
                    <span>{g.heure_debut?.slice(0, 5)}</span>
                    <span className="text-[#0369A1]/40">—</span>
                    <span>{g.heure_fin?.slice(0, 5)}</span>
                  </div>
                  <div className="flex-1 flex items-center py-2 pr-3">
                    <div>
                      <p className="text-sm font-medium text-[#1E293B] flex items-center gap-1.5">
                        <Layers size={13} className="text-[#94A3B8]" />
                        {g.group?.nom}
                      </p>
                      <p className="text-xs text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
                        <BookOpen size={12} />
                        {g.group?.formation?.nom}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm self-start">
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

      {/* Recent students — real table with column headers */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
          <UserPlus size={16} className="text-[#0F2A4A]" />
          Derniers étudiants ajoutés
        </h2>
        {recentStudents.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">Aucun étudiant récent.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs text-[#0369A1] bg-[#DCEBFA]">
                  <th className="py-2.5 px-3 font-medium border-b border-l border-[#E2E8F0]">
                    <span className="flex items-center gap-1.5"><User size={13} /> Nom</span>
                  </th>
                  <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0]">
                    <span className="flex items-center gap-1.5"><User size={13} /> Prénom</span>
                  </th>
                  <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0]">
                    <span className="flex items-center gap-1.5"><GraduationCap size={13} /> Formation</span>
                  </th>
                  <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0]">
                    <span className="flex items-center gap-1.5"><CalendarDays size={13} /> Date d'inscription</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentStudents.map((i, idx) => (
                  <tr key={i.id} className={idx % 2 === 1 ? 'bg-[#EEF5FB]' : ''}>
                    <td className="py-3 px-3 border-b border-l border-[#E2E8F0]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[#0369A1] text-xs font-bold shrink-0">
                          {i.etudiant?.nom?.[0]}
                        </div>
                        <span className="font-medium text-[#1E293B]">{i.etudiant?.nom}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#1E293B] border-b border-[#E2E8F0]">{i.etudiant?.prenom}</td>
                    <td className="py-3 px-3 text-[#64748B] border-b border-[#E2E8F0]">{i.formation?.nom ?? '—'}</td>
                    <td className="py-3 px-3 text-[#94A3B8] border-b border-[#E2E8F0]">
                      {i.date_inscription ? new Date(i.date_inscription).toLocaleDateString('fr-FR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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