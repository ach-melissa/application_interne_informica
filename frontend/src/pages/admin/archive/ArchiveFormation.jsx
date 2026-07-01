import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import { ArrowLeft, Users, UserCheck, RotateCcw } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const statutMeta = {
  confirmed:     { label: 'Confirmé',     cls: 'bg-emerald-100 text-emerald-700' },
  pending:       { label: 'En attente',   cls: 'bg-amber-100 text-amber-700' },
  non_confirmed: { label: 'Non confirmé', cls: 'bg-red-100 text-red-600' },
  rejected:      { label: 'Rejeté',       cls: 'bg-slate-100 text-slate-500' },
};

const ArchiveFormation = () => {
  const { year, formationId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('groupes');
  const [groups, setGroups] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [formationName, setFormationName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(null); // id currently being restored

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/groups?formation_id=${formationId}&archived=true&annee_scolaire=${year}`, { headers }).then(r => r.json()),
      fetch(`${API}/api/etudiants?formation_id=${formationId}&archived=true&annee_scolaire=${year}`, { headers }).then(r => r.json()),
    ])
      .then(([g, i]) => {
        setGroups(g);
        setInscriptions(i);
        if (i[0]?.formation?.nom) setFormationName(i[0].formation.nom);
        else if (g[0]?.formations?.nom) setFormationName(g[0].formations.nom);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [year, formationId]);

  const restoreGroup = async (id) => {
    setRestoring(id);
    const token = localStorage.getItem('token');
    await fetch(`${API}/api/groups/${id}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setRestoring(null);
    fetchAll();
  };

  const restoreInscription = async (id) => {
    setRestoring(id);
    const token = localStorage.getItem('token');
    await fetch(`${API}/api/etudiants/${id}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setRestoring(null);
    fetchAll();
  };

  const TABS = [
    { key: 'groupes', label: `Groupes archivés (${groups.length})` },
    { key: 'inscriptions', label: `Inscriptions archivées (${inscriptions.length})` },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate(`/admin/archive/${year}`)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] hover:bg-gray-100 transition"
        >
          <ArrowLeft size={16} className="text-[#64748B]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{formationName || 'Formation'}</h1>
          <p className="text-slate-400 text-xs mt-0.5">Année scolaire {year}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-blue-100 mt-4">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">Erreur : {error}</p>}

      {/* Groupes archivés */}
      {!loading && !error && activeTab === 'groupes' && (
        groups.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucun groupe archivé pour cette formation en {year}.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((g) => (
              <div key={g.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-[#FFF7ED] rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-[#F97316]" />
                  </div>
                </div>
                <h2 className="text-[#1E293B] font-semibold text-base mb-1">{g.nom}</h2>
                <p className="text-[#64748B] text-xs mb-4">
                  {g.teacher?.user ? `${g.teacher.user.nom} ${g.teacher.user.prenom}` : 'Aucun professeur assigné'}
                </p>
                <div className="flex items-center gap-1 text-xs text-[#64748B] mb-5">
                  <Users size={13} /> {g.nb_etudiants} étudiant(s)
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => navigate(`/admin/archive/${year}/${formationId}/groups/${g.id}`)}
                    className="text-xs font-medium text-[#2563EB] border border-[#2563EB] px-3 py-1.5 rounded-lg hover:bg-[#EFF6FF] transition"
                  >
                    Voir détails
                  </button>
                  <button
                    onClick={() => restoreGroup(g.id)}
                    disabled={restoring === g.id}
                    className="flex items-center gap-1 text-xs font-medium text-emerald-600 border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition disabled:opacity-40"
                  >
                    <RotateCcw size={12} /> {restoring === g.id ? '...' : 'Restaurer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Inscriptions archivées */}
      {!loading && !error && activeTab === 'inscriptions' && (
        inscriptions.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucune inscription archivée pour cette formation en {year}.</p>
        ) : (
          <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-blue-50 border-b border-blue-100">
                  <tr>
                    {['Étudiant', 'Téléphone', 'Email', 'Groupe', 'Statut', ''].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-blue-500 font-semibold text-[10px] tracking-wide uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {inscriptions.map((i) => {
                    const sm = statutMeta[i.statut];
                    return (
                      <tr key={i.id} className="hover:bg-blue-50/40 transition">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">
                              {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-700 whitespace-nowrap">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{i.etudiant?.telephone ?? '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{i.etudiant?.email ?? '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{i.groups?.nom ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sm?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                            {sm?.label ?? i.statut}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => restoreInscription(i.id)}
                            disabled={restoring === i.id}
                            className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 border border-emerald-300 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition disabled:opacity-40 ml-auto"
                          >
                            <RotateCcw size={11} /> {restoring === i.id ? '...' : 'Restaurer'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </AdminLayout>
  );
};

export default ArchiveFormation;