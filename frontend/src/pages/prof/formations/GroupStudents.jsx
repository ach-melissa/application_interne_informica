import { User, Phone, Mail, GraduationCap, Users } from 'lucide-react';

/**
 * GroupStudents — read-only list of confirmed students.
 * The professor cannot edit student data (name, email, phone, niveau).
 * Editing students is an admin-only action.
 *
 * Props:
 *  - students : [{ id, etudiant_id, etudiants: { nom, prenom, telephone, email, niveau_scolaire } }]
 */

const COLS = [
  { label: 'Étudiant',  Icon: null },
  { label: 'Téléphone', Icon: Phone },
  { label: 'Email',     Icon: Mail },
  { label: 'Niveau',    Icon: GraduationCap },
];

const GroupStudents = ({ students = [] }) => {
  if (!students || students.length === 0) {
    return (
      <div className="text-center py-8">
        <Users size={28} className="mx-auto text-slate-200 mb-2" />
        <p className="text-sm text-[#94A3B8]">Aucun étudiant confirmé dans ce groupe.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#DCEBFA]">
            <tr>
              {COLS.map(({ label, Icon }, i) => (
                <th key={label} className={`text-left px-4 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] whitespace-nowrap ${i === 0 ? 'border-l border-[#E2E8F0]' : ''}`}>
                  <div className="flex items-center gap-1">
                    {Icon && <Icon size={11} className="text-[#0369A1] flex-shrink-0" />}
                    <span>{label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => (
              <tr key={s.id} className={`hover:bg-[#DCEBFA]/30 transition ${idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}`}>
                <td className="px-4 py-2.5 border-b border-l border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                      {(s.etudiants?.nom?.[0] ?? '?').toUpperCase()}
                    </div>
                    <span className="font-medium text-[#1E293B] whitespace-nowrap">
                      {s.etudiants?.nom} {s.etudiants?.prenom}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-[#64748B] whitespace-nowrap border-b border-[#E2E8F0]">{s.etudiants?.telephone || '—'}</td>
                <td className="px-4 py-2.5 text-[#64748B] whitespace-nowrap border-b border-[#E2E8F0]">{s.etudiants?.email || '—'}</td>
                <td className="px-4 py-2.5 text-[#64748B] whitespace-nowrap border-b border-[#E2E8F0]">{s.etudiants?.niveau_scolaire || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GroupStudents;