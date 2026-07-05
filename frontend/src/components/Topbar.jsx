import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/images/logo_informica.png';

const ROLE_LABELS = { admin: 'Administrateur', prof: 'Professeur', comptable: 'Comptable' };

const Topbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const initials = [user?.prenom?.[0], user?.nom?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const roleLabel = ROLE_LABELS[user?.role] ?? user?.role;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0">
      <img src={logo} alt="Infomica" className="h-10 w-auto object-contain shrink-0" />

      <div className="flex items-center gap-3">
      <button className="relative w-9 h-9 flex items-center justify-center rounded-lg  transition group">
  <Bell size={18} className="text-[#64748B] group-hover:text-[#0F2A4A] transition" />
       <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border border-white" />  </button>

        <div className="relative" ref={menuRef}>
          <button
  onClick={() => setMenuOpen((o) => !o)}
  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition group"
>
  <div className="hidden sm:block text-right">
    <p className="text-sm font-medium text-[#1E293B] group-hover:text-[#0F2A4A] leading-none transition">{user?.prenom} {user?.nom}</p>
    <p className="text-xs text-[#64748B] mt-0.5">{roleLabel}</p>
  </div>
            {user?.photo_url ? (
              <img src={user.photo_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#DCEBFA] flex items-center justify-center shrink-0">
                <span className="text-[#0369A1] text-sm font-bold">{initials}</span>
              </div>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-50">
              <button
                onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1E293B] hover:bg-[#F8FAFC] transition text-left"
              >
                <User size={16} className="text-[#64748B]" /> Voir profil
              </button>
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition text-left"
              >
                <LogOut size={16} /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;