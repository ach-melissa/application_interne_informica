import { useState } from 'react';
import SidebarProf from '../components/SidebarProf';
import Topbar from '../components/Topbar';

const ProfLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('prof_sidebar_collapsed') === 'true';
  });

  const handleSetCollapsed = (value) => {
    setCollapsed(value);
    localStorage.setItem('prof_sidebar_collapsed', value);
  };

  return (
    <div className="flex flex-col h-screen bg-[#f5f7fc] overflow-hidden">
      <Topbar />
      <div className="flex flex-1 overflow-hidden relative">
        <SidebarProf collapsed={collapsed} setCollapsed={handleSetCollapsed} />
        <main className="flex-1 overflow-y-auto p-8 ml-[70px]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ProfLayout;