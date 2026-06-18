import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Clock, DollarSign, BookOpen, UserCheck } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';

const Formations = () => {
  const [formations, setFormations] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('formations');
  const [loading, setLoading] = useState(true);
  const [loadingInscriptions, setLoadingInscriptions] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFormations = async () => {
      try {
const token = localStorage.getItem('token');
const res = await fetch(`${import.meta.env.VITE_API_URL}/api/formations`, {
  headers: { Authorization: `Bearer ${token}` }
});
if (!res.ok) throw new Error('Erreur serveur');
        const data = await res.json();
        setFormations(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFormations();
  }, []);

  const fetchInscriptionsConfirmed = async () => {
    setLoadingInscriptions(true);
    try {
const token = localStorage.getItem('token');
const res = await fetch(`${import.meta.env.VITE_API_URL}/api/inscriptions?statut=confirmed`, {
  headers: { Authorization: `Bearer ${token}` }
});
if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      setInscriptions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingInscriptions(false);
    }
  };

  const fetchInscriptionsByFormation = async (formation) => {
    setLoadingInscriptions(true);
    setSelectedFormation(formation);
    try {
const token = localStorage.getItem('token');
const res = await fetch(`${import.meta.env.VITE_API_URL}/api/inscriptions?formation_id=${formation.id}`, {
  headers: { Authorization: `Bearer ${token}` }
});
if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      setInscriptions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingInscriptions(false);
    }
  };

  const filtered = formations.filter((f) =>
    f.nom.toLowerCase().includes(search.toLowerCase())
  );

  const filteredInscriptions = inscriptions.filter((i) =>
    `${i.etudiant?.nom} ${i.etudiant?.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
    i.etudiant?.telephone?.includes(search)
  );

  const InscriptionsTable = () => (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <tr>
            <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Étudiant</th>
            <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Téléphone</th>
            <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Email</th>
            <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Niveau</th>
            <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Adresse</th>
            <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Formation</th>
            <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Date inscription</th>
            <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F1F5F9]">
          {filteredInscriptions.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-10 text-[#94A3B8]">
                Aucun étudiant trouvé.
              </td>
            </tr>
          ) : (
            filteredInscriptions.map((i) => (
              <tr key={i.id} className="hover:bg-[#F8FAFC] transition">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                      <UserCheck size={14} className="text-[#2563EB]" />
                    </div>
                    <span className="font-medium text-[#1E293B]">
                      {i.etudiant?.nom} {i.etudiant?.prenom}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{i.etudiant?.telephone ?? '—'}</td>
                <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{i.etudiant?.email ?? '—'}</td>
                <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{i.etudiant?.niveau_scolaire ?? '—'}</td>
                <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{i.etudiant?.adresse ?? '—'}</td>
                <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{i.formation?.nom ?? '—'}</td>
                <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
                  {i.date_inscription ? new Date(i.date_inscription).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    i.statut === 'confirmed' ? 'bg-green-100 text-green-600' :
                    i.statut === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-red-100 text-red-500'
                  }`}>
                    {i.statut === 'confirmed' ? 'Confirmé' :
                     i.statut === 'pending' ? 'En attente' : 'Non confirmé'}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Formations</h1>
          <p className="text-[#64748B] text-sm mt-1">
            {view === 'formations'
              ? `${formations.length} formations disponibles`
              : view === 'all_inscriptions'
              ? `${inscriptions.length} étudiants confirmés`
              : `Inscriptions — ${selectedFormation?.nom}`}
          </p>
        </div>
        {view === 'formations' && (
          <button className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-lg hover:bg-[#1D4ED8] transition text-sm font-medium">
            <Plus size={18} />
            Ajouter une formation
          </button>
        )}
      </div>

      {/* Tabs — only formations & all_inscriptions, NOT formation_inscriptions */}
      {view !== 'formation_inscriptions' && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setView('formations'); setSearch(''); setSelectedFormation(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === 'formations'
                ? 'bg-[#2563EB] text-white'
                : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
            }`}
          >
            Formations
          </button>
          <button
            onClick={() => { setView('all_inscriptions'); setSearch(''); setSelectedFormation(null); fetchInscriptionsConfirmed(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === 'all_inscriptions'
                ? 'bg-[#2563EB] text-white'
                : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
            }`}
          >
            Tous les inscriptions
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          placeholder={view === 'formations' ? 'Rechercher une formation...' : 'Rechercher un étudiant...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
        />
      </div>

      {/* Loading */}
      {(loading || loadingInscriptions) && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      )}

      {/* VIEW: Formations */}
      {view === 'formations' && !loading && !error && (
        <>
          {filtered.length === 0 ? (
            <p className="text-[#64748B] text-sm">Aucune formation trouvée.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((f) => (
                <div key={f.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-[#EFF6FF] rounded-lg flex items-center justify-center">
                      <BookOpen size={20} className="text-[#2563EB]" />
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      f.statut === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {f.statut === 'active' ? 'Active' : 'Non active'}
                    </span>
                  </div>
                  <h2 className="text-[#1E293B] font-semibold text-base mb-1">{f.nom}</h2>
                  <p className="text-[#64748B] text-xs mb-4">{f.teacher?.nom ?? 'Aucun professeur assigné'}</p>
                  <div className="flex items-center gap-4 text-xs text-[#64748B] mb-5">
                    {f.heures > 0 && (
                      <span className="flex items-center gap-1"><Clock size={13} /> {f.heures}h</span>
                    )}
                    <span className="flex items-center gap-1">
                      <DollarSign size={13} /> {Number(f.prix).toLocaleString()} DA
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => navigate(`/admin/formations/${f.id}/groups`)}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#2563EB] border border-[#2563EB] px-3 py-1.5 rounded-lg hover:bg-[#EFF6FF] transition"
                    >
                      <Users size={13} /> Groupes
                    </button>
                    <button
                      onClick={() => {
                        setSearch('');
                        fetchInscriptionsByFormation(f);
                        setView('formation_inscriptions');
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#10B981] border border-[#10B981] px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition"
                    >
                      <UserCheck size={13} /> Inscriptions
                    </button>
                    <button className="text-xs font-medium text-[#F97316] border border-[#F97316] px-3 py-1.5 rounded-lg hover:bg-orange-50 transition">
                      Modifier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* VIEW: Tous les inscriptions confirmés */}
      {view === 'all_inscriptions' && !loadingInscriptions && !error && (
        <InscriptionsTable />
      )}

      {/* VIEW: Inscriptions par formation */}
      {view === 'formation_inscriptions' && !loadingInscriptions && !error && (
        <>
          <button
            onClick={() => { setView('formations'); setSelectedFormation(null); setSearch(''); }}
            className="mb-4 text-xs text-[#2563EB] hover:underline flex items-center gap-1"
          >
            ← Retour aux formations
          </button>
          <p className="mb-4 text-sm font-semibold text-[#1E293B]">
            Inscriptions — {selectedFormation?.nom} ({filteredInscriptions.length} étudiants)
          </p>
          <InscriptionsTable />
        </>
      )}
    </AdminLayout>
  );
};

export default Formations;