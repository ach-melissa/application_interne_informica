import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import { FolderArchive, ChevronRight, Users, BookOpen } from 'lucide-react';

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
<div className="flex items-center gap-3 mb-1">
  <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
    <FolderArchive size={22} className="text-white" />
  </div>
  <h1 className="text-xl font-bold text-slate-800">Archive</h1>
</div>
<p className="text-slate-400 text-xs mb-6 ml-14">Sélectionnez une année scolaire</p>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      )}

      {!loading && !error && years.length === 0 && (
        <p className="text-slate-400 text-sm">Aucune archive pour le moment.</p>
      )}

      {!loading && !error && years.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {years.map((y) => (
            <div
              key={y.year}
              onClick={() => navigate(`/admin/archive/${y.year}`)}
              className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] cursor-pointer transition group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-[#DCEBFA] rounded-full flex items-center justify-center">
                  <FolderArchive size={20} className="text-[#0369A1]" />
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-[#0369A1] transition" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-3">{y.year}</h2>
              <div className="flex gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Users size={13} className="text-[#0369A1]" /> {y.nb_groupes_archives} groupe(s)</span>
                <span className="flex items-center gap-1"><BookOpen size={13} className="text-[#0369A1]" /> {y.nb_inscriptions_archivees} inscription(s)</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default Archive;