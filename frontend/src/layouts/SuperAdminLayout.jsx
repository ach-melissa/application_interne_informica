import { useState } from 'react';
import SidebarSuperAdmin from '../components/SidebarSuperAdmin';
import Topbar from '../components/Topbar';

const SuperAdminLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const handleCollapse = (val) => {
    setCollapsed(val);
    localStorage.setItem('sidebarCollapsed', val);
  };

  return (
    <div className="flex flex-col h-screen bg-[#f5f7fc] overflow-hidden">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <SidebarSuperAdmin collapsed={collapsed} setCollapsed={handleCollapse} />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;