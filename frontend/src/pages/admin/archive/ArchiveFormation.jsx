import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import EtudiantDetailModal from '../students/EtudiantDetailModal';
import { resolveGroupDuration } from '../../../utils/pointageHelpers';
import {
  ArrowLeft, Users, RotateCcw, Phone, Mail, CheckCircle2, ChevronRight,
  Search, X, AlertTriangle, Layers, Clock, DollarSign, CalendarDays, BookOpen, ChevronDown,
} from 'lucide-react';
const API = import.meta.env.VITE_API_URL;

const Dialog = ({ icon: Icon = RotateCcw, iconBg, title, children, onClose, actions }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div onClick={ev => ev.stopPropagation()} className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}><Icon size={15} className="text-white" /></div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-600 flex-shrink-0"><X size={16} /></button>
      </div>
      <div className="px-5 py-4">{children}</div>
      <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#F1F5F9]">{actions}</div>
    </div>
  </div>
);

const FilterSelect = ({ icon: Icon, label, value, onChange, opts, display }) => (
  <div className="relative flex items-center">
    {Icon && <Icon size={13} className="absolute left-2 text-[#0369A1] pointer-events-none" />}
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      className={`appearance-none text-xs rounded-full py-1.5 pr-7 pl-7 bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer transition ${value ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}>
      <option value="">{label}</option>
      {opts.map(o => <option key={o} value={o}>{display ? display(o) : o}</option>)}
    </select>
    {value ? <button onClick={() => onChange('')} className="absolute right-2 text-slate-300 hover:text-red-400"><X size={11} /></button>
      : <ChevronDown size={11} className="absolute right-2 text-slate-400 pointer-events-none" />}
  </div>
);

const statutMeta = {
  confirmed:     { label: 'Confirmé',     cls: 'bg-[#DCEBFA] text-[#0369A1]' },
  pending:       { label: 'En attente',   cls: 'bg-amber-50 text-amber-700' },
  non_confirmed: { label: 'Non confirmé', cls: 'bg-red-50 text-red-500' },
  rejected:      { label: 'Rejeté',       cls: 'bg-slate-100 text-slate-500' },
};

const COLS = [
  { label: 'Étudiant',   Icon: null },
  { label: 'Téléphone',  Icon: Phone },
  { label: 'Email',      Icon: Mail },
  { label: 'Groupe',     Icon: Users },
  { label: 'Statut',     Icon: CheckCircle2 },
  { label: '',           Icon: null },
];

// Same columns as above, plus a Niveau column — used only in the global "all levels" table.
const COLS_GLOBAL = [
  { label: 'Étudiant',   Icon: null },
  { label: 'Téléphone',  Icon: Phone },
  { label: 'Email',      Icon: Mail },
  { label: 'Niveau',     Icon: Layers },
  { label: 'Groupe',     Icon: Users },
  { label: 'Statut',     Icon: CheckCircle2 },
  { label: '',           Icon: null },
];

const ArchiveFormation = () => {
  const { year, formationId } = useParams();
  const navigate = useNavigate();

  const [formation, setFormation] = useState(null);
  const [loadingFormation, setLoadingFormation] = useState(true);

  const [view, setView] = useState('niveaux'); // 'niveaux' | 'detail' — only 'detail' used if !a_niveaux
  // topTab only matters while view === 'niveaux' and the formation has levels:
  // 'niveaux' shows the level grid, 'toutes' shows every archived inscription across all levels.
  const [topTab, setTopTab] = useState('niveaux');
  const [selectedNiveau, setSelectedNiveau] = useState(null);
  const [niveauSearch, setNiveauSearch] = useState('');
  const [activeTab, setActiveTab] = useState('groupes');
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  const [groups, setGroups] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [selectedInscription, setSelectedInscription] = useState(null);

  // ── Global "toutes les inscriptions" (all levels combined) ──
  const [allInscriptions, setAllInscriptions] = useState([]);
  const [allLoaded, setAllLoaded] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [errorAll, setErrorAll] = useState(null);
  const [allSearch, setAllSearch] = useState('');
  const [allFilterStatut, setAllFilterStatut] = useState('');
  const [allFilterNiveau, setAllFilterNiveau] = useState('');

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const [niveauGroupCounts, setNiveauGroupCounts] = useState({});
  const [niveauEtudiantCounts, setNiveauEtudiantCounts] = useState({});
  useEffect(() => {
    fetch(`${API}/api/formations/${formationId}`, { headers })
      .then(r => r.json())
      .then(async (f) => {
        setFormation(f);
        if (!f?.a_niveaux) { setView('detail'); return; }
        const counts = {};
        const etudiantCounts = {};
        await Promise.all((f.niveaux ?? []).map(async (n) => {
          const [gRes, eRes] = await Promise.all([
            fetch(`${API}/api/groups?formation_id=${formationId}&archived=true&annee_scolaire=${year}&niveau_id=${n.id}`, { headers }),
            fetch(`${API}/api/etudiants?formation_id=${formationId}&archived=true&annee_scolaire=${year}&niveau_id=${n.id}`, { headers }),
          ]);
          const gData = await gRes.json().catch(() => []);
          const eData = await eRes.json().catch(() => []);
          counts[n.id] = Array.isArray(gData) ? gData.length : 0;
          etudiantCounts[n.id] = Array.isArray(eData) ? eData.length : 0;
        }));
        setNiveauGroupCounts(counts);
        setNiveauEtudiantCounts(etudiantCounts);
      })
      .finally(() => setLoadingFormation(false));
  }, [formationId]);

  const fetchAll = (niveauId) => {
    setLoading(true);
    const niveauQs = niveauId ? `&niveau_id=${niveauId}` : '';
    Promise.all([
      fetch(`${API}/api/groups?formation_id=${formationId}&archived=true&annee_scolaire=${year}${niveauQs}`, { headers }).then(r => r.json()),
      fetch(`${API}/api/etudiants?formation_id=${formationId}&archived=true&annee_scolaire=${year}${niveauQs}`, { headers }).then(r => r.json()),
    ])
      .then(([g, i]) => { setGroups(g); setInscriptions(i); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  // Fetches every archived inscription for this formation, across ALL levels (no niveau_id filter).
  const fetchAllGlobal = () => {
    setLoadingAll(true);
    fetch(`${API}/api/etudiants?formation_id=${formationId}&archived=true&annee_scolaire=${year}`, { headers })
      .then(r => r.json())
      .then((data) => { setAllInscriptions(data); setAllLoaded(true); })
      .catch(err => setErrorAll(err.message))
      .finally(() => setLoadingAll(false));
  };

  useEffect(() => {
    if (topTab === 'toutes' && !allLoaded) fetchAllGlobal();
  }, [topTab, allLoaded]);

  const openNiveau = (n) => { setSelectedNiveau(n); setActiveTab('groupes'); setSearch(''); setFilterStatut(''); setView('detail'); fetchAll(n.id); };
  const backToNiveaux = () => { setSelectedNiveau(null); setSearch(''); setFilterStatut(''); setView('niveaux'); };

  useEffect(() => {
    if (view === 'detail' && !formation?.a_niveaux) fetchAll();
  }, [view, formation]);

  const doRestoreGroup = async (id) => {
    setRestoring(id);
    await fetch(`${API}/api/groups/${id}/restore`, { method: 'PATCH', headers });
    setRestoring(null);
    setConfirmRestore(null);
    fetchAll(selectedNiveau?.id);
  };

  const doRestoreInscription = async (id) => {
    setRestoring(id);
    await fetch(`${API}/api/etudiants/${id}/restore`, { method: 'PATCH', headers });
    setRestoring(null);
    setConfirmRestore(null);
    fetchAll(selectedNiveau?.id);
    if (allLoaded) fetchAllGlobal();
  };

  const confirmRestoreAction = () => {
    if (!confirmRestore) return;
    confirmRestore.type === 'group' ? doRestoreGroup(confirmRestore.id) : doRestoreInscription(confirmRestore.id);
  };

  const filteredGroups = groups.filter(g => g.nom.toLowerCase().includes(search.toLowerCase()));
  const filteredInscriptions = inscriptions.filter(i => {
    const txt = `${i.etudiant?.nom} ${i.etudiant?.prenom}`.toLowerCase();
    const matchesSearch = txt.includes(search.toLowerCase()) || i.etudiant?.telephone?.includes(search);
    const matchesStatut = !filterStatut || i.statut === filterStatut;
    return matchesSearch && matchesStatut;
  });

  const filteredAllInscriptions = allInscriptions.filter(i => {
    const txt = `${i.etudiant?.nom} ${i.etudiant?.prenom}`.toLowerCase();
    const matchesSearch = txt.includes(allSearch.toLowerCase()) || i.etudiant?.telephone?.includes(allSearch);
    const matchesStatut = !allFilterStatut || i.statut === allFilterStatut;
    const matchesNiveau = !allFilterNiveau || i.niveau?.nom === allFilterNiveau;
    return matchesSearch && matchesStatut && matchesNiveau;
  });

  const niveauFilterOpts = (formation?.niveaux ?? []).map(n => n.nom);

  const groupPrice = (g) => {
    const basePrice = formation?.a_niveaux && formation?.prix_uniforme === false
      ? Number(selectedNiveau?.prix ?? 0)
      : Number(formation?.prix_etudiant ?? formation?.prix ?? 0);
    return g.en_promotion && g.prix_promotion ? Number(g.prix_promotion) : basePrice;
  };

  const TABS = [
    { key: 'groupes', label: `Groupes archivés (${groups.length})` },
    { key: 'inscriptions', label: `Inscriptions archivées (${inscriptions.length})` },
  ];

  if (loadingFormation) {
    return <AdminLayout><div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => view === 'detail' && formation?.a_niveaux ? backToNiveaux() : navigate(`/admin/archive/${year}`)}
          className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition flex-shrink-0"
        >
          <ArrowLeft size={16} className="text-[#0369A1]" />
        </button>
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          <button onClick={() => navigate('/admin/archive')} className="text-slate-400 hover:text-[#0369A1] transition">Archive</button>
          <span className="text-slate-300">›</span>
          <button onClick={() => navigate(`/admin/archive/${year}`)} className="text-slate-400 hover:text-[#0369A1] transition">{year}</button>
          <span className="text-slate-300">›</span>
          {formation?.a_niveaux && view === 'detail' ? (
            <button onClick={backToNiveaux} className="text-slate-400 hover:text-[#0369A1] transition">{formation?.nom}</button>
          ) : (
            <span className="text-[#0369A1] font-medium">{formation?.nom}</span>
          )}
          {formation?.a_niveaux && view === 'detail' && (
            <>
              <span className="text-slate-300">›</span>
              <span className="text-[#0369A1] font-medium">{selectedNiveau?.nom}</span>
            </>
          )}
        </div>
      </div>
      <p className="mb-4 text-xs text-slate-400 ml-12">Année scolaire {year}</p>

      {/* ── Niveaux / Toutes les inscriptions ── */}
      {view === 'niveaux' && (
        <>
          {formation?.a_niveaux && (
            <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setTopTab('niveaux')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition ${
                  topTab === 'niveaux' ? 'bg-[#0F2A4A] text-white' : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'
                }`}>
                <Layers size={15} /> Niveaux
              </button>
              <button onClick={() => setTopTab('toutes')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition ${
                  topTab === 'toutes' ? 'bg-[#0F2A4A] text-white' : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'
                }`}>
                <BookOpen size={15} /> Toutes les inscriptions
              </button>
            </div>
          )}

          {topTab === 'niveaux' && (
            <>
              <div className="mb-6 flex flex-wrap gap-2 items-center">
                <div className="relative min-w-[160px] flex-1 max-w-[220px]">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
                  <input placeholder="Rechercher un niveau..." value={niveauSearch} onChange={e => setNiveauSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
                </div>
                {niveauSearch && (
                  <button onClick={() => setNiveauSearch('')} className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
                    <X size={11} /> Effacer
                  </button>
                )}
              </div>

              {(() => {
                const filteredNiveaux = (formation?.niveaux ?? []).filter(n => n.nom.toLowerCase().includes(niveauSearch.toLowerCase()));
                return filteredNiveaux.length === 0 ? (
                  <p className="text-slate-400 text-sm">Aucun niveau trouvé.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredNiveaux.map(n => (
                      <div key={n.id} onClick={() => openNiveau(n)}
                        className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] cursor-pointer transition group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 bg-[#DCEBFA] rounded-full flex items-center justify-center"><Layers size={18} className="text-[#0369A1]" /></div>
                          <ChevronRight size={18} className="text-slate-300 group-hover:text-[#0369A1] transition" />
                        </div>
                        <h2 className="text-slate-800 font-semibold text-base mb-2">{n.nom}</h2>
                        <div className="flex gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users size={13} className="text-[#0369A1]" /> {niveauGroupCounts[n.id] ?? 0} groupe(s)
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen size={13} className="text-[#0369A1]" /> {niveauEtudiantCounts[n.id] ?? 0} inscription(s)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}

          {topTab === 'toutes' && (
            <>
              <div className="mb-6 flex flex-wrap gap-2 items-center">
                <div className="relative min-w-[160px] flex-1 max-w-[220px]">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
                  <input placeholder="Rechercher (nom, téléphone)..." value={allSearch} onChange={e => setAllSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
                </div>
                <FilterSelect icon={Layers} label="Niveau" value={allFilterNiveau} onChange={setAllFilterNiveau}
                  opts={niveauFilterOpts} />
                <FilterSelect icon={CheckCircle2} label="Statut" value={allFilterStatut} onChange={setAllFilterStatut}
                  opts={Object.keys(statutMeta)} display={o => statutMeta[o]?.label ?? o} />
                {(allSearch || allFilterStatut || allFilterNiveau) && (
                  <button onClick={() => { setAllSearch(''); setAllFilterStatut(''); setAllFilterNiveau(''); }}
                    className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
                    <X size={11} /> Effacer
                  </button>
                )}
                <span className="ml-auto text-[11px] text-slate-400">{filteredAllInscriptions.length} / {allInscriptions.length} inscriptions</span>
              </div>

              {loadingAll && (
                <div className="flex justify-center py-16">
                  <div className="w-7 h-7 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {errorAll && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">Erreur : {errorAll}</p>}

              {!loadingAll && !errorAll && (
                filteredAllInscriptions.length === 0 ? (
                  <p className="text-slate-400 text-sm">Aucune inscription archivée.</p>
                ) : (
                  <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-[#0F2A4A]">
                          <tr>
                            {COLS_GLOBAL.map(({ label, Icon }, i) => (
                              <th key={label || i} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] whitespace-nowrap ${i === 0 ? 'border-l border-[#0F2A4A]' : ''}`}>
                                <div className="flex items-center gap-1">
                                  {Icon && <Icon size={11} className="text-white/70 flex-shrink-0" />}
                                  <span>{label}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAllInscriptions.map((i, idx) => {
                            const sm = statutMeta[i.statut];
                            return (
                              <tr key={i.id} onClick={() => setSelectedInscription(i)} className={`hover:bg-slate-50 transition cursor-pointer ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                                <td className="px-3 py-2.5 border-b border-l border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                                      {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                                    </div>
                                    <span className="font-medium text-slate-700 whitespace-nowrap">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-slate-100">{i.etudiant?.telephone ?? '—'}</td>
                                <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-slate-100">{i.etudiant?.email ?? '—'}</td>
                                <td className="px-3 py-2.5 border-b border-slate-100">
                                  {i.niveau?.nom
                                    ? <span className="bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap">{i.niveau.nom}</span>
                                    : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-slate-100">{i.groups?.nom ?? '—'}</td>
                                <td className="px-3 py-2.5 border-b border-slate-100">
                                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sm?.cls ?? 'bg-slate-100 text-slate-500'}`}>{sm?.label ?? i.statut}</span>
                                </td>
                                <td className="px-3 py-2.5 text-right border-b border-slate-100" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => setConfirmRestore({ type: 'inscription', id: i.id, label: `${i.etudiant?.nom} ${i.etudiant?.prenom}` })}
                                    disabled={restoring === i.id}
                                    className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-600/20 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition disabled:opacity-40 ml-auto"
                                  >
                                    <RotateCcw size={11} /> {restoring === i.id ? '...' : 'Restaurer'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}
            </>
          )}
        </>
      )}

      {/* ── Detail (groupes / inscriptions) — per level, or the whole formation if it has no levels ── */}
      {view === 'detail' && (
        <>
          <div className="flex items-center gap-2 mb-6">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition ${
                  activeTab === tab.key ? 'bg-[#0F2A4A] text-white' : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">Erreur : {error}</p>}

          {!loading && !error && activeTab === 'groupes' && (
            <>
              <div className="mb-6 flex flex-wrap gap-2 items-center">
                <div className="relative min-w-[160px] flex-1 max-w-[220px]">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
                  <input placeholder="Rechercher un groupe..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
                </div>
                {search && (
                  <button onClick={() => setSearch('')} className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
                    <X size={11} /> Effacer
                  </button>
                )}
              </div>

              {filteredGroups.length === 0 ? (
                <p className="text-slate-400 text-sm">Aucun groupe archivé.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredGroups.map((g) => {
                    const { type_duree, total } = resolveGroupDuration(g, formation, selectedNiveau);
                    return (
                      <div key={g.id} className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] transition">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center"><Users size={20} className="text-amber-600" /></div>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Archivé</span>
                        </div>
                        <h2 className="text-slate-800 font-semibold text-base mb-1">{g.nom}</h2>
                        <p className="text-slate-400 text-xs mb-3">
                          {g.teacher?.user ? `${g.teacher.user.nom} ${g.teacher.user.prenom}` : 'Aucun professeur assigné'}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-5">
                          <span className="flex items-center gap-1"><Users size={13} className="text-[#0369A1]" /> {g.nb_etudiants} étudiant(s)</span>
                          {total != null && (
                            <span className="flex items-center gap-1"><Clock size={13} className="text-[#0369A1]" /> {total} {type_duree === 'seances' ? 'séances' : 'h'}</span>
                          )}
                          <span className="flex items-center gap-1"><DollarSign size={13} className="text-[#0369A1]" /> {groupPrice(g).toLocaleString('fr-FR')} DA</span>
                          {g.date_fin && (
                            <span className="flex items-center gap-1"><CalendarDays size={13} className="text-[#0369A1]" /> {new Date(g.date_fin).toLocaleDateString('fr-FR')}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => navigate(`/admin/archive/${year}/${formationId}/groups/${g.id}`)}
                            className="flex items-center gap-1 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] border border-[#0369A1]/20 px-3 py-1.5 rounded-full hover:bg-[#c9e2f7] hover:shadow-sm active:scale-95 transition"
                          >
                            Voir détails <ChevronRight size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmRestore({ type: 'group', id: g.id, label: g.nom })}
                            disabled={restoring === g.id}
                            className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-600/20 px-3 py-1.5 rounded-full hover:bg-emerald-100 hover:shadow-sm active:scale-95 transition disabled:opacity-40"
                          >
                            <RotateCcw size={12} /> {restoring === g.id ? '...' : 'Restaurer'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {!loading && !error && activeTab === 'inscriptions' && (
            <>
              <div className="mb-6 flex flex-wrap gap-2 items-center">
                <div className="relative min-w-[160px] flex-1 max-w-[220px]">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
                  <input placeholder="Rechercher (nom, téléphone)..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
                </div>
                <FilterSelect icon={CheckCircle2} label="Statut" value={filterStatut} onChange={setFilterStatut}
                  opts={Object.keys(statutMeta)} display={o => statutMeta[o]?.label ?? o} />
                {(search || filterStatut) && (
                  <button onClick={() => { setSearch(''); setFilterStatut(''); }} className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
                    <X size={11} /> Effacer
                  </button>
                )}
              </div>

              {filteredInscriptions.length === 0 ? (
                <p className="text-slate-400 text-sm">Aucune inscription archivée.</p>
              ) : (
                <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[#0F2A4A]">
                        <tr>
                          {COLS.map(({ label, Icon }, i) => (
                            <th key={label || i} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] whitespace-nowrap ${i === 0 ? 'border-l border-[#0F2A4A]' : ''}`}>
                              <div className="flex items-center gap-1">
                                {Icon && <Icon size={11} className="text-white/70 flex-shrink-0" />}
                                <span>{label}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInscriptions.map((i, idx) => {
                          const sm = statutMeta[i.statut];
                          return (
                            <tr key={i.id} onClick={() => setSelectedInscription(i)} className={`hover:bg-slate-50 transition cursor-pointer ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                              <td className="px-3 py-2.5 border-b border-l border-slate-100">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                                    {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                                  </div>
                                  <span className="font-medium text-slate-700 whitespace-nowrap">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-slate-100">{i.etudiant?.telephone ?? '—'}</td>
                              <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-slate-100">{i.etudiant?.email ?? '—'}</td>
                              <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-slate-100">{i.groups?.nom ?? '—'}</td>
                              <td className="px-3 py-2.5 border-b border-slate-100">
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sm?.cls ?? 'bg-slate-100 text-slate-500'}`}>{sm?.label ?? i.statut}</span>
                              </td>
                              <td className="px-3 py-2.5 text-right border-b border-slate-100" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => setConfirmRestore({ type: 'inscription', id: i.id, label: `${i.etudiant?.nom} ${i.etudiant?.prenom}` })}
                                  disabled={restoring === i.id}
                                  className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-600/20 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition disabled:opacity-40 ml-auto"
                                >
                                  <RotateCcw size={11} /> {restoring === i.id ? '...' : 'Restaurer'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {confirmRestore && (
        <Dialog title="Restaurer" iconBg="bg-emerald-500" icon={RotateCcw} onClose={() => setConfirmRestore(null)}
          actions={<>
            <button onClick={() => setConfirmRestore(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100">Annuler</button>
            <button onClick={confirmRestoreAction} disabled={restoring === confirmRestore.id}
              className="text-xs px-3 py-1.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40">
              {restoring === confirmRestore.id ? '...' : 'Oui, restaurer'}
            </button>
          </>}>
          <div className="bg-emerald-50 rounded-md p-3">
            <p className="text-xs text-emerald-700">
              Restaurer {confirmRestore.type === 'group' ? 'le groupe' : "l'inscription de"} « {confirmRestore.label} » ?
            </p>
          </div>
        </Dialog>
      )}

      {selectedInscription && (
        <EtudiantDetailModal inscription={selectedInscription} readOnly onClose={() => setSelectedInscription(null)} />
      )}
    </AdminLayout>
  );
};

export default ArchiveFormation;