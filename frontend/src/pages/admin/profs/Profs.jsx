import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, GraduationCap, Mail, Phone, BookOpen } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';

const Profs = () => {
  const [profs, setProfs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfs = async () => {
      try {
const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur serveur');
        const data = await res.json();
        setProfs(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfs();
  }, []);

  const filtered = profs.filter((p) =>
    `${p.nom} ${p.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Professeurs</h1>
          <p className="text-[#64748B] text-sm mt-1">{profs.length} professeurs</p>
        </div>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Rechercher un professeur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
        />
      </div>

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

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length === 0 ? (
            <p className="text-[#64748B] text-sm">Aucun professeur trouvé.</p>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                    <GraduationCap size={22} className="text-[#2563EB]" />
                  </div>
                  <div>
                    <h2 className="text-[#1E293B] font-semibold text-base">{p.nom} {p.prenom}</h2>
                    <p className="text-[#64748B] text-xs">{p.groups?.length ?? 0} groupe(s)</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-[#64748B]">
                    <Mail size={13} /> {p.email || '—'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#64748B]">
                    <Phone size={13} /> {p.telephone || '—'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#64748B]">
                    <BookOpen size={13} />
                    {p.formations?.length > 0 ? p.formations.join(', ') : 'Aucune formation'}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {p.groups?.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => navigate(`/admin/profs/${p.id}/pointage?group_id=${g.id}&group_nom=${g.nom}&formation=${g.formation?.nom ?? ''}`)}
                      className="text-xs font-medium text-[#2563EB] border border-[#2563EB] px-3 py-1.5 rounded-lg hover:bg-[#EFF6FF] transition"
                    >
                      Pointage — {g.nom}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default Profs;