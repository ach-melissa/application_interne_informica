import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, UserRound, GraduationCap, UsersRound,
  CalendarDays, Clock3, DoorOpen, Repeat, RefreshCw,
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

  return (
    <div className="max-w-4xl p-6">

      <div className="text-sm text-slate-400 mb-3">
        Mes demandes <span className="mx-2">›</span>
        <span className="text-slate-600">Demande de réservation</span>
      </div>

      <button
        onClick={() => navigate('/prof/mes-demandes-salles')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0369A1] mb-5"
      >
        <ArrowLeft size={16} /> Retour à mes demandes
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
{d.ancien_jour_semaine && (
  <section className="border-t pt-5">
    <h2 className="font-semibold text-slate-700 mb-2">Créneau concerné</h2>
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
            <section className="border-t pt-5">
              <h2 className="font-semibold text-slate-700 mb-1">Votre message</h2>
              <p className="text-sm text-slate-600">{demande.message}</p>
            </section>
          )}

          {demande.statut === 'proposee' && d.propositions?.length > 0 && (
            <section className="border-t pt-5">
              <h2 className="font-semibold text-slate-700 mb-2">
                {d.propositions.length > 1 ? 'Alternatives proposées' : 'Alternative proposée'} par l'administration
              </h2>
{d.salle_demandee_occupee && (
  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2">
    La salle {d.salle_souhaitee_nom} que vous aviez demandée était déjà occupée à ce créneau — voici ce que l'administration propose à la place.
  </p>
)}
<p className="text-xs text-slate-400 mb-3">Choisissez l'option qui vous convient, ou refusez toutes les propositions.</p>
              <div className="space-y-2">
                {d.propositions.map((p, idx) => (
                  <div key={idx} className="bg-[#F0F8FF] border border-[#DCEBFA] rounded-xl p-4 flex items-center justify-between gap-4">
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

          {demande.statut === 'approuvee' && (
            <section className="border-t pt-5">
              <h2 className="font-semibold text-slate-700 mb-1">Salle attribuée</h2>
              <p className="text-sm text-slate-700">{d.salle_assignee_nom || '—'}</p>
            </section>
          )}

          {(demande.reponse_message || demande.traite_par_nom) && (
            <section className="border-t pt-5">
              <h2 className="font-semibold text-slate-700 mb-1">Réponse de l'administration</h2>
              {demande.reponse_message && <p className="text-sm text-slate-600 italic">"{demande.reponse_message}"</p>}
              {demande.traite_par_nom && <p className="text-xs text-slate-400 mt-1">— {demande.traite_par_nom}</p>}
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

export default DetailMaDemande;