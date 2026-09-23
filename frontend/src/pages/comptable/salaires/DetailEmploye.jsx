import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Wallet, CalendarDays, Phone, Plus, Check, Info, RotateCcw, Image as ImageIcon } from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';
import { CARD, fmt, initiales, nomComplet, tarifLabel, typeOf, StatTile, totalEmploye, joursParSemaine, cap, formatDate, employeFromApi, MOUVEMENT_TYPES, mouvementTypeLabel } from './EmployeModal';
import AjoutMouvementModal from './AjoutMouvementModal';

const API_URL = `${import.meta.env.VITE_API_URL}/api/employes`;
const MOUVEMENTS_API_URL = `${import.meta.env.VITE_API_URL}/api/mouvements`;
const SALAIRES_MENSUELS_API_URL = `${import.meta.env.VITE_API_URL}/api/salaires-mensuels`;
const HISTORIQUE_API_URL = `${import.meta.env.VITE_API_URL}/api/salaires-mensuels/historique`;

const LIST_PATH = '/comptable/salaires/employes';
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const emptyForm = { type: MOUVEMENT_TYPES[0].key, description: '', montant: '', posteId: '' };

// Conversion snake_case (API) -> camelCase (utilisé par ce composant)
const mouvementFromApi = (m) => ({ ...m, posteId: m.poste_id, montant: Number(m.montant) });

const JOURS_INDEX = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };
const STATUT_HISTO = { paye: { label: 'Payé', cls: 'bg-emerald-50 text-emerald-600' }, partiel: { label: 'Partiel', cls: 'bg-amber-50 text-amber-600' }, non_paye: { label: 'Non payé', cls: 'bg-red-50 text-red-500' } };
// Compte le nombre RÉEL de jours (ex: jeudis/vendredis/samedis) dans le mois de `periode`
const joursPrevusPosteMois = (p, periode) => {
  if (p.type === 'mensuel' || p.type === 'libre') return null; // non pertinent (forfait fixe ou montant libre)
  const year = periode.getFullYear(), month = periode.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  if (p.joursFixes) {
    const cibles = p.jours.map(j => JOURS_INDEX[j]);
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (cibles.includes(new Date(year, month, d).getDay())) count++;
    }
    return count;
  }
  // pas de jours fixes: estimation via nb jours/semaine × semaines réelles du mois
  return Math.round(joursParSemaine(p) * (daysInMonth / 7));
};

const montantPosteMois = (p, periode) => {
  if (p.type === 'mensuel') return Number(p.montant);
  if (p.type === 'libre') return 0; // saisi manuellement chaque mois via le salaire net estimé
  const nbJ = joursPrevusPosteMois(p, periode);
  return p.type === 'jour' ? nbJ * Number(p.montant) : nbJ * Number(p.montant) * Number(p.heuresParJour);
};

const calculLabel = (p, periode) => {
   if (p.type === 'mensuel') return `Forfait fixe de ${fmt(p.montant)} par mois.`;
  if (p.type === 'libre') return 'Montant non fixe : à saisir chaque mois dans le salaire net estimé.';
  const nbJ = joursPrevusPosteMois(p, periode);
  const label = periode.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return p.type === 'jour'
    ? `${fmt(p.montant)} / jour × ${nbJ} jour(s) en ${label} = ${fmt(montantPosteMois(p, periode))}.`
    : `${fmt(p.montant)} / heure × ${p.heuresParJour}h × ${nbJ} jour(s) en ${label} = ${fmt(montantPosteMois(p, periode))}.`;
};

// Terme brut d'un poste dans la formule (ex: "4×1500" ou "4×8×600")
const formuleTermePoste = (p, periode) => {
  if (p.type === 'mensuel') return `${Number(p.montant)}`;
  const nbJ = joursPrevusPosteMois(p, periode);
  return p.type === 'jour' ? `${nbJ}×${Number(p.montant)}` : `${nbJ}×${p.heuresParJour}×${Number(p.montant)}`;
};

const formuleSalaire = (employe, periode, avances, retenues, primes) => {
  const termes = employe.postes.filter(p => p.type !== 'libre').map(p => formuleTermePoste(p, periode));
  let str = termes.length ? termes.join(' + ') : '0';
  const deductions = Math.abs(avances) + Math.abs(retenues);
  if (deductions > 0) str += ` - ${deductions}`;
  if (primes > 0) str += ` + ${primes}`;
  return str;
};
const DetailEmploye = () => {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const employesListe = state?.employes ?? [];
  const idx = employesListe.findIndex(e => String(e.id) === id);

  const [employe, setEmploye] = useState(state?.employe ?? null);
  const [loadingEmploye, setLoadingEmploye] = useState(!state?.employe);
  const [employeError, setEmployeError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingEmploye(true);
    fetch(`${API_URL}/${id}`)
      .then(res => { if (!res.ok) throw new Error('Employé introuvable'); return res.json(); })
      .then(data => { if (!cancelled) { setEmploye(employeFromApi(data)); setEmployeError(null); } })
      .catch(err => { if (!cancelled) setEmployeError(err.message); })
      .finally(() => { if (!cancelled) setLoadingEmploye(false); });
    return () => { cancelled = true; };
  }, [id]);

const [periode, setPeriode] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
const [showPicker, setShowPicker] = useState(false);
  const [tab, setTab] = useState('apercu');
  const [openInfo, setOpenInfo] = useState(null); // posteId dont le détail de calcul est affiché
  const [mouvements, setMouvements] = useState([]);
  const [loadingMouvements, setLoadingMouvements] = useState(true);
  const [mouvementsError, setMouvementsError] = useState(null);

  useEffect(() => {
    if (!employe) return;
    let cancelled = false;
    setLoadingMouvements(true);
    const mois = periode.getMonth() + 1;
    const annee = periode.getFullYear();
    fetch(`${MOUVEMENTS_API_URL}?employe_id=${employe.id}&mois=${mois}&annee=${annee}`)
      .then(res => { if (!res.ok) throw new Error('Erreur lors du chargement des mouvements'); return res.json(); })
      .then(data => { if (!cancelled) { setMouvements(data.map(mouvementFromApi)); setMouvementsError(null); } })
      .catch(err => { if (!cancelled) setMouvementsError(err.message); })
      .finally(() => { if (!cancelled) setLoadingMouvements(false); });
    return () => { cancelled = true; };
  }, [employe, periode]);

  const [salaireOverride, setSalaireOverride] = useState(null); // null = valeur auto-calculée
  const [showFormule, setShowFormule] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editingMouvement, setEditingMouvement] = useState(null); // full row, for bons
  const [confirm, setConfirm] = useState(null);
  const [formError, setFormError] = useState(null);
  const [pendingBons, setPendingBons] = useState([]); // [{ file, preview }] — fichiers pas encore uploadés (mouvement pas encore créé)
  const [uploadingBon, setUploadingBon] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Salaire validé du mois (table salaires_mensuels) — null tant que le mois n'a jamais été validé
  const [salaireMensuel, setSalaireMensuel] = useState(null);
  const [loadingSalaireMensuel, setLoadingSalaireMensuel] = useState(false);
  const [salaireError, setSalaireError] = useState(null);
  const [validatingSalaire, setValidatingSalaire] = useState(false);
const [historique, setHistorique] = useState([]);
const [loadingHistorique, setLoadingHistorique] = useState(false);
const [historiqueError, setHistoriqueError] = useState(null);

useEffect(() => {
  if (!employe || tab !== 'historique') return;
  let cancelled = false;
  setLoadingHistorique(true);
  fetch(`${HISTORIQUE_API_URL}?employe_id=${employe.id}`)
    .then(res => { if (!res.ok) throw new Error("Erreur lors du chargement de l'historique"); return res.json(); })
    .then(data => { if (!cancelled) { setHistorique(data); setHistoriqueError(null); } })
    .catch(err => { if (!cancelled) setHistoriqueError(err.message); })
    .finally(() => { if (!cancelled) setLoadingHistorique(false); });
  return () => { cancelled = true; };
}, [employe, tab]);

  useEffect(() => {
    if (!employe) return;
    let cancelled = false;
    setLoadingSalaireMensuel(true);
    const mois = periode.getMonth() + 1;
    const annee = periode.getFullYear();
    fetch(`${SALAIRES_MENSUELS_API_URL}?employe_id=${employe.id}&mois=${mois}&annee=${annee}`)
      .then(res => { if (!res.ok) throw new Error('Erreur lors du chargement du salaire validé'); return res.json(); })
      .then(data => {
        if (cancelled) return;
        setSalaireMensuel(data);
        // si le montant validé diffère du calcul auto (ex: override saisi avant validation), on le restitue dans le champ
        setSalaireOverride(data ? data.montant_net : null);
        setSalaireError(null);
      })
      .catch(err => { if (!cancelled) setSalaireError(err.message); })
      .finally(() => { if (!cancelled) setLoadingSalaireMensuel(false); });
    return () => { cancelled = true; };
  }, [employe, periode]);
  const changerMois = (delta) => setPeriode(d => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  const label = periode.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const goTo = (target) => navigate(`${LIST_PATH}/${target.id}`, { state: { employe: target, employes: employesListe } });

  if (loadingEmploye) {
    return <ComptableLayout><div className={`${CARD} px-3 py-10 text-center text-slate-400 text-xs`}>Chargement…</div></ComptableLayout>;
  }
  if (employeError || !employe) {
    return <ComptableLayout><div className={`${CARD} px-3 py-10 text-center text-slate-400 text-xs`}>Cet employé est introuvable.</div></ComptableLayout>;
  }

  const posteNom = (posteId) => employe.postes.find(p => p.id === posteId)?.poste || 'Général';
  const base = employe.postes.reduce((s, p) => s + montantPosteMois(p, periode), 0);
  const joursPrevus = employe.postes.reduce((s, p) => s + (joursPrevusPosteMois(p, periode) || 0), 0) || 22; // 22 = fallback pour postes mensuels uniquement
  const avances = mouvements.filter(m => m.type === 'avance').reduce((s, m) => s + m.montant, 0);
  const retenues = mouvements.filter(m => m.type === 'retenue').reduce((s, m) => s + m.montant, 0);
  const primes = mouvements.filter(m => m.type === 'prime').reduce((s, m) => s + m.montant, 0);
    const netCalcule = base + avances + retenues + primes;
  const net = salaireOverride ?? netCalcule;
  const paye = salaireMensuel?.montant_paye ?? 0;
  const restant = net - paye;
  const statutMois = salaireMensuel?.statut ?? (paye <= 0 ? 'non_paye' : paye < net ? 'partiel' : 'paye');
  const estValide = Boolean(salaireMensuel);
   const openAdd = () => {
    setEditingId(null); setEditingMouvement(null); setForm(emptyForm);
    setFormError(null); setConfirm(null); setPendingBons([]);
    setShowForm(true);
  };
  const openEdit = (m) => {
    setEditingId(m.id); setEditingMouvement(m);
    setForm({ type: m.type, description: m.description, montant: Math.abs(m.montant), posteId: m.posteId || '' });
    setFormError(null); setConfirm(null); setPendingBons([]);
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false); setEditingId(null); setEditingMouvement(null); setFormError(null); setConfirm(null);
    pendingBons.forEach((p) => URL.revokeObjectURL(p.preview));
    setPendingBons([]);
  };

  const requestSave = () => {
    if (!form.description.trim()) return setFormError('Renseignez une description.');
    if (!(Number(form.montant) > 0)) return setFormError('Renseignez un montant.');
    setFormError(null);
    editingId ? setConfirm('save') : doSave();
  };

  const doSave = async () => {
    setConfirm(null);
    const signe = form.type === 'prime' ? 1 : -1;
    const payload = {
      employe_id: employe.id,
      poste_id: form.posteId || null,
      date: editingId ? mouvements.find(m => m.id === editingId).date : new Date().toISOString().slice(0, 10),
      type: form.type,
      description: form.description,
      montant: signe * Number(form.montant),
    };
    try {
      const url = editingId ? `${MOUVEMENTS_API_URL}/${editingId}` : MOUVEMENTS_API_URL;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erreur lors de l'enregistrement");
      }
      const saved = mouvementFromApi(await res.json());

      if (editingId) {
        saved.bons = mouvements.find(m => m.id === editingId)?.bons ?? [];
        setMouvements(list => list.map(m => m.id === editingId ? saved : m));
        closeForm();
      } else {
        // le mouvement vient d'être créé : on a maintenant un id réel pour uploader les bons en attente
        let bons = [];
        if (pendingBons.length > 0) {
          setUploadingBon(true);
          try {
            for (const p of pendingBons) {
              const body = new FormData();
              body.append('fichier', p.file);
              const bonRes = await fetch(`${MOUVEMENTS_API_URL}/${saved.id}/bons`, { method: 'POST', body });
              if (bonRes.ok) bons.push(await bonRes.json());
            }
          } finally {
            setUploadingBon(false);
          }
          pendingBons.forEach((p) => URL.revokeObjectURL(p.preview));
          setPendingBons([]);
        }
        saved.bons = bons;
        setMouvements(list => [...list, saved]);
        setEditingId(saved.id);
        setEditingMouvement(saved);
      }
    } catch (err) {
      setFormError(err.message);
    }
  };
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!editingId) {
      // mouvement pas encore enregistré : on garde le fichier en mémoire, upload juste après sa création
      setPendingBons((prev) => [...prev, { file, preview: URL.createObjectURL(file) }]);
      return;
    }

    // mouvement déjà enregistré : upload immédiat vers Supabase Storage
    setUploadingBon(true);
    setFormError(null);
    try {
      const body = new FormData();
      body.append('fichier', file);
      const res = await fetch(`${MOUVEMENTS_API_URL}/${editingId}/bons`, { method: 'POST', body });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erreur lors de l'envoi du bon");
      }
      const bon = await res.json();
      setEditingMouvement((prev) => prev ? { ...prev, bons: [...(prev.bons || []), bon] } : prev);
      setMouvements((list) => list.map((m) => m.id === editingId ? { ...m, bons: [...(m.bons || []), bon] } : m));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setUploadingBon(false);
    }
  };

  const handleRemovePendingBon = (idx) => {
    setPendingBons((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleDeleteExistingBon = async (bonId) => {
    const bonsAvant = editingMouvement?.bons || [];
    // suppression optimiste, avec retour en arrière si l'appel échoue
    setEditingMouvement((prev) => prev ? { ...prev, bons: (prev.bons || []).filter((b) => b.id !== bonId) } : prev);
    setMouvements((list) => list.map((m) => m.id === editingId ? { ...m, bons: (m.bons || []).filter((b) => b.id !== bonId) } : m));
    try {
      const res = await fetch(`${MOUVEMENTS_API_URL}/${editingId}/bons/${bonId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
    } catch {
      setEditingMouvement((prev) => prev ? { ...prev, bons: bonsAvant } : prev);
      setMouvements((list) => list.map((m) => m.id === editingId ? { ...m, bons: bonsAvant } : m));
      setFormError('Erreur lors de la suppression du bon');
    }
  };
   const handleSalaireChange = (e) => {
    const raw = e.target.value;
    if (raw === '') { setSalaireOverride(null); return; }
    const v = Number(raw);
    if (!Number.isNaN(v)) setSalaireOverride(v);
  };
  const resetSalaire = () => setSalaireOverride(null);

  const validerSalaire = async () => {
    setValidatingSalaire(true);
    setSalaireError(null);
    try {
      const res = await fetch(SALAIRES_MENSUELS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employe_id: employe.id,
          mois: periode.getMonth() + 1,
          annee: periode.getFullYear(),
          montant_net: net,
          montant_paye: net, // valider = marquer le mois comme payé intégralement
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Erreur lors de la validation du salaire');
      }
      setSalaireMensuel(await res.json());
    } catch (err) {
      setSalaireError(err.message);
    } finally {
      setValidatingSalaire(false);
    }
  };

  const requestDelete = () => setConfirm('delete');
  const doDelete = async () => {
    try {
      const res = await fetch(`${MOUVEMENTS_API_URL}/${editingId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Erreur lors de la suppression');
      }
      setMouvements(list => list.filter(m => m.id !== editingId));
      closeForm();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const multiPostes = employe.postes.length > 1;

  return (
    <ComptableLayout>
      {/* Breadcrumb + navigation entre employés */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(LIST_PATH)} className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition flex-shrink-0">
            <ArrowLeft size={16} className="text-[#0369A1]" />
          </button>
          <div className="flex items-center gap-1.5 text-xs">
            <button onClick={() => navigate(LIST_PATH)} className="text-slate-400 hover:text-[#0369A1] transition">Employés</button>
            <span className="text-slate-300">›</span>
            <span className="text-[#0369A1] font-medium">{nomComplet(employe)}</span>
          </div>
        </div>

        {idx > -1 && employesListe.length > 1 && (
          <div className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] rounded-full px-1.5 py-1">
            <button disabled={idx === 0} onClick={() => goTo(employesListe[idx - 1])}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent">
              <ChevronLeft size={13} className="text-[#0369A1]" />
            </button>
            <span className="text-[11px] text-slate-500 px-1">{idx + 1} / {employesListe.length}</span>
            <button disabled={idx === employesListe.length - 1} onClick={() => goTo(employesListe[idx + 1])}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent">
              <ChevronRight size={13} className="text-[#0369A1]" />
            </button>
          </div>
        )}
      </div>

      {/* Infos employé */}
      <div className={`${CARD} p-5 mb-4 flex items-start gap-4 flex-wrap`}>
        <div className="w-14 h-14 shrink-0 rounded-full bg-[#DCEBFA] text-[#0369A1] text-lg font-bold flex items-center justify-center">{initiales(nomComplet(employe))}</div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-slate-800 truncate">{nomComplet(employe)}</h1>
          {employe.telephone && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone size={11} className="text-[#0369A1]" /> {employe.telephone}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
            {employe.postes.map((p, i) => {
              const Icon = typeOf(p.type).icon;
              return (
                <div key={p.id} className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                  {i > 0 && <span className="text-slate-300">•</span>}
                  <Icon size={12} className="text-[#0369A1] shrink-0" />
                  <span className="font-medium text-slate-600">{p.poste}</span>
                  <span className="text-slate-400">— {tarifLabel(p)}</span>
                  <button onClick={() => setOpenInfo(v => v === p.id ? null : p.id)} className="text-slate-300 hover:text-[#0369A1] shrink-0">
                    <Info size={11} />
                  </button>
                  {p.type !== 'mensuel' && (
                    <span className="text-[10px] text-slate-400">
                      {p.joursFixes ? p.jours.map(j => cap(j).slice(0, 3)).join(', ') : `${joursParSemaine(p)} j/sem`}
                    </span>
                  )}
                  {p.dateDebut && <span className="text-[10px] text-slate-400">· Depuis le {formatDate(p.dateDebut)}</span>}
                </div>
              );
            })}
          </div>
          {openInfo && (
            <p className="text-[10px] text-[#0369A1] bg-[#F0F7FE] rounded-md px-2 py-1 mt-1.5">
              {calculLabel(employe.postes.find(p => p.id === openInfo), periode)}
            </p>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-2 mb-4">
        {[['apercu', "Vue d'ensemble"], ['historique', 'Historique']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition ${tab === k ? 'bg-[#0F2A4A] text-white' : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'apercu' ? (
        <>
          {/* Mois */}
          <div className="relative flex items-center justify-center gap-3 mb-4">
            <button onClick={() => changerMois(-1)} className="w-7 h-7 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-slate-50">
              <ChevronLeft size={14} className="text-[#0369A1]" />
            </button>
            <button onClick={() => setShowPicker(v => !v)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#0369A1] capitalize bg-[#DCEBFA] px-3 py-1.5 rounded-full hover:bg-[#c9e2f7] transition">
              <CalendarDays size={14} /> {label} <ChevronDown size={12} />
            </button>
            <button onClick={() => changerMois(1)} className="w-7 h-7 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-slate-50">
              <ChevronRight size={14} className="text-[#0369A1]" />
            </button>
            {showPicker && (
              <div className="absolute top-9 bg-white border border-[#E2E8F0] rounded-lg shadow-lg p-3 z-10 flex gap-2">
                <select value={periode.getMonth()} onChange={e => setPeriode(d => new Date(d.getFullYear(), Number(e.target.value), 1))} className="text-xs border border-slate-200 rounded-md px-2 py-1.5">
                  {MOIS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <input type="number" value={periode.getFullYear()} onChange={e => setPeriode(d => new Date(Number(e.target.value) || d.getFullYear(), d.getMonth(), 1))} className="w-20 text-xs border border-slate-200 rounded-md px-2 py-1.5" />
                <button onClick={() => setShowPicker(false)} className="text-xs px-2 py-1.5 rounded-md bg-[#0F2A4A] text-white">OK</button>
              </div>
            )}
          </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 mb-4">
  <StatTile icon={CalendarDays} label="Jours prévus" value={joursPrevus} color="blue" />
  <StatTile icon={Wallet} label="Reste à payer" value={fmt(restant)} color="amber" />
</div>

          {/* Récapitulatif */}
          <div className={`${CARD} p-5 mb-4`}>
            <p className="text-sm font-semibold text-slate-800 mb-3 capitalize flex items-center gap-2">
              Salaire — {label}
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full normal-case ${STATUT_HISTO[statutMois].cls}`}>{STATUT_HISTO[statutMois].label}</span>
            </p>
            <div className="space-y-1.5 text-xs text-slate-500">
              {multiPostes
                ? employe.postes.map(p => (
                    <div key={p.id} className="flex justify-between">
                      <span>{p.poste}</span>
                        <span className="text-slate-700 font-medium">{p.type === 'libre' ? 'Montant libre' : fmt(montantPosteMois(p, periode))}</span>
                    </div>
                  ))
                : <div className="flex justify-between"><span>Salaire de base</span><span className="text-slate-700 font-medium">{employe.postes[0]?.type === 'libre' ? 'Montant libre' : fmt(base)}</span></div>}
              <div className="flex justify-between"><span>Avances</span><span className="text-red-500 font-medium">{fmt(avances)}</span></div>
              <div className="flex justify-between"><span>Retenues</span><span className="text-red-500 font-medium">{fmt(retenues)}</span></div>
              <div className="flex justify-between"><span>Primes</span><span className="text-emerald-600 font-medium">+{fmt(primes)}</span></div>
            </div>
            <div className="border-t border-[#F1F5F9] my-3" />
            <div className="flex items-center justify-between bg-white border border-[#E2E8F0] rounded-lg px-3 py-2.5">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Wallet size={14} className="text-[#0369A1]" /> Salaire net estimé
                <button onClick={() => setShowFormule(v => !v)} className="text-slate-300 hover:text-[#0369A1]">
                  <Info size={11} />
                </button>
                {salaireOverride !== null && (
                  <button onClick={resetSalaire} title="Réinitialiser au calcul automatique" className="text-slate-300 hover:text-amber-500">
                    <RotateCcw size={11} />
                  </button>
                )}
              </span>
              <span className="flex items-center gap-1">
                <input
                  type="number"
                  value={net}
                  onChange={handleSalaireChange}
                  className="w-28 text-right text-lg font-bold text-slate-800 bg-transparent border border-transparent rounded-md px-1.5 py-0.5 hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0369A1]/30 focus:border-[#0369A1]/40"
                />
                <span className="text-lg font-bold text-slate-800">DA</span>
              </span>
            </div>
            {showFormule && (
              <p className="text-[10px] text-[#0369A1] bg-[#F0F7FE] rounded-md px-2 py-1 mt-1 text-right">
                {formuleSalaire(employe, periode, avances, retenues, primes)} = {fmt(netCalcule)}  </p>
            )}
            {salaireOverride !== null && (
              <p className="text-[10px] text-slate-400 text-right -mt-0.5 mt-1">(calcul auto: {fmt(netCalcule)})</p>
            )}
            <div className="flex justify-between text-xs text-slate-400 mt-2"><span>Déjà payé</span><span>{fmt(paye)}</span></div>
            {salaireError && <p className="text-red-500 text-[11px] bg-red-50 px-2.5 py-1.5 rounded-md mt-2">{salaireError}</p>}
            <button
              onClick={validerSalaire}
              disabled={validatingSalaire || loadingSalaireMensuel}
              className={`w-full mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-lg shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all disabled:opacity-60 disabled:pointer-events-none ${estValide ? 'bg-emerald-600 shadow-[0_3px_0_#065F46] hover:shadow-[0_2px_0_#065F46]' : 'bg-[#0F2A4A]'} text-white`}>
              <Check size={14} /> {validatingSalaire ? 'Validation…' : estValide ? 'Salaire validé — revalider' : 'Valider le salaire'}
            </button>
          </div>

          {/* Tableau mouvements */}
          <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">Mouvements du mois</p>
              <button onClick={openAdd}
                className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3 py-1.5 rounded-md text-[11px] font-medium shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all">
                <Plus size={12} /> Ajouter
              </button>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-[#0F2A4A]">
                <tr>
                  {['Date', 'Type', ...(multiPostes ? ['Salaire'] : []), 'Description', 'Bons', 'Montant'].map((h, i, arr) => (
                    <th key={h} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] ${i === 0 ? 'border-l border-[#0F2A4A]' : ''} ${i === arr.length - 1 ? 'text-right border-r border-[#0F2A4A]' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingMouvements ? (
                  <tr><td colSpan={multiPostes ? 6 : 5} className="text-center py-8 text-slate-400 bg-white">Chargement…</td></tr>
                ) : mouvementsError ? (
                  <tr><td colSpan={multiPostes ? 6 : 5} className="text-center py-8 text-red-500 bg-white">{mouvementsError}</td></tr>
                ) : mouvements.length === 0 ? (
                  <tr><td colSpan={multiPostes ? 6 : 5} className="text-center py-8 text-slate-400 bg-white">Aucun mouvement.</td></tr>
                ) : mouvements.map((m, i) => (
                  <tr key={m.id} onClick={() => openEdit(m)} className={`cursor-pointer hover:bg-slate-50/60 transition ${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                    <td className="px-3 py-2 text-slate-500 border-b border-l border-slate-100">{new Date(m.date).toLocaleDateString('fr-FR')}</td>
<td className="px-3 py-2 text-slate-500 border-b border-slate-100">{mouvementTypeLabel(m.type)}</td>
{multiPostes && <td className="px-3 py-2 text-slate-500 border-b border-slate-100">{posteNom(m.posteId)}</td>}
                    <td className="px-3 py-2 text-slate-600 border-b border-slate-100">{m.description}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap border-b border-slate-100">
                      {(m.bons?.length ?? 0) === 0 ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#DCEBFA] text-[#0369A1]">
                          <ImageIcon size={11} /> {m.bons.length}
                        </span>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-right font-medium border-b border-r border-slate-100 ${m.montant < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{m.montant > 0 && '+'}{fmt(m.montant)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={multiPostes ? 5 : 4} className="px-3 py-2 text-slate-700 border-b border-l border-slate-100">Salaire du mois</td>
                  <td className="px-3 py-2 text-right text-emerald-600 border-b border-r border-slate-100">{fmt(base)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
) : (
  <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
    <table className="w-full text-xs">
      <thead className="bg-[#0F2A4A]">
        <tr>{['Mois', 'Net', 'Payé', 'Statut'].map((h, i) => (
          <th key={h} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] ${i === 0 ? 'border-l border-[#0F2A4A]' : ''}`}>{h}</th>
        ))}</tr>
      </thead>
      <tbody>
        {loadingHistorique ? (
          <tr><td colSpan={4} className="text-center py-8 text-slate-400 bg-white">Chargement…</td></tr>
        ) : historiqueError ? (
          <tr><td colSpan={4} className="text-center py-8 text-red-500 bg-white">{historiqueError}</td></tr>
        ) : historique.length === 0 ? (
          <tr><td colSpan={4} className="text-center py-8 text-slate-400 bg-white">Aucun mois validé pour l'instant.</td></tr>
        ) : historique.map((h, i) => (
          <tr key={h.id} className={i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
            <td className="px-3 py-2 text-slate-700 font-medium border-b border-l border-slate-100">{MOIS[h.mois - 1]} {h.annee}</td>
            <td className="px-3 py-2 text-slate-500 border-b border-slate-100">{fmt(h.montant_net)}</td>
            <td className="px-3 py-2 text-slate-500 border-b border-slate-100">{fmt(h.montant_paye)}</td>
            <td className="px-3 py-2 border-b border-slate-100"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUT_HISTO[h.statut].cls}`}>{STATUT_HISTO[h.statut].label}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

      <AjoutMouvementModal
        show={showForm} postes={employe.postes} onClose={closeForm}
        form={form} setForm={setForm} editingId={editingId} editingMouvement={editingMouvement}
        confirm={confirm} setConfirm={setConfirm} formError={formError}
        onRequestSave={requestSave} onSave={doSave} onRequestDelete={requestDelete} onDelete={doDelete}
        pendingBons={pendingBons} onFileChange={handleFileChange} onRemovePendingBon={handleRemovePendingBon}
        uploadingBon={uploadingBon} onDeleteExistingBon={handleDeleteExistingBon}
        lightboxUrl={lightboxUrl} setLightboxUrl={setLightboxUrl}
      />
    </ComptableLayout>
  );
};

export default DetailEmploye;