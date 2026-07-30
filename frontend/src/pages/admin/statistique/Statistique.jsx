import { useState, useMemo } from 'react';
import AdminLayout from '../../../layouts/AdminLayout';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  Users, BookOpen, AlertTriangle, MapPin, Share2,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────
// DONNÉES STATIQUES (mock) — à remplacer par des fetch API plus tard
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
// DONNÉES BRUTES MOCK — une ligne par inscription
// (à remplacer plus tard par un fetch API type: GET /api/inscriptions/stats)
// ────────────────────────────────────────────────────────────

const rawInscriptions = [
  { annee: 2025, mois: 'Jan', formation: 'Anglais A1', wilaya: 'Oran', age: 33, apporteur: 'Yacine Meziane', source: 'TikTok' },
  { annee: 2025, mois: 'Jan', formation: 'Anglais B1', wilaya: 'Constantine', age: 34, apporteur: 'Amina Cherif', source: 'Facebook' },
  { annee: 2025, mois: 'Jan', formation: 'Informatique Bureautique', wilaya: 'Constantine', age: 37, apporteur: 'Karim Boudiaf', source: 'Publicité' },
  { annee: 2025, mois: 'Jan', formation: 'Comptabilité', wilaya: 'Blida', age: 20, apporteur: 'Amina Cherif', source: 'Bouche-à-oreille' },
  { annee: 2025, mois: 'Jan', formation: 'Anglais A1', wilaya: 'Tipaza', age: 24, apporteur: 'Yacine Meziane', source: 'Recherche Google' },
  { annee: 2025, mois: 'Jan', formation: 'Anglais A1', wilaya: 'Oran', age: 33, apporteur: 'Yacine Meziane', source: 'Bouche-à-oreille' },
  { annee: 2025, mois: 'Fév', formation: 'Comptabilité', wilaya: 'Béjaïa', age: 23, apporteur: 'Ahmed Benali', source: 'Publicité' },
  { annee: 2025, mois: 'Fév', formation: 'Anglais A1', wilaya: 'Blida', age: 31, apporteur: 'Karim Boudiaf', source: 'Facebook' },
  { annee: 2025, mois: 'Fév', formation: 'Informatique Bureautique', wilaya: 'Constantine', age: 19, apporteur: 'Ahmed Benali', source: 'Facebook' },
  { annee: 2025, mois: 'Fév', formation: 'Anglais B1', wilaya: 'Béjaïa', age: 36, apporteur: 'Sara Khaled', source: 'Amis/Famille' },
  { annee: 2025, mois: 'Mar', formation: 'Anglais A1', wilaya: 'Béjaïa', age: 29, apporteur: 'Amina Cherif', source: 'Publicité' },
  { annee: 2025, mois: 'Mar', formation: 'Anglais B1', wilaya: 'Tipaza', age: 31, apporteur: 'Sara Khaled', source: 'Recherche Google' },
  { annee: 2025, mois: 'Mar', formation: 'Informatique Bureautique', wilaya: 'Oran', age: 21, apporteur: 'Yacine Meziane', source: 'TikTok' },
  { annee: 2025, mois: 'Mar', formation: 'Comptabilité', wilaya: 'Alger', age: 27, apporteur: 'Sara Khaled', source: 'Instagram' },
  { annee: 2025, mois: 'Avr', formation: 'Comptabilité', wilaya: 'Oran', age: 30, apporteur: 'Ahmed Benali', source: 'TikTok' },
  { annee: 2025, mois: 'Avr', formation: 'Informatique Bureautique', wilaya: 'Tipaza', age: 33, apporteur: 'Sara Khaled', source: 'Facebook' },
  { annee: 2025, mois: 'Avr', formation: 'Anglais B1', wilaya: 'Oran', age: 27, apporteur: 'Karim Boudiaf', source: 'Publicité' },
  { annee: 2025, mois: 'Avr', formation: 'Anglais A1', wilaya: 'Alger', age: 21, apporteur: 'Sara Khaled', source: 'Amis/Famille' },
  { annee: 2025, mois: 'Avr', formation: 'Comptabilité', wilaya: 'Blida', age: 21, apporteur: 'Ahmed Benali', source: 'Bouche-à-oreille' },
  { annee: 2025, mois: 'Avr', formation: 'Anglais B1', wilaya: 'Oran', age: 34, apporteur: 'Karim Boudiaf', source: 'Amis/Famille' },
  { annee: 2025, mois: 'Mai', formation: 'Anglais A1', wilaya: 'Oran', age: 35, apporteur: 'Ahmed Benali', source: 'Bouche-à-oreille' },
  { annee: 2025, mois: 'Mai', formation: 'Anglais B1', wilaya: 'Constantine', age: 28, apporteur: 'Sara Khaled', source: 'Bouche-à-oreille' },
  { annee: 2025, mois: 'Mai', formation: 'Informatique Bureautique', wilaya: 'Oran', age: 34, apporteur: 'Yacine Meziane', source: 'Recherche Google' },
  { annee: 2025, mois: 'Mai', formation: 'Comptabilité', wilaya: 'Boumerdès', age: 20, apporteur: 'Ahmed Benali', source: 'Amis/Famille' },
  { annee: 2025, mois: 'Mai', formation: 'Anglais A1', wilaya: 'Constantine', age: 33, apporteur: 'Ahmed Benali', source: 'Facebook' },
  { annee: 2025, mois: 'Jun', formation: 'Comptabilité', wilaya: 'Constantine', age: 37, apporteur: 'Amina Cherif', source: 'TikTok' },
  { annee: 2025, mois: 'Jun', formation: 'Anglais B1', wilaya: 'Boumerdès', age: 33, apporteur: 'Amina Cherif', source: 'Recherche Google' },
  { annee: 2025, mois: 'Jun', formation: 'Anglais A1', wilaya: 'Boumerdès', age: 35, apporteur: 'Sara Khaled', source: 'Recherche Google' },
  { annee: 2025, mois: 'Jun', formation: 'Informatique Bureautique', wilaya: 'Béjaïa', age: 30, apporteur: 'Ahmed Benali', source: 'Instagram' },
  { annee: 2025, mois: 'Jun', formation: 'Anglais A1', wilaya: 'Boumerdès', age: 27, apporteur: 'Sara Khaled', source: 'Amis/Famille' },
  { annee: 2025, mois: 'Jul', formation: 'Informatique Bureautique', wilaya: 'Béjaïa', age: 24, apporteur: 'Amina Cherif', source: 'Instagram' },
  { annee: 2025, mois: 'Jul', formation: 'Anglais B1', wilaya: 'Sétif', age: 24, apporteur: 'Yacine Meziane', source: 'Instagram' },
  { annee: 2025, mois: 'Jul', formation: 'Anglais A1', wilaya: 'Alger', age: 21, apporteur: 'Yacine Meziane', source: 'Facebook' },
  { annee: 2025, mois: 'Jul', formation: 'Comptabilité', wilaya: 'Tipaza', age: 27, apporteur: 'Yacine Meziane', source: 'Bouche-à-oreille' },
  { annee: 2025, mois: 'Jul', formation: 'Anglais A1', wilaya: 'Boumerdès', age: 33, apporteur: 'Sara Khaled', source: 'Recherche Google' },
  { annee: 2025, mois: 'Jul', formation: 'Informatique Bureautique', wilaya: 'Blida', age: 26, apporteur: 'Karim Boudiaf', source: 'Instagram' },
  { annee: 2025, mois: 'Aoû', formation: 'Anglais A1', wilaya: 'Sétif', age: 34, apporteur: 'Sara Khaled', source: 'Recherche Google' },
  { annee: 2025, mois: 'Aoû', formation: 'Anglais B1', wilaya: 'Oran', age: 22, apporteur: 'Amina Cherif', source: 'Bouche-à-oreille' },
  { annee: 2025, mois: 'Aoû', formation: 'Comptabilité', wilaya: 'Boumerdès', age: 26, apporteur: 'Karim Boudiaf', source: 'TikTok' },
  { annee: 2025, mois: 'Aoû', formation: 'Informatique Bureautique', wilaya: 'Boumerdès', age: 25, apporteur: 'Karim Boudiaf', source: 'Recherche Google' },
  { annee: 2025, mois: 'Aoû', formation: 'Anglais B1', wilaya: 'Blida', age: 20, apporteur: 'Amina Cherif', source: 'Amis/Famille' },
  { annee: 2025, mois: 'Aoû', formation: 'Comptabilité', wilaya: 'Boumerdès', age: 19, apporteur: 'Yacine Meziane', source: 'Publicité' },
  { annee: 2025, mois: 'Sep', formation: 'Informatique Bureautique', wilaya: 'Sétif', age: 23, apporteur: 'Amina Cherif', source: 'TikTok' },
  { annee: 2025, mois: 'Sep', formation: 'Anglais B1', wilaya: 'Boumerdès', age: 26, apporteur: 'Yacine Meziane', source: 'TikTok' },
  { annee: 2025, mois: 'Sep', formation: 'Anglais A1', wilaya: 'Alger', age: 35, apporteur: 'Sara Khaled', source: 'TikTok' },
  { annee: 2025, mois: 'Sep', formation: 'Comptabilité', wilaya: 'Tipaza', age: 21, apporteur: 'Karim Boudiaf', source: 'Recherche Google' },
  { annee: 2025, mois: 'Sep', formation: 'Anglais A1', wilaya: 'Blida', age: 37, apporteur: 'Amina Cherif', source: 'TikTok' },
  { annee: 2025, mois: 'Oct', formation: 'Comptabilité', wilaya: 'Blida', age: 30, apporteur: 'Yacine Meziane', source: 'Publicité' },
  { annee: 2025, mois: 'Oct', formation: 'Informatique Bureautique', wilaya: 'Alger', age: 23, apporteur: 'Karim Boudiaf', source: 'Publicité' },
  { annee: 2025, mois: 'Oct', formation: 'Anglais B1', wilaya: 'Blida', age: 28, apporteur: 'Yacine Meziane', source: 'Bouche-à-oreille' },
  { annee: 2025, mois: 'Oct', formation: 'Anglais A1', wilaya: 'Blida', age: 23, apporteur: 'Sara Khaled', source: 'Instagram' },
  { annee: 2025, mois: 'Oct', formation: 'Informatique Bureautique', wilaya: 'Boumerdès', age: 23, apporteur: 'Ahmed Benali', source: 'TikTok' },
  { annee: 2025, mois: 'Oct', formation: 'Informatique Bureautique', wilaya: 'Sétif', age: 20, apporteur: 'Yacine Meziane', source: 'Recherche Google' },
  { annee: 2025, mois: 'Nov', formation: 'Anglais A1', wilaya: 'Tipaza', age: 26, apporteur: 'Karim Boudiaf', source: 'Instagram' },
  { annee: 2025, mois: 'Nov', formation: 'Anglais B1', wilaya: 'Blida', age: 19, apporteur: 'Sara Khaled', source: 'Amis/Famille' },
  { annee: 2025, mois: 'Nov', formation: 'Informatique Bureautique', wilaya: 'Oran', age: 20, apporteur: 'Amina Cherif', source: 'Bouche-à-oreille' },
  { annee: 2025, mois: 'Nov', formation: 'Comptabilité', wilaya: 'Blida', age: 26, apporteur: 'Sara Khaled', source: 'Publicité' },
  { annee: 2025, mois: 'Nov', formation: 'Comptabilité', wilaya: 'Boumerdès', age: 32, apporteur: 'Yacine Meziane', source: 'Facebook' },
  { annee: 2025, mois: 'Nov', formation: 'Comptabilité', wilaya: 'Constantine', age: 33, apporteur: 'Ahmed Benali', source: 'Publicité' },
  { annee: 2025, mois: 'Déc', formation: 'Anglais A1', wilaya: 'Constantine', age: 18, apporteur: 'Karim Boudiaf', source: 'Publicité' },
  { annee: 2025, mois: 'Déc', formation: 'Anglais B1', wilaya: 'Béjaïa', age: 25, apporteur: 'Amina Cherif', source: 'Recherche Google' },
  { annee: 2025, mois: 'Déc', formation: 'Comptabilité', wilaya: 'Sétif', age: 24, apporteur: 'Karim Boudiaf', source: 'TikTok' },
  { annee: 2025, mois: 'Déc', formation: 'Informatique Bureautique', wilaya: 'Boumerdès', age: 36, apporteur: 'Ahmed Benali', source: 'TikTok' },
  { annee: 2025, mois: 'Déc', formation: 'Anglais A1', wilaya: 'Oran', age: 38, apporteur: 'Karim Boudiaf', source: 'Bouche-à-oreille' },
  { annee: 2025, mois: 'Déc', formation: 'Anglais B1', wilaya: 'Sétif', age: 22, apporteur: 'Karim Boudiaf', source: 'Facebook' },
  { annee: 2026, mois: 'Jan', formation: 'Anglais A1', wilaya: 'Béjaïa', age: 29, apporteur: 'Yacine Meziane', source: 'TikTok' },
  { annee: 2026, mois: 'Jan', formation: 'Anglais B1', wilaya: 'Blida', age: 37, apporteur: 'Amina Cherif', source: 'Publicité' },
  { annee: 2026, mois: 'Jan', formation: 'Comptabilité', wilaya: 'Sétif', age: 18, apporteur: 'Ahmed Benali', source: 'Publicité' },
  { annee: 2026, mois: 'Fév', formation: 'Comptabilité', wilaya: 'Constantine', age: 25, apporteur: 'Sara Khaled', source: 'Publicité' },
  { annee: 2026, mois: 'Fév', formation: 'Informatique Bureautique', wilaya: 'Constantine', age: 28, apporteur: 'Sara Khaled', source: 'Bouche-à-oreille' },
  { annee: 2026, mois: 'Fév', formation: 'Anglais B1', wilaya: 'Oran', age: 24, apporteur: 'Karim Boudiaf', source: 'Bouche-à-oreille' },
  { annee: 2026, mois: 'Fév', formation: 'Anglais A1', wilaya: 'Blida', age: 24, apporteur: 'Yacine Meziane', source: 'Recherche Google' },
  { annee: 2026, mois: 'Mar', formation: 'Anglais B1', wilaya: 'Béjaïa', age: 26, apporteur: 'Yacine Meziane', source: 'Instagram' },
  { annee: 2026, mois: 'Mar', formation: 'Comptabilité', wilaya: 'Oran', age: 30, apporteur: 'Sara Khaled', source: 'Instagram' },
  { annee: 2026, mois: 'Mar', formation: 'Informatique Bureautique', wilaya: 'Constantine', age: 29, apporteur: 'Karim Boudiaf', source: 'Instagram' },
  { annee: 2026, mois: 'Mar', formation: 'Anglais A1', wilaya: 'Boumerdès', age: 35, apporteur: 'Yacine Meziane', source: 'Publicité' },
  { annee: 2026, mois: 'Mar', formation: 'Informatique Bureautique', wilaya: 'Alger', age: 18, apporteur: 'Sara Khaled', source: 'Instagram' },
  { annee: 2026, mois: 'Avr', formation: 'Comptabilité', wilaya: 'Tipaza', age: 19, apporteur: 'Yacine Meziane', source: 'TikTok' },
  { annee: 2026, mois: 'Avr', formation: 'Anglais A1', wilaya: 'Constantine', age: 27, apporteur: 'Sara Khaled', source: 'Recherche Google' },
  { annee: 2026, mois: 'Avr', formation: 'Anglais B1', wilaya: 'Alger', age: 21, apporteur: 'Sara Khaled', source: 'Bouche-à-oreille' },
  { annee: 2026, mois: 'Avr', formation: 'Informatique Bureautique', wilaya: 'Tipaza', age: 37, apporteur: 'Karim Boudiaf', source: 'Facebook' },
  { annee: 2026, mois: 'Avr', formation: 'Anglais A1', wilaya: 'Blida', age: 25, apporteur: 'Ahmed Benali', source: 'Publicité' },
  { annee: 2026, mois: 'Mai', formation: 'Anglais A1', wilaya: 'Alger', age: 22, apporteur: 'Karim Boudiaf', source: 'Publicité' },
  { annee: 2026, mois: 'Mai', formation: 'Informatique Bureautique', wilaya: 'Oran', age: 32, apporteur: 'Karim Boudiaf', source: 'Facebook' },
  { annee: 2026, mois: 'Mai', formation: 'Comptabilité', wilaya: 'Alger', age: 21, apporteur: 'Ahmed Benali', source: 'Amis/Famille' },
  { annee: 2026, mois: 'Mai', formation: 'Anglais B1', wilaya: 'Boumerdès', age: 19, apporteur: 'Yacine Meziane', source: 'Bouche-à-oreille' },
  { annee: 2026, mois: 'Mai', formation: 'Comptabilité', wilaya: 'Blida', age: 34, apporteur: 'Amina Cherif', source: 'Instagram' },
  { annee: 2026, mois: 'Jun', formation: 'Anglais B1', wilaya: 'Alger', age: 21, apporteur: 'Ahmed Benali', source: 'Publicité' },
  { annee: 2026, mois: 'Jun', formation: 'Comptabilité', wilaya: 'Béjaïa', age: 27, apporteur: 'Amina Cherif', source: 'Amis/Famille' },
  { annee: 2026, mois: 'Jun', formation: 'Anglais A1', wilaya: 'Alger', age: 26, apporteur: 'Karim Boudiaf', source: 'Amis/Famille' },
  { annee: 2026, mois: 'Jun', formation: 'Informatique Bureautique', wilaya: 'Béjaïa', age: 27, apporteur: 'Ahmed Benali', source: 'Instagram' },
  { annee: 2026, mois: 'Jun', formation: 'Anglais B1', wilaya: 'Tipaza', age: 38, apporteur: 'Sara Khaled', source: 'Recherche Google' },
  { annee: 2026, mois: 'Jul', formation: 'Comptabilité', wilaya: 'Blida', age: 37, apporteur: 'Karim Boudiaf', source: 'Instagram' },
  { annee: 2026, mois: 'Jul', formation: 'Informatique Bureautique', wilaya: 'Béjaïa', age: 30, apporteur: 'Amina Cherif', source: 'Instagram' },
  { annee: 2026, mois: 'Jul', formation: 'Anglais B1', wilaya: 'Constantine', age: 23, apporteur: 'Karim Boudiaf', source: 'Bouche-à-oreille' },
  { annee: 2026, mois: 'Jul', formation: 'Anglais A1', wilaya: 'Blida', age: 19, apporteur: 'Ahmed Benali', source: 'Publicité' },
];

// Liste des formations connues (y compris celles jamais lancées)
const toutesLesFormations = [
  'Anglais A1', 'Anglais B1', 'Informatique Bureautique',
  'Comptabilité', 'Français A1', 'Allemand A1', 'Design Graphique',
];

const wilayasConnues = ['Alger', 'Blida', 'Boumerdès', 'Tipaza', 'Oran', 'Constantine', 'Béjaïa', 'Sétif'];

const anneesDisponibles = [...new Set(rawInscriptions.map((i) => i.annee))].sort((a, b) => b - a);

const moisOrdre = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const trancheAge = (age) => {
  if (age <= 18) return '15-18';
  if (age <= 22) return '19-22';
  if (age <= 26) return '23-26';
  if (age <= 30) return '27-30';
  if (age <= 40) return '31-40';
  return '40+';
};

const computeStats = (data) => {
  const totalEtudiants = data.length;

  const formationsCount = toutesLesFormations.map((nom) => {
    const inscriptions = data.filter((i) => i.formation === nom);
    return { nom, etudiants: inscriptions.length };
  });

  const formationsActives = formationsCount.filter((f) => f.etudiants > 0);
  const formationsOubliees = formationsCount.filter((f) => f.etudiants === 0);

  const wilayaData = wilayasConnues
    .map((wilaya) => ({ wilaya, etudiants: data.filter((i) => i.wilaya === wilaya).length }))
    .filter((w) => w.etudiants > 0);

  const tranches = ['15-18', '19-22', '23-26', '27-30', '31-40', '40+'];
  const ageData = tranches.map((tranche) => ({
    tranche,
    etudiants: data.filter((i) => trancheAge(i.age) === tranche).length,
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

  return {
    totalEtudiants, formationsActives, formationsOubliees,
    wilayaData, ageData, topApporteurs, sourceData, monthlyData, topFormations,
  };
};


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
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  const filteredData = useMemo(() => {
    return rawInscriptions.filter((i) => {
      const yearMatch = selectedYear === 'all' || i.annee === Number(selectedYear);
      const monthMatch = selectedMonth === 'all' || i.mois === selectedMonth;
      return yearMatch && monthMatch;
    });
  }, [selectedYear, selectedMonth]);

  const stats = useMemo(() => computeStats(filteredData), [filteredData]);

  const {
    totalEtudiants, formationsActives, formationsOubliees,
    wilayaData, ageData, topApporteurs, sourceData, monthlyData, topFormations,
  } = stats;

  return (
    <AdminLayout>
      <div className="space-y-6">
<div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Statistique</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {selectedYear === 'all'
                ? "Vue d'ensemble globale (toutes années)"
                : `Vue d'ensemble — ${selectedYear}${selectedMonth !== 'all' ? ` / ${selectedMonth}` : ''}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedMonth('all'); // reset le mois quand on change d'année
              }}
              className="text-xs font-medium text-slate-600 bg-white border border-[#E2E8F0] rounded-full px-3.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer"
            >
              <option value="all">Toutes les années</option>
              {anneesDisponibles.map((annee) => (
                <option key={annee} value={annee}>{annee}</option>
              ))}
            </select>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={selectedYear === 'all'}
              className="text-xs font-medium text-slate-600 bg-white border border-[#E2E8F0] rounded-full px-3.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="all">Tous les mois</option>
              {moisOrdre.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
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

          <ChartCard title="Étudiants par source (comment ils nous ont connus)">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sourceData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="source"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="etudiants" radius={[6, 6, 0, 0]}>
                  {sourceData.map((_, i) => (
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