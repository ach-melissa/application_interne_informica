import { useState, useEffect } from 'react';
import {
  Search, Plus, X, CheckCircle2, Phone, PhoneCall, Users, Radio, UserCheck, CalendarDays, Megaphone, MapPin, UserCircle, UserX, Clock, ChevronDown, Layers, Archive, Printer,
} from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';
import EtudiantDetailModal, { printRows, FICHE_CSS, buildFicheInner, imgToBase64 } from './EtudiantDetailModal';
import AddEtudiantModal from './AddEtudiantModal';
import logo from '../../../assets/images/logo_informica.png';

const API = import.meta.env.VITE_API_URL;

const getAnneesScolaires = () => {
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const years = [];
  for (let y = startYear + 1; y >= startYear - 5; y--) years.push(`${y}-${y + 1}`);
  return years;
};

const getCurrentAnneeScolaire = () => {
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
};

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

const STAT_COLORS = {
  blue:    { bg: 'bg-[#DCEBFA]', text: 'text-[#0369A1]' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  red:     { bg: 'bg-red-50',     text: 'text-red-500' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-600' },
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

const TrySelect = ({ value, onChange, disabled, opts }) => (
  <select
    value={value ?? ''}
    onChange={e => onChange(e.target.value || null)}
    onClick={e => e.stopPropagation()}
    disabled={disabled}
    className={`text-[11px] font-medium px-2 py-0.5 rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-[#0369A1]/40 w-full
      ${disabled ? (value ? 'cursor-not-allowed' : 'opacity-30 cursor-not-allowed') : 'cursor-pointer'}
      ${value ? 'bg-emerald-100 text-emerald-700 font-semibold' : 'bg-slate-100 text-slate-400'}`}
  >
    <option value="">— aucun —</option>
    {opts.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

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

const Students = () => {
  const isGroupLocked = dateFin => {
  if (!dateFin) return false;
  const limit = new Date(dateFin);
  limit.setDate(limit.getDate() + 30);
  return new Date() > limit;
};
const today = new Date().toISOString().slice(0, 10);
const isGroupNotFinished = (i) => !!i.group_id && (!i.groups?.date_fin || i.groups.date_fin > today);
const [etudiants, setEtudiants]   = useState([]);
const [formations, setFormations] = useState([]);
const [wilayas, setWilayas]             = useState([]);
const [sourceOpts, setSourceOpts]       = useState([]);
const [registeredByOpts, setRegisteredByOpts] = useState([]);
const [firstTryOpts, setFirstTryOpts]   = useState([]);
const [secondTryOpts, setSecondTryOpts] = useState([]);
const [thirdTryOpts, setThirdTryOpts]   = useState([]);
  const [search, setSearch]         = useState('');
  const [filters, setFilters]       = useState({});
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [selected, setSelected]     = useState(null);
  const [statutOpts, setStatutOpts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
const [showBulkArchive, setShowBulkArchive] = useState(false);
const [bulkArchiveYear, setBulkArchiveYear] = useState('');
const [bulkArchiving, setBulkArchiving] = useState(false);
const [bulkError, setBulkError] = useState(null);

const toggleSelect = (id) => setSelectedIds(prev => {
  const next = new Set(prev);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
});
const toggleSelectAll = () => setSelectedIds(prev =>
  prev.size === filtered.length ? new Set() : new Set(filtered.map(i => i.id))
);

const doBulkArchive = async () => {
  const blocked = etudiants.filter(i => selectedIds.has(i.id) && isGroupNotFinished(i));
  if (blocked.length > 0) {
    setBulkError(`${blocked.length} étudiant(s) sélectionné(s) appartiennent à un groupe non terminé.`);
    return;
  }
  if (!bulkArchiveYear) {
    setBulkError('Veuillez sélectionner une année scolaire.');
    return;
  }
  setBulkArchiving(true); setBulkError(null);
  try {
    const res = await fetch(`${API}/api/etudiants/archive-multiple`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ ids: [...selectedIds], annee_scolaire: bulkArchiveYear }),
    });
    if (!res.ok) throw new Error((await res.json())?.error || 'Archivage échoué');
    refetch();
    setSelectedIds(new Set());
    setShowBulkArchive(false);
    setBulkArchiveYear('');
  } catch (err) {
    setBulkError(err.message);
  } finally {
    setBulkArchiving(false);
  }
};
const printSelectedFiches = async () => {
  const logoBase64 = await imgToBase64(logo);
  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" alt="INFORMICA" style="height:80px;width:auto;object-fit:contain" />`
    : `<div class="logo-text">INFORMICA</div>`;

  const selectedInscriptions = etudiants.filter(i => selectedIds.has(i.id));

  const sheetsHtml = selectedInscriptions.map((i, idx) => {
    const printData = {
      nom: i.etudiant?.nom, prenom: i.etudiant?.prenom, ddn: i.etudiant?.date_naissance,
      lieu: i.etudiant?.lieu_naissance, adresse: i.etudiant?.adresse, niveau: i.etudiant?.niveau_scolaire,
      email: i.etudiant?.email, tel: i.etudiant?.telephone,
      formation_label: i.formation?.nom || '',
    };
    const rows = printRows.map(r => ({ ...r, value: r.key ? printData[r.key] || '' : '' }));
    const breakStyle = idx > 0 ? 'page-break-before: always;' : '';
    return `<div class="page-wrap" style="${breakStyle}"><div class="sheet">${buildFicheInner(logoHtml, rows)}</div></div>`;
  }).join('');

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>fiches_inscription</title>
  <style>${FICHE_CSS}</style></head>
  <body>
    <div class="toolbar">
      <button class="btn-print" onclick="window.print()">Imprimer tout (${selectedInscriptions.length})</button>
      <button class="btn-close" onclick="window.close()">Fermer</button>
    </div>
    ${sheetsHtml}
  </body></html>`);
  win.document.close();
    fetch(`${API}/api/etudiants/log-impression`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: JSON.stringify({ ids: [...selectedIds] }),
  }).catch(console.error);
};

const selectedFormationObj = formations.find(f => f.nom === filters.formation);
useEffect(() => {
  const h = { Authorization: `Bearer ${localStorage.getItem('token')}` };
  const cat = c => fetch(`${API}/api/parametres?categorie=${c}`, { headers: h }).then(r => r.json());
Promise.all([
    fetch(`${API}/api/etudiants`,  { headers: h }).then(r => r.json()),
    fetch(`${API}/api/formations`, { headers: h }).then(r => r.json()),
    fetch(`${API}/api/etudiants/statut-options`, { headers: h }).then(r => r.json()),
    cat('wilaya'), cat('source'), cat('registered_by'),
    cat('first_try'), cat('second_try'), cat('third_try'),
  ])
    .then(([e, f, so, wl, src, rb, ft, st, tt]) => {
      setStatutOpts(so);
      setEtudiants(e); setFormations(f);
      setWilayas((wl || []).filter(v => v.actif).map(v => v.label));
      setSourceOpts((src || []).filter(v => v.actif).map(v => v.label));
      setRegisteredByOpts((rb || []).filter(v => v.actif).map(v => v.label));
      setFirstTryOpts((ft || []).filter(v => v.actif).map(v => v.label));
      setSecondTryOpts((st || []).filter(v => v.actif).map(v => v.label));
      setThirdTryOpts((tt || []).filter(v => v.actif).map(v => v.label));
    })
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

  // Unique "Ajouté par" values found in the data, for the filter dropdown
  const addedByOpts = [...new Set(etudiants.map(e => e.added_by).filter(Boolean))];

const filtered = etudiants.filter(i => {
  const name = `${i.etudiant?.nom} ${i.etudiant?.prenom}`.toLowerCase();
  if (search && !name.includes(search.toLowerCase()) && !i.etudiant?.telephone?.includes(search)) return false;
  if (filters.statut        && i.statut           !== filters.statut)         return false;
  if (filters.source        && i.source           !== filters.source)         return false;
  if (filters.registered_by && i.registered_by    !== filters.registered_by)  return false;
  if (filters.formation     && i.formation?.nom   !== filters.formation)      return false;
if (filters.niveau        && i.niveau?.nom      !== filters.niveau)         return false;
if (filters.groupe === 'avec' && !i.group_id) return false;
if (filters.groupe === 'sans' && i.group_id)  return false;
if (filters.wilaya        && i.etudiant?.wilaya !== filters.wilaya)         return false;
  if (filters.added_by      && i.added_by         !== filters.added_by)       return false;
  if (dateFrom && i.date_inscription && new Date(i.date_inscription) < new Date(dateFrom)) return false;
  if (dateTo   && i.date_inscription && new Date(i.date_inscription) > new Date(dateTo))   return false;
  return true;
});

  const activeCount = Object.values(filters).filter(Boolean).length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);
  const clearAll = () => { setFilters({}); setDateFrom(''); setDateTo(''); setSearch(''); };

  // Stat counts — "sans groupe" assumes a `group_id` field on the inscription; adjust field name if different.
  const nonConfirmedCount = etudiants.filter(e => e.statut === 'non_confirmed').length;
  const confirmedCount = etudiants.filter(e => e.statut === 'confirmed').length;
  const confirmedNoGroupCount = etudiants.filter(e => e.statut === 'confirmed' && !e.group_id).length;
  const pendingCount = etudiants.filter(e => e.statut === 'pending').length;

 const COLS = [
  { label: '', Icon: null, width: 36 },
  { label: 'Étudiant',    Icon: null,        width: 130 },
  { label: 'Tél.',        Icon: Phone,       width: 90  },
  { label: 'Wilaya',      Icon: MapPin,      width: 100 },
  { label: 'Formation',   Icon: Users,       width: 150 },
  { label: 'Niveau',      Icon: Layers,      width: 100 }, // 👈 new
  { label: 'Date',        Icon: CalendarDays,width: 90  },
  { label: '1er appel',   Icon: PhoneCall,   width: 100  },
  { label: '2ème appel',  Icon: PhoneCall,   width: 100  },
  { label: '3ème appel',  Icon: PhoneCall,   width: 100  },
  { label: 'Source',      Icon: Megaphone,   width: 98  },
  { label: 'Rapporteur',  Icon: UserCheck,   width: 98  },
  { label: 'Ajouté par',  Icon: UserCheck,   width: 100  },
  { label: 'Statut',      Icon: CheckCircle2,width: 103 },
  { label: 'Commentaire', Icon: null,        width: 130 },
];

  return (
    <AdminLayout>
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
    <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
      <UserCircle size={22} className="text-white" />
    </div>
    <div>
      <h1 className="text-xl font-bold text-slate-800">Préinscription</h1>
      <p className="text-slate-400 text-xs mt-0.5">{filtered.length} / {etudiants.length} inscriptions</p>
    </div>
  </div>
  <div className="flex items-center gap-2">
    <button onClick={() => setShowAdd(true)}
      className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium
        shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all">
      <Plus size={14} /> Ajouter
    </button>
{selectedIds.size > 0 && (
  <button onClick={() => { setBulkArchiveYear(getCurrentAnneeScolaire()); setShowBulkArchive(true); }}
    className="flex items-center gap-1.5 bg-amber-500 text-white px-3.5 py-2 rounded-md text-xs font-medium
      shadow-[0_3px_0_#92400e] hover:shadow-[0_2px_0_#92400e] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all">
    <Archive size={14} /> Archiver ({selectedIds.size})
  </button>
)}
    {selectedIds.size > 0 && (
      <button onClick={printSelectedFiches}
        className="flex items-center gap-1.5 bg-[#0369A1] text-white px-3.5 py-2 rounded-md text-xs font-medium
          shadow-[0_3px_0_#065986] hover:shadow-[0_2px_0_#065986] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all">
        <Printer size={14} /> Imprimer ({selectedIds.size})
      </button>
    )}
  </div>
</div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatTile icon={CheckCircle2} label="Confirmés" value={confirmedCount} color="blue" />
        <StatTile icon={UserX}        label="Non confirmés" value={nonConfirmedCount} color="red" />
        <StatTile icon={Clock}        label="En attente" value={pendingCount} color="amber" />
        <StatTile icon={Users}        label="Confirmés sans groupe" value={confirmedNoGroupCount} color="orange" />
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative min-w-[160px] flex-1 max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input placeholder="Nom, téléphone…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
        </div>

        <div className="w-px h-5 bg-[#E2E8F0]" />

       
       <FilterSelect icon={CheckCircle2} label="Statut"         value={filters.statut || ''}        onChange={v => setFilter('statut', v)}        opts={statutOpts}               display={o => statutMeta[o]?.label ?? o} />
      
               <FilterSelect icon={Radio}        label="Source"          value={filters.source || ''}        onChange={v => setFilter('source', v)}        opts={sourceOpts} />
        <FilterSelect icon={UserCheck}    label="Rapporteur"  value={filters.registered_by || ''} onChange={v => setFilter('registered_by', v)} opts={registeredByOpts} />
    <FilterSelect
  icon={Users}
  label="Formation"
  value={filters.formation || ''}
  onChange={v => { setFilter('formation', v); setFilter('niveau', ''); }}
  opts={formations.map(f => f.nom)}
/>
{selectedFormationObj?.a_niveaux && (
  <FilterSelect
    icon={Layers}
    label="Niveau"
    value={filters.niveau || ''}
    onChange={v => setFilter('niveau', v)}
    opts={selectedFormationObj.niveaux?.map(n => n.nom) ?? []}
  />
)}

{/* 👇 nouveau filtre à ajouter ici */}
<FilterSelect
  icon={Users}
  label="Groupe"
  value={filters.groupe || ''}
  onChange={v => setFilter('groupe', v)}
  opts={['avec', 'sans']}
  display={o => o === 'avec' ? 'Avec groupe' : 'Sans groupe'}
/>

<FilterSelect icon={MapPin}  label="Wilaya"    value={filters.wilaya || ''}    onChange={v => setFilter('wilaya', v)}    opts={wilayas} />
<FilterSelect icon={UserCheck} label="Ajouté par" value={filters.added_by || ''} onChange={v => setFilter('added_by', v)} opts={addedByOpts} />
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
               <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table style={{ tableLayout: 'fixed', width: '100%' }} className="text-xs">
              <colgroup>
                {COLS.map(c => <col key={c.label} style={{ width: `${c.width}px` }} />)}
              </colgroup>
                           <thead className="bg-[#0F2A4A]">
                <tr>
{COLS.map(({ label, Icon }, i) => (
  <th key={label || 'checkbox'} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] overflow-hidden ${i === 0 ? 'border-l border-[#0F2A4A]' : ''}`}>
    {i === 0 ? (
      <input type="checkbox" checked={filtered.length > 0 && selectedIds.size === filtered.length} onChange={toggleSelectAll} className="cursor-pointer" />
    ) : (
      <div className="flex items-center gap-1">
        {Icon && <Icon size={11} className="text-white/70 flex-shrink-0" />}
        <span className="truncate">{label}</span>
      </div>
    )}
  </th>
))}
                </tr>
              </thead>
              <tbody>
                              {filtered.length === 0 ? (
                  <tr><td colSpan={COLS.length} className="text-center py-10 text-slate-400 bg-white">Aucun étudiant trouvé.</td></tr>
                ) : filtered.map((i, idx) => {
                  const sm = statutMeta[i.statut];
                  return (
                    <tr key={i.id} onClick={() => setSelected(i)}
                      className={`hover:bg-slate-50 transition cursor-pointer ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                      <td className="px-3 py-2 border-b border-l border-slate-100" onClick={e => e.stopPropagation()}>
  <input type="checkbox" checked={selectedIds.has(i.id)} onChange={() => toggleSelect(i.id)} className="cursor-pointer" />
</td>
                      <td className="px-3 py-2 overflow-hidden border-b border-slate-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                            {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-700 truncate">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                        </div>
                      </td>
<td className="px-3 py-2 text-slate-500 truncate border-b border-slate-100" onClick={e => e.stopPropagation()}>
                      {i.etudiant?.telephone ? (
                        <a href={`tel:${i.etudiant.telephone}`} className="hover:text-[#0369A1] hover:underline">{i.etudiant.telephone}</a>
                      ) : '—'}
                    </td>
<td className="px-3 py-2 text-slate-500 truncate border-b border-slate-100">{i.etudiant?.wilaya ?? '—'}</td>
                      <td className="px-3 py-2 overflow-hidden border-b border-slate-100">
                        {i.formation?.nom
                          ? <span className="bg-[#DCEBFA] text-[#0369A1] px-2 py-0.5 rounded-full text-[11px] font-medium truncate block max-w-full">{i.formation.nom}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 overflow-hidden border-b border-slate-100">
  {i.niveau?.nom
    ? <span className="bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full text-[11px] font-medium truncate block max-w-full">{i.niveau.nom}</span>
    : <span className="text-slate-300">—</span>}
</td>
                      <td className="px-3 py-2 text-slate-400 truncate border-b border-slate-100">
                        {i.date_inscription ? new Date(i.date_inscription).toLocaleDateString('fr-FR') : '—'}
                      </td>

                        {[
  { f: 'first_try',  disabled: false,         opts: firstTryOpts },
  { f: 'second_try', disabled: !i.first_try,  opts: secondTryOpts },
  { f: 'third_try',  disabled: !i.second_try, opts: thirdTryOpts },
].map(({ f, disabled, opts }) => {
  const locked = disabled || isGroupLocked(i.groups?.date_fin);
  return (
    <td key={f} className="px-2 py-2 overflow-hidden border-b border-slate-100">
      <TrySelect value={i[f]} onChange={val => updateField(i.id, f, val)} disabled={locked} opts={opts} />
    </td>
  );
})}

                      <td className="px-2 py-2 overflow-hidden border-b border-slate-100" onClick={e => e.stopPropagation()}>
                        <select
                          value={i.source ?? ''}
                          onChange={e => updateField(i.id, 'source', e.target.value || null)}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none w-full bg-slate-100 text-slate-500"
                        >
                                                    <option value="">— aucun —</option>
                          {sourceOpts.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2 overflow-hidden border-b border-slate-100" onClick={e => e.stopPropagation()}>
  <select
    value={i.registered_by ?? ''}
    onChange={e => updateField(i.id, 'registered_by', e.target.value || null)}
    className="text-[11px] font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none w-full bg-slate-100 text-slate-500"
  >
        <option value="">— aucun —</option>
    {registeredByOpts.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
</td>
<td className="px-3 py-2 text-slate-400 truncate border-b border-slate-100">
  {i.added_by ?? '—'}
</td>
                      <td className="px-2 py-2 overflow-hidden border-b border-slate-100" onClick={e => e.stopPropagation()}>
                        <select
  value={i.statut ?? 'pending'}
  onChange={e => updateField(i.id, 'statut', e.target.value)}
  disabled={isGroupLocked(i.groups?.date_fin)}
  className={`text-[11px] font-medium px-2 py-0.5 rounded-full border-0 focus:outline-none w-full ${isGroupLocked(i.groups?.date_fin) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${sm?.cls ?? 'bg-slate-100 text-slate-500'}`}
>
                          {statutOpts.map(o => <option key={o} value={o}>{statutMeta[o]?.label ?? o}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-slate-500 truncate border-b border-slate-100" title={i.commentaire || ''}>
                        {i.commentaire || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
{showBulkArchive && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
    onClick={() => { setShowBulkArchive(false); setBulkArchiveYear(''); setBulkError(null); }}>
    <div onClick={ev => ev.stopPropagation()} className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
            <Archive size={15} className="text-white" />
          </div>
          <h2 className="text-sm font-semibold text-slate-800">Archiver les inscriptions</h2>
        </div>
        <button onClick={() => { setShowBulkArchive(false); setBulkArchiveYear(''); setBulkError(null); }}
          className="text-slate-300 hover:text-slate-600 flex-shrink-0"><X size={16} /></button>
      </div>

<div className="px-5 py-4 space-y-3">
  <p className="text-xs text-slate-500">Archiver {selectedIds.size} inscription(s) sélectionnée(s) ?</p>
  {(() => {
    const blockedCount = [...selectedIds].filter(id => isGroupNotFinished(etudiants.find(e => e.id === id))).length;
    return blockedCount > 0 ? (
      <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-md">
        {blockedCount} étudiant(s) appartiennent à un groupe non terminé — désélectionnez-les pour continuer.
      </p>
    ) : null;
  })()}
<select value={bulkArchiveYear} onChange={e => setBulkArchiveYear(e.target.value)} required
  className="w-full bg-[#F8FAFC] border border-transparent rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors">
  <option value="" disabled>— Sélectionner une année scolaire —</option>
  {getAnneesScolaires().map(y => <option key={y} value={y}>{y}</option>)}
</select>
        {bulkError && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-md">{bulkError}</p>}
      </div>

      <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#F1F5F9]">
        <button onClick={() => { setShowBulkArchive(false); setBulkArchiveYear(''); setBulkError(null); }}
          className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100">Annuler</button>
<button onClick={doBulkArchive} disabled={
  bulkArchiving || !bulkArchiveYear ||
  [...selectedIds].some(id => isGroupNotFinished(etudiants.find(e => e.id === id)))
}
  className="text-xs px-3 py-1.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40">
  {bulkArchiving ? 'Archivage...' : 'Oui, archiver'}
</button>
      </div>
    </div>
  </div>
)}
      {showAdd   && <AddEtudiantModal    onClose={() => setShowAdd(false)} onSuccess={() => { refetch(); setShowAdd(false); }} />}
      {selected  && <EtudiantDetailModal inscription={selected}            onClose={() => setSelected(null)}                  onSuccess={refetch} />}
    </AdminLayout>
  );
};

export default Students;