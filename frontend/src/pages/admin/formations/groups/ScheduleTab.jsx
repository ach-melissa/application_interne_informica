import { useState, useEffect, useRef } from 'react';
import { Check, X, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const PERIODES = ['matin', 'midi'];
const PERIODE_LABEL = { matin: 'Matin', midi: 'A Midi' };

const makeKey = (jour, salle, periode) => `${jour}|${salle}|${periode}`;

const ScheduleTab = ({ groupId, readOnly = true, groupName, formationNom, niveauNom }) => {
  const [cells, setCells] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [salles, setSalles] = useState([]);
  const [jours, setJours] = useState([]);

  const [editingKey, setEditingKey] = useState(null);
  const [editValues, setEditValues] = useState({ contenu: '', heure_debut: '', heure_fin: '' });
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, sallesRes, joursRes] = await Promise.all([
        fetch(`${API}/api/schedules/group/${groupId}`, { headers: getHeaders() }),
        fetch(`${API}/api/schedules/salles`, { headers: getHeaders() }),
        fetch(`${API}/api/schedules/jours`, { headers: getHeaders() }),
      ]);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de chargement');
      if (sallesRes.ok) setSalles((await sallesRes.json()).map((s) => s.nom));
      if (joursRes.ok) setJours(await joursRes.json());

      const map = {};
      data.forEach((row) => {
        const k = makeKey(row.jour_semaine, row.salle, row.periode);
        map[k] = { id: row.id, contenu: row.contenu ?? '', heure_debut: row.heure_debut ?? '', heure_fin: row.heure_fin ?? '' };
      });
      setCells(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchedule(); }, [groupId]);

  useEffect(() => {
    if (editingKey && inputRef.current) inputRef.current.focus();
  }, [editingKey]);

  const startEdit = (jour, salle, periode) => {
    const k = makeKey(jour, salle, periode);
    const existing = cells[k] ?? { contenu: '', heure_debut: '', heure_fin: '' };
    setEditingKey(k);
    setEditValues({ ...existing });
  };

  const cancelEdit = () => { setEditingKey(null); };

 const saveEdit = async (jour, salle, periode) => {
  if (editValues.heure_debut && (editValues.heure_debut < '08:00' || editValues.heure_debut > '16:00')) {
    setError('L\'heure de début doit être entre 08:00 et 16:00.');
    return;
  }
  if (editValues.heure_fin && (editValues.heure_fin < '08:00' || editValues.heure_fin > '16:00')) {
    setError('L\'heure de fin doit être entre 08:00 et 16:00.');
    return;
  }
  const k = makeKey(jour, salle, periode);
  setSaving(true);
    try {
      const existing = cells[k];
      const payload = {
        group_id: groupId,
        jour_semaine: jour,
        salle,
        periode,
        contenu: editValues.contenu,
        heure_debut: editValues.heure_debut || null,
        heure_fin: editValues.heure_fin || null,
      };

      let res;
      if (existing?.id) {
        res = await fetch(`${API}/api/schedules/${existing.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API}/api/schedules`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur sauvegarde');

      setCells((prev) => ({
        ...prev,
        [k]: { id: data.id, contenu: data.contenu ?? '', heure_debut: data.heure_debut ?? '', heure_fin: data.heure_fin ?? '' },
      }));
      setEditingKey(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const clearCell = async (jour, salle, periode) => {
    const k = makeKey(jour, salle, periode);
    const existing = cells[k];
    if (!existing?.id) { setEditingKey(null); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/schedules/${existing.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Erreur suppression');
      setCells((prev) => { const next = { ...prev }; delete next[k]; return next; });
      setEditingKey(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

 const renderCellBody = (cell) => {
    if (!cell?.contenu && !cell?.heure_debut && !cell?.heure_fin) return null;
    const groupeLabel = [groupName, niveauNom, formationNom].filter(Boolean).join(' · ');
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left">
        {(cell.heure_debut || cell.heure_fin) && (
          <div className="text-[10px] font-medium text-slate-700 opacity-80 mb-1">
            {cell.heure_debut?.slice(0, 5)}{cell.heure_fin ? ` → ${cell.heure_fin.slice(0, 5)}` : ''}
          </div>
        )}
        {cell.contenu && (
          <div className="text-[11px] font-semibold leading-tight text-slate-700">{cell.contenu}</div>
        )}
        {groupeLabel && (
          <div className="text-[10px] mt-0.5 font-medium text-slate-700 opacity-90">{groupeLabel}</div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  // ← add here, right after the loading block, before "return ("
console.log('salles:', salles, 'jours:', jours, 'cells:', cells, 'groupId:', groupId);


  return (
    <div className="space-y-3">
      {error && (
        <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-xs border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-slate-700 px-3 py-2.5 bg-slate-900 font-medium w-24 min-w-[6rem]" rowSpan={2} />
              {jours.map((jour) => (
                <th key={jour} colSpan={2}
                  className="border border-slate-700 px-3 py-2.5 bg-slate-900 text-center text-white font-semibold whitespace-nowrap capitalize uppercase text-[11px]">
                  {jour}
                </th>
              ))}
            </tr>
            <tr>
              {jours.map((jour) =>
                PERIODES.map((p) => (
                  <th key={`${jour}-${p}`}
                    className="border border-slate-200 px-2 py-2 bg-white text-center text-slate-500 font-semibold uppercase text-[10px] whitespace-nowrap">
                    {PERIODE_LABEL[p]}
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {salles.map((salle) => (
              <tr key={salle}>
                <td className="border border-slate-700 px-3 py-3 font-semibold text-white whitespace-nowrap bg-slate-900">
                  {salle}
                </td>

                {jours.map((jour) =>
                  PERIODES.map((periode) => {
                    const k = makeKey(jour, salle, periode);
                    const cell = cells[k];
                    const isEditing = editingKey === k;

                    return (
                      <td key={k} className="border border-slate-200 p-0 align-top min-w-[7rem] w-[7rem]">
                        {isEditing ? (
                          <div className="p-1.5 space-y-1 bg-white">
                            <input
                              ref={inputRef}
                              type="text"
                              value={editValues.contenu}
                              onChange={(e) => setEditValues((v) => ({ ...v, contenu: e.target.value }))}
                              placeholder="Contenu..."
                              className="w-full border border-slate-400 rounded-md px-1.5 py-1 text-xs bg-white outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(jour, salle, periode);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <div className="flex gap-1">
<input
  type="time"
  min="08:00" max="16:00"
  value={editValues.heure_debut}
  onChange={(e) => setEditValues((v) => ({ ...v, heure_debut: e.target.value }))}
  className="flex-1 border border-slate-200 rounded-md px-1 py-0.5 text-[10px] bg-white outline-none"
/>
<span className="text-slate-400 self-center">→</span>
<input
  type="time"
  min="08:00" max="16:00"
  value={editValues.heure_fin}
  onChange={(e) => setEditValues((v) => ({ ...v, heure_fin: e.target.value }))}
  className="flex-1 border border-slate-200 rounded-md px-1 py-0.5 text-[10px] bg-white outline-none"
/>
                            </div>
                            <div className="flex justify-between items-center pt-0.5">
                              <button onClick={() => clearCell(jour, salle, periode)} className="text-[10px] text-red-400 hover:text-red-600 transition">
                                Effacer
                              </button>
                              <div className="flex gap-1">
                                <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-700 transition">
                                  <X size={13} />
                                </button>
                                <button
                                  onClick={() => saveEdit(jour, salle, periode)}
                                  disabled={saving}
                                  className="text-slate-900 hover:text-slate-600 transition disabled:opacity-40"
                                >
                                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : readOnly ? (
                          <div className="w-full h-full min-h-[3.5rem] text-left px-2 py-1.5">
                            {renderCellBody(cell)}
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(jour, salle, periode)}
                            className="w-full h-full min-h-[3.5rem] text-left px-2 py-1.5 hover:bg-slate-50 transition group"
                          >
                            {(cell?.contenu || cell?.heure_debut || cell?.heure_fin) ? (
                              renderCellBody(cell)
                            ) : (
                              <span className="text-slate-200 group-hover:text-slate-400 transition text-lg leading-none">+</span>
                            )}
                          </button>
                        )}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduleTab;