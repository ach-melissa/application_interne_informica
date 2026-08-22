import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, UserRound, GraduationCap,
  UsersRound, CalendarDays, Clock3, DoorOpen, Repeat, RefreshCw, ChevronDown, Pencil, AlertTriangle, Ban } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';

const STATUT_STYLE = {
  en_attente: 'bg-amber-50 text-amber-600',
  approuvee: 'bg-emerald-50 text-emerald-600',
  refusee: 'bg-red-50 text-red-600',
};
const STATUT_LABEL = {
  en_attente: 'En attente',
  approuvee: 'Approuvée',
  refusee: 'Refusée',
};

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

const DetailDemandeSalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [demande, setDemande] = useState(null);
  const [salles, setSalles] = useState([]);
  const [jours, setJours] = useState([]);
  const [emploiData, setEmploiData] = useState([]);
  const [salleId, setSalleId] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [reponse, setReponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [showEmploi, setShowEmploi] = useState(false);

  const [editingSalle, setEditingSalle] = useState(false);
  const [newSalleId, setNewSalleId] = useState('');

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  useEffect(() => {
    if (!dropdownOpen) return;
    const closeOnOutsideClick = () => setDropdownOpen(false);
    document.addEventListener('click', closeOnOutsideClick);
    return () => document.removeEventListener('click', closeOnOutsideClick);
  }, [dropdownOpen]);

  useEffect(() => {
    const load = async () => {
      const [n, s, j, a] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/notifications`, { headers: headers() }),
        fetch(`${import.meta.env.VITE_API_URL}/api/schedules/salles`, { headers: headers() }),
        fetch(`${import.meta.env.VITE_API_URL}/api/schedules/jours`, { headers: headers() }),
        fetch(`${import.meta.env.VITE_API_URL}/api/schedules/apercu`, { headers: headers() }),
      ]);

      if (n.ok) {
        const found = (await n.json()).find((x) => x.id === id);
        setDemande(found);
        setSalleId(found?.data?.salle_souhaitee_id || '');
      }
      if (s.ok) setSalles(await s.json());
      if (j.ok) setJours(await j.json());
      if (a.ok) setEmploiData(await a.json());
    };
    load();
  }, [id]);

  const d = demande?.data || {};

  // Toute occupation (n'importe quelle salle) qui chevauche le jour/horaire demandé
  const conflictsForSalle = (salleNom) => {
    if (!d.jour_semaine || !d.heure_debut || !d.heure_fin) return [];
    return emploiData.filter((s) =>
      s.salle === salleNom &&
      s.jour_semaine === d.jour_semaine &&
      overlaps(s.heure_debut, s.heure_fin, d.heure_debut, d.heure_fin)
    );
  };

  const isSalleOccupied = (salleNom) => conflictsForSalle(salleNom).length > 0;

  const traiter = async (statut) => {
    if (statut === 'approuvee') {
      if (!salleId) { setErreur('Sélectionnez une salle.'); return; }
      const chosen = salles.find((s) => s.id === salleId);
      if (chosen && isSalleOccupied(chosen.nom)) {
        setErreur(`${chosen.nom} est déjà occupée à ce créneau. Choisissez une autre salle.`);
        return;
      }
    }
    setSubmitting(true);
    setErreur(null);

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/notifications/${id}/traiter`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ statut, salle_id: salleId || null, reponse_message: reponse }),
      }
    );

    if (res.ok) {
      navigate('/admin/demandes-salles');
    } else {
      const data = await res.json().catch(() => ({}));
      setErreur(data.error || 'Erreur lors du traitement.');
    }
    setSubmitting(false);
  };

  const enregistrerNouvelleSalle = async () => {
    if (!newSalleId) return;
    const chosen = salles.find((s) => s.id === newSalleId);
    if (chosen && isSalleOccupied(chosen.nom)) {
      setErreur(`${chosen.nom} est déjà occupée à ce créneau. Choisissez une autre salle.`);
      return;
    }
    setSubmitting(true);
    setErreur(null);
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${id}/modifier-salle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify({ salle_id: newSalleId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDemande(updated);
      setEditingSalle(false);
    } else {
      const data = await res.json().catch(() => ({}));
      setErreur(data.error || 'Erreur lors de la modification.');
    }
    setSubmitting(false);
  };

  if (!demande)
    return <AdminLayout><div className="p-6 text-slate-400">Chargement...</div></AdminLayout>;

  const enAttente = demande.statut === 'en_attente' || !demande.statut;
  const isChangement = d.type_demande === 'changement';
  const salleChoisie = salles.find((s) => s.id === salleId);
  const salleChoisieOccupee = salleChoisie ? isSalleOccupied(salleChoisie.nom) : false;

  return (
    <AdminLayout>
      <div className="max-w-4xl p-6">

        <div className="text-sm text-slate-400 mb-3">
          Demandes <span className="mx-2">›</span>
          <span className="text-slate-600">Demande de réservation</span>
        </div>

        <button
          onClick={() => navigate('/admin/demandes-salles')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0369A1] mb-5"
        >
          <ArrowLeft size={16} /> Retour aux demandes
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          <div className="p-6 border-b flex justify-between items-start">
  <div>
    <h1 className="text-xl font-semibold text-[#0F2A4A]">Demande de réservation</h1>
    <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
      {isChangement ? <RefreshCw size={13} /> : <Repeat size={13} />}
      {isChangement ? "Changement d'horaire (permanent)" : 'Remplacement (un jour)'}
    </p>
  </div>
  <div className="text-right">
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUT_STYLE[demande.statut] || STATUT_STYLE.en_attente}`}>
      {STATUT_LABEL[demande.statut] || 'En attente'}
    </span>
    {demande.created_at && (
      <p className="text-[11px] text-slate-400 mt-1.5">
        Créée le {new Date(demande.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
      </p>
    )}
  </div>
</div>

          <div className="p-6 space-y-6">

            <section>
              <div className="flex items-center gap-3 mb-3">
                <UserRound size={18} className="text-[#0369A1]" />
                <h2 className="font-semibold text-slate-700">Demandeur</h2>
              </div>
              <p className="text-sm text-slate-700">{d.demandeur_nom || '—'}</p>
              <p className="text-xs text-slate-400">Professeur</p>
            </section>

            <div className="grid grid-cols-3 gap-x-6 gap-y-5 border-t pt-5">
              <Info icon={<GraduationCap />} label="Formation" value={d.formation_nom} />
              <Info icon={<UsersRound />} label="Groupe" value={d.groupe_nom} />
              <Info icon={<CalendarDays />} label="Jour" value={d.jour_semaine} />
              <Info
                icon={<Clock3 />}
                label="Horaire"
                value={`${d.heure_debut?.slice(0, 5) || '--:--'} – ${d.heure_fin?.slice(0, 5) || '--:--'}`}
              />
              <Info label="Période" value={d.periode} />
              <Info
                icon={<CalendarDays />}
                label={isChangement ? 'À partir du' : 'Date du remplacement'}
                value={d.date_cible}
              />
            </div>

            <section className="border-t pt-5">
              <div className="flex items-center gap-2 mb-2">
                <DoorOpen size={18} className="text-[#0369A1]" />
                <h2 className="font-semibold text-slate-700">Salle souhaitée</h2>
              </div>
              <p className="text-sm text-slate-700">{d.salle_souhaitee_nom || 'Aucune préférence'}</p>
            </section>

            {demande.message && (
              <section className="border-t pt-5">
                <h2 className="font-semibold text-slate-700 mb-1">Message du professeur</h2>
                <p className="text-sm text-slate-600">{demande.message}</p>
              </section>
            )}

            {/* ── Emploi de l'école, pour visualiser les conflits ── */}
            <section className="border-t pt-5">
              <button
                type="button"
                onClick={() => setShowEmploi((v) => !v)}
                className="w-full flex items-center justify-between text-sm font-medium text-[#0369A1] bg-[#DCEBFA]/50 hover:bg-[#DCEBFA] rounded-lg px-3 py-2.5 transition"
              >
                <span className="flex items-center gap-2"><CalendarDays size={15} /> Emploi de l'école</span>
                <span className="text-xs">{showEmploi ? 'Masquer' : 'Afficher'}</span>
              </button>

              {showEmploi && (
                <div className="mt-3 border border-slate-200 rounded-lg overflow-x-auto">
                  {salles.length === 0 || jours.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4 px-3">Aucune donnée disponible.</p>
                  ) : (
                    <table className="text-[10px] border-collapse w-full">
                      <thead>
                        <tr>
                          <th className="border border-slate-100 px-2 py-2 bg-slate-900 text-white font-semibold sticky left-0 z-10" rowSpan={2}>
                            Salle
                          </th>
                          {jours.map((j) => (
                            <th key={j} colSpan={2}
                              className={`border border-slate-100 px-2 py-1.5 font-semibold uppercase tracking-wide text-[9px] ${j === d.jour_semaine ? 'bg-[#0369A1] text-white' : 'bg-slate-900 text-white'}`}>
                              {j.charAt(0).toUpperCase() + j.slice(1)}
                            </th>
                          ))}
                        </tr>
                        <tr>
                          {jours.map((j) => (
                            <>
                              <th key={`${j}-matin`} className={`border border-slate-100 px-2 py-1 font-semibold uppercase text-[8px] ${j === d.jour_semaine ? 'bg-[#DCEBFA] text-[#0369A1]' : 'bg-white text-slate-500'}`}>Matin</th>
                              <th key={`${j}-midi`} className={`border border-slate-100 px-2 py-1 font-semibold uppercase text-[8px] ${j === d.jour_semaine ? 'bg-[#DCEBFA] text-[#0369A1]' : 'bg-white text-slate-500'}`}>À midi</th>
                            </>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...salles].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true })).map((s, i) => {
                          const rowConflict = isSalleOccupied(s.nom);
                          return (
                            <tr key={s.id}>
                              <td className={`border border-slate-100 px-2 py-1.5 font-medium whitespace-nowrap sticky left-0 z-10 ${rowConflict ? 'bg-red-900 text-white' : 'bg-slate-900 text-white'}`}>
                                {s.nom}
                              </td>
                              {jours.map((j) => {
                                const matinList = emploiData.filter((e) => e.salle === s.nom && e.jour_semaine === j && e.periode === 'matin');
                                const midiList = emploiData.filter((e) => e.salle === s.nom && e.jour_semaine === j && e.periode === 'midi');
                                const highlight = j === d.jour_semaine;
                                return (
                                  <>
                                    <td key={`${s.id}-${j}-matin`} className={`border border-slate-100 px-2 py-1.5 ${highlight ? 'bg-[#DCEBFA]/30' : i % 2 ? 'bg-[#F8FCFF]' : 'bg-white'}`}>
                                      {matinList.length > 0 ? (
                                        <div className="flex flex-col gap-0.5">
                                          {matinList.map((c) => (
                                            <span key={c.id} className="text-red-500 whitespace-nowrap">{c.heure_debut?.slice(0, 5)} - {c.heure_fin?.slice(0, 5)}</span>
                                          ))}
                                        </div>
                                      ) : <span className="text-emerald-600 font-medium">Libre</span>}
                                    </td>
                                    <td key={`${s.id}-${j}-midi`} className={`border border-slate-100 px-2 py-1.5 ${highlight ? 'bg-[#DCEBFA]/30' : i % 2 ? 'bg-[#F8FCFF]' : 'bg-white'}`}>
                                      {midiList.length > 0 ? (
                                        <div className="flex flex-col gap-0.5">
                                          {midiList.map((c) => (
                                            <span key={c.id} className="text-red-500 whitespace-nowrap">{c.heure_debut?.slice(0, 5)} - {c.heure_fin?.slice(0, 5)}</span>
                                          ))}
                                        </div>
                                      ) : <span className="text-emerald-600 font-medium">Libre</span>}
                                    </td>
                                  </>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </section>

            {enAttente ? (
              <section className="border-t pt-5 space-y-4">
                <h2 className="font-semibold text-slate-700">Attribution</h2>

                <div>
                  <label className="text-xs text-slate-400 mb-2 block">
                    Salle à attribuer {d.salle_souhaitee_nom ? '(vous pouvez garder celle demandée ou en choisir une autre)' : ''}
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDropdownOpen((o) => !o); }}
                      className={`w-full flex items-center justify-between border rounded-lg px-3 py-2.5 text-sm text-left outline-none ${salleChoisieOccupee ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-[#0369A1]'}`}
                    >
                      <span className={salleId ? (salleChoisieOccupee ? 'text-red-600 font-medium' : 'text-slate-700') : 'text-slate-400'}>
                        {salleChoisie ? salleChoisie.nom : 'Sélectionner une salle'}
                        {salleChoisieOccupee && ' — Occupée à ce créneau'}
                      </span>
                      <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {salles.map((s) => {
                          const occupied = isSalleOccupied(s.nom);
                          return (
                            <button
                              type="button"
                              key={s.id}
                              disabled={occupied}
                              onClick={() => { if (!occupied) { setSalleId(s.id); setDropdownOpen(false); } }}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left ${
                                occupied
                                  ? 'text-red-300 cursor-not-allowed bg-red-50/40'
                                  : salleId === s.id ? 'text-[#0369A1] font-medium hover:bg-slate-50' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{s.nom}</span>
                              {occupied && <span className="flex items-center gap-1 text-[10px]"><Ban size={11} /> Occupée</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {salleChoisieOccupee && (
                    <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-2 flex items-center gap-1.5">
                      <AlertTriangle size={13} /> Cette salle est déjà occupée à ce créneau — l'approbation est bloquée tant qu'une autre salle libre n'est pas choisie.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-slate-400">Réponse</label>
                  <textarea
                    value={reponse}
                    onChange={(e) => setReponse(e.target.value)}
                    rows={3}
                    placeholder="Votre réponse..."
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none outline-none focus:border-[#0369A1]"
                  />
                </div>

                {erreur && (
                  <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erreur}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    disabled={submitting}
                    onClick={() => traiter('refusee')}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    <X size={16} /> Refuser
                  </button>
                  <button
                    disabled={submitting || salleChoisieOccupee}
                    onClick={() => traiter('approuvee')}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#0369A1] rounded-lg hover:bg-[#0F2A4A] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check size={16} /> Approuver
                  </button>
                </div>
              </section>
            ) : (
              <section className="border-t pt-5">
                <h2 className="font-semibold text-slate-700 mb-2">Décision</h2>

                {demande.statut === 'approuvee' && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">
                      Salle attribuée : <span className="font-medium text-slate-800">{d.salle_assignee_nom || '—'}</span>
                    </p>
                    {!editingSalle && (
                      <button
                        onClick={() => { setNewSalleId(d.salle_assignee || ''); setEditingSalle(true); }}
                        className="flex items-center gap-1 text-xs text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1.5 rounded-lg hover:bg-[#c7e3f7]"
                      >
                        <Pencil size={11} /> Changer la salle
                      </button>
                    )}
                  </div>
                )}

                {demande.statut === 'refusee' && (
                  <p className="text-sm text-slate-600">Cette demande a été refusée.</p>
                )}

                {editingSalle && (
                  <div className="mt-3 flex items-center gap-2">
                    <select
                      value={newSalleId}
                      onChange={(e) => setNewSalleId(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1"
                    >
                      <option value="">Choisir une salle…</option>
                      {salles.map((s) => (
                        <option key={s.id} value={s.id} disabled={s.id !== d.salle_assignee && isSalleOccupied(s.nom)}>
                          {s.nom}{s.id !== d.salle_assignee && isSalleOccupied(s.nom) ? ' (occupée)' : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={enregistrerNouvelleSalle}
                      disabled={submitting || !newSalleId}
                      className="text-xs px-3 py-2 rounded-lg bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40"
                    >
                      {submitting ? '...' : 'Confirmer'}
                    </button>
                    <button
                      onClick={() => setEditingSalle(false)}
                      className="text-xs px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-50"
                    >
                      Annuler
                    </button>
                  </div>
                )}

                {erreur && (
                  <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3">{erreur}</p>
                )}

                {demande.reponse_message && (
                  <p className="text-sm text-slate-500 mt-3 italic">"{demande.reponse_message}"</p>
                )}
              </section>
            )}

          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

const Info = ({ icon, label, value }) => (
  <div>
    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
      {icon && <span className="text-[#0369A1]">{icon}</span>}
      {label}
    </div>
    <p className="text-sm text-slate-700 capitalize">{value || '—'}</p>
  </div>
);

export default DetailDemandeSalle;