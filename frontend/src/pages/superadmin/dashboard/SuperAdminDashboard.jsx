import SuperAdminLayout from '../../../layouts/SuperAdminLayout';

const SuperAdminDashboard = () => {
  return (
    <SuperAdminLayout>
      <h1 className="text-xl font-bold text-slate-800 mb-2">Dashboard</h1>
      <p className="text-slate-400 text-sm">Bienvenue, Super Administrateur.</p>
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;