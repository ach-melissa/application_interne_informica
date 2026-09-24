import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Wallet, Plus, Check, X, RotateCcw,
  Camera, ZoomIn, Image as ImageIcon, DollarSign, Receipt, GraduationCap, PieChart, School, Send,
} from 'lucide-react';
import { fmt, API, getHeaders } from './SalairesProfesseurs';

const CARD = 'bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)]';
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const STATUT_HISTO = { paye: { label: 'Payé', cls: 'bg-emerald-50 text-emerald-600' }, partiel: { label: 'Partiel', cls: 'bg-amber-50 text-amber-600' }, non_paye: { label: 'Non payé', cls: 'bg-red-50 text-red-500' } };
// TODO API: pas encore d'endpoint d'historique des bilans passés
const MOCK_HISTORIQUE = [
  { mois: 'Août 2026', montant: 52000, paye: 52000, statut: 'paye' },
  { mois: 'Juillet 2026', montant: 48000, paye: 20000, statut: 'partiel' },
];
const TYPES_MVT = { particulier: { label: 'Particulier', signe: 1 }, avance: { label: 'Avance', signe: -1 }, prime: { label: 'Prime', signe: 1 }, retenue: { label: 'Retenue', signe: -1 } };

const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1]';
const Label = ({ text, required }) => <p className="text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">{text}{required && <span className="text-red-500 ml-0.5">*</span>}</p>;

const StatTile = ({ icon: Icon, label, value, color }) => {
  const colors = { blue: 'bg-[#DCEBFA] text-[#0369A1]', amber: 'bg-amber-50 text-amber-600' };
  return (
    <div className={`${CARD} p-3.5 flex items-center gap-3`}>
      <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colors[color]}`}><Icon size={15} /></span>
      <div className="min-w-0"><p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p><p className="text-sm font-bold text-slate-800 truncate">{value}</p></div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Appels API                                                          */
/* ------------------------------------------------------------------ */
const jsonOrThrow = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
};

const fetchBilan = (teacherId, mois, annee) =>
  fetch(`${API}/api/salaires-professeurs/${teacherId}/bilan?mois=${mois}&annee=${annee}`, { headers: getHeaders() }).then(jsonOrThrow);

const putFormationDetail = (teacherId, formationId, payload) =>
  fetch(`${API}/api/salaires-professeurs/${teacherId}/bilan/formation/${formationId}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(payload) }).then(jsonOrThrow);

const postMouvement = (teacherId, payload) =>
  fetch(`${API}/api/salaires-professeurs/${teacherId}/bilan/mouvements`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) }).then(jsonOrThrow);

const deleteMouvementApi = (mouvementId) =>
  fetch(`${API}/api/salaires-professeurs/mouvements/${mouvementId}`, { method: 'DELETE', headers: getHeaders() }).then(jsonOrThrow);

const putTotal = (teacherId, payload) =>
  fetch(`${API}/api/salaires-professeurs/${teacherId}/bilan/total`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(payload) }).then(jsonOrThrow);

const postValider = (teacherId, payload) =>
  fetch(`${API}/api/salaires-professeurs/${teacherId}/bilan/valider`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) }).then(jsonOrThrow);

const putPaye = (teacherId, payload) =>
  fetch(`${API}/api/salaires-professeurs/${teacherId}/bilan/paye`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(payload) }).then(jsonOrThrow);

const postEnvoyer = (teacherId, payload) =>
  fetch(`${API}/api/salaires-professeurs/${teacherId}/bilan/envoyer`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) }).then(jsonOrThrow);

/* ------------------------------------------------------------------ */
/*  Modal d'ajout d'un mouvement                                       */
/* ------------------------------------------------------------------ */
const AjoutMouvementModal = ({ formations, onClose, onSubmit }) => {
  const [type, setType] = useState('avance');
  const [source, setSource] = useState('existante');
  const [formation, setFormation] = useState(formations[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [montant, setMontant] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingBons, setPendingBons] = useState([]); // TODO API: upload vers Supabase Storage pas encore branché
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const fileInputRef = useRef(null);

  const submit = async () => {
    const isFormationMvt = type === 'particulier' && source === 'existante';
    const formationSel = isFormationMvt ? formations.find((f) => f.id === formation) : null;
    const desc = isFormationMvt ? (formationSel?.nom ?? '') : description;
    if (!desc.trim()) return setError('Renseignez une description.');
    if (!(Number(montant) > 0)) return setError('Renseignez un montant.');
    setError('');
    setSaving(true);
    try {
      await onSubmit({ type, description: desc, montant: Number(montant), formationId: formationSel?.id });
      onClose();
    } catch (err) {
      setError(err.message || "Le mouvement n'a pas pu être enregistré.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingBons((prev) => [...prev, { file, preview: URL.createObjectURL(file) }]);
    e.target.value = '';
  };
  const removeBon = (idx) => setPendingBons((prev) => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx); });

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0"><Wallet size={14} className="text-white" /></span>
              Ajouter un mouvement
            </h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>
          {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 mx-5 mb-3 rounded-md">{error}</p>}
        </div>

        <div className="p-5 space-y-3">
          <div>
            <Label text="Type" required />
            <select value={type} onChange={(e) => setType(e.target.value)} className={inp}>
              <option value="avance">Avance</option>
              <option value="retenue">Retenue</option>
              <option value="prime">Prime</option>
              <option value="particulier">Particulier</option>
            </select>
          </div>

          {type === 'particulier' ? (
            <>
              <div>
                <Label text="Formation" required />
                <select value={source} onChange={(e) => setSource(e.target.value)} className={inp}>
                  <option value="existante">Formation existante</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              {source === 'existante' ? (
                <div>
                  <Label text="Choisir une formation" required />
                  <select value={formation} onChange={(e) => setFormation(e.target.value)} className={inp}>
                    {formations.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <Label text="Description" required />
                  <input value={description} onChange={(e) => setDescription(e.target.value)} className={inp} placeholder="Ex : Cours particulier ponctuel" />
                </div>
              )}
            </>
          ) : (
            <div>
              <Label text="Description" required />
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inp} placeholder="Ex : Acompte de mi-mois" />
            </div>
          )}

          <div>
            <Label text="Montant (DA)" required />
            <input type="number" min="0" value={montant} onChange={(e) => setMontant(e.target.value)} className={inp} placeholder="0" />
          </div>

          <div>
            <Label text="Bons (photos)" />
            <div className="flex flex-wrap gap-2">
              {pendingBons.map((p, idx) => (
                <div key={idx} className="relative group">
                  <button type="button" onClick={() => setLightboxUrl(p.preview)}>
                    <img src={p.preview} alt="bon" className="w-14 h-14 rounded-md object-cover border border-slate-200 group-hover:opacity-80 transition" />
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><ZoomIn size={14} className="text-white drop-shadow" /></span>
                  </button>
                  <button type="button" onClick={() => removeBon(idx)} className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow text-slate-400 hover:text-red-500 transition"><X size={11} /></button>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-md border border-dashed border-slate-300 hover:border-[#0369A1]/50 flex items-center justify-center text-slate-400 hover:text-[#0369A1] transition"><Camera size={16} /></button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <p className="text-[10px] text-slate-400 mt-1">L'envoi des bons n'est pas encore branché côté serveur.</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
            <button onClick={submit} disabled={saving} className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white hover:bg-[#16385f] font-medium flex items-center gap-1 disabled:opacity-50">
              <Check size={12} /> Enregistrer
            </button>
          </div>
        </div>
      </div>
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Bon" className="max-w-lg w-full rounded-md shadow-2xl object-contain max-h-[80vh]" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>,
    document.body
  );
};

/* ------------------------------------------------------------------ */
/*  Détail "pourcentage" — travaille sur un state LOCAL au modal        */
/* ------------------------------------------------------------------ */
const DetailPourcentage = ({ f, professeur, charges, state, onChange, onToggleCharge }) => {
  const revenus = state.revenusOverride ?? 0; // TODO API: calcul auto (prix × nb étudiants) en attente
  const totalCharges = charges.filter((c) => state.charges.includes(c.id)).reduce((s, c) => s + Number(c.montant), 0);
  const apresCharges = revenus - totalCharges;
  const partProf = Math.round(apresCharges * (state.part / 100));
  const partEcole = apresCharges - partProf;

  return (
    <div className="text-xs space-y-3">
      {professeur && <p className="text-slate-500">Professeur : <span className="font-semibold text-slate-700">{professeur}</span></p>}

      <div className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2.5">
        <p className="flex items-center gap-1.5 font-semibold text-slate-600 mb-1"><GraduationCap size={13} className="text-[#0369A1]" /> Revenus de la formation</p>
        <div className="flex items-center gap-1">
          <input
            type="number" min="0" value={revenus}
            onChange={(e) => onChange({ revenusOverride: e.target.value === '' ? 0 : Number(e.target.value) })}
            className="flex-1 text-right font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0369A1]/30"
          />
          <span className="text-slate-500 shrink-0">DA</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Saisie manuelle (calcul automatique via inscriptions pas encore disponible).</p>
      </div>

      <div className="relative">
        <p className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wide mb-1"><Receipt size={12} className="text-[#0369A1]" /> Charges à déduire</p>
        <details className="group">
          <summary className="list-none cursor-pointer flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-600">
            <span>{state.charges.length === 0 ? 'Aucune charge sélectionnée' : `${state.charges.length} charge(s) sélectionnée(s)`}</span>
            <ChevronDown size={13} className="text-slate-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-1 border border-slate-200 rounded-md divide-y divide-slate-100 overflow-hidden">
            {charges.length === 0 && <p className="px-2.5 py-2 text-slate-400">Aucune charge disponible.</p>}
            {charges.map((c) => (
              <label key={c.id} className="flex items-center justify-between px-2.5 py-1.5 bg-white hover:bg-slate-50 cursor-pointer">
                <span className="flex items-center gap-2"><input type="checkbox" checked={state.charges.includes(c.id)} onChange={() => onToggleCharge(c.id)} className="accent-[#0369A1]" /> {c.description}</span>
                <span className="text-slate-500">{fmt(Number(c.montant))}</span>
              </label>
            ))}
          </div>
        </details>
        <div className="flex justify-between text-slate-500 mt-1.5"><span>Total charges</span><span className="font-medium text-slate-700">{fmt(totalCharges)}</span></div>
      </div>

      <div className="border-t border-[#F1F5F9]" />
      <div className="flex justify-between text-slate-700 font-semibold"><span>Revenu après charges</span><span>{fmt(apresCharges)}</span></div>

      <div className="flex items-center justify-between">
        <span className="text-slate-600">Part professeur</span>
        <span className="flex items-center gap-1">
          <input type="number" min="0" max="100" value={state.part} onChange={(e) => onChange({ part: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} className="w-14 text-right border border-slate-200 rounded-md px-1.5 py-1" />
          <span className="text-slate-400">%</span>
        </span>
      </div>
      <div className="flex justify-between text-slate-400"><span>Part école</span><span>{100 - state.part}%</span></div>

      <div className="border-t border-[#F1F5F9]" />
      <div className="flex justify-between font-semibold text-[#0369A1]"><span className="flex items-center gap-1.5"><PieChart size={13} /> Professeur</span><span>{fmt(partProf)}</span></div>
      <div className="flex justify-between font-semibold text-slate-500"><span className="flex items-center gap-1.5"><School size={13} /> École</span><span>{fmt(partEcole)}</span></div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Modale formation — state local, "Enregistrer" envoie le patch      */
/* ------------------------------------------------------------------ */
const FormationModal = ({ f, professeur, charges, onClose, onSave }) => {
const [seances, setSeances] = useState(String(f.heuresEffectuees ?? 0));
const [pct, setPct] = useState({ part: f.part ?? (Number(f.montant) || 40), revenusOverride: f.revenusOverride ?? null, charges: f.charges ?? [] });
const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleCharge = (id) => setPct((p) => ({ ...p, charges: p.charges.includes(id) ? p.charges.filter((c) => c !== id) : [...p.charges, id] }));

  const montant = f.typeSalaire === 'Fixe' ? Number(f.montant)
    : f.typeSalaire === "À l'heure" ? Math.round((Number(seances) || 0) * Number(f.montant))
    : Math.round(((pct.revenusOverride ?? 0) - charges.filter((c) => pct.charges.includes(c.id)).reduce((s, c) => s + Number(c.montant), 0)) * (pct.part / 100));

    const resetAuto = async () => {
  setSaving(true); setError('');
  try { await onSave({ seances: null }); onClose(); }
  catch (err) { setError(err.message || 'Erreur.'); }
  finally { setSaving(false); }
};

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      if (f.typeSalaire === "À l'heure" && Number(seances) !== Number(f.heuresEffectuees)) await onSave({ seances: Number(seances) || 0 });
      else if (f.typeSalaire === 'Pourcentage') await onSave({ part: pct.part, revenusOverride: pct.revenusOverride, charges: pct.charges });
      onClose();
    } catch (err) {
      setError(err.message || "La formation n'a pas pu être enregistrée.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9] flex items-center justify-between px-5 py-4">
          <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0"><Wallet size={14} className="text-white" /></span>
            {f.nom}
          </h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
        </div>
        {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 mx-5 mt-3 rounded-md">{error}</p>}

        <div className="p-5">
          {f.typeSalaire === "À l'heure" && (
            <div className="text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <CalendarDays size={13} className="text-[#0369A1]" />
               <input type="number" min="0" step="0.5" value={seances} onChange={(e) => setSeances(e.target.value)} className={`${inp} w-20 text-right`} />
<span className="text-slate-500">heure(s) effectuée(s)</span>
              </div>
<p className="text-slate-400">{seances || 0} heure(s) × {fmt(Number(f.montant))} = <b className="text-slate-800">{fmt(montant)}</b></p>
{f.heuresOverride == null && f.seancesSansDuree > 0 && (
  <p className="text-amber-600">{f.seancesSansDuree} séance(s) sans durée : comptées 0h.</p>
)}
{f.heuresOverride != null && (
  <button type="button" onClick={resetAuto} className="text-[11px] text-amber-600 hover:underline">Revenir au calcul automatique</button>
)}
</div>
          )}
          {f.typeSalaire === 'Fixe' && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500"><Wallet size={13} className="text-[#0369A1]" /> Forfait fixe de {fmt(Number(f.montant))} par mois.</p>
          )}
          {f.typeSalaire === 'Pourcentage' && (
            <DetailPourcentage f={f} professeur={professeur} charges={charges} state={pct} onChange={(patch) => setPct((p) => ({ ...p, ...patch }))} onToggleCharge={toggleCharge} />
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
          <button onClick={submit} disabled={saving} className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white hover:bg-[#16385f] font-medium flex items-center gap-1 disabled:opacity-50">
            <Check size={12} /> Enregistrer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ------------------------------------------------------------------ */
/*  Bilan mensuel                                                      */
/* ------------------------------------------------------------------ */
export const BilanMensuel = ({ professeurId, professeur, initialMois, initialAnnee, onChange, onPeriodeChange }) => {
  const [periode, setPeriode] = useState(() => (initialMois && initialAnnee ? new Date(initialAnnee, initialMois - 1, 1) : new Date()));
  const [showPicker, setShowPicker] = useState(false);
  const [tab, setTab] = useState('formations');
  
  const [modalFormation, setModalFormation] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalDraft, setTotalDraft] = useState(''); // saisie en cours dans le champ "Total du mois"
  const [payeDraft, setPayeDraft] = useState(''); // saisie en cours dans le champ "Déjà payé"
  const [actionError, setActionError] = useState('');

  const mois = periode.getMonth() + 1;
  const annee = periode.getFullYear();
  const label = periode.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchBilan(professeurId, mois, annee);
      setData(res);
      setTotalDraft(res.totalOverride !== null ? String(res.totalOverride) : '');
      setPayeDraft('');
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [professeurId, mois, annee]);
// prévient la page parente quand le mois affiché change (pour garder l'URL et le badge synchronisés)
useEffect(() => {
  if (mois === initialMois && annee === initialAnnee) return;
  onPeriodeChange?.(mois, annee);
}, [mois, annee, initialMois, initialAnnee]);
  const changerMois = (delta) => setPeriode((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));

const run = async (fn) => {
  try { setActionError(''); await fn(); await load(); onChange?.(); }
  catch (err) { setActionError(err.message); }
};

const handleAjout = async (payload) => { await postMouvement(professeurId, { mois, annee, ...payload }); await load(); onChange?.(); };

const saveFormation = async (formationId, patch) => {
  await putFormationDetail(professeurId, formationId, { mois, annee, ...patch });
  await load();
  onChange?.();
};
const handleDeleteMouvement = (id) => run(() => deleteMouvementApi(id));

const commitTotal = (raw) => {
  const value = raw === '' ? null : Number(raw);
  if (raw !== '' && Number.isNaN(value)) return;
  return run(() => putTotal(professeurId, { mois, annee, totalOverride: value }));
};
const handleTotalBlur = (e) => {
  const raw = e.target.value;
  if (raw === String(total)) return;
  commitTotal(raw === String(totalCalcule) ? '' : raw);
};
const resetTotal = () => { setTotalDraft(''); commitTotal(''); };
const handlePayeBlur = (e) => {
  const raw = e.target.value;
  if (raw === '' || Number(raw) === Number(paye)) { setPayeDraft(''); return; }
  run(() => putPaye(professeurId, { mois, annee, montant: Number(raw) }));
};

const handleValider = () => run(() => postValider(professeurId, { mois, annee }));
const handleEnvoyer = () => run(() => postEnvoyer(professeurId, { mois, annee }));

  if (loading && !data) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (error && !data) {
    return <p className="text-red-500 text-sm">{error}</p>;
  }

const { formations, mouvements, charges, total, totalCalcule, totalOverride, paye, valide, envoye } = data;
  return (
    <div className="space-y-4">
      <div className="relative flex items-center justify-center gap-3">
        <button onClick={() => changerMois(-1)} className="w-7 h-7 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-slate-50"><ChevronLeft size={14} className="text-[#0369A1]" /></button>
        <button onClick={() => setShowPicker((v) => !v)} className="flex items-center gap-1.5 text-sm font-semibold text-[#0369A1] capitalize bg-[#DCEBFA] px-3 py-1.5 rounded-full hover:bg-[#c9e2f7] transition">
          <CalendarDays size={14} /> {label} <ChevronDown size={12} />
        </button>
        <button onClick={() => changerMois(1)} className="w-7 h-7 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-slate-50"><ChevronRight size={14} className="text-[#0369A1]" /></button>
        {showPicker && (
          <div className="absolute top-9 bg-white border border-[#E2E8F0] rounded-lg shadow-lg p-3 z-10 flex gap-2">
            <select value={periode.getMonth()} onChange={(e) => setPeriode((d) => new Date(d.getFullYear(), Number(e.target.value), 1))} className="text-xs border border-slate-200 rounded-md px-2 py-1.5">
              {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <input type="number" value={periode.getFullYear()} onChange={(e) => setPeriode((d) => new Date(Number(e.target.value) || d.getFullYear(), d.getMonth(), 1))} className="w-20 text-xs border border-slate-200 rounded-md px-2 py-1.5" />
            <button onClick={() => setShowPicker(false)} className="text-xs px-2 py-1.5 rounded-md bg-[#0F2A4A] text-white">OK</button>
          </div>
        )}
      </div>
{actionError && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-md">{actionError}</p>}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        <StatTile icon={CalendarDays} label="Formations" value={formations.length} color="blue" />
        <StatTile icon={Wallet} label="Reste à payer" value={fmt(total - paye)} color="amber" />
      </div>

      <div className={`${CARD} p-5`}>
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 mb-3"><DollarSign size={15} className="text-[#0369A1]" /> Salaire final — {label}</p>

        <div className="space-y-1.5 mb-3">
          {formations.map((f) => (
            <div key={f.id} className="flex items-start justify-between gap-2 bg-[#F8FAFC] border border-[#F1F5F9] rounded-md px-2.5 py-2 text-xs">
              <div className="min-w-0">
                <p className="font-medium text-slate-700 truncate">{f.nom}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {f.typeSalaire === 'Fixe' && `Forfait fixe de ${fmt(Number(f.montant))} / mois.`}
{f.typeSalaire === "À l'heure" && `${f.heuresEffectuees ?? 0} heure(s) × ${fmt(Number(f.montant))}.${f.heuresOverride == null && f.seancesSansDuree > 0 ? ` (${f.seancesSansDuree} séance(s) sans durée)` : ''}`}
                  {f.typeSalaire === 'Pourcentage' && `${f.revenusOverride !== null ? fmt(f.revenusOverride) : 'Revenus non renseignés'} − charges, puis ${f.part}% pour le professeur.`}
                  {!f.typeSalaire && 'Rémunération non configurée.'}
                </p>
              </div>
              <span className="font-semibold text-slate-700 shrink-0">{fmt(f.montantPeriode)}</span>
            </div>
          ))}
        </div>

        {mouvements.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {mouvements.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 bg-[#F8FAFC] border border-[#F1F5F9] rounded-md px-2.5 py-2 text-xs">
                <div className="min-w-0 flex items-center gap-1.5">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${TYPES_MVT[m.type].signe > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                    {TYPES_MVT[m.type].label}
                  </span>
                  <span className="text-slate-600 truncate">{m.description}</span>
                </div>
                <span className={`font-semibold shrink-0 ${TYPES_MVT[m.type].signe > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {TYPES_MVT[m.type].signe > 0 && '+'}{fmt(TYPES_MVT[m.type].signe * Number(m.montant))}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between bg-white border border-[#E2E8F0] rounded-lg px-3 py-2.5">
          <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <Wallet size={14} className="text-[#0369A1]" /> Total du mois
            {totalOverride !== null && (
              <button onClick={resetTotal} title="Réinitialiser au calcul automatique" className="text-slate-300 hover:text-amber-500"><RotateCcw size={11} /></button>
            )}
          </span>
          <span className="flex items-center gap-1">
            <input
              type="number"
              value={totalDraft !== '' ? totalDraft : total}
              onChange={(e) => setTotalDraft(e.target.value)}
              onBlur={handleTotalBlur}
              disabled={valide}
              className="w-28 text-right text-lg font-bold text-slate-800 bg-transparent border border-transparent rounded-md px-1.5 py-0.5 hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0369A1]/30"
            />
            <span className="text-lg font-bold text-slate-800">DA</span>
          </span>
        </div>
{totalOverride !== null && <p className="text-[10px] text-slate-400 text-right mt-1">(calcul auto: {fmt(totalCalcule)})</p>}
 <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
          <span>Déjà payé</span>
          {valide ? (
            <span className="flex items-center gap-1">
              <input
                type="number" min="0" max={total}
                value={payeDraft !== '' ? payeDraft : paye}
                onChange={(e) => setPayeDraft(e.target.value)}
                onBlur={handlePayeBlur}
                className="w-24 text-right text-xs font-medium text-slate-700 bg-transparent border border-transparent rounded-md px-1.5 py-0.5 hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0369A1]/30"
              />
              <span>DA</span>
            </span>
          ) : (
            <span>{fmt(paye)}</span>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={handleValider} disabled={valide}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#0F2A4A] text-white text-sm font-semibold py-2.5 rounded-lg shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0">
            <Check size={14} /> {valide ? 'Salaire validé' : 'Valider le salaire'}
          </button>
          <button onClick={handleEnvoyer} disabled={!valide || envoye}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#0369A1] text-white text-sm font-semibold py-2.5 rounded-lg shadow-[0_3px_0_#024e77] hover:shadow-[0_2px_0_#024e77] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0">
            <Send size={14} /> {envoye ? 'Envoyé' : 'Envoyer au professeur'}
          </button>
        </div>
        {envoye && <p className="text-[10px] text-emerald-600 text-center mt-1.5">Le professeur peut consulter ce bilan.</p>}
      </div>

      <div className="flex items-center gap-2">
        {[['formations', 'Formations'], ['revenus', 'Avances & retenues']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full text-xs font-medium transition ${tab === k ? 'bg-[#0F2A4A] text-white' : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'}`}>{l}</button>
        ))}
      </div>

      {tab === 'formations' ? (
        <div className={`${CARD} overflow-hidden`}>
          <table className="w-full text-xs">
            <thead className="bg-[#0F2A4A]">
              <tr>{['Formation', 'Type', 'Montant'].map((h, i, arr) => (
                <th key={h} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] ${i === 0 ? 'border-l' : ''} ${i === arr.length - 1 ? 'text-right border-r' : ''}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {formations.map((f, i) => (
                <tr key={f.id} onClick={() => f.typeSalaire && setModalFormation(f)} className={`${f.typeSalaire ? 'cursor-pointer hover:bg-slate-50/60' : ''} transition ${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                  <td className="px-3 py-2 text-slate-700 font-medium border-b border-l border-slate-100">{f.nom}</td>
                  <td className="px-3 py-2 text-slate-500 border-b border-slate-100">{f.typeSalaire || 'Non défini'}</td>
                  <td className="px-3 py-2 text-right font-medium text-slate-700 border-b border-r border-slate-100">{fmt(f.montantPeriode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`${CARD} overflow-hidden`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-800">Avances & retenues</p>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3 py-1.5 rounded-md text-[11px] font-medium shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all">
              <Plus size={12} /> Ajouter
            </button>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-[#0F2A4A]">
              <tr>{['Type', 'Description', 'Montant', ''].map((h, i, arr) => (
                <th key={h} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] ${i === 0 ? 'border-l' : ''} ${i === arr.length - 1 ? 'border-r' : ''}`}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {mouvements.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400 bg-white">Aucun mouvement.</td></tr>
              ) : mouvements.map((m, i) => (
                <tr key={m.id} className={i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                  <td className="px-3 py-2 text-slate-500 border-b border-l border-slate-100">{TYPES_MVT[m.type].label}</td>
                  <td className="px-3 py-2 text-slate-600 border-b border-slate-100">{m.description}</td>
                  <td className={`px-3 py-2 text-right font-medium border-b border-slate-100 ${TYPES_MVT[m.type].signe > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{TYPES_MVT[m.type].signe > 0 && '+'}{fmt(TYPES_MVT[m.type].signe * Number(m.montant))}</td>
                  <td className="px-3 py-2 text-right border-b border-r border-slate-100">
                    <button onClick={() => handleDeleteMouvement(m.id)} className="text-slate-300 hover:text-red-500"><X size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <AjoutMouvementModal formations={formations} onClose={() => setShowForm(false)} onSubmit={handleAjout} />}

      {modalFormation && (
        <FormationModal
          f={modalFormation} professeur={professeur} charges={charges}
          onClose={() => setModalFormation(null)}
          onSave={(patch) => saveFormation(modalFormation.id, patch)}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Historique                                                         */
/* ------------------------------------------------------------------ */
export const HistoriqueProf = () => (
  <div className={`${CARD} overflow-hidden`}>
    <table className="w-full text-xs">
      <thead className="bg-[#0F2A4A]">
        <tr>{['Mois', 'Montant', 'Payé', 'Statut'].map((h, i) => (
          <th key={h} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] ${i === 0 ? 'border-l' : ''}`}>{h}</th>
        ))}</tr>
      </thead>
      <tbody>
        {MOCK_HISTORIQUE.map((h, i) => (
          <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
            <td className="px-3 py-2 text-slate-700 font-medium border-b border-l border-slate-100">{h.mois}</td>
            <td className="px-3 py-2 text-slate-500 border-b border-slate-100">{fmt(h.montant)}</td>
            <td className="px-3 py-2 text-slate-500 border-b border-slate-100">{fmt(h.paye)}</td>
            <td className="px-3 py-2 border-b border-slate-100"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUT_HISTO[h.statut].cls}`}>{STATUT_HISTO[h.statut].label}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);