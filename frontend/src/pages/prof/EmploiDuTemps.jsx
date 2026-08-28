import { useEffect, useState, useCallback, useRef } from 'react';
import { CalendarDays, Clock, DoorClosed, BookOpen } from 'lucide-react';

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

  const fetchSchedule = useCallback(async () => {
    if (isFirstLoad.current) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [res, joursRes, sallesRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/schedules/me`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/schedules/jours`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/schedules/salles`, { headers }),
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

  const getCell = (salle, jour, periode) =>
    schedules.find((s) => s.salle === salle && s.jour_semaine === jour && s.periode === periode);

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
                    <th key={jour} colSpan={2}
                      className="border border-slate-700 px-3 py-2 bg-slate-900 text-white font-semibold uppercase text-[11px] capitalize">
                      {jour}
                    </th>
                  ))}
                </tr>
                <tr>
                  {jours.map((jour) =>
                    PERIODES.map((p) => (
                      <th key={`${jour}-${p}`} className="border border-slate-200 px-3 py-2 bg-white text-slate-500 font-semibold uppercase text-[10px]">
                        {PERIODE_META[p].label}
                      </th>
                    ))
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
                          <td key={`${salle}-${jour}-${periode}`} className="border border-slate-200 px-2 py-2 text-center align-top min-w-[100px]">
                            {s ? (
                              <div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] text-left">
                                <p className="font-semibold text-slate-700 leading-tight flex items-center gap-1">
                                  <BookOpen size={10} className="flex-shrink-0" />
                                  {s.groups?.nom}
                                </p>
                                {s.groups?.niveau?.nom && (
                                  <p className="text-[#0369A1] font-semibold leading-tight mt-0.5">{s.groups.niveau.nom}</p>
                                )}
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
    </div>
  );
};

export default EmploiDuTemps;