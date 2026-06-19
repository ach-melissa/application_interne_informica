import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import { Archive as ArchiveIcon, ChevronRight } from 'lucide-react';

const years = [
  { year: '2024-2025', formations: 8, students: 120, groups: 15 },
  { year: '2023-2024', formations: 6, students: 98, groups: 11 },
  { year: '2022-2023', formations: 5, students: 75, groups: 9 },
];

const Archive = () => {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-[#1E293B] mb-2">Archive</h1>
      <p className="text-[#64748B] text-sm mb-6">Sélectionnez une année scolaire</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {years.map((y) => (
          <div
            key={y.year}
            onClick={() => navigate(`/admin/archive/${y.year}`)}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md hover:border-[#2563EB] cursor-pointer transition group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-[#EFF6FF] rounded-lg flex items-center justify-center">
                <ArchiveIcon size={20} className="text-[#2563EB]" />
              </div>
              <ChevronRight size={18} className="text-[#94A3B8] group-hover:text-[#2563EB] transition" />
            </div>
            <h2 className="text-lg font-bold text-[#1E293B] mb-3">{y.year}</h2>
            <div className="flex gap-4 text-xs text-[#64748B]">
              <span>{y.formations} formations</span>
              <span>{y.students} étudiants</span>
              <span>{y.groups} groupes</span>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default Archive;