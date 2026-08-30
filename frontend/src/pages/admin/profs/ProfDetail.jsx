import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft, BookOpen, Users, Layers, Mail, Phone } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';
const STAT_COLORS = {
  blue:    { bg: 'bg-[#DCEBFA]', text: 'text-[#0369A1]' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-600'  },
};

const StatTile = ({ icon: Icon, label, value, color = 'blue' }) => {
  const c = STAT_COLORS[color] ?? STAT_COLORS.blue;
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-[#F1F5F9] px-4 py-3">
      <div className={`w-9 h-9 rounded-full ${c.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} className={c.text} />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
};

const ProfDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prof, setProf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

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

  const activeGroups = (prof?.groups ?? []).filter((g) => g.statut !== 'terminer');
  const groupsByFormation = (prof?.formations ?? []).reduce((acc, f) => {
    acc[f.id] = { formation: f, groups: [] };
    return acc;
  }, {});
  activeGroups.forEach((g) => {
    const key = g.formation?.id;
    if (!key) return;
    if (!groupsByFormation[key]) groupsByFormation[key] = { formation: g.formation, groups: [] };
    groupsByFormation[key].groups.push(g);
  });
  const formationCount = prof?.formations?.length ?? 0;
  const groupCount = activeGroups.length;
  const initials = `${prof?.prenom?.[0] ?? ''}${prof?.nom?.[0] ?? ''}`;

  const tabs = [
    { id: 'all', label: 'Tous', count: groupCount },
    ...Object.values(groupsByFormation).map(({ formation, groups }) => ({
      id: String(formation?.id ?? 'inconnue'),
      label: formation?.nom ?? 'Inconnue',
      count: groups.length,
    })),
  ];

  const visibleGroups = activeTab === 'all'
    ? prof?.groups ?? []
    : groupsByFormation[activeTab]?.groups ?? [];

  return (
    <AdminLayout>
           {/* Retour + Breadcrumb */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/admin/profs')}
          className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition flex-shrink-0">
          <ArrowLeft size={16} className="text-[#0369A1]" />
        </button>
        <div className="flex items-center gap-1.5 text-xs">
          <button onClick={() => navigate('/admin/profs')} className="text-slate-400 hover:text-[#0369A1] transition">
            Professeurs
          </button>
          <ChevronRight size={12} className="text-slate-300" />
          <span className="text-[#0369A1] font-medium">{prof ? `${prof.nom} ${prof.prenom}` : '...'}</span>
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

      {!loading && !error && prof && (
        <>
                   {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            {prof.photo_url ? (
              <img src={prof.photo_url} alt=""
                className="w-14 h-14 rounded-full object-cover flex-shrink-0 ring-2 ring-[#DCEBFA] shadow-sm" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#DCEBFA] flex items-center justify-center flex-shrink-0 ring-2 ring-[#DCEBFA]">
                <span className="text-lg font-bold text-[#0369A1]">{initials}</span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-800">{prof.nom} {prof.prenom}</h1>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                {prof.email && <span className="flex items-center gap-1"><Mail size={11} /> {prof.email}</span>}
                {prof.telephone && <span className="flex items-center gap-1"><Phone size={11} /> {prof.telephone}</span>}
              </div>
            </div>
          </div>

{/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <StatTile icon={Layers} label="Formations" value={formationCount} color="violet" />
            <StatTile icon={Users}  label="Groupes"    value={groupCount}     color="emerald" />
          </div>

          {/* Filtre */}
          {formationCount > 0 && (
            <div className="relative sm:w-56 mb-6">
              <BookOpen size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="appearance-none w-full pl-8 pr-8 py-2.5 rounded-full text-sm font-medium bg-white border border-[#F1F5F9] text-[#0369A1] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
              >
                {tabs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.count})
                  </option>
                ))}
              </select>
              <ChevronRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#0369A1] pointer-events-none" />
            </div>
          )}

          {formationCount === 0 ? (
            <p className="text-slate-400 text-sm">Aucune formation assignée.</p>
          ) : (
            <>

              {/* Cards */}
              {visibleGroups.length === 0 ? (
                <p className="text-slate-400 text-sm">Aucun groupe dans cet onglet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleGroups.map((g, i) => (
                    <div
                      key={g.id}
                      onClick={() => navigate(`/admin/formations/${g.formation?.id ?? activeTab}/groups/${g.id}`)}
                      className="relative bg-white rounded-2xl border border-[#F1F5F9] p-4 shadow-sm hover:shadow-md hover:border-[#DCEBFA] transition cursor-pointer"
                    >
                      <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-[#0369A1] text-white text-[11px] font-bold flex items-center justify-center shadow">
                        {i + 1}
                      </span>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-emerald-500" />
                          <span className="font-medium text-sm text-slate-800">{g.nom}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {activeTab === 'all' && g.formation?.nom && (
                            <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
                              {g.formation.nom}
                            </span>
                          )}
                          {g.niveau?.nom && (
                            <span className="text-[10px] bg-[#DCEBFA] text-[#0369A1] px-2 py-0.5 rounded-full">
                              {g.niveau.nom}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                       <p className="text-xs text-slate-400">{g.nb_etudiants ?? 0} étudiant(s)</p>
                        <ChevronRight size={14} className="text-slate-300" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </AdminLayout>
  );
};

export default ProfDetail;