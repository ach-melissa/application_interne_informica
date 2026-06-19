import { Users } from 'lucide-react';

const groupsByFormation = [
  {
    formation: 'Développement Web',
    groups: [
      { nom: 'Groupe A', etudiants: 12, teacher: 'Mr. Karim' },
      { nom: 'Groupe B', etudiants: 10, teacher: 'Mr. Karim' },
    ],
  },
  {
    formation: 'Design Graphique',
    groups: [
      { nom: 'Groupe A', etudiants: 8, teacher: 'Mme. Sara' },
    ],
  },
];

const GroupesTab = () => (
  <div className="space-y-6">
    {groupsByFormation.map((f) => (
      <div key={f.formation}>
        <h3 className="text-sm font-semibold text-[#2563EB] mb-3">{f.formation}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {f.groups.map((g) => (
            <div key={g.nom} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
              <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center mb-3">
                <Users size={18} className="text-[#F97316]" />
              </div>
              <h4 className="font-semibold text-[#1E293B] text-sm mb-1">{g.nom}</h4>
              <p className="text-xs text-[#94A3B8] mb-1">{g.teacher}</p>
              <p className="text-xs text-[#64748B]">{g.etudiants} étudiants</p>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default GroupesTab;