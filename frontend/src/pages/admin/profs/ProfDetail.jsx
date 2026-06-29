import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, BookOpen, Users } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';

const ProfDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prof, setProf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProf = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profs`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erreur serveur');
        const data = await res.json();
        const found = data.find((p) => String(p.id) === String(id));
        if (!found) throw new Error('Professeur introuvable');
        setProf(found);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProf();
  }, [id]);

  // group g.groups by formation
  const groupsByFormation = (prof?.groups ?? []).reduce((acc, g) => {
    const key = g.formation?.id ?? 'inconnue';
    if (!acc[key]) acc[key] = { formation: g.formation, groups: [] };
    acc[key].groups.push(g);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/profs')}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] hover:bg-gray-100 transition">
          <ArrowLeft size={16} className="text-[#64748B]" />
        </button>
        {prof && (
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">{prof.nom} {prof.prenom}</h1>
            <p className="text-[#64748B] text-sm mt-0.5">{Object.keys(groupsByFormation).length} formation(s)</p>
          </div>
        )}
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

      {!loading && !error && prof && (
        <>

          {Object.values(groupsByFormation).length === 0 ? (
            <p className="text-[#64748B] text-sm">Aucune formation assignée.</p>
          ) : (
            Object.values(groupsByFormation).map(({ formation, groups }) => (
              <div key={formation?.id ?? formation?.nom} className="mb-6">
                <h2 className="flex items-center gap-2 text-[#1E293B] font-semibold text-sm mb-3">
                  <BookOpen size={15} className="text-[#2563EB]" /> {formation?.nom ?? 'Formation inconnue'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups.map((g) => (
                    <div key={g.id}
                      onClick={() => navigate(`/admin/formations/${formation?.id}/groups/${g.id}`)}
                      className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm hover:shadow-md transition cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <Users size={14} className="text-[#F97316]" />
                        <span className="font-medium text-sm text-[#1E293B]">{g.nom}</span>
                      </div>
                      <p className="text-xs text-[#64748B]">{g.inscriptions_count ?? '—'} étudiant(s)</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </AdminLayout>
  );
};

export default ProfDetail;