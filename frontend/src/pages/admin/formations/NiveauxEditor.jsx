import { X, Layers } from 'lucide-react';

const inpSm = 'bg-white border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';

const NiveauxEditor = ({ niveaux, setNiveaux, prixUniforme, dureeUniforme, typeDureeUniforme, typeDureeDefault, echeancierUniforme, capaciteUniforme }) => {
  const addNiveau = () => setNiveaux(prev => [...prev, { nom: '', prix: '', duree_valeur: '', type_duree: '', periods: [], capacite_groupe: '' }]);
  const removeNiveau = idx => setNiveaux(prev => prev.filter((_, i) => i !== idx));
  const updateNiveau = (idx, field, value) => setNiveaux(prev => prev.map((n, i) => (i === idx ? { ...n, [field]: value } : n)));

  const addPeriod = idx => setNiveaux(prev => prev.map((n, i) => i === idx ? { ...n, periods: [...(n.periods || []), { jours_offset: 0, montant: '' }] } : n));
  const removePeriod = (idx, pIdx) => setNiveaux(prev => prev.map((n, i) => i === idx ? { ...n, periods: n.periods.filter((_, pi) => pi !== pIdx) } : n));
  const updatePeriod = (idx, pIdx, field, value) => setNiveaux(prev => prev.map((n, i) => i === idx ? { ...n, periods: n.periods.map((p, pi) => pi === pIdx ? { ...p, [field]: value } : p) } : n));
  const unitLabel = u => (u === 'seances' ? 'séances' : 'h');
  const showPerLevelDuree = !dureeUniforme;
  const showPerLevelUnite = !dureeUniforme && !typeDureeUniforme;

  return (
    <div className="border-t border-[#F1F5F9] pt-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
          <Layers size={12} className="text-[#0369A1]" /> Niveaux <span className="text-red-500">*</span>
        </p>
        <button type="button" onClick={addNiveau} className="text-[11px] font-medium text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1 rounded-full hover:bg-[#c9e2f7] transition">
          + Niveau
        </button>
      </div>
      <p className="text-[10px] text-slate-400 mb-3">
        {showPerLevelDuree
          ? (showPerLevelUnite ? 'Chaque niveau a sa propre durée et sa propre unité.' : `Chaque niveau a sa propre durée, en ${unitLabel(typeDureeDefault)}.`)
          : 'Tous les niveaux partagent la même durée totale.'}
      </p>

      {niveaux.length === 0 ? (
        <p className="text-[11px] text-slate-400">Aucun niveau ajouté.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2.5">
            <span className="w-4 flex-shrink-0" />
            <span className="flex-1 min-w-0 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Nom <span className="text-red-500">*</span></span>
            {!prixUniforme && (
              <span className="w-24 flex-shrink-0 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Prix (DA) <span className="text-red-500">*</span></span>
            )}
            {!capaciteUniforme && (
              <span className="w-20 flex-shrink-0 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Capacité <span className="text-red-500">*</span></span>
            )}
            {showPerLevelDuree && (
              <span className="w-20 flex-shrink-0 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                {showPerLevelUnite ? 'Durée' : unitLabel(typeDureeDefault)} <span className="text-red-500">*</span>
              </span>
            )}
            {showPerLevelUnite && (
              <span className="w-24 flex-shrink-0 text-[10px] font-medium text-slate-400 uppercase tracking-wide">Unité <span className="text-red-500">*</span></span>
            )}
            <span className="w-[13px] flex-shrink-0" />
          </div>

          {niveaux.map((n, idx) => {
            const levelPeriods = n.periods || [];
            const levelTotal = levelPeriods.reduce((s, p) => s + (Number(p.montant) || 0), 0);
            const levelPrice = Number(n.prix || 0);
            const levelMismatch = levelPeriods.length > 0 && levelPrice > 0 && Math.abs(levelTotal - levelPrice) > 0.01;

            return (
              <div key={idx} className="bg-[#F8FAFC] rounded-md p-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 w-4 flex-shrink-0">{idx + 1}</span>
                  <input value={n.nom} onChange={e => updateNiveau(idx, 'nom', e.target.value)}
                    placeholder="ex: A1, Débutant..." className={`${inpSm} flex-1 min-w-0`} />

                  {!prixUniforme && (
                    <input type="number" min="0" value={n.prix} onChange={e => updateNiveau(idx, 'prix', e.target.value)}
                      placeholder="0" className={`${inpSm} w-24 flex-shrink-0`} />
                  )}

                  {!capaciteUniforme && (
                    <input type="number" min="1" value={n.capacite_groupe} onChange={e => updateNiveau(idx, 'capacite_groupe', e.target.value)}
                      placeholder="Capacité" className={`${inpSm} w-20 flex-shrink-0`} />
                  )}

                  {showPerLevelDuree && (
                    <input type="number" min="1" value={n.duree_valeur} onChange={e => updateNiveau(idx, 'duree_valeur', e.target.value)}
                      placeholder="0" className={`${inpSm} w-20 flex-shrink-0`} />
                  )}

                  {showPerLevelUnite && (
                    <select value={n.type_duree} onChange={e => updateNiveau(idx, 'type_duree', e.target.value)}
                      className={`${inpSm} w-24 flex-shrink-0 ${!n.type_duree ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                      <option value="">Choisir</option>
                      <option value="heures">Heures</option>
                      <option value="seances">Séances</option>
                    </select>
                  )}

                  <button type="button" onClick={() => removeNiveau(idx)} className="text-slate-300 hover:text-red-400 flex-shrink-0">
                    <X size={13} />
                  </button>
                </div>

                {!echeancierUniforme && (
                  <div className="mt-2 ml-6 bg-white border border-slate-200 rounded-md p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Échéancier du niveau <span className="text-red-500">*</span></span>
                      <button type="button" onClick={() => addPeriod(idx)} className="text-[10px] font-medium text-[#0369A1] bg-[#DCEBFA] px-2 py-0.5 rounded-full">+ Période</button>
                    </div>

                    {levelPeriods.length === 0 ? (
                      <p className="text-[10px] text-red-400">Aucune période — cliquez « + Période ».</p>
                    ) : (
                      <>
                        {levelPeriods.map((p, pIdx) => (
                          <div key={pIdx} className="flex items-center gap-1.5">
                            <input type="number" value={p.jours_offset} onChange={e => updatePeriod(idx, pIdx, 'jours_offset', e.target.value)}
                              placeholder="Jour" className={`${inpSm} flex-1`} />
                            <input type="number" value={p.montant} onChange={e => updatePeriod(idx, pIdx, 'montant', e.target.value)}
                              placeholder="Montant" className={`${inpSm} flex-1`} />
                            <button type="button" onClick={() => removePeriod(idx, pIdx)} className="text-slate-300 hover:text-red-400"><X size={11} /></button>
                          </div>
                        ))}
                        <div className="flex justify-end pt-0.5">
                          <span className={`text-[10px] font-medium ${levelMismatch ? 'text-red-500' : 'text-emerald-600'}`}>
                            Total : {levelTotal.toLocaleString('fr-FR')} / {levelPrice.toLocaleString('fr-FR')} DA
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NiveauxEditor;