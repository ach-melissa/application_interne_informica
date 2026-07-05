import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, X, CalendarDays } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// Attendance dropdown  (P / A / R / —)
// ─────────────────────────────────────────────────────────────
const OPTIONS = [
  { value: 'present', label: 'P', color: 'text-emerald-600' },
  { value: 'absent',  label: 'A', color: 'text-red-500'   },
  { value: 'retard',  label: 'R', color: 'text-amber-600' },
  { value: null,      label: '—', color: 'text-slate-300'  },
];

const COLOR = { present: 'text-emerald-600', absent: 'text-red-500', retard: 'text-amber-600' };
const LABEL = { present: 'P', absent: 'A', retard: 'R' };

const AttendanceDropdown = ({ value, onChange, pending, locked }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative w-full h-full min-h-[28px]">
      <button
        onClick={(e) => { e.stopPropagation(); if (pending || locked) return; setOpen((o) => !o); }}
        disabled={pending || locked}
        className={`font-bold text-sm w-full h-full flex items-center justify-center transition
          ${pending ? 'opacity-40 cursor-wait' : locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-[#DCEBFA]/40'}
          ${value ? COLOR[value] : 'text-slate-300'}
        `}
      >
        {pending
          ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          : value ? LABEL[value] : '—'}
      </button>

      {open && (
        <div className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-0.5 bg-white border border-[#F1F5F9] rounded-xl shadow-lg p-1 flex flex-col gap-0.5 min-w-[52px]">
          {OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={(e) => { e.stopPropagation(); onChange(opt.value); setOpen(false); }}
              className={`py-1.5 px-3 text-sm font-bold text-center hover:bg-[#F1F5F9] transition ${opt.color}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Inline editable text cell  (click → input → blur/Enter saves)
// ─────────────────────────────────────────────────────────────
const EditableCell = ({ value, onChange, type = 'text', placeholder = '', disabled = false }) => {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value ?? '');

  useEffect(() => { if (!editing) setDraft(value ?? ''); }, [value, editing]);

  const commit = () => { setEditing(false); if (draft !== (value ?? '')) onChange(draft); };

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="w-full border-0 bg-[#DCEBFA]/40 text-[11px] text-center focus:outline-none rounded px-0.5 py-0.5"
        style={{ minWidth: 0 }}
      />
    );
  }

  return (
    <button
      onClick={() => { if (disabled) return; setDraft(value ?? ''); setEditing(true); }}
      disabled={disabled}
      title={disabled ? 'Verrouillé (jour passé)' : 'Cliquer pour modifier'}
      className={`w-full text-[11px] text-slate-800 transition px-0.5 py-0.5 rounded min-h-[22px] ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#DCEBFA]/40 hover:text-[#0369A1]'
      }`}
    >
      {value || <span className="text-slate-300">—</span>}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────
const emptyMeta = (s) => ({
  date:            s?.date?.slice(0, 10) ?? '',
  duree:           s?.duree             ?? '',
  emargEnseignant: s?.emarg_enseignant  ?? '',
  emargStagiaires: s?.emarg_stagiaires  ?? '',
});

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
/**
 * Props:
 *  groupId, group, sessions, records, students, onUpdate
 */
const GroupAttendance = ({ groupId, group = {}, sessions = [], records = [], students = [], onUpdate }) => {
  const { user } = useAuth();
  const [localSessions, setLocalSessions] = useState(sessions);
  const [localRecords,  setLocalRecords]  = useState(records);
  const [sessionMeta,   setSessionMeta]   = useState(() => {
    const m = {};
    sessions.forEach((s) => { m[s.id] = emptyMeta(s); });
    return m;
  });

  const [addingSession,  setAddingSession]  = useState(false);
  const [newSessionDate, setNewSessionDate] = useState('');
  const [pendingSession, setPendingSession] = useState(false);
  const [pendingCell,    setPendingCell]    = useState(null);
  const [saveError,      setSaveError]      = useState(null);

  const token   = () => localStorage.getItem('token');
  const apiBase = `${import.meta.env.VITE_API_URL}/api/profs/me/groups/${groupId}`;
  const getMeta = (id) => sessionMeta[id] ?? emptyMeta(null);
  const countPresents = (id) => localRecords.filter((r) => r.session_id === id && r.statut === 'present').length;

  // ── Update session meta field ───────────────────────────────
  const updateMeta = async (sessionId, field, value) => {
    setSessionMeta((prev) => ({ ...prev, [sessionId]: { ...getMeta(sessionId), [field]: value } }));
    const dbField = { date: 'date', duree: 'duree', emargEnseignant: 'emarg_enseignant', emargStagiaires: 'emarg_stagiaires' }[field];
    if (!dbField) return;
    try {
      const res = await fetch(`${apiBase}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ [dbField]: value }),
      });
      if (field === 'date' && res.ok) {
        const u = await res.json();
        setLocalSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, date: u.date } : s));
      }
    } catch { /* silent — local state already updated */ }
  };

  // ── Add session ─────────────────────────────────────────────
  const confirmAddSession = async () => {
    if (!newSessionDate) return;
    setPendingSession(true); setSaveError(null);
    try {
      const res = await fetch(`${apiBase}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ date: newSessionDate }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message ?? `Erreur ${res.status}`); }
      const created = await res.json();
      const updated = [...localSessions, created].sort((a, b) => new Date(a.date) - new Date(b.date));
      setLocalSessions(updated);
      setSessionMeta((prev) => ({ ...prev, [created.id]: emptyMeta(created) }));
      setAddingSession(false); setNewSessionDate('');
      onUpdate(groupId, { sessions: updated, records: localRecords });
    } catch (e) {
      setSaveError(e.message || 'Erreur lors de la création de la séance.');
    } finally { setPendingSession(false); }
  };

  // ── Delete session ──────────────────────────────────────────
  const deleteSession = async (sessionId) => {
    setSaveError(null);
    try {
      const res = await fetch(`${apiBase}/sessions/${sessionId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      const updS = localSessions.filter((s) => s.id !== sessionId);
      const updR = localRecords.filter((r) => r.session_id !== sessionId);
      setLocalSessions(updS); setLocalRecords(updR);
      setSessionMeta((prev) => { const n = { ...prev }; delete n[sessionId]; return n; });
      onUpdate(groupId, { sessions: updS, records: updR });
    } catch { setSaveError('Erreur lors de la suppression de la séance.'); }
  };

  // ── Set attendance cell ─────────────────────────────────────
const setCell = async (etudiantId, sessionId, nextStatut) => {
  const key = `${etudiantId}-${sessionId}`;
  setPendingCell(key); setSaveError(null);
  const existing = localRecords.find((r) => r.etudiant_id === etudiantId && r.session_id === sessionId) ?? null;
  try {
    let updatedRecords;
    if (nextStatut === null) {
      if (!existing) { setPendingCell(null); return; }
      const res = await fetch(`${apiBase}/attendance/${existing.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error();
      updatedRecords = localRecords.filter((r) => r.id !== existing.id);
    } else if (existing) {
      const res = await fetch(`${apiBase}/attendance/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ statut: nextStatut }),
      });
      if (!res.ok) throw new Error();
      const u = await res.json();
      updatedRecords = localRecords.map((r) => r.id === existing.id ? { ...r, statut: u.statut } : r);
    } else {
      const res = await fetch(`${apiBase}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ session_id: sessionId, etudiant_id: etudiantId, statut: nextStatut }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      updatedRecords = [...localRecords, created];
    }
    setLocalRecords(updatedRecords);
    onUpdate(groupId, { sessions: localSessions, records: updatedRecords });
  } catch { setSaveError('Erreur lors de la mise à jour du pointage.'); }
  finally { setPendingCell(null); }
};

  // ── Render ──────────────────────────────────────────────────
  const TOTAL_ROWS     = Math.max(students.length, 10);
  const paddedStudents = [...students, ...Array(Math.max(0, TOTAL_ROWS - students.length)).fill(null)];

  // Compute date range for the print header
  const firstDate = localSessions[0]?.date ? new Date(localSessions[0].date).toLocaleDateString('fr-DZ', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';
  const lastDate  = localSessions[localSessions.length-1]?.date ? new Date(localSessions[localSessions.length-1].date).toLocaleDateString('fr-DZ', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';

  const teacherName = user ? `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() : '';

const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Algiers' });
const isLocked = (s) => {
  if (!s?.date) return true;
  const sessionDate = new Date(s.date).toLocaleDateString('en-CA', { timeZone: 'Africa/Algiers' });
  return sessionDate !== todayStr;
};
  return (
    <div>
      {/* Error banner */}
      {saveError && (
        <div className="mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <span className="flex-1">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="font-bold text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Add session button */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setAddingSession(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F2A4A] text-white text-xs font-medium rounded-lg hover:bg-[#065e8f] transition"
        >
          <Plus size={14} /> Nouvelle séance
        </button>
      </div>

      {/* Add session modal */}
      {addingSession && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setAddingSession(false); setNewSessionDate(''); setSaveError(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#DCEBFA] text-[#0369A1] flex items-center justify-center">
                  <CalendarDays size={14} />
                </span>
                Nouvelle séance
              </h2>
              <button onClick={() => { setAddingSession(false); setNewSessionDate(''); setSaveError(null); }}>
                <X size={16} className="text-slate-300 hover:text-slate-600" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Date de la séance</p>
                <input
                  type="date" value={newSessionDate} autoFocus
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-transparent rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => { setAddingSession(false); setNewSessionDate(''); setSaveError(null); }} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">
                  Annuler
                </button>
                <button onClick={confirmAddSession} disabled={!newSessionDate || pendingSession}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40 font-medium">
                  {pendingSession ? 'Ajout…' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          FICHE DE POINTAGE — matching the admin print layout
          ══════════════════════════════════════════════════════ */}
      <div className="overflow-x-auto">
        {/* ── Print-style header ── */}
        <div className="mb-4 text-center">
          <h2 className="text-base font-bold underline text-slate-800">Fiche de pointage</h2>
        </div>

        <div className="mb-3 text-sm text-slate-800 space-y-1.5">
          <div className="flex flex-wrap gap-x-10 gap-y-1">
            <span>
              <span className="font-semibold">Formation :</span>{' '}
              <span className="border-b border-slate-800 px-2 min-w-[140px] inline-block">
                {group?.formations?.nom ?? ''}
              </span>
            </span>
            <span>
              <span className="font-semibold">Date de début :</span>{' '}
              <span className="border-b border-slate-800 px-2 min-w-[100px] inline-block">{firstDate}</span>
            </span>
            <span>
              <span className="font-semibold">Date de fin :</span>{' '}
              <span className="border-b border-slate-800 px-2 min-w-[100px] inline-block">{lastDate}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-1">
            <span>
              <span className="font-semibold">Enseignant :</span>{' '}
              <span className="border-b border-slate-800 px-2 min-w-[160px] inline-block">{teacherName || '\u00A0'}</span>
            </span>
            <span>
              <span className="font-semibold">Jour(s) de formation :</span>{' '}
              <span className="border-b border-slate-800 px-2 min-w-[120px] inline-block">
                {group?.schedule ? Object.keys(group.schedule).join(', ') : ''}
              </span>
            </span>
            <span>
              <span className="font-semibold">Heure :</span>{' '}
              <span className="border-b border-slate-800 px-2 min-w-[80px] inline-block">&nbsp;</span>
            </span>
          </div>
        </div>

        {/* ── Main attendance table ── */}
        <table
          className="border-collapse text-[11px] w-full"
          style={{ minWidth: `${Math.max(500, 180 + localSessions.length * 60)}px` }}
        >
          <thead>
            {/* Session numbers */}
            <tr>
              <td className="border border-[#F1F5F9] px-2 py-1 text-[#0369A1] font-semibold bg-[#DCEBFA] w-[180px]">
                Séance №
              </td>
              {localSessions.map((s, i) => (
                <td key={s.id} className="border border-[#F1F5F9] text-center font-bold text-[#0369A1] bg-[#DCEBFA] py-1 min-w-[58px] group relative">
                  {i + 1}
<button
  onClick={() => deleteSession(s.id)}
  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition"
  title="Supprimer"
>
  <Trash2 size={10} />
</button>
                </td>
              ))}
            </tr>

            {/* Date de la Séance — editable */}
            <tr>
              <td className="border border-[#F1F5F9] px-2 py-1 text-slate-500 bg-[#DCEBFA]/40">
                Date de la Séance
              </td>
              {localSessions.map((s) => (
                <td key={s.id} className="border border-[#F1F5F9] text-center p-0.5 bg-white">
<EditableCell
  type="date"
  value={getMeta(s.id).date}
  onChange={(v) => updateMeta(s.id, 'date', v)}
  placeholder="jj/mm/aa"
/>
                </td>
              ))}
            </tr>

            {/* Durée de la Séance — editable */}
            <tr>
              <td className="border border-[#F1F5F9] px-2 py-1 text-slate-500 bg-[#DCEBFA]/40">
                Durée de la Séance
              </td>
              {localSessions.map((s) => (
                <td key={s.id} className="border border-[#F1F5F9] text-center p-0.5 bg-white">
<EditableCell
  value={getMeta(s.id).duree}
  onChange={(v) => updateMeta(s.id, 'duree', v)}
  placeholder="1h30"
/>
                </td>
              ))}
            </tr>

            {/* Nombre des stagiaires — auto */}
            <tr>
              <td className="border border-[#F1F5F9] px-2 py-1 text-slate-500 bg-[#DCEBFA]/40">
                Nombre des stagiaires
              </td>
              {localSessions.map((s) => {
                const count = countPresents(s.id);
                return (
                  <td key={s.id} className="border border-[#F1F5F9] text-center font-bold text-slate-800 py-1 bg-white">
                    {count || ''}
                  </td>
                );
              })}
            </tr>

            {/* Émargement enseignant — editable */}
            <tr>
              <td className="border border-[#F1F5F9] px-2 py-1 text-slate-500 bg-[#DCEBFA]/40">
                Emargement de l'enseignant
              </td>
              {localSessions.map((s) => (
                <td key={s.id} className="border border-[#F1F5F9] p-0.5 bg-white h-8">
<EditableCell
  value={getMeta(s.id).emargEnseignant}
  onChange={(v) => updateMeta(s.id, 'emargEnseignant', v)}
  placeholder="…"
/>
                </td>
              ))}
            </tr>

            {/* Émargement stagiaires — editable */}
            <tr>
              <td className="border border-[#F1F5F9] px-2 py-1 text-slate-500 bg-[#DCEBFA]/40">
                Emargement des stagiaires
              </td>
              {localSessions.map((s) => (
                <td key={s.id} className="border border-[#F1F5F9] p-0.5 bg-white h-8">
<EditableCell
  value={getMeta(s.id).emargStagiaires}
  onChange={(v) => updateMeta(s.id, 'emargStagiaires', v)}
  placeholder="…"
/>
                </td>
              ))}
            </tr>
          </thead>

          {/* ── Student rows ── */}
          <tbody>
            {paddedStudents.map((s, idx) => {
              const recs  = s ? localRecords.filter((r) => r.etudiant_id === s.etudiant_id) : [];

              return (
                <tr key={s ? s.id : `empty-${idx}`}>
                  {/* Row label: "1) Nom Prénom" */}
                  <td className="border border-[#F1F5F9] px-2 py-1 text-slate-800 whitespace-nowrap">
                    <span className="text-slate-300 mr-1">{idx + 1})</span>
                    {s ? `${s.etudiants?.nom ?? ''} ${s.etudiants?.prenom ?? ''}` : ''}
                  </td>

                  {/* Attendance cells */}
                  {localSessions.map((session) => {
if (!s) return <td key={session.id} className="border border-[#F1F5F9] bg-white" />;
const record  = localRecords.find((r) => r.etudiant_id === s.etudiant_id && r.session_id === session.id) ?? null;
const cellKey = `${s.etudiant_id}-${session.id}`;
return (
  <td key={session.id} className="border border-[#F1F5F9] p-0 bg-white">
    <AttendanceDropdown
      value={record?.statut ?? null}
      pending={pendingCell === cellKey}
      locked={isLocked(session)}
      onChange={(next) => setCell(s.etudiant_id, session.id, next)}
    />
  </td>
);
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {localSessions.length === 0 && (
          <p className="text-center text-slate-300 text-sm mt-8">
            Aucune séance — cliquez sur « Nouvelle séance » pour commencer.
          </p>
        )}
      </div>
    </div>
  );
};

export default GroupAttendance;