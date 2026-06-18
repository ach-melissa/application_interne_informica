import { useState } from 'react';
import { Plus, Trash2, Check, X, Pencil } from 'lucide-react';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/**
 * Props:
 *  - group     : object  (has .id, .schedule = { Lundi: ['09:00 - 11:00'], ... })
 *  - onUpdate  : (groupId, newScheduleMap) => void
 */
const GroupSchedule = ({ group, onUpdate }) => {
  // localSchedule mirrors group.schedule but is kept locally while editing
  const [localSchedule, setLocalSchedule] = useState(() =>
    JSON.parse(JSON.stringify(group.schedule ?? {}))
  );
  const [editingSlot, setEditingSlot] = useState(null); // { jour, index }
  const [draftSlot, setDraftSlot] = useState({ debut: '', fin: '' });
  const [addingJour, setAddingJour] = useState(null); // jour string
  const [newSlot, setNewSlot] = useState({ debut: '', fin: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // ── helpers ──────────────────────────────────────────────
  const slotToDebutFin = (slot) => {
    const [debut, fin] = slot.split(' - ');
    return { debut: debut?.trim() ?? '', fin: fin?.trim() ?? '' };
  };

  const persist = async (updatedSchedule) => {
    setSaving(true);
    setSaveError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/profs/me/groups/${group.id}/schedule`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ schedule: updatedSchedule }),
        }
      );
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde');
      onUpdate(group.id, updatedSchedule);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── edit existing slot ────────────────────────────────────
  const startEditSlot = (jour, index) => {
    const { debut, fin } = slotToDebutFin(localSchedule[jour][index]);
    setEditingSlot({ jour, index });
    setDraftSlot({ debut, fin });
    setSaveError(null);
  };

  const cancelEditSlot = () => {
    setEditingSlot(null);
    setDraftSlot({ debut: '', fin: '' });
  };

  const saveSlot = async () => {
    const { jour, index } = editingSlot;
    const updated = { ...localSchedule };
    updated[jour] = [...(updated[jour] ?? [])];
    updated[jour][index] = `${draftSlot.debut} - ${draftSlot.fin}`;
    setLocalSchedule(updated);
    setEditingSlot(null);
    await persist(updated);
  };

  // ── delete slot ───────────────────────────────────────────
  const deleteSlot = async (jour, index) => {
    const updated = { ...localSchedule };
    updated[jour] = updated[jour].filter((_, i) => i !== index);
    if (updated[jour].length === 0) delete updated[jour];
    setLocalSchedule(updated);
    await persist(updated);
  };

  // ── add new slot ──────────────────────────────────────────
  const confirmAddSlot = async () => {
    if (!newSlot.debut || !newSlot.fin) return;
    const updated = { ...localSchedule };
    updated[addingJour] = [...(updated[addingJour] ?? []), `${newSlot.debut} - ${newSlot.fin}`];
    setLocalSchedule(updated);
    setAddingJour(null);
    setNewSlot({ debut: '', fin: '' });
    await persist(updated);
  };

  // ── render ────────────────────────────────────────────────
  return (
    <div>
      {saveError && (
        <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {saveError}
        </p>
      )}

      {saving && (
        <p className="mb-3 text-xs text-[#2563EB] flex items-center gap-1">
          <span className="w-3 h-3 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin inline-block" />
          Sauvegarde…
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {JOURS.map((jour) => {
          const slots = localSchedule[jour] ?? [];
          const isAddingHere = addingJour === jour;

          return (
            <div
              key={jour}
              className="bg-[#F8FAFC] rounded-xl p-3 min-h-[100px] border border-[#E2E8F0] flex flex-col gap-1"
            >
              <p className="text-xs font-semibold text-[#2563EB] mb-1">{jour}</p>

              {slots.map((slot, i) => {
                const isEditingThis =
                  editingSlot?.jour === jour && editingSlot?.index === i;

                if (isEditingThis) {
                  return (
                    <div key={i} className="flex flex-col gap-1">
                      <input
                        type="time"
                        value={draftSlot.debut}
                        onChange={(e) => setDraftSlot((d) => ({ ...d, debut: e.target.value }))}
                        className="border border-[#CBD5E1] rounded px-1 py-0.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                      <input
                        type="time"
                        value={draftSlot.fin}
                        onChange={(e) => setDraftSlot((d) => ({ ...d, fin: e.target.value }))}
                        className="border border-[#CBD5E1] rounded px-1 py-0.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={saveSlot}
                          className="flex-1 flex items-center justify-center gap-0.5 text-xs bg-[#2563EB] text-white rounded py-0.5 hover:bg-[#1D4ED8] transition"
                        >
                          <Check size={11} /> OK
                        </button>
                        <button
                          onClick={cancelEditSlot}
                          className="flex-1 flex items-center justify-center gap-0.5 text-xs border border-[#E2E8F0] text-[#64748B] rounded py-0.5 hover:bg-[#F1F5F9] transition"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className="group flex items-center justify-between bg-white border border-[#E2E8F0] rounded-lg px-2 py-1"
                  >
                    <span className="text-xs text-[#1E293B]">{slot}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => startEditSlot(jour, i)}
                        className="text-[#2563EB] hover:text-[#1D4ED8]"
                        title="Modifier"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => deleteSlot(jour, i)}
                        className="text-red-400 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add new slot */}
              {isAddingHere ? (
                <div className="flex flex-col gap-1 mt-1">
                  <input
                    type="time"
                    value={newSlot.debut}
                    onChange={(e) => setNewSlot((d) => ({ ...d, debut: e.target.value }))}
                    className="border border-[#CBD5E1] rounded px-1 py-0.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <input
                    type="time"
                    value={newSlot.fin}
                    onChange={(e) => setNewSlot((d) => ({ ...d, fin: e.target.value }))}
                    className="border border-[#CBD5E1] rounded px-1 py-0.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={confirmAddSlot}
                      className="flex-1 flex items-center justify-center gap-0.5 text-xs bg-[#2563EB] text-white rounded py-0.5 hover:bg-[#1D4ED8] transition"
                    >
                      <Check size={11} /> Ajouter
                    </button>
                    <button
                      onClick={() => { setAddingJour(null); setNewSlot({ debut: '', fin: '' }); }}
                      className="flex-1 flex items-center justify-center gap-0.5 text-xs border border-[#E2E8F0] text-[#64748B] rounded py-0.5 hover:bg-[#F1F5F9] transition"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingJour(jour); setEditingSlot(null); }}
                  className="mt-auto flex items-center justify-center gap-0.5 text-xs text-[#2563EB] hover:bg-[#EFF6FF] rounded py-1 transition"
                >
                  <Plus size={12} /> Ajouter
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupSchedule;