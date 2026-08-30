import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Clock, Layers, Hand, CalendarDays, LayoutDashboard } from 'lucide-react';
import ProfLayout from '../../../layouts/ProfLayout';
import { useAuth } from '../../../context/AuthContext';

const todayJour = () =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'Africa/Algiers' });

const DashboardProf = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profs/me/groups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Erreur serveur');
        setGroups(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const totalStudents = groups.reduce((acc, g) => acc + (g.nb_etudiants ?? 0), 0);

  const jour = todayJour();
  const todaySessions = groups
    .flatMap((g) => (g.schedules ?? []).filter((s) => s.jour_semaine === jour).map((s) => ({ ...s, group: g })))
    .sort((a, b) => (a.heure_debut ?? '').localeCompare(b.heure_debut ?? ''));

  const stats = [
    { label: 'Mes groupes',         value: groups.length,        icon: BookOpen,     color: 'text-[#0F2A4A] bg-[#0F2A4A]/5' },
    { label: 'Total étudiants',     value: totalStudents,        icon: Users,        color: 'text-[#0284C7] bg-[#0284C7]/10' },
    { label: "Groupes aujourd'hui", value: todaySessions.length, icon: CalendarDays, color: 'text-purple-600 bg-purple-50' },
  ];

  if (loading) return (
    <ProfLayout>
      <div className="flex justify-center items-center py-40">
        <div className="w-8 h-8 border-4 border-[#0F2A4A] border-t-transparent rounded-full animate-spin" />
      </div>
    </ProfLayout>
  );

  return (
    <ProfLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
          <LayoutDashboard size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
          <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1">
            Bonjour, {user?.prenom} <Hand size={13} className="text-orange-400" />
          </p>
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-6">
          Erreur : {error}
        </p>
      )}

      {!error && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {stats.map((s) => {
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

          {/* Today's schedule — mini schedule, sorted by time, matches admin's "Groupes d'aujourd'hui" block */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm mb-6">
            <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
              <CalendarDays size={16} className="text-[#0284C7]" />
              Groupes d'aujourd'hui
            </h2>
            {todaySessions.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">Aucun groupe prévu aujourd'hui.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {todaySessions.map((s, idx) => (
                  <div key={idx} className="flex items-stretch gap-3 rounded-xl border border-[#F1F5F9] overflow-hidden">
                    <div className="w-24 shrink-0 bg-[#DCEBFA] text-[#0369A1] flex flex-col items-center justify-center py-2 gap-1">
                      <span className="text-[11px] font-semibold flex items-center gap-1">
                        <Clock size={11} />{s.heure_debut?.slice(0, 5)}–{s.heure_fin?.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex-1 flex items-center py-2 pr-3">
                      <div>
                        <p className="text-sm font-medium text-[#1E293B] flex items-center gap-1.5">
                          <Layers size={13} className="text-[#94A3B8]" />
                          {s.group?.nom}
                        </p>
                        <p className="text-xs text-[#94A3B8] flex items-center gap-1.5 mt-0.5">
                          <BookOpen size={12} />
                          {s.group?.formations?.nom}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Groups table — row/hover/icon colors matched to admin's recentStudents table, Statut column removed */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
              <Layers size={16} className="text-[#0284C7]" />
              Mes groupes
            </h2>
            {groups.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">Aucun groupe assigné.</p>
            ) : (
              <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-[#0F2A4A]">
                      <tr>
                        <th className="text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-l border-[#0F2A4A]">
                          <span className="flex items-center gap-1.5"><Layers size={11} className="text-white/70" /> Groupe</span>
                        </th>
                        <th className="text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A]">
                          <span className="flex items-center gap-1.5"><BookOpen size={11} className="text-white/70" /> Formation</span>
                        </th>
                        <th className="text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A]">
                          <span className="flex items-center gap-1.5"><Users size={11} className="text-white/70" /> Étudiants</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g, idx) => {
                        const formationId = g.formation_id ?? g.formations?.id;
                        return (
                          <tr
                            key={g.id}
                            onClick={() => navigate(`/prof/formations/${formationId}/groups/${g.id}`)}
                            className={`cursor-pointer hover:bg-slate-50 transition ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
                          >
                            <td className="px-3 py-2 overflow-hidden border-b border-l border-slate-100">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[#0369A1] flex-shrink-0">
                                  <Layers size={12} />
                                </div>
                                <span className="font-medium text-slate-700 truncate">{g.nom}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 overflow-hidden border-b border-slate-100">
                              {g.formations?.nom
                                ? <span className="inline-block bg-[#DCEBFA] text-[#0369A1] px-2 py-0.5 rounded-full text-[11px] font-medium truncate max-w-full">{g.formations.nom}</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-2 text-slate-500 truncate border-b border-slate-100">{g.nb_etudiants ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </ProfLayout>
  );
};

export default DashboardProf;