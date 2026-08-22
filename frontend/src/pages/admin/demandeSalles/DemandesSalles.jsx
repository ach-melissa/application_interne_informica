import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Search, X, CalendarDays,
  UserCircle, Clock, CheckCircle2, XCircle, ChevronDown,
} from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';

const STAT_COLORS = {
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600'   },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  red:     { bg: 'bg-red-50',     text: 'text-red-500'     },
  blue:    { bg: 'bg-[#DCEBFA]',  text: 'text-[#0369A1]'   },
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

const FilterSelect = ({ icon: Icon, label, value, onChange, opts, display }) => (
  <div className="relative flex items-center">
    {Icon && <Icon size={13} className="absolute left-2 text-[#0369A1] pointer-events-none" />}
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={`appearance-none text-xs rounded-full py-1.5 pr-7 pl-7 bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer transition
        ${value ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}
    >
      <option value="">{label}</option>
      {opts.map(o => <option key={o} value={o}>{display ? display(o) : o}</option>)}
    </select>
    {value ? (
      <button onClick={() => onChange('')} className="absolute right-2 text-slate-300 hover:text-red-400"><X size={11} /></button>
    ) : (
      <ChevronDown size={11} className="absolute right-2 text-slate-400 pointer-events-none" />
    )}
  </div>
);

const statusMeta = {
  en_attente: { label: 'En attente', cls: 'bg-amber-50 text-amber-600' },
  approuvee:  { label: 'Approuvée',  cls: 'bg-emerald-50 text-emerald-600' },
  refusee:    { label: 'Refusée',    cls: 'bg-red-50 text-red-500' },
  proposee:   { label: 'Proposée',   cls: 'bg-[#DCEBFA] text-[#0369A1]' },
};
const STATUT_OPTS = ['en_attente', 'approuvee', 'refusee', 'proposee'];

const COLS = [
  { label: 'Demandeur', Icon: UserCircle,   width: 220 },
  { label: 'Date cible', Icon: CalendarDays, width: 130 },
  { label: 'Créée le',   Icon: CalendarDays, width: 130 },
  { label: 'Statut',     Icon: CheckCircle2, width: 130 },
];

const DemandesSalles = () => {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState([]);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    fetch(`${import.meta.env.VITE_API_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setDemandes(data.filter(n => n.type === 'demande_salle')))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => demandes.filter(d => {
    const name = d.titre?.replace('Demande de salle - ', '').toLowerCase() || '';
    if (search && !name.includes(search.toLowerCase())) return false;
    if (statut && d.statut !== statut) return false;

    const created = new Date(d.created_at);
    if (dateFrom && created < new Date(dateFrom)) return false;

    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (created > end) return false;
    }

    return true;
  }), [demandes, search, statut, dateFrom, dateTo]);

  const counts = {
    attente: demandes.filter(d => d.statut === 'en_attente').length,
    approuvee: demandes.filter(d => d.statut === 'approuvee').length,
    refusee: demandes.filter(d => d.statut === 'refusee').length,
    proposee: demandes.filter(d => d.statut === 'proposee').length,
  };

  const activeCount = (search ? 1 : 0) + (statut ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);
  const clearAll = () => { setSearch(''); setStatut(''); setDateFrom(''); setDateTo(''); };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
            <ClipboardList size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Demandes de salles</h1>
            <p className="text-slate-400 text-xs mt-0.5">{filtered.length} / {demandes.length} demandes</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatTile icon={Clock}        label="En attente"  value={counts.attente}   color="amber" />
        <StatTile icon={CheckCircle2} label="Approuvées"  value={counts.approuvee} color="emerald" />
        <StatTile icon={XCircle}      label="Refusées"    value={counts.refusee}   color="red" />
        <StatTile icon={ClipboardList} label="Proposées"  value={counts.proposee}  color="blue" />
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative min-w-[160px] flex-1 max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input placeholder="Rechercher une demande…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
        </div>

        <div className="w-px h-5 bg-[#E2E8F0]" />

        <FilterSelect icon={CheckCircle2} label="Statut" value={statut} onChange={setStatut} opts={STATUT_OPTS} display={o => statusMeta[o]?.label ?? o} />

        <div className="w-px h-5 bg-[#E2E8F0]" />

        <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 border border-[#E2E8F0]">
          <CalendarDays size={12} className="text-[#0369A1] flex-shrink-0" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className={`text-xs bg-transparent focus:outline-none transition ${dateFrom ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
          <span className="text-[#0369A1]/40 text-[10px] font-bold px-0.5">–</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className={`text-xs bg-transparent focus:outline-none transition ${dateTo ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
        </div>

        {activeCount > 0 && (
          <button onClick={clearAll} className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
            <X size={11} /> Tout effacer
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#0F2A4A] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table style={{ tableLayout: 'fixed', width: '100%' }} className="text-xs">
              <colgroup>
                {COLS.map(c => <col key={c.label} style={{ width: `${c.width}px` }} />)}
              </colgroup>
              <thead className="bg-[#0F2A4A]">
                <tr>
                  {COLS.map(({ label, Icon }, i) => (
                    <th key={label} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] overflow-hidden ${i === 0 ? 'border-l border-[#0F2A4A]' : ''}`}>
                      <div className="flex items-center gap-1">
                        {Icon && <Icon size={11} className="text-white/70 flex-shrink-0" />}
                        <span className="truncate">{label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={COLS.length} className="text-center py-10 text-slate-400 bg-white">Aucune demande trouvée.</td></tr>
                ) : filtered.map((d, idx) => {
                  const name = d.titre?.replace('Demande de salle - ', '') || '—';
                  const initials = name !== '—' ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';
                  const s = statusMeta[d.statut];
                  return (
                    <tr key={d.id} onClick={() => navigate(`/admin/demandes-salles/${d.id}`)}
                      className={`hover:bg-slate-50 transition cursor-pointer ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                      <td className="px-3 py-2 overflow-hidden border-b border-l border-slate-100">
                        <div className="flex items-center gap-2 min-w-0">
                          {d.expediteur?.photo_url ? (
                            <img src={d.expediteur.photo_url} alt=""
                              className="w-7 h-7 rounded-full object-cover flex-shrink-0 shadow-sm" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                              {initials}
                            </div>
                          )}
                          <span className="font-medium text-slate-700 truncate">{name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-400 truncate border-b border-slate-100">
                        {d.data?.date_cible ? new Date(d.data.date_cible).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400 truncate border-b border-slate-100">
                        {new Date(d.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-2 py-2 overflow-hidden border-b border-slate-100">
                        <span className={`inline-block text-[11px] font-medium px-2.5 py-1 rounded-full ${s?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                          {s?.label ?? 'En attente'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default DemandesSalles;