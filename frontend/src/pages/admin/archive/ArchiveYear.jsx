import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import EtudiantDetailModal from '../students/EtudiantDetailModal';
import {
  ArrowLeft, BookOpen, ChevronRight, Users, UserCheck,
  Search, Phone, CalendarDays, PhoneCall, Megaphone, CheckCircle2,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const statutMeta = {
  confirmed:     { label: 'Confirmé',     cls: 'bg-blue-100 text-blue-700' },
  pending:       { label: 'En attente',   cls: 'bg-amber-100 text-amber-700' },
  non_confirmed: { label: 'Non confirmé', cls: 'bg-red-100 text-red-600' },
  rejected:      { label: 'Rejeté',       cls: 'bg-slate-100 text-slate-500' },
};

const tryMeta = {
  repondu:     'bg-emerald-100 text-emerald-700',
  non_repondu: 'bg-red-100 text-red-600',
  occupe:      'bg-orange-100 text-orange-600',
  injoignable: 'bg-slate-100 text-slate-500',
  P_bureau:    'bg-blue-100 text-blue-600',
  ferme:       'bg-violet-100 text-violet-600',
};

const Badge = ({ cls, children }) => (
  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>
    {children}
  </span>
);

const TABS = [
  { key: 'formations', label: 'Formations', Icon: BookOpen },
  { key: 'etudiants',  label: 'Étudiants',  Icon: UserCheck },
];

const COLS = [
  { label: 'Étudiant',   Icon: null,         width: 140 },
  { label: 'Tél.',       Icon: Phone,        width: 90  },
  { label: 'Formation',  Icon: Users,        width: 150 },
  { label: 'Groupe',     Icon: Users,        width: 110 },
  { label: 'Date',       Icon: CalendarDays, width: 80  },
  { label: '1er appel',  Icon: PhoneCall,    width: 100 },
  { label: '2ème appel', Icon: PhoneCall,    width: 100 },
  { label: '3ème appel', Icon: PhoneCall,    width: 100 },
  { label: 'Source',     Icon: Megaphone,    width: 110 },
  { label: 'Par',        Icon: UserCheck,    width: 80  },
  { label: 'Statut',     Icon: CheckCircle2, width: 96  },
];

const ArchiveYear = () => {
  const { year } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState('formations');

  // Formations tab
  const [formations, setFormations] = useState([]);
  const [loadingF, setLoadingF] = useState(true);
  const [errorF, setErrorF] = useState(null);

  // Étudiants tab
  const [etudiants, setEtudiants] = useState([]);
  const [loadingE, setLoadingE] = useState(false);
  const [errorE, setErrorE] = useState(null);
  const [etudiantsLoaded, setEtudiantsLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setLoadingF(true);
    fetch(`${API}/api/archive/years/${year}/formations`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('Erreur serveur');
        return r.json();
      })
      .then(setFormations)
      .catch((err) => setErrorF(err.message))
      .finally(() => setLoadingF(false));
  }, [year]);

  useEffect(() => {
    if (tab !== 'etudiants' || etudiantsLoaded) return;
    const token = localStorage.getItem('token');
    setLoadingE(true);
    fetch(`${API}/api/archive/years/${year}/etudiants`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('Erreur serveur');
        return r.json();
      })
      .then((data) => { setEtudiants(data); setEtudiantsLoaded(true); })
      .catch((err) => setErrorE(err.message))
      .finally(() => setLoadingE(false));
  }, [tab, etudiantsLoaded, year]);

  const filtered = etudiants.filter((i) => {
    if (!search) return true;
    const name = `${i.etudiant?.nom ?? ''} ${i.etudiant?.prenom ?? ''}`.toLowerCase();
    return name.includes(search.toLowerCase()) || (i.etudiant?.telephone ?? '').includes(search);
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate('/admin/archive')}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] hover:bg-gray-100 transition"
        >
          <ArrowLeft size={16} className="text-[#64748B]" />
        </button>
        <h1 className="text-2xl font-bold text-[#1E293B]">Archive — {year}</h1>
      </div>
      <p className="text-[#64748B] text-sm mb-5">
        {tab === 'formations' ? 'Sélectionnez une formation' : 'Tous les étudiants archivés pour cette année'}
      </p>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#E2E8F0]">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === key
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Formations tab ─────────────────────────────────────────── */}
      {tab === 'formations' && (
        <>
          {loadingF && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {errorF && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              Erreur : {errorF}
            </p>
          )}

          {!loadingF && !errorF && formations.length === 0 && (
            <p className="text-[#64748B] text-sm">Aucune formation archivée pour cette année.</p>
          )}

          {!loadingF && !errorF && formations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {formations.map((f) => (
                <div
                  key={f.id}
                  onClick={() => navigate(`/admin/archive/${year}/${f.id}`)}
                  className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md hover:border-[#2563EB] cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 bg-[#EFF6FF] rounded-lg flex items-center justify-center">
                      <BookOpen size={20} className="text-[#2563EB]" />
                    </div>
                    <ChevronRight size={18} className="text-[#94A3B8] group-hover:text-[#2563EB] transition" />
                  </div>
                  <h2 className="text-lg font-bold text-[#1E293B] mb-3">{f.nom}</h2>
                  <div className="flex gap-4 text-xs text-[#64748B]">
                    <span className="flex items-center gap-1"><Users size={13} /> {f.nb_groupes_archives} groupe(s)</span>
                    <span className="flex items-center gap-1"><UserCheck size={13} /> {f.nb_inscriptions_archivees} inscription(s)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Étudiants tab ──────────────────────────────────────────── */}
      {tab === 'etudiants' && (
        <>
          <div className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 mb-4 flex items-center gap-2 shadow-sm">
            <div className="relative min-w-[160px] max-w-[260px] flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
              <input
                placeholder="Nom, téléphone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
              />
            </div>
            <span className="ml-auto text-[11px] text-[#94A3B8]">{filtered.length} / {etudiants.length} inscriptions</span>
          </div>

          {loadingE && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {errorE && (
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              Erreur : {errorE}
            </p>
          )}

          {!loadingE && !errorE && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table style={{ tableLayout: 'fixed', width: '100%' }} className="text-xs">
                  <colgroup>
                    {COLS.map((c) => <col key={c.label} style={{ width: `${c.width}px` }} />)}
                  </colgroup>
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <tr>
                      {COLS.map(({ label, Icon }) => (
                        <th key={label} className="text-left px-3 py-2.5 text-[#64748B] font-semibold text-[10px] tracking-wide uppercase overflow-hidden">
                          <div className="flex items-center gap-1">
                            {Icon && <Icon size={11} className="text-[#94A3B8] flex-shrink-0" />}
                            <span className="truncate">{label}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={COLS.length} className="text-center py-10 text-[#94A3B8]">Aucun étudiant trouvé.</td></tr>
                    ) : filtered.map((i) => {
                      const sm = statutMeta[i.statut];
                      return (
                        <tr key={i.id} onClick={() => setSelected(i)} className="hover:bg-blue-50/40 transition cursor-pointer">
                          <td className="px-3 py-2 overflow-hidden">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">
                                {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                              </div>
                              <span className="font-medium text-[#1E293B] truncate">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-[#64748B] truncate">{i.etudiant?.telephone ?? '—'}</td>
                          <td className="px-3 py-2 overflow-hidden">
                            {i.formation?.nom
                              ? <Badge cls="bg-blue-100 text-blue-700 truncate block max-w-full">{i.formation.nom}</Badge>
                              : <span className="text-[#CBD5E1]">—</span>}
                          </td>
                          <td className="px-3 py-2 text-[#64748B] truncate">{i.groups?.nom ?? '—'}</td>
                          <td className="px-3 py-2 text-[#94A3B8] truncate">
                            {i.date_inscription ? new Date(i.date_inscription).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          {['first_try', 'second_try', 'third_try'].map((f) => (
                            <td key={f} className="px-2 py-2 overflow-hidden">
                              {i[f] ? <Badge cls={tryMeta[i[f]] ?? 'bg-slate-100 text-[#94A3B8]'}>{i[f]}</Badge> : <span className="text-[#CBD5E1]">—</span>}
                            </td>
                          ))}
                          <td className="px-2 py-2 overflow-hidden">
                            {i.source ? <Badge cls="bg-slate-100 text-[#64748B] truncate block max-w-full">{i.source}</Badge> : <span className="text-[#CBD5E1]">—</span>}
                          </td>
                          <td className="px-2 py-2 overflow-hidden">
                            {i.registered_by ? <Badge cls="bg-slate-100 text-[#64748B] truncate block max-w-full">{i.registered_by}</Badge> : <span className="text-[#CBD5E1]">—</span>}
                          </td>
                          <td className="px-2 py-2 overflow-hidden">
                            <Badge cls={sm?.cls ?? 'bg-slate-100 text-[#64748B]'}>{sm?.label ?? i.statut}</Badge>
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

      {selected && (
        <EtudiantDetailModal
          inscription={selected}
          readOnly
          onClose={() => setSelected(null)}
        />
      )}
    </AdminLayout>
  );
};

export default ArchiveYear;