import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const STATUT_LABEL = { present: 'P', absent: 'A', retard: 'R' };
const STATUT_STYLE = {
  present: 'bg-green-100 text-green-700',
  absent:  'bg-red-100 text-red-600',
  retard:  'bg-orange-100 text-orange-600',
};

const PointageTab = ({ groupId, etudiants, group }) => {
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [addingSession, setAddingSession] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [editingCell, setEditingCell] = useState(null);
  const [ficheInfo, setFicheInfo] = useState({ jours_formation: '', heure_formation: '' });
  const [savingInfo, setSavingInfo] = useState(false);
  const dropdownRef = useRef(null);

  // ── Sync ficheInfo when group loads ─────────────────────
  useEffect(() => {
    if (group) setFicheInfo({
      jours_formation: group.jours_formation ?? '',
      heure_formation: group.heure_formation ?? '',
    });
  }, [group]);

  // ── Close dropdown on outside click ─────────────────────
  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setEditingCell(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // ── Fetch ────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resSessions, resAttendance] = await Promise.all([
          fetch(`${API}/api/sessions?group_id=${groupId}`, { headers: getHeaders() }),
          fetch(`${API}/api/attendance?group_id=${groupId}`, { headers: getHeaders() }),
        ]);
        const sessionsData = await resSessions.json();
        const attendanceData = await resAttendance.json();
        setSessions(Array.isArray(sessionsData) ? sessionsData.sort((a, b) => new Date(a.date) - new Date(b.date)) : []);
        const map = {};
        (Array.isArray(attendanceData) ? attendanceData : []).forEach(a => {
          map[`${a.session_id}|${a.etudiant_id}`] = { id: a.id, statut: a.statut };
        });
        setAttendance(map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [groupId]);

  // ── Save fiche info (jours/heure) ────────────────────────
  const saveInfo = async () => {
    setSavingInfo(true);
    try {
      await fetch(`${API}/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(ficheInfo),
      });
    } catch (err) { console.error(err); }
    finally { setSavingInfo(false); }
  };

  // ── Update durée séance ──────────────────────────────────
  const updateDuree = async (sessionId, duree) => {
    await fetch(`${API}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ duree }),
    });
    setSessions(prev => prev.map(x => x.id === sessionId ? { ...x, duree } : x));
  };

  // ── Update statut ────────────────────────────────────────
  const updateStatut = async (session_id, etudiant_id, next) => {
    const key = `${session_id}|${etudiant_id}`;
    const prev = attendance[key];
    setEditingCell(null);
    try {
      if (!next && prev?.id) {
        await fetch(`${API}/api/attendance/${prev.id}`, { method: 'DELETE', headers: getHeaders() });
        setAttendance(a => { const n = { ...a }; delete n[key]; return n; });
      } else if (prev?.id) {
        const res = await fetch(`${API}/api/attendance/${prev.id}`, {
          method: 'PUT', headers: getHeaders(),
          body: JSON.stringify({ statut: next }),
        });
        const data = await res.json();
        setAttendance(a => ({ ...a, [key]: { id: data.id, statut: data.statut } }));
      } else if (next) {
        const res = await fetch(`${API}/api/attendance`, {
          method: 'POST', headers: getHeaders(),
          body: JSON.stringify({ session_id, etudiant_id, statut: next }),
        });
        const data = await res.json();
        setAttendance(a => ({ ...a, [key]: { id: data.id, statut: data.statut } }));
      }
    } catch (err) { console.error(err); }
  };

  // ── Add session ──────────────────────────────────────────
  const addSession = async () => {
    if (!newDate) return;
    try {
      const res = await fetch(`${API}/api/sessions`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ group_id: groupId, date: newDate, statut: 'effectuee' }),
      });
      const data = await res.json();
      setSessions(s => [...s, data].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setNewDate('');
      setAddingSession(false);
    } catch (err) { console.error(err); }
  };

  // ── Delete session ───────────────────────────────────────
  const deleteSession = async (sessionId) => {
    if (!confirm('Supprimer cette séance ?')) return;
    await fetch(`${API}/api/sessions/${sessionId}`, { method: 'DELETE', headers: getHeaders() });
    setSessions(s => s.filter(x => x.id !== sessionId));
  };

  const formatDate  = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formatShort = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

  const firstDate = sessions.length > 0 ? formatDate(sessions[0].date) : '—';
  const lastDate  = sessions.length > 0 ? formatDate(sessions[sessions.length - 1].date) : '—';

  const getNbPresents = (sessionId) =>
    Object.entries(attendance).filter(([k, v]) => k.startsWith(sessionId) && v.statut === 'present').length;

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#64748B]">{sessions.length} séance(s)</p>
        <button
          onClick={() => setAddingSession(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white text-xs font-medium rounded-lg hover:bg-[#1D4ED8] transition"
        >
          <Plus size={14} /> Ajouter séance
        </button>
      </div>

      {/* ── Add session form ── */}
      {addingSession && (
        <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3">
          <input
            type="date" value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
          <button onClick={addSession} className="px-3 py-1.5 bg-[#2563EB] text-white text-xs rounded-lg hover:bg-[#1D4ED8] transition">
            Confirmer
          </button>
          <button onClick={() => setAddingSession(false)} className="px-3 py-1.5 border border-[#E2E8F0] text-[#64748B] text-xs rounded-lg hover:bg-gray-50 transition">
            Annuler
          </button>
        </div>
      )}

      {/* ── Fiche info header ── */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-xs text-[#1E293B] space-y-2">
        <div className="flex gap-6 flex-wrap items-center">
          <span><strong>Formation :</strong> {group?.formations?.nom ?? '—'}</span>
          <span><strong>Date de début :</strong> {firstDate}</span>
          <span><strong>Date de fin :</strong> {lastDate}</span>
        </div>
        <div className="flex gap-4 flex-wrap items-center">
          <span>
            <strong>Enseignant :</strong>{' '}
            {group?.teacher?.user
              ? `${group.teacher.user.nom} ${group.teacher.user.prenom}`
              : '—'}
          </span>
          <label className="flex items-center gap-1.5">
            <strong>Jour(s) :</strong>
            <input
              type="text"
              value={ficheInfo.jours_formation}
              onChange={e => setFicheInfo(f => ({ ...f, jours_formation: e.target.value }))}
              onBlur={saveInfo}
              placeholder="ex: Lundi, Mercredi"
              className="border-b border-[#CBD5E1] bg-transparent focus:outline-none focus:border-[#2563EB] px-1 w-36"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <strong>Heure :</strong>
            <input
              type="text"
              value={ficheInfo.heure_formation}
              onChange={e => setFicheInfo(f => ({ ...f, heure_formation: e.target.value }))}
              onBlur={saveInfo}
              placeholder="ex: 09:00 - 11:00"
              className="border-b border-[#CBD5E1] bg-transparent focus:outline-none focus:border-[#2563EB] px-1 w-28"
            />
          </label>
          {savingInfo && <span className="text-[#94A3B8] italic">Sauvegarde…</span>}
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-[#94A3B8] py-8 text-center">Aucune séance enregistrée.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="text-xs border-collapse bg-white" style={{ minWidth: `${140 + sessions.length * 80}px` }}>
            <tbody>

              {/* ── Séance № ── */}
              <tr className="bg-[#F8FAFC]">
                <td className="border border-[#E2E8F0] px-3 py-2 font-bold text-[#1E293B] sticky left-0 bg-[#F8FAFC] z-10 min-w-[160px]">
                  Séance №
                </td>
                {sessions.map((s, i) => (
                  <td key={s.id} className="border border-[#E2E8F0] px-2 py-2 text-center font-bold text-[#1E293B] min-w-[80px]">
                    {i + 1}
                  </td>
                ))}
              </tr>

              {/* ── Date ── */}
              <tr>
                <td className="border border-[#E2E8F0] px-3 py-2 text-[#64748B] sticky left-0 bg-white z-10">
                  Date de la Séance
                </td>
                {sessions.map(s => (
                  <td key={s.id} className="border border-[#E2E8F0] px-2 py-2 text-center text-[#1E293B]">
                    {formatShort(s.date)}
                  </td>
                ))}
              </tr>

              {/* ── Durée (editable) ── */}
              <tr className="bg-[#FAFBFC]">
                <td className="border border-[#E2E8F0] px-3 py-2 text-[#64748B] sticky left-0 bg-[#FAFBFC] z-10">
                  Durée de la Séance
                </td>
                {sessions.map(s => (
                  <td key={s.id} className="border border-[#E2E8F0] px-1 py-1 text-center">
                    <input
                      type="text"
                      defaultValue={s.duree ?? ''}
                      onBlur={e => updateDuree(s.id, e.target.value)}
                      placeholder="—"
                      className="w-full text-center text-xs border-b border-transparent hover:border-[#CBD5E1] focus:border-[#2563EB] bg-transparent focus:outline-none px-1 py-1"
                    />
                  </td>
                ))}
              </tr>

              {/* ── Nombre présents ── */}
              <tr>
                <td className="border border-[#E2E8F0] px-3 py-2 text-[#64748B] sticky left-0 bg-white z-10">
                  Nombre des stagiaires
                </td>
                {sessions.map(s => {
                  const nb = getNbPresents(s.id);
                  return (
                    <td key={s.id} className="border border-[#E2E8F0] px-2 py-2 text-center font-bold text-[#1E293B]">
                      {nb > 0 ? nb : ''}
                    </td>
                  );
                })}
              </tr>

              {/* ── Emargement enseignant ── */}
              <tr className="bg-[#FAFBFC]">
                <td className="border border-[#E2E8F0] px-3 py-2 text-[#64748B] sticky left-0 bg-[#FAFBFC] z-10">
                  Emargement de l'enseignant
                </td>
                {sessions.map(s => (
                  <td key={s.id} className="border border-[#E2E8F0] px-2 py-5" key={s.id} />
                ))}
              </tr>

              {/* ── Emargement stagiaires ── */}
              <tr>
                <td className="border border-[#E2E8F0] px-3 py-2 text-[#64748B] sticky left-0 bg-white z-10">
                  Emargement des stagiaires
                </td>
                {sessions.map(s => (
                  <td key={s.id} className="border border-[#E2E8F0] px-2 py-5" />
                ))}
              </tr>

              {/* ── Separator ── */}
              <tr>
                <td colSpan={sessions.length + 1} className="bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-1.5 font-semibold text-[#2563EB]">
                  Présences
                </td>
              </tr>

              {/* ── Étudiants ── */}
              {etudiants.map((e, idx) => (
                <tr key={e.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}>
                  <td className="border border-[#E2E8F0] px-3 py-2 text-[#1E293B] sticky left-0 bg-inherit z-10 whitespace-nowrap">
                    <span className="text-[#94A3B8] mr-1">{idx + 1})</span>
                    {e.nom} {e.prenom}
                  </td>
                  {sessions.map(s => {
                    const key = `${s.id}|${e.id}`;
                    const statut = attendance[key]?.statut ?? null;
                    const isEditing = editingCell === key;
                    return (
                      <td key={s.id} className="border border-[#E2E8F0] p-0 text-center relative">
                        <button
                          onClick={(ev) => { ev.stopPropagation(); setEditingCell(isEditing ? null : key); }}
                          className={`w-full py-2 px-1 text-xs font-bold transition hover:opacity-80
                            ${statut ? STATUT_STYLE[statut] : 'text-gray-300 hover:bg-gray-50'}`}
                        >
                          {statut ? STATUT_LABEL[statut] : '—'}
                        </button>
                        {isEditing && (
                          <div
                            ref={dropdownRef}
                            className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-0.5 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-1 flex flex-col gap-0.5 min-w-[60px]"
                          >
                            {[null, 'present', 'absent', 'retard'].map(opt => (
                              <button
                                key={opt ?? 'none'}
                                onClick={(ev) => { ev.stopPropagation(); updateStatut(s.id, e.id, opt); }}
                                className={`px-3 py-1.5 text-xs rounded-lg font-bold transition hover:opacity-80
                                  ${opt === 'present' ? 'bg-green-100 text-green-700' :
                                    opt === 'absent'  ? 'bg-red-100 text-red-600' :
                                    opt === 'retard'  ? 'bg-orange-100 text-orange-600' :
                                    'bg-gray-50 text-gray-400'}`}
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
              <tr className="bg-[#FEF2F2]">
                <td className="border border-[#E2E8F0] px-3 py-1.5 text-[#94A3B8] sticky left-0 bg-[#FEF2F2] z-10 text-[10px]">
                  Supprimer
                </td>
                {sessions.map(s => (
                  <td key={s.id} className="border border-[#E2E8F0] px-2 py-1.5 text-center">
                    <button onClick={() => deleteSession(s.id)} className="text-red-300 hover:text-red-500 transition">
                      <Trash2 size={12} />
                    </button>
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PointageTab;