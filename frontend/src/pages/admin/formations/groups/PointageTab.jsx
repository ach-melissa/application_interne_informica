import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, X, CalendarDays } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const STATUT_LABEL = { present: 'P', absent: 'A', retard: 'R' };
const STATUT_STYLE = {
  present: 'bg-emerald-50 text-emerald-700',
  absent:  'bg-red-50 text-red-600',
  retard:  'bg-amber-50 text-amber-700',
};

const PointageTab = ({ groupId, etudiants, group, readOnly = false }) => {
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [addingSession, setAddingSession] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState('normale');
  const [editingCell, setEditingCell] = useState(null);
const [ficheInfo, setFicheInfo] = useState({
    date_debut: '', date_fin: '',
    jours_formation: '', heure_formation: '',
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const dropdownRef = useRef(null);

  // ── Sync ficheInfo when group loads ─────────────────────
useEffect(() => {
if (group) setFicheInfo({
      date_debut: group.date_debut ?? '',
      date_fin: group.date_fin ?? '',
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
// ── Save fiche info (dates/jours/heure) ──────────────────
const saveInfo = async () => {
  setSavingInfo(true);
  try {
    // Postgres refuse '' pour une colonne `date` -> convertir en null
    const payload = {
      ...ficheInfo,
      date_debut: ficheInfo.date_debut || null,
      date_fin: ficheInfo.date_fin || null,
    };
    const res = await fetch(`${API}/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Échec sauvegarde fiche:', err);
      alert("La fiche n'a pas pu être enregistrée. Réessayez.");
      return;
    }
    const data = await res.json();
    setFicheInfo({
      date_debut: data.date_debut ?? '',
      date_fin: data.date_fin ?? '',
      jours_formation: data.jours_formation ?? '',
      heure_formation: data.heure_formation ?? '',
    });
  } catch (err) {
    console.error(err);
    alert("La fiche n'a pas pu être enregistrée. Réessayez.");
  } finally {
    setSavingInfo(false);
  }
};

  // ── Update durée séance ──────────────────────────────────
const updateDuree = async (sessionId, duree) => {
  try {
    const res = await fetch(`${API}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ duree }),
    });
    if (!res.ok) throw new Error('Échec de la sauvegarde de la durée');
    setSessions(prev => prev.map(x => x.id === sessionId ? { ...x, duree } : x));
  } catch (err) {
    console.error(err);
    alert('La durée n\'a pas pu être enregistrée. Réessayez.');
  }
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
        body: JSON.stringify({ group_id: groupId, date: newDate, statut: 'effectuee', type_seance: newType }),
      });
      const data = await res.json();
      setSessions(s => [...s, data].sort((a, b) => new Date(a.date) - new Date(b.date)));
setNewDate('');
      setNewType('normale');
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
      <div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
    </div>
  );

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
      {/* ── Toolbar ── */}
<div className="flex items-center justify-between print:hidden">
  <p className="text-sm text-slate-400">{sessions.length} séance(s)</p>
  <div className="flex items-center gap-2">
    {!readOnly && (
      <button
        onClick={() => setAddingSession(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F2A4A] text-white text-xs font-medium rounded-lg hover:bg-[#065e8f] transition"
      >
        <Plus size={14} /> Ajouter séance
      </button>
    )}
  </div>
</div>

      {/* ── Add session modal ── */}
      {!readOnly && addingSession && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAddingSession(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
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
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-transparent rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors"
                />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Type de séance</p>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-transparent rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors"
                >
                  <option value="normale">Normale</option>
                  <option value="remplacement">Remplacement</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setAddingSession(false)} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
                <button onClick={addSession} disabled={!newDate}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40 font-medium">
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div id="pointage-print-area">
      {/* ── Fiche info header ── */}
      <div className="bg-white border border-[#F1F5F9] rounded-xl px-4 py-3 text-xs text-slate-800 space-y-2">
<div className="flex gap-6 flex-wrap items-center">
<span><strong>Formation :</strong> {group?.formations?.nom ?? '—'}</span>
          <label className="flex items-center gap-1.5">
            <strong>Date de début :</strong>
            {readOnly ? (
              <span className="px-1">{ficheInfo.date_debut ? formatDate(ficheInfo.date_debut) : firstDate}</span>
            ) : (
              <input type="date" value={ficheInfo.date_debut} onChange={e => setFicheInfo(f => ({ ...f, date_debut: e.target.value }))} onBlur={saveInfo}
                className="border-b border-slate-300 bg-transparent focus:outline-none focus:border-[#0369A1] px-1" />
            )}
          </label>
          <label className="flex items-center gap-1.5">
            <strong>Date de fin :</strong>
            {readOnly ? (
              <span className="px-1">{ficheInfo.date_fin ? formatDate(ficheInfo.date_fin) : lastDate}</span>
            ) : (
              <input type="date" value={ficheInfo.date_fin} onChange={e => setFicheInfo(f => ({ ...f, date_fin: e.target.value }))} onBlur={saveInfo}
                className="border-b border-slate-300 bg-transparent focus:outline-none focus:border-[#0369A1] px-1" />
            )}
          </label>
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
            {readOnly ? (
              <span className="px-1">{ficheInfo.jours_formation || '—'}</span>
            ) : (
              <input
                type="text"
                value={ficheInfo.jours_formation}
                onChange={e => setFicheInfo(f => ({ ...f, jours_formation: e.target.value }))}
                onBlur={saveInfo}
                placeholder="ex: Lundi, Mercredi"
                className="border-b border-slate-300 bg-transparent focus:outline-none focus:border-[#0369A1] px-1 w-36"
              />
            )}
          </label>
          <label className="flex items-center gap-1.5">
            <strong>Heure :</strong>
            {readOnly ? (
              <span className="px-1">{ficheInfo.heure_formation || '—'}</span>
            ) : (
              <input
                type="text"
                value={ficheInfo.heure_formation}
                onChange={e => setFicheInfo(f => ({ ...f, heure_formation: e.target.value }))}
                onBlur={saveInfo}
                placeholder="ex: 09:00 - 11:00"
                className="border-b border-slate-300 bg-transparent focus:outline-none focus:border-[#0369A1] px-1 w-28"
              />
            )}
          </label>
          {!readOnly && savingInfo && <span className="text-slate-300 italic">Sauvegarde…</span>}
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-slate-300 py-8 text-center">Aucune séance enregistrée.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#F1F5F9] print:overflow-visible print:border-0">
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
                {sessions.map(s => (
                  <td key={s.id} className="border border-[#F1F5F9] px-2 py-2 text-center text-slate-800">
                    {formatDate(s.date)}
                  </td>
                ))}
              </tr>
<tr className="bg-[#F8FCFF]">
                <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-[#F8FCFF] z-10">
                  Type
                </td>
                {sessions.map(s => (
                  <td key={s.id} className="border border-[#F1F5F9] px-2 py-2 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.type_seance === 'remplacement' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {s.type_seance === 'remplacement' ? 'Remplacement' : 'Normale'}
                    </span>
                  </td>
                ))}
              </tr>
              {/* ── Durée (editable) ── */}
              <tr className="bg-[#F8FCFF]">
                <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-[#F8FCFF] z-10">
                  Durée de la Séance
                </td>
                {sessions.map(s => (
                  <td key={s.id} className="border border-[#F1F5F9] px-1 py-1 text-center">
                    {readOnly ? (
                      <span className="text-xs">{s.duree || '—'}</span>
                    ) : (
                      <input
                        type="text"
                        defaultValue={s.duree ?? ''}
                        onBlur={e => updateDuree(s.id, e.target.value)}
                        placeholder="—"
                        className="w-full text-center text-xs border-b border-transparent hover:border-slate-300 focus:border-[#0369A1] bg-transparent focus:outline-none px-1 py-1"
                      />
                    )}
                  </td>
                ))}
              </tr>

              {/* ── Nombre présents ── */}
              <tr>
                <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-white z-10">
                  Nombre des stagiaires
                </td>
                {sessions.map(s => {
                  const nb = getNbPresents(s.id);
                  return (
                    <td key={s.id} className="border border-[#F1F5F9] px-2 py-2 text-center font-bold text-slate-800">
                      {nb > 0 ? nb : ''}
                    </td>
                  );
                })}
              </tr>

              {/* ── Emargement enseignant ── */}
              <tr className="bg-[#F8FCFF]">
                <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-[#F8FCFF] z-10">
                  Emargement de l'enseignant
                </td>
                {sessions.map(s => (
                  <td key={s.id} className="border border-[#F1F5F9] px-2 py-5" />
                ))}
              </tr>

              {/* ── Emargement stagiaires ── */}
              <tr>
                <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-white z-10">
                  Emargement des stagiaires
                </td>
                {sessions.map(s => (
                  <td key={s.id} className="border border-[#F1F5F9] px-2 py-5" />
                ))}
              </tr>

              {/* ── Separator ── */}
              <tr>
                <td colSpan={sessions.length + 1} className="bg-[#DCEBFA] border border-[#F1F5F9] px-3 py-1.5 font-semibold text-[#0369A1]">
                  Présences
                </td>
              </tr>

              {/* ── Étudiants ── */}
              {etudiants.map((e, idx) => (
                <tr key={e.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FCFF]'}>
                  <td className="border border-[#F1F5F9] px-3 py-2 text-slate-800 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                    <span className="text-slate-300 mr-1">{idx + 1})</span>
                    {e.nom} {e.prenom}
                  </td>
                  {sessions.map(s => {
                    const key = `${s.id}|${e.id}`;
                    const statut = attendance[key]?.statut ?? null;
                    const isEditing = editingCell === key;
                    return (
                      <td key={s.id} className="border border-[#F1F5F9] p-0 text-center relative">
                        {readOnly ? (
                          <div className={`w-full py-2 px-1 text-xs font-bold ${statut ? STATUT_STYLE[statut] : 'text-slate-300'}`}>
                            {statut ? STATUT_LABEL[statut] : '—'}
                          </div>
                        ) : (
                          <button
                            onClick={(ev) => { ev.stopPropagation(); setEditingCell(isEditing ? null : key); }}
                            className={`w-full py-2 px-1 text-xs font-bold transition hover:opacity-80
                              ${statut ? STATUT_STYLE[statut] : 'text-slate-300 hover:bg-slate-50'}`}
                          >
                            {statut ? STATUT_LABEL[statut] : '—'}
                          </button>
                        )}
                        {!readOnly && isEditing && (
                          <div
                            ref={dropdownRef}
                            className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-0.5 bg-white border border-[#F1F5F9] rounded-xl shadow-lg p-1 flex flex-col gap-0.5 min-w-[60px]"
                          >
                            {[null, 'present', 'absent', 'retard'].map(opt => (
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
{!readOnly && (
  <tr className="bg-red-50/40 print:hidden">
                  <td className="border border-[#F1F5F9] px-3 py-1.5 text-slate-300 sticky left-0 bg-red-50/40 z-10 text-[10px]">
                    Supprimer
                  </td>
                  {sessions.map(s => (
                    <td key={s.id} className="border border-[#F1F5F9] px-2 py-1.5 text-center">
                      <button onClick={() => deleteSession(s.id)} className="text-red-300 hover:text-red-500 transition">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  ))}
                </tr>
              )}

            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  </>
);
};

export default PointageTab;