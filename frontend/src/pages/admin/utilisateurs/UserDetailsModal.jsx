import { X, Mail, Phone, Calendar, Shield, ToggleLeft, ToggleRight, Archive, Trash2 } from 'lucide-react';

const roleBadge = {
  admin: 'bg-blue-100 text-blue-600',
  prof: 'bg-green-100 text-green-600',
  comptable: 'bg-purple-100 text-purple-600',
  etudiant: 'bg-orange-100 text-orange-600',
};

const UserDetailsModal = ({ user, onClose, onUpdate, onDelete }) => {

  const handleToggle = () => {
    onUpdate({ ...user, statut: user.statut === 'active' ? 'inactive' : 'active' });
  };

  const handleArchive = () => {
    onUpdate({ ...user, statut: 'archived' });
  };

  const handleDelete = () => {
    onDelete(user.id);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#1E293B]">Détails utilisateur</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-[#F8FAFC] rounded-xl">
          <div className="w-14 h-14 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] font-bold text-xl shrink-0">
            {user.prenom[0]}{user.nom[0]}
          </div>
          <div>
            <p className="text-base font-semibold text-[#1E293B]">{user.prenom} {user.nom}</p>
            <p className="text-sm text-[#94A3B8]">@{user.nom_utilisateur}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${roleBadge[user.role]}`}>
              {user.role}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <Mail size={15} className="text-[#94A3B8] shrink-0" />
            <span className="text-[#64748B]">{user.email}</span>
          </div>
          {user.telephone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone size={15} className="text-[#94A3B8] shrink-0" />
              <span className="text-[#64748B]">{user.telephone}</span>
            </div>
          )}
          {user.date_naissance && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar size={15} className="text-[#94A3B8] shrink-0" />
              <span className="text-[#64748B]">{user.date_naissance}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <Shield size={15} className="text-[#94A3B8] shrink-0" />
            <span className="text-[#64748B]">
              Créé le {new Date(user.created_at).toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-[#F1F5F9]">
          {/* Toggle active/inactive */}
          <button
            onClick={handleToggle}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
              user.statut === 'active'
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
          >
            {user.statut === 'active'
              ? <><ToggleLeft size={14} /> Désactiver</>
              : <><ToggleRight size={14} /> Activer</>
            }
          </button>

          {/* Archive */}
          {user.statut !== 'archived' && (
            <button
              onClick={handleArchive}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-orange-50 text-[#F97316] hover:bg-orange-100 transition"
            >
              <Archive size={14} /> Archiver
            </button>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition ml-auto"
          >
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;