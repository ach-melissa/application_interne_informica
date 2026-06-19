const students = [
  { id: 1, nom: 'Amira Bouzid', formation: 'Développement Web', telephone: '0555001122' },
  { id: 2, nom: 'Yacine Kaci', formation: 'Design Graphique', telephone: '0555334455' },
  { id: 3, nom: 'Nadia Ouali', formation: 'Comptabilité', telephone: '0555667788' },
];

const StudentsTab = () => (
  <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <th className="text-left px-5 py-3 text-[#64748B] font-medium">Étudiant</th>
          <th className="text-left px-5 py-3 text-[#64748B] font-medium">Formation</th>
          <th className="text-left px-5 py-3 text-[#64748B] font-medium">Téléphone</th>
        </tr>
      </thead>
      <tbody>
        {students.map((s) => (
          <tr key={s.id} className="border-b border-[#F1F5F9]">
            <td className="px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] text-xs font-bold">
                  {s.nom[0]}
                </div>
                <span className="font-medium text-[#1E293B]">{s.nom}</span>
              </div>
            </td>
            <td className="px-5 py-3 text-[#64748B]">{s.formation}</td>
            <td className="px-5 py-3 text-[#64748B]">{s.telephone}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default StudentsTab;