import { useEffect, useState } from 'react';
import { CreditCard, Wallet, Clock, CheckCircle } from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';

const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
      <Icon size={22} className={color} />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
    </div>
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

  return (
    <ComptableLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble financière</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            icon={CreditCard}
            label="Total encaissé"
            value={`${(stats?.totalPaiements ?? 0).toLocaleString('fr-DZ')} DA`}
            color="text-blue-600"
            bg="bg-blue-50"
          />
          <StatCard
            icon={CheckCircle}
            label="Paiements payés"
            value={stats?.paiementsPayes ?? 0}
            color="text-green-600"
            bg="bg-green-50"
          />
          <StatCard
            icon={Clock}
            label="En attente"
            value={stats?.paiementsEnAttente ?? 0}
            color="text-orange-500"
            bg="bg-orange-50"
          />
          <StatCard
            icon={Wallet}
            label="Salaires ce mois"
            value={`${(stats?.totalSalaires ?? 0).toLocaleString('fr-DZ')} DA`}
            color="text-purple-600"
            bg="bg-purple-50"
          />
        </div>
      )}
    </ComptableLayout>
  );
};

export default DashboardComptable;