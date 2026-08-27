import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, BookOpen, Users, GraduationCap,
  FolderArchive, UserCircle, ChevronLeft, ChevronRight, LogOut,
  BarChart3, Settings, Calendar, ClipboardList,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Gestion',
    items: [
      { label: 'Tableau de bord',     icon: LayoutDashboard, path: '/admin' },
      { label: 'Formations',          icon: BookOpen,        path: '/admin/formations' },
      { label: 'Utilisateurs',        icon: Users,           path: '/admin/utilisateurs' },
      { label: 'Professeurs',         icon: GraduationCap,   path: '/admin/profs' },
      { label: 'Préinscription',     icon: UserCircle,      path: '/admin/students' },
      { label: "Emplois de l'école",  icon: Calendar,        path: '/admin/emplois' },
      { label: 'Demandes de salles',  icon: ClipboardList,   path: '/admin/demandes-salles' },
      { label: 'Statistique',         icon: BarChart3,       path: '/admin/statistique' },
    ],
  },
  {
    label: 'Contenu',
    items: [
      { label: 'Archive', icon: FolderArchive, path: '/admin/archive' },
    ],
  },
  {
    label: 'Système',
    items: [
      { label: 'Paramètre', icon: Settings, path: '/admin/parametre' },
    ],
  },
];

// Fixed-position tooltip, positioned via JS so it can never be clipped by
// an ancestor's overflow-hidden (which is what was hiding it before).
const Tooltip = ({ label, anchorRect }) => {
  if (!anchorRect) return null;
  const top = anchorRect.top + anchorRect.height / 2;
  const left = anchorRect.right + 12;
  return (
    <div
      style={{ position: 'fixed', top, left, transform: 'translateY(-50%)' }}
      className="px-2.5 py-1.5 bg-[#0369A1] text-white text-xs rounded-lg whitespace-nowrap pointer-events-none z-[9999] shadow-md"
    >
      {label}
    </div>
  );
};

const FadeLabel = ({ collapsed, children, className = '' }) => (
  <span
    className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
      collapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100 delay-100'
    } ${className}`}
  >
    {children}
  </span>
);

const NavItem = ({ label, Icon, path, isActive, collapsed, onClick }) => {
  const [rect, setRect] = useState(null);

  const handleEnter = (e) => {
    if (collapsed) setRect(e.currentTarget.getBoundingClientRect());
  };
  const handleLeave = () => setRect(null);

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        onClick={onClick}
               className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-colors duration-150
          ${collapsed ? 'justify-center' : ''}
          ${isActive ? 'text-[#0369A1] font-medium' : 'text-slate-500 hover:text-[#0369A1] hover:bg-[#F8FAFC]'}`}
      >
                <Icon size={16} className="shrink-0" />
              <FadeLabel collapsed={collapsed} className="text-xs">{label}</FadeLabel>
      </button>
      {collapsed && rect && <Tooltip label={label} anchorRect={rect} />}
    </div>
  );
};

const SidebarAdmin = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const initials = [user?.prenom?.[0], user?.nom?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside
  className={`absolute left-0 top-0 flex flex-col h-full bg-white border-r border-[#E2E8F0] transition-[width] duration-300 ease-in-out z-30 ${
       collapsed ? 'w-[60px]' : 'w-[190px] shadow-xl'
  }`}
>
      <div className="h-2" />

      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'max-h-0 opacity-0' : 'max-h-8 opacity-100 delay-100'}`}>
                            <p className="px-3 pt-3 pb-1 text-[10px] font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">
                {group.label}
              </p>
            </div>
            {group.items.map(({ label, icon: Icon, path }) => {
              const isActive = path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path);
              return (
                <NavItem
                  key={path}
                  label={label}
                  Icon={Icon}
                  path={path}
                  isActive={isActive}
                  collapsed={collapsed}
                  onClick={() => navigate(path)}
                />
              );
            })}
          </div>
        ))}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 w-6 h-6 bg-white border border-[#E2E8F0] rounded-full flex items-center justify-center text-slate-400 shadow-sm hover:text-[#0369A1] transition z-10"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="px-3 py-4 border-t border-[#E2E8F0] space-y-2">
        <div className="relative group">
          <button
            onClick={() => navigate('/profile')}
            className={`w-full flex items-center gap-2 px-1 py-1 rounded-lg transition group ${collapsed ? 'justify-center' : ''}`}
          >
            {user?.photo_url ? (
                            <img src={user.photo_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
                          <div className="w-7 h-7 rounded-full bg-[#DCEBFA] flex items-center justify-center shrink-0">
                <span className="text-[#0369A1] text-[10px] font-bold">{initials}</span>
              </div>
            )}
            <FadeLabel collapsed={collapsed} className="text-left min-w-0">
              <p className="text-slate-700 text-sm font-medium leading-none truncate group-hover:text-[#0F2A4A] transition">{user?.prenom} {user?.nom}</p>
              <p className="text-slate-400 text-xs mt-0.5">Administrateur</p>
            </FadeLabel>
          </button>
        </div>

        <div className="relative group">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-[#0369A1] transition ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={16} className="shrink-0" />
                        <FadeLabel collapsed={collapsed} className="text-xs font-medium">Déconnexion</FadeLabel>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SidebarAdmin;