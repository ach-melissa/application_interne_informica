import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Check, X, UserCheck, UserX, Clock } from 'lucide-react';
import AddSessionModal from './AddSessionModal';
import { computeNextSessionDate, resolveGroupDuration } from "../../../../utils/pointageHelpers";
import { useAuth } from "../../../../context/AuthContext";
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

const toDecimalHours = (start, end) => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh + em / 60) - (sh + sm / 60));
};

const PointageTab = ({ groupId, etudiants, group, formation, niveau, readOnly = false }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [addingSession, setAddingSession] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [pendingSessionId, setPendingSessionId] = useState(null);
  const [pendingAttendance, setPendingAttendance] = useState({});
  const [ficheInfo, setFicheInfo] = useState({
    date_debut: '', date_fin: '',
    jours_formation: '', heure_formation: '',
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const dropdownRef = useRef(null);

  const { type_duree: durationType, total: durationTotal } = resolveGroupDuration(group || {}, formation, niveau);
  const isHourBased = durationType === 'heures';

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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setEditingCell(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const refetchAttendance = async () => {
    const res = await fetch(`${API}/api/attendance?group_id=${groupId}`, { headers: getHeaders() });
    const data = await res.json();
    const map = {};
    (Array.isArray(data) ? data : []).forEach(a => {
      map[`${a.session_id}|${a.etudiant_id}`] = { id: a.id, statut: a.statut };
    });
    setAttendance(map);
  };

  // ── Fetch ────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const resSessions = await fetch(`${API}/api/sessions?group_id=${groupId}`, { headers: getHeaders() });
        const sessionsData = await resSessions.json();
        setSessions(Array.isArray(sessionsData) ? sessionsData.sort((a, b) => new Date(a.date) - new Date(b.date)) : []);
        await refetchAttendance();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [groupId]);

  // ── Save fiche info (dates/jours/heure) ──────────────────
  const saveInfo = async () => {
    setSavingInfo(true);
    try {
      const payload = {
        ...ficheInfo,
        date_debut: ficheInfo.date_debut || null,
        date_fin: ficheInfo.date_fin || null,
      };
      const res = await fetch(`${API}/api/groups/${groupId}`, {
        method: 'PATCH', headers: getHeaders(), body: JSON.stringify(payload),
      });
      if (!res.ok) {
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

    const addSession = async ({ date, type_seance, heure_debut, heure_fin, duree_effectuee }) => {
    try {
      const res = await fetch(`${API}/api/sessions`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ group_id: groupId, date, statut: 'effectuee', type_seance, heure_debut, heure_fin, duree_effectuee }),
      });
      const data = await res.json();
      setSessions(s => [...s, data].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setPendingSessionId(data.id);
      setPendingAttendance({});
      setAddingSession(false);
    } catch (err) { console.error(err); }
  };

  const updateSessionField = async (sessionId, field, value) => {
    try {
      const res = await fetch(`${API}/api/sessions/${sessionId}`, {
        method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      setSessions(prev => prev.map(x => x.id === sessionId ? { ...x, [field]: value } : x)
        .sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (err) {
      console.error(err);
      alert("La modification n'a pas pu être enregistrée. Réessayez.");
    }
  };

  const updateDureeEffectuee = async (sessionId, value) => {
    try {
      const res = await fetch(`${API}/api/sessions/${sessionId}`, {
        method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ duree_effectuee: value === '' ? null : Number(value) }),
      });
      if (!res.ok) throw new Error();
      setSessions(prev => prev.map(x => x.id === sessionId ? { ...x, duree_effectuee: value === '' ? null : Number(value) } : x));
    } catch (err) {
      console.error(err);
      alert("La durée n'a pas pu être enregistrée. Réessayez.");
    }
  };

  // ── Delete session ───────────────────────────────────────
  const deleteSession = async (sessionId) => {
    if (!confirm('Supprimer cette séance ?')) return;
    await fetch(`${API}/api/sessions/${sessionId}`, { method: 'DELETE', headers: getHeaders() });
    setSessions(s => s.filter(x => x.id !== sessionId));
    if (pendingSessionId === sessionId) { setPendingSessionId(null); setPendingAttendance({}); }
  };

  // ── Immediate single-cell save (non-pending, editable session) ──
  const saveStatutNow = async (session_id, etudiant_id, next) => {
    const key = `${session_id}|${etudiant_id}`;
    const prev = attendance[key];
    try {
      if (!next && prev?.id) {
        await fetch(`${API}/api/attendance/${prev.id}`, { method: 'DELETE', headers: getHeaders() });
        setAttendance(a => { const n = { ...a }; delete n[key]; return n; });
      } else if (prev?.id) {
        const res = await fetch(`${API}/api/attendance/${prev.id}`, {
          method: 'PUT', headers: getHeaders(), body: JSON.stringify({ statut: next }),
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

  const updateCell = (session, etudiant_id, next) => {
    setEditingCell(null);
    if (pendingSessionId === session.id) {
      setPendingAttendance(prev => ({ ...prev, [etudiant_id]: next }));
    } else {
      saveStatutNow(session.id, etudiant_id, next);
    }
  };

  // ── Terminer: batch-save pending session ─────────────────
  const handleTerminer = async () => {
    if (!pendingSessionId) return;
    const entries = etudiants.map(e => ({ etudiant_id: e.id, statut: pendingAttendance[e.id] ?? null }));
    try {
      await fetch(`${API}/api/attendance/batch`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ session_id: pendingSessionId, entries }),
      });
      await refetchAttendance();
      setSessions(prev => prev.map(s => s.id === pendingSessionId ? { ...s, finalized_at: new Date().toISOString() } : s));
      setPendingSessionId(null);
      setPendingAttendance({});
    } catch (err) { console.error(err); }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const firstDate = sessions.length > 0 ? formatDate(sessions[0].date) : '—';
  const lastDate  = sessions.length > 0 ? formatDate(sessions[sessions.length - 1].date) : '—';

  const isSessionEditable = (session) => {
    if (readOnly) return false;
    if (isAdmin) return true;
    if (pendingSessionId === session.id) return true;
    if (!session.finalized_at) return false;
    const hoursSince = (Date.now() - new Date(session.finalized_at).getTime()) / 3600000;
    return hoursSince < 24;
  };

  const isPointageLocked = (etudiant) => {
    if (etudiant.statut_scolarite !== 'abandonne') return false;
    if (!etudiant.abandonne_at) return true;
    const hoursSince = (Date.now() - new Date(etudiant.abandonne_at).getTime()) / 3600000;
    return hoursSince >= 24;
  };

  const getCellStatut = (session, etudiant_id) => {
    if (pendingSessionId === session.id) return pendingAttendance[etudiant_id] ?? null;
    return attendance[`${session.id}|${etudiant_id}`]?.statut ?? null;
  };

  const getNbPresents = (session) => {
    if (pendingSessionId === session.id) {
      return Object.values(pendingAttendance).filter(v => v === 'present' || v === 'retard').length;
    }
    return Object.entries(attendance).filter(([k, v]) => k.startsWith(`${session.id}|`) && (v.statut === 'present' || v.statut === 'retard')).length;
  };

   const totalLoggedHours = sessions.reduce((sum, s) => sum + (Number(s.duree_effectuee) || 0), 0);
  const progressLabel = isHourBased
    ? `${totalLoggedHours.toFixed(1)}h / ${durationTotal ?? '—'}h`
    : `${sessions.length} / ${durationTotal ?? '—'} séances`;

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
          #pointage-print-area { position: absolute; top: 0; left: 0; width: 100%; }
        }
        .pointage-scroll { scrollbar-width: thin; scrollbar-color: #CBD5E1 transparent; }
        .pointage-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
        .pointage-scroll::-webkit-scrollbar-track { background: transparent; }
        .pointage-scroll::-webkit-scrollbar-thumb { background-color: #CBD5E1; border-radius: 9999px; }
        .pointage-scroll::-webkit-scrollbar-thumb:hover { background-color: #94A3B8; }
      `}</style>
      <div className="space-y-4">
        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between print:hidden">
          <p className="text-sm text-slate-400">{sessions.length} séance(s) · <span className="font-medium text-slate-600">{progressLabel}</span></p>
          {!readOnly && (
            pendingSessionId ? (
              <div className="flex gap-2">
                <button onClick={() => deleteSession(pendingSessionId)}
                  className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-[#F1F5F9] font-medium">
                  Annuler
                </button>
                <button onClick={handleTerminer}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all font-medium">
                  <Check size={14} /> Terminer
                </button>
              </div>
            ) : (
              <button onClick={() => setAddingSession(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all font-medium">
                <Plus size={14} /> Ajouter séance
              </button>
            )
          )}
        </div>

        {!readOnly && addingSession && (
          <AddSessionModal
            onClose={() => setAddingSession(false)}
            onConfirm={addSession}
            joursFormation={ficheInfo.jours_formation}
            lastSessionDate={sessions.length ? sessions[sessions.length - 1].date : null}
            isHourBased={isHourBased}
          />
        )}

        <div id="pointage-print-area">
          {/* ── Fiche info header ── */}
          <div className="bg-white border border-[#F1F5F9] rounded-md px-4 py-3 text-xs text-slate-800 space-y-2">
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
              <span><strong>Enseignant :</strong>{' '}{group?.teacher?.user ? `${group.teacher.user.nom} ${group.teacher.user.prenom}` : '—'}</span>
              <label className="flex items-center gap-1.5">
                <strong>Jour(s) :</strong>
                {readOnly ? (
                  <span className="px-1">{ficheInfo.jours_formation || '—'}</span>
                ) : (
                  <input type="text" value={ficheInfo.jours_formation}
                    onChange={e => setFicheInfo(f => ({ ...f, jours_formation: e.target.value }))} onBlur={saveInfo}
                    placeholder="ex: Lundi, Mercredi" className="border-b border-slate-300 bg-transparent focus:outline-none focus:border-[#0369A1] px-1 w-36" />
                )}
              </label>
              <label className="flex items-center gap-1.5">
                <strong>Heure :</strong>
                {readOnly ? (
                  <span className="px-1">{ficheInfo.heure_formation || '—'}</span>
                ) : (
                  <input type="text" value={ficheInfo.heure_formation}
                    onChange={e => setFicheInfo(f => ({ ...f, heure_formation: e.target.value }))} onBlur={saveInfo}
                    placeholder="ex: 09:00 - 11:00" className="border-b border-slate-300 bg-transparent focus:outline-none focus:border-[#0369A1] px-1 w-28" />
                )}
              </label>
              {!readOnly && savingInfo && <span className="text-slate-300 italic">Sauvegarde…</span>}
            </div>
          </div>

          {sessions.length === 0 ? (
            <p className="text-sm text-slate-300 py-8 text-center">Aucune séance enregistrée.</p>
          ) : (
            <div className="overflow-auto pointage-scroll rounded-md border border-[#F1F5F9] print:overflow-visible print:border-0 mt-4 max-h-[65vh]">
              <table className="text-xs border-collapse bg-white" style={{ minWidth: `${140 + sessions.length * 80}px` }}>
                <tbody>

                  <tr className="bg-[#DCEBFA]">
                    <td className="border border-[#F1F5F9] px-3 py-2 font-bold text-[#0369A1] sticky left-0 bg-[#DCEBFA] z-10 min-w-[160px]">Séance №</td>
                    {sessions.map((s, i) => (
                      <td key={s.id} className="border border-[#F1F5F9] px-2 py-2 text-center font-bold text-[#0369A1] min-w-[80px]">{i + 1}</td>
                    ))}
                  </tr>

                  <tr>
                    <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-white z-10">Date de la Séance</td>
                    {sessions.map(s => (
                      <td key={s.id} className="border border-[#F1F5F9] px-1 py-1 text-center text-slate-800">
                        {isSessionEditable(s) ? (
                          <input type="date" defaultValue={s.date?.slice(0, 10)} onBlur={e => e.target.value && updateSessionField(s.id, 'date', e.target.value)}
                            className="w-full text-center text-xs border-b border-transparent hover:border-slate-300 focus:border-[#0369A1] bg-transparent focus:outline-none px-1 py-1" />
                        ) : formatDate(s.date)}
                      </td>
                    ))}
                  </tr>

                  <tr className="bg-[#F8FCFF]">
                    <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-[#F8FCFF] z-10">Type</td>
                    {sessions.map(s => (
                      <td key={s.id} className="border border-[#F1F5F9] px-2 py-2 text-center">
                        {isSessionEditable(s) ? (
                          <select value={s.type_seance} onChange={e => updateSessionField(s.id, 'type_seance', e.target.value)}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 ${s.type_seance === 'remplacement' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            <option value="normale">Normale</option>
                            <option value="remplacement">Remplacement</option>
                          </select>
                        ) : (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.type_seance === 'remplacement' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {s.type_seance === 'remplacement' ? 'Remplacement' : 'Normale'}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                                  <tr className="bg-[#F8FCFF]">
                    <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-[#F8FCFF] z-10">Horaire</td>
                    {sessions.map(s => (
                      <td key={s.id} className="border border-[#F1F5F9] px-2 py-2 text-center text-xs">
                        {s.heure_debut ? (s.heure_fin ? `${s.heure_debut} - ${s.heure_fin}` : s.heure_debut) : '—'}
                      </td>
                    ))}
                  </tr>

                  {isHourBased && (
                    <tr className="bg-[#F8FCFF]">
                      <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-[#F8FCFF] z-10">Durée de la Séance (h)</td>
                      {sessions.map(s => {
                        const editable = isSessionEditable(s);
                        return (
                          <td key={s.id} className="border border-[#F1F5F9] px-1 py-1 text-center">
                            {editable ? (
                              <input
                                type="number" step="0.25" min="0"
                                defaultValue={s.duree_effectuee ?? ''}
                                onBlur={e => updateDureeEffectuee(s.id, e.target.value)}
                                placeholder="—"
                                className="w-full text-center text-xs border-b border-transparent hover:border-slate-300 focus:border-[#0369A1] bg-transparent focus:outline-none px-1 py-1"
                              />
                            ) : (
                              <span className="text-xs">{s.duree_effectuee ?? '—'}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )}

                  <tr>
                    <td className="border border-[#F1F5F9] px-3 py-2 text-slate-400 sticky left-0 bg-white z-10">Nombre des stagiaires</td>
                    {sessions.map(s => {
                      const nb = getNbPresents(s);
                      return (
                        <td key={s.id} className="border border-[#F1F5F9] px-2 py-2 text-center font-bold text-slate-800">{nb > 0 ? nb : ''}</td>
                      );
                    })}
                  </tr>

                  <tr>
                    <td colSpan={sessions.length + 1} className="bg-[#DCEBFA] border border-[#F1F5F9] px-3 py-1.5 font-semibold text-[#0369A1]">Présences</td>
                  </tr>

                  {etudiants.map((e, idx) => (
                    <tr key={e.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#F8FCFF]'}>
                      <td className="border border-[#F1F5F9] px-3 py-2 text-slate-800 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                        <span className="text-slate-300 mr-1">{idx + 1})</span>{e.nom} {e.prenom}
                      </td>
                      {sessions.map(s => {
                        const key = `${s.id}|${e.id}`;
                        const statut = getCellStatut(s, e.id);
                        const isEditing = editingCell === key;
                        const editable = isSessionEditable(s) && !isPointageLocked(e);
                        return (
                          <td key={s.id} className="border border-[#F1F5F9] p-0 text-center relative">
                            {!editable ? (
                              <div className={`w-full py-2 px-1 text-xs font-bold ${statut ? STATUT_STYLE[statut] : 'text-slate-300'}`}>
                                {statut ? STATUT_LABEL[statut] : '—'}
                              </div>
                            ) : (
                              <button
                                onClick={(ev) => { ev.stopPropagation(); setEditingCell(isEditing ? null : key); }}
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

                  {!readOnly && (
                    <tr className="bg-red-50/40 print:hidden">
                      <td className="border border-[#F1F5F9] px-3 py-1.5 text-slate-300 sticky left-0 bg-red-50/40 z-10 text-[10px]">Supprimer</td>
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

        {editingCell && (() => {
          const [sessionId, etudiantId] = editingCell.split('|');
          const session = sessions.find(s => String(s.id) === sessionId);
          const etu = etudiants.find(x => String(x.id) === etudiantId);
          const OPTS = [
            { val: 'present', label: 'Présent', Icon: UserCheck, style: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
            { val: 'absent',  label: 'Absent',  Icon: UserX,     style: 'bg-red-50 text-red-600 hover:bg-red-100' },
            { val: 'retard',  label: 'Retard',  Icon: Clock,     style: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
          ];
          const pick = (val) => { if (session && etu) updateCell(session, etu.id, val); setEditingCell(null); };
          return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditingCell(null)}>
              <div ref={dropdownRef} onClick={ev => ev.stopPropagation()} className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4">
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

export default PointageTab;