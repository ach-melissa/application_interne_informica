import { useState } from 'react';
import SidebarAdmin from '../components/SidebarAdmin';
import TopbarAdmin from '../components/TopbarAdmin';

const AdminLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const handleCollapse = (val) => {
    setCollapsed(val);
    localStorage.setItem('sidebarCollapsed', val);
  };

  return (
    <div className="flex h-screen bg-[#f6faff] overflow-hidden">
      <SidebarAdmin collapsed={collapsed} setCollapsed={handleCollapse} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopbarAdmin />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;