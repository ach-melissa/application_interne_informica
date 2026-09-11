import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, CreditCard, UserX, Clock, UserPlus, Layers,
  User, GraduationCap, CalendarDays, Inbox,LayoutDashboard
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

   // Already sorted by the backend (creneaux[0].heure_debut)
  const sortedGroupsAujourdhui = stats?.groupsAujourdhui ?? [];

  if (loading) return (
    <AdminLayout>
      <div className="flex justify-center items-center py-40">
        <div className="w-8 h-8 border-4 border-[#0F2A4A] border-t-transparent rounded-full animate-spin" />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
        <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
              <LayoutDashboard size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 ">Tableau de bord</h1>
          </div>
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
              pct >= 100 ? { bar: 'bg-red-500',    badge: 'bg-red-50 text-red-600',       label: '  ' } :
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
                  <div className="w-24 shrink-0 bg-[#DCEBFA] text-[#0369A1] flex flex-col items-center justify-center py-2 gap-1">
                    {(g.creneaux ?? []).map((c, ci) => (
                      <span key={ci} className="text-[11px] font-semibold flex items-center gap-1">
                        <Clock size={11} />{c.heure_debut?.slice(0, 5)}–{c.heure_fin?.slice(0, 5)}
                      </span>
                    ))}
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

         {/* Paiements incomplets — students who still owe money, with due date */}
      {stats?.paiementsIncompletsListe?.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-orange-600" />
            Paiements incomplets
          </h2>
          <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#0F2A4A]">
                  <tr>
                    {['Étudiant', 'Formation', 'Groupe', 'Restant', 'Échéance'].map((label, i) => (
                      <th key={label} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] whitespace-nowrap ${i === 0 ? 'border-l border-[#0F2A4A]' : ''}`}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.paiementsIncompletsListe.map((p, idx) => (
                    <tr
                      key={`${p.studentId}-${p.formationId}`}
                      onClick={() => p.groupId && navigate(`/formations/${p.formationId}/groups/${p.groupId}`)}
                      className={`${p.isOverdue ? 'bg-red-50' : 'bg-amber-50'} ${p.groupId ? 'cursor-pointer hover:opacity-80 transition' : ''}`}
                    >
                      <td className="px-3 py-2 border-b border-l border-[#E2E8F0] font-medium text-slate-700 whitespace-nowrap">{p.nom}</td>
                      <td className="px-3 py-2 border-b border-[#E2E8F0] text-slate-600 whitespace-nowrap">{p.formationNom}</td>
                      <td className="px-3 py-2 border-b border-[#E2E8F0] text-slate-600 whitespace-nowrap">{p.groupNom}</td>
                      <td className="px-3 py-2 border-b border-[#E2E8F0] font-medium text-slate-700 whitespace-nowrap">{p.remaining.toLocaleString('fr-FR')} DA</td>
                      <td className="px-3 py-2 border-b border-[#E2E8F0] whitespace-nowrap">
                        {p.prochaineEcheance ? (
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${p.isOverdue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                            {p.isOverdue ? 'En retard depuis le ' : 'À payer avant le '}
                            {new Date(p.prochaineEcheance).toLocaleDateString('fr-FR')}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recent students — real table with column headers */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
          <UserPlus size={16} className="text-[#0F2A4A]" />
          Derniers étudiants ajoutés
        </h2>
                {recentStudents.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">Aucun étudiant récent.</p>
        ) : (
          <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table style={{ tableLayout: 'fixed', width: '100%' }} className="text-xs">
                <colgroup>
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '160px' }} />
                  <col />
                  <col style={{ width: '160px' }} />
                  <col style={{ width: '130px' }} />
                </colgroup>
                <thead className="bg-[#0F2A4A]">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-l border-[#0F2A4A]">
                      <span className="flex items-center gap-1.5"><User size={11} className="text-white/70" />Nom</span>
                    </th>
                    <th className="text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A]">
                      <span className="flex items-center gap-1.5"><User size={11} className="text-white/70" />Prénom</span>
                    </th>
                    <th className="text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A]">
                      <span className="flex items-center gap-1.5"><GraduationCap size={11} className="text-white/70" />Formation</span>
                    </th>
                    <th className="text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A]">
                      <span className="flex items-center gap-1.5"><CalendarDays size={11} className="text-white/70" />Inscrit le</span>
                    </th>
                    <th className="text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A]">
                      <span className="flex items-center gap-1.5"><UserPlus size={11} className="text-white/70" />Ajouté par</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentStudents.map((i, idx) => (
                    <tr key={i.id} className={`hover:bg-slate-50 transition ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                      <td className="px-3 py-2 overflow-hidden border-b border-l border-slate-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                            {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-700 truncate">{i.etudiant?.nom}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-700 truncate border-b border-slate-100">{i.etudiant?.prenom}</td>
                                            <td className="px-3 py-2 overflow-hidden border-b border-slate-100">
                        {i.formation?.nom
                          ? <span className="inline-block bg-[#DCEBFA] text-[#0369A1] px-2 py-0.5 rounded-full text-[11px] font-medium truncate max-w-full">{i.formation.nom}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-400 truncate border-b border-slate-100">
                        {i.date_inscription ? new Date(i.date_inscription).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400 truncate border-b border-slate-100">
                        {i.added_by ?? <span className="text-slate-300">En ligne</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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