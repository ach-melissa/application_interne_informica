import { useState, useEffect } from 'react';
import { Users, GraduationCap, Check, AlertTriangle, X, Flag } from 'lucide-react';
import GroupScheduleTable from './GroupScheduleTable';

const API = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const jsonHeaders = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

// Same design tokens as AddFormationModal.jsx
const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';
const Label = ({ icon: Icon, text, required }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} className="text-slate-500" />}{text}{required && <span className="text-red-500 ml-0.5">*</span>}
  </p>
);
const Section = ({ children }) => <div className="grid grid-cols-2 gap-3">{children}</div>;

const Toggle = ({ checked, onChange, label, icon: Icon }) => (
  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-[#0369A1]' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
    {Icon && <Icon size={12} className="text-[#0369A1]" />}
    {label}
  </label>
);

export default function GroupFormModal({ formation_id, niveauId, formation, niveau, teachers, editGroup, onClose, onSaved }) {
  const isNewGroup = !editGroup;
 const [form, setForm] = useState({
  nom: editGroup?.nom ?? '', teacher_id: editGroup?.teacher_id ?? '', en_promotion: editGroup?.en_promotion ?? false,
  prix_promotion: editGroup?.prix_promotion ?? '', date_debut: editGroup?.date_debut?.slice(0, 10) ?? '',
  date_fin: editGroup?.date_fin?.slice(0, 10) ?? '', niveau_id: niveauId || '',
});
  const [periods, setPeriods] = useState([]);
    const [useDefaultPeriods, setUseDefaultPeriods] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmSave, setConfirmSave] = useState(false);
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [stagedStudents, setStagedStudents] = useState([]);
    const [stagedSchedules, setStagedSchedules] = useState([]);
    const [assignedStudents, setAssignedStudents] = useState([]);
const [stagedRemovals, setStagedRemovals] = useState([]);
  const [useDefaultDuree, setUseDefaultDuree] = useState(editGroup?.use_default_duree ?? true);
  const [dureeValeur, setDureeValeur] = useState(editGroup?.duree_valeur ?? '');
  const [typeDuree, setTypeDuree] = useState(editGroup?.type_duree ?? formation?.type_duree ?? 'heures');

  const copyFromTemplate = async () => {
    // Formation with non-uniform échéancier: pull the niveau's own default periods.
    if (formation?.a_niveaux && !formation?.echeancier_uniforme) {
      const template = niveau?.periods ?? [];
      if (!template.length) { setError("Ce niveau n'a pas d'échéancier par défaut."); return; }
      setPeriods(template.slice().sort((a, b) => Number(a.jours_offset) - Number(b.jours_offset))
        .map(t => ({ _id: crypto.randomUUID(), jours_offset: t.jours_offset, montant: t.montant })));
      return;
    }
    const res = await fetch(`${API}/api/formations/${formation_id}/periods`, { headers: authHeaders() });
    const template = await res.json();
    if (!template.length) { setError("Cette formation n'a pas d'échéancier par défaut."); return; }
    setPeriods(template.slice().sort((a, b) => Number(a.jours_offset) - Number(b.jours_offset))
      .map(t => ({ _id: crypto.randomUUID(), jours_offset: t.jours_offset, montant: t.montant })));
  };

  useEffect(() => {
        fetch(`${API}/api/groups/formation/${formation_id}/unassigned${niveauId ? `?niveau_id=${niveauId}` : ''}`, { headers: authHeaders() })
      .then(r => r.json()).then(setUnassignedStudents).catch(() => {});
    if (isNewGroup) { copyFromTemplate(); return; }
    fetch(`${API}/api/groups/${editGroup.id}/etudiants`, { headers: authHeaders() })
      .then(r => r.json()).then(setAssignedStudents).catch(() => {});
    fetch(`${API}/api/groups/${editGroup.id}/periods`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        setUseDefaultPeriods(data.use_default_periods);
        setPeriods((data.periods ?? []).slice().sort((a, b) => Number(a.jours_offset) - Number(b.jours_offset))
          .map(p => ({ _id: crypto.randomUUID(), jours_offset: p.jours_offset, montant: p.montant })));
      })
      .catch(() => { setUseDefaultPeriods(true); setPeriods([]); });
  }, []);

  const handleAssignStudent = (inscription_id) => {
    const student = unassignedStudents.find((i) => i.id === inscription_id);
    if (student) setStagedStudents((prev) => [...prev, student]);
    setUnassignedStudents((prev) => prev.filter((i) => i.id !== inscription_id));
  };
  const handleRemoveAssignedStudent = (inscription_id) => {
    const student = assignedStudents.find((i) => i.id === inscription_id);
    if (student) setStagedRemovals((prev) => [...prev, student]);
    setAssignedStudents((prev) => prev.filter((i) => i.id !== inscription_id));
  };
  const handleUnstageRemoval = (inscription_id) => {
    const student = stagedRemovals.find((i) => i.id === inscription_id);
    if (student) setAssignedStudents((prev) => [...prev, student]);
    setStagedRemovals((prev) => prev.filter((i) => i.id !== inscription_id));
  };
  const handleUnstageStudent = (inscription_id) => {
    const student = stagedStudents.find((i) => i.id === inscription_id);
    if (student) setUnassignedStudents((prev) => [...prev, student]);
    setStagedStudents((prev) => prev.filter((i) => i.id !== inscription_id));
  };

  const addPeriod = () => setPeriods(prev => [...prev, { _id: crypto.randomUUID(), jours_offset: 0, montant: '' }]);
  const removePeriod = (id) => setPeriods(prev => prev.filter(p => p._id !== id));
  const updatePeriodField = (id, field, value) => setPeriods(prev => prev.map(p => p._id === id ? { ...p, [field]: value } : p));
  const basePrice = formation?.a_niveaux && formation?.prix_uniforme === false
    ? Number(niveau?.prix ?? 0)
    : Number(formation?.prix ?? 0);
  const defaultDureeValeur = formation?.a_niveaux && formation?.duree_uniforme === false
    ? Number(niveau?.duree_valeur ?? 0)
    : Number(formation?.heures ?? 0);
  const defaultTypeDuree = formation?.a_niveaux && formation?.duree_uniforme === false && formation?.type_duree_uniforme === false
    ? (niveau?.type_duree || 'heures')
    : (formation?.type_duree || 'heures');
  const targetTotal = form.en_promotion && form.prix_promotion ? Number(form.prix_promotion) : basePrice;
  const periodsTotal = periods.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const periodsMismatch = !useDefaultPeriods && periods.length > 0 && Math.abs(periodsTotal - targetTotal) > 0.01;

  const cumulativeDates = (() => {
    if (!form.date_debut) return [];
    let current = new Date(form.date_debut);
    return periods.map((p) => { current = new Date(current); current.setDate(current.getDate() + Number(p.jours_offset || 0)); return current.toLocaleDateString('fr-FR'); });
  })();

   const validate = () => {
    if (!form.nom.trim()) { setError('Le nom du groupe est obligatoire.'); return false; }
    if (!form.teacher_id) { setError('Le professeur est obligatoire.'); return false; }
    if (!form.date_debut) { setError('La date de début est obligatoire.'); return false; }
    if (periodsMismatch) { setError('Le total des tranches doit être exactement égal au prix du groupe.'); return false; }
    if (!useDefaultDuree && (!dureeValeur || Number(dureeValeur) <= 0)) { setError('La durée personnalisée doit être un nombre valide.'); return false; }
    if (isNewGroup && stagedSchedules.length === 0) { setError('Ajoutez au moins un créneau horaire.'); return false; }
    setError(null);
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setConfirmSave(true);
    document.getElementById('groupModalScroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitCore = async () => {
    setSaving(true);
    setError(null);
    try {
      const url = editGroup ? `${API}/api/groups/${editGroup.id}` : `${API}/api/groups`;
            const dureePayload = {
        use_default_duree: useDefaultDuree,
        duree_valeur: useDefaultDuree ? null : Number(dureeValeur),
        type_duree: useDefaultDuree ? null : typeDuree,
      };
      const body = editGroup
  ? { nom: form.nom, teacher_id: form.teacher_id || null, en_promotion: form.en_promotion, prix_promotion: form.en_promotion ? form.prix_promotion || null : null, date_debut: form.date_debut || null, date_fin: form.date_fin || null, ...dureePayload }
  : { nom: form.nom, formation_id, niveau_id: form.niveau_id || null, teacher_id: form.teacher_id || null, en_promotion: form.en_promotion, prix_promotion: form.en_promotion ? form.prix_promotion || null : null, date_debut: form.date_debut || null, ...dureePayload };
      const res = await fetch(url, { method: editGroup ? 'PATCH' : 'POST', headers: jsonHeaders(), body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Erreur serveur');
      const saved = await res.json();

      // Échéancier : s'applique à la création ET à la modification.
      const periodsPayload = !useDefaultPeriods ? periods.filter(p => p.montant !== '' && p.montant != null) : [];
      if (!useDefaultPeriods || editGroup) {
        const periodsRes = await fetch(`${API}/api/groups/${saved.id}/periods`, { method: 'PUT', headers: jsonHeaders(), body: JSON.stringify({ periods: periodsPayload }) });
        if (!periodsRes.ok) throw new Error((await periodsRes.json().catch(() => ({})))?.error || "Erreur lors de l'enregistrement de l'échéancier.");
      }

      if (isNewGroup) {
        for (const { _localId, ...slot } of stagedSchedules) {
          await fetch(`${API}/api/schedules`, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify({ ...slot, group_id: saved.id }) });
        }
      }
      for (const student of stagedStudents) {
        await fetch(`${API}/api/inscriptions/${student.id}/assign-group`, {
          method: 'PATCH',
          headers: jsonHeaders(),
          body: JSON.stringify({ group_id: saved.id, niveau_id: form.niveau_id || null }),
        });
      }
      for (const student of stagedRemovals) {
        await fetch(`${API}/api/inscriptions/${student.id}/assign-group`, {
          method: 'PATCH',
          headers: jsonHeaders(),
          body: JSON.stringify({ group_id: null, niveau_id: niveauId || null }),
        });
      }
      setConfirmSave(false);
      onSaved();
    } catch (err) {
      setError(err.message);
      setConfirmSave(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 " onClick={onClose}>
            <div id="groupModalScroll" className="bg-white rounded-md shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto overflow-x-hidden" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0"><Users size={14} className="text-white" /></span>
              {isNewGroup ? 'Ajouter un groupe' : 'Modifier le groupe'}
            </h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>

          {(error || confirmSave) && (
            <div className="px-5 pb-3 space-y-2">
              {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-md">{error}</p>}

              {confirmSave && (
                <div className="bg-[#DCEBFA]/50 rounded-md p-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-[#0369A1] flex items-center gap-1.5">
                    <AlertTriangle size={13} /> {isNewGroup ? "Confirmer l'ajout de ce groupe ?" : 'Confirmer les modifications ?'}
                  </p>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setConfirmSave(false)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                    <button onClick={submitCore} disabled={saving} className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40">
                      {saving ? '...' : 'Oui'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <Section>
            <div className="col-span-2">
              <Label icon={Users} text="Nom du groupe" required />
              <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Groupe A" className={inp} />
            </div>
            <div className="col-span-2">
                           <Label icon={GraduationCap} text="Professeur" required />
              <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className={inp}>
                <option value="">— Aucun professeur —</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.nom} {t.prenom}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <Toggle checked={form.en_promotion} onChange={(val) => setForm({ ...form, en_promotion: val, prix_promotion: '' })} label="En promotion (prix différent pour ce groupe)" />
            </div>
            {form.en_promotion && (
              <div className="col-span-2">
                <Label text="Prix pour ce groupe (DA)" required />
                <input type="number" value={form.prix_promotion} onChange={(e) => setForm({ ...form, prix_promotion: e.target.value })} className={inp} />
              </div>
            )}
            <div className="col-span-2">
                           <Label text="Date de début" required />
              <input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} className={inp} />
            </div>
          </Section>

          <div className="border-t border-[#F1F5F9] pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">Échéancier de paiement <span className="text-red-500">*</span></p>
              <span className="text-[11px] text-slate-400">Prix du groupe : {targetTotal.toLocaleString('fr-FR')} DA</span>
            </div>

            <Toggle checked={useDefaultPeriods} onChange={(val) => { setUseDefaultPeriods(val); if (!val && periods.length === 0) copyFromTemplate(); }}
              label="Utiliser l'échéancier par défaut de la formation" />

            {!useDefaultPeriods && (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] text-slate-500 bg-[#F0F9FF] border border-[#DCEBFA] rounded-md px-2.5 py-1.5">
                  💡 Le nombre de jours de chaque tranche se compte depuis la tranche précédente (P1 se compte depuis la date de début). Ex : P1 = 0 (immédiat), P2 = 30 (30 jours après P1).
                </p>
                {periods.length === 0 && <p className="text-[11px] text-red-400">Aucune période — cliquez « + Période » pour en ajouter au moins une.</p>}
                {periods.map((p, idx) => (
                  <div key={p._id} className="flex items-center gap-2 bg-[#F8FAFC] rounded-md px-2.5 py-1.5">
                    <span className="text-[10px] text-slate-400 w-8 flex-shrink-0">P{idx + 1}</span>
                    <input type="number" value={p.jours_offset} onChange={(e) => updatePeriodField(p._id, 'jours_offset', e.target.value)}
                      placeholder="Jour" className={`${inp} flex-1`} />
                    <input type="number" value={p.montant} onChange={(e) => updatePeriodField(p._id, 'montant', e.target.value)} placeholder="Montant"
                      className={`${inp} flex-1`} />
                    <span className="text-[10px] text-slate-400 w-16 flex-shrink-0 text-right">{cumulativeDates[idx] ?? '—'}</span>
                    <button type="button" onClick={() => removePeriod(p._id)} className="text-slate-300 hover:text-red-400 flex-shrink-0"><X size={13} /></button>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <button type="button" onClick={addPeriod} className="text-[11px] font-medium text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1 rounded-full hover:bg-[#c9e2f7] transition">+ Période</button>
                  <span className={`text-[11px] font-medium ${periodsMismatch ? 'text-red-500' : 'text-emerald-600'}`}>
                    Total : {periodsTotal.toLocaleString('fr-FR')} / {targetTotal.toLocaleString('fr-FR')} DA
                  </span>
                </div>
                {periodsMismatch && <p className="text-[10px] text-red-500">Le total des tranches doit être exactement égal au prix du groupe.</p>}
              </div>
            )}
                  </div>

          <div className="border-t border-[#F1F5F9] pt-3">
            <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-600">Durée du groupe <span className="text-red-500">*</span></p>
              <span className="text-[11px] text-slate-400">
                Par défaut : {defaultDureeValeur} {defaultTypeDuree === 'seances' ? 'séances' : 'heures'}
              </span>
            </div>
                     <Toggle checked={useDefaultDuree} onChange={setUseDefaultDuree}
              label="Utiliser la durée par défaut de la formation" />
            {!useDefaultDuree && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <Label text="Type de durée" />
                  <select value={typeDuree} onChange={(e) => setTypeDuree(e.target.value)} className={inp}>
                    <option value="heures">Heures</option>
                    <option value="seances">Séances</option>
                  </select>
                </div>
                <div>
                  <Label text={typeDuree === 'seances' ? 'Nombre de séances' : "Nombre d'heures"} />
                  <div className="relative">
                    <input
                      type="number" min="1" value={dureeValeur}
                      onChange={(e) => setDureeValeur(e.target.value)}
                      placeholder={typeDuree === 'seances' ? 'Ex: 30' : 'Ex: 40'}
                      className={`${inp} pr-14`}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 pointer-events-none">
                      {typeDuree === 'seances' ? 'séances' : 'heures'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

         {!isNewGroup && (
            <div className="border-t border-[#F1F5F9] pt-3">
              <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                <Flag size={12} className="text-slate-500" /> Statut de fin de groupe
              </p>
              <Toggle
                checked={!!form.date_fin}
                onChange={(val) => setForm({ ...form, date_fin: val ? (form.date_fin || new Date().toISOString().slice(0, 10)) : '' })}
                label="Ce groupe est terminé"
              />
              {form.date_fin && (
                <div className="mt-2">
                  <Label text="Date de fin" />
                  <input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} className={inp} />
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mt-1.5 flex items-start gap-1.5">
                    <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                    Cette date déclenche le rappel d'archivage et arrête le renvoi normal des alertes de paiement. Décochez « Ce groupe est terminé » si c'était une erreur.
                  </p>
                </div>
              )}
            </div>
          )}

          {!isNewGroup && (
            <div>
              <Label icon={Users} text={`Étudiants du groupe (${assignedStudents.length})`} />
              {assignedStudents.length === 0 ? (
                <p className="text-xs text-slate-400 mt-1 bg-[#F8FAFC] border border-[#F1F5F9] rounded-md px-3 py-3 text-center">Aucun étudiant dans ce groupe.</p>
              ) : (
                <div className="mt-1 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {assignedStudents.map((i) => (
                    <div key={i.id} className="flex items-center gap-3 bg-white border border-[#F1F5F9] rounded-lg px-3 py-2 hover:border-[#DCEBFA] hover:bg-[#F8FAFC] transition">
                      <div className="w-8 h-8 rounded-full bg-[#DCEBFA] text-[#0369A1] flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                        {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}{(i.etudiant?.prenom?.[0] ?? '').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{i.etudiant?.nom} {i.etudiant?.prenom}</p>
                        <p className="text-[11px] text-slate-400 truncate">{i.etudiant?.telephone ?? 'Téléphone non renseigné'}</p>
                      </div>
                      <button onClick={() => handleRemoveAssignedStudent(i.id)}
                        className="text-[11px] font-medium text-red-500 bg-red-50 border border-red-500/20 px-2.5 py-1 rounded-full hover:bg-red-100 active:scale-95 transition flex-shrink-0">
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {stagedRemovals.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">À retirer dès l'enregistrement</p>
                  {stagedRemovals.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 bg-red-50 border border-red-500/20 rounded-lg px-3 py-2">
                      <div className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                        {(s.etudiant?.nom?.[0] ?? '?').toUpperCase()}{(s.etudiant?.prenom?.[0] ?? '').toUpperCase()}
                      </div>
                      <span className="flex-1 min-w-0 text-xs font-medium text-[#1E293B] truncate line-through">{s.etudiant?.nom} {s.etudiant?.prenom}</span>
                      <button onClick={() => handleUnstageRemoval(s.id)} className="text-[11px] font-medium text-slate-400 hover:text-[#0369A1] flex-shrink-0 transition">
                        Annuler
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div>
            <Label icon={GraduationCap} text="Étudiants confirmés non affectés" />
                       {unassignedStudents.length === 0 ? (
              <p className="text-xs text-slate-400 mt-1 bg-[#F8FAFC] border border-[#F1F5F9] rounded-md px-3 py-3 text-center">Aucun étudiant disponible.</p>
            ) : (
              <div className="mt-1 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {unassignedStudents.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 bg-white border border-[#F1F5F9] rounded-lg px-3 py-2 hover:border-[#DCEBFA] hover:bg-[#F8FAFC] transition">
                    <div className="w-8 h-8 rounded-full bg-[#DCEBFA] text-[#0369A1] flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                      {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}{(i.etudiant?.prenom?.[0] ?? '').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{i.etudiant?.nom} {i.etudiant?.prenom}</p>
                      <p className="text-[11px] text-slate-400 truncate">{i.etudiant?.telephone ?? 'Téléphone non renseigné'}</p>
                    </div>
                    <button onClick={() => handleAssignStudent(i.id)} className="text-[11px] font-medium text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1 rounded-full hover:bg-[#c9e2f7] transition flex-shrink-0">
                      Affecter
                    </button>
                  </div>
                ))}
              </div>
            )}
            {stagedStudents.length > 0 && (
  <div className="mt-2 space-y-1.5">
    <p className="text-[10px] text-slate-400 uppercase tracking-wide">À affecter dès l'enregistrement</p>
    {stagedStudents.map((s) => (
      <div key={s.id} className="flex items-center gap-3 bg-[#F0F9FF] border border-[#DCEBFA] rounded-lg px-3 py-2">
        <div className="w-7 h-7 rounded-full bg-[#0369A1] text-white flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
          {(s.etudiant?.nom?.[0] ?? '?').toUpperCase()}{(s.etudiant?.prenom?.[0] ?? '').toUpperCase()}
        </div>
        <span className="flex-1 min-w-0 text-xs font-medium text-[#1E293B] truncate">{s.etudiant?.nom} {s.etudiant?.prenom}</span>
        <button onClick={() => handleUnstageStudent(s.id)} className="text-[11px] font-medium text-slate-400 hover:text-red-500 flex-shrink-0 transition">
          Retirer
        </button>
      </div>
    ))}
  </div>
)}
          </div>

          <div>
                     <Label icon={Users} text="Emploi du temps" required />
            <div className="mt-1">
              <GroupScheduleTable
                groupId={editGroup?.id ?? null}
                staged={stagedSchedules}
                onAddStaged={(slot) => setStagedSchedules((prev) => [...prev, slot])}
                onRemoveStaged={(id) => setStagedSchedules((prev) => prev.filter((s) => s._localId !== id))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-[#F1F5F9]">{isNewGroup ? 'Annuler' : 'Fermer'}</button>
                        <button onClick={handleSubmit} disabled={saving || confirmSave || !form.nom.trim() || !form.teacher_id || !form.date_debut || periodsMismatch}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] disabled:opacity-40 transition-all font-medium">
              <Check size={12} />
              {saving ? 'Enregistrement...' : isNewGroup ? 'Ajouter' : 'Modifier'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}