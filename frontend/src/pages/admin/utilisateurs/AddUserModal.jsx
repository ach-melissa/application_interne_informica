import { useState } from 'react';
import { X, User, Mail, Phone, Calendar, Shield, Lock } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const ROLES = ['admin','prof','comptable'];
const roleMeta = { admin: 'Admin', prof: 'Prof', comptable: 'Comptable' };
const inp = 'w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';
const Label = ({ icon: Icon, text }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} />}{text}
  </p>
);

const AddUserModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', nom_utilisateur: '',
    mot_de_passe: '', telephone: '', date_naissance: '', role: 'prof',
  });
  const [submitting, setSubmit] = useState(false);
  const [error, setError]       = useState(null);

  const set = f => ev => setForm(p => ({ ...p, [f]: ev.target.value }));

  const handleSubmit = async () => {
    if (!form.nom || !form.prenom || !form.email || !form.nom_utilisateur || !form.mot_de_passe) {
      setError("Nom, prénom, email, nom d'utilisateur et mot de passe sont obligatoires."); return;
    }
    setSubmit(true); setError(null);
    try {
      const res = await fetch(`${API}/api/users`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message);
      onSuccess?.(); onClose();
    } catch (err) { setError(err.message); }
    finally { setSubmit(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-blue-50 sticky top-0 bg-white z-10">
          <h2 className="text-sm font-semibold text-slate-800">Ajouter un utilisateur</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-3">
          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="bg-blue-50/40 rounded-xl border border-blue-100 p-4 grid grid-cols-2 gap-3">
            <div><Label icon={User} text="Nom *" /><input value={form.nom} onChange={set('nom')} className={inp} /></div>
            <div><Label icon={User} text="Prénom *" /><input value={form.prenom} onChange={set('prenom')} className={inp} /></div>
            <div className="col-span-2"><Label icon={Mail} text="Email *" /><input type="email" value={form.email} onChange={set('email')} className={inp} /></div>
            <div><Label icon={Phone} text="Téléphone" /><input value={form.telephone} onChange={set('telephone')} className={inp} /></div>
            <div><Label icon={Calendar} text="Date naissance" /><input type="date" value={form.date_naissance} onChange={set('date_naissance')} className={inp} /></div>
          </div>

          <div className="bg-blue-50/40 rounded-xl border border-blue-100 p-4 grid grid-cols-2 gap-3">
            <div><Label icon={User} text="Nom d'utilisateur *" /><input value={form.nom_utilisateur} onChange={set('nom_utilisateur')} className={inp} /></div>
            <div><Label icon={Lock} text="Mot de passe *" /><input type="password" value={form.mot_de_passe} onChange={set('mot_de_passe')} className={inp} /></div>
            <div className="col-span-2">
              <Label icon={Shield} text="Rôle" />
              <select value={form.role} onChange={set('role')} className={inp}>
                {ROLES.map(r => <option key={r} value={r}>{roleMeta[r]}</option>)}
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

export default AddUserModal;