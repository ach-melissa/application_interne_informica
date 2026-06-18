/**
 * GroupStudents — read-only list of confirmed students.
 * The professor cannot edit student data (name, email, phone, niveau).
 * Editing students is an admin-only action.
 *
 * Props:
 *  - students : [{ id, etudiant_id, etudiants: { nom, prenom, telephone, email, niveau_scolaire } }]
 */
const GroupStudents = ({ students = [] }) => {
  if (!students || students.length === 0) {
    return (
      <p className="text-[#64748B] text-sm py-4 text-center">
        Aucun étudiant confirmé dans ce groupe.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <th className="text-left px-4 py-2.5 text-[#64748B] font-semibold text-xs uppercase tracking-wide w-8">#</th>
            <th className="text-left px-4 py-2.5 text-[#64748B] font-semibold text-xs uppercase tracking-wide">Nom & Prénom</th>
            <th className="text-left px-4 py-2.5 text-[#64748B] font-semibold text-xs uppercase tracking-wide">Téléphone</th>
            <th className="text-left px-4 py-2.5 text-[#64748B] font-semibold text-xs uppercase tracking-wide">Email</th>
            <th className="text-left px-4 py-2.5 text-[#64748B] font-semibold text-xs uppercase tracking-wide">Niveau</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F1F5F9]">
          {students.map((s, idx) => (
            <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}>
              <td className="px-4 py-2.5 text-[#94A3B8] font-medium">{idx + 1}</td>
              <td className="px-4 py-2.5 font-semibold text-[#1E293B] whitespace-nowrap">
                {s.etudiants?.nom} {s.etudiants?.prenom}
              </td>
              <td className="px-4 py-2.5 text-[#64748B]">{s.etudiants?.telephone || '—'}</td>
              <td className="px-4 py-2.5 text-[#64748B]">{s.etudiants?.email || '—'}</td>
              <td className="px-4 py-2.5 text-[#64748B]">{s.etudiants?.niveau_scolaire || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GroupStudents;