import { useState, useEffect, useRef } from 'react';
import { Check, X, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const SALLES = ['Salle 01', 'Salle 02', 'Salle 03', 'Salle 04', 'Salle 05'];
const JOURS  = ['samedi', 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi'];
const PERIODES = ['matin', 'midi'];
const PERIODE_LABEL = { matin: 'Matin', midi: 'A Midi' };

// key = "JOUR|SALLE|PERIODE"
const makeKey = (jour, salle, periode) => `${jour}|${salle}|${periode}`;

const ScheduleTab = ({ groupId, readOnly = false }) => {
  // Map of key → { id, contenu, heure_debut, heure_fin }
  const [cells, setCells] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Editing state
  const [editingKey, setEditingKey] = useState(null);
  const [editValues, setEditValues] = useState({ contenu: '', heure_debut: '', heure_fin: '' });
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchSchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/schedules/group/${groupId}`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de chargement');
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

  // ── Start editing ────────────────────────────────────────────────────────
  const startEdit = (jour, salle, periode) => {
    const k = makeKey(jour, salle, periode);
    const existing = cells[k] ?? { contenu: '', heure_debut: '', heure_fin: '' };
    setEditingKey(k);
    setEditValues({ ...existing });
  };

  const cancelEdit = () => { setEditingKey(null); };

  // ── Save (create or update) ──────────────────────────────────────────────
  const saveEdit = async (jour, salle, periode) => {
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

  // ── Delete cell content ──────────────────────────────────────────────────
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

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            {/* Row 1: empty + jour headers (each spanning 2 periodes) */}
            <tr className="bg-[#F8FAFC]">
              <th className="border border-[#E2E8F0] px-3 py-2.5 text-[#64748B] font-medium w-24 min-w-[6rem]" rowSpan={2} />
              {JOURS.map((jour) => (
                <th
                  key={jour}
                  colSpan={2}
                  className="border border-[#E2E8F0] px-3 py-2.5 text-center text-[#1E293B] font-semibold whitespace-nowrap"
                >
                  {jour}
                </th>
              ))}
            </tr>
            {/* Row 2: Matin / A Midi per jour */}
            <tr className="bg-[#F8FAFC]">
              {JOURS.map((jour) =>
                PERIODES.map((p) => (
                  <th
                    key={`${jour}-${p}`}
                    className="border border-[#E2E8F0] px-2 py-1.5 text-center text-[#94A3B8] font-normal whitespace-nowrap"
                  >
                    {PERIODE_LABEL[p]}
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {SALLES.map((salle, si) => (
              <tr key={salle} className={si % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}>
                {/* Salle label */}
                <td className="border border-[#E2E8F0] px-3 py-2 font-medium text-[#1E293B] whitespace-nowrap bg-[#F8FAFC]">
                  {salle}
                </td>

                {JOURS.map((jour) =>
                  PERIODES.map((periode) => {
                    const k = makeKey(jour, salle, periode);
                    const cell = cells[k];
                    const isEditing = editingKey === k;

                    return (
                      <td
                        key={k}
                        className="border border-[#E2E8F0] p-0 align-top min-w-[7rem] w-[7rem]"
                      >
                        {isEditing ? (
                          /* ── Edit mode ── */
                          <div className="p-1.5 space-y-1 bg-[#fffef9]">
                            <input
                              ref={inputRef}
                              type="text"
                              value={editValues.contenu}
                              onChange={(e) => setEditValues((v) => ({ ...v, contenu: e.target.value }))}
                              placeholder="Contenu..."
                              className="w-full border border-[#b8995a] rounded-md px-1.5 py-1 text-xs bg-white outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(jour, salle, periode);
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <div className="flex gap-1">
                              <input
                                type="time"
                                value={editValues.heure_debut}
                                onChange={(e) => setEditValues((v) => ({ ...v, heure_debut: e.target.value }))}
                                className="flex-1 border border-[#E2E8F0] rounded-md px-1 py-0.5 text-[10px] bg-white outline-none"
                              />
                              <span className="text-[#94A3B8] self-center">→</span>
                              <input
                                type="time"
                                value={editValues.heure_fin}
                                onChange={(e) => setEditValues((v) => ({ ...v, heure_fin: e.target.value }))}
                                className="flex-1 border border-[#E2E8F0] rounded-md px-1 py-0.5 text-[10px] bg-white outline-none"
                              />
                            </div>
                            <div className="flex justify-between items-center pt-0.5">
                              <button
                                onClick={() => clearCell(jour, salle, periode)}
                                className="text-[10px] text-red-400 hover:text-red-600 transition"
                              >
                                Effacer
                              </button>
                              <div className="flex gap-1">
                                <button onClick={cancelEdit} className="text-[#94A3B8] hover:text-[#1E293B] transition">
                                  <X size={13} />
                                </button>
                                <button
                                  onClick={() => saveEdit(jour, salle, periode)}
                                  disabled={saving}
                                  className="text-[#b8995a] hover:text-[#a0854d] transition disabled:opacity-40"
                                >
                                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : readOnly ? (
                          /* ── Read-only display (no click handler) ── */
                          <div className="w-full h-full min-h-[3.5rem] text-left px-2 py-1.5">
                            {cell?.contenu ? (
                              <div className="space-y-0.5">
                                {(cell.heure_debut || cell.heure_fin) && (
                                  <p className="text-[10px] text-[#b8995a] font-medium">
                                    {cell.heure_debut?.slice(0, 5)}{cell.heure_fin ? ` → ${cell.heure_fin.slice(0, 5)}` : ''}
                                  </p>
                                )}
                                <p className="text-xs text-[#1E293B] leading-snug">{cell.contenu}</p>
                              </div>
                            ) : (
                              <span className="text-[#E2E8F0] text-lg leading-none">—</span>
                            )}
                          </div>
                        ) : (
                          /* ── Display mode ── */
                          <button
                            onClick={() => startEdit(jour, salle, periode)}
                            className="w-full h-full min-h-[3.5rem] text-left px-2 py-1.5 hover:bg-[#fdf9f2] transition group"
                          >
                            {cell?.contenu ? (
                              <div className="space-y-0.5">
                                {(cell.heure_debut || cell.heure_fin) && (
                                  <p className="text-[10px] text-[#b8995a] font-medium">
                                    {cell.heure_debut?.slice(0, 5)}{cell.heure_fin ? ` → ${cell.heure_fin.slice(0, 5)}` : ''}
                                  </p>
                                )}
                                <p className="text-xs text-[#1E293B] leading-snug">{cell.contenu}</p>
                              </div>
                            ) : (
                              <span className="text-[#E2E8F0] group-hover:text-[#CBD5E1] transition text-lg leading-none">+</span>
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