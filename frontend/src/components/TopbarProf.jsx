import { useAuth } from '../context/AuthContext';

const TopbarProf = () => {
  const { user } = useAuth();
  const initials = [user?.prenom?.[0], user?.nom?.[0]].filter(Boolean).join('').toUpperCase() || 'P';

  return (
    <header className="h-14 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0">
      {/* Left — empty, space for page title if needed */}
      <div />

      {/* Right — user chip */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-[#1E293B]">
            {user?.prenom} {user?.nom}
          </p>
          <p className="text-xs text-[#94A3B8]">Prof</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">{initials}</span>
        </div>
      </div>
    </header>
  );
};

export default TopbarProf;