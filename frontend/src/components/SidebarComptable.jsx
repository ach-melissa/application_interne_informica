import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, CreditCard, Wallet, Receipt, ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Gestion',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/comptable', exact: true },
      { label: 'Revenu',    icon: CreditCard,       path: '/comptable/paiements' },
      { label: 'Charges',   icon: Receipt,          path: '/comptable/charges' },
      { label: 'Salaires',  icon: Wallet,           path: '/comptable/salaires' },
    ],
  },
];

const Tooltip = ({ label }) => (
  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-[#0369A1] text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
    {label}
  </div>
);

const SidebarComptable = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const initials = [user?.prenom?.[0], user?.nom?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className={`relative flex flex-col h-full bg-white border-r border-[#E2E8F0] transition-all duration-300 shrink-0 ${collapsed ? 'w-[70px]' : 'w-[210px]'}`}>
      <div className="h-2" />

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 pt-3 pb-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                {group.label}
              </p>
            )}
            {group.items.map(({ label, icon: Icon, path, exact }) => {
              const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);
              return (
                <div key={path} className="relative group">
                  <button
                    onClick={() => navigate(path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150
                      ${collapsed ? 'justify-center' : ''}
                      ${isActive ? 'text-[#0369A1] font-medium' : 'text-slate-500 hover:text-[#0369A1] hover:bg-[#F8FAFC]'}`}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && <span className="text-sm">{label}</span>}
                  </button>
                  {collapsed && <Tooltip label={label} />}
                </div>
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
              <img src={user.photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#DCEBFA] flex items-center justify-center shrink-0">
                <span className="text-[#0369A1] text-xs font-bold">{initials}</span>
              </div>
            )}
            {!collapsed && (
              <div className="text-left min-w-0">
                <p className="text-slate-700 text-sm font-medium leading-none truncate group-hover:text-[#0F2A4A] transition">{user?.prenom} {user?.nom}</p>
                <p className="text-slate-400 text-xs mt-0.5">Comptable</p>
              </div>
            )}
          </button>
          {collapsed && <Tooltip label="Mon Profil" />}
        </div>

        <div className="relative group">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-[#0369A1] transition ${collapsed ? 'justify-center' : ''}`}
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

export default SidebarComptable;