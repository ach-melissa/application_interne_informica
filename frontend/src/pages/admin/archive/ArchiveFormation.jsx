import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout';
import { ArrowLeft, Users, RotateCcw, Phone, Mail, CheckCircle2, ChevronRight } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

const statutMeta = {
  confirmed:     { label: 'Confirmé',     cls: 'bg-emerald-50 text-emerald-700' },
  pending:       { label: 'En attente',   cls: 'bg-amber-50 text-amber-700' },
  non_confirmed: { label: 'Non confirmé', cls: 'bg-red-50 text-red-500' },
  rejected:      { label: 'Rejeté',       cls: 'bg-slate-100 text-slate-500' },
};

const COLS = [
  { label: 'Étudiant',   Icon: null },
  { label: 'Téléphone',  Icon: Phone },
  { label: 'Email',      Icon: Mail },
  { label: 'Groupe',     Icon: Users },
  { label: 'Statut',     Icon: CheckCircle2 },
  { label: '',           Icon: null },
];

const ArchiveFormation = () => {
  const { year, formationId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('groupes');
  const [groups, setGroups] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [formationName, setFormationName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(null);

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
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs mb-3">
        <button onClick={() => navigate('/admin/archive')} className="text-slate-400 hover:text-[#0369A1] transition">
          Archive
        </button>
        <ChevronRight size={12} className="text-slate-300" />
        <button onClick={() => navigate(`/admin/archive/${year}`)} className="text-slate-400 hover:text-[#0369A1] transition">
          {year}
        </button>
        <ChevronRight size={12} className="text-slate-300" />
        <span className="text-[#0369A1] font-medium">{formationName || 'Formation'}</span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate(`/admin/archive/${year}`)}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-[#F1F5F9] hover:bg-[#DCEBFA] transition"
        >
          <ArrowLeft size={16} className="text-[#0369A1]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{formationName || 'Formation'}</h1>
          <p className="text-slate-400 text-xs mt-0.5">Année scolaire {year}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 mt-4">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-[#0F2A4A] text-white'
                : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">Erreur : {error}</p>}

      {/* Groupes archivés — cartes alignées sur le design de Groups.jsx */}
      {!loading && !error && activeTab === 'groupes' && (
        groups.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucun groupe archivé pour cette formation en {year}.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((g) => (
              <div
                key={g.id}
                className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                    <Users size={20} className="text-amber-600" />
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                    Archivé
                  </span>
                </div>

                <h2 className="text-slate-800 font-semibold text-base mb-1">{g.nom}</h2>
                <p className="text-slate-400 text-xs mb-4">
                  {g.teacher?.user ? `${g.teacher.user.nom} ${g.teacher.user.prenom}` : 'Aucun professeur assigné'}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mb-5">
                  <span className="flex items-center gap-1"><Users size={13} className="text-[#0369A1]" /> {g.nb_etudiants} étudiant(s)</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => navigate(`/admin/archive/${year}/${formationId}/groups/${g.id}`)}
                    className="flex items-center gap-1 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] border border-[#0369A1]/20 px-3 py-1.5 rounded-full hover:bg-[#c9e2f7] hover:shadow-sm active:scale-95 transition"
                  >
                    Voir détails <ChevronRight size={13} />
                  </button>
                  <button
                    onClick={() => restoreGroup(g.id)}
                    disabled={restoring === g.id}
                    className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-600/20 px-3 py-1.5 rounded-full hover:bg-emerald-100 hover:shadow-sm active:scale-95 transition disabled:opacity-40"
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
          <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#DCEBFA]">
                  <tr>
                    {COLS.map(({ label, Icon }, i) => (
                      <th key={label || i} className={`text-left px-3 py-2.5 text-[#0369A1] font-semibold text-[10px] tracking-wide uppercase border-b border-[#E2E8F0] whitespace-nowrap ${i === 0 ? 'border-l border-[#E2E8F0]' : ''}`}>
                        <div className="flex items-center gap-1">
                          {Icon && <Icon size={11} className="text-[#0369A1] flex-shrink-0" />}
                          <span>{label}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inscriptions.map((i, idx) => {
                    const sm = statutMeta[i.statut];
                    return (
                      <tr key={i.id} className={`hover:bg-[#DCEBFA]/30 transition ${idx % 2 === 1 ? 'bg-[#F8FCFF]' : 'bg-white'}`}>
                        <td className="px-3 py-2.5 border-b border-l border-[#E2E8F0]">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                              {(i.etudiant?.nom?.[0] ?? '?').toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-700 whitespace-nowrap">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">{i.etudiant?.telephone ?? '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">{i.etudiant?.email ?? '—'}</td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">{i.groups?.nom ?? '—'}</td>
                        <td className="px-3 py-2.5 border-b border-[#E2E8F0]">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sm?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                            {sm?.label ?? i.statut}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right border-b border-[#E2E8F0]">
                          <button
                            onClick={() => restoreInscription(i.id)}
                            disabled={restoring === i.id}
                            className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full hover:bg-emerald-100 transition disabled:opacity-40 ml-auto"
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