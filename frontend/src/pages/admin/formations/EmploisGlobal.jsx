import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';

const PERIODES = ['matin', 'midi'];

const EmploisGlobal = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [jours, setJours] = useState([]);
const [salles, setSalles] = useState([]);
  const [formation, setFormation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const token = localStorage.getItem('token');
const [schedRes, formRes, joursRes, sallesRes] = await Promise.all([
  fetch(`${import.meta.env.VITE_API_URL}/api/schedules/formation/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  fetch(`${import.meta.env.VITE_API_URL}/api/formations/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  fetch(`${import.meta.env.VITE_API_URL}/api/schedules/jours`, { headers: { Authorization: `Bearer ${token}` } }),
  fetch(`${import.meta.env.VITE_API_URL}/api/schedules/salles`, { headers: { Authorization: `Bearer ${token}` } }),
]);
if (!schedRes.ok) throw new Error('Erreur serveur');
setSchedules(await schedRes.json());
if (formRes.ok) setFormation(await formRes.json());
if (joursRes.ok) setJours(await joursRes.json());
if (sallesRes.ok) setSalles((await sallesRes.json()).map((s) => s.nom));
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
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs mb-3">
        <button onClick={() => navigate('/admin/formations')} className="text-slate-400 hover:text-[#0369A1] transition">
          Formations
        </button>
        <ChevronRight size={12} className="text-slate-300" />
        <span className="text-[#0369A1] font-medium">{formation?.nom ?? 'Emploi global'}</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-[#F1F5F9] hover:bg-[#DCEBFA] transition"
        >
          <ArrowLeft size={16} className="text-[#0369A1]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Emploi Global</h1>
          <p className="text-slate-400 text-xs mt-0.5">{formation?.nom ?? `Formation #${id}`} — vue globale des salles</p>
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
                  PERIODES.map((p) => (
                    <th
                      key={`${jour}-${p}`}
className="border border-slate-200 px-3 py-2 bg-white text-slate-500 font-semibold uppercase text-[10px]"
 >
                      {p === 'matin' ? 'Matin' : 'A Midi'}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {salles.map((salle) => (
                <tr key={salle}>
<td className="border border-slate-700 px-3 py-3 font-semibold text-white bg-slate-900 whitespace-nowrap">
   {salle}
                  </td>
                  {jours.map((jour) =>
                    PERIODES.map((periode) => {
                      const cell = getCell(salle, jour, periode);
                      return (
                        <td
                          key={`${jour}-${periode}`}
className="border border-slate-200 px-2 py-2 text-center text-slate-500 min-w-[90px]"
 >
                          {cell ? (
<div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium text-[10px]">
  <div>{cell.groups?.nom ?? '—'}</div>
  <div className="text-slate-500">{cell.heure_debut?.slice(0,5)} - {cell.heure_fin?.slice(0,5)}</div>
</div>
                          ) : (
                            <span className="text-slate-300"></span>
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