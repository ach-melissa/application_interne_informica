import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, GraduationCap, Mail, Phone, BookOpen, Users, Layers } from 'lucide-react';
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

  const totalGroupes = profs.reduce((sum, p) => sum + (p.groups?.length ?? 0), 0);
  const totalFormations = new Set(profs.flatMap(p => p.formations ?? [])).size;

  return (
    <AdminLayout>
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
    <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
      <GraduationCap size={22} className="text-white" />
    </div>
    <div>
      <h1 className="text-xl font-bold text-slate-800">Professeurs</h1>
      <p className="text-slate-400 text-xs mt-0.5">{filtered.length} / {profs.length} professeurs</p>
    </div>
  </div>
</div>

      {/* Stats strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatTile icon={GraduationCap} label="Professeurs" value={profs.length} color="blue" />
        <StatTile icon={Users}         label="Groupes assignés" value={totalGroupes} color="emerald" />
        <StatTile icon={Layers}        label="Formations couvertes" value={totalFormations} color="violet" />
      </div>

      <div className="relative mb-6 max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher un professeur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
        />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucun professeur trouvé.</p>
          ) : (
            filtered.map((p) => {
              const initials = `${p.prenom?.[0] ?? ''}${p.nom?.[0] ?? ''}`;
              const groupCount = p.groups?.length ?? 0;
              const formations = p.formations ?? [];

              return (
                <div key={p.id} onClick={() => navigate(`/admin/profs/${p.id}`)}
                  className="group bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] transition cursor-pointer">

                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-[#DCEBFA] flex items-center justify-center flex-shrink-0 ring-2 ring-[#DCEBFA] group-hover:ring-[#0369A1]/30 transition">
                        <span className="text-sm font-bold text-[#0369A1]">{initials || <GraduationCap size={18} />}</span>
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-slate-800 font-semibold text-sm truncate">{p.nom} {p.prenom}</h2>
                        <p className="text-[11px] text-slate-400">Professeur</p>
                      </div>
                    </div>
                    {p.archived !== undefined && (
                      <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        p.archived ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {p.archived ? 'Inactif' : 'Actif'}
                      </span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[#F1F5F9]">
                    <div className="flex items-center gap-1.5">
                      <Users size={13} className="text-[#0369A1]" />
                      <span className="text-xs font-semibold text-slate-700">{groupCount}</span>
                      <span className="text-[11px] text-slate-400">groupe{groupCount > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen size={13} className="text-[#0369A1]" />
                      <span className="text-xs font-semibold text-slate-700">{formations.length}</span>
                      <span className="text-[11px] text-slate-400">formation{formations.length > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Formation badges */}
                  <div className="flex flex-wrap gap-1.5 mb-4 min-h-[22px]">
                    {formations.length > 0 ? (
                      formations.map((f, i) => (
                        <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#DCEBFA] text-[#0369A1]">
                          {f}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-400">Aucune formation</span>
                    )}
                  </div>

                  {/* Contact */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Mail size={12} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{p.email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Phone size={12} className="text-slate-400 flex-shrink-0" />
                      {p.telephone || '—'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default Profs;