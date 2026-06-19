import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, User, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/prof',        label: 'Dashboard',  icon: LayoutDashboard, exact: true },
  { path: '/prof/groups', label: 'Mes Groupes', icon: Users },
  { path: '/profile',     label: 'Mon Profil',  icon: User },
];

const SidebarProf = ({ collapsed, setCollapsed }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = () => { logout(); navigate('/login'); };

  // Initials from name
  const initials = [user?.prenom?.[0], user?.nom?.[0]].filter(Boolean).join('').toUpperCase() || 'P';

  return (
    <aside
      className={`h-screen bg-[#1E293B] flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* ── Logo + collapse ── */}
      <div className={`flex items-center border-b border-[#334155] py-4 ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-tight">
            Informica
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-[#334155] text-[#94A3B8] hover:text-white transition"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* ── Nav items ── */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#94A3B8] hover:bg-[#334155] hover:text-white'
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

      {/* ── User info + logout ── */}
      <div className="border-t border-[#334155] px-2 py-4 space-y-1">
        {/* User card */}
        {!collapsed ? (
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs text-[#94A3B8] capitalize">Prof</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-1">
            <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Déconnexion' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#94A3B8] hover:bg-red-900/30 hover:text-red-400 transition"
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
};

export default SidebarProf;