import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, X, GraduationCap, Phone, Mail, MapPin, CalendarDays, CheckCircle2, ChevronRight, ChevronDown, Activity, Layers } from 'lucide-react';
import AdminLayout from '../../../../layouts/AdminLayout';
import PaymentsTab from './PaymentsTab';
import PaymentHistoryModal from './PaymentHistoryModal';
import ScheduleTab from './ScheduleTab';
import PointageTab from './PointageTab';
import AttestationsTab from './AttestationsTab';
// Adjust this path if EtudiantDetailModal lives elsewhere relative to this file.
import EtudiantDetailModal from '../../students/EtudiantDetailModal';

const API = import.meta.env.VITE_API_URL;

const STATUT_OPTS = ['confirmed', 'pending', 'non_confirmed'];
const statutMeta = {
  confirmed:     { label: 'Confirmé',     cls: 'bg-emerald-50 text-emerald-700' },
  pending:       { label: 'En attente',   cls: 'bg-amber-50 text-amber-700' },
  non_confirmed: { label: 'Non confirmé', cls: 'bg-red-50 text-red-500' },
};

const NIVEAU_OPTS = ['Primaire', 'Moyen', 'Secondaire', 'Bac', 'Licence', 'Master', 'Doctorat', 'Autre'];

const STATUT_SCOLARITE_OPTS = ['en_cours', 'abandonne', 'termine'];
const statutScolariteMeta = {
  en_cours:  { label: 'En cours',  cls: 'bg-blue-50 text-blue-600' },
  abandonne: { label: 'Abandonné', cls: 'bg-red-50 text-red-500' },
  termine:   { label: 'Terminé',   cls: 'bg-slate-100 text-slate-500' },
};

const COLS = [
  { label: 'Étudiant',       Icon: null },
  { label: 'Téléphone',      Icon: Phone },
  { label: 'Email',          Icon: Mail },
  { label: 'Niveau',         Icon: GraduationCap },
  { label: 'Adresse',        Icon: MapPin },
  { label: 'Date naissance', Icon: CalendarDays },
  { label: 'Statut',         Icon: CheckCircle2 },
  { label: 'Scolarité',      Icon: Activity },
];

// Same pill-style filter used in Formations.jsx
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

const GroupDetail = () => {
  const { id: formation_id, groupId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [etudiants, setEtudiants] = useState([]);
  const [group, setGroup] = useState(null);
  const [formation, setFormation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('etudiants');
  const [selectedStudent, setSelectedStudent] = useState(null); // payment history modal
  const [detailInscription, setDetailInscription] = useState(null); // student detail modal
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);

  // filters
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [niveau, setNiveau] = useState('');
  const [statutScolarite, setStatutScolarite] = useState('');

  const niveauInfo = formation?.a_niveaux ? formation?.niveaux?.find(n => n.id === group?.niveau_id) : null;

  const fetchAll = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    Promise.all([
      fetch(`${API}/api/groups?formation_id=${formation_id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/groups/${groupId}/etudiants`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/formations/${formation_id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([groups, etudiantsData, formationData]) => {
        setGroup(groups.find(g => g.id === groupId));
        setEtudiants(etudiantsData);
        setFormation(formationData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchAll, [groupId]);

  const TABS = [
    { key: 'etudiants', label: 'Étudiants' },
    { key: 'paiements', label: 'Paiements' },
    { key: 'emploi', label: 'Emploi du temps' },
    { key: 'pointage', label: 'Pointage' },
    { key: 'attestations', label: 'Attestations' },
  ];

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && TABS.some(t => t.key === tabParam)) setActiveTab(tabParam);
  }, [searchParams]);

  const filtered = etudiants.filter(i => {
    const name = `${i.etudiant?.nom} ${i.etudiant?.prenom}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase()) && !i.etudiant?.telephone?.includes(search)) return false;
    if (statut && i.statut !== statut) return false;
    if (niveau && i.etudiant?.niveau_scolaire !== niveau) return false;
    if (statutScolarite && (i.statut_scolarite || 'en_cours') !== statutScolarite) return false;
    return true;
  });

  const hasFilters = search || statut || niveau || statutScolarite;
  const clearAll = () => { setSearch(''); setStatut(''); setNiveau(''); setStatutScolarite(''); };

  const handleStatutScolariteChange = async (inscriptionId, value) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/etudiants/${inscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statut_scolarite: value }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      const updated = await res.json();
      setEtudiants(prev => prev.map(i => i.id === inscriptionId ? { ...i, statut_scolarite: updated.statut_scolarite } : i));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AdminLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs mb-3 flex-wrap">
        <button onClick={() => navigate('/admin/formations')} className="text-slate-400 hover:text-[#0369A1] hover:underline transition">
          Formations
        </button>

        {formation?.a_niveaux && (
          <>
            <ChevronRight size={12} className="text-slate-300" />
            <button onClick={() => navigate(`/admin/formations/${formation_id}/niveaux`)} className="text-slate-400 hover:text-[#0369A1] hover:underline transition">
              Niveaux • {formation?.nom}
            </button>
          </>
        )}

        <ChevronRight size={12} className="text-slate-300" />
        <button
          onClick={() => navigate(`/admin/formations/${formation_id}/groups${niveauInfo ? `?niveau_id=${niveauInfo.id}` : ''}`)}
          className="text-slate-400 hover:text-[#0369A1] hover:underline transition">
          Groupes • {niveauInfo ? niveauInfo.nom : formation?.nom ?? ''}
        </button>

        <ChevronRight size={12} className="text-slate-300" />
        <span className="text-[#0369A1] font-medium">{group?.nom ?? 'Groupe'}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(`/admin/formations/${formation_id}/groups`)}
          className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition flex-shrink-0">
          <ArrowLeft size={16} className="text-[#0369A1]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{group?.nom ?? 'Groupe'}</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Prof : {group?.teacher?.user ? `${group.teacher.user.nom} ${group.teacher.user.prenom}` : 'Non assigné'}
            {' · '}{etudiants.length} étudiant(s)
            {niveauInfo && <> {' · '}<span className="inline-flex items-center gap-1 text-violet-600"><Layers size={11} /> {niveauInfo.nom}</span></>}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition ${activeTab === tab.key ? 'bg-[#0F2A4A] text-white' : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Etudiants tab */}
      {activeTab === 'etudiants' && (
        <>
          <div className="mb-6 flex flex-wrap gap-2 items-center">
            <div className="relative min-w-[160px] flex-1 max-w-[220px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
              <input placeholder="Nom, téléphone…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
            </div>
            <div className="w-px h-5 bg-[#E2E8F0]" />
            <FilterSelect icon={CheckCircle2} label="Statut" value={statut} onChange={setStatut} opts={STATUT_OPTS} display={o => statutMeta[o]?.label ?? o} />
            <FilterSelect icon={GraduationCap} label="Niveau" value={niveau} onChange={setNiveau} opts={NIVEAU_OPTS} />
            <FilterSelect icon={Activity} label="Scolarité" value={statutScolarite} onChange={setStatutScolarite} opts={STATUT_SCOLARITE_OPTS} display={o => statutScolariteMeta[o]?.label ?? o} />
            {hasFilters && (
              <button onClick={clearAll} className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
                <X size={11} /> Tout effacer
              </button>
            )}
          </div>

          <p className="text-slate-400 text-xs mb-3">{filtered.length} / {etudiants.length} étudiant(s)</p>

          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-7 h-7 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">Erreur : {error}</p>}

          {!loading && !error && (
            <div className="bg-white rounded-md shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#0F2A4A]">
                    <tr>
                      {COLS.map(({ label, Icon }, i) => (
                        <th key={label} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] whitespace-nowrap ${i === 0 ? 'border-l border-[#0F2A4A]' : ''}`}>
                          <div className="flex items-center gap-1">
                            {Icon && <Icon size={11} className="text-white/70 flex-shrink-0" />}
                            <span>{label}</span>
                          </div>
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
                        <tr key={i.id} onClick={() => setDetailInscription(i)}
                          className={`hover:bg-slate-50 transition cursor-pointer ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                          <td className="px-3 py-2.5 border-b border-l border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                                {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-700 whitespace-nowrap">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-slate-100" onClick={e => e.stopPropagation()}>
  {i.etudiant?.telephone ? (
    <a href={`tel:${i.etudiant.telephone}`} className="hover:text-[#0369A1] hover:underline">{i.etudiant.telephone}</a>
  ) : '—'}
</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-slate-100">{i.etudiant?.email ?? '—'}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-slate-100">{i.etudiant?.niveau_scolaire ?? '—'}</td>
                          <td className="px-3 py-2.5 text-slate-500 max-w-[150px] truncate border-b border-slate-100">{i.etudiant?.adresse ?? '—'}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-slate-100">
                            {i.etudiant?.date_naissance ? new Date(i.etudiant.date_naissance).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="px-3 py-2.5 border-b border-slate-100">
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sm?.cls ?? 'bg-slate-100 text-slate-500'}`}>{sm?.label ?? i.statut}</span>
                          </td>
                          <td className="px-3 py-2.5 border-b border-slate-100" onClick={e => e.stopPropagation()}>
                            <select value={i.statut_scolarite || 'en_cours'} onChange={e => handleStatutScolariteChange(i.id, e.target.value)}
                              className={`text-[11px] font-medium rounded-full pl-2 pr-5 py-0.5 border-none focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer ${statutScolariteMeta[i.statut_scolarite || 'en_cours']?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                              {STATUT_SCOLARITE_OPTS.map(o => <option key={o} value={o}>{statutScolariteMeta[o].label}</option>)}
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
        </>
      )}

      {activeTab === 'paiements' && <PaymentsTab groupId={groupId} onSelectStudent={setSelectedStudent} refreshKey={paymentsRefreshKey} />}
      {activeTab === 'emploi' && <ScheduleTab groupId={groupId} groupName={group?.nom} formationNom={formation?.nom} />}
  {activeTab === 'pointage' && <PointageTab groupId={groupId} etudiants={etudiants.map(i => ({ ...i.etudiant, statut_scolarite: i.statut_scolarite, abandonne_at: i.abandonne_at }))} group={group} formation={formation} niveau={niveauInfo} />}
      {activeTab === 'attestations' && <AttestationsTab etudiants={etudiants.filter(i => (i.statut_scolarite || 'en_cours') === 'en_cours')} formationId={formation_id} formationNom={formation?.nom} groupId={groupId} />}

      <PaymentHistoryModal student={selectedStudent} formationId={group?.formation_id} onClose={() => setSelectedStudent(null)} onRefresh={() => setPaymentsRefreshKey(k => k + 1)} />

      {detailInscription && (
        <EtudiantDetailModal inscription={detailInscription} onClose={() => setDetailInscription(null)}
          onSuccess={() => { setDetailInscription(null); fetchAll(); }} />
      )}
    </AdminLayout>
  );
};

export default GroupDetail;