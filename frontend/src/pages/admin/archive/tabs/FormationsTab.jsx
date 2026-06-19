import { BookOpen } from 'lucide-react';

const formations = [
  { id: 1, nom: 'Développement Web', heures: 60, prix: 15000, teacher: 'Mr. Karim' },
  { id: 2, nom: 'Design Graphique', heures: 40, prix: 12000, teacher: 'Mme. Sara' },
];

const FormationsTab = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {formations.map((f) => (
      <div key={f.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
        <div className="w-9 h-9 bg-[#EFF6FF] rounded-lg flex items-center justify-center mb-3">
          <BookOpen size={18} className="text-[#2563EB]" />
        </div>
        <h3 className="font-semibold text-[#1E293B] text-sm mb-1">{f.nom}</h3>
        <p className="text-xs text-[#94A3B8] mb-3">{f.teacher}</p>
        <div className="flex gap-3 text-xs text-[#64748B]">
          <span>{f.heures}h</span>
          <span>{f.prix.toLocaleString()} DA</span>
        </div>
      </div>
    ))}
  </div>
);

export default FormationsTab;