import { useState, useEffect } from 'react';
import { Search, User, Plus } from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';
import AddEtudiantModal from './AddEtudiantModal';
import EtudiantDetailModal from './EtudiantDetailModal';

const TRY_OPTIONS = ['repondu', 'non_repondu', 'occupe', 'injoignable', 'P_bureau', 'ferme'];
const REGISTERED_BY_OPTIONS = ['hanane', 'yasmine', 'page_facebook', 'amira'];
const SOURCE_OPTIONS = ['Amis/Famille', 'Instagram', 'TikTok', 'Facebook', 'Recherche Google', 'Site Web', 'Bouche-à-oreille', 'Publicité', 'Autre'];
const STATUT_OPTIONS = ['pending', 'confirmed', 'non_confirmed'];

const statutLabel = (val) => {
  if (val === 'confirmed') return 'Confirmé';
  if (val === 'pending') return 'En attente';
  if (val === 'non_confirmed') return 'Non confirmé';
  return val;
};

const statutColor = (val) => {
  if (val === 'confirmed') return 'bg-green-100 text-green-600';
  if (val === 'pending') return 'bg-yellow-100 text-yellow-600';
  if (val === 'non_confirmed') return 'bg-red-100 text-red-500';
  return 'bg-gray-100 text-gray-500';
};

const tryColor = (val) => {
  if (val === 'repondu') return 'bg-green-100 text-green-700';
  if (val === 'non_repondu') return 'bg-red-100 text-red-600';
  if (val === 'occupe') return 'bg-orange-100 text-orange-600';
  if (val === 'injoignable') return 'bg-gray-100 text-gray-500';
  if (val === 'P_bureau') return 'bg-blue-100 text-blue-600';
  if (val === 'ferme') return 'bg-purple-100 text-purple-600';
  return 'bg-gray-50 text-gray-400';
};

const TrySelect = ({ value, onChange }) => (
  <select
    value={value ?? TRY_OPTIONS[0]}
    onChange={(e) => onChange(e.target.value)}
    className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${tryColor(value ?? TRY_OPTIONS[0])}`}
  >
    {TRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

const API = import.meta.env.VITE_API_URL;

const Students = () => {
  const [etudiants, setEtudiants] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedInscription, setSelectedInscription] = useState(null);

  const fetchEtudiants = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/etudiants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      setEtudiants(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEtudiants(); }, []);

  const updateField = async (id, field, value) => {
    setEtudiants((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API}/api/etudiants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const filtered = etudiants.filter((i) =>
    `${i.etudiant?.nom} ${i.etudiant?.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
    i.etudiant?.telephone?.includes(search)
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Étudiants</h1>
          <p className="text-[#64748B] text-sm mt-1">{etudiants.length} inscriptions</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[#b8995a] text-white px-4 py-2.5 rounded-lg hover:bg-[#a0854d] transition text-sm font-medium"
        >
          <Plus size={18} />
          Ajouter
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">Erreur : {error}</p>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Étudiant</th>
                <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Téléphone</th>
                <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Formation</th>
                <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Date</th>
                <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">1er appel</th>
                <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">2ème appel</th>
                <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">3ème appel</th>
                <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Source</th>
                <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Enregistré par</th>
                <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-[#94A3B8]">Aucun étudiant trouvé.</td>
                </tr>
              ) : (
                filtered.map((i) => (
                  <tr key={i.id} onClick={() => setSelectedInscription(i)} className="hover:bg-[#F8FAFC] transition cursor-pointer">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                          <User size={14} className="text-[#2563EB]" />
                        </div>
                        <span className="font-medium text-[#1E293B]">{i.etudiant?.nom} {i.etudiant?.prenom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{i.etudiant?.telephone ?? '—'}</td>
                    <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{i.formation?.nom ?? '—'}</td>
                    <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">
                      {i.date_inscription ? new Date(i.date_inscription).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <TrySelect value={i.first_try} onChange={(val) => updateField(i.id, 'first_try', val)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <TrySelect value={i.second_try} onChange={(val) => updateField(i.id, 'second_try', val)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <TrySelect value={i.third_try} onChange={(val) => updateField(i.id, 'third_try', val)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={i.source ?? SOURCE_OPTIONS[0]}
                        onChange={(e) => updateField(i.id, 'source', e.target.value)}
                        className="text-xs text-[#64748B] bg-transparent focus:outline-none cursor-pointer"
                      >
                        {SOURCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={i.registered_by ?? REGISTERED_BY_OPTIONS[0]}
                        onChange={(e) => updateField(i.id, 'registered_by', e.target.value)}
                        className="text-xs text-[#64748B] bg-transparent focus:outline-none cursor-pointer"
                      >
                        {REGISTERED_BY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={i.statut ?? 'pending'}
                        onChange={(e) => updateField(i.id, 'statut', e.target.value)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${statutColor(i.statut)}`}
                      >
                        {STATUT_OPTIONS.map((o) => <option key={o} value={o}>{statutLabel(o)}</option>)}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddEtudiantModal onClose={() => setShowAdd(false)} onSuccess={() => { fetchEtudiants(); setShowAdd(false); }} />
      )}
      {selectedInscription && (
        <EtudiantDetailModal inscription={selectedInscription} onClose={() => setSelectedInscription(null)} onSuccess={fetchEtudiants} />
      )}
    </AdminLayout>
  );
};

export default Students;