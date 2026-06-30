import { useState, useEffect } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import AddUserModal from './AddUserModal';
import UserDetailsModal from './UserDetailsModal';
import { Plus, Search, Shield, X, CheckCircle2, CalendarDays } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const ROLES = ['admin','prof','comptable','etudiant'];
const roleMeta = {
  admin:     { cls: 'bg-blue-100 text-blue-700',       label: 'Admin' },
  prof:      { cls: 'bg-emerald-100 text-emerald-700', label: 'Prof' },
  comptable: { cls: 'bg-violet-100 text-violet-700',   label: 'Comptable' },
  etudiant:  { cls: 'bg-orange-100 text-orange-700',   label: 'Étudiant' },
};
const statutMeta = {
  active:   { cls: 'bg-emerald-100 text-emerald-700', label: 'Actif' },
  inactive: { cls: 'bg-slate-100 text-slate-500',     label: 'Inactif' },
  archived: { cls: 'bg-red-100 text-red-500',         label: 'Archivé' },
};

const Avatar = ({ user, size = 7 }) => {
  const s = `w-${size} h-${size}`;
  return user.photo_url
    ? <img src={user.photo_url} alt="" className={`${s} rounded-full object-cover flex-shrink-0`} />
    : <div className={`${s} rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0`}>
        {user.prenom?.[0]}{user.nom?.[0]}
      </div>;
};

const COLS = [
  { label: 'Utilisateur',     width: 180 },
  { label: 'Email',           width: 170 },
  { label: 'Téléphone',       width: 110 },
  { label: 'Date naissance',  width: 110 },
  { label: 'Rôle',            width: 95  },
  { label: 'Statut',          width: 85  },
  { label: 'Créé le',         width: 85  },
];

const Utilisateurs = () => {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRole]     = useState('');
  const [statutFilter, setStatut] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchUsers = () => {
    const h = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    fetch(`${API}/api/users`, { headers: h })
      .then(r => r.json()).then(setUsers).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(fetchUsers, []);

  const filtered = users.filter(u => {
    const txt = `${u.nom} ${u.prenom} ${u.email}`.toLowerCase();
    if (search       && !txt.includes(search.toLowerCase())) return false;
    if (roleFilter   && u.role   !== roleFilter)             return false;
    if (statutFilter && (u.archived ? 'archived' : u.statut ?? 'active') !== statutFilter) return false;
    if (dateFrom && u.created_at && new Date(u.created_at) < new Date(dateFrom)) return false;
    if (dateTo   && u.created_at && new Date(u.created_at) > new Date(dateTo))   return false;
    return true;
  });

  const activeCount = (search ? 1 : 0) + (roleFilter ? 1 : 0) + (statutFilter ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);
  const clearAll = () => { setSearch(''); setRole(''); setStatut(''); setDateFrom(''); setDateTo(''); };

  const FilterSel = ({ icon: Icon, label, value, onChange, opts, display }) => (
    <div className="relative flex items-center">
      {Icon && <Icon size={13} className="absolute left-2 text-blue-400 pointer-events-none" />}
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`text-xs border rounded-lg py-1.5 pr-6 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer transition
          ${value ? 'border-blue-400 text-blue-700 font-medium' : 'border-blue-200 text-slate-500'} pl-7`}>
        <option value="">{label}</option>
        {opts.map(o => <option key={o} value={o}>{display ? display(o) : o}</option>)}
      </select>
      {value && (
        <button onClick={() => onChange('')} className="absolute right-1.5 text-slate-300 hover:text-red-400"><X size={10} /></button>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Utilisateurs</h1>
          <p className="text-slate-400 text-xs mt-0.5">{filtered.length} / {users.length} utilisateurs</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition">
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-blue-100 rounded-xl px-3 py-2.5 mb-4 flex flex-wrap gap-2 items-center shadow-sm">
        <div className="relative min-w-[160px] flex-1 max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
          <input placeholder="Nom, email…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-blue-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
        </div>
        <div className="w-px h-5 bg-blue-100" />
        <FilterSel icon={Shield}       label="Rôle"   value={roleFilter}   onChange={setRole}   opts={ROLES}                          display={o => roleMeta[o]?.label ?? o} />
        <FilterSel icon={CheckCircle2} label="Statut" value={statutFilter} onChange={setStatut} opts={['active','inactive','archived']} display={o => statutMeta[o]?.label ?? o} />

        <div className="w-px h-5 bg-blue-100" />

        <div className="flex items-center gap-1.5 bg-blue-50/60 border border-blue-200 rounded-lg px-2 py-1">
          <CalendarDays size={12} className="text-blue-400 flex-shrink-0" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className={`text-xs bg-transparent focus:outline-none transition ${dateFrom ? 'text-blue-700 font-medium' : 'text-slate-400'}`} />
          <span className="text-blue-300 text-[10px] font-bold px-0.5">–</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className={`text-xs bg-transparent focus:outline-none transition ${dateTo ? 'text-blue-700 font-medium' : 'text-slate-400'}`} />
        </div>
        {activeCount > 0 && (
          <button onClick={clearAll} className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
            <X size={11} /> Tout effacer
          </button>
        )}
      </div>

      {loading && <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
      {error   && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

{!loading && !error && (
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table style={{ tableLayout: 'fixed', width: '100%' }} className="text-xs">
              <colgroup>
                {COLS.map(c => <col key={c.label} style={{ width: `${c.width}px` }} />)}
              </colgroup>
              <thead className="bg-blue-50 border-b border-blue-100">
                <tr>
                  {COLS.map(({ label }) => (
                    <th key={label} className="text-left px-3 py-2.5 text-blue-500 font-semibold text-[10px] tracking-wide uppercase">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Aucun utilisateur trouvé.</td></tr>
                ) : filtered.map(u => {
                  const statut = u.archived ? 'archived' : (u.statut ?? 'active');
                  return (
                    <tr key={u.id} onClick={() => setSelected(u)} className="hover:bg-blue-50/40 transition cursor-pointer">
                      <td className="px-3 py-2 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar user={u} size={7} />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-700 truncate">{u.prenom} {u.nom}</p>
                            <p className="text-[10px] text-slate-400 truncate">@{u.nom_utilisateur}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-500 truncate">{u.email}</td>
                      <td className="px-3 py-2 text-slate-500 truncate">{u.telephone || '—'}</td>
                      <td className="px-3 py-2 text-slate-400 truncate">
                        {u.date_naissance ? new Date(u.date_naissance).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-3 py-2 overflow-hidden">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${roleMeta[u.role]?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                          {roleMeta[u.role]?.label ?? u.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 overflow-hidden">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statutMeta[statut]?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                          {statutMeta[statut]?.label ?? statut}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-400 truncate">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd  && <AddUserModal     onClose={() => setShowAdd(false)} onSuccess={fetchUsers} />}
      {selected && <UserDetailsModal user={selected} onClose={() => setSelected(null)} onSuccess={() => { fetchUsers(); setSelected(null); }} />}
    </AdminLayout>
  );
};

export default Utilisateurs;