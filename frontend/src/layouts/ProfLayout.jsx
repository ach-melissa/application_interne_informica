import { useState } from 'react';
import SidebarProf from '../components/SidebarProf';
import Topbar from '../components/Topbar';

const ProfLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('prof_sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSetCollapsed = (value) => {
    setCollapsed(value);
    localStorage.setItem('prof_sidebar_collapsed', value);
  };

  return (
    <div className="flex flex-col h-screen bg-[#f5f7fc] overflow-hidden">
      <Topbar onMenuClick={() => setMobileOpen(true)} />
      <div className="flex flex-1 overflow-hidden relative">
        <SidebarProf
          collapsed={collapsed}
          setCollapsed={handleSetCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 ml-0 lg:ml-[70px]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ProfLayout;