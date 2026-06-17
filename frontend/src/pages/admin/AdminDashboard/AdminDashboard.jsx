import AdminLayout from '../../../layouts/AdminLayout';

const AdminDashboard = () => {
  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-gray-800">Dashboard Admin</h1>
      <p className="text-gray-500 mt-2">Bienvenue sur le panneau d'administration.</p>
    </AdminLayout>
  );
};

export default AdminDashboard;