import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, X, CalendarDays, Lock } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const API = import.meta.env.VITE_API_URL;

const STATUT_LABEL = { present: 'P', absent: 'A', retard: 'R' };
const STATUT_STYLE = {
  present: 'bg-emerald-50 text-emerald-700',
  absent:  'bg-red-50 text-red-600',
  retard:  'bg-amber-50 text-amber-700',
};

// Date du jour en Algérie, format YYYY-MM-DD — doit rester cohérent
// avec isSessionToday() côté serveur (profController.js).
const todayAlgeria = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Algiers' });

const getJourSemaine = (dateStr) =>
  new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', timeZone: 'Africa/Algiers' });
/**
 * GroupAttendance — prof-facing "fiche de pointage".
 * Same fiche header / table layout as the admin PointageTab, but scopes
 * every request to the authenticated prof's own group via `apiBase`, and
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
        body: JSON.stringify({ duree }),
      });
      if (!res.ok) throw new Error('Échec de la sauvegarde de la durée');
      setSessions((prev) => prev.map((x) => (x.id === sessionId ? { ...x, duree } : x)));
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
        body: JSON.stringify({ date: newDate, type_seance: newType }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSessions((s) => [...s, data].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setNewDate('');
      setNewType('normale');
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
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
      `}</style>
      <div className="space-y-4">
        {/* ── Error banner ── */}
        {saveError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 print:hidden">
            <span className="flex-1">{saveError}</span>
            <button onClick={() => setSaveError(null)} className="font-bold text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between print:hidden">
          <p className="text-sm text-slate-400">{sessions.length} séance(s)</p>
          <button
            onClick={() => setAddingSession(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F2A4A] text-white text-xs font-medium rounded-lg hover:bg-[#065e8f] transition"
          >
            <Plus size={14} /> Ajouter séance
          </button>
        </div>

        {/* ── Add session modal ── */}
        {addingSession && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAddingSession(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-[#DCEBFA] text-[#0369A1] flex items-center justify-center">
                    <CalendarDays size={14} />
                  </span>
                  Ajouter une séance
                </h2>
                <button onClick={() => setAddingSession(false)}><X size={16} className="text-slate-300 hover:text-slate-600" /></button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Date de la séance</p>
                  <input
                    type="date" value={newDate} autoFocus
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-transparent rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Type de séance</p>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-transparent rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors"
                  >
                    <option value="normale" disabled={!jourValide}>Normale</option>
                    <option value="remplacement">Remplacement</option>
                  </select>
                  {newDate && !jourValide && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      Ce jour ne fait pas partie de l'emploi du temps du groupe — seul "Remplacement" est disponible.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setAddingSession(false)} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
                  <button onClick={addSession} disabled={!newDate || pendingSession}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40 font-medium">
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
          <div className="bg-white border border-[#F1F5F9] rounded-xl px-4 py-3 text-xs text-slate-800 space-y-2">
            <div className="flex gap-6 flex-wrap items-center">
              <span><strong>Formation :</strong> {groupData?.formations?.nom ?? '—'}</span>
              <span><strong>Date de début :</strong> {groupData?.date_debut ? formatDate(groupData.date_debut) : '—'}</span>
              <span><strong>Date de fin :</strong> {groupData?.date_fin ? formatDate(groupData.date_fin) : '—'}</span>
            </div>
            <div className="flex gap-4 flex-wrap items-center">
              <span><strong>Enseignant :</strong> {teacherName || '—'}</span>
              <span><strong>Jour(s) :</strong> {groupData?.jours_formation || '—'}</span>
              <span><strong>Heure :</strong> {groupData?.heure_formation || '—'}</span>
            </div>
          </div>

          {sessions.length === 0 ? (
            <p className="text-sm text-slate-300 py-8 text-center">Aucune séance enregistrée.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#F1F5F9] print:overflow-visible print:border-0 mt-3">
              <table className="text-xs border-collapse bg-white" style={{ minWidth: `${140 + sessions.length * 80}px` }}>
                <tbody>

                  {/* ── Séance № ── */}
                  <tr className="bg-[#DCEBFA]">
                    <td className="border border-[#F1F5F9] px-3 py-2 font-bold text-[#0369A1] sticky left-0 bg-[#DCEBFA] z-10 min-w-[160px]">
                      Séance №
                    </td>
                    {sessions.map((s, i) => (
                      <td key={s.id} className="border border-[#F1F5F9] px-2 py-2 text-center font-bold text-[#0369A1] min-w-[80px]">
                        {i + 1}
                      </td>
                    ))}
                  </tr>

                  {/* ── Date ── */}
                  <tr>
                    <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-white z-10">
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

                  {/* ── Type ── */}
                  <tr className="bg-[#F8FCFF]">
                    <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-[#F8FCFF] z-10">
                      Type
                    </td>
                    {sessions.map((s) => (
                      <td key={s.id} className="border border-[#F1F5F9] px-2 py-2 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.type_seance === 'remplacement' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {s.type_seance === 'remplacement' ? 'Remplacement' : 'Normale'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* ── Durée (editable, stored in sessions.duree) ── */}
                  <tr className="bg-[#F8FCFF]">
                    <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-[#F8FCFF] z-10">
                      Durée de la Séance
                    </td>
                    {sessions.map((s) => {
                      const editable = isEditableToday(s.date);
                      return (
                        <td key={s.id} className="border border-[#F1F5F9] px-1 py-1 text-center">
                          {editable ? (
                            <input
                              type="text"
                              defaultValue={s.duree ?? ''}
                              onBlur={(e) => updateDuree(s.id, e.target.value)}
                              placeholder="—"
                              className="w-full text-center text-xs border-b border-transparent hover:border-slate-300 focus:border-[#0369A1] bg-transparent focus:outline-none px-1 py-1"
                            />
                          ) : (
                            <span className="text-xs text-slate-500">{s.duree || '—'}</span>
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

                  {/* ── Emargement enseignant (blank signature space — nothing stored) ── */}
                  <tr className="bg-[#F8FCFF]">
                    <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-[#F8FCFF] z-10">
                      Emargement de l'enseignant
                    </td>
                    {sessions.map((s) => (
                      <td key={s.id} className="border border-[#F1F5F9] px-2 py-5" />
                    ))}
                  </tr>

                  {/* ── Emargement stagiaires (blank signature space — nothing stored) ── */}
                  <tr>
                    <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-white z-10">
                      Emargement des stagiaires
                    </td>
                    {sessions.map((s) => (
                      <td key={s.id} className="border border-[#F1F5F9] px-2 py-5" />
                    ))}
                  </tr>

                  {/* ── Separator ── */}
                  <tr>
                    <td colSpan={sessions.length + 1} className="bg-[#DCEBFA] border border-[#F1F5F9] px-3 py-1.5 font-semibold text-[#0369A1]">
                      Présences
                    </td>
                  </tr>

                  {/* ── Étudiants — ALL confirmed students of the group, no padding ── */}
                  {etudiants.map((e, idx) => (
                    <tr key={e.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FCFF]'}>
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
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (!editable) return;
                                setEditingCell(isEditing ? null : key);
                              }}
                              disabled={!editable}
                              title={editable ? '' : 'Modifiable uniquement le jour de la séance'}
                              className={`w-full py-2 px-1 text-xs font-bold transition
                                ${statut ? STATUT_STYLE[statut] : 'text-slate-300'}
                                ${editable ? 'hover:opacity-80' : 'cursor-not-allowed opacity-70'}`}
                            >
                              {statut ? STATUT_LABEL[statut] : '—'}
                            </button>
                            {isEditing && editable && (
                              <div
                                ref={dropdownRef}
                                className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-0.5 bg-white border border-[#F1F5F9] rounded-xl shadow-lg p-1 flex flex-col gap-0.5 min-w-[60px]"
                              >
                                {[null, 'present', 'absent', 'retard'].map((opt) => (
                                  <button
                                    key={opt ?? 'none'}
                                    onClick={(ev) => { ev.stopPropagation(); updateStatut(s.id, e.id, opt); }}
                                    className={`px-3 py-1.5 text-xs rounded-lg font-bold transition hover:opacity-80
                                      ${opt === 'present' ? 'bg-emerald-50 text-emerald-700' :
                                        opt === 'absent'  ? 'bg-red-50 text-red-600' :
                                        opt === 'retard'  ? 'bg-amber-50 text-amber-700' :
                                        'bg-slate-50 text-slate-400'}`}
                                  >
                                    {opt ? STATUT_LABEL[opt] : '—'}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* ── Supprimer séance ── */}
                  <tr className="bg-red-50/40 print:hidden">
                    <td className="border border-[#F1F5F9] px-3 py-1.5 text-slate-300 sticky left-0 bg-red-50/40 z-10 text-[10px]">
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
      </div>
    </>
  );
};

export default GroupAttendance;