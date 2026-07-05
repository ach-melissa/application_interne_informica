import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, GraduationCap } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const ProfFormations = () => {
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
      .then(setGroups)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Regroupe les groupes par formation
  const byFormation = groups.reduce((acc, g) => {
    const key = g.formation_id ?? g.formations?.id ?? 'inconnue';
    if (!acc[key]) acc[key] = { formation: g.formations, groupes: [] };
    acc[key].groupes.push(g);
    return acc;
  }, {});
  const formations = Object.entries(byFormation);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Mes formations</h1>
          <p className="text-slate-400 text-xs mt-0.5">{formations.length} formation(s)</p>
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
        formations.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucune formation assignée.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {formations.map(([formationId, { formation, groupes }]) => {
              const nbEtudiants = groupes.reduce((sum, g) => sum + (g.nb_etudiants ?? 0), 0);
              return (
                <div
                  key={formationId}
                  onClick={() => navigate(`/prof/formations/${formationId}/groups`)}
                  className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] cursor-pointer transition"
                >
                  <div className="w-10 h-10 bg-[#DCEBFA] rounded-full flex items-center justify-center mb-4">
                    <BookOpen size={20} className="text-[#0369A1]" />
                  </div>
                  <h2 className="text-slate-800 font-semibold text-base mb-3">{formation?.nom ?? 'Formation'}</h2>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Users size={13} className="text-[#0369A1]" /> {groupes.length} groupe(s)</span>
                    <span className="flex items-center gap-1"><GraduationCap size={13} className="text-[#0369A1]" /> {nbEtudiants} étudiant(s)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </>
  );
};

export default ProfFormations;