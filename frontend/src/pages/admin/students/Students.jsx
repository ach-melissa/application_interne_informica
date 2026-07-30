import { useState, useEffect } from 'react';
import {
  Search, Plus, X, CheckCircle2, Phone, PhoneCall, Users,
  Radio, UserCheck, CalendarDays, Megaphone, MapPin,
} from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';
import AddEtudiantModal from './AddEtudiantModal';
import EtudiantDetailModal from './EtudiantDetailModal';

const API = import.meta.env.VITE_API_URL;

const TRY_OPTS        = ['repondu','non_repondu','occupe','injoignable','P_bureau','ferme'];
const SOURCE_OPTS     = ['Amis/Famille','Instagram','TikTok','Facebook','Recherche Google','Site Web','Bouche-à-oreille','Publicité','Autre'];
const REGISTERED_OPTS = ['hanane','yasmine','page_facebook','amira'];
const STATUT_OPTS     = ['pending','confirmed','non_confirmed','rejected'];

const statutMeta = {
  confirmed:     { label: 'Confirmé',     cls: 'bg-[#DCEBFA] text-[#0369A1]' },
  pending:       { label: 'En attente',   cls: 'bg-amber-50 text-amber-700' },
  non_confirmed: { label: 'Non confirmé', cls: 'bg-red-50 text-red-500' },
  rejected:      { label: 'Rejeté',       cls: 'bg-slate-100 text-slate-500' },
};

const tryMeta = {
  repondu:     'bg-emerald-50 text-emerald-700',
  non_repondu: 'bg-red-50 text-red-500',
  occupe:      'bg-orange-50 text-orange-600',
  injoignable: 'bg-slate-100 text-slate-500',
  P_bureau:    'bg-[#DCEBFA] text-[#0369A1]',
  ferme:       'bg-violet-50 text-violet-700',
};

const TrySelect = ({ value, onChange, disabled }) => (
  <select
    value={value ?? ''}
    onChange={e => onChange(e.target.value || null)}
    onClick={e => e.stopPropagation()}
    disabled={disabled}
    className={`text-[11px] font-medium px-2 py-0.5 rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-[#0369A1]/40 w-full
      ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      ${tryMeta[value] ?? 'bg-slate-100 text-slate-400'}`}
  >
    <option value="">— aucun —</option>
    {TRY_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

const FilterSelect = ({ icon: Icon, label, value, onChange, opts, display }) => (
  <div className="relative flex items-center">
    {Icon && <Icon size={13} className="absolute left-2 text-[#0369A1] pointer-events-none" />}
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={`text-xs rounded-full py-1.5 pr-6 pl-7 bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer transition
        ${value ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}
    >
      <option value="">{label}</option>
      {opts.map(o => <option key={o} value={o}>{display ? display(o) : o}</option>)}
    </select>
    {value && (
      <button onClick={() => onChange('')} className="absolute right-1.5 text-slate-300 hover:text-red-400 transition">
        <X size={10} />
      </button>
    )}
  </div>
);

const Students = () => {
const [etudiants, setEtudiants]   = useState([]);
const [formations, setFormations] = useState([]);
const [wilayas, setWilayas]       = useState([]);
  const [search, setSearch]         = useState('');
  const [filters, setFilters]       = useState({});
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [selected, setSelected]     = useState(null);

useEffect(() => {
  const h = { Authorization: `Bearer ${localStorage.getItem('token')}` };
  Promise.all([
    fetch(`${API}/api/etudiants`,  { headers: h }).then(r => r.json()),
    fetch(`${API}/api/formations`, { headers: h }).then(r => r.json()),
    fetch(`${API}/api/enums`,      { headers: h }).then(r => r.json()),
  ])
    .then(([e, f, en]) => { setEtudiants(e); setFormations(f); setWilayas(en.wilaya || []); })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
}, []);

  const refetch = () => {
    const h = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    fetch(`${API}/api/etudiants`, { headers: h }).then(r => r.json()).then(setEtudiants);
  };

  const updateField = async (id, field, value) => {
    setEtudiants(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    await fetch(`${API}/api/etudiants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ [field]: value }),
    }).catch(console.error);
  };

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v || undefined }));

  const filtered = etudiants.filter(i => {
    const name = `${i.etudiant?.nom} ${i.etudiant?.prenom}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase()) && !i.etudiant?.telephone?.includes(search)) return false;
    if (filters.statut        && i.statut           !== filters.statut)         return false;
    if (filters.source        && i.source           !== filters.source)         return false;
    if (filters.registered_by && i.registered_by    !== filters.registered_by)  return false;
    if (filters.formation     && i.formation?.nom   !== filters.formation)      return false;
if (filters.wilaya        && i.etudiant?.wilaya !== filters.wilaya)         return false;
    if (dateFrom && i.date_inscription && new Date(i.date_inscription) < new Date(dateFrom)) return false;
    if (dateTo   && i.date_inscription && new Date(i.date_inscription) > new Date(dateTo))   return false;
    return true;
  });

  const activeCount = Object.values(filters).filter(Boolean).length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);
  const clearAll = () => { setFilters({}); setDateFrom(''); setDateTo(''); setSearch(''); };

  const COLS = [
  { label: 'Étudiant',    Icon: null,        width: 130 },
  { label: 'Tél.',        Icon: Phone,       width: 80  },
  { label: 'Wilaya',      Icon: MapPin,      width: 110 },
  { label: 'Formation',   Icon: Users,       width: 140 },
  { label: 'Date',        Icon: CalendarDays,width: 75  },
  { label: '1er appel',   Icon: PhoneCall,   width: 90  },
  { label: '2ème appel',  Icon: PhoneCall,   width: 90  },
  { label: '3ème appel',  Icon: PhoneCall,   width: 90  },
  { label: 'Source',      Icon: Megaphone,   width: 100 },
  { label: 'Rapporteur',  Icon: UserCheck,   width: 80  },
  { label: 'Ajouté par',  Icon: UserCheck,   width: 90  },
  { label: 'Statut',      Icon: CheckCircle2,width: 96  },
];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Étudiants</h1>
          <p className="text-slate-400 text-xs mt-0.5">{filtered.length} / {etudiants.length} inscriptions</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-lg text-xs font-medium
            shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all">
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative min-w-[160px] flex-1 max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input placeholder="Nom, téléphone…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
        </div>

        <div className="w-px h-5 bg-[#E2E8F0]" />

        <FilterSelect icon={CheckCircle2} label="Statut"         value={filters.statut || ''}        onChange={v => setFilter('statut', v)}        opts={STATUT_OPTS}               display={o => statutMeta[o]?.label ?? o} />
        <FilterSelect icon={Radio}        label="Source"          value={filters.source || ''}        onChange={v => setFilter('source', v)}        opts={SOURCE_OPTS} />
        <FilterSelect icon={UserCheck}    label="Enregistré par"  value={filters.registered_by || ''} onChange={v => setFilter('registered_by', v)} opts={REGISTERED_OPTS} />
     <FilterSelect icon={Users}   label="Formation" value={filters.formation || ''} onChange={v => setFilter('formation', v)} opts={formations.map(f => f.nom)} />
<FilterSelect icon={MapPin}  label="Wilaya"    value={filters.wilaya || ''}    onChange={v => setFilter('wilaya', v)}    opts={wilayas} />
        <div className="w-px h-5 bg-[#E2E8F0]" />

        <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 border border-[#E2E8F0]">
          <CalendarDays size={12} className="text-[#0369A1] flex-shrink-0" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className={`text-xs bg-transparent focus:outline-none transition ${dateFrom ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
          <span className="text-[#0369A1]/40 text-[10px] font-bold px-0.5">–</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className={`text-xs bg-transparent focus:outline-none transition ${dateTo ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
        </div>

        {(activeCount > 0 || search) && (
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
      {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">Erreur : {error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table style={{ tableLayout: 'fixed', width: '100%' }} className="text-xs">
              <colgroup>
                {COLS.map(c => <col key={c.label} style={{ width: `${c.width}px` }} />)}
              </colgroup>
              <thead className="bg-[#DCEBFA]">
                <tr>
                  {COLS.map(({ label, Icon }, i) => (
                    <th key={label} className={`text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] overflow-hidden ${i === 0 ? 'border-l border-[#E2E8F0]' : ''}`}>
                      <div className="flex items-center gap-1">
                        {Icon && <Icon size={11} className="text-[#0369A1] flex-shrink-0" />}
                        <span className="truncate">{label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-10 text-slate-400 bg-white">Aucun étudiant trouvé.</td></tr>
                ) : filtered.map((i, idx) => {
                  const sm = statutMeta[i.statut];
                  return (
                    <tr key={i.id} onClick={() => setSelected(i)}
                      className={`hover:bg-[#DCEBFA]/30 transition cursor-pointer ${idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}`}>
                      <td className="px-3 py-2 overflow-hidden border-b border-l border-[#E2E8F0]">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                            {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-700 truncate">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                        </div>
                      </td>
<td className="px-3 py-2 text-slate-500 truncate border-b border-[#E2E8F0]" onClick={e => e.stopPropagation()}>
                      {i.etudiant?.telephone ? (
                        <a href={`tel:${i.etudiant.telephone}`} className="hover:text-[#0369A1] hover:underline">{i.etudiant.telephone}</a>
                      ) : '—'}
                    </td>
<td className="px-3 py-2 text-slate-500 truncate border-b border-[#E2E8F0]">{i.etudiant?.wilaya ?? '—'}</td>
                      <td className="px-3 py-2 overflow-hidden border-b border-[#E2E8F0]">
                        {i.formation?.nom
                          ? <span className="bg-[#DCEBFA] text-[#0369A1] px-2 py-0.5 rounded-full text-[11px] font-medium truncate block max-w-full">{i.formation.nom}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-400 truncate border-b border-[#E2E8F0]">
                        {i.date_inscription ? new Date(i.date_inscription).toLocaleDateString('fr-FR') : '—'}
                      </td>

                      {[
                        { f: 'first_try',  disabled: false },
                        { f: 'second_try', disabled: !i.first_try },
                        { f: 'third_try',  disabled: !i.second_try },
                      ].map(({ f, disabled }) => (
                        <td key={f} className="px-2 py-2 overflow-hidden border-b border-[#E2E8F0]">
                          <TrySelect value={i[f]} onChange={val => updateField(i.id, f, val)} disabled={disabled} />
                        </td>
                      ))}

                      <td className="px-2 py-2 overflow-hidden border-b border-[#E2E8F0]" onClick={e => e.stopPropagation()}>
                        <select
                          value={i.source ?? ''}
                          onChange={e => updateField(i.id, 'source', e.target.value || null)}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none w-full bg-slate-100 text-slate-500"
                        >
                          <option value="">— aucun —</option>
                          {SOURCE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2 overflow-hidden border-b border-[#E2E8F0]" onClick={e => e.stopPropagation()}>
  <select
    value={i.registered_by ?? ''}
    onChange={e => updateField(i.id, 'registered_by', e.target.value || null)}
    className="text-[11px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none w-full bg-slate-100 text-slate-500"
  >
    <option value="">— aucun —</option>
    {REGISTERED_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
</td>
<td className="px-3 py-2 text-slate-400 truncate border-b border-[#E2E8F0]">
  {i.added_by ?? '—'}
</td>
                      <td className="px-2 py-2 overflow-hidden border-b border-[#E2E8F0]" onClick={e => e.stopPropagation()}>
                        <select
                          value={i.statut ?? 'pending'}
                          onChange={e => updateField(i.id, 'statut', e.target.value)}
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none w-full ${sm?.cls ?? 'bg-slate-100 text-slate-500'}`}
                        >
                          {STATUT_OPTS.map(o => <option key={o} value={o}>{statutMeta[o]?.label ?? o}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd   && <AddEtudiantModal    onClose={() => setShowAdd(false)} onSuccess={() => { refetch(); setShowAdd(false); }} />}
      {selected  && <EtudiantDetailModal inscription={selected}            onClose={() => setSelected(null)}                  onSuccess={refetch} />}
    </AdminLayout>
  );
};

export default Students;