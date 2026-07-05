import { useState, useEffect } from 'react';
import { X, Calendar, Clock, UserCheck, Users } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const AssignGroupModal = ({ inscription, onClose, onSuccess }) => {
  const [groups, setGroups]     = useState([]);
  const [selected, setSelected] = useState(inscription.group_id ?? '');
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmit] = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetch(`${API}/api/etudiants/formations/${inscription.formation_id}/groups`, { headers: getHeaders() })
      .then(r => r.json())
      .then(data => { setGroups(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Erreur chargement groupes'); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSubmit(true); setError(null);
    try {
      const res = await fetch(`${API}/api/etudiants/${inscription.id}/group`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ group_id: selected || null }),
      });
      if (!res.ok) throw new Error('Erreur affectation');
      onSuccess?.();
      onClose();
    } catch (err) { setError(err.message); }
    finally { setSubmit(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] sticky top-0 bg-white z-10">
          <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#DCEBFA] text-[#0369A1] flex items-center justify-center flex-shrink-0">
              <Users size={14} />
            </span>
            <span>
              Affecter au groupe
              <span className="block text-[11px] font-normal text-slate-400">
                {inscription.etudiant?.nom} {inscription.etudiant?.prenom} · {inscription.formation?.nom}
              </span>
            </span>
          </h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 flex-shrink-0"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>}

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
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition
                ${selected === '' ? 'border-[#0369A1] bg-[#DCEBFA]/40' : 'border-[#F1F5F9] hover:border-[#DCEBFA]'}`}>
                <input type="radio" name="group" value=""
                  checked={selected === ''} onChange={() => setSelected('')}
                  className="accent-[#0369A1]" />
                <span className="text-xs text-slate-400 italic">— Aucun groupe —</span>
              </label>

              {groups.map(g => (
                <label key={g.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition
                  ${selected === g.id ? 'border-[#0369A1] bg-[#DCEBFA]/40' : 'border-[#F1F5F9] hover:border-[#DCEBFA]'}`}>
                  <input type="radio" name="group" value={g.id}
                    checked={selected === g.id} onChange={() => setSelected(g.id)}
                    className="accent-[#0369A1] mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1E293B]">{g.nom}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
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
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">
              Annuler
            </button>
            <button onClick={handleSave} disabled={submitting || loading || groups.length === 0}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40 font-medium">
              {submitting ? 'Enregistrement...' : 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignGroupModal;