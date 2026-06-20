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
    <div className="flex h-screen bg-[#f6faff] overflow-hidden">
      <SidebarProf collapsed={collapsed} setCollapsed={handleSetCollapsed} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ProfLayout;