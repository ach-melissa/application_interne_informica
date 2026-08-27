import { useState, useEffect } from 'react';
import { Users, GraduationCap, X } from 'lucide-react';
import GroupScheduleTable from './GroupScheduleTable';

const inp = 'w-full bg-[#F8FAFC] border border-transparent rounded-lg px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors';
const Label = ({ icon: Icon, text }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} className="text-[#0369A1]" />}{text}
  </p>
);
const Section = ({ children }) => <div className="p-2 grid grid-cols-2 gap-3">{children}</div>;

const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2.5 cursor-pointer select-none">
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-[#0369A1]' : 'bg-slate-200'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
    <span className="text-xs text-slate-600">{label}</span>
  </label>
);

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const jsonHeaders = () => ({ 'Content-Type': 'application/json', ...authHeaders() });
const API = import.meta.env.VITE_API_URL;

export default function GroupFormModal({ formation_id, niveauId, formation, teachers, editGroup, onClose, onSaved }) {
  const isNewGroup = !editGroup;
  const [form, setForm] = useState({
    nom: editGroup?.nom ?? '', teacher_id: editGroup?.teacher_id ?? '', en_promotion: editGroup?.en_promotion ?? false,
    prix_promotion: editGroup?.prix_promotion ?? '', date_debut: editGroup?.date_debut?.slice(0, 10) ?? '', niveau_id: niveauId || '',
  });
  const [periods, setPeriods] = useState([]);
  const [useDefaultPeriods, setUseDefaultPeriods] = useState(isNewGroup ? false : true);
  const [saving, setSaving] = useState(false);
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [stagedStudents, setStagedStudents] = useState([]);
  const [stagedSchedules, setStagedSchedules] = useState([]);

  const copyFromTemplate = async () => {
    const res = await fetch(`${API}/api/formations/${formation_id}/periods`, { headers: authHeaders() });
    const template = await res.json();
    if (!template.length) { alert("Cette formation n'a pas d'échéancier par défaut."); return; }
    setPeriods(template.slice().sort((a, b) => Number(a.jours_offset) - Number(b.jours_offset))
      .map(t => ({ _id: crypto.randomUUID(), jours_offset: t.jours_offset, montant: t.montant })));
  };

  useEffect(() => {
    fetch(`${API}/api/groups/formation/${formation_id}/unassigned`, { headers: authHeaders() })
      .then(r => r.json()).then(setUnassignedStudents).catch(() => {});

    if (isNewGroup) { copyFromTemplate(); return; }

    fetch(`${API}/api/groups/${editGroup.id}/periods`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        setUseDefaultPeriods(data.use_default_periods);
        setPeriods((data.periods ?? []).slice().sort((a, b) => Number(a.jours_offset) - Number(b.jours_offset))
          .map(p => ({ _id: crypto.randomUUID(), jours_offset: p.jours_offset, montant: p.montant })));
      })
      .catch(() => { setUseDefaultPeriods(true); setPeriods([]); });
  }, []);

  const handleAssignStudent = async (inscription_id) => {
    if (isNewGroup) {
      const student = unassignedStudents.find((i) => i.id === inscription_id);
      if (student) setStagedStudents((prev) => [...prev, student]);
      setUnassignedStudents((prev) => prev.filter((i) => i.id !== inscription_id));
      return;
    }
    try {
      await fetch(`${API}/api/inscriptions/${inscription_id}/assign-group`, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify({ group_id: editGroup.id }) });
      setUnassignedStudents((prev) => prev.filter((i) => i.id !== inscription_id));
    } catch (err) { alert(err.message); }
  };

  const handleUnstageStudent = (inscription_id) => {
    const student = stagedStudents.find((i) => i.id === inscription_id);
    if (student) setUnassignedStudents((prev) => [...prev, student]);
    setStagedStudents((prev) => prev.filter((i) => i.id !== inscription_id));
  };

  const addPeriod = () => setPeriods(prev => [...prev, { _id: crypto.randomUUID(), jours_offset: 0, montant: '' }]);
  const removePeriod = (id) => setPeriods(prev => prev.filter(p => p._id !== id));
  const updatePeriodField = (id, field, value) => setPeriods(prev => prev.map(p => p._id === id ? { ...p, [field]: value } : p));

  const targetTotal = form.en_promotion && form.prix_promotion ? Number(form.prix_promotion) : Number(formation?.prix_etudiant ?? formation?.prix ?? 0);
  const periodsTotal = periods.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const periodsMismatch = !useDefaultPeriods && periods.length > 0 && Math.abs(periodsTotal - targetTotal) > 0.01;

  const cumulativeDates = (() => {
    if (!form.date_debut) return [];
    let current = new Date(form.date_debut);
    return periods.map((p) => { current = new Date(current); current.setDate(current.getDate() + Number(p.jours_offset || 0)); return current.toLocaleDateString('fr-FR'); });
  })();

  const handleSave = async () => {
    if (!form.nom.trim() || periodsMismatch) return;
    setSaving(true);
    try {
      const url = editGroup ? `${API}/api/groups/${editGroup.id}` : `${API}/api/groups`;
      const body = editGroup
        ? { nom: form.nom, teacher_id: form.teacher_id || null, en_promotion: form.en_promotion, prix_promotion: form.en_promotion ? form.prix_promotion || null : null, date_debut: form.date_debut || null }
        : { nom: form.nom, formation_id, niveau_id: form.niveau_id || null, teacher_id: form.teacher_id || null, en_promotion: form.en_promotion, prix_promotion: form.en_promotion ? form.prix_promotion || null : null, date_debut: form.date_debut || null };

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
        for (const student of stagedStudents) {
          await fetch(`${API}/api/inscriptions/${student.id}/assign-group`, { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify({ group_id: saved.id }) });
        }
      }
      onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-md shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0"><Users size={14} className="text-white" /></span>
              {isNewGroup ? 'Ajouter un groupe' : 'Modifier le groupe'}
            </h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <Section>
            <div className="col-span-2">
              <Label icon={Users} text="Nom du groupe *" />
              <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Groupe A" className={inp} />
            </div>
            <div className="col-span-2">
              <Label icon={GraduationCap} text="Professeur" />
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
                <Label icon={Users} text="Prix pour ce groupe (DA)" />
                <input type="number" value={form.prix_promotion} onChange={(e) => setForm({ ...form, prix_promotion: e.target.value })} className={inp} />
              </div>
            )}
            <div className="col-span-2">
              <Label text="Date de début" />
              <input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} className={inp} />
            </div>
          </Section>

          <div className="border-t border-[#F1F5F9] pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">Échéancier de paiement</p>
              <span className="text-[11px] text-slate-400">Prix du groupe : {targetTotal.toLocaleString('fr-FR')} DA</span>
            </div>

            <Toggle checked={useDefaultPeriods} onChange={(val) => { setUseDefaultPeriods(val); if (!val && periods.length === 0) copyFromTemplate(); }}
              label="Utiliser l'échéancier par défaut de la formation" />

            {!useDefaultPeriods && (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] text-slate-400 bg-[#F0F9FF] border border-[#DCEBFA] rounded-lg px-2.5 py-1.5">
                  💡 Le nombre de jours de chaque tranche se compte depuis la tranche précédente (P1 se compte depuis la date de début). Ex : P1 = 0 (immédiat), P2 = 30 (30 jours après P1).
                </p>
                {periods.length === 0 && <p className="text-[11px] text-slate-400">Aucune période — ajoutez-en une ou copiez le modèle.</p>}
                {periods.map((p, idx) => (
                  <div key={p._id} className="flex items-center gap-2 bg-[#F8FAFC] rounded-lg px-2.5 py-1.5">
                    <span className="text-[10px] text-slate-400 w-8 flex-shrink-0">P{idx + 1}</span>
                    <input type="number" value={p.jours_offset} onChange={(e) => updatePeriodField(p._id, 'jours_offset', e.target.value)}
                      placeholder={idx === 0 ? 'Jours après le début (0 = immédiat)' : 'Jours après P' + idx}
                      className="flex-1 bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
                    <input type="number" value={p.montant} onChange={(e) => updatePeriodField(p._id, 'montant', e.target.value)} placeholder="Montant"
                      className="flex-1 bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
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

          <div>
            <Label icon={GraduationCap} text="Étudiants confirmés non affectés" />
            {unassignedStudents.length === 0 ? <p className="text-xs text-slate-400 mt-1">Aucun étudiant disponible.</p> : (
              <div className="border border-[#F1F5F9] rounded-xl overflow-hidden mt-1">
                <table className="w-full text-xs">
                  <thead className="bg-[#DCEBFA]">
                    <tr>
                      <th className="text-left px-3 py-2 text-[#0369A1] font-semibold text-[10px] uppercase tracking-wide">Étudiant</th>
                      <th className="text-left px-3 py-2 text-[#0369A1] font-semibold text-[10px] uppercase tracking-wide">Téléphone</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {unassignedStudents.map((i) => (
                      <tr key={i.id} className="hover:bg-[#DCEBFA]/30">
                        <td className="px-3 py-2 font-medium text-slate-800">{i.etudiant?.nom} {i.etudiant?.prenom}</td>
                        <td className="px-3 py-2 text-slate-500">{i.etudiant?.telephone ?? '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => handleAssignStudent(i.id)} className="text-[11px] font-medium text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1 rounded-full hover:bg-[#c9e2f7] transition">Affecter</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {stagedStudents.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">À affecter dès l'enregistrement</p>
                {stagedStudents.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-700 rounded-lg px-2.5 py-1.5">
                    <span>{s.etudiant?.nom} {s.etudiant?.prenom}</span>
                    <button onClick={() => handleUnstageStudent(s.id)} className="text-red-400 hover:text-red-600 text-[11px]">Retirer</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label icon={Users} text="Emploi du temps" />
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
            <button onClick={handleSave} disabled={saving || !form.nom.trim() || periodsMismatch}
              className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] disabled:opacity-40 transition-all font-medium">
              {saving ? 'Enregistrement...' : isNewGroup ? 'Ajouter' : 'Modifier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}