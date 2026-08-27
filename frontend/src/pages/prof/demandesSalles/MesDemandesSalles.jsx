import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DoorOpen, Plus, X, Repeat, RefreshCw, Search, CalendarDays,
  Clock, CheckCircle2, XCircle, Layers,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const STATUT_STYLE = { en_attente: 'bg-amber-50 text-amber-600', approuvee: 'bg-emerald-50 text-emerald-600', refusee: 'bg-red-50 text-red-500' };
const STATUT_LABEL = { en_attente: 'En attente', approuvee: 'Approuvée', refusee: 'Refusée' };
const PERIODES = { matin: 'Matin', midi: 'A Midi' };
const PERIODE_BORNES = { matin: ['08:00', '13:00'], midi: ['13:00', '16:00'] };
const inp = 'w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 disabled:bg-slate-50';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-3 bg-white rounded-xl border border-[#F1F5F9] px-4 py-3">
    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center`}><Icon size={16} /></div>
    <div><p className="text-lg font-bold text-slate-800 leading-none">{value}</p><p className="text-[11px] text-slate-400 mt-1">{label}</p></div>
  </div>
);

const Field = ({ label, icon: Icon, ...props }) => (
  <div>
    <p className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">
      {Icon && <Icon size={10} className="text-[#0369A1]" />}{label}
    </p>
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

const emptyForm = { formation_id: '', groupe_id: '', message: '' };
const MesDemandesSalles = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({ search: '', statut: '', type: '', from: '', to: '' });
  const setF = (k) => (e) => setFilters((p) => ({ ...p, [k]: e.target.value }));

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
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center"><DoorOpen size={22} className="text-white" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Mes demandes de salle</h1>
            <p className="text-slate-400 text-xs mt-0.5">{filtered.length} / {demandes.length} demandes</p>
          </div>
        </div>
        <button onClick={openModal}
          className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-lg text-xs font-medium shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all">
          <Plus size={14} /> Demander une salle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard icon={Clock} label="En attente" value={counts[0]} color="bg-amber-50 text-amber-600" />
        <StatCard icon={CheckCircle2} label="Approuvées" value={counts[1]} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={XCircle} label="Refusées" value={counts[2]} color="bg-red-50 text-red-500" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative min-w-[160px] flex-1 max-w-[240px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1]" />
          <input placeholder="Rechercher…" value={filters.search} onChange={setF('search')}
            className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
        </div>
        <select value={filters.statut} onChange={setF('statut')} className="text-xs rounded-full py-1.5 px-3 bg-white border border-[#E2E8F0] text-slate-500">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.type} onChange={setF('type')} className="text-xs rounded-full py-1.5 px-3 bg-white border border-[#E2E8F0] text-slate-500">
          <option value="">Tous les types</option>
          <option value="remplacement">Remplacement</option>
          <option value="changement">Changement</option>
        </select>
        <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 border border-[#E2E8F0]">
          <CalendarDays size={12} className="text-[#0369A1]" />
          <input type="date" value={filters.from} onChange={setF('from')} className="text-xs bg-transparent focus:outline-none text-slate-500" />
          <span className="text-[#0369A1]/40 text-[10px] font-bold">–</span>
          <input type="date" value={filters.to} onChange={setF('to')} className="text-xs bg-transparent focus:outline-none text-slate-500" />
        </div>
        {activeFilters && (
          <button onClick={clearAll} className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50">
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
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
          <thead className="bg-[#DCEBFA]">
  <tr>
    <th className="text-left px-4 py-2.5 text-[#0369A1] font-semibold text-[10px] uppercase border-b border-[#E2E8F0]">
      <span className="flex items-center gap-1.5"><Layers size={12} /> Type</span>
    </th>
    <th className="text-left px-4 py-2.5 text-[#0369A1] font-semibold text-[10px] uppercase border-b border-[#E2E8F0]">Groupe</th>
    <th className="text-left px-4 py-2.5 text-[#0369A1] font-semibold text-[10px] uppercase border-b border-[#E2E8F0]">Jour / Horaire</th>
    <th className="text-left px-4 py-2.5 text-[#0369A1] font-semibold text-[10px] uppercase border-b border-[#E2E8F0]">
      <span className="flex items-center gap-1.5"><CalendarDays size={12} /> Date cible</span>
    </th>
    <th className="text-left px-4 py-2.5 text-[#0369A1] font-semibold text-[10px] uppercase border-b border-[#E2E8F0]">
      <span className="flex items-center gap-1.5"><CalendarDays size={12} /> Créée le</span>
    </th>
    <th className="text-left px-4 py-2.5 text-[#0369A1] font-semibold text-[10px] uppercase border-b border-[#E2E8F0]">
      <span className="flex items-center gap-1.5"><CheckCircle2 size={12} /> Statut</span>
    </th>
    <th className="text-left px-4 py-2.5 text-[#0369A1] font-semibold text-[10px] uppercase border-b border-[#E2E8F0]">Traité par</th>
  </tr>
</thead>
            <tbody>
              {filtered.map((d, i) => {
                const chg = d.data?.type_demande === 'changement';
                return (
                  <tr key={d.id} onClick={() => navigate(`/prof/mes-demandes-salles/${d.id}`)}
                    className={`cursor-pointer hover:bg-[#DCEBFA]/30 transition ${i % 2 ? 'bg-[#F8FCFF]' : 'bg-white'}`}>
                    <td className="px-4 py-2.5 border-b border-[#E2E8F0] text-slate-500">
                      <span className="flex items-center gap-1.5">{chg ? <RefreshCw size={12} /> : <Repeat size={12} />}{chg ? 'Changement' : 'Remplacement'}</span>
                    </td>
                    <td className="px-4 py-2.5 border-b border-[#E2E8F0] font-medium text-slate-700">{d.data?.groupe_nom || '—'}</td>
                    <td className="px-4 py-2.5 border-b border-[#E2E8F0] capitalize text-slate-600">{d.data?.jour_semaine} {d.data?.heure_debut?.slice(0, 5)}-{d.data?.heure_fin?.slice(0, 5)}</td>
                    <td className="px-4 py-2.5 border-b border-[#E2E8F0] text-slate-400">{d.data?.date_cible || '—'}</td>
<td className="px-4 py-2.5 border-b border-[#E2E8F0] text-slate-400">
  {d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : '—'}
</td>
                    <td className="px-4 py-2.5 border-b border-[#E2E8F0]">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${STATUT_STYLE[d.statut] || STATUT_STYLE.en_attente}`}>{STATUT_LABEL[d.statut] || 'En attente'}</span>
                    </td>
                    <td className="px-4 py-2.5 border-b border-[#E2E8F0] text-slate-400">{d.traite_par_nom || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] sticky top-0 bg-white">
              <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#DCEBFA] text-[#0369A1] flex items-center justify-center"><DoorOpen size={14} /></span>
                Demander une salle
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
            </div>

            <div className="p-5">
              {submitSuccess ? (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-lg px-4 py-3">Demande envoyée avec succès.</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
<div className="grid grid-cols-2 gap-3">
<Field label="Formation" icon={Layers} value={form.formation_id} onChange={(e) => setForm((p) => ({ ...p, formation_id: e.target.value, groupe_id: '' }))}
  options={formations.map((f) => ({ value: f.id, label: f.nom }))} />
<Field label="Groupe" icon={Layers} value={form.groupe_id} onChange={setV('groupe_id')} disabled={!form.formation_id}
  options={groupes.map((g) => ({ value: g.id, label: g.nom }))} />
                  </div>

                  <div className="border border-[#E2E8F0] rounded-lg p-3 space-y-3 bg-[#F8FAFC]">
                    {form.groupe_id && (
  <div className="mb-1">
    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Créneau actuel à changer/remplacer</p>
    {creneauxGroupe.length === 0 ? (
      <p className="text-xs text-slate-400 italic">Aucun créneau existant pour ce groupe.</p>
    ) : (
      <div className="space-y-1.5">
        {creneauxGroupe.map((c) => (
          <label
            key={c.id}
            className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-xs cursor-pointer transition ${
              creneauTemp.ancien_creneau_id === c.id ? 'border-[#0369A1] bg-[#F0F8FF]' : 'border-[#E2E8F0] hover:bg-slate-50'
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
<p className="text-[10px] text-slate-400 uppercase tracking-wide">Créneaux à changer/remplacer</p>

<div className="grid grid-cols-2 gap-3">
  <Field label="Jour" icon={CalendarDays} value={creneauTemp.jour_semaine} onChange={setCT('jour_semaine')} options={jours} />
  <Field label="Période" icon={Clock} value={creneauTemp.periode} onChange={setCT('periode')} options={Object.entries(PERIODES).map(([value, label]) => ({ value, label }))} />
  <Field label="Heure début" icon={Clock} type="time" value={creneauTemp.heure_debut} onChange={setCT('heure_debut')} min="08:00" max="16:00" />
  <Field label="Heure fin" icon={Clock} type="time" value={creneauTemp.heure_fin} onChange={setCT('heure_fin')}  min="08:00" max="16:00"/>
  <Field label="Type de demande" icon={Repeat} value={creneauTemp.type_demande}
    onChange={(e) => setCreneauTemp((p) => ({ ...p, type_demande: e.target.value, date_cible: '' }))}
    options={[{ value: 'remplacement', label: 'Remplacement (un jour)' }, { value: 'changement', label: "Changement d'horaire" }]} />
  <Field label={creneauTemp.type_demande === 'changement' ? 'À partir de' : 'Date remplacement'} icon={CalendarDays} type="date"
    value={creneauTemp.date_cible} onChange={setCT('date_cible')} disabled={!creneauTemp.type_demande} />
  <Field label="Salle souhaitée (optionnel)" icon={DoorOpen} value={creneauTemp.salle_souhaitee_id} onChange={setCT('salle_souhaitee_id')}
    options={salles.map((s) => ({ value: s.id, label: s.nom }))} />
</div>
{erreurCreneau && (
  <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erreurCreneau}</p>
)}
                    <button type="button" onClick={ajouterCreneau}
                      className="w-full text-xs font-medium text-[#0369A1] bg-[#DCEBFA]/50 hover:bg-[#DCEBFA] rounded-lg px-3 py-2 transition">
                      + Ajouter ce créneau
                    </button>

                    {creneaux.length > 0 && (
                      <div className="space-y-1.5">
{creneaux.map((c, i) => {
  const salleNom = salles.find((s) => s.id === c.salle_souhaitee_id)?.nom;
  return (
    <div key={i} className="flex items-center justify-between text-xs bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5">
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
                      className="w-full flex items-center justify-between text-xs font-medium text-[#0369A1] bg-[#DCEBFA]/50 hover:bg-[#DCEBFA] rounded-lg px-3 py-2 transition">
                      <span className="flex items-center gap-1.5"><CalendarDays size={13} /> Voir l'emploi de l'école</span>
                      <span className="text-[10px]">{showEmploi ? 'Masquer' : 'Afficher'}</span>
                    </button>

                    {showEmploi && (
                      <div className="mt-2 border border-[#E2E8F0] rounded-lg overflow-hidden">
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
                                  <th className="border border-slate-100 px-2 py-2 bg-slate-900 text-white font-semibold sticky left-0 z-10" rowSpan={2}>
                                    Salle
                                  </th>
                                  {jours.map((j) => (
                                    <th key={j} colSpan={2}
                                      className={`border border-slate-100 px-2 py-1.5 font-semibold uppercase tracking-wide text-[9px] ${j === creneauTemp.jour_semaine ? 'bg-[#0369A1] text-white' : 'bg-slate-900 text-white'}`}>
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
                                    <td className="border border-slate-100 px-2 py-1.5 bg-slate-900 text-white font-medium whitespace-nowrap sticky left-0 z-10">
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
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Message (optionnel)</p>
                    <textarea value={form.message} onChange={setV('message')} rows={2} className={`${inp} resize-none`} placeholder="Précision utile pour l'admin…" />
                  </div>

                  {submitError && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{submitError}</p>}

                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setShowModal(false)} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
                    <button type="submit" disabled={submitting} className="text-xs px-4 py-1.5 rounded-lg bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40 font-medium">
                      {submitting ? 'Envoi…' : 'Envoyer la demande'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MesDemandesSalles;