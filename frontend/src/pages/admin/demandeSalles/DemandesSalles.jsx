import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Search, X, CalendarDays,
  UserCircle, Clock, CheckCircle2, XCircle
} from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';

const DemandesSalles = () => {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState([]);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');

    fetch(`${import.meta.env.VITE_API_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setDemandes(data.filter(n => n.type === 'demande_salle')));
  }, []);

  const filtered = useMemo(() => demandes.filter(d => {
    const name = d.titre?.replace('Demande de salle - ', '').toLowerCase() || '';
    if (search && !name.includes(search.toLowerCase())) return false;
    if (statut && d.statut !== statut) return false;

    const created = new Date(d.created_at);
    if (dateFrom && created < new Date(dateFrom)) return false;

    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (created > end) return false;
    }

    return true;
  }), [demandes, search, statut, dateFrom, dateTo]);

  const counts = {
    attente: demandes.filter(d => d.statut === 'en_attente').length,
    approuvee: demandes.filter(d => d.statut === 'approuvee').length,
    refusee: demandes.filter(d => d.statut === 'refusee').length,
    proposee: demandes.filter(d => d.statut === 'proposee').length,
  };

  const status = {
    en_attente: ['En attente', 'bg-amber-50 text-amber-600'],
    approuvee: ['Approuvée', 'bg-emerald-50 text-emerald-600'],
    refusee: ['Refusée', 'bg-red-50 text-red-500'],
    proposee: ['Proposée', 'bg-[#DCEBFA] text-[#0369A1]'],
  };

  const clearAll = () => {
    setSearch('');
    setStatut('');
    setDateFrom('');
    setDateTo('');
  };

  const active = search || statut || dateFrom || dateTo;

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-[#F1F5F9] px-4 py-3">
      <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-800 leading-none">{value}</p>
        <p className="text-[11px] text-slate-400 mt-1">{label}</p>
      </div>
    </div>
  );

  return (
    <AdminLayout>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center">
            <ClipboardList size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Demandes de salles
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {filtered.length} / {demandes.length} demandes
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard
          icon={Clock}
          label="En attente"
          value={counts.attente}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approuvées"
          value={counts.approuvee}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={XCircle}
          label="Refusées"
          value={counts.refusee}
          color="bg-red-50 text-red-500"
        />
        <StatCard
          icon={ClipboardList}
          label="Proposées"
          value={counts.proposee}
          color="bg-[#DCEBFA] text-[#0369A1]"
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">

        <div className="relative min-w-[160px] flex-1 max-w-[240px]">
          <Search size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1]" />
          <input
            placeholder="Rechercher une demande…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
          />
        </div>

        <select
          value={statut}
          onChange={e => setStatut(e.target.value)}
          className="text-xs rounded-full py-1.5 px-3 bg-white border border-[#E2E8F0] text-slate-500 focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="approuvee">Approuvée</option>
          <option value="refusee">Refusée</option>
          <option value="proposee">Proposée</option>
        </select>

        {/* Period */}
        <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 border border-[#E2E8F0]">
          <CalendarDays size={12} className="text-[#0369A1]" />

          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className={`text-xs bg-transparent focus:outline-none ${
              dateFrom ? 'text-[#0369A1] font-medium' : 'text-slate-400'
            }`}
          />

          <span className="text-[#0369A1]/40 text-[10px] font-bold">–</span>

          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className={`text-xs bg-transparent focus:outline-none ${
              dateTo ? 'text-[#0369A1] font-medium' : 'text-slate-400'
            }`}
          />
        </div>

        {active && (
          <button
            onClick={clearAll}
            className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
          >
            <X size={11} /> Tout effacer
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">

            <thead className="bg-[#DCEBFA]">
  <tr>
    <th className="text-left px-4 py-2.5 text-[#0369A1] font-semibold text-[10px] uppercase border-b border-[#E2E8F0]">
      <span className="flex items-center gap-1.5">
        <UserCircle size={12} /> Demandeur
      </span>
    </th>

    <th className="text-left px-4 py-2.5 text-[#0369A1] font-semibold text-[10px] uppercase border-b border-[#E2E8F0]">
      <span className="flex items-center gap-1.5">
        <CalendarDays size={12} /> Date cible
      </span>
    </th>

    <th className="text-left px-4 py-2.5 text-[#0369A1] font-semibold text-[10px] uppercase border-b border-[#E2E8F0]">
      <span className="flex items-center gap-1.5">
        <CalendarDays size={12} /> Créée le
      </span>
    </th>

    <th className="text-left px-4 py-2.5 text-[#0369A1] font-semibold text-[10px] uppercase border-b border-[#E2E8F0]">
      <span className="flex items-center gap-1.5">
        <CheckCircle2 size={12} /> Statut
      </span>
    </th>
  </tr>
</thead>
            <tbody>
              {filtered.map((d, i) => {
                const s = status[d.statut];

                return (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/admin/demandes-salles/${d.id}`)}
                    className={`cursor-pointer hover:bg-[#DCEBFA]/30 transition ${
                      i % 2 ? 'bg-[#F8FCFF]' : 'bg-white'
                    }`}
                  >
                   <td className="px-4 py-2.5 border-b border-[#E2E8F0]">
  <div className="flex items-center gap-2">
    <div className="w-7 h-7 rounded-full bg-[#DCEBFA] flex items-center justify-center">
      <UserCircle size={15} className="text-[#0369A1]" />
    </div>
    <span className="font-medium text-slate-700">
      {d.titre?.replace('Demande de salle - ', '') || '—'}
    </span>
  </div>
</td>

<td className="px-4 py-2.5 text-slate-400 border-b border-[#E2E8F0]">
  {d.data?.date_cible
    ? new Date(d.data.date_cible).toLocaleDateString('fr-FR')
    : '—'}
</td>

<td className="px-4 py-2.5 text-slate-400 border-b border-[#E2E8F0]">
  {new Date(d.created_at).toLocaleDateString('fr-FR')}
</td>

<td className="px-4 py-2.5 border-b border-[#E2E8F0]">
  <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
    s?.[1] || 'bg-slate-100 text-slate-500'
  }`}>
    {s?.[0] || 'En attente'}
  </span>
</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!filtered.length && (
            <div className="py-10 text-center text-xs text-slate-400">
              Aucune demande trouvée.
            </div>
          )}
        </div>
      </div>

    </AdminLayout>
  );
};

export default DemandesSalles;