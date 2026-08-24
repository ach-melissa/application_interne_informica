import { X, Layers } from 'lucide-react';

const inpSm = 'bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40';
const NiveauxEditor = ({ niveaux, setNiveaux, prixUniforme, dureeUniforme, typeDureeUniforme, typeDureeDefault }) => {
  const addNiveau = () => setNiveaux(prev => [...prev, { nom: '', prix: '', duree_valeur: '', type_duree: '' }]);
  const removeNiveau = (idx) => setNiveaux(prev => prev.filter((_, i) => i !== idx));
  const updateNiveau = (idx, field, value) => setNiveaux(prev => prev.map((n, i) => (i === idx ? { ...n, [field]: value } : n)));

  return (
    <div className="border-t border-[#F1F5F9] pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
          <Layers size={12} className="text-[#0369A1]" /> Niveaux
        </p>
        <button type="button" onClick={addNiveau} className="text-[11px] font-medium text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1 rounded-full hover:bg-[#c9e2f7] transition">
          + Niveau
        </button>
      </div>

      {niveaux.length === 0 ? (
        <p className="text-[11px] text-slate-400">Aucun niveau ajouté.</p>
      ) : (
        <div className="space-y-1.5">
          {niveaux.map((n, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-[#F8FAFC] rounded-lg px-2.5 py-1.5">
              <span className="text-[10px] text-slate-400 w-5 flex-shrink-0">{idx + 1}</span>
              <input value={n.nom} onChange={e => updateNiveau(idx, 'nom', e.target.value)}
                placeholder="Nom (ex: A1, Débutant...)" className={`${inpSm} flex-1`} />
              {!prixUniforme && (
                <input type="number" min="0" value={n.prix} onChange={e => updateNiveau(idx, 'prix', e.target.value)}
                  placeholder="Prix *" className={`${inpSm} w-20 flex-shrink-0`} />
              )}
                            {!typeDureeUniforme && (
                <select value={n.type_duree || typeDureeDefault} onChange={e => updateNiveau(idx, 'type_duree', e.target.value)}
                  className={`${inpSm} w-20 flex-shrink-0`}>
                  <option value="heures">Heures</option>
                  <option value="seances">Séances</option>
                </select>
              )}
              {!dureeUniforme && (
                <input type="number" min="1" value={n.duree_valeur} onChange={e => updateNiveau(idx, 'duree_valeur', e.target.value)}
                  placeholder={(n.type_duree || typeDureeDefault) === 'seances' ? 'Séances *' : 'Heures *'} className={`${inpSm} w-20 flex-shrink-0`} />
              )}
              <button type="button" onClick={() => removeNiveau(idx)} className="text-slate-300 hover:text-red-400 flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NiveauxEditor;