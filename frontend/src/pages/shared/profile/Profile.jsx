import { useState, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  User, Mail, Phone, Shield, Calendar, AtSign,
  Pencil, Lock, X, Eye, EyeOff, Loader2, Check, Camera, Trash2,
} from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';
import ProfLayout from '../../../layouts/ProfLayout';
import ComptableLayout from '../../../layouts/ComptableLayout';
import SuperAdminLayout from '../../../layouts/SuperAdminLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ROLE_LABELS = {
  admin: 'Administrateur',
  prof: 'Professeur',
  comptable: 'Comptable',
  super_admin: 'Super Administrateur',
};

const ROLE_COLORS = {
  admin: 'bg-[#DCEBFA] text-[#0369A1]',
  prof: 'bg-emerald-50 text-emerald-700',
  comptable: 'bg-purple-50 text-purple-700',
  super_admin: 'bg-amber-50 text-amber-700',
};

const getInitials = (user) => {
  const n = user?.nom?.[0] || '';
  const p = user?.prenom?.[0] || '';
  return (n + p).toUpperCase() || '?';
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return value;
  }
};

const formatMemberSince = (value) => {
  if (!value) return null;
  try {
    const str = new Date(value).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  } catch {
    return null;
  }
};

// ============================================================
// Modal — modifier les informations personnelles
// ============================================================
const Field = ({ icon: Icon, label, ...props }) => (
  <div>
    <label className="text-xs font-medium text-[#64748B] flex items-center gap-1.5 mb-1">
      {Icon && <Icon size={13} className="text-[#0369A1]" />}
      {label}
    </label>
    <input
      {...props}
      className="w-full px-3 py-2.5 rounded-lg bg-[#F8FAFC] border border-transparent text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors"
    />
  </div>
);

const EditProfileModal = ({ user, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    email: user?.email || '',
    nom_utilisateur: user?.nom_utilisateur || '',
    telephone: user?.telephone || '',
    date_naissance: user?.date_naissance || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Une erreur est survenue'); return; }
      onSuccess(data);
      onClose();
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9]">
          <h3 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#DCEBFA] text-[#0369A1] flex items-center justify-center">
              <Pencil size={14} />
            </span>
            Modifier mon profil
          </h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1E293B]"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field icon={User} label="Nom" name="nom" value={form.nom} onChange={handleChange} />
            <Field icon={User} label="Prénom" name="prenom" value={form.prenom} onChange={handleChange} />
          </div>
          <Field icon={AtSign} label="Nom d'utilisateur" name="nom_utilisateur" value={form.nom_utilisateur} onChange={handleChange} />
          <Field icon={Mail} label="Email" type="email" name="email" value={form.email} onChange={handleChange} />
          <Field icon={Phone} label="Téléphone" name="telephone" value={form.telephone} onChange={handleChange} />
          <Field icon={Calendar} label="Date de naissance" type="date" name="date_naissance" value={form.date_naissance || ''} onChange={handleChange} />

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9]">Annuler</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#0F2A4A] hover:bg-[#16385f] disabled:opacity-60 flex items-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Enregistrer
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

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const toggleShow = (field) => setShowPwd((s) => ({ ...s, [field]: !s[field] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.nouveau !== form.confirmation) { setError('Les nouveaux mots de passe ne correspondent pas'); return; }
    if (form.nouveau.length < 6) { setError('Le nouveau mot de passe doit contenir au moins 6 caractères'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/me/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ ancien_mot_de_passe: form.ancien, nouveau_mot_de_passe: form.nouveau }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Une erreur est survenue'); return; }
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const pwdField = (name, label) => (
    <div>
      <label className="text-xs font-medium text-[#64748B] flex items-center gap-1.5 mb-1">
        <Lock size={13} className="text-[#0369A1]" />
        {label}
      </label>
      <div className="relative">
        <input
          type={showPwd[name] ? 'text' : 'password'}
          name={name} value={form[name]} onChange={handleChange}
          className="w-full px-3 py-2.5 pr-10 rounded-lg bg-[#F8FAFC] border border-transparent text-sm text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors"
        />
        <button type="button" onClick={() => toggleShow(name)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0369A1]">
          {showPwd[name] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9]">
          <h3 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#DCEBFA] text-[#0369A1] flex items-center justify-center"><Lock size={14} /></span>
            Changer le mot de passe
          </h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1E293B]"><X size={20} /></button>
        </div>

        {success ? (
          <div className="px-6 py-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center"><Check size={24} className="text-emerald-600" /></div>
            <p className="text-sm font-medium text-[#1E293B]">Mot de passe mis à jour</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {pwdField('ancien', 'Mot de passe actuel')}
            {pwdField('nouveau', 'Nouveau mot de passe')}
            {pwdField('confirmation', 'Confirmer le nouveau mot de passe')}
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9]">Annuler</button>
              <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#0F2A4A] hover:bg-[#16385f] disabled:opacity-60 flex items-center gap-2">
                {loading && <Loader2 size={14} className="animate-spin" />}
                Mettre à jour
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ============================================================
// Sections — chacune avec sa propre couleur d'icône
// ============================================================
const SECTIONS = (user) => [
  {
    title: 'Coordonnées',
    color: 'bg-[#DCEBFA] text-[#0369A1]',
    items: [
      { icon: Mail, label: 'Email', value: user?.email || '—' },
      { icon: Phone, label: 'Téléphone', value: user?.telephone || '—' },
    ],
  },
  {
    title: 'Compte',
    color: 'bg-purple-50 text-purple-700',
    items: [
      user?.nom_utilisateur && { icon: AtSign, label: "Nom d'utilisateur", value: user.nom_utilisateur },
      { icon: Shield, label: 'Rôle', value: ROLE_LABELS[user?.role] ?? user?.role },
      { icon: Calendar, label: 'Inscrit le', value: formatDate(user?.created_at) },
    ].filter(Boolean),
  },
  {
    title: 'Informations personnelles',
    color: 'bg-emerald-50 text-emerald-700',
    items: [
      { icon: Calendar, label: 'Date de naissance', value: formatDate(user?.date_naissance) },
    ],
  },
];

const ProfileContent = ({ user, onUpdated }) => {
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef(null);

  const isActive = !user?.archived;
  const memberSince = formatMemberSince(user?.created_at);
  const sections = SECTIONS(user);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`${API_URL}/api/users/me/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) onUpdated(data);
    } finally {
      setPhotoLoading(false);
      e.target.value = '';
    }
  };

  const handlePhotoDelete = async () => {
    setPhotoLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/me/photo`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (res.ok) onUpdated(data);
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-[#1E293B]">Mon Profil</h1>
        <p className="text-[#64748B] text-sm mt-1">Vos informations personnelles</p>
      </div>

      {/* Header card — avatar/infos à gauche, actions à droite */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 group shrink-0">
            <div className="w-16 h-16 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
              {user?.photo_url ? (
                <img src={user.photo_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-[#0369A1] bg-[#DCEBFA] w-full h-full flex items-center justify-center">{getInitials(user)}</span>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {photoLoading ? (
                <Loader2 size={14} className="text-white animate-spin" />
              ) : (
                <>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-white hover:scale-110 transition-transform" title="Changer la photo"><Camera size={13} /></button>
                  {user?.photo_url && (
                    <button type="button" onClick={handlePhotoDelete} className="text-white hover:scale-110 transition-transform" title="Supprimer la photo"><Trash2 size={13} /></button>
                  )}
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#1E293B]">{user?.nom} {user?.prenom}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[user?.role] ?? 'bg-gray-100 text-gray-500'}`}>
                {ROLE_LABELS[user?.role] ?? user?.role}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                {isActive ? 'Compte actif' : 'Compte inactif'}
              </span>
              {memberSince && <span className="text-xs text-[#94A3B8]">· Membre depuis {memberSince}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F2A4A] hover:bg-[#16385f] text-sm font-medium text-white">
            <Pencil size={14} /> Modifier
          </button>
          <button onClick={() => setPwdOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#1E293B] hover:bg-[#F1F5F9]">
            <Lock size={14} /> Mot de passe
          </button>
        </div>
      </div>

      {/* Sections d'informations en colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5">
            <h3 className="text-xs font-semibold tracking-wide text-[#94A3B8] uppercase mb-3">{section.title}</h3>
            {section.items.map(({ icon: Icon, label, value }, idx) => (
              <div key={label} className={`flex items-center gap-3 py-3 ${idx !== section.items.length - 1 ? 'border-b border-[#F1F5F9]' : ''}`}>
                <div className={`w-10 h-10 rounded-2xl border border-white shadow-sm flex items-center justify-center shrink-0 ${section.color}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#94A3B8]">{label}</p>
                  <p className="text-sm font-semibold text-[#1E293B] truncate">{value}</p>
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

  if (user?.role === 'prof') {
    return <ProfLayout><ProfileContent user={user} onUpdated={updateUser} /></ProfLayout>;
  }
  if (user?.role === 'comptable') {
    return <ComptableLayout><ProfileContent user={user} onUpdated={updateUser} /></ComptableLayout>;
  }
  if (user?.role === 'super_admin') {
    return <SuperAdminLayout><ProfileContent user={user} onUpdated={updateUser} /></SuperAdminLayout>;
  }
  return <AdminLayout><ProfileContent user={user} onUpdated={updateUser} /></AdminLayout>;
};

export default Profile;