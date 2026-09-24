import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Wallet, Tag, Users2, Calendar, Clock, Percent, ChevronRight, ChevronDown, X, GraduationCap, Plus, Phone } from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';

export const API = import.meta.env.VITE_API_URL;
export const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

// GET /api/salaires-professeurs (current month by default; optional ?mois=&annee=)
export const fetchProfesseurs = async () => {
  const res = await fetch(`${API}/api/salaires-professeurs`, { headers: getHeaders() });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'Erreur serveur');
  return data;
};

/* ------------------------------------------------------------------ */
/*  Helpers (exportés : utilisés aussi par DetailProfesseur)           */
/* ------------------------------------------------------------------ */

export const TYPES_SALAIRE = ['Fixe', "À l'heure", 'Pourcentage'];

const STATUT_STYLES = {
  payé: 'bg-emerald-50 text-emerald-600',
  en_attente: 'bg-amber-50 text-amber-600',
  à_saisir: 'bg-slate-100 text-slate-500',
};

export const fmt = (n) => n.toLocaleString('fr-DZ') + ' DA';

// montantLabel s'applique maintenant à UNE formation (elle porte son propre type/montant)
export const montantLabel = (f) => {
  if (!f.typeSalaire) return null;
  if (f.typeSalaire === 'Fixe') return fmt(f.montant) + ' / mois';
  if (f.typeSalaire === "À l'heure") return fmt(f.montant) + ' / h';
  return f.montant + ' %';
};

export const typeIcon = (type) => {
  if (type === "À l'heure") return Clock;
  if (type === 'Pourcentage') return Percent;
  return Wallet;
};

export const initiales = (nom = '') =>
  nom.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export const Badge = ({ statut }) => (
  <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap ${STATUT_STYLES[statut] ?? 'bg-slate-100 text-slate-500'}`}>
    {statut.replace('_', ' ')}
  </span>
);

export const StatTile = ({ icon: Icon, label, value, color = 'blue' }) => {
  const colors = {
    blue: 'bg-[#DCEBFA] text-[#0369A1]',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] px-4 py-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide truncate">{label}</p>
        <p className="text-sm font-bold text-[#0F2A4A]">{value}</p>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Données                                                            */
/* ------------------------------------------------------------------ */

const BASE_PATH = '/comptable/salaires/professeurs';

// Un professeur donne une ou plusieurs formations ; CHAQUE formation a son propre
// mode de paiement (typeSalaire) et montant. typeSalaire === null → non défini.
// Les données viennent de l'API (plus de données mock).
export const totalProfesseur = (p) => p.formations.reduce((s, f) => s + f.montantPeriode, 0);
/* ------------------------------------------------------------------ */
/*  Une carte = un professeur                                          */
/* ------------------------------------------------------------------ */

const ProfesseurCard = ({ professeur, onOpen }) => {
  const total = totalProfesseur(professeur);

  return (
    <div onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] transition flex flex-col h-full cursor-pointer">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-[#DCEBFA] rounded-full flex items-center justify-center text-sm font-bold text-[#0369A1] shrink-0">
          {initiales(professeur.nom)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-slate-800 font-semibold text-base truncate">{professeur.nom}</h2>
          <p className="text-xs text-slate-400 truncate">{professeur.poste}</p>
          {professeur.telephone && <p className="text-xs text-slate-400 flex items-center gap-1 truncate"><Phone size={11} className="text-[#0369A1] shrink-0" /> {professeur.telephone}</p>}
        </div>
      </div>

      {/* Une ligne par formation : nom + son propre mode de paiement */}
      <div className="space-y-1.5 mb-5 flex-1">
        {professeur.formations.map((f) => {
          const TypeIcon = f.typeSalaire ? typeIcon(f.typeSalaire) : Plus;
          return (
            <div key={f.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 min-w-0 text-slate-600 font-medium">
                <Tag size={12} className="text-[#0369A1] shrink-0" /> <span className="truncate">{f.nom}</span>
              </span>
              {f.typeSalaire ? (
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F0F7FE] text-[#0369A1] whitespace-nowrap">
                  <TypeIcon size={10} /> {f.typeSalaire}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 whitespace-nowrap">
                  Non défini
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#F1F5F9]">
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#0369A1]">
          <GraduationCap size={13} /> Voir les détails <ChevronRight size={13} />
        </span>
        {total > 0 && <span className="text-sm font-bold text-slate-700">{fmt(total)}</span>}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const SalairesProfesseurs = () => {
  const navigate = useNavigate();
  const [professeurs, setProfesseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfesseurs()
      .then(setProfesseurs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [search, setSearch] = useState('');
  const [typeFiltre, setTypeFiltre] = useState('');

  const filtered = professeurs.filter((p) =>
    p.nom.toLowerCase().includes(search.toLowerCase()) &&
    (!typeFiltre || p.formations.some((f) => f.typeSalaire === typeFiltre))
  );

  const totalSalaires = filtered.reduce((s, p) => s + totalProfesseur(p), 0);
  const salairesPayes = filtered.filter((p) => p.statut === 'payé').reduce((s, p) => s + totalProfesseur(p), 0);
  const salairesRestants = totalSalaires - salairesPayes;

  const openDetail = (professeur) => navigate(`${BASE_PATH}/${professeur.id}`, { state: { professeur, professeurs: filtered } });
  const hasFilters = search || typeFiltre || dateDebut || dateFin;
  const clearFilters = () => { setSearch(''); setTypeFiltre(''); setDateDebut(''); setDateFin(''); };

  return (
    <ComptableLayout>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0"><GraduationCap size={22} className="text-white" /></div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Salaires des professeurs</h1>
            <p className="text-slate-400 text-xs mt-0.5">{filtered.length} / {professeurs.length} professeur(s)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatTile icon={Wallet} label="Total des salaires" value={fmt(totalSalaires)} color="blue" />
        <StatTile icon={Users2} label="Nombre de professeurs" value={filtered.length} color="blue" />
        <StatTile icon={Wallet} label="Salaires payés" value={fmt(salairesPayes)} color="emerald" />
        <StatTile icon={Wallet} label="Salaires restants" value={fmt(salairesRestants)} color="amber" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <div className="relative min-w-[160px] flex-1 max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
        </div>

        <div className="w-px h-5 bg-[#E2E8F0]" />

        <div className="relative flex items-center">
          <Wallet size={13} className="absolute left-2.5 text-[#0369A1] pointer-events-none z-10" />
          <select value={typeFiltre} onChange={(e) => setTypeFiltre(e.target.value)}
            className={`appearance-none pl-8 pr-7 py-1.5 text-xs rounded-full bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer transition ${typeFiltre ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}>
            <option value="">Type de rémunération</option>
            {TYPES_SALAIRE.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {typeFiltre ? <button onClick={() => setTypeFiltre('')} className="absolute right-2 text-slate-300 hover:text-red-400"><X size={11} /></button> : <ChevronDown size={11} className="absolute right-2 text-slate-400 pointer-events-none" />}
        </div>

        <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 border border-[#E2E8F0]">
          <Calendar size={12} className="text-[#0369A1] flex-shrink-0" />
          <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className={`text-xs bg-transparent focus:outline-none transition ${dateDebut ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
          <span className="text-[#0369A1]/40 text-[10px] font-bold px-0.5">–</span>
          <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className={`text-xs bg-transparent focus:outline-none transition ${dateFin ? 'text-[#0369A1] font-medium' : 'text-slate-400'}`} />
        </div>

        {hasFilters && <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50"><X size={11} /> Tout effacer</button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((p) => (
            <ProfesseurCard key={p.id} professeur={p} onOpen={() => openDetail(p)} />
          ))}
        </div>
      ) : (
        <p className="text-slate-400 text-sm">Aucun professeur ne correspond à ces filtres.</p>
      )}
    </ComptableLayout>
  );
};

export default SalairesProfesseurs;