import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import ComptableLayout from '../../../layouts/ComptableLayout';
import { PROFESSEURS_INITIAL, initiales, Badge } from './SalairesProfesseurs';
import FormationsTab from './FormationsTab';
import { BilanMensuel, HistoriqueProf } from './BilanTab';

const LIST_PATH = '/comptable/salaires/professeurs';
const TABS = [['formations', 'Formations & rémunération'], ['bilan', 'Bilan mensuel'], ['historique', 'Historique']];

const DetailProfesseur = () => {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const professeurs = state?.professeurs ?? PROFESSEURS_INITIAL;
  const [professeur, setProfesseur] = useState(state?.professeur ?? professeurs.find((p) => String(p.id) === id));
  const idx = professeurs.findIndex((p) => p.id === professeur?.id);
  const [tab, setTab] = useState('formations');

  useEffect(() => {
    const next = state?.professeur ?? professeurs.find((p) => String(p.id) === id);
    if (next && next.id !== professeur?.id) setProfesseur(next);
  }, [id, state]);
  const goTo = (target) => navigate(`${LIST_PATH}/${target.id}`, { state: { professeur: target, professeurs } });
  const updateFormation = (i, patch) => setProfesseur((prev) => ({ ...prev, formations: prev.formations.map((f, j) => (j === i ? { ...f, ...patch } : f)) }));

  if (!professeur) {
    return (
      <ComptableLayout>
        <button onClick={() => navigate(LIST_PATH)} className="flex items-center gap-1.5 text-xs font-medium text-[#0369A1] hover:underline mb-4">
          <ArrowLeft size={14} /> Retour aux professeurs
        </button>
        <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] px-3 py-10 text-center text-slate-400 text-xs">Ce professeur est introuvable.</div>
      </ComptableLayout>
    );
  }

  return (
    <ComptableLayout>
      {/* Breadcrumb + navigation entre professeurs */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(LIST_PATH)} className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] transition flex-shrink-0">
            <ArrowLeft size={16} className="text-[#0369A1]" />
          </button>
          <div className="flex items-center gap-1.5 text-xs">
            <button onClick={() => navigate(LIST_PATH)} className="text-slate-400 hover:text-[#0369A1] transition">Professeurs</button>
            <span className="text-slate-300">›</span>
            <span className="text-[#0369A1] font-medium">{professeur.nom}</span>
          </div>
        </div>
        {idx > -1 && professeurs.length > 1 && (
          <div className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] rounded-full px-1.5 py-1">
            <button disabled={idx === 0} onClick={() => goTo(professeurs[idx - 1])} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent">
              <ChevronLeft size={13} className="text-[#0369A1]" />
            </button>
            <span className="text-[11px] text-slate-500 px-1">{idx + 1} / {professeurs.length}</span>
            <button disabled={idx === professeurs.length - 1} onClick={() => goTo(professeurs[idx + 1])} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent">
              <ChevronRight size={13} className="text-[#0369A1]" />
            </button>
          </div>
        )}
      </div>

      {/* Infos professeur */}
      <div className="bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)] p-5 mb-4 flex items-start gap-4 flex-wrap">
        <div className="w-14 h-14 shrink-0 rounded-full bg-[#DCEBFA] text-[#0369A1] text-lg font-bold flex items-center justify-center">{initiales(professeur.nom)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-slate-800 truncate">{professeur.nom}</h1>
            <Badge statut={professeur.statut} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{professeur.poste}</p>
          {professeur.telephone && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone size={11} className="text-[#0369A1]" /> {professeur.telephone}</p>}
        </div>
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full text-xs font-medium transition ${tab === k ? 'bg-[#0F2A4A] text-white' : 'bg-[#DCEBFA] text-[#0369A1] hover:bg-[#c9e2f7]'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'formations' && <FormationsTab formations={professeur.formations} onUpdate={updateFormation} />}
      {tab === 'bilan' && <BilanMensuel formations={professeur.formations} />}
      {tab === 'historique' && <HistoriqueProf />}
    </ComptableLayout>
  );
};

export default DetailProfesseur;