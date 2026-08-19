import { useState, useEffect } from 'react';
import { X, Users, GraduationCap, Calendar } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';
const labelCls = 'flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5';

const Row = ({ icon: Icon, label, children, required }) => (
  <div>
    <p className={labelCls}>
      {Icon && <Icon size={10} className="text-slate-500" />}{label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </p>
    {children}
  </div>
);

const CreateGroupQuickModal = ({ formation_id, onClose, onCreated }) => {
  const [teachers, setTeachers] = useState([]);
  const [nom, setNom] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/teachers?formation_id=${formation_id}`, { headers: getHeaders() })
      .then(r => r.json())
      .then(data => setTeachers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [formation_id]);

  const handleCreate = async () => {
    if (!nom.trim()) { setError('Le nom du groupe est obligatoire.'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`${API}/api/groups`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          nom: nom.trim(),
          formation_id,
          teacher_id: teacherId || null,
          date_debut: dateDebut || null,
        }),
      });
      if (!res.ok) throw new Error('Erreur lors de la création du groupe');
      const saved = await res.json();
      onCreated?.({
        id: saved.id,
        nom: saved.nom,
        jours_formation: saved.jours_formation ?? null,
        heure_formation: saved.heure_formation ?? null,
        date_debut: saved.date_debut ?? null,
        date_fin: saved.date_fin ?? null,
        statut: saved.statut ?? 'active',
        teacher: teachers.find(t => t.id === teacherId) ?? null,
        capacite: null,
      });
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl  bg-[#0369A1] flex items-center justify-center shrink-0">
              <Users size={16} className="text-white" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800">Créer un groupe</h2>
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
        <Row icon={Users} label="Nom du groupe" required>
          <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex: Groupe A" className={inp} />
        </Row>
        <Row icon={GraduationCap} label="Professeur">
          <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className={inp}>
            <option value="">— Aucun professeur —</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.nom} {t.prenom}</option>)}
          </select>
        </Row>
        <Row icon={Calendar} label="Date de début">
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className={inp} />
        </Row>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
          <button onClick={handleCreate} disabled={submitting}
            className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] disabled:opacity-40 transition-all font-medium">
            {submitting ? 'Création...' : 'Créer et sélectionner'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupQuickModal;