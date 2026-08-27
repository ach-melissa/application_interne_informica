import { useState, useEffect } from 'react';
import { X, BookOpen, DollarSign, Clock, FileText, Users, Layers, Check, AlertTriangle } from 'lucide-react';
import NiveauxEditor from './NiveauxEditor';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';
const Label = ({ icon: Icon, text, required }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} className="text-slate-500" />}{text}{required && <span className="text-red-500 ml-0.5">*</span>}
  </p>
);
const Section = ({ children }) => <div className="grid grid-cols-2 gap-3">{children}</div>;

const Toggle = ({ checked, onChange, label, icon: Icon }) => (
  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
    <button type="button" onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-[#0369A1]' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
    {Icon && <Icon size={12} className="text-[#0369A1]" />}
    {label}
  </label>
);

const AddFormationModal = ({ onClose, onSuccess, formation = null }) => {
  const isEdit = !!formation;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    nom: formation?.nom || '',
    prix: formation?.prix ?? '',
    heures: formation?.heures ?? '',
    description: formation?.description || '',
    capacite_groupe: formation?.capacite_groupe ?? '',
    a_niveaux: formation?.a_niveaux ?? false,
    type_duree: formation?.type_duree || 'heures',
    prix_uniforme: formation?.prix_uniforme ?? true,
    duree_uniforme: formation?.duree_uniforme ?? true,
    type_duree_uniforme: formation?.type_duree_uniforme ?? true,
    echeancier_uniforme: formation?.echeancier_uniforme ?? true,
    capacite_uniforme: formation?.capacite_uniforme ?? true,
    statut: formation?.statut || 'active',
  });
  const [niveaux, setNiveaux] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [showDeactivateWarning, setShowDeactivateWarning] = useState(false);
  const [deactivateWarningMsg, setDeactivateWarningMsg] = useState('');
  const [confirmSave, setConfirmSave] = useState(false);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

useEffect(() => {
  if (isEdit) {
    fetch(`${API}/api/formations/${formation.id}/niveaux`, { headers: getHeaders() })
      .then(r => r.json())
      .then(data => setNiveaux(data.map(n => ({
        nom: n.nom, prix: n.prix ?? '', duree_valeur: n.duree_valeur ?? '', type_duree: n.type_duree || '',
        capacite_groupe: n.capacite_groupe ?? '', periods: n.periods || [],
      }))))
      .catch(() => {});

    fetch(`${API}/api/formations/${formation.id}/periods`, { headers: getHeaders() })
      .then(r => r.json())
      .then(data => setPeriods((data || []).map(p => ({ jours_offset: p.jours_offset, montant: p.montant }))))
      .catch(() => {});
  }
}, [isEdit, formation]);

  const showGlobalPrix = !form.a_niveaux || form.prix_uniforme;
  const showGlobalDuree = !form.a_niveaux || form.duree_uniforme;
  const showGlobalCapacite = !form.a_niveaux || form.capacite_uniforme;
  const periodsTotal = periods.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const periodsMismatch = periods.length > 0 && form.prix && Math.abs(periodsTotal - Number(form.prix)) > 0.01;
  const addPeriod = () => setPeriods(prev => [...prev, { jours_offset: 0, montant: '' }]);
  const removePeriod = idx => setPeriods(prev => prev.filter((_, i) => i !== idx));
  const updatePeriod = (idx, field, value) => setPeriods(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));

  const validate = () => {
    if (!form.nom.trim()) { setError('Le nom est obligatoire.'); return false; }
    if (showGlobalCapacite && !form.capacite_groupe) { setError('La capacité est obligatoire.'); return false; }
    if (showGlobalPrix && !form.prix) { setError('Le prix est obligatoire.'); return false; }
    if (showGlobalDuree && !form.heures) { setError('La durée est obligatoire.'); return false; }

    if (form.a_niveaux) {
      if (niveaux.length === 0) { setError('Ajoutez au moins un niveau.'); return false; }
      for (const n of niveaux) {
        if (!n.nom.trim()) { setError('Chaque niveau doit avoir un nom.'); return false; }
        if (!form.prix_uniforme && (n.prix === '' || Number(n.prix) <= 0)) { setError(`Prix requis pour le niveau "${n.nom}".`); return false; }
        if (!form.duree_uniforme && (n.duree_valeur === '' || Number(n.duree_valeur) <= 0)) { setError(`Durée requise pour le niveau "${n.nom}".`); return false; }
        if (!form.duree_uniforme && !form.type_duree_uniforme && !n.type_duree) { setError(`Unité requise pour le niveau "${n.nom}".`); return false; }
        if (!form.capacite_uniforme && (n.capacite_groupe === '' || Number(n.capacite_groupe) <= 0)) { setError(`Capacité requise pour le niveau "${n.nom}".`); return false; }
        if (!form.echeancier_uniforme) {
          if (!n.periods || n.periods.length === 0) { setError(`Ajoutez au moins une période pour le niveau "${n.nom}".`); return false; }
          const sum = n.periods.reduce((s, p) => s + (Number(p.montant) || 0), 0);
          if (Math.abs(sum - Number(n.prix || 0)) > 0.01) { setError(`Le total des tranches du niveau "${n.nom}" doit être égal à son prix.`); return false; }
        }
      }
    }
    if (form.echeancier_uniforme && periods.length === 0) { setError('Ajoutez au moins une période de paiement.'); return false; }
    setError(null);
    return true;
  };

  const handleSubmit = () => {
  if (!validate()) return;
  if (isEdit) {
    setConfirmSave(true);
    document.getElementById('formationModalScroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    submitCore(false);
  }
};
  const submitCore = async (confirmDeactivation = false) => {
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(
        isEdit ? `${API}/api/formations/${formation.id}` : `${API}/api/formations`,
        { method: isEdit ? 'PATCH' : 'POST', headers: getHeaders(), body: JSON.stringify({ ...form, confirm_deactivation: confirmDeactivation }) }
      );
      const data = await res.json();

      if (res.status === 409 && data.needs_confirmation) {
        setDeactivateWarningMsg(data.warning);
        setShowDeactivateWarning(true);
        setConfirmSave(false);
        document.getElementById('formationModalScroll')?.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (!res.ok) throw new Error(data.error);

      const validPeriods = periods.filter(p => p.montant !== '' && p.montant !== null);
      await fetch(`${API}/api/formations/${data.id}/periods`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify({ periods: validPeriods }),
      });
      if (form.a_niveaux) {
        await fetch(`${API}/api/formations/${data.id}/niveaux`, {
          method: 'PUT', headers: getHeaders(), body: JSON.stringify({ niveaux }),
        });
      }
      setShowDeactivateWarning(false);
      setConfirmSave(false);
      onSuccess?.(data); onClose();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div id="formationModalScroll" className="bg-white rounded-md shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto overflow-x-hidden" onClick={e => e.stopPropagation()}>

        <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
                <BookOpen size={14} className="text-white" />
              </span>
              {isEdit ? 'Modifier la formation' : 'Ajouter une formation'}
            </h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>

          {(error || showDeactivateWarning || confirmSave) && (
            <div className="px-5 pb-3 space-y-2">
              {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-md">{error}</p>}

              {showDeactivateWarning && (
                <div className="bg-amber-50 rounded-md p-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-amber-700 flex items-center gap-1.5"><AlertTriangle size={13} /> {deactivateWarningMsg}</p>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setShowDeactivateWarning(false)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                    <button onClick={() => submitCore(true)} disabled={submitting} className="text-xs px-3 py-1.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40">
                      {submitting ? '...' : 'Oui'}
                    </button>
                  </div>
                </div>
              )}

              {confirmSave && !showDeactivateWarning && (
                <div className="bg-[#DCEBFA]/50 rounded-md p-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-[#0369A1] flex items-center gap-1.5">
                    <AlertTriangle size={13} /> {isEdit ? 'Confirmer les modifications ?' : 'Confirmer l\'ajout de cette formation ?'}
                  </p>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setConfirmSave(false)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                    <button onClick={() => submitCore(false)} disabled={submitting} className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40">
                      {submitting ? '...' : 'Oui'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">

          {/* Nom */}
          <div>
            <Label icon={BookOpen} text="Nom de la formation" required />
            <input value={form.nom} onChange={set('nom')} className={inp} placeholder="Ex: Anglais débutant" />
          </div>

          {/* Niveaux ? — décision structurante, posée avant prix/durée */}
          <div className="border-t border-[#F1F5F9] pt-3">
            <Toggle checked={form.a_niveaux} icon={Layers} label="Cette formation a des niveaux"
              onChange={v => setForm(p => ({ ...p, a_niveaux: v }))} />

            {form.a_niveaux && (
  <div className="mt-3 bg-[#F8FAFC] border border-[#F1F5F9] rounded-md p-3">
    <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-2">Réglages communs à tous les niveaux</p>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
      <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
        <input type="checkbox" checked={form.prix_uniforme} className="accent-[#0369A1] w-3.5 h-3.5"
          onChange={e => setForm(p => ({ ...p, prix_uniforme: e.target.checked }))} />
        Même prix
      </label>
      <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
        <input type="checkbox" checked={form.duree_uniforme} className="accent-[#0369A1] w-3.5 h-3.5"
          onChange={e => setForm(p => ({
            ...p,
            duree_uniforme: e.target.checked,
            type_duree_uniforme: e.target.checked ? true : p.type_duree_uniforme,
          }))} />
        Même durée
      </label>
      {!form.duree_uniforme && (
        <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
          <input type="checkbox" checked={form.type_duree_uniforme} className="accent-[#0369A1] w-3.5 h-3.5"
            onChange={e => setForm(p => ({ ...p, type_duree_uniforme: e.target.checked }))} />
          Même unité (h/séances)
        </label>
      )}
      <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
        <input type="checkbox" checked={form.echeancier_uniforme} className="accent-[#0369A1] w-3.5 h-3.5"
          onChange={e => setForm(p => ({ ...p, echeancier_uniforme: e.target.checked }))} />
        Même échéancier
      </label>
      <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
        <input type="checkbox" checked={form.capacite_uniforme} className="accent-[#0369A1] w-3.5 h-3.5"
          onChange={e => setForm(p => ({ ...p, capacite_uniforme: e.target.checked }))} />
        Même capacité
      </label>
    </div>
  </div>
)}
          </div>

          {form.a_niveaux && !form.duree_uniforme && form.type_duree_uniforme && (
            <div>
              <Label icon={Clock} text="Unité de durée (pour tous les niveaux)" required />
              <select value={form.type_duree} onChange={e => setForm(p => ({ ...p, type_duree: e.target.value }))} className={inp}>
                <option value="heures">Heures</option>
                <option value="seances">Séances</option>
              </select>
            </div>
          )}

          {(showGlobalPrix || showGlobalDuree) && (
            <Section>
              {showGlobalPrix && (
                <div>
                  <Label icon={DollarSign} text="Prix (DA)" required />
                  <input type="number" min="0" step="0.01" value={form.prix} onChange={set('prix')} className={inp} placeholder="0" />
                </div>
              )}
                           {showGlobalDuree && (
                <div className="min-w-0">
                  <Label icon={Clock} text={form.a_niveaux ? 'Durée totale' : 'Durée'} required />
                  <div className="flex gap-1.5 min-w-0">
                    <input type="number" min="1" value={form.heures} onChange={set('heures')} className={`${inp} flex-1 min-w-0`}
                      placeholder={form.type_duree === 'seances' ? 'Nb séances' : 'Nb heures'} />
                    <select value={form.type_duree} onChange={e => setForm(p => ({ ...p, type_duree: e.target.value }))} className={`${inp} w-[90px] flex-shrink-0 text-[11px]`}>
                      <option value="heures">Heures</option>
                      <option value="seances">Séances</option>
                    </select>
                  </div>
                </div>
              )}
            </Section>
          )}

          {form.a_niveaux && (
           <NiveauxEditor
  niveaux={niveaux}
  setNiveaux={setNiveaux}
  prixUniforme={form.prix_uniforme}
  globalPrix={form.prix}
  dureeUniforme={form.duree_uniforme}
  typeDureeUniforme={form.type_duree_uniforme}
  typeDureeDefault={form.type_duree}
  echeancierUniforme={form.echeancier_uniforme}
  capaciteUniforme={form.capacite_uniforme}
/>
          )}

          {/* Description */}
          <div>
            <Label icon={FileText} text="Description" />
            <textarea value={form.description} onChange={set('description')} rows={3} className={`${inp} resize-none`} placeholder="Optionnel" />
          </div>

          <Section>
            {showGlobalCapacite && (
              <div>
                <Label icon={Users} text="Capacité (étudiants)" required />
                <input type="number" min="1" value={form.capacite_groupe} onChange={set('capacite_groupe')} className={inp} placeholder="Ex: 20" />
              </div>
            )}
            <div className="flex items-end">
              <Toggle checked={form.statut === 'active'}
                label={form.statut === 'active' ? 'Formation active' : 'Formation désactivée'}
                onChange={v => setForm(p => ({ ...p, statut: v ? 'active' : 'non_active' }))} />
            </div>
          </Section>

          {/* Échéancier — visible ici pour: toutes les formations SANS niveaux, et les formations AVEC niveaux quand "Même échéancier" est coché */}
          {(!form.a_niveaux || form.echeancier_uniforme) && (
            <div className="border-t border-[#F1F5F9] pt-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-semibold text-slate-600">Échéancier de paiement <span className="text-red-500">*</span></p>
                  <p className="text-[10px] text-slate-400">Proposé à la création d'un groupe — modifiable ensuite. Au moins une période requise.</p>
                </div>
                <button type="button" onClick={addPeriod} className="text-[11px] font-medium text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1 rounded-full hover:bg-[#c9e2f7] transition flex-shrink-0">
                  + Période
                </button>
              </div>

              {periods.length === 0 ? (
                <p className="text-[11px] text-red-400">Aucune période — cliquez « + Période » pour en ajouter au moins une.</p>
              ) : (
                <div className="space-y-1.5">
                  {periods.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#F8FAFC] rounded-md px-2.5 py-1.5">
                      <span className="text-[10px] text-slate-400 w-8 flex-shrink-0">P{idx + 1}</span>
                      <input type="number" value={p.jours_offset} onChange={e => updatePeriod(idx, 'jours_offset', e.target.value)}
                        placeholder="Jour (0, 15...)" className={`${inp} flex-1`} />
                      <input type="number" value={p.montant} onChange={e => updatePeriod(idx, 'montant', e.target.value)}
                        placeholder="Montant (DA)" className={`${inp} flex-1`} />
                      <button type="button" onClick={() => removePeriod(idx)} className="text-slate-300 hover:text-red-400 flex-shrink-0">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-end pt-1">
                    <span className={`text-[11px] font-medium ${periodsMismatch ? 'text-red-500' : 'text-emerald-600'}`}>
                      Total : {periodsTotal.toLocaleString('fr-FR')} / {Number(form.prix || 0).toLocaleString('fr-FR')} DA
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
            <button onClick={handleSubmit} disabled={submitting || showDeactivateWarning || confirmSave || (form.echeancier_uniforme && (periodsMismatch || periods.length === 0))}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] disabled:opacity-40 transition-all font-medium">
              <Check size={12} />
              {submitting ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddFormationModal;