import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, X, CalendarDays, Lock, UserCheck, UserX, Clock } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { resolveGroupDuration, computeNextSessionDate } from '../../../utils/pointageHelpers';

const API = import.meta.env.VITE_API_URL;

const STATUT_LABEL = { present: 'P', absent: 'A', retard: 'R' };
const STATUT_STYLE = {
  present: 'text-emerald-700',
  absent:  'text-red-600',
  retard:  'text-amber-700',
};

// Date du jour en Algérie, format YYYY-MM-DD — doit rester cohérent
// avec isSessionToday() côté serveur (profController.js).
const todayAlgeria = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Algiers' });

const getJourSemaine = (dateStr) =>
  new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'Africa/Algiers' });
/**
 * GroupAttendance — prof-facing "fiche de pointage".
 * Visually matches the admin PointageTab (fiche header, table layout,
 * rounded-md + scrollbar styling) but intentionally has NO admin-only
 * actions: no edit-mode toggle, no pending-session "Terminer" batch
 * workflow, no "Ce groupe a terminé" button/banner. Every request is
 * scoped to the authenticated prof's own group via `apiBase`, and
 * respects the backend rule that a prof can only pointer aujourd'hui
 * (createAttendanceRecord / updateAttendanceRecord / deleteAttendanceRecord
 * are locked server-side to the session's own date).
 *
 * REQUIRED ROUTES (add to profRoutes.js if missing):
 *   GET    /api/profs/me/groups/:groupId             -> getProfGroup
 *   GET    /api/profs/me/groups/:groupId/students     -> getProfGroupStudents
 *   GET    /api/profs/me/groups/:groupId/attendance    -> getProfGroupAttendance ({ sessions, records })
 *   POST   /api/profs/me/groups/:groupId/sessions      -> createProfGroupSession
 *   PATCH  /api/profs/me/groups/:groupId/sessions/:sessionId   -> updateProfGroupSession
 *   DELETE /api/profs/me/groups/:groupId/sessions/:sessionId   -> deleteProfGroupSession
 *   POST   /api/profs/me/groups/:groupId/attendance/:recordId? -> createAttendanceRecord
 *   PATCH  /api/profs/me/groups/:groupId/attendance/:recordId  -> updateAttendanceRecord
 *   DELETE /api/profs/me/groups/:groupId/attendance/:recordId  -> deleteAttendanceRecord
 *
 * NOTE: date_debut / date_fin / jours_formation / heure_formation are
 * shown read-only here — there is no PATCH route letting a prof edit
 * these fiche fields (only a structured, per-day `schedules` PATCH
 * exists, which is a different feature). Say the word if you want a
 * dedicated updateProfGroupFiche endpoint added for these 4 fields.
 *
 * Props: groupId (required)
 */
const GroupAttendance = ({ groupId }) => {
  const { user } = useAuth();

  const [groupData, setGroupData] = useState(null);
  const [etudiants, setEtudiants] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [addingSession, setAddingSession] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState('normale');
  const [pendingSession, setPendingSession] = useState(false);
  const [joursEmploi, setJoursEmploi] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const dropdownRef = useRef(null);
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [dureeEffectuee, setDureeEffectuee] = useState('');
  const [dureeTouched, setDureeTouched] = useState(false);
  const { type_duree: durationType } = resolveGroupDuration(
    groupData || {}, groupData?.formations, groupData?.niveau
  );
  const isHourBased = durationType === 'heures';
  useEffect(() => {
    if (isHourBased && heureDebut && heureFin && !dureeTouched) {
      const [sh, sm] = heureDebut.split(':').map(Number);
      const [eh, em] = heureFin.split(':').map(Number);
      const diff = Math.max(0, (eh + em / 60) - (sh + sm / 60));
      setDureeEffectuee(diff ? diff.toFixed(2) : '');
    }
  }, [heureDebut, heureFin, isHourBased, dureeTouched]);

  const token = () => localStorage.getItem('token');
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token()}`,
  });
  const apiBase = `${API}/api/profs/me/groups/${groupId}`;

  // ── Fetch everything directly from the DB for this prof's group ──
  const fetchAll = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [resGroup, resStudents, resAttendance, resSchedule] = await Promise.all([
        fetch(apiBase, { headers: getHeaders() }),
        fetch(`${apiBase}/students`, { headers: getHeaders() }),
        fetch(`${apiBase}/attendance`, { headers: getHeaders() }),
        fetch(`${API}/api/schedules/me`, { headers: getHeaders() }),
      ]);

      if (!resGroup.ok) throw new Error('Impossible de charger les informations du groupe.');
      const groupJson = await resGroup.json();
      setGroupData(groupJson);

      if (!resStudents.ok) throw new Error('Impossible de charger les stagiaires du groupe.');
      const studentsJson = await resStudents.json();
      // getProfGroupStudents returns { id, etudiant_id, etudiants: {...} } (plural key)
      const mappedStudents = (Array.isArray(studentsJson) ? studentsJson : [])
        .map((row) => ({
          id: row.etudiant_id ?? row.etudiants?.id,
          nom: row.etudiants?.nom ?? '',
          prenom: row.etudiants?.prenom ?? '',
        }))
        .filter((s) => s.id);
      setEtudiants(mappedStudents);

      if (!resAttendance.ok) throw new Error('Impossible de charger le pointage.');
      // getProfGroupAttendance returns { sessions, records } bundled together
      const { sessions: sessionsJson, records: recordsJson } = await resAttendance.json();
      const sortedSessions = Array.isArray(sessionsJson)
        ? [...sessionsJson].sort((a, b) => new Date(a.date) - new Date(b.date))
        : [];
      setSessions(sortedSessions);

      const map = {};
      (Array.isArray(recordsJson) ? recordsJson : []).forEach((a) => {
        map[`${a.session_id}|${a.etudiant_id}`] = { id: a.id, statut: a.statut };
      });
      setAttendance(map);

      if (resSchedule.ok) {
        const scheduleJson = await resSchedule.json();
        const filteredSchedule = (Array.isArray(scheduleJson) ? scheduleJson : [])
          .filter((row) => String(row.groups?.id) === String(groupId));
        setJoursEmploi([...new Set(filteredSchedule.map((row) => row.jour_semaine))]);
      }
    } catch (err) {
      console.error(err);
      setLoadError(err.message || 'Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // ── Close statut dropdown on outside click ──────────────────────
  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setEditingCell(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!newDate) return;
    const jour = getJourSemaine(newDate);
    if (!joursEmploi.includes(jour) && newType === 'normale') {
      setNewType('remplacement');
    }
  }, [newDate, joursEmploi]);
  // ── Update durée séance ──────────────────────────────────────────
const updateDuree = async (sessionId, duree) => {
  try {
    const res = await fetch(`${apiBase}/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ duree_effectuee: duree }),
    });
      if (!res.ok) throw new Error('Échec de la sauvegarde de la durée');
    setSessions((prev) => prev.map((x) => (x.id === sessionId ? { ...x, duree_effectuee: duree } : x)));
    } catch (err) {
      console.error(err);
      alert("La durée n'a pas pu être enregistrée. Réessayez.");
    }
  };

  // ── Update statut (present / absent / retard / —) ───────────────
  // Locked server-side: a prof can only pointer la séance du jour même
  // (isSessionToday côté profController.js). isEditableToday() ci-dessous
  // reflète cette règle côté UI pour ne pas proposer un pointage voué à
  // échouer.
  const updateStatut = async (session_id, etudiant_id, next) => {
    const key = `${session_id}|${etudiant_id}`;
    const prev = attendance[key];
    setEditingCell(null);
    try {
      if (!next && prev?.id) {
        const res = await fetch(`${apiBase}/attendance/${prev.id}`, { method: 'DELETE', headers: getHeaders() });
        if (!res.ok) throw new Error();
        setAttendance((a) => { const n = { ...a }; delete n[key]; return n; });
      } else if (prev?.id) {
        const res = await fetch(`${apiBase}/attendance/${prev.id}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ statut: next }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAttendance((a) => ({ ...a, [key]: { id: data.id, statut: data.statut } }));
      } else if (next) {
        const res = await fetch(`${apiBase}/attendance`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ session_id, etudiant_id, statut: next }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAttendance((a) => ({ ...a, [key]: { id: data.id, statut: data.statut } }));
      }
    } catch (err) {
      console.error(err);
      setSaveError('Erreur lors de la mise à jour du pointage (rappel : le pointage n\'est modifiable que le jour même de la séance).');
    }
  };

  // ── Add session ──────────────────────────────────────────────────
  const addSession = async () => {
    if (!newDate) return;
    setPendingSession(true);
    setSaveError(null);
    try {
      const res = await fetch(`${apiBase}/sessions`, {
        method: 'POST',
        headers: getHeaders(),
body: JSON.stringify({
  date: newDate, type_seance: newType,
  heure_debut: heureDebut,
  heure_fin: isHourBased ? heureFin : null,
  duree_effectuee: isHourBased ? Number(dureeEffectuee) : null,
}),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSessions((s) => [...s, data].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setNewDate('');
      setNewType('normale');
      setHeureDebut(''); setHeureFin(''); setDureeEffectuee(''); setDureeTouched(false);
      setAddingSession(false);
    } catch (err) {
      console.error(err);
      setSaveError("Erreur lors de la création de la séance.");
    } finally {
      setPendingSession(false);
    }
  };

  // ── Delete session ────────────────────────────────────────────────
  const deleteSession = async (sessionId) => {
    if (!confirm('Supprimer cette séance ?')) return;
    try {
      const res = await fetch(`${apiBase}/sessions/${sessionId}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error();
      setSessions((s) => s.filter((x) => x.id !== sessionId));
    } catch (err) {
      console.error(err);
      setSaveError('Erreur lors de la suppression de la séance.');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const isEditableToday = (sessionDate) => sessionDate?.slice(0, 10) === todayAlgeria();

  // Nombre de stagiaires présents — calculé en direct depuis le pointage, par séance
  const getNbPresents = (sessionId) =>
    Object.entries(attendance).filter(([k, v]) => k.startsWith(`${sessionId}|`) && (v.statut === 'present' || v.statut === 'retard')).length;

  const teacherName = groupData?.teacher?.user
    ? `${groupData.teacher.user.nom ?? ''} ${groupData.teacher.user.prenom ?? ''}`.trim()
    : (user ? `${user.nom ?? ''} ${user.prenom ?? ''}`.trim() : '—');

  const jourSemaineSelectionne = newDate ? getJourSemaine(newDate) : null;
  const jourValide = jourSemaineSelectionne ? joursEmploi.includes(jourSemaineSelectionne) : true;
const canConfirm = newDate && heureDebut && (!isHourBased || (heureFin && dureeEffectuee)) && (newType !== 'normale' || jourValide);
  const suggestedNextDate = addingSession
    ? computeNextSessionDate(groupData?.jours_formation, sessions.length ? sessions[sessions.length - 1].date : null)
    : null;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-4 py-3">
        {loadError}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden; }
          #pointage-print-area, #pointage-print-area * { visibility: visible; }
          #pointage-print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
        }
        .pointage-scroll { scrollbar-width: thin; scrollbar-color: #CBD5E1 transparent; }
        .pointage-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
        .pointage-scroll::-webkit-scrollbar-track { background: transparent; }
        .pointage-scroll::-webkit-scrollbar-thumb { background-color: #CBD5E1; border-radius: 9999px; }
        .pointage-scroll::-webkit-scrollbar-thumb:hover { background-color: #94A3B8; }
      `}</style>
      <div className="space-y-4">
        {/* ── Error banner ── */}
        {saveError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2 print:hidden">
            <span className="flex-1">{saveError}</span>
            <button onClick={() => setSaveError(null)} className="font-bold text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between print:hidden">
          <p className="text-sm text-slate-400">{sessions.length} séance(s)</p>
          <button
            onClick={() => {
              setNewDate(todayAlgeria());
              setHeureDebut(''); setHeureFin(''); setDureeEffectuee(''); setDureeTouched(false);
              setAddingSession(true);
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white font-medium hover:bg-[#16385f] transition-colors"
          >
            <Plus size={14} /> Ajouter séance
          </button>
        </div>

        {/* ── Add session modal ── */}
        {addingSession && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAddingSession(false)}>
            <div className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
                    <CalendarDays size={14} className="text-white" />
                  </span>
                  Ajouter une séance
                </h2>
                <button onClick={() => setAddingSession(false)}><X size={16} className="text-slate-300 hover:text-slate-600" /></button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Date de la séance <span className="text-red-500">*</span></p>
                  <input
                    type="date" value={newDate} autoFocus
                    onChange={(e) => setNewDate(e.target.value)}
                    className={`w-full bg-white border rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 transition-colors ${
                      newDate && !jourValide
                        ? 'border-amber-300 focus:ring-amber-400/40 focus:border-amber-400'
                        : 'border-slate-200 focus:ring-[#0369A1]/40 focus:border-[#0369A1]'
                    }`}
                  />
                  {newDate && !jourValide && (
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                      Ce n'est pas un jour de cours de ce groupe — une séance "Normale" n'est pas possible ce jour-là. Utilisez "Remplacement".
                    </p>
                  )}
                  {suggestedNextDate && suggestedNextDate !== newDate && (
                    <button
                      type="button"
                      onClick={() => setNewDate(suggestedNextDate)}
                      className="text-[10px] text-[#0369A1] hover:underline mt-1"
                    >
                      Prochaine séance prévue : {formatDate(suggestedNextDate)}
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Type de séance</p>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors"
                  >
                    <option value="normale" disabled={!jourValide}>Normale</option>
                    <option value="remplacement">Remplacement</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Heure début <span className="text-red-500">*</span></p>
                    <input type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors" />
                  </div>
                  {isHourBased && (
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Heure fin <span className="text-red-500">*</span></p>
                      <input type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors" />
                    </div>
                  )}
                </div>
                {isHourBased && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Durée de la séance (heures) <span className="text-red-500">*</span></p>
                    <input type="number" step="0.25" min="0" value={dureeEffectuee}
                      onChange={(e) => { setDureeEffectuee(e.target.value); setDureeTouched(true); }}
                      placeholder="ex: 2"
                      className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors" />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setAddingSession(false)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
                  <button onClick={addSession} disabled={!canConfirm || pendingSession}
                    className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] disabled:opacity-40 transition-all font-medium">
                    {pendingSession ? 'Ajout…' : 'Confirmer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div id="pointage-print-area">
          {/* ── Fiche info header — lecture seule : formation, prof et dates
               proviennent de la fiche groupe et ne sont pas modifiables
               depuis cet écran (voir note en haut du fichier). ── */}
          <div className="bg-white border border-[#F1F5F9] rounded-md px-4 py-3 text-xs text-slate-800 space-y-2">
            <div className="flex gap-6 flex-wrap items-center">
              <span><strong>Formation :</strong> {groupData?.formations?.nom ?? '—'}</span>
              <span><strong>Date de début :</strong> <span className="px-1">{groupData?.date_debut ? formatDate(groupData.date_debut) : '—'}</span></span>
              {groupData?.date_fin && (
                <span><strong>Date de fin :</strong> <span className="px-1">{formatDate(groupData.date_fin)}</span></span>
              )}
            </div>
            <div className="flex gap-4 flex-wrap items-center">
              <span><strong>Enseignant :</strong> {teacherName || '—'}</span>
              <span><strong>Jour(s) :</strong> <span className="px-1">{groupData?.jours_formation || '—'}</span></span>
              <span><strong>Heure :</strong> <span className="px-1">{groupData?.heure_formation || '—'}</span></span>
            </div>
          </div>

          {sessions.length === 0 ? (
            <p className="text-sm text-slate-300 py-8 text-center">Aucune séance enregistrée.</p>
          ) : (
            <div className="overflow-auto pointage-scroll rounded-md border border-[#F1F5F9] print:overflow-visible print:border-0 mt-4 max-h-[65vh]">
              <table className="text-xs border-collapse bg-white" style={{ minWidth: `${140 + sessions.length * 80}px` }}>
                <tbody>

                  {/* ── Séance № ── */}
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10 min-w-[160px]">
                      Séance №
                    </td>
                    {sessions.map((s, i) => (
                      <td key={s.id} className="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-600 min-w-[80px]">
                        {i + 1}
                      </td>
                    ))}
                  </tr>

                  {/* ── Type de séance ── */}
                  <tr>
                    <td className="border border-[#F1F5F9] px-3 py-2 sticky left-0 bg-white z-10">
                      Type
                    </td>
                    {sessions.map((s) => (
                      <td key={s.id} className="border border-[#F1F5F9] px-2 py-2 text-center">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          s.type_seance === 'remplacement'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-[#DCEBFA] text-[#0369A1]'
                        }`}>
                          {s.type_seance === 'remplacement' ? 'Remplacement' : 'Normale'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* ── Date ── */}
                  <tr>
                    <td className="border border-[#F1F5F9] px-3 py-2 sticky left-0 bg-white z-10">
                      Date de la Séance
                    </td>
                    {sessions.map((s) => (
                      <td key={s.id} className="border border-[#F1F5F9] px-2 py-2 text-center text-slate-800">
                        {formatDate(s.date)}
                        {!isEditableToday(s.date) && (
                          <Lock size={10} className="inline-block ml-1 text-slate-300" />
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* ── Horaire ── */}
                  <tr>
                    <td className="border border-[#F1F5F9] px-3 py-2 sticky left-0 bg-white z-10">
                      Horaire
                    </td>
                    {sessions.map((s) => (
                      <td key={s.id} className="border border-[#F1F5F9] px-2 py-2 text-center text-slate-800">
                        {s.heure_debut
                          ? (s.heure_fin ? `${s.heure_debut.slice(0, 5)} - ${s.heure_fin.slice(0, 5)}` : s.heure_debut.slice(0, 5))
                          : '—'}
                      </td>
                    ))}
                  </tr>

                  {/* ── Durée (editable, stored in sessions.duree) ── */}
                  <tr>
                    <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-white z-10">
                      Durée de la Séance
                    </td>
                    {sessions.map((s) => {
                      const editable = isEditableToday(s.date);
                      return (
                        <td key={s.id} className="border border-[#F1F5F9] px-1 py-1 text-center">
{editable ? (
  <input
    type="text"
    defaultValue={s.duree_effectuee ?? ''}
    onBlur={(e) => updateDuree(s.id, e.target.value)}
    placeholder="—"
    className="w-full text-center text-xs border-b border-transparent hover:border-slate-300 focus:border-[#0369A1] bg-transparent focus:outline-none px-1 py-1"
  />
) : (
  <span className="text-xs text-slate-500">{s.duree_effectuee || '—'}</span>
)}
                        </td>
                      );
                    })}
                  </tr>

                  {/* ── Nombre présents (calculé, jamais stocké) ── */}
                  <tr>
                    <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-white z-10">
                      Nombre des stagiaires
                    </td>
                    {sessions.map((s) => {
                      const nb = getNbPresents(s.id);
                      return (
                        <td key={s.id} className="border border-[#F1F5F9] px-2 py-2 text-center font-bold text-slate-800">
                          {nb > 0 ? nb : ''}
                        </td>
                      );
                    })}
                  </tr>

                  {/* ── Separator ── */}
                  <tr>
                    <td colSpan={sessions.length + 1} className="bg-slate-100 border border-slate-200 px-3 py-1.5 font-semibold text-slate-600">
                      Présences
                    </td>
                  </tr>

                  {/* ── Étudiants — ALL confirmed students of the group, no padding ── */}
                  {etudiants.map((e, idx) => (
                    <tr key={e.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="border border-[#F1F5F9] px-3 py-2 text-slate-800 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                        <span className="text-slate-300 mr-1">{idx + 1})</span>
                        {e.nom} {e.prenom}
                      </td>
                      {sessions.map((s) => {
                        const key = `${s.id}|${e.id}`;
                        const statut = attendance[key]?.statut ?? null;
                        const isEditing = editingCell === key;
                        const editable = isEditableToday(s.date);
                        return (
                          <td key={s.id} className="border border-[#F1F5F9] p-0 text-center relative">
                            {!editable ? (
                              <div className={`w-full py-2 px-1 text-xs font-bold ${statut ? STATUT_STYLE[statut] : 'text-slate-300'}`}>
                                {statut ? STATUT_LABEL[statut] : '—'}
                              </div>
                            ) : (
                              <button
                                onClick={(ev) => { ev.stopPropagation(); setEditingCell(key); }}
                                className={`w-full py-2 px-1 text-xs font-bold transition hover:opacity-80 ${statut ? STATUT_STYLE[statut] : 'text-slate-300 hover:bg-slate-50'}`}
                              >
                                {statut ? STATUT_LABEL[statut] : '—'}
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* ── Supprimer séance ── */}
                  <tr className="print:hidden">
                    <td className="border border-slate-200 px-3 py-1.5 text-slate-300 sticky left-0 bg-white z-10 text-[10px]">
                      Supprimer
                    </td>
                    {sessions.map((s) => {
                      const editable = isEditableToday(s.date);
                      return (
                        <td key={s.id} className="border border-[#F1F5F9] px-2 py-1.5 text-center">
                          {editable ? (
                            <button onClick={() => deleteSession(s.id)} className="text-red-300 hover:text-red-500 transition">
                              <Trash2 size={12} />
                            </button>
                          ) : (
                            <Lock size={12} className="inline-block text-slate-200" />
                          )}
                        </td>
                      );
                    })}
                  </tr>

                </tbody>
              </table>
            </div>
          )}
        </div>

        {editingCell && (() => {
          const [sessionId, etudiantId] = editingCell.split('|');
          const session = sessions.find((s) => String(s.id) === sessionId);
          const etu = etudiants.find((x) => String(x.id) === etudiantId);
          const OPTS = [
            { val: 'present', label: 'Présent', Icon: UserCheck, style: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
            { val: 'absent',  label: 'Absent',  Icon: UserX,     style: 'bg-red-50 text-red-600 hover:bg-red-100' },
            { val: 'retard',  label: 'Retard',  Icon: Clock,     style: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
          ];
          const pick = (val) => { if (session && etu) updateStatut(session.id, etu.id, val); setEditingCell(null); };
          return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditingCell(null)}>
              <div ref={dropdownRef} onClick={(ev) => ev.stopPropagation()} className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0 text-white text-xs font-bold">
                      {etu ? `${etu.nom?.[0] ?? ''}${etu.prenom?.[0] ?? ''}` : '?'}
                    </span>
                    {etu ? `${etu.nom} ${etu.prenom}` : 'Pointage'}
                  </h2>
                  <button onClick={() => setEditingCell(null)}><X size={16} className="text-slate-300 hover:text-slate-600" /></button>
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">
                    {session ? formatDate(session.date) : ''} — Statut <span className="text-red-500">*</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {OPTS.map(({ val, label, Icon, style }) => (
                      <button key={val} onClick={() => pick(val)} className={`flex flex-col items-center gap-1 py-2.5 rounded-md text-xs font-bold transition ${style}`}>
                        <Icon size={16} />
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <button onClick={() => pick(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-400 hover:bg-[#F1F5F9]">Effacer</button>
                    <button onClick={() => setEditingCell(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
};

export default GroupAttendance;