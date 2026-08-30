import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Users, GraduationCap, Flag } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const ProfGroups = () => {
  const { formationId } = useParams();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API}/api/profs/me/groups`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('Erreur serveur');
        return r.json();
      })
      .then((data) => setGroups(data.filter((g) => String(g.formation_id ?? g.formations?.id) === String(formationId))))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [formationId]);

  const formationName = groups[0]?.formations?.nom ?? 'Formation';

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs mb-3">
        <button onClick={() => navigate('/prof/formations')} className="text-slate-400 hover:text-[#0369A1] hover:underline transition">
          Formations
        </button>
        <ChevronRight size={12} className="text-slate-300" />
        <span className="text-[#0369A1] font-medium">{formationName}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/prof/formations')}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-[#F1F5F9] hover:bg-[#DCEBFA] transition"
        >
          <ArrowLeft size={16} className="text-[#0369A1]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{formationName}</h1>
          <p className="text-slate-400 text-xs mt-0.5">{groups.length} groupe(s)</p>
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

      {!loading && !error && (
        groups.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucun groupe pour cette formation.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((g) => (
              <div
                key={g.id}
                onClick={() => navigate(`/prof/formations/${formationId}/groups/${g.id}`)}
                className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] cursor-pointer transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                    <Users size={20} className="text-emerald-600" />
                  </div>
                  {g.statut === 'terminer' && (
                    <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-white">
                      <Flag size={11} /> Terminé
                    </span>
                  )}
                </div>
                <h2 className="text-slate-800 font-semibold text-base mb-3">{g.nom}</h2>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <GraduationCap size={13} className="text-[#0369A1]" /> {g.nb_etudiants ?? 0} étudiant(s)
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] px-3 py-1.5 rounded-full">
                    Voir détails <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </>
  );
};

export default ProfGroups;