import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Calendar, Shield, Lock, Camera, Trash2, Loader2 } from 'lucide-react';
const API = import.meta.env.VITE_API_URL;

const ROLES = ['admin','prof','comptable'];
const roleMeta = { admin: 'Admin', prof: 'Prof', comptable: 'Comptable' };
const inp = 'w-full bg-[#F8FAFC] border border-transparent rounded-lg px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors';
const Label = ({ icon: Icon, text }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} className="text-[#0369A1]" />}{text}
  </p>
);

const AddUserModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', nom_utilisateur: '',
    mot_de_passe: '', telephone: '', date_naissance: '', role: 'prof',
  });
  const [formations, setFormations] = useState([]);
  const [selectedFormations, setSelectedFormations] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmit] = useState(false);
  const [error, setError]       = useState(null);

  const set = f => ev => setForm(p => ({ ...p, [f]: ev.target.value }));

  useEffect(() => {
    fetch(`${API}/api/formations`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(data => setFormations(data.filter(f => f.statut === 'active')))
      .catch(() => {});
  }, []);

  const toggleFormation = (id) => {
    setSelectedFormations(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleSubmit = async () => {
    if (!form.nom || !form.prenom || !form.email || !form.nom_utilisateur || !form.mot_de_passe) {
      setError("Nom, prénom, email, nom d'utilisateur et mot de passe sont obligatoires."); return;
    }
    setSubmit(true); setError(null);
    try {
     const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (form.role === 'prof') fd.append('formation_ids', JSON.stringify(selectedFormations));
      if (photo) fd.append('photo', photo);

      const res = await fetch(`${API}/api/users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, // pas de Content-Type, le navigateur le fixe pour multipart
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message);
      onSuccess?.(); onClose();
    } catch (err) { setError(err.message); }
    finally { setSubmit(false); }
  };

  const handlePhoto = ev => {
    const file = ev.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    setPreview(null);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] sticky top-0 bg-white z-10">
          <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#DCEBFA] text-[#0369A1] flex items-center justify-center">
              <User size={14} />
            </span>
            Ajouter un utilisateur
          </h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {/* Photo — hover overlay with camera (upload) + trash (remove) */}
          <div className="flex justify-center">
            <div className="group relative w-16 h-16 rounded-full bg-[#DCEBFA] flex items-center justify-center overflow-hidden flex-shrink-0">
              {preview
                ? <img src={preview} alt="" className="w-full h-full object-cover" />
                : <Camera size={18} className="text-[#0369A1]" />}

              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {submitting ? (
                  <Loader2 size={16} className="text-white animate-spin" />
                ) : (
                  <>
                    <label className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center cursor-pointer hover:bg-white">
                      <Camera size={12} className="text-[#0369A1]" />
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />
                    </label>
                    {preview && (
                      <button onClick={handleRemovePhoto} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center hover:bg-white">
                        <Trash2 size={12} className="text-red-500" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label icon={User} text="Nom *" /><input value={form.nom} onChange={set('nom')} className={inp} /></div>
            <div><Label icon={User} text="Prénom *" /><input value={form.prenom} onChange={set('prenom')} className={inp} /></div>
            <div className="col-span-2"><Label icon={Mail} text="Email *" /><input type="email" value={form.email} onChange={set('email')} className={inp} /></div>
            <div><Label icon={Phone} text="Téléphone" /><input value={form.telephone} onChange={set('telephone')} className={inp} /></div>
            <div><Label icon={Calendar} text="Date naissance" /><input type="date" value={form.date_naissance} onChange={set('date_naissance')} className={inp} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label icon={User} text="Nom d'utilisateur *" /><input value={form.nom_utilisateur} onChange={set('nom_utilisateur')} className={inp} /></div>
            <div><Label icon={Lock} text="Mot de passe *" /><input type="password" value={form.mot_de_passe} onChange={set('mot_de_passe')} className={inp} /></div>
            <div className="col-span-2">
              <Label icon={Shield} text="Rôle" />
              <select value={form.role} onChange={set('role')} className={inp}>
                {ROLES.map(r => <option key={r} value={r}>{roleMeta[r]}</option>)}
              </select>
            </div>
          </div>

          {form.role === 'prof' && (
            <div>
              <Label icon={Shield} text="Formations enseignées" />
              {formations.length === 0 ? (
                <p className="text-xs text-slate-400">Aucune formation active.</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border border-[#F1F5F9] rounded-lg p-2">
                  {formations.map(f => (
                    <label key={f.id} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFormations.includes(f.id)}
                        onChange={() => toggleFormation(f.id)}
                      />
                      {f.nom}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40 font-medium">
              {submitting ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;