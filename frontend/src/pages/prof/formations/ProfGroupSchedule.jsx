import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const SALLES = ['Salle 01', 'Salle 02', 'Salle 03', 'Salle 04', 'Salle 05'];
const JOURS  = ['samedi', 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi'];
const PERIODES = ['matin', 'midi'];
const PERIODE_LABEL = { matin: 'Matin', midi: 'A Midi' };

// key = "JOUR|SALLE|PERIODE"
const makeKey = (jour, salle, periode) => `${jour}|${salle}|${periode}`;

/**
 * Read-only "Emploi du temps" grid for professors.
 *
 * Uses the existing /api/schedules/me route (role: prof, already
 * scoped server-side to this prof's own groups via teacher_id),
 * then filters client-side down to this one group's rows.
 * No admin-only route is touched, no backend changes needed.
 */
const ProfGroupSchedule = ({ groupId }) => {
  const [cells, setCells] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[DEBUG] fetching schedule, groupId =', groupId);
        console.log('[DEBUG] API URL =', `${API}/api/schedules/me`);
        const res = await fetch(`${API}/api/schedules/me`, { headers: getHeaders() });
        console.log('[DEBUG] response status =', res.status);
        const data = await res.json();
        console.log('[DEBUG] raw data =', data);
        if (!res.ok) throw new Error(data.error || 'Erreur de chargement');

        const filtered = data.filter((row) => String(row.groups?.id) === String(groupId));
        console.log('[DEBUG] filtered rows for this group =', filtered);

        const map = {};
        filtered
          .forEach((row) => {
            const k = makeKey(row.jour_semaine, row.salle, row.periode);
            map[k] = {
              contenu: row.contenu ?? '',
              heure_debut: row.heure_debut ?? '',
              heure_fin: row.heure_fin ?? '',
            };
          });
        setCells(map);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [groupId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#F1F5F9] shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#DCEBFA]">
              <th className="border border-[#F1F5F9] px-3 py-2.5 text-[#0369A1] font-medium w-24 min-w-[6rem]" rowSpan={2} />
              {JOURS.map((jour) => (
                <th
                  key={jour}
                  colSpan={2}
                  className="border border-[#F1F5F9] px-3 py-2.5 text-center text-[#0369A1] font-semibold whitespace-nowrap capitalize"
                >
                  {jour}
                </th>
              ))}
            </tr>
            <tr className="bg-[#DCEBFA]">
              {JOURS.map((jour) =>
                PERIODES.map((p) => (
                  <th
                    key={`${jour}-${p}`}
                    className="border border-[#F1F5F9] px-2 py-1.5 text-center text-[#0369A1]/70 font-normal whitespace-nowrap"
                  >
                    {PERIODE_LABEL[p]}
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {SALLES.map((salle, si) => (
              <tr key={salle} className={si % 2 === 0 ? 'bg-white' : 'bg-[#F8FCFF]'}>
                <td className="border border-[#F1F5F9] px-3 py-2 font-medium text-slate-800 whitespace-nowrap bg-[#DCEBFA]/40">
                  {salle}
                </td>

                {JOURS.map((jour) =>
                  PERIODES.map((periode) => {
                    const k = makeKey(jour, salle, periode);
                    const cell = cells[k];

                    return (
                      <td
                        key={k}
                        className="border border-[#F1F5F9] p-0 align-top min-w-[7rem] w-[7rem]"
                      >
                        <div className="w-full h-full min-h-[3.5rem] text-left px-2 py-1.5">
                          {cell?.contenu ? (
                            <div className="space-y-0.5">
                              {(cell.heure_debut || cell.heure_fin) && (
                                <p className="text-[10px] text-[#0369A1] font-medium">
                                  {cell.heure_debut?.slice(0, 5)}{cell.heure_fin ? ` → ${cell.heure_fin.slice(0, 5)}` : ''}
                                </p>
                              )}
                              <p className="text-xs text-slate-800 leading-snug">{cell.contenu}</p>
                            </div>
                          ) : (
                            <span className="text-[#F1F5F9] text-lg leading-none">—</span>
                          )}
                        </div>
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProfGroupSchedule;