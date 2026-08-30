import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, UserRound, GraduationCap, UsersRound,
  CalendarDays, Clock3, DoorOpen, Repeat, RefreshCw,
  MessageSquare, CheckCircle2, XCircle, ArrowRight, ShieldCheck,
} from 'lucide-react';

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
  proposee: 'Alternative proposée',
};

const DetailMaDemande = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [demande, setDemande] = useState(null);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/mes-demandes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDemande((await res.json()).find((x) => x.id === id));
    };
    load();
  }, [id]);

  const [repondant, setRepondant] = useState(false);
  const [erreurRep, setErreurRep] = useState(null);

  const repondreProposition = async (accepte, proposition_index) => {
    setRepondant(true);
    setErreurRep(null);
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${id}/repondre-proposition`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ accepte, proposition_index }),
    });
    if (res.ok) {
      setDemande(await res.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setErreurRep(data.error || 'Erreur lors de la réponse.');
    }
    setRepondant(false);
  };

  if (!demande) return <div className="p-6 text-slate-400">Chargement...</div>;

  const d = demande.data || {};
  const isChangement = d.type_demande === 'changement';

  // Icône + couleur pour la section "réponse de l'administration", selon le statut
  const reponseMeta = {
    approuvee: { Icon: CheckCircle2, box: 'bg-emerald-50', icon: 'text-emerald-600' },
    refusee: { Icon: XCircle, box: 'bg-red-50', icon: 'text-red-500' },
    en_attente: { Icon: ShieldCheck, box: 'bg-slate-100', icon: 'text-slate-400' },
    proposee: { Icon: ShieldCheck, box: 'bg-[#DCEBFA]', icon: 'text-[#0369A1]' },
  }[demande.statut] || { Icon: ShieldCheck, box: 'bg-slate-100', icon: 'text-slate-400' };

  return (
    <div className="max-w-5xl ">

      {/* Header + breadcrumb, aligné sur le reste de l'app */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/prof/mes-demandes-salles')}
          className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition flex-shrink-0"
        >
          <ArrowLeft size={16} className="text-[#0369A1]" />
        </button>
        <div className="flex items-center gap-1.5 text-xs">
          <button onClick={() => navigate('/prof/mes-demandes-salles')} className="text-slate-400 hover:text-[#0369A1] transition">
            Mes demandes
          </button>
          <span className="text-slate-300">›</span>
          <span className="text-[#0369A1] font-medium">Demande de réservation</span>
        </div>
      </div>

      <div className="bg-white border border-[#F1F5F9] rounded-2xl shadow-sm overflow-hidden">

        {/* En-tête de la carte */}
        <div className="p-6 border-b border-[#F1F5F9] flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
              {isChangement ? <RefreshCw size={20} className="text-white" /> : <Repeat size={20} className="text-white" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Demande de réservation</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isChangement ? "Changement d'horaire (permanent)" : 'Remplacement (un jour)'}
              </p>
            </div>
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

        <div className={`px-6 py-3 flex items-center gap-2 text-sm font-medium border-b border-[#F1F5F9] ${STATUT_STYLE[demande.statut] || STATUT_STYLE.en_attente}`}>
          <reponseMeta.Icon size={15} />
          Votre demande est <span className="font-semibold">{(STATUT_LABEL[demande.statut] || 'En attente').toLowerCase()}</span>
        </div>

        <div className="p-6 space-y-6">

          {/* Demandeur */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <UserRound size={15} className="text-[#0369A1]" />
              <h2 className="font-semibold text-slate-700 text-sm">Demandeur</h2>
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
                <p className="text-sm text-slate-700">{d.demandeur_nom || '—'}</p>
                <p className="text-xs text-slate-400">Professeur</p>
              </div>
            </div>
          </section>

          {/* Infos générales */}
          <div className="grid grid-cols-3 gap-x-6 gap-y-5 border-t border-[#F1F5F9] pt-5">
            <Info icon={<GraduationCap size={13} />} label="Formation" value={d.formation_nom} />
            <Info icon={<UsersRound size={13} />} label="Groupe" value={d.groupe_nom} />
            <Info icon={<CalendarDays size={13} />} label="Jour" value={d.jour_semaine} />
            <Info
              icon={<Clock3 size={13} />}
              label="Horaire"
              value={`${d.heure_debut?.slice(0, 5) || '--:--'} – ${d.heure_fin?.slice(0, 5) || '--:--'}`}
            />
            <Info label="Période" value={d.periode} />
            <Info
              icon={<CalendarDays size={13} />}
              label={isChangement ? 'À partir du' : 'Date du remplacement'}
              value={d.date_cible}
            />
          </div>

          {/* Salle souhaitée */}
          <section className="border-t border-[#F1F5F9] pt-5">
            <div className="flex items-center gap-2 mb-2">
              <DoorOpen size={15} className="text-[#0369A1]" />
              <h2 className="font-semibold text-slate-700 text-sm">Salle souhaitée</h2>
            </div>
            <p className="text-sm text-slate-700">{d.salle_souhaitee_nom || 'Aucune préférence'}</p>
          </section>

          {/* Créneau concerné — version sobre, une seule couleur d'accent */}
          {d.ancien_jour_semaine && (
            <section className="border-t border-[#F1F5F9] pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Repeat size={15} className="text-[#0369A1]" />
                <h2 className="font-semibold text-slate-700 text-sm">Créneau concerné</h2>
              </div>
              <div className="flex items-center gap-3">
                <CreneauBlock
                  label="Actuel"
                  labelCls="bg-slate-100 text-slate-500"
                  jour={d.ancien_jour_semaine}
                  periode={d.ancien_periode}
                  debut={d.ancien_heure_debut}
                  fin={d.ancien_heure_fin}
                  salle={d.ancien_salle_nom}
                />
                <ArrowRight size={16} className="text-slate-300 flex-shrink-0" />
                <CreneauBlock
                  label="Demandé"
                  labelCls="bg-[#DCEBFA] text-[#0369A1]"
                  jour={d.jour_semaine}
                  periode={d.periode}
                  debut={d.heure_debut}
                  fin={d.heure_fin}
                  salle={d.salle_souhaitee_nom || 'à définir'}
                />
              </div>
            </section>
          )}

          {/* Message du demandeur */}
          {demande.message && (
            <section className="border-t border-[#F1F5F9] pt-5">
              <div className="flex items-center gap-2 mb-1.5">
                <MessageSquare size={15} className="text-[#0369A1]" />
                <h2 className="font-semibold text-slate-700 text-sm">Votre message</h2>
              </div>
              <p className="text-sm text-slate-600">{demande.message}</p>
            </section>
          )}

          {/* Propositions de l'administration */}
          {demande.statut === 'proposee' && d.propositions?.length > 0 && (
            <section className="border-t border-[#F1F5F9] pt-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={15} className="text-[#0369A1]" />
                <h2 className="font-semibold text-slate-700 text-sm">
                  {d.propositions.length > 1 ? 'Alternatives proposées' : 'Alternative proposée'}
                </h2>
              </div>
              {d.salle_demandee_occupee && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">
                  La salle {d.salle_souhaitee_nom} que vous aviez demandée était déjà occupée à ce créneau — voici ce que l'administration propose à la place.
                </p>
              )}
              <p className="text-xs text-slate-400 mb-3">Choisissez l'option qui vous convient, ou refusez toutes les propositions.</p>
              <div className="space-y-2">
                {d.propositions.map((p, idx) => (
                  <div key={idx} className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="text-sm text-slate-700 capitalize space-y-0.5">
                      <p><span className="text-slate-400 normal-case">Jour :</span> {p.jour_semaine}</p>
                      <p><span className="text-slate-400 normal-case">Période :</span> {p.periode}</p>
                      <p><span className="text-slate-400 normal-case">Horaire :</span> {p.heure_debut?.slice(0,5)} – {p.heure_fin?.slice(0,5)}</p>
                      <p><span className="text-slate-400 normal-case">Salle :</span> {p.salle_nom}</p>
                      {p.message_admin && (
                        <p className="text-slate-500 italic normal-case mt-1">"{p.message_admin}"</p>
                      )}
                    </div>
                    <button
                      disabled={repondant}
                      onClick={() => repondreProposition(true, idx)}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium hover:bg-[#16385f] disabled:opacity-50 transition"
                    >
                      Choisir cette option
                    </button>
                  </div>
                ))}
              </div>

              {erreurRep && (
                <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3">{erreurRep}</p>
              )}

              <div className="flex justify-end mt-3">
                <button
                  disabled={repondant}
                  onClick={() => repondreProposition(false)}
                  className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 px-3.5 py-2 rounded-md hover:bg-red-100 disabled:opacity-50 font-medium transition"
                >
                  Refuser toutes les propositions
                </button>
              </div>
            </section>
          )}

          {/* Réponse de l'administration — section unique, plus de doublon avec "Salle attribuée" */}
          {(demande.statut === 'approuvee' || demande.statut === 'refusee' || demande.reponse_message || demande.traite_par_nom) && (
            <section className="border-t border-[#F1F5F9] pt-5">
              <div className="flex items-center gap-2 mb-3">
               
                <h2 className="font-semibold text-slate-700 text-sm">Réponse de l'administration</h2>
              </div>

              <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl p-4 space-y-2">
                {demande.statut === 'approuvee' && (
                  <p className="text-sm text-slate-700">
                    <span className="text-slate-400">Salle attribuée : </span>
                    <span className="font-medium">{d.salle_assignee_nom || '—'}</span>
                  </p>
                )}
                {demande.reponse_message && (
                  <p className="text-sm text-slate-600 italic">"{demande.reponse_message}"</p>
                )}
                {demande.traite_par_nom && (
                  <p className="text-xs text-slate-400">— {demande.traite_par_nom}</p>
                )}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
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

const CreneauBlock = ({ label, labelCls, jour, periode, debut, fin, salle }) => (
  <div className="flex-1 bg-[#F8FAFC] border border-[#F1F5F9] rounded-xl p-3.5">
    <span className={`inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full mb-2 ${labelCls}`}>
      {label}
    </span>
    <div className="space-y-1 text-xs text-slate-600">
      <p className="flex items-center gap-1.5 capitalize"><CalendarDays size={12} className="text-slate-400" /> {jour} · {periode}</p>
      <p className="flex items-center gap-1.5"><Clock3 size={12} className="text-slate-400" /> {debut?.slice(0,5)}–{fin?.slice(0,5)}</p>
      <p className="flex items-center gap-1.5"><DoorOpen size={12} className="text-slate-400" /> {salle}</p>
    </div>
  </div>
);

export default DetailMaDemande;