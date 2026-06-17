import { useState } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import AddUserModal from './AddUserModal';
import UserDetailsModal from './UserDetailsModal';
import { Plus, Search } from 'lucide-react';

const staticUsers = [
  { id: 1, nom: 'Benali', prenom: 'Karim', email: 'karim@informica.dz', nom_utilisateur: 'karim.b', role: 'admin', statut: 'active', created_at: '2024-03-15' },
  { id: 2, nom: 'Meziani', prenom: 'Sara', email: 'sara@informica.dz', nom_utilisateur: 'sara.m', role: 'prof', statut: 'active', created_at: '2024-03-10' },
  { id: 3, nom: 'Hamidi', prenom: 'Amine', email: 'amine@informica.dz', nom_utilisateur: 'amine.h', role: 'comptable', statut: 'inactive', created_at: '2024-02-28' },
  { id: 4, nom: 'Ouali', prenom: 'Nadia', email: 'nadia@informica.dz', nom_utilisateur: 'nadia.o', role: 'prof', statut: 'active', created_at: '2024-02-10' },
  { id: 5, nom: 'Kaci', prenom: 'Yacine', email: 'yacine@informica.dz', nom_utilisateur: 'yacine.k', role: 'admin', statut: 'archived', created_at: '2024-01-05' },
];

const roleBadge = {
  admin: 'bg-blue-100 text-blue-600',
  prof: 'bg-green-100 text-green-600',
  comptable: 'bg-purple-100 text-purple-600',
  etudiant: 'bg-orange-100 text-orange-600',
};

const statutBadge = {
  active: 'bg-green-100 text-green-600',
  inactive: 'bg-gray-100 text-gray-500',
  archived: 'bg-red-100 text-red-400',
};

const Utilisateurs = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [users, setUsers] = useState(
    [...staticUsers].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  );
  const [showAdd, setShowAdd] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.nom.toLowerCase().includes(search.toLowerCase()) ||
      u.prenom.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleUpdate = (updatedUser) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
    setSelectedUser(updatedUser);
  };

  const handleDelete = (id) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setSelectedUser(null);
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Utilisateurs</h1>
          <p className="text-[#64748B] text-sm mt-1">{users.length} utilisateurs</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-lg hover:bg-[#1D4ED8] transition text-sm font-medium"
        >
          <Plus size={18} />
          Ajouter
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#1E293B]"
        >
          <option value="all">Tous les rôles</option>
          <option value="admin">Admin</option>
          <option value="prof">Prof</option>
          <option value="comptable">Comptable</option>
          <option value="etudiant">Étudiant</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="text-left px-5 py-3 text-[#64748B] font-medium">Utilisateur</th>
              <th className="text-left px-5 py-3 text-[#64748B] font-medium">Email</th>
              <th className="text-left px-5 py-3 text-[#64748B] font-medium">Rôle</th>
              <th className="text-left px-5 py-3 text-[#64748B] font-medium">Statut</th>
              <th className="text-left px-5 py-3 text-[#64748B] font-medium">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-[#94A3B8]">
                  Aucun utilisateur trouvé
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] cursor-pointer transition group"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] font-bold text-xs shrink-0">
                        {u.prenom[0]}{u.nom[0]}
                      </div>
                      <div>
                        <p className="font-medium text-[#1E293B] group-hover:text-[#2563EB] transition">
                          {u.prenom} {u.nom}
                        </p>
                        <p className="text-xs text-[#94A3B8]">@{u.nom_utilisateur}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[#64748B]">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleBadge[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statutBadge[u.statut]}`}>
                      {u.statut}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#94A3B8] text-xs">
                    {new Date(u.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </AdminLayout>
  );
};

export default Utilisateurs;