import { useEffect, useState, useCallback, useRef } from 'react';
import { CalendarDays, Clock, DoorClosed, BookOpen } from 'lucide-react';

const JOURS = ['samedi', 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi'];
const PERIODES = ['matin', 'midi'];
const PERIODE_META = {
  matin: { label: 'Matin' },
  midi:  { label: 'A Midi'},
};

const POLL_INTERVAL_MS = 30000; // 30s — ajuste selon ton besoin

const EmploiDuTemps = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isFirstLoad = useRef(true);

  const fetchSchedule = useCallback(async () => {
    // pas de spinner plein écran pour les refetch silencieux, seulement au premier chargement
    if (isFirstLoad.current) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/schedules/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
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

    // Refetch quand l'onglet redevient actif (le prof revient sur la page)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchSchedule();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Refetch périodique en fond, tant que l'onglet est visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchSchedule();
    }, POLL_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(interval);
    };
  }, [fetchSchedule]);


  // Grouper : { salle -> { jour -> { periode -> [séances] } } }
  const salles = [...new Set(schedules.map(s => s.salle))].sort();

  const getSeances = (salle, jour, periode) =>
    schedules.filter(s => s.salle === salle && s.jour_semaine === jour && s.periode === periode);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-9 h-9 rounded-full bg-[#DCEBFA] text-[#0369A1] flex items-center justify-center flex-shrink-0">
          <CalendarDays size={16} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#1E293B]">Mon emploi du temps</h1>
          <p className="text-[#64748B] text-xs mt-0.5">Vue hebdomadaire de vos séances</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      )}

      {!loading && !error && (
        schedules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#F1F5F9] shadow-[0_2px_10px_rgba(15,42,74,0.08)] py-16 text-center">
            <CalendarDays size={28} className="mx-auto text-slate-200 mb-2" />
            <p className="text-sm text-[#94A3B8]">Aucune séance assignée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] bg-white">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="border border-[#F1F5F9] px-3 py-2 bg-[#DCEBFA]" rowSpan={2}></th>
                  {JOURS.map(jour => (
                    <th
                      key={jour}
                      colSpan={2}
                      className="border border-[#F1F5F9] px-3 py-2 bg-[#DCEBFA] text-[#0369A1] font-semibold capitalize"
                    >
                      {jour}
                    </th>
                  ))}
                </tr>
                <tr>
                  {JOURS.map(jour =>
PERIODES.map(p => {
  const { label } = PERIODE_META[p];
  return (
    <th
      key={`${jour}-${p}`}
      className="border border-[#F1F5F9] px-3 py-2 bg-[#DCEBFA] text-[#0369A1]/70 font-medium"
    >
      {label}
    </th>
  );
})
                  )}
                </tr>
              </thead>
              <tbody>
                {salles.map(salle => (
                  <tr key={salle}>
                    <td className="border border-[#F1F5F9] px-3 py-3 font-semibold text-slate-800 bg-[#DCEBFA]/40 whitespace-nowrap">
                      <span className="flex items-center justify-center gap-1.5">
                        <DoorClosed size={12} className="text-[#0369A1]" />
                        {salle}
                      </span>
                    </td>
                    {JOURS.map(jour =>
                      PERIODES.map(periode => {
                        const seances = getSeances(salle, jour, periode);
                        return (
                          <td
                            key={`${salle}-${jour}-${periode}`}
                            className="border border-[#F1F5F9] px-2 py-2 text-center align-top min-w-[100px]"
                          >
{seances.length === 0 ? null : (
                              seances.map(s => (
                                <div
                                  key={s.id}
                                  className="bg-[#DCEBFA] rounded-lg px-2 py-1.5 mb-1 text-[10px] text-left"
                                >
                                  <p className="font-semibold text-[#0369A1] leading-tight flex items-center gap-1">
                                    <BookOpen size={10} className="flex-shrink-0" />
                                    {s.groups?.nom}
                                  </p>
                                  <p className="text-[#0369A1]/60 leading-tight flex items-center gap-1 mt-0.5">
                                    <Clock size={10} className="flex-shrink-0" />
                                    {s.heure_debut?.slice(0, 5)} – {s.heure_fin?.slice(0, 5)}
                                  </p>
                                  {s.contenu && (
                                    <p className="text-[#94A3B8] leading-tight truncate mt-0.5">{s.contenu}</p>
                                  )}
                                </div>
                              ))
                            )}
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
    </div>
  );
};

export default EmploiDuTemps;