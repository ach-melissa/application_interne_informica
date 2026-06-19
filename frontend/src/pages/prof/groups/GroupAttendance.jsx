import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Attendance dropdown  (P / A / R / —)
// ─────────────────────────────────────────────────────────────
const OPTIONS = [
  { value: 'present', label: 'P', color: 'text-green-600' },
  { value: 'absent',  label: 'A', color: 'text-red-500'   },
  { value: 'retard',  label: 'R', color: 'text-orange-500' },
  { value: null,      label: '—', color: 'text-[#CBD5E1]'  },
];

const COLOR = { present: 'text-green-600', absent: 'text-red-500', retard: 'text-orange-500' };
const LABEL = { present: 'P', absent: 'A', retard: 'R' };

const AttendanceDropdown = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-center justify-center w-full h-full min-h-[28px]">
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`font-bold text-sm w-full h-full flex items-center justify-center transition
          ${disabled ? 'opacity-40 cursor-wait' : 'cursor-pointer hover:bg-blue-50'}
          ${value ? COLOR[value] : 'text-[#CBD5E1]'}
        `}
      >
        {disabled
          ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          : value ? LABEL[value] : ''}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-0.5 bg-white border border-[#E2E8F0] rounded-lg shadow-xl overflow-hidden flex flex-col min-w-[52px]">
          {OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => { onChange(opt.value); setOpen(false); }}
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
const EditableCell = ({ value, onChange, type = 'text', placeholder = '' }) => {
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
        className="w-full border-0 bg-blue-50 text-[11px] text-center focus:outline-none rounded px-0.5 py-0.5"
        style={{ minWidth: 0 }}
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(value ?? ''); setEditing(true); }}
      title="Cliquer pour modifier"
      className="w-full text-[11px] text-[#1E293B] hover:bg-blue-50 hover:text-blue-600 transition px-0.5 py-0.5 rounded min-h-[22px]"
    >
      {value || <span className="text-[#CBD5E1]">—</span>}
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

const fmt = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
/**
 * Props:
 *  groupId, group, sessions, records, students, onUpdate
 */
const GroupAttendance = ({ groupId, group = {}, sessions = [], records = [], students = [], onUpdate }) => {
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
      if (nextStatut === null) {
        if (!existing) { setPendingCell(null); return; }
        const res = await fetch(`${apiBase}/attendance/${existing.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
        if (!res.ok) throw new Error();
        setLocalRecords((prev) => prev.filter((r) => r.id !== existing.id));
      } else if (existing) {
        const res = await fetch(`${apiBase}/attendance/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ statut: nextStatut }),
        });
        if (!res.ok) throw new Error();
        const u = await res.json();
        setLocalRecords((prev) => prev.map((r) => r.id === existing.id ? { ...r, statut: u.statut } : r));
      } else {
        const res = await fetch(`${apiBase}/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ session_id: sessionId, etudiant_id: etudiantId, statut: nextStatut }),
        });
        if (!res.ok) throw new Error();
        const created = await res.json();
        setLocalRecords((prev) => [...prev, created]);
      }
    } catch { setSaveError('Erreur lors de la mise à jour du pointage.'); }
    finally { setPendingCell(null); }
  };

  // ── Render ──────────────────────────────────────────────────
  const TOTAL_ROWS     = Math.max(students.length, 10);
  const paddedStudents = [...students, ...Array(Math.max(0, TOTAL_ROWS - students.length)).fill(null)];

  // Compute date range for the print header
  const firstDate = localSessions[0]?.date ? new Date(localSessions[0].date).toLocaleDateString('fr-DZ', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';
  const lastDate  = localSessions[localSessions.length-1]?.date ? new Date(localSessions[localSessions.length-1].date).toLocaleDateString('fr-DZ', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';

  return (
    <div>
      {/* Error banner */}
      {saveError && (
        <div className="mb-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span className="flex-1">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="font-bold text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Add session button */}
      <div className="flex items-center gap-3 mb-5">
        {addingSession ? (
          <div className="flex flex-wrap items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <label className="text-sm font-medium text-[#1E293B]">Date :</label>
            <input
              type="date"
              value={newSessionDate}
              onChange={(e) => setNewSessionDate(e.target.value)}
              className="border border-[#CBD5E1] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={confirmAddSession}
              disabled={!newSessionDate || pendingSession}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {pendingSession ? 'Ajout…' : 'Confirmer'}
            </button>
            <button
              onClick={() => { setAddingSession(false); setNewSessionDate(''); setSaveError(null); }}
              className="text-sm border border-[#E2E8F0] text-[#64748B] px-3 py-1.5 rounded-lg hover:bg-[#F1F5F9] transition"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingSession(true)}
            className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition font-medium"
          >
            <Plus size={15} /> Nouvelle séance
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          FICHE DE POINTAGE — matching the admin print layout
          ══════════════════════════════════════════════════════ */}
      <div className="overflow-x-auto">
        {/* ── Print-style header ── */}
        <div className="mb-4 text-center">
          <h2 className="text-base font-bold underline text-[#1E293B]">Fiche de pointage</h2>
        </div>

        <div className="mb-3 text-sm text-[#1E293B] space-y-1.5">
          <div className="flex flex-wrap gap-x-10 gap-y-1">
            <span>
              <span className="font-semibold">Formation :</span>{' '}
              <span className="border-b border-[#1E293B] px-2 min-w-[140px] inline-block">
                {group?.formations?.nom ?? ''}
              </span>
            </span>
            <span>
              <span className="font-semibold">Date de début :</span>{' '}
              <span className="border-b border-[#1E293B] px-2 min-w-[100px] inline-block">{firstDate}</span>
            </span>
            <span>
              <span className="font-semibold">Date de fin :</span>{' '}
              <span className="border-b border-[#1E293B] px-2 min-w-[100px] inline-block">{lastDate}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-1">
            <span>
              <span className="font-semibold">Enseignant :</span>{' '}
              <span className="border-b border-[#1E293B] px-2 min-w-[160px] inline-block">&nbsp;</span>
            </span>
            <span>
              <span className="font-semibold">Jour(s) de formation :</span>{' '}
              <span className="border-b border-[#1E293B] px-2 min-w-[120px] inline-block">
                {group?.schedule ? Object.keys(group.schedule).join(', ') : ''}
              </span>
            </span>
            <span>
              <span className="font-semibold">Heure :</span>{' '}
              <span className="border-b border-[#1E293B] px-2 min-w-[80px] inline-block">&nbsp;</span>
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
              <td className="border border-[#94A3B8] px-2 py-1 text-[#475569] font-semibold bg-[#F8FAFC] w-[180px]">
                Séance №
              </td>
              {localSessions.map((s, i) => (
                <td key={s.id} className="border border-[#94A3B8] text-center font-bold text-[#1E293B] bg-[#F8FAFC] py-1 min-w-[58px] group relative">
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
              <td className="border border-[#94A3B8] px-2 py-1 text-[#475569] bg-[#F8FAFC]">
                Date de la Séance
              </td>
              {localSessions.map((s) => (
                <td key={s.id} className="border border-[#94A3B8] text-center p-0.5 bg-white">
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
              <td className="border border-[#94A3B8] px-2 py-1 text-[#475569] bg-[#F8FAFC]">
                Durée de la Séance
              </td>
              {localSessions.map((s) => (
                <td key={s.id} className="border border-[#94A3B8] text-center p-0.5 bg-white">
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
              <td className="border border-[#94A3B8] px-2 py-1 text-[#475569] bg-[#F8FAFC]">
                Nombre des stagiaires
              </td>
              {localSessions.map((s) => {
                const count = countPresents(s.id);
                return (
                  <td key={s.id} className="border border-[#94A3B8] text-center font-bold text-[#1E293B] py-1 bg-white">
                    {count || ''}
                  </td>
                );
              })}
            </tr>

            {/* Émargement enseignant — editable */}
            <tr>
              <td className="border border-[#94A3B8] px-2 py-1 text-[#475569] bg-[#F8FAFC]">
                Emargement de l'enseignant
              </td>
              {localSessions.map((s) => (
                <td key={s.id} className="border border-[#94A3B8] p-0.5 bg-white h-8">
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
              <td className="border border-[#94A3B8] px-2 py-1 text-[#475569] bg-[#F8FAFC]">
                Emargement des stagiaires
              </td>
              {localSessions.map((s) => (
                <td key={s.id} className="border border-[#94A3B8] p-0.5 bg-white h-8">
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
              const totalP = recs.filter((r) => r.statut === 'present').length;
              const totalA = recs.filter((r) => r.statut === 'absent').length;
              const totalR = recs.filter((r) => r.statut === 'retard').length;

              return (
                <tr key={s ? s.id : `empty-${idx}`}>
                  {/* Row label: "1) Nom Prénom" */}
                  <td className="border border-[#94A3B8] px-2 py-1 text-[#1E293B] whitespace-nowrap">
                    <span className="text-[#94A3B8] mr-1">{idx + 1})</span>
                    {s ? `${s.etudiants?.nom ?? ''} ${s.etudiants?.prenom ?? ''}` : ''}
                  </td>

                  {/* Attendance cells */}
                  {localSessions.map((session) => {
                    if (!s) return <td key={session.id} className="border border-[#94A3B8] bg-white" />;
                    const record  = localRecords.find((r) => r.etudiant_id === s.etudiant_id && r.session_id === session.id) ?? null;
                    const cellKey = `${s.etudiant_id}-${session.id}`;
                    return (
                      <td key={session.id} className="border border-[#94A3B8] p-0 bg-white">
                        <AttendanceDropdown
                          value={record?.statut ?? null}
                          disabled={pendingCell === cellKey}
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
          <p className="text-center text-[#94A3B8] text-sm mt-8">
            Aucune séance — cliquez sur « Nouvelle séance » pour commencer.
          </p>
        )}
      </div>
    </div>
  );
};

export default GroupAttendance;