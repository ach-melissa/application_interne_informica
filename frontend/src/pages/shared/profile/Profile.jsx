import { useAuth } from '../../../context/AuthContext';
import { User, Mail, Phone, Shield } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';
import ProfLayout from '../../../layouts/ProfLayout';

const ROLE_LABELS = {
  admin: 'Administrateur',
  prof: 'Professeur',
  comptable: 'Comptable',
};

const ROLE_COLORS = {
  admin: 'bg-blue-100 text-blue-700',
  prof: 'bg-green-100 text-green-700',
  comptable: 'bg-purple-100 text-purple-700',
};

const ProfileContent = ({ user }) => (
  <div className="max-w-xl">
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-[#1E293B]">Mon Profil</h1>
      <p className="text-[#64748B] text-sm mt-1">Vos informations personnelles</p>
    </div>

    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
      {/* Avatar header */}
      <div className="bg-[#EFF6FF] px-6 py-8 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm">
          <User size={28} className="text-[#2563EB]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#1E293B]">
            {user?.nom} {user?.prenom}
          </h2>
          <span
            className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mt-1 ${
              ROLE_COLORS[user?.role] ?? 'bg-gray-100 text-gray-500'
            }`}
          >
            {ROLE_LABELS[user?.role] ?? user?.role}
          </span>
        </div>
      </div>

      {/* Info fields */}
      <div className="divide-y divide-[#E2E8F0]">
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="w-9 h-9 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
            <Mail size={16} className="text-[#64748B]" />
          </div>
          <div>
            <p className="text-xs text-[#94A3B8]">Email</p>
            <p className="text-sm font-medium text-[#1E293B]">{user?.email || '—'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-6 py-4">
          <div className="w-9 h-9 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
            <Phone size={16} className="text-[#64748B]" />
          </div>
          <div>
            <p className="text-xs text-[#94A3B8]">Téléphone</p>
            <p className="text-sm font-medium text-[#1E293B]">{user?.telephone || '—'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-6 py-4">
          <div className="w-9 h-9 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
            <Shield size={16} className="text-[#64748B]" />
          </div>
          <div>
            <p className="text-xs text-[#94A3B8]">Rôle</p>
            <p className="text-sm font-medium text-[#1E293B]">
              {ROLE_LABELS[user?.role] ?? user?.role}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Profile = () => {
  const { user } = useAuth();

  if (user?.role === 'prof') {
    return (
      <ProfLayout>
        <ProfileContent user={user} />
      </ProfLayout>
    );
  }

  return (
    <AdminLayout>
      <ProfileContent user={user} />
    </AdminLayout>
  );
};

export default Profile;