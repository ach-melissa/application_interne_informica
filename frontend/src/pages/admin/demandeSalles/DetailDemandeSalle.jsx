import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, UserRound, GraduationCap,
  UsersRound, CalendarDays, Clock3, ClipboardList, Repeat, RefreshCw, ChevronDown, Pencil, AlertTriangle, Ban } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';

const STATUT_STYLE = {
  en_attente: 'bg-amber-50 text-amber-600',
  approuvee: 'bg-emerald-50 text-emerald-600',
  refusee: 'bg-red-50 text-red-600',
  proposee: 'bg-[#DCEBFA] text-[#0369A1]',
};
const STATUT_LABEL = {
  en_attente: 'En attente',
  approuvee: 'Approuvée',
  refusee: 'Refusée',
  proposee: 'Proposition envoyée',
};

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;
const PERIODE_BORNES = { matin: ['08:00', '13:00'], midi: ['13:00', '16:00'] };

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
  const [proposerMode, setProposerMode] = useState(false);
const [propositionsForms, setPropositionsForms] = useState([
  { jour_semaine: '', periode: '', heure_debut: '', heure_fin: '', salle_id: '' },
]);
const setPropField = (idx, key) => (e) => {
  setPropositionsForms((prev) => prev.map((p, i) => (i === idx ? { ...p, [key]: e.target.value } : p)));
};
const ajouterFormulaireAlternative = () => {
  setPropositionsForms((prev) => [...prev, { jour_semaine: '', periode: '', heure_debut: '', heure_fin: '', salle_id: '' }]);
};
const retirerFormulaireAlternative = (idx) => {
  setPropositionsForms((prev) => prev.filter((_, i) => i !== idx));
};

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
      if (j.ok) {
        const raw = await j.json();
        const ORDRE_SEMAINE = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        setJours([...raw].sort((a, b) => ORDRE_SEMAINE.indexOf(a) - ORDRE_SEMAINE.indexOf(b)));
      }
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

const envoyerProposition = async () => {
  const incomplete = propositionsForms.some(
    (p) => !p.jour_semaine || !p.periode || !p.heure_debut || !p.heure_fin || !p.salle_id
  );
  if (incomplete) {
    setErreur('Merci de remplir tous les champs de chaque option.');
    return;
  }
  const horsBornes = propositionsForms.some(
    (p) => p.heure_debut < '08:00' || p.heure_fin > '16:00'
  );
  if (horsBornes) {
    setErreur('Les horaires proposés doivent être entre 08:00 et 16:00.');
    return;
  }
    setSubmitting(true);
    setErreur(null);
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${id}/proposer`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers() },
      body: JSON.stringify({
        propositions: propositionsForms.map((p) => ({ ...p, message_admin: reponse })),
      }),
    });
    if (res.ok) {
      navigate('/admin/demandes-salles');
    } else {
      const data = await res.json().catch(() => ({}));
      setErreur(data.error || "Erreur lors de l'envoi de la proposition.");
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
            <div className="max-w-4xl ">

        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate('/admin/demandes-salles')}
            className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition flex-shrink-0"
          >
            <ArrowLeft size={16} className="text-[#0369A1]" />
          </button>
          <div className="flex items-center gap-1.5 text-xs">
            <button onClick={() => navigate('/admin/demandes-salles')} className="text-slate-400 hover:text-[#0369A1] transition">
              Demandes
            </button>
            <span className="text-slate-300">›</span>
            <span className="text-[#0369A1] font-medium">Demande de réservation</span>
          </div>
        </div>

        <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">

                  <div className="p-6 border-b border-[#F1F5F9] flex justify-between items-start">
  <div className="flex items-center gap-3">
    <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
      <ClipboardList
   size={20} className="text-white" />
    </div>
    <div>
      <h1 className="text-lg font-bold text-slate-800">Demande de réservation</h1>
      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
        {isChangement ? <RefreshCw size={12} /> : <Repeat size={12} />}
        {isChangement ? "Changement d'horaire (permanent)" : 'Remplacement (un jour)'}
      </p>
    </div>
  </div>
  <div className="text-right">
    <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUT_STYLE[demande.statut] || STATUT_STYLE.en_attente}`}>
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
  <div className="flex items-center gap-2 mb-3">
    <UserRound size={16} className="text-[#0369A1]" />
    <h2 className="text-sm font-semibold text-slate-700">Demandeur</h2>
  </div>
  <div className="flex items-center gap-3">
    {demande.expediteur?.photo_url ? (
      <img src={demande.expediteur.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-sm" />
    ) : (
      <div className="w-10 h-10 rounded-full bg-[#DCEBFA] flex items-center justify-center text-xs font-bold text-[#0369A1] flex-shrink-0">
        {(d.demandeur_nom || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
      </div>
    )}
    <div>
      <p className="text-sm font-medium text-slate-700">{d.demandeur_nom || '—'}</p>
      <p className="text-xs text-slate-400">Professeur</p>
    </div>
  </div>
</section>

            <div className="grid grid-cols-3 gap-x-6 gap-y-5 border-t border-[#F1F5F9] pt-5">
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

                      <section className="border-t border-[#F1F5F9] pt-5">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList
             size={16} className="text-[#0369A1]" />
                <h2 className="text-sm font-semibold text-slate-700">Salle souhaitée</h2>
              </div>
              <p className="text-sm font-medium text-slate-700">{d.salle_souhaitee_nom || 'Aucune préférence'}</p>
            </section>
{d.ancien_jour_semaine && (
  <section className="border-t border-[#F1F5F9] pt-5">
    <h2 className="text-sm font-semibold text-slate-700 mb-2">Créneau concerné</h2>
    <div className="flex items-center gap-3 text-sm">
      <div className="flex-1 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
        <p className="text-[10px] text-red-400 uppercase font-semibold mb-1">Ancien (sera vidé)</p>
        <p className="capitalize text-slate-700">{d.ancien_jour_semaine} · {d.ancien_periode} · {d.ancien_heure_debut?.slice(0,5)}–{d.ancien_heure_fin?.slice(0,5)} · {d.ancien_salle_nom}</p>
      </div>
      <span className="text-slate-300">→</span>
      <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
        <p className="text-[10px] text-emerald-500 uppercase font-semibold mb-1">Nouveau (demandé)</p>
        <p className="capitalize text-slate-700">{d.jour_semaine} · {d.periode} · {d.heure_debut?.slice(0,5)}–{d.heure_fin?.slice(0,5)} · {d.salle_souhaitee_nom || 'à définir'}</p>
      </div>
    </div>
  </section>
)}
            {demande.message && (
              <section className="border-t border-[#F1F5F9] pt-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-1">Message du professeur</h2>
                <p className="text-sm text-slate-600">{demande.message}</p>
              </section>
            )}

            {/* ── Emploi de l'école, pour visualiser les conflits ── */}
                    <section className="border-t border-[#F1F5F9] pt-5">
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
const matinList = emploiData.filter((e) => e.salle === s.nom && e.jour_semaine === j && overlaps(e.heure_debut, e.heure_fin, ...PERIODE_BORNES.matin));
const midiList = emploiData.filter((e) => e.salle === s.nom && e.jour_semaine === j && overlaps(e.heure_debut, e.heure_fin, ...PERIODE_BORNES.midi));
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
              <section className="border-t border-[#F1F5F9] pt-5 space-y-4">
                <h2 className="text-sm font-semibold text-slate-700">Attribution</h2>

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

              {!proposerMode ? (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    disabled={submitting}
                    onClick={() => traiter('refusee')}
                    className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 px-3.5 py-2 rounded-md hover:bg-red-100 disabled:opacity-50 font-medium transition"
                  >
                    <X size={14} /> Refuser
                  </button>
                  <button
                    disabled={submitting}
                    onClick={() => setProposerMode(true)}
                    className="flex items-center gap-1.5 text-xs text-[#0369A1] bg-[#DCEBFA] px-3.5 py-2 rounded-md hover:bg-[#c7e3f7] disabled:opacity-50 font-medium transition"
                  >
                    <RefreshCw size={14} /> Proposer une alternative
                  </button>
                  <button
                    disabled={submitting || salleChoisieOccupee}
                    onClick={() => traiter('approuvee')}
                    className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium
                      shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px]
                      disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed transition-all"
                  >
                    <Check size={14} /> Approuver
                  </button>
                </div>
              ) : (
                <div className="border border-[#DCEBFA] bg-[#F0F8FF] rounded-lg p-4 space-y-3">
                  <p className="text-xs font-medium text-[#0369A1]">Proposer une ou plusieurs alternatives</p>

                  {propositionsForms.map((pf, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Option {idx + 1}</p>
                        {propositionsForms.length > 1 && (
                          <button type="button" onClick={() => retirerFormulaireAlternative(idx)} className="text-red-400 hover:text-red-600">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <select value={pf.jour_semaine} onChange={setPropField(idx, 'jour_semaine')} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                          <option value="">Jour</option>
                          {jours.map((j) => <option key={j} value={j}>{j}</option>)}
                        </select>
                        <select value={pf.periode} onChange={setPropField(idx, 'periode')} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                          <option value="">Période</option>
                          <option value="matin">Matin</option>
                          <option value="midi">À midi</option>
                        </select>
                        <input type="time" value={pf.heure_debut}  min="08:00" max="16:00" onChange={setPropField(idx, 'heure_debut')} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        <input type="time" value={pf.heure_fin} min="08:00" max="16:00" onChange={setPropField(idx, 'heure_fin')} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                        <select value={pf.salle_id} onChange={setPropField(idx, 'salle_id')} className="border border-slate-200 rounded-lg px-3 py-2 text-sm col-span-2">
                          <option value="">Salle</option>
                          {salles.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={ajouterFormulaireAlternative}
                    className="w-full text-xs font-medium text-[#0369A1] bg-white border border-dashed border-[#0369A1]/40 hover:bg-[#DCEBFA]/40 rounded-lg px-3 py-2 transition"
                  >
                    + Ajouter une autre option
                  </button>

                  <div className="flex justify-end gap-2">
                    <button onClick={() => setProposerMode(false)} className="text-xs px-3 py-2 rounded-md text-slate-500 hover:bg-white">
                      Annuler
                    </button>
                    <button
                      disabled={submitting}
                      onClick={envoyerProposition}
                      className="flex items-center gap-1.5 bg-[#0369A1] text-white px-3.5 py-2 rounded-md text-xs font-medium hover:bg-[#0369A1]/90 disabled:opacity-50"
                    >
                      Envoyer {propositionsForms.length > 1 ? `les ${propositionsForms.length} propositions` : 'la proposition'}
                    </button>
                  </div>
                </div>
              )}
              </section>
             ) : (
              <section className="border-t border-[#F1F5F9] pt-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-2">Décision</h2>

                {demande.statut === 'approuvee' && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">
                      Salle attribuée : <span className="font-medium text-slate-800">{d.salle_assignee_nom || '—'}</span>
                    </p>
                                       {!editingSalle && (
                      <button
                        onClick={() => { setNewSalleId(d.salle_assignee || ''); setEditingSalle(true); }}
                        className="flex items-center gap-1 text-xs text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1.5 rounded-md hover:bg-[#c7e3f7] font-medium transition"
                      >
                        <Pencil size={11} /> Changer la salle
                      </button>
                    )}
                  </div>
                )}

{demande.statut === 'refusee' && (
  <p className="text-sm text-slate-600">Cette demande a été refusée.</p>
)}

{demande.statut === 'proposee' && d.propositions?.length > 0 && (
  <div className="text-sm text-slate-600 space-y-2">
    <p>{d.propositions.length} alternative{d.propositions.length > 1 ? 's' : ''} proposée{d.propositions.length > 1 ? 's' : ''}, en attente de la réponse du professeur :</p>
    {d.propositions.map((p, i) => (
      <p key={i} className="font-medium text-slate-800 capitalize bg-slate-50 rounded-lg px-3 py-2">
        {p.jour_semaine} · {p.periode} · {p.heure_debut?.slice(0,5)}–{p.heure_fin?.slice(0,5)} · {p.salle_nom}
      </p>
    ))}
  </div>
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
    <p className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">
      {icon && <span className="text-slate-500 [&>svg]:w-2.5 [&>svg]:h-2.5">{icon}</span>}
      {label}
    </p>
    <p className="text-xs text-slate-700 font-medium capitalize">{value || '—'}</p>
  </div>
);

export default DetailDemandeSalle;