import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Layers, DollarSign, Clock, ChevronRight, Search, Users, UserCheck,
  Phone, Mail, GraduationCap, CalendarDays, CheckCircle2, Activity,
} from 'lucide-react';
import AdminLayout from '../../../../layouts/AdminLayout';
import EtudiantDetailModal from '../../students/EtudiantDetailModal';

const API = import.meta.env.VITE_API_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const STATUT_SCOLARITE_META = {
  en_cours:  { label: 'En cours',  cls: 'bg-blue-50 text-blue-600' },
  abandonne: { label: 'Abandonné', cls: 'bg-red-50 text-red-500' },
  termine:   { label: 'Terminé',   cls: 'bg-slate-100 text-slate-500' },
};
const INSCRIPTION_STATUT_META = {
  confirmed: { label: 'Confirmé',   cls: 'bg-emerald-50 text-emerald-600' },
  pending:   { label: 'En attente', cls: 'bg-amber-50 text-amber-700' },
};

const COLS = [
  { label: 'Étudiant', Icon: null,          width: 160 },
  { label: 'Tél.',     Icon: Phone,         width: 100 },
  { label: 'Email',    Icon: Mail,          width: 170 },
  { label: 'Niveau scolaire', Icon: GraduationCap, width: 100 },
  { label: 'Date',     Icon: CalendarDays,  width: 90  },
  { label: 'Statut',   Icon: CheckCircle2,  width: 100 },
  { label: 'Scolarité',Icon: Activity,      width: 110 },
];

const isGroupLocked = dateFin => {
  if (!dateFin) return false;
  const limit = new Date(dateFin);
  limit.setDate(limit.getDate() + 30);
  return new Date() > limit;
};

const FormationNiveaux = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formation, setFormation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [view, setView] = useState('niveaux'); // 'niveaux' | 'niveau_inscriptions'
  const [selectedNiveau, setSelectedNiveau] = useState(null);
  const [inscriptions, setInscriptions] = useState([]);
  const [loadingInscriptions, setLoadingInscriptions] = useState(false);
  const [selectedInscription, setSelectedInscription] = useState(null);
  const [statutScolariteOpts] = useState(['en_cours', 'abandonne', 'termine']);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/formations/${id}`, { headers: headers() })
      .then(r => r.json()).then(setFormation).finally(() => setLoading(false));
  }, [id]);

  const fetchInscriptionsByNiveau = async (niveau) => {
    setLoadingInscriptions(true);
    setSelectedNiveau(niveau);
    try {
      const res = await fetch(`${API}/api/inscriptions?formation_id=${id}&niveau_id=${niveau.id}&statut=confirmed`, { headers: headers() });
      if (!res.ok) throw new Error('Erreur serveur');
      setInscriptions(await res.json());
    } catch (err) { setError(err.message); } finally { setLoadingInscriptions(false); }
  };

  const refetchInscriptions = () => { if (selectedNiveau) fetchInscriptionsByNiveau(selectedNiveau); };

  const handleStatutScolariteChange = async (inscriptionId, value) => {
    try {
      const res = await fetch(`${API}/api/etudiants/${inscriptionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ statut_scolarite: value }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      const updated = await res.json();
      setInscriptions(prev => prev.map(i => i.id === inscriptionId ? { ...i, statut_scolarite: updated.statut_scolarite } : i));
    } catch (err) { setError(err.message); }
  };

  if (loading) return <AdminLayout><div className="py-20 text-center text-slate-400">Chargement...</div></AdminLayout>;

  const filteredNiveaux = (formation?.niveaux ?? []).filter(n =>
    n.nom.toLowerCase().includes(search.toLowerCase())
  );

  const filteredInscriptions = inscriptions.filter(i => {
    if (i.archived) return false;
    const txt = `${i.etudiant?.nom} ${i.etudiant?.prenom}`.toLowerCase();
    if (search && !txt.includes(search.toLowerCase()) && !i.etudiant?.telephone?.includes(search)) return false;
    return true;
  });

  const InscriptionsTable = () => (
    <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
      <div className="overflow-x-auto">
        <table style={{ tableLayout: 'fixed', width: '100%' }} className="text-xs">
          <colgroup>{COLS.map(c => <col key={c.label} style={{ width: `${c.width}px` }} />)}</colgroup>
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
            {filteredInscriptions.length === 0 ? (
              <tr><td colSpan={COLS.length} className="text-center py-10 text-slate-400 bg-white">Aucun étudiant trouvé.</td></tr>
            ) : filteredInscriptions.map((i, idx) => (
              <tr key={i.id} onClick={() => setSelectedInscription(i)}
                className={`hover:bg-slate-50 transition cursor-pointer ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                <td className="px-3 py-2 overflow-hidden border-b border-l border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                      {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-700 truncate">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-500 truncate border-b border-slate-100">{i.etudiant?.telephone ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500 truncate border-b border-slate-100">{i.etudiant?.email ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500 truncate border-b border-slate-100">{i.etudiant?.niveau_scolaire ?? '—'}</td>
                <td className="px-3 py-2 text-slate-400 truncate border-b border-slate-100">
                  {i.date_inscription ? new Date(i.date_inscription).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-3 py-2 overflow-hidden border-b border-slate-100">
                  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${INSCRIPTION_STATUT_META[i.statut]?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                    {INSCRIPTION_STATUT_META[i.statut]?.label ?? i.statut}
                  </span>
                </td>
                <td className="px-2 py-2 overflow-hidden border-b border-slate-100" onClick={e => e.stopPropagation()}>
                  <select value={i.statut_scolarite || 'en_cours'} onChange={e => handleStatutScolariteChange(i.id, e.target.value)}
                    disabled={isGroupLocked(i.groups?.date_fin)}
                    className={`w-full text-[11px] font-medium rounded-full px-2 py-0.5 border-none focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 ${isGroupLocked(i.groups?.date_fin) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${STATUT_SCOLARITE_META[i.statut_scolarite || 'en_cours']?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                    {statutScolariteOpts.map(o => <option key={o} value={o}>{STATUT_SCOLARITE_META[o]?.label ?? o}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      {view !== 'niveau_inscriptions' && (
        <>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate('/admin/formations')}
              className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition flex-shrink-0">
              <ArrowLeft size={16} className="text-[#0369A1]" />
            </button>
            <div className="flex items-center gap-1.5 text-xs">
              <button onClick={() => navigate('/admin/formations')} className="text-slate-400 hover:text-[#0369A1] transition">Formations</button>
              <span className="text-slate-300">›</span>
              <span className="text-[#0369A1] font-medium">Niveaux • {formation?.nom}</span>
            </div>
          </div>
          <p className="mb-4 text-xs text-slate-400 ml-12">{filteredNiveaux.length} / {formation?.niveaux?.length ?? 0} niveau(x)</p>

          <div className="mb-6 flex flex-wrap gap-2 items-center">
            <div className="relative min-w-[160px] flex-1 max-w-[220px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
              <input placeholder="Rechercher un niveau..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
            </div>
          </div>

          {filteredNiveaux.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucun niveau trouvé.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredNiveaux.map(n => (
                <div key={n.id} className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] transition flex flex-col h-full">
                  <div className="w-10 h-10 bg-[#DCEBFA] rounded-full flex items-center justify-center mb-3">
                    <Layers size={18} className="text-[#0369A1]" />
                  </div>
                  <h2 className="text-slate-800 font-semibold mb-3">{n.nom}</h2>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-2">
                    <span className="flex items-center gap-1"><Users size={13} className="text-[#0369A1]" /> {n.nb_groupes ?? 0} groupe(s)</span>
                    <span className="flex items-center gap-1"><UserCheck size={13} className="text-[#0369A1]" /> {n.nb_etudiants ?? 0} étudiant(s)</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-5">
                    {n.duree_valeur != null && (
                      <span className="flex items-center gap-1"><Clock size={13} /> {n.duree_valeur} {n.type_duree === 'seances' ? 'séances' : 'h'}</span>
                    )}
                    {n.prix != null && (
                      <span className="flex items-center gap-1"><DollarSign size={13} /> {Number(n.prix).toLocaleString()} DA</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mt-auto pt-3">
                    <button onClick={() => navigate(`/admin/formations/${id}/groups?niveau_id=${n.id}`)}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] border border-[#0369A1]/20 px-3 py-1.5 rounded-full hover:bg-[#c9e2f7] active:scale-95 transition">
                      <Users size={13} /> Groupes <ChevronRight size={13} />
                    </button>
                    <button onClick={() => { setSearch(''); fetchInscriptionsByNiveau(n); setView('niveau_inscriptions'); }}
                      className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-600/20 px-3 py-1.5 rounded-full hover:bg-emerald-100 active:scale-95 transition">
                      <UserCheck size={13} /> Inscriptions <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'niveau_inscriptions' && (
        <>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => { setView('niveaux'); setSelectedNiveau(null); setSearch(''); }}
              className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition flex-shrink-0">
              <ArrowLeft size={16} className="text-[#0369A1]" />
            </button>
            <div className="flex items-center gap-1.5 text-xs">
              <button onClick={() => navigate('/admin/formations')} className="text-slate-400 hover:text-[#0369A1] transition">Formations</button>
              <span className="text-slate-300">›</span>
              <button onClick={() => { setView('niveaux'); setSelectedNiveau(null); setSearch(''); }} className="text-slate-400 hover:text-[#0369A1] transition">Niveaux • {formation?.nom}</button>
              <span className="text-slate-300">›</span>
              <span className="text-[#0369A1] font-medium">Inscriptions • {selectedNiveau?.nom}</span>
            </div>
          </div>
          <p className="mb-4 text-xs text-slate-400 ml-12">{filteredInscriptions.length} étudiant(s)</p>

          {error && (
            <div className="mb-4 bg-red-50 rounded-md px-3 py-2">
              <p className="text-red-500 text-xs">{error}</p>
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-center gap-2 max-w-xl">
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
              <input placeholder="Rechercher un étudiant..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
            </div>
          </div>

          {loadingInscriptions ? (
            <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" /></div>
          ) : <InscriptionsTable />}
        </>
      )}

      {selectedInscription && (
        <EtudiantDetailModal inscription={selectedInscription} onClose={() => setSelectedInscription(null)}
          onSuccess={() => { setSelectedInscription(null); refetchInscriptions(); }} />
      )}
    </AdminLayout>
  );
};

export default FormationNiveaux;