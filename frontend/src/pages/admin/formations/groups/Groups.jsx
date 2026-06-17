import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import AdminLayout from '../../../../layouts/AdminLayout';

const staticGroups = [
  { id: 1, nom: 'Groupe A', teacher: 'Mr. Karim', statut: 'active', etudiants: 12 },
  { id: 2, nom: 'Groupe B', teacher: 'Mr. Karim', statut: 'active', etudiants: 8 },
  { id: 3, nom: 'Groupe C', teacher: 'Mme. Sara', statut: 'inactive', etudiants: 5 },
];

const Groups = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/formations')}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] hover:bg-gray-100 transition"
          >
            <ArrowLeft size={16} className="text-[#64748B]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Groupes</h1>
            <p className="text-[#64748B] text-sm mt-0.5">Formation #{id}</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-lg hover:bg-[#1D4ED8] transition text-sm font-medium">
          <Plus size={18} />
          Ajouter un groupe
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {staticGroups.map((g) => (
          <div
            key={g.id}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-[#FFF7ED] rounded-lg flex items-center justify-center">
                <Users size={20} className="text-[#F97316]" />
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                g.statut === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {g.statut === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <h2 className="text-[#1E293B] font-semibold text-base mb-1">{g.nom}</h2>
            <p className="text-[#64748B] text-xs mb-4">{g.teacher}</p>
            <div className="flex items-center gap-1 text-xs text-[#64748B] mb-5">
              <Users size={13} /> {g.etudiants} étudiants
            </div>
            <button className="text-xs font-medium text-[#2563EB] border border-[#2563EB] px-3 py-1.5 rounded-lg hover:bg-[#EFF6FF] transition">
              Voir détails
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default Groups;