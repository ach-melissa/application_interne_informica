import { useState, useEffect, useMemo, Fragment } from 'react';
import { CalendarCheck2, Armchair, ArrowRight, X, Plus, Pencil, AlertTriangle, Trash2 } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';

const PERIODES = ['matin', 'midi'];

const CARD_STYLE = { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' };

const salleSort = (a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });

const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';
const labelCls = 'flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-1';

const EmploisEcole = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jours, setJours] = useState([]);
  const [confirmDeleteSalle, setConfirmDeleteSalle] = useState(false);
const [deletingSalle, setDeletingSalle] = useState(false);
  const [salleObjects, setSalleObjects] = useState([]); // [{id, nom}]
  const [newSalleName, setNewSalleName] = useState('');
  const [addSalleError, setAddSalleError] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null); // {id, nom}
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState(null);
  const [showAddSalleModal, setShowAddSalleModal] = useState(false);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/schedules`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Erreur serveur');
        const [sallesRes, joursRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/schedules/salles`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${import.meta.env.VITE_API_URL}/api/schedules/jours`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (sallesRes.ok) setSalleObjects(await sallesRes.json());
                if (joursRes.ok) {
          const raw = await joursRes.json();
          const ORDRE_SEMAINE = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
          const sorted = [...raw].sort((a, b) => ORDRE_SEMAINE.indexOf(a) - ORDRE_SEMAINE.indexOf(b));
          setJours(sorted.map((key) => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1) })));
        }
        setSchedules(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  const salles = useMemo(
    () => [...salleObjects].sort((a, b) => salleSort(a.nom, b.nom)),
    [salleObjects]
  );
  const salleDejaExistante = newSalleName.trim() && salleObjects.some(
    (s) => s.nom.trim().toLowerCase() === newSalleName.trim().toLowerCase()
  );

  const handleAddSalle = async (e) => {
    e.preventDefault();
    const nom = newSalleName.trim();
    if (!nom) return;
    setAddSalleError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/schedules/salles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setSalleObjects((prev) => [...prev, data]);
      setNewSalleName('');
      setShowAddSalleModal(false);
    } catch (err) {
      setAddSalleError(err.message);
    }
  };

  const openRenameModal = (salleObj) => {
    setRenameError(null);
    setRenameTarget(salleObj);
    setRenameValue(salleObj.nom);
  };

const closeRenameModal = () => {
  setRenameTarget(null);
  setConfirmDeleteSalle(false);
};

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    const nouveauNom = renameValue.trim();
    if (!nouveauNom || nouveauNom === renameTarget?.nom) return setRenameTarget(null);
    setRenameError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/schedules/salle/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: renameTarget.id, newName: nouveauNom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setSalleObjects((prev) => prev.map((s) => (s.id === renameTarget.id ? { ...s, nom: nouveauNom } : s)));
      setRenameTarget(null);
    } catch (err) {
      setRenameError(err.message);
    }
  };
const handleDeleteSalle = async () => {
  if (!renameTarget) return;
  setDeletingSalle(true);
  setRenameError(null);
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/schedules/salle/${renameTarget.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Suppression échouée');
    setSalleObjects((prev) => prev.filter((s) => s.id !== renameTarget.id));
    closeRenameModal();
  } catch (err) {
    setRenameError(err.message);
    setConfirmDeleteSalle(false);
  } finally {
    setDeletingSalle(false);
  }
};
  const getCells = (salle, jour, periode) =>
    schedules.filter((s) => s.salle === salle && s.jour_semaine === jour && s.periode === periode);

  const getGroupeLabel = (cell) => {
    const groupe = cell.groups?.nom ?? cell.groupe?.nom ?? cell.groupe_nom ?? '';
    const formation = cell.groups?.formations?.nom ?? cell.groups?.formation?.nom ?? '';
    return formation ? `${groupe} · ${formation}` : groupe;
  };

  const getProfLabel = (cell) => {
    const u = cell.users ?? cell.prof ?? null;
    if (!u) return cell.prof_nom ?? '';
    return [u.prenom, u.nom].filter(Boolean).join(' ');
  };

  const renderCard = (cell, timeLabel) => {
    const prof = getProfLabel(cell);
    const groupe = getGroupeLabel(cell);
    return (
      <div className={`rounded-xl border ${CARD_STYLE.border} ${CARD_STYLE.bg} px-2.5 py-2 text-left`}>
        <div className={`text-[10px] font-medium opacity-80 ${CARD_STYLE.text} mb-1`}>{timeLabel}</div>
        <div className={`text-[11px] font-semibold leading-tight ${CARD_STYLE.text}`}>{cell.contenu}</div>
        {groupe && <div className={`text-[10px] mt-0.5 font-medium ${CARD_STYLE.text} opacity-90`}>{groupe}</div>}
        {prof && <div className={`text-[10px] opacity-70 ${CARD_STYLE.text}`}>{prof}</div>}
      </div>
    );
  };

  const renderMerged = (matin, midi) => {
    const groupe = getGroupeLabel(matin);
    const prof = getProfLabel(matin);
    return (
      <div className={`rounded-xl border ${CARD_STYLE.border} ${CARD_STYLE.bg} px-2.5 py-2.5 text-center`}>
        <div className={`flex items-center justify-center gap-1 ${CARD_STYLE.text} opacity-60 mb-1`}>
          <div className="h-px flex-1 bg-current" />
          <ArrowRight size={12} />
        </div>
        <div className={`text-[11px] font-semibold ${CARD_STYLE.text}`}>{matin.contenu}</div>
        {groupe && <div className={`text-[10px] font-medium ${CARD_STYLE.text} opacity-90`}>{groupe}</div>}
        {prof && <div className={`text-[10px] opacity-70 ${CARD_STYLE.text}`}>{prof}</div>}
        <div className={`text-[10px] mt-0.5 opacity-70 ${CARD_STYLE.text}`}>
          {matin.heure_debut?.slice(0, 5)} - {midi.heure_fin?.slice(0, 5)}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
          <CalendarCheck2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">Emplois de l'école</h1>
          <p className="text-slate-400 text-xs mt-0.5">Vue globale de toutes les salles</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-800 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <button
            type="button"
            onClick={() => { setAddSalleError(null); setNewSalleName(''); setShowAddSalleModal(true); }}
            className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium
              shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all mb-3"
          >
            <Plus size={14} /> Ajouter une salle
          </button>

          <div className="overflow-x-auto rounded-2xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] bg-white">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="border border-slate-100 px-3 py-3 bg-slate-900 text-white font-semibold sticky left-0 z-20" rowSpan={2}>
                    Salle
                  </th>
                  {jours.map((jour) => (
                    <th
                      key={jour.key}
                      colSpan={2}
                      className="border border-slate-100 px-3 py-2 bg-slate-900 text-white font-semibold uppercase tracking-wide text-[11px]"
                    >
                      {jour.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {jours.map((jour) =>
                    PERIODES.map((p) => (
                      <th
                        key={`${jour.key}-${p}`}
                        className="border border-slate-100 px-2 py-2 bg-white text-slate-500 font-semibold uppercase text-[10px]"
                      >
                        {p === 'matin' ? 'Matin' : 'A Midi'}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                {salles.length === 0 && (
                  <tr>
                    <td colSpan={1 + jours.length * 2} className="text-center text-slate-400 py-10">
                      Aucune salle programmée pour le moment.
                    </td>
                  </tr>
                )}
                {salleObjects.slice().sort((a, b) => salleSort(a.nom, b.nom)).map(({ id, nom: salle }) => (
                  <tr key={salle}>
                    <td className="border border-slate-100 px-3 py-3 bg-slate-900 text-white whitespace-nowrap sticky left-0 z-10">
                      <div className="flex flex-col items-center gap-1">
                        <Armchair size={16} />
                        <button
                          type="button"
                          onClick={() => openRenameModal({ id, nom: salle })}
                          className="text-[11px] font-semibold hover:underline decoration-dotted"
                          title="Renommer la salle"
                        >
                          {salle}
                        </button>
                      </div>
                    </td>
                    {jours.map((jour) => {
                      const matinList = getCells(salle, jour.key, 'matin');
                      const midiList = getCells(salle, jour.key, 'midi');
                      const merged =
                        matinList.length === 1 &&
                        midiList.length === 1 &&
                        matinList[0].contenu === midiList[0].contenu &&
                        matinList[0].prof_id === midiList[0].prof_id;

                      if (merged) {
                        return (
                          <td key={jour.key} colSpan={2} className="border border-slate-100 p-1.5 min-w-[320px]">
                            {renderMerged(matinList[0], midiList[0])}
                          </td>
                        );
                      }

                      return (
                        <Fragment key={jour.key}>
                          <td className="border border-slate-100 p-1.5 min-w-[200px] align-top">
                            {matinList.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {matinList.map((cell) => (
                                  <Fragment key={cell.id}>
                                    {renderCard(cell, `${cell.heure_debut?.slice(0, 5)} - ${cell.heure_fin?.slice(0, 5)}`)}
                                  </Fragment>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center text-slate-300">–</div>
                            )}
                          </td>
                          <td className="border border-slate-100 p-1.5 min-w-[150px] align-top">
                            {midiList.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {midiList.map((cell) => (
                                  <Fragment key={cell.id}>
                                    {renderCard(cell, `${cell.heure_debut?.slice(0, 5)} - ${cell.heure_fin?.slice(0, 5)}`)}
                                  </Fragment>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center text-slate-300">–</div>
                            )}
                          </td>
                        </Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Renommer la salle ── restyled to match your other modals ── */}
 {renameTarget && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeRenameModal}>
    <div onClick={(ev) => ev.stopPropagation()} className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
            <Pencil size={15} className="text-white" />
          </div>
          <h2 className="text-sm font-semibold text-slate-800">Modifier la salle</h2>
        </div>
        <button type="button" onClick={closeRenameModal} className="text-slate-300 hover:text-slate-600 flex-shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* ── Error / confirm zone, right under header, like EtudiantDetailModal ── */}
      {(renameError || confirmDeleteSalle) && (
        <div className="px-5 pb-3 pt-3 border-b border-[#F1F5F9] space-y-2">
          {renameError && (
            <p className="text-red-500 text-xs bg-red-50 rounded-md px-3 py-2 flex items-center gap-1.5">
              <AlertTriangle size={13} /> {renameError}
            </p>
          )}

          {confirmDeleteSalle && (
            <div className="bg-red-50 rounded-md p-3 space-y-2">
              <p className="text-xs text-red-600 flex items-center gap-1.5">
                <AlertTriangle size={13} /> Supprimer la salle « {renameTarget.nom} » ? Cette action est irréversible.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmDeleteSalle(false)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSalle}
                  disabled={deletingSalle}
                  className="text-xs px-3 py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-40"
                >
                  {deletingSalle ? '...' : 'Oui, supprimer'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!confirmDeleteSalle && (
        <div className="p-5">
          <form onSubmit={handleRenameSubmit} id="renameSalleForm">
            <p className={labelCls}>Nouveau nom</p>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className={inp}
              autoFocus
              required
            />
          </form>
        </div>
      )}

      {!confirmDeleteSalle && (
        <div className="flex justify-between gap-2 px-5 py-4 border-t border-[#F1F5F9]">
          <button
            type="button"
            onClick={() => setConfirmDeleteSalle(true)}
            className="flex items-center gap-1.5 text-xs text-red-500 px-3 py-1.5 rounded-md hover:bg-red-50"
          >
            <Trash2 size={13} /> Supprimer
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={closeRenameModal} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100">
              Annuler
            </button>
            <button
              type="submit"
              form="renameSalleForm"
              className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium
                shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all"
            >
              Renommer
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)}
      {/* ── Ajouter une salle ── restyled to match your other modals ── */}
      {showAddSalleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddSalleModal(false)}>
          <form
            onSubmit={handleAddSalle}
            onClick={(ev) => ev.stopPropagation()}
            className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4"
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
                  <Armchair size={15} className="text-white" />
                </div>
                <h2 className="text-sm font-semibold text-slate-800">Ajouter une salle</h2>
              </div>
              <button type="button" onClick={() => setShowAddSalleModal(false)} className="text-slate-300 hover:text-slate-600 flex-shrink-0">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {addSalleError && (
                <p className="text-red-500 text-xs bg-red-50 rounded-md px-3 py-2 flex items-center gap-1.5">
                  <AlertTriangle size={13} /> {addSalleError}
                </p>
              )}
              <div>
                <p className={labelCls}>Nom de la salle</p>
                <input
                  type="text"
                  value={newSalleName}
                  onChange={(e) => setNewSalleName(e.target.value)}
                  placeholder="Ex: Salle 09"
                  className={inp}
                  autoFocus
                  required
                />
                {newSalleName.trim() && (
                  <p className={`text-[11px] mt-1.5 ${salleDejaExistante ? 'text-red-500' : 'text-emerald-600'}`}>
                    {salleDejaExistante ? '⚠ Cette salle existe déjà' : '✓ Nom disponible'}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#F1F5F9]">
              <button type="button" onClick={() => setShowAddSalleModal(false)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100">
                Annuler
              </button>
              <button
                type="submit"
                disabled={salleDejaExistante}
                className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium
                  shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] disabled:opacity-40 transition-all"
              >
                <Plus size={14} /> Ajouter
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
};

export default EmploisEcole;