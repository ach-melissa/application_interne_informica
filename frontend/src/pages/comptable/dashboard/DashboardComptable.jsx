import { useEffect, useState } from 'react';
import { CreditCard, Wallet, Clock, CheckCircle } from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="relative bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
    <div className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
      <Icon size={15} />
    </div>
    <p className="text-xs text-[#64748B] pr-8">{label}</p>
    <p className="text-3xl font-bold text-[#1E293B] mt-2">{value}</p>
  </div>
);

const DashboardComptable = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/comptable/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setStats(data);
      } catch {
        setStats({ totalPaiements: 0, paiementsEnAttente: 0, paiementsPayes: 0, totalSalaires: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <ComptableLayout>
      <div className="flex justify-center items-center py-40">
        <div className="w-8 h-8 border-4 border-[#0F2A4A] border-t-transparent rounded-full animate-spin" />
      </div>
    </ComptableLayout>
  );

  return (
    <ComptableLayout>
      <h1 className="text-2xl font-bold text-[#1E293B] mb-6">Tableau de bord</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={CreditCard}
          label="Total encaissé"
          value={`${(stats?.totalPaiements ?? 0).toLocaleString('fr-DZ')} DA`}
          color="text-[#0F2A4A] bg-[#0F2A4A]/5"
        />
        <StatCard
          icon={CheckCircle}
          label="Paiements payés"
          value={stats?.paiementsPayes ?? 0}
          color="text-[#0284C7] bg-[#0284C7]/10"
        />
        <StatCard
          icon={Clock}
          label="En attente"
          value={stats?.paiementsEnAttente ?? 0}
          color="text-orange-600 bg-orange-50"
        />
        <StatCard
          icon={Wallet}
          label="Salaires ce mois"
          value={`${(stats?.totalSalaires ?? 0).toLocaleString('fr-DZ')} DA`}
          color="text-purple-600 bg-purple-50"
        />
      </div>
    </ComptableLayout>
  );
};

export default DashboardComptable;