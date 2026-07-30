import AdminLayout from '../../../layouts/AdminLayout';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  Users, BookOpen, AlertTriangle, MapPin,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────
// DONNÉES STATIQUES (mock) — à remplacer par des fetch API plus tard
// ────────────────────────────────────────────────────────────

const formations = [
  { nom: 'Anglais A1',              groupes: 2, etudiants: 34 },
  { nom: 'Anglais B1',              groupes: 1, etudiants: 12 },
  { nom: 'Informatique Bureautique',groupes: 3, etudiants: 45 },
  { nom: 'Comptabilité',            groupes: 1, etudiants: 8  },
  { nom: 'Français A1',             groupes: 0, etudiants: 0  },
  { nom: 'Allemand A1',             groupes: 0, etudiants: 0  },
  { nom: 'Design Graphique',        groupes: 0, etudiants: 0  },
];

const formationsOubliees = formations.filter(
  (f) => f.groupes === 0 && f.etudiants === 0
);

const formationsActives = formations.filter(
  (f) => !(f.groupes === 0 && f.etudiants === 0)
);

const totalEtudiants = formations.reduce((sum, f) => sum + f.etudiants, 0);

const wilayaData = [
  { wilaya: 'Alger',     etudiants: 120 },
  { wilaya: 'Blida',     etudiants: 45  },
  { wilaya: 'Boumerdès', etudiants: 30  },
  { wilaya: 'Tipaza',    etudiants: 22  },
  { wilaya: 'Oran',      etudiants: 15  },
  { wilaya: 'Constantine',etudiants: 10 },
  { wilaya: 'Béjaïa',    etudiants: 8   },
  { wilaya: 'Sétif',     etudiants: 5   },
];

const ageData = [
  { tranche: '15-18', etudiants: 40 },
  { tranche: '19-22', etudiants: 85 },
  { tranche: '23-26', etudiants: 60 },
  { tranche: '27-30', etudiants: 35 },
  { tranche: '31-40', etudiants: 20 },
  { tranche: '40+',   etudiants: 10 },
];

// Personnes ayant amené le plus d'étudiants (parrainage / apporteur)
const topApporteurs = [
  { nom: 'Ahmed Benali',   etudiants: 25 },
  { nom: 'Sara Khaled',    etudiants: 18 },
  { nom: 'Yacine Meziane', etudiants: 15 },
  { nom: 'Amina Cherif',   etudiants: 12 },
  { nom: 'Karim Boudiaf',  etudiants: 9  },
];

// Inscriptions par mois + formation la plus demandée ce mois-là
const monthlyData = [
  { mois: 'Jan', inscriptions: 8,  topFormation: 'Anglais A1',              topCount: 5 },
  { mois: 'Fév', inscriptions: 12, topFormation: 'Informatique Bureautique',topCount: 7 },
  { mois: 'Mar', inscriptions: 20, topFormation: 'Informatique Bureautique',topCount: 11 },
  { mois: 'Avr', inscriptions: 15, topFormation: 'Anglais A1',              topCount: 8  },
  { mois: 'Mai', inscriptions: 25, topFormation: 'Anglais B1',              topCount: 13 },
  { mois: 'Jun', inscriptions: 19, topFormation: 'Comptabilité',            topCount: 9  },
   { mois: 'Jun', inscriptions: 19, topFormation: 'Comptabilité',            topCount: 9  },
    { mois: 'Jun', inscriptions: 19, topFormation: 'Comptabilité',            topCount: 9  },
     { mois: 'Jun', inscriptions: 19, topFormation: 'Comptabilité',            topCount: 9  },
      { mois: 'Jun', inscriptions: 19, topFormation: 'Comptabilité',            topCount: 9  },
       { mois: 'Jun', inscriptions: 19, topFormation: 'Comptabilité',            topCount: 9  },
        { mois: 'Jun', inscriptions: 19, topFormation: 'Comptabilité',            topCount: 9  },
];

const topFormations = [...formationsActives]
  .sort((a, b) => b.etudiants - a.etudiants)
  .map((f) => ({ nom: f.nom, etudiants: f.etudiants }));

// ────────────────────────────────────────────────────────────
// COMPOSANTS UTILITAIRES
// ────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, tone = 'default' }) => (
  <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] p-5 flex items-center gap-4">
    <div
      className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
        tone === 'warning' ? 'bg-amber-50' : 'bg-[#DCEBFA]'
      }`}
    >
      <Icon size={20} className={tone === 'warning' ? 'text-amber-500' : 'text-[#0369A1]'} />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] p-5">
    <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-medium text-slate-700 mb-0.5">{label}</p>
      <p className="text-[#0369A1]">{payload[0].value} étudiant(s)</p>
    </div>
  );
};
const MonthlyTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      <p className="text-[#0369A1] mb-1">{d.inscriptions} inscription(s) au total</p>
      <p className="text-slate-400">
        Formation la plus demandée : <span className="text-slate-600 font-medium">{d.topFormation}</span> ({d.topCount})
      </p>
    </div>
  );
};
// ────────────────────────────────────────────────────────────
// PAGE
// ────────────────────────────────────────────────────────────

const Statistique = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Statistique</h1>
          <p className="text-sm text-slate-400 mt-0.5">Vue d'ensemble de l'activité</p>
        </div>

        {/* ── Cartes résumé ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total étudiants inscrits" value={totalEtudiants} />
          <StatCard icon={BookOpen} label="Formations actives" value={formationsActives.length} />
          <StatCard
            icon={AlertTriangle}
            label="Formations oubliées"
            value={formationsOubliees.length}
            tone="warning"
          />
          <StatCard icon={MapPin} label="Wilayas couvertes" value={wilayaData.length} />
        </div>

        {/* ── Formations oubliées ── */}
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700">
              Formations jamais lancées ({formationsOubliees.length})
            </h3>
          </div>
          {formationsOubliees.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune formation oubliée 🎉</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {formationsOubliees.map((f) => (
                <span
                  key={f.nom}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100"
                >
                  {f.nom}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3">
            Aucun groupe créé et aucun étudiant inscrit sur ces formations d'apres une semaine.
          </p>
        </div>
{/* ── Inscriptions par mois (pleine largeur) ── */}
  <ChartCard title="Inscriptions par mois">
  <ResponsiveContainer width="100%" height={280}>
    <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
      <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#64748B' }} />
      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
      <Tooltip content={<MonthlyTooltip />} cursor={{ stroke: '#DCEBFA', strokeWidth: 2 }} />
      <Line
        type="monotone"
        dataKey="inscriptions"
        stroke="#0369A1"
        strokeWidth={2}
        dot={{ r: 4, fill: '#0369A1' }}
        activeDot={{ r: 6 }}
      />
    </LineChart>
  </ResponsiveContainer>
</ChartCard>
        {/* ── Graphiques ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Étudiants par wilaya">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={wilayaData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="wilaya" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="etudiants" fill="#0369A1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Étudiants par tranche d'âge">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ageData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="tranche" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="etudiants" fill="#0F2A4A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top apporteurs (personnes ayant amené le plus d'étudiants)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topApporteurs} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="nom"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="etudiants" radius={[6, 6, 0, 0]}>
                  {topApporteurs.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#0369A1' : '#7DB8E8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Formations avec le plus d'étudiants">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topFormations} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="nom"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="etudiants" fill="#0369A1" radius={[6, 6, 0, 0]}>
                  {topFormations.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#0F2A4A' : '#0369A1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Statistique;