import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, CheckCircle, Clock, Layers, Hand, CalendarDays } from 'lucide-react';
import ProfLayout from '../../../layouts/ProfLayout';
import { useAuth } from '../../../context/AuthContext';

const statutMeta = {
  active:   { label: 'Actif',   cls: 'bg-emerald-50 text-emerald-700' },
  inactive: { label: 'Inactif', cls: 'bg-slate-100 text-slate-500' },
};

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
    { label: 'Mes groupes',         value: groups.length,                                     icon: BookOpen,     color: 'text-[#0F2A4A] bg-[#0F2A4A]/5' },
    { label: 'Total étudiants',     value: totalStudents,                                      icon: Users,        color: 'text-[#0284C7] bg-[#0284C7]/10' },
    { label: 'Groupes actifs',      value: groups.filter((g) => g.statut === 'active').length, icon: CheckCircle,  color: 'text-emerald-600 bg-emerald-50' },
    { label: "Groupes aujourd'hui", value: todaySessions.length,                                icon: CalendarDays, color: 'text-purple-600 bg-purple-50' },
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tableau de bord</h1>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

          {/* Today's schedule */}
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
                    <div className="w-20 shrink-0 bg-[#DCEBFA] text-[#0369A1] flex flex-col items-center justify-center py-2 text-xs font-semibold gap-0.5">
                      <Clock size={13} />
                      <span>{s.heure_debut?.slice(0, 5)}</span>
                      <span className="text-[#0369A1]/40">—</span>
                      <span>{s.heure_fin?.slice(0, 5)}</span>
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

          {/* Groups table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#1E293B] mb-4 flex items-center gap-2">
              <Layers size={16} className="text-[#0284C7]" />
              Mes groupes
            </h2>
            {groups.length === 0 ? (
              <p className="text-sm text-[#94A3B8]">Aucun groupe assigné.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs text-[#0369A1] bg-[#DCEBFA]">
                      <th className="py-2.5 px-3 font-medium border-b border-l border-[#E2E8F0]">
                        <span className="flex items-center gap-1.5"><Layers size={13} /> Groupe</span>
                      </th>
                      <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0]">
                        <span className="flex items-center gap-1.5"><BookOpen size={13} /> Formation</span>
                      </th>
                      <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0]">
                        <span className="flex items-center gap-1.5"><Users size={13} /> Étudiants</span>
                      </th>
                      <th className="py-2.5 px-3 font-medium border-b border-[#E2E8F0]">
                        <span className="flex items-center gap-1.5"><CheckCircle size={13} /> Statut</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g, idx) => {
                      const sm = statutMeta[g.statut];
                      const formationId = g.formation_id ?? g.formations?.id;
                      return (
                        <tr
                          key={g.id}
                          onClick={() => navigate(`/prof/formations/${formationId}/groups/${g.id}`)}
                          className={`cursor-pointer hover:bg-[#DCEBFA]/40 transition ${idx % 2 === 1 ? 'bg-[#EEF5FB]' : ''}`}
                        >
                          <td className="py-3 px-3 border-b border-l border-[#E2E8F0]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[#0369A1] text-xs font-bold shrink-0">
                                <Layers size={13} />
                              </div>
                              <span className="font-medium text-[#1E293B]">{g.nom}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#64748B] border-b border-[#E2E8F0]">{g.formations?.nom ?? '—'}</td>
                          <td className="py-3 px-3 text-[#64748B] border-b border-[#E2E8F0]">{g.nb_etudiants ?? 0}</td>
                          <td className="py-3 px-3 border-b border-[#E2E8F0]">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sm?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                              {sm?.label ?? g.statut ?? '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </ProfLayout>
  );
};

export default DashboardProf;