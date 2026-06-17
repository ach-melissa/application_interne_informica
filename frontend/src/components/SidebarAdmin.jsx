import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  Archive,
  UserCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
  { label: 'Formations', icon: BookOpen, path: '/admin/formations' },
  { label: 'Utilisateurs', icon: Users, path: '/admin/utilisateurs' },
  { label: 'Professeurs', icon: GraduationCap, path: '/admin/profs' },
  { label: 'Étudiants', icon: UserCircle, path: '/admin/students' },
  { label: 'Archive', icon: Archive, path: '/admin/archive' },
];

const SidebarAdmin = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      className={`relative flex flex-col h-screen bg-[#1E293B] transition-all duration-300 ${
        collapsed ? 'w-[70px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#2D3F55]">
        <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">I</span>
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-lg">Informica</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                ${isActive
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#94A3B8] hover:bg-[#2D3F55] hover:text-white'
                }`}
            >
              <Icon size={20} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 w-6 h-6 bg-[#2563EB] rounded-full flex items-center justify-center text-white shadow-md hover:bg-[#1D4ED8] transition"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Bottom: role badge */}
      <div className="px-3 py-4 border-t border-[#2D3F55]">
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-[#F97316] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          {!collapsed && (
            <div>
              <p className="text-white text-sm font-medium leading-none">Admin</p>
              <p className="text-[#94A3B8] text-xs mt-0.5">Administrateur</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default SidebarAdmin;