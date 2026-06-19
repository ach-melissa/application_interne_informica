import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, BookOpen, Users, GraduationCap,
  Archive, UserCircle, ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import logo from '../assets/images/logo_informica.png';
import logoIcon from '../assets/images/logo_informica_icon.png'; // collapsed-state logo

const navItems = [
  { label: 'Dashboard',    icon: LayoutDashboard, path: '/admin' },
  { label: 'Formations',   icon: BookOpen,         path: '/admin/formations' },
  { label: 'Utilisateurs', icon: Users,            path: '/admin/utilisateurs' },
  { label: 'Professeurs',  icon: GraduationCap,    path: '/admin/profs' },
  { label: 'Étudiants',    icon: UserCircle,       path: '/admin/students' },
  { label: 'Archive',      icon: Archive,          path: '/admin/archive' },
];

const Tooltip = ({ label }) => (
  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
    {label}
    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
  </div>
);

const SidebarAdmin = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className={`relative flex flex-col h-screen bg-white border-r border-gray-100 shadow-sm transition-all duration-300 shrink-0 ${collapsed ? 'w-[70px]' : 'w-[200px]'}`}>

      {/* Logo */}
      <div className={`flex items-center px-4 py-5 border-b border-gray-100 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <img
          src={collapsed ? logoIcon : logo}
          alt="Infomica"
        className={`object-contain ${collapsed ? 'h-[60px] w-[60px]' : 'h-14 w-auto'}`}  />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ label, icon: Icon, path }) => {
          const isActive = path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path);
          return (
            <div key={path} className="relative group">
              <button
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                  ${collapsed ? 'justify-center' : ''}
                  ${isActive ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && <span className="text-sm">{label}</span>}
              </button>
              {collapsed && <Tooltip label={label} />}
            </div>
          );
        })}
      </nav>

      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 shadow-sm hover:bg-gray-50 transition z-10"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-2">
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-[#F97316] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{user?.prenom?.[0]}{user?.nom?.[0]}</span>
          </div>
          {!collapsed && (
            <div>
              <p className="text-gray-800 text-sm font-medium leading-none">{user?.prenom} {user?.nom}</p>
              <p className="text-gray-400 text-xs mt-0.5">Administrateur</p>
            </div>
          )}
        </div>

        <div className="relative group">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Déconnexion</span>}
          </button>
          {collapsed && <Tooltip label="Déconnexion" />}
        </div>
      </div>
    </aside>
  );
};

export default SidebarAdmin;