const users = [
  { id: 1, nom: 'Benali Karim', role: 'admin', email: 'karim@informica.dz' },
  { id: 2, nom: 'Hamidi Amine', role: 'comptable', email: 'amine@informica.dz' },
];

const roleBadge = {
  admin: 'bg-blue-100 text-blue-600',
  comptable: 'bg-purple-100 text-purple-600',
  prof: 'bg-green-100 text-green-600',
};

const UtilisateursTab = () => (
  <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <th className="text-left px-5 py-3 text-[#64748B] font-medium">Nom</th>
          <th className="text-left px-5 py-3 text-[#64748B] font-medium">Email</th>
          <th className="text-left px-5 py-3 text-[#64748B] font-medium">Rôle</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} className="border-b border-[#F1F5F9]">
            <td className="px-5 py-3 font-medium text-[#1E293B]">{u.nom}</td>
            <td className="px-5 py-3 text-[#64748B]">{u.email}</td>
            <td className="px-5 py-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleBadge[u.role]}`}>
                {u.role}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default UtilisateursTab;