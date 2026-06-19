import { GraduationCap } from 'lucide-react';

const profs = [
  { id: 1, nom: 'Karim Benali', specialite: 'Développement Web', telephone: '0555123456' },
  { id: 2, nom: 'Sara Meziani', specialite: 'Design Graphique', telephone: '0555789012' },
];

const ProfsTab = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {profs.map((p) => (
      <div key={p.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
        <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center mb-3">
          <GraduationCap size={18} className="text-green-600" />
        </div>
        <h3 className="font-semibold text-[#1E293B] text-sm mb-1">{p.nom}</h3>
        <p className="text-xs text-[#94A3B8] mb-1">{p.specialite}</p>
        <p className="text-xs text-[#64748B]">{p.telephone}</p>
      </div>
    ))}
  </div>
);

export default ProfsTab;