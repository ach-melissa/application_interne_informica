import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, CalendarDays, Shield, Lock, Eye, EyeOff, Camera, Trash2, Loader2, BookOpen, CheckCircle2, Plus } from 'lucide-react';
const API = import.meta.env.VITE_API_URL;


const roleMeta = { admin: 'Admin', super_admin: 'Super Admin', prof: 'Prof', comptable: 'Comptable' };
const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';

// Label — supports a red "*" when the field is required
const Label = ({ icon: Icon, text, required }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} className="text-slate-500" />}
    {text}
    {required && <span className="text-red-500 ml-0.5">*</span>}
  </p>
);

// Toggle switch for actif / inactif
const StatusToggle = ({ active, onChange }) => (
  <div className="flex items-center justify-between bg-white border border-slate-200 rounded px-2.5 py-1.5">
    <span className={`flex items-center gap-1.5 text-xs font-medium ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
      <CheckCircle2 size={13} />
      {active ? 'Actif' : 'Inactif'}
    </span>
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={`relative w-9 h-5 rounded-full transition-colors ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
          active ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const AddUserModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', nom_utilisateur: '',
    mot_de_passe: '', telephone: '', date_naissance: '', role: 'prof',
  });
  const [active, setActive] = useState(true);
  const [formations, setFormations] = useState([]);
  const [selectedFormations, setSelectedFormations] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState(null);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/users/roles`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(setRoles)
      .catch(() => {});
  }, []);
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
  if (!isValidEmail(form.email)) {
    setError('Adresse email invalide.'); return;
  }
  setSubmit(true); setError(null);
    try {
     const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('archived', (!active).toString());
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
      <div className="bg-white rounded-md shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Sticky header — error message lives here too, so it's always visible without scrolling */}
        <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
                <User size={14} className="text-white"/>
              </span>
              Ajouter un utilisateur
            </h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>
          {error && (
            <p className="text-red-500 text-xs bg-red-50 px-3 py-2 mx-5 mb-3 rounded-md">{error}</p>
          )}
        </div>

        <div className="p-5 space-y-4">

          {/* Photo — hover overlay with camera (upload) + trash (remove), with a title next to it */}
          <div className="flex items-center gap-3">
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
            <div>
              <p className="text-xs font-medium text-[#1E293B]">Photo de profil</p>
              <p className="text-[10px] text-slate-400">Vous pouvez ajouter une photo de profil pour cet utilisateur.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label icon={User} text="Nom" required /><input value={form.nom} onChange={set('nom')} className={inp} /></div>
            <div><Label icon={User} text="Prénom" required /><input value={form.prenom} onChange={set('prenom')} className={inp} /></div>
            <div className="col-span-2"><Label icon={Mail} text="Email" required /><input type="email" value={form.email} onChange={set('email')} className={inp} /></div>
            <div><Label icon={User} text="Nom d'utilisateur" required /><input value={form.nom_utilisateur} onChange={set('nom_utilisateur')} className={inp} /></div>
               <div>
              <Label icon={Lock} text="Mot de passe" required />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.mot_de_passe}
                  onChange={set('mot_de_passe')}
                  className={`${inp} pr-8`}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>         <div><Label icon={Lock} text="Mot de passe" required /><input type="password" value={form.mot_de_passe} onChange={set('mot_de_passe')} className={inp} /></div>
            <div><Label icon={Phone} text="Téléphone" /><input value={form.telephone} onChange={set('telephone')} className={inp} /></div>
            <div><Label icon={CalendarDays} text="Date naissance" /><input type="date" value={form.date_naissance} onChange={set('date_naissance')} className={inp} /></div>
            <div>
              <Label icon={Shield} text="Rôle" />
              <select value={form.role} onChange={set('role')} className={inp}>
                {roles.map(r => <option key={r} value={r}>{roleMeta[r] ?? r}</option>)}
              </select>
            </div>
            <div>
              <Label icon={CheckCircle2} text="Statut" />
              <StatusToggle active={active} onChange={setActive} />
            </div>
          </div>

          {form.role === 'prof' && (
            <div>
              <Label icon={BookOpen} text="Formations enseignées" />
              {formations.length === 0 ? (
                <p className="text-xs text-slate-400 bg-[#F8FAFC] rounded-lg px-3 py-2">Aucune formation active.</p>
              ) : (
                <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {formations.map(f => {
                    const checked = selectedFormations.includes(f.id);
                    return (
                      <label
                        key={f.id}
                        className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors ${
                          checked ? 'bg-[#DCEBFA]/40 text-[#0369A1] font-medium' : 'text-slate-600 hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFormation(f.id)}
                          className="accent-[#0369A1] w-3.5 h-3.5"
                        />
                        <span className="truncate">{f.nom}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {selectedFormations.length > 0 && (
                <p className="text-[10px] text-slate-400 mt-1">{selectedFormations.length} formation(s) sélectionnée(s)</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40 font-medium flex items-center gap-1">
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              {submitting ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUserModal;