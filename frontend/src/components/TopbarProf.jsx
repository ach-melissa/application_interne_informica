import { useAuth } from '../context/AuthContext';
import { User } from 'lucide-react';

const TopbarProf = () => {
  const { user } = useAuth();

  return (
    <header className="h-14 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center">
          <User size={16} className="text-[#2563EB]" />
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-[#1E293B]">
            {user?.nom} {user?.prenom}
          </p>
          <p className="text-xs text-[#94A3B8] capitalize">{user?.role}</p>
        </div>
      </div>
    </header>
  );
};

export default TopbarProf;