import { useState, useEffect, useMemo, Fragment } from 'react';
import { CalendarCheck2, Armchair, ArrowRight } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';

const PERIODES = ['matin', 'midi'];

const CARD_STYLE = { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' };

const salleSort = (a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });

const EmploisEcole = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jours, setJours] = useState([]);
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
        // Adapte cet endpoint pour qu'il renvoie TOUS les schedules de TOUS les groupes,
        // de TOUTES les formations (pas de filtre par formation_id ici) — avec les jointures
        // groups (+ formations imbriquée) et users, pour avoir groups.nom, groups.formations.nom
        // et users.nom en plus des colonnes brutes de `schedules`.
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
          setJours(raw.map((key) => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1) })));
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

  // Liste des salles déduite des données réelles + celles ajoutées manuellement : plus de limite à 8 salles fixes.
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

  const closeRenameModal = () => setRenameTarget(null);

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

  // Une salle/jour/période peut contenir PLUSIEURS séances (durées qui se chevauchent
  // ou se succèdent) : on renvoie donc une liste, pas une seule entrée.
  const getCells = (salle, jour, periode) =>
    schedules.filter((s) => s.salle === salle && s.jour_semaine === jour && s.periode === periode);

  // Nom du groupe (+ formation si dispo) — utile ici car la vue mélange TOUS les groupes de TOUTES les formations.
  const getGroupeLabel = (cell) => {
    const groupe = cell.groups?.nom ?? cell.groupe?.nom ?? cell.groupe_nom ?? '';
    const formation = cell.groups?.formations?.nom ?? cell.groups?.formation?.nom ?? '';
    return formation ? `${groupe} · ${formation}` : groupe;
  };

  // Nom complet du prof à partir de users.prenom + users.nom (colonnes confirmées sur la table `users`).
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
            className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-700 transition mb-3"
          >
            + Ajouter une salle
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

      {renameTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleRenameSubmit} className="bg-white rounded-2xl shadow-xl p-5 w-80">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Renommer la salle</h2>

            {renameError && <p className="text-red-500 text-[11px] bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 mb-2">{renameError}</p>}

            <label className="block text-[11px] font-medium text-slate-500 mb-1">Nouveau nom</label>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs mb-3 focus:outline-none focus:ring-2 focus:ring-slate-800"
              autoFocus
              required
            />

            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeRenameModal} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
                Annuler
              </button>
              <button type="submit" className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-700 transition">
                Renommer
              </button>
            </div>
          </form>
        </div>
      )}
      {showAddSalleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleAddSalle} className="bg-white rounded-2xl shadow-xl p-5 w-80">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Ajouter une salle</h2>

            {addSalleError && (
              <p className="text-red-500 text-[11px] bg-red-50 border border-red-100 rounded-lg px-2 py-1.5 mb-2">
                {addSalleError}
              </p>
            )}

            <label className="block text-[11px] font-medium text-slate-500 mb-1">Nom de la salle</label>
            <input
              type="text"
              value={newSalleName}
              onChange={(e) => setNewSalleName(e.target.value)}
              placeholder="Ex: Salle 09"
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs mb-1 focus:outline-none focus:ring-2 focus:ring-slate-800"
              autoFocus
              required
            />
            {newSalleName.trim() && (
              <p className={`text-[10px] mb-3 ${salleDejaExistante ? 'text-red-500' : 'text-emerald-600'}`}>
                {salleDejaExistante ? '⚠ Cette salle existe déjà' : '✓ Nom disponible'}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddSalleModal(false)} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
                Annuler
              </button>
              <button type="submit" disabled={salleDejaExistante} className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-700 transition disabled:opacity-50">
                Ajouter
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
};

export default EmploisEcole;