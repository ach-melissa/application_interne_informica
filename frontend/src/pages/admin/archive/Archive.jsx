import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import { FolderArchive, ChevronRight, Users, BookOpen, Search, X, CalendarDays } from 'lucide-react';
const API = import.meta.env.VITE_API_URL;

const Archive = () => {
  const navigate = useNavigate();
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

   // "2024-2025" → full calendar range: Jan 1, 2024 to Dec 31, 2025
  const yearRange = (label) => {
    const parts = label.split('-').map(Number).filter(n => !isNaN(n));
    if (!parts.length) return null;
    const start = parts[0];
    const end = parts.length > 1 ? parts[1] : parts[0];
    return { from: new Date(start, 0, 1), to: new Date(end, 11, 31) };
  };

  const filteredYears = years.filter(y => {
    if (!y.year.toLowerCase().includes(search.toLowerCase())) return false;
    const range = yearRange(y.year);
    if (dateFrom && range && range.to < new Date(dateFrom)) return false;
    if (dateTo && range && range.from > new Date(dateTo)) return false;
    return true;
  });

  const clearAll = () => { setSearch(''); setDateFrom(''); setDateTo(''); };
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
<div className="flex items-center gap-3 mb-6">
  <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
    <FolderArchive size={22} className="text-white" />
  </div>
  <div>
    <h1 className="text-xl font-bold text-slate-800">Archive</h1>
    <p className="text-slate-400 text-xs mt-0.5">{filteredYears.length} / {years.length} année(s) scolaire(s)</p>
  </div>
</div>
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

     {!loading && !error && years.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 items-center">
          <div className="relative min-w-[160px] flex-1 max-w-[220px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
            <input placeholder="Rechercher une année..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
          </div>

          <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 border border-[#E2E8F0]">
            <CalendarDays size={12} className="text-[#0369A1] flex-shrink-0" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className={`text-xs bg-transparent focus:outline-none transition ${dateFrom ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
            <span className="text-[#0369A1]/40 text-[10px] font-bold px-0.5">–</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className={`text-xs bg-transparent focus:outline-none transition ${dateTo ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
          </div>

          {(search || dateFrom || dateTo) && (
            <button onClick={clearAll} className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
              <X size={11} /> Tout effacer
            </button>
          )}
        </div>
      )}

      {!loading && !error && years.length === 0 && (
        <p className="text-slate-400 text-sm">Aucune archive pour le moment.</p>
      )}
      {!loading && !error && years.length > 0 && filteredYears.length === 0 && (
        <p className="text-slate-400 text-sm">Aucune année trouvée.</p>
      )}

      {!loading && !error && filteredYears.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredYears.map((y) => (
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