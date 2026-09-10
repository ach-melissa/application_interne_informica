import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, BookOpen, Users, GraduationCap,
  FolderArchive, UserCircle, ChevronLeft, ChevronRight, LogOut,
  BarChart3, Settings, Calendar, ClipboardList, X,
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
  return createPortal(
    <div
      style={{ position: 'fixed', top, left, transform: 'translateY(-50%)' }}
      className="px-2.5 py-1.5 bg-[#0369A1] text-white text-xs rounded-lg whitespace-nowrap pointer-events-none z-[9999] shadow-md"
    >
      {label}
    </div>,
    document.body
  );
};

const FadeLabel = ({ collapsed, children, className = '' }) => (
  <span
    className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out max-w-[160px] opacity-100 ${
      collapsed ? 'lg:max-w-0 lg:opacity-0' : 'lg:delay-100'
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
          ${collapsed ? 'lg:justify-center' : ''}
          ${isActive ? 'text-[#0369A1] font-medium' : 'text-slate-500 hover:text-[#0369A1] hover:bg-[#F8FAFC]'}`}
      >
                <Icon size={16} className="shrink-0" />
              <FadeLabel collapsed={collapsed} className="text-xs">{label}</FadeLabel>
      </button>
      {collapsed && rect && <Tooltip label={label} anchorRect={rect} />}
    </div>
  );
};

const SidebarAdmin = ({ collapsed, setCollapsed, mobileOpen, onMobileClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const initials = [user?.prenom?.[0], user?.nom?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const handleLogout = () => { logout(); navigate('/login'); onMobileClose?.(); };

  const goTo = (path) => {
    navigate(path);
    onMobileClose?.();
  };

  return (
    <>
      {/* Backdrop — mobile only, shown while drawer is open */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[220px] bg-white border-r border-[#E2E8F0] flex flex-col h-full
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:absolute lg:top-0 lg:z-30 lg:transition-[width] lg:duration-300 lg:ease-in-out
          ${collapsed ? 'lg:w-[60px]' : 'lg:w-[190px] lg:shadow-xl'}`}
      >
        {/* Close button — mobile only */}
       <div className="h-11 flex items-center justify-end px-3 lg:hidden">
          <button
            onClick={onMobileClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#0369A1]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="h-2 hidden lg:block" />

        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'lg:max-h-0 lg:opacity-0' : 'max-h-8 opacity-100 lg:delay-100'}`}>
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
                    onClick={() => goTo(path)}
                  />
                );
              })}
            </div>
          ))}
        </nav>

        {/* Collapse toggle — desktop only, mobile uses the X button + backdrop instead */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white border border-[#E2E8F0] rounded-full items-center justify-center text-slate-400 shadow-sm hover:text-[#0369A1] transition z-10"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="px-3 py-4 border-t border-[#E2E8F0] space-y-2">
          <div className="relative group">
            <button
              onClick={() => goTo('/profile')}
              className={`w-full flex items-center gap-2 px-1 py-1 rounded-lg transition group ${collapsed ? 'lg:justify-center' : ''}`}
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
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-[#0369A1] transition ${collapsed ? 'lg:justify-center' : ''}`}
            >
              <LogOut size={16} className="shrink-0" />
                          <FadeLabel collapsed={collapsed} className="text-xs font-medium">Déconnexion</FadeLabel>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SidebarAdmin;