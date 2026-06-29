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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-blue-50">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Affecter au groupe</h2>
            <p className="text-[11px] text-slate-400">
              {inscription.etudiant?.nom} {inscription.etudiant?.prenom} · {inscription.formation?.nom}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-6">
              <Users size={28} className="mx-auto text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">Aucun groupe actif pour cette formation.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition
                ${selected === '' ? 'border-slate-300 bg-slate-50' : 'border-slate-100 hover:border-slate-200'}`}>
                <input type="radio" name="group" value=""
                  checked={selected === ''} onChange={() => setSelected('')}
                  className="accent-slate-400" />
                <span className="text-xs text-slate-400 italic">— Aucun groupe —</span>
              </label>

              {groups.map(g => (
                <label key={g.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition
                  ${selected === g.id ? 'border-blue-400 bg-blue-50/60' : 'border-blue-100 hover:border-blue-200'}`}>
                  <input type="radio" name="group" value={g.id}
                    checked={selected === g.id} onChange={() => setSelected(g.id)}
                    className="accent-blue-600 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{g.nom}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {g.jours_formation && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Calendar size={9} />{g.jours_formation}
                        </span>
                      )}
                      {g.heure_formation && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock size={9} />{g.heure_formation}
                        </span>
                      )}
                      {g.teacher && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <UserCheck size={9} />{g.teacher.nom} {g.teacher.prenom}
                        </span>
                      )}
                    </div>
                  </div>
                  {selected === g.id && (
                    <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 self-center">✓</span>
                  )}
                </label>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
              Annuler
            </button>
            <button onClick={handleSave} disabled={submitting || loading || groups.length === 0}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 font-medium">
              {submitting ? 'Enregistrement...' : 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignGroupModal;