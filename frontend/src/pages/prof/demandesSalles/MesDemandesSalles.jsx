import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DoorOpen, Plus, X, Repeat, RefreshCw, Search, CalendarDays,
  Clock, CheckCircle2, XCircle, Layers, ChevronDown,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const STATUT_STYLE = { en_attente: 'bg-amber-50 text-amber-600', approuvee: 'bg-emerald-50 text-emerald-600', refusee: 'bg-red-50 text-red-500' };
const STATUT_LABEL = { en_attente: 'En attente', approuvee: 'Approuvée', refusee: 'Refusée' };
const PERIODES = { matin: 'Matin', midi: 'A Midi' };
const PERIODE_BORNES = { matin: ['08:00', '13:00'], midi: ['13:00', '16:00'] };

const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors disabled:bg-slate-50 disabled:opacity-60';

const STAT_COLORS = {
  blue:    { bg: 'bg-[#DCEBFA]', text: 'text-[#0369A1]' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  red:     { bg: 'bg-red-50',     text: 'text-red-500' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
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

const Label = ({ icon: Icon, text, required }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} className="text-slate-500" />}{text}{required && <span className="text-red-500 ml-0.5">*</span>}
  </p>
);

const Field = ({ label, icon, required, ...props }) => (
  <div>
    <Label icon={icon} text={label} required={required} />
    {props.options ? (
      <select {...props} className={inp}>
        <option value="">Choisir…</option>
        {props.options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    ) : (
      <input {...props} className={inp} />
    )}
  </div>
);

const FilterSelect = ({ icon: Icon, label, value, onChange, opts, display }) => (
  <div className="relative flex items-center">
    {Icon && <Icon size={13} className="absolute left-2 text-[#0369A1] pointer-events-none" />}
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`appearance-none text-xs rounded-full py-1.5 pr-7 pl-7 bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer transition
        ${value ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}
    >
      <option value="">{label}</option>
      {opts.map((o) => <option key={o} value={o}>{display ? display(o) : o}</option>)}
    </select>
    {value ? (
      <button onClick={() => onChange('')} className="absolute right-2 text-slate-300 hover:text-red-400"><X size={11} /></button>
    ) : (
      <ChevronDown size={11} className="absolute right-2 text-slate-400 pointer-events-none" />
    )}
  </div>
);

const COLS = [
  { label: 'Type',           Icon: Layers },
  { label: 'Groupe',         Icon: null },
  { label: 'Jour / Horaire', Icon: Clock },
  { label: 'Date cible',     Icon: CalendarDays },
  { label: 'Créée le',       Icon: CalendarDays },
  { label: 'Statut',         Icon: CheckCircle2 },
  { label: 'Traité par',     Icon: null },
];

const emptyForm = { formation_id: '', groupe_id: '', message: '' };
const MesDemandesSalles = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ---- filters: logic unchanged, just the setter split so FilterSelect (value) and text input (event) both work ----
  const [filters, setFilters] = useState({ search: '', statut: '', type: '', from: '', to: '' });
  const setF = (k) => (e) => setFilters((p) => ({ ...p, [k]: e.target.value }));
  const setFV = (k) => (v) => setFilters((p) => ({ ...p, [k]: v }));

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [jours, setJours] = useState([]);
  const [salles, setSalles] = useState([]);
  const [mesGroupes, setMesGroupes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const setV = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const [creneaux, setCreneaux] = useState([]);
  const [creneauxGroupe, setCreneauxGroupe] = useState([]);
  const [creneauTemp, setCreneauTemp] = useState({ jour_semaine: '', periode: '', heure_debut: '', heure_fin: '', type_demande: '', date_cible: '', salle_souhaitee_id: '', ancien_creneau_id: '' });
  const setCT = (k) => (e) => setCreneauTemp((p) => ({ ...p, [k]: e.target.value }));

  const [erreurCreneau, setErreurCreneau] = useState(null);

  const ajouterCreneau = () => {
    const { jour_semaine, periode, heure_debut, heure_fin, type_demande, date_cible, ancien_creneau_id } = creneauTemp;
    setErreurCreneau(null);
    if (!jour_semaine || !periode || !heure_debut || !heure_fin || !type_demande || !date_cible) {
      return setErreurCreneau('Merci de remplir tous les champs.');
    }
    if (creneauxGroupe.length > 0 && !ancien_creneau_id) {
      return setErreurCreneau('Sélectionnez le créneau existant à changer/remplacer.');
    }
    if (heure_debut < '08:00' || heure_fin > '16:00' || heure_debut >= heure_fin) {
      return setErreurCreneau('Les horaires doivent être compris entre 08:00 et 16:00.');
    }
    setCreneaux((p) => [...p, { ...creneauTemp }]);
    setCreneauTemp({ jour_semaine: '', periode: '', heure_debut: '', heure_fin: '', type_demande: '', date_cible: '', salle_souhaitee_id: '', ancien_creneau_id: '' });
  };
  const retirerCreneau = (idx) => setCreneaux((p) => p.filter((_, i) => i !== idx));

  const [showEmploi, setShowEmploi] = useState(false);
  const [emploiData, setEmploiData] = useState([]);
  const [emploiLoading, setEmploiLoading] = useState(false);

  const toggleEmploi = async () => {
    if (!showEmploi && emploiData.length === 0) {
      setEmploiLoading(true);
      try {
        const res = await fetch(`${API}/api/schedules/apercu`, { headers: headers() });
        if (res.ok) setEmploiData(await res.json());
      } finally { setEmploiLoading(false); }
    }
    setShowEmploi((v) => !v);
  };

  const getOccupants = (salleNom, jour, periode) => {
    const [debut, fin] = PERIODE_BORNES[periode] || ['08:00', '16:00'];
    return emploiData.filter((s) =>
      s.salle === salleNom && s.jour_semaine === jour &&
      s.heure_debut < fin && s.heure_fin > debut
    );
  };

  const load = async () => {
    const res = await fetch(`${API}/api/notifications/mes-demandes`, { headers: headers() });
    if (res.ok) setDemandes(await res.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openModal = async () => {
    setForm(emptyForm); setCreneaux([]); setCreneauTemp({ jour_semaine: '', periode: '', heure_debut: '', heure_fin: '', type_demande: '', date_cible: '', salle_souhaitee_id: '', ancien_creneau_id: '' }); setSubmitError(null); setSubmitSuccess(false); setShowModal(true);
    const [j, s, g] = await Promise.all([
      fetch(`${API}/api/schedules/jours`, { headers: headers() }),
      fetch(`${API}/api/schedules/salles`, { headers: headers() }),
      fetch(`${API}/api/groups/me`, { headers: headers() }),
    ]);
    if (j.ok) setJours(await j.json());
    if (s.ok) setSalles(await s.json());
    if (g.ok) setMesGroupes(await g.json());
  };

  useEffect(() => {
    if (!form.groupe_id) { setCreneauxGroupe([]); return; }
    fetch(`${API}/api/schedules/group/${form.groupe_id}`, { headers: headers() })
      .then((r) => (r.ok ? r.json() : []))
      .then(setCreneauxGroupe)
      .catch(() => setCreneauxGroupe([]));
  }, [form.groupe_id]);

  const formations = Array.from(new Map(mesGroupes.map((g) => [g.formation_id, g.formations])).values()).filter(Boolean);
  const groupes = mesGroupes.filter((g) => g.formation_id === form.formation_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const required = ['formation_id', 'groupe_id'];
    if (required.some((k) => !form[k])) return setSubmitError('Merci de remplir tous les champs obligatoires.');
    if (creneaux.length === 0) return setSubmitError('Ajoutez au moins un créneau.');
    setSubmitting(true); setSubmitError(null);
    try {
      const results = await Promise.allSettled(
        creneaux.map((c) =>
          fetch(`${API}/api/notifications/demande-salle`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() },
            body: JSON.stringify({ ...form, ...c }),
          }).then((res) => { if (!res.ok) throw new Error(); })
        )
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) throw new Error(`${failed} créneau(x) sur ${creneaux.length} n'ont pas pu être envoyés.`);
      setSubmitSuccess(true); load();
      setTimeout(() => setShowModal(false), 1200);
    } catch (err) { setSubmitError(err.message || "Erreur lors de l'envoi."); }
    finally { setSubmitting(false); }
  };

  // ---- filtering logic: unchanged ----
  const filtered = useMemo(() => demandes.filter((d) => {
    const { search, statut, type, from, to } = filters;
    const txt = `${d.data?.groupe_nom || ''} ${d.data?.jour_semaine || ''}`.toLowerCase();
    if (search && !txt.includes(search.toLowerCase())) return false;
    if (statut && d.statut !== statut) return false;
    if (type && d.data?.type_demande !== type) return false;
    if (d.data?.date_cible) {
      const cible = new Date(d.data.date_cible);
      if (from && cible < new Date(from)) return false;
      if (to && cible > new Date(new Date(to).setHours(23, 59, 59, 999))) return false;
    }
    return true;
  }), [demandes, filters]);

  const counts = ['en_attente', 'approuvee', 'refusee'].map((s) => demandes.filter((d) => d.statut === s).length);
  const activeFilters = Object.values(filters).some(Boolean);
  const clearAll = () => setFilters({ search: '', statut: '', type: '', from: '', to: '' });

  if (loading) return <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-[#0F2A4A] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0"><DoorOpen size={22} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Mes demandes de salle</h1>
            <p className="text-slate-400 text-xs mt-0.5">{filtered.length} / {demandes.length} demandes</p>
          </div>
        </div>
        <button onClick={openModal}
          className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all">
          <Plus size={14} /> Demander une salle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <StatTile icon={Clock} label="En attente" value={counts[0]} color="amber" />
        <StatTile icon={CheckCircle2} label="Approuvées" value={counts[1]} color="emerald" />
        <StatTile icon={XCircle} label="Refusées" value={counts[2]} color="red" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative min-w-[160px] flex-1 max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input placeholder="Rechercher…" value={filters.search} onChange={setF('search')}
            className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
        </div>

        <div className="w-px h-5 bg-[#E2E8F0]" />

        <FilterSelect icon={CheckCircle2} label="Tous les statuts" value={filters.statut} onChange={setFV('statut')}
          opts={Object.keys(STATUT_LABEL)} display={(o) => STATUT_LABEL[o]} />
        <FilterSelect icon={Layers} label="Tous les types" value={filters.type} onChange={setFV('type')}
          opts={['remplacement', 'changement']} display={(o) => (o === 'changement' ? 'Changement' : 'Remplacement')} />

        <div className="w-px h-5 bg-[#E2E8F0]" />

        <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 border border-[#E2E8F0]">
          <CalendarDays size={12} className="text-[#0369A1] flex-shrink-0" />
          <input type="date" value={filters.from} onChange={setF('from')}
            className={`text-xs bg-transparent focus:outline-none transition ${filters.from ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
          <span className="text-[#0369A1]/40 text-[10px] font-bold px-0.5">–</span>
          <input type="date" value={filters.to} onChange={setF('to')}
            className={`text-xs bg-transparent focus:outline-none transition ${filters.to ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
        </div>

        {activeFilters && (
          <button onClick={clearAll} className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50">
            <X size={11} /> Tout effacer
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-[0_2px_10px_rgba(15,42,74,0.08)] py-16 text-center">
          <DoorOpen size={28} className="mx-auto text-slate-200 mb-2" />
          <p className="text-sm text-[#94A3B8]">Aucune demande trouvée.</p>
        </div>
      ) : (
        <>
        <div className="hidden md:block bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
          <div className="overflow-x-auto">
            <table style={{ tableLayout: 'fixed', width: '100%' }} className="text-xs">
              <colgroup>
                {COLS.map((c) => <col key={c.label} />)}
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
                {filtered.map((d, i) => {
                  const chg = d.data?.type_demande === 'changement';
                  return (
                    <tr key={d.id} onClick={() => navigate(`/prof/mes-demandes-salles/${d.id}`)}
                      className={`hover:bg-slate-50 transition cursor-pointer ${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                      <td className="px-3 py-2 border-b border-l border-slate-100 text-slate-500 overflow-hidden">
                        <span className="flex items-center gap-1.5">{chg ? <RefreshCw size={12} /> : <Repeat size={12} />}{chg ? 'Changement' : 'Remplacement'}</span>
                      </td>
                      <td className="px-3 py-2 border-b border-slate-100 font-medium text-slate-700 truncate">{d.data?.groupe_nom || '—'}</td>
                      <td className="px-3 py-2 border-b border-slate-100 capitalize text-slate-600 truncate">{d.data?.jour_semaine} {d.data?.heure_debut?.slice(0, 5)}-{d.data?.heure_fin?.slice(0, 5)}</td>
                      <td className="px-3 py-2 border-b border-slate-100 text-slate-400 truncate">{d.data?.date_cible || '—'}</td>
                      <td className="px-3 py-2 border-b border-slate-100 text-slate-400 truncate">
                        {d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-3 py-2 border-b border-slate-100 overflow-hidden">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${STATUT_STYLE[d.statut] || STATUT_STYLE.en_attente}`}>{STATUT_LABEL[d.statut] || 'En attente'}</span>
                      </td>
                      <td className="px-3 py-2 border-b border-slate-100 text-slate-400 truncate">{d.traite_par_nom || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {filtered.map((d) => {
            const chg = d.data?.type_demande === 'changement';
            return (
              <div
                key={d.id}
                onClick={() => navigate(`/prof/mes-demandes-salles/${d.id}`)}
                className="bg-white rounded-xl border border-[#F1F5F9] shadow-[0_2px_10px_rgba(15,42,74,0.06)] p-3.5 space-y-2 active:bg-slate-50 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    {chg ? <RefreshCw size={12} /> : <Repeat size={12} />}
                    {chg ? 'Changement' : 'Remplacement'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${STATUT_STYLE[d.statut] || STATUT_STYLE.en_attente}`}>
                    {STATUT_LABEL[d.statut] || 'En attente'}
                  </span>
                </div>

                <p className="font-medium text-slate-700 text-sm">{d.data?.groupe_nom || '—'}</p>

                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock size={11} className="text-[#0369A1]" />
                    <span className="capitalize">{d.data?.jour_semaine} {d.data?.heure_debut?.slice(0, 5)}-{d.data?.heure_fin?.slice(0, 5)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarDays size={11} className="text-[#0369A1]" />
                    <span>{d.data?.date_cible || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Créée le {d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : '—'}</span>
                  <span>{d.traite_par_nom || '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-md shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
                    <DoorOpen size={14} className="text-white" />
                  </span>
                  Demander une salle
                </h2>
                <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
              </div>
              {submitError && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 mx-5 mb-3 rounded-md">{submitError}</p>}
            </div>

            <div className="p-5">
              {submitSuccess ? (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-md px-4 py-3">Demande envoyée avec succès.</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Formation" icon={Layers} required value={form.formation_id} onChange={(e) => setForm((p) => ({ ...p, formation_id: e.target.value, groupe_id: '' }))}
                      options={formations.map((f) => ({ value: f.id, label: f.nom }))} />
                    <Field label="Groupe" icon={Layers} required value={form.groupe_id} onChange={setV('groupe_id')} disabled={!form.formation_id}
                      options={groupes.map((g) => ({ value: g.id, label: g.nom }))} />
                  </div>

                  <div className="border border-slate-200 rounded-md p-3 space-y-3 bg-[#F8FAFC]">
                    {form.groupe_id && (
                      <div className="mb-1">
                        <Label text="Créneau actuel à changer/remplacer" />
                        {creneauxGroupe.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Aucun créneau existant pour ce groupe.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {creneauxGroupe.map((c) => (
                              <label
                                key={c.id}
                                className={`flex items-center gap-2 border rounded-md px-3 py-2 text-xs cursor-pointer transition ${
                                  creneauTemp.ancien_creneau_id === c.id ? 'border-[#0369A1] bg-[#F0F8FF]' : 'border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="ancien_creneau"
                                  checked={creneauTemp.ancien_creneau_id === c.id}
                                  onChange={() => setCreneauTemp((p) => ({ ...p, ancien_creneau_id: c.id }))}
                                />
                                <span className="capitalize text-slate-700">
                                  {c.jour_semaine} · {PERIODES[c.periode] || c.periode} · {c.heure_debut?.slice(0, 5)}–{c.heure_fin?.slice(0, 5)} · {c.salle}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <Label text="Créneaux à changer/remplacer" />

                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Jour" icon={CalendarDays} value={creneauTemp.jour_semaine} onChange={setCT('jour_semaine')} options={jours} />
                      <Field label="Période" icon={Clock} value={creneauTemp.periode} onChange={setCT('periode')} options={Object.entries(PERIODES).map(([value, label]) => ({ value, label }))} />
                      <Field label="Heure début" icon={Clock} type="time" value={creneauTemp.heure_debut} onChange={setCT('heure_debut')} min="08:00" max="16:00" />
                      <Field label="Heure fin" icon={Clock} type="time" value={creneauTemp.heure_fin} onChange={setCT('heure_fin')} min="08:00" max="16:00" />
                      <Field label="Type de demande" icon={Repeat} value={creneauTemp.type_demande}
                        onChange={(e) => setCreneauTemp((p) => ({ ...p, type_demande: e.target.value, date_cible: '' }))}
                        options={[{ value: 'remplacement', label: 'Remplacement (un jour)' }, { value: 'changement', label: "Changement d'horaire" }]} />
                      <Field label={creneauTemp.type_demande === 'changement' ? 'À partir de' : 'Date remplacement'} icon={CalendarDays} type="date"
                        value={creneauTemp.date_cible} onChange={setCT('date_cible')} disabled={!creneauTemp.type_demande} />
                      <Field label="Salle souhaitée (optionnel)" icon={DoorOpen} value={creneauTemp.salle_souhaitee_id} onChange={setCT('salle_souhaitee_id')}
                        options={salles.map((s) => ({ value: s.id, label: s.nom }))} />
                    </div>
                    {erreurCreneau && (
                      <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-md px-3 py-2">{erreurCreneau}</p>
                    )}
                    <button type="button" onClick={ajouterCreneau}
                      className="w-full text-xs font-medium text-[#0369A1] bg-[#DCEBFA]/50 hover:bg-[#DCEBFA] rounded-md px-3 py-2 transition">
                      + Ajouter ce créneau
                    </button>

                    {creneaux.length > 0 && (
                      <div className="space-y-1.5">
                        {creneaux.map((c, i) => {
                          const salleNom = salles.find((s) => s.id === c.salle_souhaitee_id)?.nom;
                          return (
                            <div key={i} className="flex items-center justify-between text-xs bg-white border border-slate-200 rounded-md px-3 py-1.5">
                              <span className="text-slate-700 capitalize">
                                {c.jour_semaine} · {PERIODES[c.periode] || c.periode} · {c.heure_debut}–{c.heure_fin} · {c.type_demande === 'changement' ? 'Changement' : 'Remplacement'} le {c.date_cible}{salleNom ? ` · ${salleNom}` : ''}
                              </span>
                              <button type="button" onClick={() => retirerCreneau(i)} className="text-red-400 hover:text-red-600"><X size={13} /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <button type="button" onClick={toggleEmploi}
                      className="w-full flex items-center justify-between text-xs font-medium text-[#0369A1] bg-[#DCEBFA]/50 hover:bg-[#DCEBFA] rounded-md px-3 py-2 transition">
                      <span className="flex items-center gap-1.5"><CalendarDays size={13} /> Voir l'emploi de l'école</span>
                      <span className="text-[10px]">{showEmploi ? 'Masquer' : 'Afficher'}</span>
                    </button>

                    {showEmploi && (
                      <div className="mt-2 border border-slate-200 rounded-md overflow-hidden">
                        {emploiLoading ? (
                          <div className="flex justify-center py-6">
                            <div className="w-5 h-5 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : salles.length === 0 || jours.length === 0 ? (
                          <p className="text-[11px] text-slate-400 text-center py-4 px-3">Aucune donnée disponible.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="text-[10px] border-collapse w-full">
                              <thead>
                                <tr>
                                  <th className="border border-slate-100 px-2 py-2 bg-[#0F2A4A] text-white font-semibold sticky left-0 z-10" rowSpan={2}>
                                    Salle
                                  </th>
                                  {jours.map((j) => (
                                    <th key={j} colSpan={2}
                                      className={`border border-slate-100 px-2 py-1.5 font-semibold uppercase tracking-wide text-[9px] ${j === creneauTemp.jour_semaine ? 'bg-[#0369A1] text-white' : 'bg-[#0F2A4A] text-white'}`}>
                                      {j.charAt(0).toUpperCase() + j.slice(1)}
                                    </th>
                                  ))}
                                </tr>
                                <tr>
                                  {jours.map((j) => (
                                    <>
                                      <th key={`${j}-matin`} className={`border border-slate-100 px-2 py-1 font-semibold uppercase text-[8px] ${j === creneauTemp.jour_semaine ? 'bg-[#DCEBFA] text-[#0369A1]' : 'bg-white text-slate-500'}`}>Matin</th>
                                      <th key={`${j}-midi`} className={`border border-slate-100 px-2 py-1 font-semibold uppercase text-[8px] ${j === creneauTemp.jour_semaine ? 'bg-[#DCEBFA] text-[#0369A1]' : 'bg-white text-slate-500'}`}>À midi</th>
                                    </>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {[...salles].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true })).map((s, i) => (
                                  <tr key={s.id}>
                                    <td className="border border-slate-100 px-2 py-1.5 bg-[#0F2A4A] text-white font-medium whitespace-nowrap sticky left-0 z-10">
                                      {s.nom}
                                    </td>
                                    {jours.map((j) => {
                                      const matinList = getOccupants(s.nom, j, 'matin');
                                      const midiList = getOccupants(s.nom, j, 'midi');
                                      const highlight = j === creneauTemp.jour_semaine;
                                      return (
                                        <>
                                          <td key={`${s.id}-${j}-matin`} className={`border border-slate-100 px-2 py-1.5 ${highlight ? 'bg-[#DCEBFA]/30' : i % 2 ? 'bg-[#F8FCFF]' : 'bg-white'}`}>
                                            {matinList.length > 0 ? (
                                              <div className="flex flex-col gap-0.5">
                                                {matinList.map((c) => (
                                                  <span key={c.id} className="text-red-500 whitespace-nowrap">{c.heure_debut?.slice(0, 5)} - {c.heure_fin?.slice(0, 5)}</span>
                                                ))}
                                              </div>
                                            ) : <span className="text-emerald-600 font-medium">Libre</span>}
                                          </td>
                                          <td key={`${s.id}-${j}-midi`} className={`border border-slate-100 px-2 py-1.5 ${highlight ? 'bg-[#DCEBFA]/30' : i % 2 ? 'bg-[#F8FCFF]' : 'bg-white'}`}>
                                            {midiList.length > 0 ? (
                                              <div className="flex flex-col gap-0.5">
                                                {midiList.map((c) => (
                                                  <span key={c.id} className="text-red-500 whitespace-nowrap">{c.heure_debut?.slice(0, 5)} - {c.heure_fin?.slice(0, 5)}</span>
                                                ))}
                                              </div>
                                            ) : <span className="text-emerald-600 font-medium">Libre</span>}
                                          </td>
                                        </>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label text="Message (optionnel)" />
                    <textarea value={form.message} onChange={setV('message')} rows={2} className={`${inp} resize-none`} placeholder="Précision utile pour l'admin…" />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setShowModal(false)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
                    <button type="submit" disabled={submitting}
                      className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] disabled:opacity-40 transition-all font-medium">
                      {submitting ? 'Envoi…' : 'Envoyer la demande'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MesDemandesSalles;