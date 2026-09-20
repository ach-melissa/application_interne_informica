import { useState } from 'react';
import { createPortal } from 'react-dom';
import { User, Phone, Briefcase, Wallet, Clock, CalendarDays, Plus, Trash2, X, Check, RotateCcw } from 'lucide-react';
export const fmt = (n) => n.toLocaleString('fr-DZ') + ' DA';

export const CARD = 'bg-white rounded-xl shadow-[0_2px_10px_rgba(15,42,74,0.08)]';
export const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const STATUTS = { payé: 'bg-emerald-50 text-emerald-700', en_attente: 'bg-amber-50 text-amber-700' };
export const Badge = ({ statut }) => (
  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUTS[statut] ?? 'bg-slate-100 text-slate-500'}`}>
    {statut.replace('_', ' ')}
  </span>
);

export const initiales = (n = '') => n.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
export const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
export const TYPES = [
  { key: 'mensuel', label: 'Mensuel', unit: '/ mois', icon: Wallet },
  { key: 'jour', label: 'Par jour', unit: '/ jour', icon: CalendarDays },
  { key: 'heure', label: 'Par heure', unit: '/ h', icon: Clock },
  { key: 'libre', label: 'Non fixe', unit: '(chaque mois)', icon: RotateCcw },
];
export const typeOf = (k) => TYPES.find(t => t.key === k) ?? TYPES[0];
export const nomComplet = (e) => `${e.prenom ?? ''} ${e.nom ?? ''}`.trim();
export const tarifLabel = (p) => p.type === 'libre' ? 'Montant libre (défini chaque mois)' : `${fmt(Number(p.montant) || 0)} ${typeOf(p.type).unit}`;
export const joursParSemaine = (p) => (p.joursFixes ? p.jours.length : Number(p.nbJours) || 0);
export const estimationMensuelle = (p) => {
  if (p.type === 'libre') return 0; // pas de montant fixe : saisi chaque mois
  const m = Number(p.montant) || 0, jm = joursParSemaine(p) * (52 / 12);
  if (p.type === 'jour') return Math.round(m * jm);
  if (p.type === 'heure') return Math.round(m * (Number(p.heuresParJour) || 0) * jm);
  return m;
};
export const totalEmploye = (e) => e.postes.reduce((s, p) => s + estimationMensuelle(p), 0);

const STAT_COLORS = { blue: { bg: 'bg-[#DCEBFA]', text: 'text-[#0369A1]' }, emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' }, amber: { bg: 'bg-amber-50', text: 'text-amber-600' } };
export const StatTile = ({ icon: Icon, label, value, color = 'blue' }) => {
  const c = STAT_COLORS[color];
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-[#F1F5F9] px-4 py-3">
      <div className={`w-9 h-9 rounded-full ${c.bg} flex items-center justify-center flex-shrink-0`}><Icon size={16} className={c.text} /></div>
      <div><p className="text-lg font-bold text-slate-800 leading-none">{value}</p><p className="text-[11px] text-slate-400 mt-0.5">{label}</p></div>
    </div>
  );
};

const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';
const Label = ({ icon: Icon, text, required }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} className="text-slate-500" />}{text}{required && <span className="text-red-500 ml-0.5">*</span>}
  </p>
);
const Segmented = ({ options, value, onChange }) => (
  <div className="flex rounded-md border border-slate-200 overflow-hidden text-[11px]">
    {options.map(o => (
      <button key={o.key} type="button" onClick={() => onChange(o.key)}
        className={`flex-1 py-1.5 flex items-center justify-center gap-1 transition ${value === o.key ? 'bg-[#0369A1] text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
        {o.icon && <o.icon size={11} />} {o.label}
      </button>
    ))}
  </div>
);
const Suffix = ({ text, children }) => (
  <div className="flex min-w-0 rounded-md border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#0369A1]/40">
    {children}<span className="flex items-center px-2.5 text-[11px] text-slate-500 bg-slate-50 border-l border-slate-200 whitespace-nowrap">{text}</span>
  </div>
);

const newPoste = () => ({ id: Date.now() + Math.random(), poste: '', type: 'mensuel', montant: '', joursFixes: true, jours: JOURS.slice(0, 5), nbJours: 5, heuresParJour: 8, dateDebut: '' });

const EmployeModal = ({ employe, onClose, onSave }) => {
  const { nom = '', prenom = '', telephone = '' } = employe ?? {};
  const [infos, setInfos] = useState({ nom, prenom, telephone });
  const [postes, setPostes] = useState(employe ? employe.postes.map(p => ({ ...p })) : [newPoste()]);
  const [error, setError] = useState('');

  const updateInfo = (f) => (e) => { setError(''); setInfos(v => ({ ...v, [f]: e.target.value })); };
  const updatePoste = (id, patch) => { setError(''); setPostes(l => l.map(p => p.id === id ? { ...p, ...patch } : p)); };

  const validate = () => {
    if (!infos.nom.trim() || !infos.prenom.trim()) return 'Renseignez le nom et le prénom.';
    for (const [i, p] of postes.entries()) {
      const pre = `Poste ${i + 1} : `;
      if (!p.poste.trim()) return pre + 'renseignez le poste.';
      if (p.type !== 'libre' && !(Number(p.montant) > 0)) return pre + 'renseignez le montant.';
      if (p.type !== 'mensuel' && p.type !== 'libre' && joursParSemaine(p) < 1) return pre + 'indiquez les jours de travail.';
      if (p.type === 'heure' && !(Number(p.heuresParJour) > 0)) return pre + 'indiquez les heures par jour.';
    }
    return '';
  };

  const submit = () => {
    const msg = validate();
    if (msg) return setError(msg);
    onSave({
      ...(employe ?? { id: Date.now(), statut: 'en_attente' }),
      ...Object.fromEntries(Object.entries(infos).map(([k, v]) => [k, v.trim()])),
      postes: postes.map(p => ({ ...p, poste: p.poste.trim(), montant: Number(p.montant), nbJours: Number(p.nbJours) || 0, heuresParJour: Number(p.heuresParJour) || 0 })),
    });
    onClose();
  };

  const totalEstime = postes.reduce((s, p) => s + estimationMensuelle(p), 0);

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]" onClick={onClose}>
      <div className="bg-white rounded-md shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0"><Wallet size={14} className="text-white" /></span>
              {employe ? "Modifier l'employé" : 'Ajouter un employé'}
            </h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>
          {error && <div className="px-5 pb-3"><p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-md">{error}</p></div>}
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label icon={User} text="Nom" required /><input value={infos.nom} onChange={updateInfo('nom')} className={inp} placeholder="Bekkar" /></div>
            <div><Label icon={User} text="Prénom" required /><input value={infos.prenom} onChange={updateInfo('prenom')} className={inp} placeholder="Salima" /></div>
          </div>
          <div><Label icon={Phone} text="Téléphone" /><input type="tel" value={infos.telephone} onChange={updateInfo('telephone')} className={inp} placeholder="0555 12 34 56" /></div>

          <div className="border-t border-[#F1F5F9] pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">Postes et rémunération <span className="text-red-500">*</span></p>
              <button type="button" onClick={() => setPostes(l => [...l, newPoste()])}
                className="text-[11px] font-medium text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1 rounded-full hover:bg-[#c9e2f7] flex items-center gap-1">
                <Plus size={11} /> Poste
              </button>
            </div>

            <div className="space-y-3">
              {postes.map((p, i) => {
                const set = (patch) => updatePoste(p.id, patch);
                const estimation = estimationMensuelle(p);
                return (
                  <div key={p.id} className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-md p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Poste {i + 1}</p>
                      {postes.length > 1 && (
                        <button onClick={() => setPostes(l => l.filter(x => x.id !== p.id))} className="text-[11px] text-red-500 hover:underline flex items-center gap-1">
                          <Trash2 size={11} /> Supprimer
                        </button>
                      )}
                    </div>

                    <div><Label icon={Briefcase} text="Poste / Rôle" required /><input value={p.poste} onChange={e => set({ poste: e.target.value })} className={inp} placeholder="Ex : Secrétaire" /></div>
                    <div><Label icon={Wallet} text="Type de rémunération" required /><Segmented options={TYPES} value={p.type} onChange={v => set({ type: v })} /></div>
                    {p.type === 'libre' ? (
                      <p className="text-[11px] text-slate-500 bg-white border border-slate-200 rounded-md px-2.5 py-2">
                        Aucun montant fixe : le salaire sera saisi chaque mois directement sur la fiche de l'employé.
                      </p>
                    ) : (
                      <div>
                        <Label text="Montant" required />
                        <Suffix text={`DA ${typeOf(p.type).unit}`}>
                          <input type="number" min="0" value={p.montant} onChange={e => set({ montant: e.target.value })} className="flex-1 min-w-0 px-2.5 py-1.5 text-xs focus:outline-none" placeholder="0" />
                        </Suffix>
                      </div>
                    )}

                    {p.type !== 'mensuel' && p.type !== 'libre' && (
                      <>
                        <div>
                          <Label text="Jours de travail" required />
                          <Segmented options={[{ key: 'fixes', label: 'Jours fixes' }, { key: 'variables', label: 'Jours variables' }]}
                            value={p.joursFixes ? 'fixes' : 'variables'} onChange={v => set({ joursFixes: v === 'fixes' })} />
                        </div>
                        {p.joursFixes ? (
                          <div>
                            <div className="flex flex-wrap gap-1.5">
                              {JOURS.map(j => {
                                const active = p.jours.includes(j);
                                return (
                                  <button type="button" key={j} onClick={() => set({ jours: active ? p.jours.filter(x => x !== j) : [...p.jours, j] })}
                                    className={`text-[11px] px-2.5 py-1 rounded-full border transition ${active ? 'bg-[#DCEBFA] text-[#0369A1] border-[#0369A1]/30 font-medium' : 'bg-white text-slate-500 border-slate-200'}`}>
                                    {cap(j).slice(0, 3)}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">{p.jours.length} jour(s) / semaine</p>
                          </div>
                        ) : (
                          <div><Label text="Nombre de jours par semaine" required /><input type="number" min="1" max="7" value={p.nbJours} onChange={e => set({ nbJours: e.target.value })} className={inp} /></div>
                        )}
                        <div>
                          <Label text="Heures par jour" required={p.type === 'heure'} />
                          <Suffix text="h"><input type="number" min="0" max="24" value={p.heuresParJour} onChange={e => set({ heuresParJour: e.target.value })} className="flex-1 min-w-0 px-2.5 py-1.5 text-xs focus:outline-none" /></Suffix>
                        </div>
                      </>
                    )}

                    <div><Label icon={CalendarDays} text="Date de début" /><input type="date" value={p.dateDebut} onChange={e => set({ dateDebut: e.target.value })} className={inp} /></div>

                    {estimation > 0 && (
                      <p className="text-[10px] text-slate-500 pt-1 border-t border-[#F1F5F9]">Estimation mensuelle : <span className="font-semibold text-slate-700">{fmt(estimation)}</span></p>
                    )}
                  </div>
                );
              })}
            </div>

            {postes.length > 1 && totalEstime > 0 && (
              <p className="text-xs text-slate-500 mt-3 text-right">Total mensuel estimé ({postes.length} postes) : <span className="font-bold text-slate-700">{fmt(totalEstime)}</span></p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
            <button onClick={submit} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all font-medium">
              <Check size={12} /> {employe ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EmployeModal;