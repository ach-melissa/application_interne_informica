import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SidebarComptable from '../components/SidebarComptable';
import SidebarSuperAdmin from '../components/SidebarSuperAdmin';
import Topbar from '../components/Topbar';

const ComptableLayout = ({ children }) => {
  const { user } = useAuth();
  const Sidebar = user?.role === 'super_admin' ? SidebarSuperAdmin : SidebarComptable;

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('comptable_sidebar_collapsed') === 'true'
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleCollapse = (val) => {
    setCollapsed(val);
    localStorage.setItem('comptable_sidebar_collapsed', val);
  };

  return (
    <div className="flex flex-col h-screen bg-[#f5f7fc] overflow-hidden">
      <Topbar onMenuClick={() => setMobileOpen(true)} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          collapsed={collapsed}
          setCollapsed={handleCollapse}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <main className="flex-1 overflow-y-auto p-3 lg:p-6 ml-0 lg:ml-[60px]">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default ComptableLayout;