import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';

const JOURS = ['samedi', 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi'];
const PERIODES = ['matin', 'midi'];
const SALLES = ['Salle 01', 'Salle 02', 'Salle 03', 'Salle 04', 'Salle 05'];

const EmploisGlobal = () => {
  const { id } = useParams(); // formation_id
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/schedules/formation/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Erreur serveur');
        const data = await res.json();
        setSchedules(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [id]);

  // trouve le schedule pour une salle + jour + periode
  const getCell = (salle, jour, periode) =>
    schedules.find(
      (s) => s.salle === salle && s.jour_semaine === jour && s.periode === periode
    );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Emploi Global</h1>
          <p className="text-[#64748B] text-sm mt-1">Vue globale des salles</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-[#2563EB] hover:underline"
        >
          ← Retour
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse bg-white rounded-2xl shadow-sm">
            <thead>
              <tr>
                <th className="border border-[#E2E8F0] px-3 py-2 bg-[#F8FAFC]" rowSpan={2}></th>
                {JOURS.map((jour) => (
                  <th
                    key={jour}
                    colSpan={2}
                    className="border border-[#E2E8F0] px-3 py-2 bg-[#F8FAFC] text-[#1E293B] font-semibold capitalize"
                  >
                    {jour}
                  </th>
                ))}
              </tr>
              <tr>
                {JOURS.map((jour) =>
                  PERIODES.map((p) => (
                    <th
                      key={`${jour}-${p}`}
                      className="border border-[#E2E8F0] px-3 py-2 bg-[#F8FAFC] text-[#94A3B8] font-medium"
                    >
                      {p === 'matin' ? 'Matin' : 'A Midi'}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {SALLES.map((salle) => (
                <tr key={salle}>
                  <td className="border border-[#E2E8F0] px-3 py-3 font-semibold text-[#1E293B] bg-[#F8FAFC] whitespace-nowrap">
                    {salle}
                  </td>
                  {JOURS.map((jour) =>
                    PERIODES.map((periode) => {
                      const cell = getCell(salle, jour, periode);
                      return (
                        <td
                          key={`${jour}-${periode}`}
                          className="border border-[#E2E8F0] px-2 py-2 text-center text-[#64748B] min-w-[90px]"
                        >
                          {cell ? (
                            <div className="bg-[#EFF6FF] rounded-lg px-2 py-1 text-[#2563EB] font-medium text-[10px]">
                              <div>{cell.groups?.nom ?? '—'}</div>
                              <div className="text-[#94A3B8]">{cell.heure_debut?.slice(0,5)} - {cell.heure_fin?.slice(0,5)}</div>
                            </div>
                          ) : (
                            <span className="text-[#E2E8F0]">+</span>
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
    </AdminLayout>
  );
};

export default EmploisGlobal;