import { useState, useEffect, useMemo, Fragment } from 'react';
import { CalendarCheck2, Armchair, ArrowRight, Calculator, Scissors, Monitor, Bot, Globe2, Building2, Network, Sparkles, BookOpenCheck } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';

// Colonnes du planning : jour (day_enum) -> libellé affiché
const JOURS = [
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
];
// NB : le day_enum de la table `schedules` ne contient pas "vendredi" (weekend = vendredi/samedi).
// Ajoute { key: 'vendredi', label: 'Vendredi' } en tête si ton enum le prévoit.

const PERIODES = ['matin', 'midi'];

// Style + icône par catégorie, déduits du texte libre stocké dans `contenu`.
// L'ordre compte : les clés les plus spécifiques sont testées en premier.
const CATEGORIES = [
  { test: /compt/i, bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', icon: Calculator },
  { test: /couture/i, bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: Scissors },
  { test: /robot/i, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Bot },
  { test: /bureau/i, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Building2 },
  { test: /r[ée]seau/i, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: Network },
  { test: /\bsi\b|\bfc\b/i, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: BookOpenCheck },
  { test: /\bia\b/i, bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: Sparkles },
  { test: /anglais/i, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: Globe2 },
  { test: /\ban\b|\bbn\b/i, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: BookOpenCheck },
  { test: /info/i, bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', icon: Monitor },
];
const DEFAULT_CATEGORY = { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600', icon: Monitor };

const getCategory = (contenu) => {
  if (!contenu) return DEFAULT_CATEGORY;
  return CATEGORIES.find((c) => c.test.test(contenu)) ?? DEFAULT_CATEGORY;
};

const salleSort = (a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });

const EmploisEcole = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Salles ajoutées manuellement (ligne vide en attendant qu'on lui crée des schedules).
  const [extraSalles, setExtraSalles] = useState([]);
  const [newSalleName, setNewSalleName] = useState('');
  // Salle en cours de renommage : nom actuel, ou null si aucune
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState(null);

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
  const salles = useMemo(() => {
    const uniques = new Set([...schedules.map((s) => s.salle).filter(Boolean), ...extraSalles]);
    return [...uniques].sort(salleSort);
  }, [schedules, extraSalles]);

  const handleAddSalle = (e) => {
    e.preventDefault();
    const nom = newSalleName.trim();
    if (!nom) return;
    const dejaLa = salles.some((s) => s.toLowerCase() === nom.toLowerCase());
    if (!dejaLa) setExtraSalles((prev) => [...prev, nom]);
    setNewSalleName('');
  };

  const openRenameModal = (salle) => {
    setRenameError(null);
    setRenameTarget(salle);
    setRenameValue(salle);
  };

  const closeRenameModal = () => setRenameTarget(null);

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    const nouveauNom = renameValue.trim();
    if (!nouveauNom || nouveauNom === renameTarget) return setRenameTarget(null);
    setRenameError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/schedules/salle/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldName: renameTarget, newName: nouveauNom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setSchedules((prev) => prev.map((s) => (s.salle === renameTarget ? { ...s, salle: nouveauNom } : s)));
      setExtraSalles((prev) => prev.map((s) => (s === renameTarget ? nouveauNom : s)));
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

  const renderCard = (cell, category, timeLabel) => {
    const Icon = category.icon;
    const prof = getProfLabel(cell);
    const groupe = getGroupeLabel(cell);
    return (
      <div className={`rounded-xl border ${category.border} ${category.bg} px-2.5 py-2 text-left`}>
        <div className={`flex items-center gap-1 ${category.text} mb-1`}>
          <Icon size={12} strokeWidth={2.25} />
          <span className="text-[10px] font-medium opacity-80">{timeLabel}</span>
        </div>
        <div className={`text-[11px] font-semibold leading-tight ${category.text}`}>{cell.contenu}</div>
        {groupe && <div className={`text-[10px] mt-0.5 font-medium ${category.text} opacity-90`}>{groupe}</div>}
        {prof && <div className={`text-[10px] opacity-70 ${category.text}`}>{prof}</div>}
      </div>
    );
  };

  const renderMerged = (matin, midi, category) => {
    const Icon = category.icon;
    const groupe = getGroupeLabel(matin);
    const prof = getProfLabel(matin);
    return (
      <div className={`rounded-xl border ${category.border} ${category.bg} px-2.5 py-2.5 text-center`}>
        <div className={`flex items-center justify-center gap-1 ${category.text} opacity-60 mb-1`}>
          <div className="h-px flex-1 bg-current" />
          <ArrowRight size={12} />
        </div>
        <div className={`text-[11px] font-semibold ${category.text}`}>{matin.contenu}</div>
        {groupe && <div className={`text-[10px] font-medium ${category.text} opacity-90`}>{groupe}</div>}
        {prof && <div className={`text-[10px] opacity-70 ${category.text}`}>{prof}</div>}
        <div className={`text-[10px] mt-0.5 opacity-70 ${category.text}`}>
          {matin.heure_debut?.slice(0, 5)} - {midi.heure_fin?.slice(0, 5)}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center">
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
          <form onSubmit={handleAddSalle} className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={newSalleName}
              onChange={(e) => setNewSalleName(e.target.value)}
              placeholder="Nom de la nouvelle salle (ex: Salle 09)"
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-slate-800"
            />
            <button
              type="submit"
              className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-700 transition"
            >
              + Ajouter une salle
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] bg-white">
            <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="border border-slate-100 px-3 py-3 bg-slate-900 text-white font-semibold sticky left-0 z-20" rowSpan={2}>
                  Salle
                </th>
                {JOURS.map((jour) => (
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
                {JOURS.map((jour) =>
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
                  <td colSpan={1 + JOURS.length * 2} className="text-center text-slate-400 py-10">
                    Aucune salle programmée pour le moment.
                  </td>
                </tr>
              )}
              {salles.map((salle) => (
                <tr key={salle}>
                  <td className="border border-slate-100 px-3 py-3 bg-slate-900 text-white whitespace-nowrap sticky left-0 z-10">
                    <div className="flex flex-col items-center gap-1">
                      <Armchair size={16} />
                      <button
                        type="button"
                        onClick={() => openRenameModal(salle)}
                        className="text-[11px] font-semibold hover:underline decoration-dotted"
                        title="Renommer la salle"
                      >
                        {salle}
                      </button>
                    </div>
                  </td>
                  {JOURS.map((jour) => {
                    const matinList = getCells(salle, jour.key, 'matin');
                    const midiList = getCells(salle, jour.key, 'midi');
                    const merged =
                      matinList.length === 1 &&
                      midiList.length === 1 &&
                      matinList[0].contenu === midiList[0].contenu &&
                      matinList[0].prof_id === midiList[0].prof_id;

                    if (merged) {
                      const category = getCategory(matinList[0].contenu);
                      return (
                        <td key={jour.key} colSpan={2} className="border border-slate-100 p-1.5 min-w-[320px]">
                          {renderMerged(matinList[0], midiList[0], category)}
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
                                  {renderCard(cell, getCategory(cell.contenu), `${cell.heure_debut?.slice(0, 5)} - ${cell.heure_fin?.slice(0, 5)}`)}
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
                                  {renderCard(cell, getCategory(cell.contenu), `${cell.heure_debut?.slice(0, 5)} - ${cell.heure_fin?.slice(0, 5)}`)}
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
    </AdminLayout>
  );
};

export default EmploisEcole;