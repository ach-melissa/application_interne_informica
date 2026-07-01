import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';
import PaymentsTab from '../formations/groups/PaymentsTab';
import PaymentHistoryModal from '../formations/groups/PaymentHistoryModal';
import ScheduleTab from '../formations/groups/ScheduleTab';
import PointageTab from '../formations/groups/PointageTab';

const API = import.meta.env.VITE_API_URL;

const statutMeta = {
  confirmed:     { label: 'Confirmé',     cls: 'bg-emerald-100 text-emerald-700' },
  pending:       { label: 'En attente',   cls: 'bg-amber-100 text-amber-700' },
  non_confirmed: { label: 'Non confirmé', cls: 'bg-red-100 text-red-600' },
};

const ArchiveGroupDetail = () => {
  const { year, formationId, groupId } = useParams();
  const navigate = useNavigate();
  const [etudiants, setEtudiants] = useState([]);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [activeTab, setActiveTab] = useState('etudiants');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/groups?formation_id=${formationId}&archived=true&annee_scolaire=${year}`, { headers }).then(r => r.json()),
      fetch(`${API}/api/groups/${groupId}/etudiants`, { headers }).then(r => r.json()),
    ])
      .then(([groups, etudiantsData]) => {
        setGroup(groups.find(g => g.id === groupId));
        setEtudiants(etudiantsData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [groupId]);

  const restoreGroup = async () => {
    setRestoring(true);
    const token = localStorage.getItem('token');
    await fetch(`${API}/api/groups/${groupId}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setRestoring(false);
    navigate(`/admin/archive/${year}/${formationId}`);
  };

  const TABS = [
    { key: 'etudiants', label: 'Étudiants' },
    { key: 'paiements', label: 'Paiements' },
    { key: 'emploi',    label: 'Emploi du temps' },
    { key: 'pointage',  label: 'Pointage' },
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/admin/archive/${year}/${formationId}`)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-blue-100 hover:bg-blue-50 transition">
            <ArrowLeft size={15} className="text-blue-500" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{group?.nom ?? 'Groupe'}</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Prof : {group?.teacher?.user ? `${group.teacher.user.nom} ${group.teacher.user.prenom}` : 'Non assigné'}
              {' · '}{etudiants.length} étudiant(s)
              {' · '}Année {year}
            </p>
          </div>
        </div>
        <button
          onClick={restoreGroup}
          disabled={restoring}
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition disabled:opacity-40"
        >
          <RotateCcw size={13} /> {restoring ? 'Restauration...' : 'Restaurer le groupe'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-blue-100">
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

      {/* Étudiants tab */}
      {!loading && !error && activeTab === 'etudiants' && (
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-blue-50 border-b border-blue-100">
                <tr>
                  {['Étudiant','Téléphone','Email','Niveau','Adresse','Date naissance','Statut'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-blue-500 font-semibold text-[10px] tracking-wide uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {etudiants.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Aucun étudiant trouvé.</td></tr>
                ) : etudiants.map(i => {
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
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{i.etudiant?.niveau_scolaire ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500 max-w-[150px] truncate">{i.etudiant?.adresse ?? '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                        {i.etudiant?.date_naissance ? new Date(i.etudiant.date_naissance).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${sm?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                          {sm?.label ?? i.statut}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && activeTab === 'paiements' && (
        <PaymentsTab groupId={groupId} onSelectStudent={setSelectedStudent} />
      )}
      {!loading && !error && activeTab === 'emploi' && (
        <ScheduleTab groupId={groupId} readOnly />
      )}
      {!loading && !error && activeTab === 'pointage' && (
        <PointageTab groupId={groupId} etudiants={etudiants.map(i => i.etudiant)} group={group} readOnly />
      )}

      <PaymentHistoryModal
        student={selectedStudent}
        formationId={group?.formation_id}
        onClose={() => setSelectedStudent(null)}
        readOnly
      />
    </AdminLayout>
  );
};

export default ArchiveGroupDetail;