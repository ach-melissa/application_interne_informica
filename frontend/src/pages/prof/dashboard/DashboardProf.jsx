import { useState, useEffect } from 'react';
import { Users, BookOpen, CheckCircle, Clock } from 'lucide-react';
import ProfLayout from '../../../layouts/ProfLayout';
import { useAuth } from '../../../context/AuthContext';

const DashboardProf = () => {
  const { user } = useAuth();
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

  const totalStudents = groups.reduce((acc, g) => acc + (g.nb_etudiants ?? 0), 0);

  const stats = [
    {
      label: 'Mes Groupes',
      value: groups.length,
      icon: BookOpen,
      color: 'bg-[#EFF6FF] text-[#2563EB]',
    },
    {
      label: 'Total Étudiants',
      value: totalStudents,
      icon: Users,
      color: 'bg-[#F0FDF4] text-[#16A34A]',
    },
    {
      label: 'Groupes Actifs',
      value: groups.filter((g) => g.statut === 'actif').length,
      icon: CheckCircle,
      color: 'bg-[#FFF7ED] text-[#EA580C]',
    },
    {
      label: 'Groupes En Cours',
      value: groups.filter((g) => g.statut === 'en_cours').length,
      icon: Clock,
      color: 'bg-[#FDF4FF] text-[#9333EA]',
    },
  ];

  return (
    <ProfLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E293B]">
          Bonjour, {user?.prenom} 👋
        </h1>
        <p className="text-[#64748B] text-sm mt-1">
          Voici un aperçu de vos groupes et activités
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-[#64748B]">{s.label}</p>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                      <Icon size={18} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-[#1E293B]">{s.value}</p>
                </div>
              );
            })}
          </div>

          {/* Groups list */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
            <div className="px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="text-base font-semibold text-[#1E293B]">Mes Groupes</h2>
            </div>
            {groups.length === 0 ? (
              <p className="text-[#64748B] text-sm px-6 py-8">Aucun groupe assigné.</p>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {groups.map((g) => (
                  <div key={g.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#1E293B]">{g.nom}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {g.formations?.nom ?? '—'}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        g.statut === 'actif'
                          ? 'bg-green-100 text-green-700'
                          : g.statut === 'en_cours'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {g.statut ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </ProfLayout>
  );
};

export default DashboardProf;