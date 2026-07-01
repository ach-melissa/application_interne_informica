import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import { Archive as ArchiveIcon, ChevronRight, Users, BookOpen } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const Archive = () => {
  const navigate = useNavigate();
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API}/api/archive/years`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('Erreur serveur');
        return r.json();
      })
      .then(setYears)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-[#1E293B] mb-2">Archive</h1>
      <p className="text-[#64748B] text-sm mb-6">Sélectionnez une année scolaire</p>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      )}

      {!loading && !error && years.length === 0 && (
        <p className="text-[#64748B] text-sm">Aucune archive pour le moment.</p>
      )}

      {!loading && !error && years.length > 0 && (
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
                <span className="flex items-center gap-1"><Users size={13} /> {y.nb_groupes_archives} groupe(s)</span>
                <span className="flex items-center gap-1"><BookOpen size={13} /> {y.nb_inscriptions_archivees} inscription(s)</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default Archive;