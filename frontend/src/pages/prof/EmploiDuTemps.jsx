import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'samedi', 'dimanche'];
const PERIODES = ['matin', 'midi'];

const EmploiDuTemps = () => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/schedules/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    fetchSchedule();
  }, []);

  // Grouper : { salle -> { jour -> { periode -> [séances] } } }
  const salles = [...new Set(schedules.map(s => s.salle))].sort();

  const getSeances = (salle, jour, periode) =>
    schedules.filter(s => s.salle === salle && s.jour_semaine === jour && s.periode === periode);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <CalendarDays size={22} className="text-blue-600" />
        <h1 className="text-xl font-bold text-[#1E293B]">Mon Emploi du Temps</h1>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Chargement…</p>
      ) : schedules.length === 0 ? (
        <p className="text-sm text-gray-400">Aucune séance assignée.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="w-full text-xs border-collapse bg-white">
            <thead>
              <tr>
                {/* Colonne vide pour salle + periode */}
                <th className="border border-[#E2E8F0] px-3 py-2 bg-[#F8FAFC] w-20" rowSpan={2}></th>
                {JOURS.map(jour => (
                  <th
                    key={jour}
                    colSpan={2}
                    className="border border-[#E2E8F0] px-3 py-2 bg-[#EFF6FF] text-[#2563EB] font-semibold text-center"
                  >
                    {jour}
                  </th>
                ))}
              </tr>
              <tr>
                {JOURS.map(jour =>
                  PERIODES.map(p => (
                    <th
                      key={`${jour}-${p}`}
                      className="border border-[#E2E8F0] px-2 py-1 bg-[#F8FAFC] text-[#64748B] font-medium text-center capitalize"
                    >
                      {p}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {salles.map(salle => (
                <tr key={salle}>
                  <td className="border border-[#E2E8F0] px-3 py-2 bg-[#F8FAFC] font-semibold text-[#1E293B] text-center whitespace-nowrap">
                    {salle}
                  </td>
                  {JOURS.map(jour =>
                    PERIODES.map(periode => {
                      const seances = getSeances(salle, jour, periode);
                      return (
                        <td
                          key={`${salle}-${jour}-${periode}`}
                          className="border border-[#E2E8F0] px-2 py-1.5 align-top min-w-[90px]"
                        >
                          {seances.length === 0 ? (
                            <span className="text-gray-200">—</span>
                          ) : (
                            seances.map(s => (
                              <div
                                key={s.id}
                                className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-1.5 py-1 mb-1"
                              >
                                <p className="font-semibold text-[#1D4ED8] leading-tight">{s.groups?.nom}</p>
                                <p className="text-[#64748B] leading-tight">
                                  {s.heure_debut?.slice(0, 5)} – {s.heure_fin?.slice(0, 5)}
                                </p>
                                {s.contenu && (
                                  <p className="text-[#94A3B8] leading-tight truncate">{s.contenu}</p>
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
      )}
    </div>
  );
};

export default EmploiDuTemps;