import { useState, useEffect } from 'react';
import { X, Calendar, Clock, UserCheck, Users, Plus, CheckCircle2 } from 'lucide-react';
import CreateGroupQuickModal from './CreateGroupQuickModal';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const capacityColor = (nb, cap) => {
  if (!cap) return 'text-slate-400';
  const ratio = nb / cap;
  if (ratio >= 1) return 'text-red-600';
  if (ratio >= 0.8) return 'text-amber-600';
  return 'text-emerald-600';
};

const AssignGroupModal = ({ inscription, onClose, onSuccess }) => {
  const [groups, setGroups]     = useState([]);
  const [selected, setSelected] = useState(inscription.group_id ?? '');
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmit] = useState(false);
  const [error, setError]       = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadGroups = () => {
    setLoading(true);
    fetch(`${API}/api/etudiants/formations/${inscription.formation_id}/groups`, { headers: getHeaders() })
      .then(r => r.json())
      .then(data => { setGroups(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Erreur chargement groupes'); setLoading(false); });
  };

  useEffect(() => { loadGroups(); }, []);

  const handleSave = async () => {
  setSubmit(true); setError(null);
  try {
    const res = await fetch(`${API}/api/etudiants/${inscription.id}/group`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ group_id: selected || null }),
    });
    if (!res.ok) throw new Error('Erreur affectation');

    const selectedGroup = selected ? groups.find(g => g.id === selected) ?? null : null;
    onSuccess?.(selectedGroup);
    onClose();
  } catch (err) { setError(err.message); }
  finally { setSubmit(false); }
};

  const handleGroupCreated = (newGroup) => {
    setGroups(prev => [
      { ...newGroup, nb_etudiants: 0, nb_sessions: 0, termine: false },
      ...prev,
    ]);
    setSelected(newGroup.id);
    setShowCreate(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={onClose}>
      {!showCreate && (
        <div className="bg-white rounded-md shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

          <div className="sticky top-0 z-10 bg-white">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
                  <Users size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-800 truncate">Affecter au groupe</h2>
                  <p className="text-[11px] text-slate-400 truncate">
                    {inscription.etudiant?.nom} {inscription.etudiant?.prenom} · {inscription.formation?.nom}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-300 hover:text-slate-600 flex-shrink-0"><X size={16} /></button>
            </div>

            {error && (
              <div className="px-5 pb-3 pt-2 border-b border-[#F1F5F9]">
                <p className="text-red-500 text-xs bg-red-50 rounded-md px-3 py-2">{error}</p>
              </div>
            )}
          </div>

          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Groupes disponibles</p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1 text-[11px] font-medium text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1.5 rounded-md hover:bg-[#c7e3f7]"
              >
                <Plus size={12} /> Créer un groupe
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-6">
                <Users size={28} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">Aucun groupe actif pour cette formation.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                <label className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition
                  ${selected === '' ? 'border-[#0369A1] bg-[#DCEBFA]/40' : 'border-[#F1F5F9] hover:border-[#DCEBFA]'}`}>
                  <input type="radio" name="group" value=""
                    checked={selected === ''} onChange={() => setSelected('')}
                    className="accent-[#0369A1]" />
                  <span className="text-xs text-slate-400 italic">— Aucun groupe —</span>
                </label>

                {groups.map(g => {
                  const disabled = g.termine;
                  const isNew = g.nb_sessions === 0 && !g.termine;
                  return (
                    <label key={g.id} className={`flex items-start gap-3 p-3 rounded-md border transition
                      ${disabled ? 'opacity-50 cursor-not-allowed border-[#F1F5F9]'
                        : selected === g.id ? 'border-[#0369A1] bg-[#DCEBFA]/40 cursor-pointer'
                        : 'border-[#F1F5F9] hover:border-[#DCEBFA] cursor-pointer'}`}>
                      <input type="radio" name="group" value={g.id} disabled={disabled}
                        checked={selected === g.id} onChange={() => setSelected(g.id)}
                        className="accent-[#0369A1] mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-[#1E293B] truncate">{g.nom}</p>
                          {disabled ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex-shrink-0">Terminé</span>
                          ) : isNew ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 flex-shrink-0">Nouveau</span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          <span className={`flex items-center gap-1 text-[10px] font-medium ${capacityColor(g.nb_etudiants, g.capacite)}`}>
                            <Users size={10} />{g.nb_etudiants}/{g.capacite ?? '—'} étudiant(s)
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <CheckCircle2 size={10} className="text-[#0369A1]" />{g.nb_sessions} séance(s) faite(s)
                          </span>
                          {g.jours_formation && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Calendar size={9} className="text-[#0369A1]" />{g.jours_formation}
                            </span>
                          )}
                          {g.heure_formation && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock size={9} className="text-[#0369A1]" />{g.heure_formation}
                            </span>
                          )}
                          {g.teacher && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <UserCheck size={9} className="text-[#0369A1]" />{g.teacher.nom} {g.teacher.prenom}
                            </span>
                          )}
                        </div>
                      </div>
                      {selected === g.id && (
                        <span className="text-[10px] bg-[#0369A1] text-white px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 self-center">✓</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose}
                className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-[#F1F5F9]">
                Annuler
              </button>
              <button onClick={handleSave} disabled={submitting || loading}
                className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] disabled:opacity-40 transition-all font-medium">
                {submitting ? 'Enregistrement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateGroupQuickModal
          formation_id={inscription.formation_id}
          onClose={() => setShowCreate(false)}
          onCreated={handleGroupCreated}
        />
      )}
    </div>
  );
};

export default AssignGroupModal;