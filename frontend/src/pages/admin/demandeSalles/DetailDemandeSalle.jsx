import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, UserRound, GraduationCap,
  UsersRound, CalendarDays, Clock3, DoorOpen, Repeat, RefreshCw, ChevronDown, Pencil } from 'lucide-react';
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

const DetailDemandeSalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [demande, setDemande] = useState(null);
  const [salles, setSalles] = useState([]);
  const [salleId, setSalleId] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [reponse, setReponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [erreur, setErreur] = useState(null);

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
      const [n, s] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/notifications`, { headers: headers() }),
        fetch(`${import.meta.env.VITE_API_URL}/api/schedules/salles`, { headers: headers() }),
      ]);

      if (n.ok) {
        const found = (await n.json()).find((x) => x.id === id);
        setDemande(found);
        // Pré-coche la salle demandée par le prof si elle existe, sinon rien
        setSalleId(found?.data?.salle_souhaitee_id || '');
      }
      if (s.ok) setSalles(await s.json());
    };
    load();
  }, [id]);

  const traiter = async (statut) => {
    if (statut === 'approuvee' && !salleId) {
      setErreur('Sélectionnez une salle.');
      return;
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

  const d = demande.data || {};
  const enAttente = demande.statut === 'en_attente' || !demande.statut;
  const isChangement = d.type_demande === 'changement';
  const salleChoisie = salles.find((s) => s.id === salleId);

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
                      className="w-full flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-left outline-none focus:border-[#0369A1]"
                    >
                      <span className={salleId ? 'text-slate-700' : 'text-slate-400'}>
                        {salleChoisie ? salleChoisie.nom : 'Sélectionner une salle'}
                      </span>
                      <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {salles.map((s) => (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => { setSalleId(s.id); setDropdownOpen(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left ${
                              salleId === s.id ? 'text-[#0369A1] font-medium' : 'text-slate-700'
                            }`}
                          >
                            {s.nom}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
                    disabled={submitting}
                    onClick={() => traiter('approuvee')}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[#0369A1] rounded-lg hover:bg-[#0F2A4A] disabled:opacity-50"
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
                      {salles.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
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