import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, Users, UserCheck, ChevronRight, Search } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const ProfFormationNiveaux = () => {
  const { formationId } = useParams();
  const navigate = useNavigate();
  const [formation, setFormation] = useState(null);
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/formations/${formationId}`, { headers: headers() }).then((r) => {
        if (!r.ok) throw new Error('Erreur serveur');
        return r.json();
      }),
      fetch(`${API}/api/groups/me`, { headers: headers() }).then((r) => {
        if (!r.ok) throw new Error('Erreur serveur');
        return r.json();
      }),
    ])
      .then(([formationData, groupsData]) => {
        setFormation(formationData);
        setMyGroups(groupsData.filter((g) => String(g.formation_id ?? g.formations?.id) === String(formationId)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [formationId]);

  // Recompute niveaux counts from the prof's own groups only, ignoring the
  // school-wide counts returned by /api/formations/:id (those include every teacher).
  const niveauxWithMyCounts = (formation?.niveaux ?? []).map((n) => {
    const mine = myGroups.filter((g) => String(g.niveau_id ?? g.niveau?.id) === String(n.id));
    const nb_etudiants = mine.reduce((sum, g) => sum + (g.nb_etudiants ?? 0), 0);
    return { ...n, nb_groupes: mine.length, nb_etudiants };
  });

  const filteredNiveaux = niveauxWithMyCounts.filter((n) =>
    n.nom.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate('/prof/formations')}
          className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition flex-shrink-0"
        >
          <ArrowLeft size={16} className="text-[#0369A1]" />
        </button>
        <div className="flex items-center gap-1.5 text-xs">
          <button onClick={() => navigate('/prof/formations')} className="text-slate-400 hover:text-[#0369A1] transition">
            Formations
          </button>
          <span className="text-slate-300">›</span>
          <span className="text-[#0369A1] font-medium">Niveaux • {formation?.nom}</span>
        </div>
      </div>
      <p className="mb-4 text-xs text-slate-400 ml-12">{filteredNiveaux.length} / {niveauxWithMyCounts.length} niveau(x)</p>

      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <div className="relative min-w-[160px] flex-1 max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input
            placeholder="Rechercher un niveau..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
          />
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
        filteredNiveaux.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucun niveau trouvé.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredNiveaux.map((n) => (
              <div
                key={n.id}
                onClick={() => navigate(`/prof/formations/${formationId}/groups?niveau_id=${n.id}`)}
                className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] cursor-pointer transition"
              >
                <div className="w-10 h-10 bg-[#DCEBFA] rounded-full flex items-center justify-center mb-3">
                  <Layers size={18} className="text-[#0369A1]" />
                </div>
                <h2 className="text-slate-800 font-semibold mb-3">{n.nom}</h2>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Users size={13} className="text-[#0369A1]" /> {n.nb_groupes ?? 0} groupe(s)</span>
                  <span className="flex items-center gap-1"><UserCheck size={13} className="text-[#0369A1]" /> {n.nb_etudiants ?? 0} étudiant(s)</span>
                </div>
                <div className="flex justify-end mt-4">
                  <ChevronRight size={16} className="text-[#0369A1]" />
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </>
  );
};

export default ProfFormationNiveaux;