import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Clock, DollarSign, BookOpen } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';

const staticFormations = [
  { id: 1, nom: 'Développement Web', prix: 15000, heures: 60, teacher: 'Mr. Karim', statut: 'active' },
  { id: 2, nom: 'Design Graphique', prix: 12000, heures: 40, teacher: 'Mme. Sara', statut: 'active' },
  { id: 3, nom: 'Marketing Digital', prix: 10000, heures: 30, teacher: 'Mr. Amine', statut: 'non_active' },
  { id: 4, nom: 'Comptabilité', prix: 8000, heures: 45, teacher: 'Mme. Nadia', statut: 'active' },
  { id: 5, nom: 'Bureautique', prix: 6000, heures: 20, teacher: 'Mr. Yacine', statut: 'active' },
];

const Formations = () => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filtered = staticFormations.filter((f) =>
    f.nom.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Formations</h1>
          <p className="text-[#64748B] text-sm mt-1">{staticFormations.length} formations disponibles</p>
        </div>
        <button className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-lg hover:bg-[#1D4ED8] transition text-sm font-medium">
          <Plus size={18} />
          Ajouter une formation
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Rechercher une formation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
        />
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <p className="text-[#64748B] text-sm">Aucune formation trouvée.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((f) => (
            <div
              key={f.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md transition"
            >
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-[#EFF6FF] rounded-lg flex items-center justify-center">
                  <BookOpen size={20} className="text-[#2563EB]" />
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    f.statut === 'active'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {f.statut === 'active' ? 'Active' : 'Non active'}
                </span>
              </div>

              {/* Name */}
              <h2 className="text-[#1E293B] font-semibold text-base mb-1">{f.nom}</h2>
              <p className="text-[#64748B] text-xs mb-4">{f.teacher}</p>

              {/* Info row */}
              <div className="flex items-center gap-4 text-xs text-[#64748B] mb-5">
                <span className="flex items-center gap-1">
                  <Clock size={13} /> {f.heures}h
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign size={13} /> {f.prix.toLocaleString()} DA
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/admin/formations/${f.id}/groups`)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#2563EB] border border-[#2563EB] px-3 py-1.5 rounded-lg hover:bg-[#EFF6FF] transition"
                >
                  <Users size={13} />
                  Groupes
                </button>
                <button className="text-xs font-medium text-[#F97316] border border-[#F97316] px-3 py-1.5 rounded-lg hover:bg-orange-50 transition">
                  Modifier
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default Formations;