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
};
const STATUT_LABEL = {
  en_attente: 'En attente',
  approuvee: 'Approuvée',
  refusee: 'Refusée',
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

          {demande.message && (
            <section className="border-t pt-5">
              <h2 className="font-semibold text-slate-700 mb-1">Votre message</h2>
              <p className="text-sm text-slate-600">{demande.message}</p>
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