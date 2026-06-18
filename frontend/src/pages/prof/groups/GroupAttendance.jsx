import { useState } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';

const STATUT_CYCLE = [null, 'present', 'absent', 'retard'];

const CELL_STYLE = {
  present: {
    bg: 'bg-green-50 hover:bg-green-100',
    text: 'text-green-700',
    label: 'P',
    border: 'border-green-300',
  },
  absent: {
    bg: 'bg-red-50 hover:bg-red-100',
    text: 'text-red-600',
    label: 'A',
    border: 'border-red-300',
  },
  retard: {
    bg: 'bg-orange-50 hover:bg-orange-100',
    text: 'text-orange-600',
    label: 'R',
    border: 'border-orange-300',
  },
};

/**
 * Props:
 *  - groupId    : string
 *  - group      : { nom, formations: { nom }, schedules }  — for the header
 *  - sessions   : [{ id, date, statut, duree_minutes? }]
 *  - records    : [{ id, session_id, etudiant_id, statut }]
 *  - students   : [{ id, etudiant_id, etudiants: { nom, prenom } }]
 *  - onUpdate   : (groupId, { sessions, records }) => void
 */
const GroupAttendance = ({ groupId, group = {}, sessions = [], records = [], students = [], onUpdate }) => {
  const [localSessions, setLocalSessions] = useState(sessions);
  const [localRecords, setLocalRecords] = useState(records);

  // For adding a new session
  const [addingSession, setAddingSession] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionDuree, setNewSessionDuree] = useState('');
  const [pendingSession, setPendingSession] = useState(false);

  // For editing session date inline
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editSessionDate, setEditSessionDate] = useState('');

  const [pendingCell, setPendingCell] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const token = () => localStorage.getItem('token');
  const apiBase = `${import.meta.env.VITE_API_URL}/api/profs/me/groups/${groupId}`;

  // ── Helpers ───────────────────────────────────────────────
  const getRecord = (etudiantId, sessionId) =>
    localRecords.find((r) => r.etudiant_id === etudiantId && r.session_id === sessionId) ?? null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  // Count présents for a session
  const countPresents = (sessionId) =>
    localRecords.filter((r) => r.session_id === sessionId && r.statut === 'present').length;

  // ── Cycle P → A → R → empty ──────────────────────────────
  const cycleCell = async (etudiantId, sessionId) => {
    const key = `${etudiantId}-${sessionId}`;
    setPendingCell(key);
    setSaveError(null);

    const existing = getRecord(etudiantId, sessionId);
    const currentIndex = STATUT_CYCLE.indexOf(existing?.statut ?? null);
    const nextStatut = STATUT_CYCLE[(currentIndex + 1) % STATUT_CYCLE.length];

    try {
      if (existing) {
        if (nextStatut === null) {
          const res = await fetch(`${apiBase}/attendance/${existing.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token()}` },
          });
          if (!res.ok) throw new Error();
          setLocalRecords((prev) => prev.filter((r) => r.id !== existing.id));
        } else {
          const res = await fetch(`${apiBase}/attendance/${existing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
            body: JSON.stringify({ statut: nextStatut }),
          });
          if (!res.ok) throw new Error();
          const updated = await res.json();
          setLocalRecords((prev) =>
            prev.map((r) => (r.id === existing.id ? { ...r, statut: updated.statut } : r))
          );
        }
      } else if (nextStatut !== null) {
        const res = await fetch(`${apiBase}/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ session_id: sessionId, etudiant_id: etudiantId, statut: nextStatut }),
        });
        if (!res.ok) throw new Error();
        const created = await res.json();
        setLocalRecords((prev) => [...prev, created]);
      }
      onUpdate(groupId, { sessions: localSessions, records: localRecords });
    } catch {
      setSaveError('Erreur lors de la mise à jour.');
    } finally {
      setPendingCell(null);
    }
  };

  // ── Add session ───────────────────────────────────────────
  const confirmAddSession = async () => {
    if (!newSessionDate) return;
    setPendingSession(true);
    setSaveError(null);
    try {
      const res = await fetch(`${apiBase}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ date: newSessionDate, duree_minutes: newSessionDuree || null }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      const updated = [...localSessions, created].sort((a, b) => new Date(a.date) - new Date(b.date));
      setLocalSessions(updated);
      setAddingSession(false);
      setNewSessionDate('');
      setNewSessionDuree('');
      onUpdate(groupId, { sessions: updated, records: localRecords });
    } catch {
      setSaveError('Erreur lors de la création de la séance.');
    } finally {
      setPendingSession(false);
    }
  };

  // ── Delete session ────────────────────────────────────────
  const deleteSession = async (sessionId) => {
    setSaveError(null);
    try {
      const res = await fetch(`${apiBase}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) throw new Error();
      const updatedSessions = localSessions.filter((s) => s.id !== sessionId);
      const updatedRecords = localRecords.filter((r) => r.session_id !== sessionId);
      setLocalSessions(updatedSessions);
      setLocalRecords(updatedRecords);
      onUpdate(groupId, { sessions: updatedSessions, records: updatedRecords });
    } catch {
      setSaveError('Erreur lors de la suppression de la séance.');
    }
  };

  // ── Edit session date ─────────────────────────────────────
  const saveSessionDate = async (sessionId) => {
    if (!editSessionDate) { setEditingSessionId(null); return; }
    setSaveError(null);
    try {
      const res = await fetch(`${apiBase}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ date: editSessionDate }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setLocalSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, date: updated.date } : s))
      );
      setEditingSessionId(null);
    } catch {
      setSaveError('Erreur lors de la modification de la date.');
    }
  };

  // ── Render ────────────────────────────────────────────────
  // Pad students list to at least 18 rows (like the paper form)
  const TOTAL_ROWS = Math.max(students.length, 18);
  const paddedStudents = [
    ...students,
    ...Array(Math.max(0, TOTAL_ROWS - students.length)).fill(null),
  ];

  return (
    <div className="font-sans">
      {saveError && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {saveError}
        </p>
      )}

      {/* ── Header info bar ── */}
      <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-[#1E293B] border border-[#E2E8F0] rounded-xl px-5 py-3 bg-[#F8FAFC]">
        <div>
          <span className="text-[#64748B] font-medium">Formation : </span>
          <span className="font-semibold">{group?.formations?.nom ?? '—'}</span>
        </div>
        <div>
          <span className="text-[#64748B] font-medium">Groupe : </span>
          <span className="font-semibold">{group?.nom ?? '—'}</span>
        </div>
        <div>
          <span className="text-[#64748B] font-medium">Jour(s) : </span>
          <span>{group?.schedule ? Object.keys(group.schedule).join(', ') : '—'}</span>
        </div>
        <div>
          <span className="text-[#64748B] font-medium">Séances : </span>
          <span>{localSessions.length}</span>
        </div>
      </div>

      {/* ── Add session button ── */}
      <div className="flex items-center gap-3 mb-4">
        {addingSession ? (
          <div className="flex flex-wrap items-center gap-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-4 py-3">
            <label className="text-sm text-[#1E293B] font-medium">Date :</label>
            <input
              type="date"
              value={newSessionDate}
              onChange={(e) => setNewSessionDate(e.target.value)}
              className="border border-[#CBD5E1] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
            <label className="text-sm text-[#1E293B] font-medium">Durée (min) :</label>
            <input
              type="number"
              placeholder="ex: 90"
              value={newSessionDuree}
              onChange={(e) => setNewSessionDuree(e.target.value)}
              className="border border-[#CBD5E1] rounded-lg px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
            <button
              onClick={confirmAddSession}
              disabled={!newSessionDate || pendingSession}
              className="text-sm bg-[#2563EB] text-white px-3 py-1.5 rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50 transition"
            >
              {pendingSession ? 'Ajout…' : 'Confirmer'}
            </button>
            <button
              onClick={() => { setAddingSession(false); setNewSessionDate(''); setNewSessionDuree(''); }}
              className="text-sm border border-[#E2E8F0] text-[#64748B] px-3 py-1.5 rounded-lg hover:bg-[#F1F5F9] transition"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingSession(true)}
            className="flex items-center gap-1.5 text-sm text-[#2563EB] border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 rounded-lg hover:bg-[#DBEAFE] transition font-medium"
          >
            <Plus size={15} /> Nouvelle séance
          </button>
        )}
      </div>

      {/* ── Fiche de pointage table ── */}
      <div className="overflow-x-auto rounded-xl border border-[#CBD5E1] shadow-sm">
        <table className="border-collapse text-xs" style={{ minWidth: `${Math.max(600, 200 + localSessions.length * 52)}px` }}>

          {/* ══ Title row ══ */}
          <thead>
            <tr>
              <td
                colSpan={3 + localSessions.length}
                className="bg-[#1E293B] text-white text-center font-bold text-sm py-2.5 tracking-wide border border-[#334155]"
              >
                Fiche de pointage
              </td>
            </tr>

            {/* ── Session number row ── */}
            <tr className="bg-[#F1F5F9]">
              <td className="border border-[#CBD5E1] px-2 py-1.5 font-semibold text-[#475569] w-8 text-center">#</td>
              <td className="border border-[#CBD5E1] px-3 py-1.5 font-semibold text-[#475569] min-w-[160px]">
                Stagiaire
              </td>
              {localSessions.map((s, i) => (
                <td
                  key={s.id}
                  className="border border-[#CBD5E1] text-center font-bold text-[#1E293B] min-w-[48px] group relative"
                >
                  <div className="flex flex-col items-center py-1 gap-0.5">
                    <span className="font-bold">{i + 1}</span>
                    {/* Delete button on hover */}
                    <button
                      onClick={() => deleteSession(s.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition absolute top-0.5 right-0.5"
                      title="Supprimer cette séance"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </td>
              ))}
              <td className="border border-[#CBD5E1] text-center font-bold text-green-700 px-1 min-w-[32px]">P</td>
              <td className="border border-[#CBD5E1] text-center font-bold text-red-600 px-1 min-w-[32px]">A</td>
              <td className="border border-[#CBD5E1] text-center font-bold text-orange-500 px-1 min-w-[32px]">R</td>
            </tr>

            {/* ── Date de la Séance row ── */}
            <tr className="bg-white">
              <td className="border border-[#CBD5E1] px-2 py-1.5 text-[#64748B] text-[10px] italic" colSpan={2}>
                Date de la Séance
              </td>
              {localSessions.map((s) => (
                <td key={s.id} className="border border-[#CBD5E1] text-center py-1 px-0.5">
                  {editingSessionId === s.id ? (
                    <input
                      type="date"
                      value={editSessionDate}
                      onChange={(e) => setEditSessionDate(e.target.value)}
                      onBlur={() => saveSessionDate(s.id)}
                      onKeyDown={(e) => e.key === 'Enter' && saveSessionDate(s.id)}
                      autoFocus
                      className="w-full border-0 text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-[#2563EB] rounded px-0"
                    />
                  ) : (
                    <button
                      onClick={() => { setEditingSessionId(s.id); setEditSessionDate(s.date?.slice(0, 10) ?? ''); }}
                      className="w-full text-[10px] text-[#1E293B] hover:text-[#2563EB] hover:underline transition px-0.5"
                      title="Cliquer pour modifier la date"
                    >
                      {formatDate(s.date)}
                    </button>
                  )}
                </td>
              ))}
              <td className="border border-[#CBD5E1]" colSpan={3} />
            </tr>

            {/* ── Durée de la Séance row ── */}
            <tr className="bg-[#FAFAFA]">
              <td className="border border-[#CBD5E1] px-2 py-1 text-[#64748B] text-[10px] italic" colSpan={2}>
                Durée de la Séance
              </td>
              {localSessions.map((s) => (
                <td key={s.id} className="border border-[#CBD5E1] text-center text-[10px] text-[#475569] py-1">
                  {s.duree_minutes ? `${s.duree_minutes}mn` : ''}
                </td>
              ))}
              <td className="border border-[#CBD5E1]" colSpan={3} />
            </tr>

            {/* ── Nombre de stagiaires présents row ── */}
            <tr className="bg-white">
              <td className="border border-[#CBD5E1] px-2 py-1 text-[#64748B] text-[10px] italic" colSpan={2}>
                Nombre des stagiaires
              </td>
              {localSessions.map((s) => (
                <td key={s.id} className="border border-[#CBD5E1] text-center text-[10px] font-semibold text-[#1E293B] py-1">
                  {countPresents(s.id) || ''}
                </td>
              ))}
              <td className="border border-[#CBD5E1]" colSpan={3} />
            </tr>

            {/* ── Émargement de l'enseignant row ── */}
            <tr className="bg-[#FAFAFA]">
              <td className="border border-[#CBD5E1] px-2 py-1 text-[#64748B] text-[10px] italic" colSpan={2}>
                Émargement de l'enseignant
              </td>
              {localSessions.map((s) => (
                <td key={s.id} className="border border-[#CBD5E1] py-3" />
              ))}
              <td className="border border-[#CBD5E1]" colSpan={3} />
            </tr>

            {/* ── Émargement des stagiaires row ── */}
            <tr className="bg-white">
              <td className="border border-[#CBD5E1] px-2 py-1 text-[#64748B] text-[10px] italic" colSpan={2}>
                Émargement des stagiaires
              </td>
              {localSessions.map((s) => (
                <td key={s.id} className="border border-[#CBD5E1] py-3" />
              ))}
              <td className="border border-[#CBD5E1]" colSpan={3} />
            </tr>
          </thead>

          {/* ══ Student rows ══ */}
          <tbody>
            {paddedStudents.map((s, idx) => {
              const rowNum = idx + 1;
              const studentRecords = s
                ? localRecords.filter((r) => r.etudiant_id === s.etudiant_id)
                : [];
              const totalP = studentRecords.filter((r) => r.statut === 'present').length;
              const totalA = studentRecords.filter((r) => r.statut === 'absent').length;
              const totalR = studentRecords.filter((r) => r.statut === 'retard').length;

              return (
                <tr
                  key={s ? s.id : `empty-${idx}`}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}
                >
                  {/* Row number */}
                  <td className="border border-[#CBD5E1] text-center text-[#64748B] font-medium py-1.5 px-1 w-8">
                    {rowNum}
                  </td>

                  {/* Student name — READ ONLY */}
                  <td className="border border-[#CBD5E1] px-3 py-1.5 text-[#1E293B] font-medium whitespace-nowrap min-w-[160px]">
                    {s
                      ? `${s.etudiants?.nom ?? ''} ${s.etudiants?.prenom ?? ''}`
                      : <span className="text-[#CBD5E1]">—</span>
                    }
                  </td>

                  {/* Attendance cells */}
                  {localSessions.map((session) => {
                    if (!s) {
                      return (
                        <td key={session.id} className="border border-[#CBD5E1] text-center py-1.5" />
                      );
                    }
                    const record = getRecord(s.etudiant_id, session.id);
                    const statut = record?.statut ?? null;
                    const key = `${s.etudiant_id}-${session.id}`;
                    const isPending = pendingCell === key;
                    const style = statut ? CELL_STYLE[statut] : null;

                    return (
                      <td
                        key={session.id}
                        className={`border border-[#CBD5E1] text-center py-0 px-0`}
                      >
                        <button
                          onClick={() => cycleCell(s.etudiant_id, session.id)}
                          disabled={isPending}
                          title="Clic : P → A → R → vide"
                          className={`w-full h-full min-h-[30px] flex items-center justify-center font-bold text-xs transition
                            ${isPending ? 'opacity-40 cursor-wait' : ''}
                            ${style ? `${style.bg} ${style.text}` : 'hover:bg-[#F1F5F9] text-[#CBD5E1]'}
                          `}
                        >
                          {isPending ? (
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : statut ? (
                            style.label
                          ) : (
                            ''
                          )}
                        </button>
                      </td>
                    );
                  })}

                  {/* Totals */}
                  {s ? (
                    <>
                      <td className="border border-[#CBD5E1] text-center font-bold text-green-700 py-1.5">{totalP || ''}</td>
                      <td className="border border-[#CBD5E1] text-center font-bold text-red-600 py-1.5">{totalA || ''}</td>
                      <td className="border border-[#CBD5E1] text-center font-bold text-orange-500 py-1.5">{totalR || ''}</td>
                    </>
                  ) : (
                    <>
                      <td className="border border-[#CBD5E1]" />
                      <td className="border border-[#CBD5E1]" />
                      <td className="border border-[#CBD5E1]" />
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {localSessions.length === 0 && (
        <p className="text-center text-[#94A3B8] text-sm mt-6">
          Aucune séance — cliquez sur « Nouvelle séance » pour commencer.
        </p>
      )}
    </div>
  );
};

export default GroupAttendance;