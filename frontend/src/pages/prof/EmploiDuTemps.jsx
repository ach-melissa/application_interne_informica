import { useEffect, useState, useCallback, useRef } from 'react';
import { CalendarDays, Clock, DoorClosed, BookOpen, Plus, X } from 'lucide-react';


const PERIODES = ['matin', 'midi'];
const PERIODE_META = {
  matin: { label: 'Matin' },
  midi: { label: 'A Midi' },
};

const POLL_INTERVAL_MS = 30000;

const EmploiDuTemps = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isFirstLoad = useRef(true);
  const [jours, setJours] = useState([]);
  const [salles, setSalles] = useState([]);

  // ── Demande de salle ──
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [form, setForm] = useState({
    jour_semaine: '',
    periode: '',
    heure_debut: '',
    heure_fin: '',
    groupe_id: '',
    message: '',
  });

const fetchSchedule = useCallback(async () => {
  if (isFirstLoad.current) setLoading(true);
  try {
    const token = localStorage.getItem('token');
    const [res, joursRes, sallesRes] = await Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/api/schedules/me`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${import.meta.env.VITE_API_URL}/api/schedules/jours`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${import.meta.env.VITE_API_URL}/api/schedules/salles`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (!res.ok) throw new Error('Erreur serveur');
    const data = await res.json();
    setSchedules(Array.isArray(data) ? data : []);
    if (joursRes.ok) setJours(await joursRes.json());
    if (sallesRes.ok) setSalles((await sallesRes.json()).map((s) => s.nom));
    setError(null);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
    isFirstLoad.current = false;
  }
}, []);

  useEffect(() => {
    fetchSchedule();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchSchedule();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchSchedule();
    }, POLL_INTERVAL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchSchedule]);

  const groupesUniques = Array.from(
    new Map(schedules.filter((s) => s.groups).map((s) => [s.groups.id ?? s.group_id, s.groups])).values()
  );

  const getCell = (salle, jour, periode) =>
    schedules.find((s) => s.salle === salle && s.jour_semaine === jour && s.periode === periode);

  const resetForm = () => {
    setForm({ jour_semaine: '', periode: '', heure_debut: '', heure_fin: '', groupe_id: '', message: '' });
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const openModal = () => { resetForm(); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.jour_semaine || !form.periode || !form.heure_debut || !form.heure_fin) {
      setSubmitError('Merci de remplir tous les champs obligatoires.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/demande-salle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de l\'envoi de la demande.');
      }
      setSubmitSuccess(true);
      setTimeout(() => setShowModal(false), 1200);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-[#DCEBFA] text-[#0369A1] flex items-center justify-center flex-shrink-0">
            <CalendarDays size={16} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B]">Mon emploi du temps</h1>
            <p className="text-[#64748B] text-xs mt-0.5">Vue hebdomadaire de vos séances</p>
          </div>
        </div>

        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0369A1] text-white text-sm font-medium hover:bg-[#0369A1]/90 transition"
        >
          <Plus size={16} />
          Demander une salle
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
<div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      )}

      {!loading && !error && (
        salles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-[0_2px_10px_rgba(15,42,74,0.08)] py-16 text-center">
            <CalendarDays size={28} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm text-[#94A3B8]">Aucune séance assignée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] bg-white">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
<th className="border border-slate-700 px-3 py-2 bg-slate-900" rowSpan={2}></th>
 {jours.map((jour) => (
                    <th
                      key={jour}
                      colSpan={2}
className="border border-slate-700 px-3 py-2 bg-slate-900 text-white font-semibold uppercase text-[11px] capitalize"
>
                      {jour}
                    </th>
                  ))}
                </tr>
                <tr>
                  {jours.map((jour) =>
                    PERIODES.map((p) => {
                      const { label } = PERIODE_META[p];
                      return (
                        <th
                          key={`${jour}-${p}`}
className="border border-slate-200 px-3 py-2 bg-white text-slate-500 font-semibold uppercase text-[10px]"
>
                          {label}
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>
              <tbody>
                {salles.map((salle) => (
                  <tr key={salle}>
<td className="border border-slate-700 px-3 py-3 font-semibold text-white bg-slate-900 whitespace-nowrap">
  <span className="flex items-center justify-center gap-1.5">
    <DoorClosed size={12} className="text-white" />
                        {salle}
                      </span>
                    </td>
                    {jours.map((jour) =>
                      PERIODES.map((periode) => {
                        const s = getCell(salle, jour, periode);
                        return (
                          <td
                            key={`${salle}-${jour}-${periode}`}
className="border border-slate-200 px-2 py-2 text-center align-top min-w-[100px]"
>
                            {s ? (
<div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] text-left">
  <p className="font-semibold text-slate-700 leading-tight flex items-center gap-1">
     <BookOpen size={10} className="flex-shrink-0" />
                                  {s.groups?.nom}
                                </p>
<p className="text-slate-500 leading-tight flex items-center gap-1 mt-0.5">
   <Clock size={10} className="flex-shrink-0" />
                                  {s.heure_debut?.slice(0, 5)} – {s.heure_fin?.slice(0, 5)}
                                </p>
                                {s.contenu && (
                                  <p className="text-[#94A3B8] leading-tight truncate mt-0.5">{s.contenu}</p>
                                )}
                              </div>
                            ) : null}
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Modale demande de salle ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-bold text-[#1E293B] mb-1">Demander une salle</h2>
            <p className="text-xs text-[#64748B] mb-5">
              Votre demande sera envoyée à l'administration.
            </p>

            {submitSuccess ? (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-lg px-4 py-3">
                Demande envoyée avec succès.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#64748B] mb-1">Jour</label>
                    <select
                      value={form.jour_semaine}
                      onChange={(e) => setForm({ ...form, jour_semaine: e.target.value })}
                      className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm capitalize"
                    >
                      <option value="">Choisir…</option>
                      {jours.map((j) => <option key={j} value={j} className="capitalize">{j}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748B] mb-1">Période</label>
                    <select
                      value={form.periode}
                      onChange={(e) => setForm({ ...form, periode: e.target.value })}
                      className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Choisir…</option>
                      {PERIODES.map((p) => (
                        <option key={p} value={p}>{PERIODE_META[p].label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#64748B] mb-1">Heure début</label>
                    <input
                      type="time"
                      value={form.heure_debut}
                      onChange={(e) => setForm({ ...form, heure_debut: e.target.value })}
                      className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#64748B] mb-1">Heure fin</label>
                    <input
                      type="time"
                      value={form.heure_fin}
                      onChange={(e) => setForm({ ...form, heure_fin: e.target.value })}
                      className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {groupesUniques.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-[#64748B] mb-1">Groupe (optionnel)</label>
                    <select
                      value={form.groupe_id}
                      onChange={(e) => setForm({ ...form, groupe_id: e.target.value })}
                      className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Aucun</option>
                      {groupesUniques.map((g) => (
                        <option key={g.id} value={g.id}>{g.nom}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Message (optionnel)</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={2}
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm resize-none"
                    placeholder="Précision utile pour l'admin…"
                  />
                </div>

                {submitError && (
                  <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#0369A1] text-white text-sm font-medium rounded-lg py-2.5 hover:bg-[#0369A1]/90 transition disabled:opacity-50"
                >
                  {submitting ? 'Envoi…' : 'Envoyer la demande'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmploiDuTemps;