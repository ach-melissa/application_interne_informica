import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3, CreditCard, Wallet, Receipt, ChevronLeft, ChevronRight,
  ChevronDown, LogOut, X,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Gestion',
    items: [
   {
  label: 'Stat et rapports', icon: BarChart3,
  children: [
    { label: 'Statistiques', path: '/comptable/statistique' },
    { label: 'Rapport mensuel', path: '/comptable/rapport-mensuel' },
  ],
},
      {
        label: 'Revenu', icon: CreditCard,
        children: [
          { label: 'Par formation', path: '/comptable/paiements/formation' },
          { label: 'Autre revenu', path: '/comptable/paiements/autre' },
        ],
      },
      {
        label: 'Charges', icon: Receipt,
        children: [
          { label: 'Charges de formation', path: '/comptable/charges/formation' },
          { label: 'Autre charge', path: '/comptable/charges/autre' },
        ],
      },
      {
        label: 'Salaires', icon: Wallet,
        children: [
          { label: 'Salaires employés', path: '/comptable/salaires/employes' },
          { label: 'Salaires professeurs', path: '/comptable/salaires/professeurs' },
        ],
      },
    ],
  },
];

// Small label shown to the right of a collapsed icon
const Tooltip = ({ label, anchorRect }) =>
  createPortal(
    <div
      style={{ position: 'fixed', top: anchorRect.top + anchorRect.height / 2, left: anchorRect.right + 12, transform: 'translateY(-50%)' }}
      className="hidden lg:block px-2.5 py-1.5 bg-[#0369A1] text-white text-xs rounded-lg whitespace-nowrap pointer-events-none z-[9999] shadow-md"
    >
      {label}
    </div>,
    document.body
  );

// Floating panel with the sub-pages, shown when a collapsed dropdown icon is hovered
const Flyout = ({ item, anchorRect, pathname, goTo }) =>
  createPortal(
    <div style={{ position: 'fixed', top: anchorRect.top, left: anchorRect.right }} className="hidden lg:block pl-2 z-[9999]">
      <div className="min-w-[170px] bg-white border border-[#E2E8F0] rounded-lg shadow-xl p-1.5">
        <p className="px-2 pt-1 pb-1.5 text-[10px] font-medium text-slate-400 uppercase tracking-wide">{item.label}</p>
        {item.children.map((c) => (
          <button
            key={c.path}
            onClick={() => goTo(c.path)}
            className={`w-full text-left px-2 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors duration-150
              ${pathname.startsWith(c.path) ? 'text-[#0369A1] font-medium bg-[#DCEBFA]/50' : 'text-slate-500 hover:text-[#0369A1] hover:bg-[#F8FAFC]'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );

const FadeLabel = ({ collapsed, children, className = '' }) => (
  <span
    className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out max-w-[160px] opacity-100 ${
      collapsed ? 'lg:max-w-0 lg:opacity-0' : 'lg:delay-100'
    } ${className}`}
  >
    {children}
  </span>
);

const NavItem = ({ label, Icon, isActive, collapsed, onClick, children, tooltip = true }) => {
  const [rect, setRect] = useState(null);
  return (
    <div
      className="relative"
      onMouseEnter={(e) => collapsed && setRect(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setRect(null)}
    >
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-2.5 lg:gap-3 px-2 lg:px-2.5 py-1.5 lg:py-2 rounded-lg transition-colors duration-150
          ${collapsed ? 'lg:justify-center' : ''}
          ${isActive ? 'text-[#0369A1] font-medium' : 'text-slate-500 hover:text-[#0369A1] hover:bg-[#F8FAFC]'}`}
      >
        <Icon size={16} className="shrink-0" />
        <FadeLabel collapsed={collapsed} className="text-xs flex-1 text-left">{label}</FadeLabel>
        {children}
      </button>
      {collapsed && tooltip && rect && <Tooltip label={label} anchorRect={rect} />}
    </div>
  );
};

// One component for every dropdown, so they are always identical
const Dropdown = ({ item, open, collapsed, pathname, onToggle, goTo }) => {
  const { label, icon: Icon, children } = item;
  const [rect, setRect] = useState(null);
  const isActive = children.some((c) => pathname.startsWith(c.path));

  return (
    <div
      onMouseEnter={(e) => collapsed && setRect(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setRect(null)}
    >
      <NavItem label={label} Icon={Icon} collapsed={collapsed} isActive={collapsed && isActive} onClick={onToggle} tooltip={false}>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-200 ${collapsed ? 'lg:hidden' : ''} ${open ? 'rotate-180' : ''}`}
        />
      </NavItem>

      <div className={`overflow-hidden transition-all duration-200 ml-[18px] border-l border-[#E2E8F0]
        ${open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'} ${collapsed ? 'lg:hidden' : ''}`}
      >
        {children.map((c) => (
          <button
            key={c.path}
            onClick={() => goTo(c.path)}
            className={`w-full text-left pl-3 pr-2 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors duration-150
              ${pathname.startsWith(c.path) ? 'text-[#0369A1] font-medium' : 'text-slate-400 hover:text-[#0369A1] hover:bg-[#F8FAFC]'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {collapsed && rect && (
        <Flyout item={item} anchorRect={rect} pathname={pathname} goTo={(p) => { setRect(null); goTo(p); }} />
      )}
    </div>
  );
};

const SidebarComptable = ({ collapsed, setCollapsed, mobileOpen, onMobileClose }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const initials = [user?.prenom?.[0], user?.nom?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const findActive = (path) =>
    navGroups.flatMap((g) => g.items).find((i) => i.children?.some((c) => path.startsWith(c.path)));

  const [open, setOpen] = useState(() => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('comptable_sidebar_open')) || {}; } catch {}
    const a = findActive(pathname);
    return a ? { ...saved, [a.label]: true } : saved;
  });

  // Remember which menus are open across page changes
  useEffect(() => {
    localStorage.setItem('comptable_sidebar_open', JSON.stringify(open));
  }, [open]);

  // Open the menu of the current page. Never closes another one.
  useEffect(() => {
    const a = findActive(pathname);
    if (a) setOpen((o) => ({ ...o, [a.label]: true }));
  }, [pathname]);

  const goTo = (path) => { navigate(path); onMobileClose?.(); };
  const handleLogout = () => { logout(); navigate('/login'); onMobileClose?.(); };
  const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

  // Collapsed on desktop: clicking the icon opens the first sub-page
  const toggle = (item) =>
    collapsed && isDesktop()
      ? goTo(item.children[0].path)
      : setOpen((o) => ({ ...o, [item.label]: !o[item.label] }));

  return (
    <>
      {mobileOpen && <div onClick={onMobileClose} className="fixed inset-0 bg-black/40 z-30 lg:hidden" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[200px] bg-white border-r border-[#E2E8F0] flex flex-col h-full
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:absolute lg:top-0 lg:z-30 lg:transition-[width] lg:duration-300 lg:ease-in-out
          ${collapsed ? 'lg:w-[60px]' : 'lg:w-[190px] lg:shadow-xl'}`}
      >
        <div className="h-11 flex items-center justify-end px-3 lg:hidden">
          <button onClick={onMobileClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#0369A1]">
            <X size={18} />
          </button>
        </div>
        <div className="h-2 hidden lg:block" />

        <nav className="flex-1 px-2 space-y-0.5 lg:space-y-1 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'lg:max-h-0 lg:opacity-0' : 'max-h-8 opacity-100 lg:delay-100'}`}>
                <p className="px-3 pt-3 pb-1 text-[10px] font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">
                  {group.label}
                </p>
              </div>

              {group.items.map((item) =>
                item.children ? (
                  <Dropdown
                    key={item.label}
                    item={item}
                    open={!!open[item.label]}
                    collapsed={collapsed}
                    pathname={pathname}
                    onToggle={() => toggle(item)}
                    goTo={goTo}
                  />
                ) : (
                  <NavItem
                    key={item.path}
                    label={item.label}
                    Icon={item.icon}
                    collapsed={collapsed}
                    isActive={pathname.startsWith(item.path)}
                    onClick={() => goTo(item.path)}
                  />
                )
              )}
            </div>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white border border-[#E2E8F0] rounded-full items-center justify-center text-slate-400 shadow-sm hover:text-[#0369A1] transition z-10"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="px-3 py-3 lg:py-4 border-t border-[#E2E8F0] space-y-1 lg:space-y-2">
          <button
            onClick={() => goTo('/profile')}
            className={`group w-full flex items-center gap-2 px-1 py-1 rounded-lg transition ${collapsed ? 'lg:justify-center' : ''}`}
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
              <p className="text-slate-400 text-xs mt-0.5">Comptable</p>
            </FadeLabel>
          </button>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-[#0369A1] transition ${collapsed ? 'lg:justify-center' : ''}`}
          >
            <LogOut size={16} className="shrink-0" />
            <FadeLabel collapsed={collapsed} className="text-xs font-medium">Déconnexion</FadeLabel>
          </button>
        </div>
      </aside>
    </>
  );
};

export default SidebarComptable;