import SidebarAdmin from '../components/SidebarAdmin';

const AdminLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <SidebarAdmin />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;