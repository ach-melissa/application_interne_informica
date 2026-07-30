import { useState, useMemo, useEffect } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import {
  Users, BookOpen, AlertTriangle, MapPin, Home, ChevronRight,
  Calendar, Filter, Info, BarChart3, PieChart as PieChartIcon,
  Users2, Share2 as Share2Icon, CalendarClock,
} from 'lucide-react';

const moisOrdre = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const trancheAge = (age) => {
  if (age < 18) return '- 18';
  if (age <= 25) return '18 - 25';
  if (age <= 30) return '26 - 30';
  if (age <= 35) return '31 - 35';
  if (age <= 40) return '36 - 40';
  return '+ 40';
};

// Couleurs associées à chaque formation pour le donut "Étudiants par formation"
const formationColors = {
  'Anglais A1': '#2563EB',
  'Comptabilité': '#0D9488',
  'Anglais B1': '#7C3AED',
  'Informatique Bureautique': '#F97316',
  'Français A1': '#DB2777',
  'Allemand A1': '#65A30D',
  'Design Graphique': '#0EA5E9',
};

const computeStats = (data, toutesLesFormations) => {
  const totalEtudiants = data.length;

  const formationsCount = toutesLesFormations.map((nom) => {
    const inscriptions = data.filter((i) => i.formation === nom);
    return { nom, etudiants: inscriptions.length };
  });

  const formationsActives = formationsCount.filter((f) => f.etudiants > 0);
  const formationsOubliees = formationsCount.filter((f) => f.etudiants === 0);

  // Wilayas dynamiques : celles réellement présentes dans les données, pas une liste figée
  const wilayaCounts = {};
  data.forEach((i) => {
    if (!i.wilaya) return;
    wilayaCounts[i.wilaya] = (wilayaCounts[i.wilaya] || 0) + 1;
  });
  const wilayaData = Object.entries(wilayaCounts)
    .map(([wilaya, etudiants]) => ({ wilaya, etudiants }))
    .sort((a, b) => b.etudiants - a.etudiants);

  const tranches = ['- 18', '18 - 25', '26 - 30', '31 - 35', '36 - 40', '+ 40'];
  const ageData = tranches.map((tranche) => ({
    tranche,
    etudiants: data.filter((i) => i.age != null && trancheAge(i.age) === tranche).length,
  }));

  const apporteurCounts = {};
  data.forEach((i) => {
    if (!i.apporteur) return;
    apporteurCounts[i.apporteur] = (apporteurCounts[i.apporteur] || 0) + 1;
  });
  const topApporteurs = Object.entries(apporteurCounts)
    .map(([nom, etudiants]) => ({ nom, etudiants }))
    .sort((a, b) => b.etudiants - a.etudiants)
    .slice(0, 5);

  const sourceCounts = {};
  data.forEach((i) => {
    if (!i.source) return;
    sourceCounts[i.source] = (sourceCounts[i.source] || 0) + 1;
  });
  const sourceData = Object.entries(sourceCounts)
    .map(([source, etudiants]) => ({ source, etudiants }))
    .sort((a, b) => b.etudiants - a.etudiants);

  const monthlyMap = {};
  data.forEach((i) => {
    if (!monthlyMap[i.mois]) monthlyMap[i.mois] = { mois: i.mois, inscriptions: 0, formationCounts: {} };
    monthlyMap[i.mois].inscriptions += 1;
    monthlyMap[i.mois].formationCounts[i.formation] =
      (monthlyMap[i.mois].formationCounts[i.formation] || 0) + 1;
  });
  const monthlyData = moisOrdre
    .filter((m) => monthlyMap[m])
    .map((m) => {
      const entry = monthlyMap[m];
      const [topFormation, topCount] = Object.entries(entry.formationCounts)
        .sort((a, b) => b[1] - a[1])[0] || ['—', 0];
      return { mois: m, inscriptions: entry.inscriptions, topFormation, topCount };
    });

  const topFormations = [...formationsActives].sort((a, b) => b.etudiants - a.etudiants);

  // Données du donut "Étudiants par formation" (basées sur les formations actives)
  const formationPieData = topFormations.map((f) => ({
    name: f.nom,
    value: f.etudiants,
    pct: totalEtudiants ? Math.round((f.etudiants / totalEtudiants) * 100) : 0,
    color: formationColors[f.nom] || '#94A3B8',
  }));

  return {
    totalEtudiants, formationsActives, formationsOubliees,
    wilayaData, ageData, topApporteurs, sourceData, monthlyData, topFormations, formationPieData,
  };
};


// ────────────────────────────────────────────────────────────
// COMPOSANTS UTILITAIRES
// ────────────────────────────────────────────────────────────


// ────────────────────────────────────────────────────────────
// COMPOSANTS UTILITAIRES
// ────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, accentBar, iconBg, iconColor }) => (
  <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
    <div className={`h-1 ${accentBar}`} />
    <div className="p-5">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
      <p className="text-3xl font-bold text-slate-800 mt-3 leading-none">{value}</p>
    </div>
  </div>
);

const ChartCard = ({ title, icon: Icon, iconBg = 'bg-[#DCEBFA]', iconColor = 'text-[#0369A1]', children }) => (
  <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] p-5">
    <div className="flex items-center gap-2 mb-4">
      {Icon && (
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={14} className={iconColor} />
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    </div>
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

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-medium text-slate-700 mb-0.5">{d.name}</p>
      <p style={{ color: d.color }}>{d.value} étudiant(s) ({d.pct}%)</p>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// PAGE
// ────────────────────────────────────────────────────────────

const Statistique = () => {
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  const [inscriptions, setInscriptions] = useState([]);
  const [formationsListe, setFormationsListe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const chargerStatistiques = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch('/api/statistiques');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur lors du chargement des statistiques.');
        setInscriptions(data.inscriptions || []);
        setFormationsListe(data.formations || []);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };
    chargerStatistiques();
  }, []);

  const anneesDisponibles = useMemo(
    () => [...new Set(inscriptions.map((i) => i.annee))].sort((a, b) => b - a),
    [inscriptions]
  );

  const filteredData = useMemo(() => {
    return inscriptions.filter((i) => {
      const yearMatch = selectedYear === 'all' || i.annee === Number(selectedYear);
      const monthMatch = selectedMonth === 'all' || i.mois === selectedMonth;
      return yearMatch && monthMatch;
    });
  }, [inscriptions, selectedYear, selectedMonth]);

  const stats = useMemo(
    () => computeStats(filteredData, formationsListe),
    [filteredData, formationsListe]
  );

  const {
    totalEtudiants, formationsActives, formationsOubliees,
    wilayaData, ageData, topApporteurs, sourceData, monthlyData, formationPieData,
  } = stats;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-sm text-slate-400">
          Chargement des statistiques…
        </div>
      </AdminLayout>
    );
  }

  if (errorMsg) {
    return (
      <AdminLayout>
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] p-5 text-sm text-red-500">
          Impossible de charger les statistiques : {errorMsg}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* ── En-tête + fil d'ariane ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
              <BarChart3 size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Statistiques</h1>
          </div>

          <div className="flex items-center gap-1.5 text-sm">
            <Home size={15} className="text-slate-400" />
            <span className="text-slate-400">Accueil</span>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-[#0369A1] font-medium">Statistiques</span>
          </div>
        </div>

        {/* ── Barre de filtres ── */}
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[180px]">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                <Calendar size={13} /> Année
              </label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedMonth('all'); // reset le mois quand on change d'année
                }}
                className="w-full text-sm font-medium text-slate-600 bg-white border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer"
              >
                <option value="all">Toutes les années</option>
                {anneesDisponibles.map((annee) => (
                  <option key={annee} value={annee}>{annee}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                <Calendar size={13} /> Mois
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                disabled={selectedYear === 'all'}
                className="w-full text-sm font-medium text-slate-600 bg-white border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="all">Tous les mois</option>
                {moisOrdre.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="bg-[#0369A1] hover:bg-[#0369A1]/90 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 shrink-0"
            >
              <Filter size={15} />
              Filtrer
            </button>
          </div>
        </div>

        {/* ── Cartes résumé ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total étudiants"
            value={totalEtudiants}
            accentBar="bg-[#2563EB]"
            iconBg="bg-[#DCEBFA]"
            iconColor="text-[#2563EB]"
          />
          <StatCard
            icon={BookOpen}
            label="Formations actives"
            value={formationsActives.length}
            accentBar="bg-[#059669]"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <StatCard
            icon={AlertTriangle}
            label="Formations oubliées"
            value={formationsOubliees.length}
            accentBar="bg-[#F97316]"
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
          />
          <StatCard
            icon={MapPin}
            label="Wilayas couvertes"
            value={wilayaData.length}
            accentBar="bg-[#7C3AED]"
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
          />
        </div>

        {/* ── Formations oubliées (détail) ── */}
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

        {/* ── Évolution des inscriptions + Répartition par formation ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Évolution des inscriptions par mois" icon={BarChart3}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData} margin={{ top: 25, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip content={<MonthlyTooltip />} cursor={{ stroke: '#DCEBFA', strokeWidth: 2 }} />
                <Line
                  type="monotone"
                  dataKey="inscriptions"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                >
                  <LabelList dataKey="inscriptions" position="top" style={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Étudiants par formation" icon={PieChartIcon}>
            {formationPieData.length === 0 ? (
              <p className="text-sm text-slate-400 py-10 text-center">Aucune donnée pour cette période.</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="w-[170px] h-[220px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={formationPieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        startAngle={90}
                        endAngle={-270}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {formationPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3.5">
                  {formationPieData.map((f) => (
                    <div key={f.name} className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: f.color }} />
                      <div>
                        <p className="text-sm text-slate-600 leading-tight">{f.name}</p>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">
                          {f.value} ({f.pct}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        {/* ── Wilaya + Âge ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Étudiants par wilaya" icon={MapPin}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={wilayaData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="wilaya" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="etudiants" fill="#2563EB" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="etudiants" position="top" style={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Répartition des étudiants par âge" icon={CalendarClock}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ageData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="tranche" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="etudiants" fill="#2563EB" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="etudiants" position="top" style={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Top 5 apporteurs + Top 5 sources ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Top 5 des apporteurs" icon={Users2}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={topApporteurs}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="nom"
                  tick={{ fontSize: 12, fill: '#334155' }}
                  width={100}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="etudiants" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={18}>
                  <LabelList dataKey="etudiants" position="right" style={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top 5 des sources" icon={Share2Icon}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={sourceData.slice(0, 5)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="source"
                  tick={{ fontSize: 12, fill: '#334155' }}
                  width={100}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="etudiants" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={18}>
                  <LabelList dataKey="etudiants" position="right" style={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
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