import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, GraduationCap, Calendar, Users, Radio, UserCheck } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

const SOURCE_OPTS     = ['Amis/Famille','Instagram','TikTok','Facebook','Recherche Google','Site Web','Bouche-à-oreille','Publicité','Autre'];
const REGISTERED_OPTS = ['hanane','yasmine','page_facebook','amira'];
const NIVEAU_OPTS     = ['Primaire','Moyen','Lycée','BEM','BAC','Licence','Master','Doctorat','Autre'];

const inp = 'w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';
const Label = ({ icon: Icon, text }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} />}{text}
  </p>
);

const AddEtudiantModal = ({ onClose, onSuccess }) => {
  const [formations, setFormations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);
  const [form, setForm] = useState({
    nom: '', prenom: '', telephone: '', email: '', adresse: '',
    niveau_scolaire: '', date_naissance: '', lieu_naissance: '',
    formation_id: '', source: '', registered_by: '',
  });

  useEffect(() => {
    fetch(`${API}/api/formations`, { headers: getHeaders() })
      .then(r => r.json()).then(setFormations).catch(console.error);
  }, []);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.nom || !form.prenom || !form.telephone || !form.formation_id) {
      setError('Nom, prénom, téléphone et formation sont obligatoires.'); return;
    }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`${API}/api/etudiants`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess?.(); onClose();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-blue-50 sticky top-0 bg-white z-10">
          <h2 className="text-sm font-semibold text-slate-800">Ajouter un étudiant</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          {/* Personal info */}
          <div className="bg-blue-50/40 rounded-xl border border-blue-100 p-4 grid grid-cols-2 gap-3">
            <div><Label icon={User} text="Nom *" /><input value={form.nom} onChange={set('nom')} className={inp} /></div>
            <div><Label icon={User} text="Prénom *" /><input value={form.prenom} onChange={set('prenom')} className={inp} /></div>
            <div><Label icon={Phone} text="Téléphone *" /><input value={form.telephone} onChange={set('telephone')} className={inp} /></div>
            <div><Label icon={Mail} text="Email" /><input type="email" value={form.email} onChange={set('email')} className={inp} /></div>
            <div><Label icon={Calendar} text="Date naissance" /><input type="date" value={form.date_naissance} onChange={set('date_naissance')} className={inp} /></div>
            <div><Label icon={MapPin} text="Lieu naissance" /><input value={form.lieu_naissance} onChange={set('lieu_naissance')} className={inp} /></div>
            <div><Label icon={GraduationCap} text="Niveau scolaire" />
              <select value={form.niveau_scolaire} onChange={set('niveau_scolaire')} className={inp}>
                <option value="">—</option>
                {NIVEAU_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="col-span-2"><Label icon={MapPin} text="Adresse" /><input value={form.adresse} onChange={set('adresse')} className={inp} /></div>
          </div>

          {/* Inscription info */}
          <div className="bg-blue-50/40 rounded-xl border border-blue-100 p-4 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label icon={Users} text="Formation *" />
              <select value={form.formation_id} onChange={set('formation_id')} className={inp}>
                <option value="">Choisir une formation</option>
                {formations.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>
            <div>
              <Label icon={Radio} text="Source" />
              <select value={form.source} onChange={set('source')} className={inp}>
                <option value="">—</option>
                {SOURCE_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <Label icon={UserCheck} text="Enregistré par" />
              <select value={form.registered_by} onChange={set('registered_by')} className={inp}>
                <option value="">—</option>
                {REGISTERED_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">Annuler</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 font-medium">
              {submitting ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEtudiantModal;