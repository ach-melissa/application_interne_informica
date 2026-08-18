import { useState, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  User, Mail, Phone, Shield, Calendar, AtSign,
  Pencil, Lock, X, Eye, EyeOff, Loader2, Check, Camera, Trash2, UserCircle,
} from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';
import ProfLayout from '../../../layouts/ProfLayout';
import ComptableLayout from '../../../layouts/ComptableLayout';
import SuperAdminLayout from '../../../layouts/SuperAdminLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ROLE_LABELS = { admin: 'Administrateur', prof: 'Professeur', comptable: 'Comptable', super_admin: 'Super Administrateur' };
const ROLE_COLORS = {
  admin: 'bg-[#DCEBFA] text-[#0369A1]', prof: 'bg-emerald-50 text-emerald-700',
  comptable: 'bg-purple-50 text-purple-700', super_admin: 'bg-amber-50 text-amber-700',
};

const getInitials = (user) => ((user?.nom?.[0] || '') + (user?.prenom?.[0] || '')).toUpperCase() || '?';

const formatDate = (value) => {
  if (!value) return '—';
  try { return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return value; }
};

const formatMemberSince = (value) => {
  if (!value) return null;
  try {
    const str = new Date(value).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  } catch { return null; }
};

const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';

const Field = ({ icon: Icon, label, required, ...props }) => (
  <div>
    <label className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">
      {Icon && <Icon size={10} className="text-slate-500" />}{label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <input {...props} required={required} className={inp} />
  </div>
);
// ============================================================
// Modal — modifier les informations personnelles (+ photo)
// ============================================================
const EditProfileModal = ({ user, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    nom: user?.nom || '', prenom: user?.prenom || '', email: user?.email || '',
    nom_utilisateur: user?.nom_utilisateur || '', telephone: user?.telephone || '',
    date_naissance: user?.date_naissance?.slice(0, 10) || '',
  });
  const [photo, setPhoto] = useState(null); // File | 'REMOVE' | null
  const [preview, setPreview] = useState(user?.photo_url ?? null);
    const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file); setPreview(URL.createObjectURL(file));
  };
  const handleRemovePhoto = () => { setPhoto('REMOVE'); setPreview(null); };

    const requestSubmit = (e) => {
    e.preventDefault();
    if (!form.nom || !form.prenom || !form.email || !form.nom_utilisateur) {
      setError('Nom, prénom, email et nom d\'utilisateur sont obligatoires.'); return;
    }
    setError(''); setConfirm(true);
  };

  const handleSubmit = async () => {
    setError(''); setLoading(true); setConfirm(false);
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      let data = await res.json();
      if (!res.ok) { setError(data.message || 'Une erreur est survenue'); return; }

      if (photo && photo !== 'REMOVE') {
        const fd = new FormData(); fd.append('photo', photo);
        const r = await fetch(`${API_URL}/api/users/me/photo`, { method: 'POST', headers, body: fd });
        const d = await r.json();
        if (r.ok) data = d;
      } else if (photo === 'REMOVE') {
        const r = await fetch(`${API_URL}/api/users/me/photo`, { method: 'DELETE', headers });
        const d = await r.json();
        if (r.ok) data = d;
      }

      onSuccess(data); onClose();
    } catch { setError('Erreur de connexion au serveur'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-md shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
                <Pencil size={14} className="text-white" />
              </span>
              Modifier mon profil
            </h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>
                  {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 mx-5 mb-3 rounded-md">{error}</p>}
          {confirm && (
            <div className="flex items-center justify-between gap-3 mx-5 mb-3 rounded-md p-3 bg-[#DCEBFA]/50 text-[#0369A1]">
              <p className="text-xs">Confirmer les modifications ?</p>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => setConfirm(false)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                <button type="button" onClick={handleSubmit} disabled={loading} className="text-xs px-3 py-1.5 rounded-md text-white bg-[#0F2A4A] hover:bg-[#16385f] disabled:opacity-40">
                  {loading ? '...' : 'Oui'}
                </button>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={requestSubmit} className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="group relative w-16 h-16 rounded-full bg-[#DCEBFA] flex items-center justify-center overflow-hidden flex-shrink-0">
              {preview
                ? <img src={preview} alt="" className="w-full h-full object-cover" />
                : <span className="text-lg font-bold text-[#0369A1]">{getInitials(user)}</span>}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <label className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center cursor-pointer hover:bg-white">
                  <Camera size={12} className="text-[#0369A1]" />
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />
                </label>
                {preview && (
                  <button type="button" onClick={handleRemovePhoto} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center hover:bg-white">
                    <Trash2 size={12} className="text-red-500" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-[#1E293B]">Photo de profil</p>
              <p className="text-[10px] text-slate-400">Survolez la photo pour la changer.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
                    <Field icon={User} label="Nom" name="nom" value={form.nom} onChange={handleChange} required />
            <Field icon={User} label="Prénom" name="prenom" value={form.prenom} onChange={handleChange} required />
            <div className="col-span-2"><Field icon={Mail} label="Email" type="email" name="email" value={form.email} onChange={handleChange} required /></div>
            <Field icon={AtSign} label="Nom d'utilisateur" name="nom_utilisateur" value={form.nom_utilisateur} onChange={handleChange} required />
            <Field icon={Phone} label="Téléphone" name="telephone" value={form.telephone} onChange={handleChange} />
            <Field icon={Calendar} label="Date de naissance" type="date" name="date_naissance" value={form.date_naissance} onChange={handleChange} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] disabled:opacity-40 transition-all font-medium">
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// Modal — changer le mot de passe
// ============================================================
const ChangePasswordModal = ({ onClose }) => {
  const [form, setForm] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [showPwd, setShowPwd] = useState({ ancien: false, nouveau: false, confirmation: false });
  const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const toggleShow = (field) => setShowPwd((s) => ({ ...s, [field]: !s[field] }));

    const requestSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.ancien || !form.nouveau || !form.confirmation) { setError('Tous les champs sont obligatoires'); return; }
    if (form.nouveau !== form.confirmation) { setError('Les nouveaux mots de passe ne correspondent pas'); return; }
    if (form.nouveau.length < 6) { setError('Le nouveau mot de passe doit contenir au moins 6 caractères'); return; }
    setConfirm(true);
  };

  const handleSubmit = async () => {
    setError(''); setConfirm(false); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/me/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ancien_mot_de_passe: form.ancien, nouveau_mot_de_passe: form.nouveau }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Une erreur est survenue'); return; }
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch { setError('Erreur de connexion au serveur'); }
    finally { setLoading(false); }
  };

    const pwdField = (name, label) => (
    <div>
      <label className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">
        <Lock size={10} className="text-slate-500" />{label}<span className="text-red-500 ml-0.5">*</span>
      </label>
      <div className="relative">
           <input type={showPwd[name] ? 'text' : 'password'} name={name} value={form[name]} onChange={handleChange} required className={`${inp} pr-8`} />
        <button type="button" onClick={() => toggleShow(name)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {showPwd[name] ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-md shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
                <Lock size={14} className="text-white" />
              </span>
              Changer le mot de passe
            </h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>
                {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 mx-5 mb-3 rounded-md">{error}</p>}
          {confirm && (
            <div className="flex items-center justify-between gap-3 mx-5 mb-3 rounded-md p-3 bg-[#DCEBFA]/50 text-[#0369A1]">
              <p className="text-xs">Confirmer le changement de mot de passe ?</p>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => setConfirm(false)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                <button type="button" onClick={handleSubmit} disabled={loading} className="text-xs px-3 py-1.5 rounded-md text-white bg-[#0F2A4A] hover:bg-[#16385f] disabled:opacity-40">
                  {loading ? '...' : 'Oui'}
                </button>
              </div>
            </div>
          )}
        </div>

        {success ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center"><Check size={24} className="text-emerald-600" /></div>
            <p className="text-sm font-medium text-[#1E293B]">Mot de passe mis à jour</p>
          </div>
        ) : (
                  <form onSubmit={requestSubmit} className="p-5 space-y-3">
            {pwdField('ancien', 'Mot de passe actuel')}
            {pwdField('nouveau', 'Nouveau mot de passe')}
            {pwdField('confirmation', 'Confirmer le nouveau mot de passe')}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-[#F1F5F9]">Annuler</button>
              <button type="submit" disabled={loading}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] disabled:opacity-40 transition-all font-medium">
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Mettre à jour
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ============================================================
// Sections
// ============================================================
const SECTIONS = (user) => [
  { title: 'Coordonnées', color: 'bg-[#DCEBFA] text-[#0369A1]', items: [
    { icon: Mail, label: 'Email', value: user?.email || '—' },
    { icon: Phone, label: 'Téléphone', value: user?.telephone || '—' },
  ] },
  { title: 'Compte', color: 'bg-purple-50 text-purple-700', items: [
    user?.nom_utilisateur && { icon: AtSign, label: "Nom d'utilisateur", value: user.nom_utilisateur },
    { icon: Shield, label: 'Rôle', value: ROLE_LABELS[user?.role] ?? user?.role },
    { icon: Calendar, label: 'Inscrit le', value: formatDate(user?.created_at) },
  ].filter(Boolean) },
  { title: 'Informations personnelles', color: 'bg-emerald-50 text-emerald-700', items: [
    { icon: Calendar, label: 'Date de naissance', value: formatDate(user?.date_naissance) },
  ] },
];

const ProfileContent = ({ user, onUpdated }) => {
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const isActive = !user?.archived;
  const memberSince = formatMemberSince(user?.created_at);
  const sections = SECTIONS(user);

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
          <UserCircle size={22} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Mon Profil</h1>
      </div>

      <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] p-5 mb-5 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            {user?.photo_url ? (
              <img src={user.photo_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-[#0369A1] bg-[#DCEBFA] w-full h-full flex items-center justify-center">{getInitials(user)}</span>
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1E293B]">{user?.nom} {user?.prenom}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[user?.role] ?? 'bg-gray-100 text-gray-500'}`}>
                {ROLE_LABELS[user?.role] ?? user?.role}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                {isActive ? 'Compte actif' : 'Compte inactif'}
              </span>
              {memberSince && <span className="text-xs text-slate-400">· Membre depuis {memberSince}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 bg-[#0369A1] text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-[#0284C7]">
            <Pencil size={12} /> Modifier
          </button>
          <button onClick={() => setPwdOpen(true)}
            className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-[#F1F5F9]">
            <Lock size={12} /> Mot de passe
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] p-4">
            <h3 className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase mb-3">{section.title}</h3>
            {section.items.map(({ icon: Icon, label, value }, idx) => (
              <div key={label} className={`flex items-center gap-3 py-2.5 ${idx !== section.items.length - 1 ? 'border-b border-[#F1F5F9]' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${section.color}`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400">{label}</p>
                  <p className="text-xs font-semibold text-[#1E293B] truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {editOpen && <EditProfileModal user={user} onClose={() => setEditOpen(false)} onSuccess={onUpdated} />}
      {pwdOpen && <ChangePasswordModal onClose={() => setPwdOpen(false)} />}
    </div>
  );
};

const Profile = () => {
  const { user, updateUser } = useAuth();

  if (user?.role === 'prof') return <ProfLayout><ProfileContent user={user} onUpdated={updateUser} /></ProfLayout>;
  if (user?.role === 'comptable') return <ComptableLayout><ProfileContent user={user} onUpdated={updateUser} /></ComptableLayout>;
  if (user?.role === 'super_admin') return <SuperAdminLayout><ProfileContent user={user} onUpdated={updateUser} /></SuperAdminLayout>;
  return <AdminLayout><ProfileContent user={user} onUpdated={updateUser} /></AdminLayout>;
};

export default Profile;