import { Bell, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const TopbarAdmin = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0">
      {/* Left: search */}
      <div className="relative w-64">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Rechercher..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-[#F8FAFC]"
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#F8FAFC] border border-[#E2E8F0] transition">
          <Bell size={18} className="text-[#64748B]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F97316] rounded-full" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2 cursor-pointer group relative">
          <div className="w-8 h-8 rounded-full bg-[#F97316] flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-[#1E293B] leading-none">
              {user?.prenom} {user?.nom}
            </p>
            <p className="text-xs text-[#64748B] mt-0.5">Administrateur</p>
          </div>

          {/* Dropdown on hover */}
          <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-[#E2E8F0] rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-50">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopbarAdmin;