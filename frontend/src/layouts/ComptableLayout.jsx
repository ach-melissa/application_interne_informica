import { useState } from 'react';
import SidebarComptable from '../components/SidebarComptable';
import Topbar from '../components/Topbar';

const ComptableLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('comptable_sidebar_collapsed') === 'true'
  );

  const handleCollapse = (val) => {
    setCollapsed(val);
    localStorage.setItem('comptable_sidebar_collapsed', val);
  };

  return (
    <div className="flex h-screen bg-[#f6faff] overflow-hidden">
      <SidebarComptable collapsed={collapsed} setCollapsed={handleCollapse} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ComptableLayout;