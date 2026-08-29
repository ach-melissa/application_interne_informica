import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, GraduationCap, Search, Flag, ChevronRight } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const ProfGroups = () => {
  const { formationId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const niveauId = searchParams.get('niveau_id');

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API}/api/groups/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('Erreur serveur');
        return r.json();
      })
      .then((data) => {
        let filtered = data.filter((g) => String(g.formation_id ?? g.formations?.id) === String(formationId));
        if (niveauId) filtered = filtered.filter((g) => String(g.niveau?.id) === String(niveauId));
        setGroups(filtered);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [formationId, niveauId]);

  const formationName = groups[0]?.formations?.nom ?? 'Formation';
  const niveauName = groups[0]?.niveau?.nom;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Algiers' });

  const filteredGroups = groups.filter((g) => g.nom.toLowerCase().includes(search.toLowerCase()));
  const backTo = niveauId ? `/prof/formations/${formationId}/niveaux` : '/prof/formations';

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate(backTo)}
          className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition flex-shrink-0"
        >
          <ArrowLeft size={16} className="text-[#0369A1]" />
        </button>
        <div className="flex items-center gap-1.5 text-xs">
          <button onClick={() => navigate('/prof/formations')} className="text-slate-400 hover:text-[#0369A1] transition">
            Formations
          </button>
          {niveauId && (
            <>
              <span className="text-slate-300">›</span>
              <button onClick={() => navigate(`/prof/formations/${formationId}/niveaux`)} className="text-slate-400 hover:text-[#0369A1] transition">
                Niveaux • {formationName}
              </button>
            </>
          )}
          <span className="text-slate-300">›</span>
          <span className="text-[#0369A1] font-medium">Groupes • {niveauId ? niveauName : formationName}</span>
        </div>
      </div>
      <p className="mb-4 text-xs text-slate-400 ml-12">{filteredGroups.length} / {groups.length} groupe(s)</p>

      {/* Search bar */}
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <div className="relative min-w-[160px] flex-1 max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input
            placeholder="Rechercher un groupe..."
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
        filteredGroups.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucun groupe trouvé.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGroups.map((g) => (
              <div
                key={g.id}
                onClick={() => navigate(`/prof/formations/${formationId}/groups/${g.id}`)}
                className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] cursor-pointer transition flex flex-col h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                    <Users size={20} className="text-emerald-600" />
                  </div>
                  {g.date_fin && g.date_fin <= today && (
                    <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-white">
                      <Flag size={11} /> Terminé
                    </span>
                  )}
                </div>

                <h2 className="text-slate-800 font-semibold text-base mb-1">{g.nom}</h2>
                {g.niveau?.nom && (
                  <p className="text-slate-400 text-xs mb-3">{g.niveau.nom}</p>
                )}

                <div className="flex items-center justify-between mt-auto">
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