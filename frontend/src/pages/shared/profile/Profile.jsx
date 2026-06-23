import { useState, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  User, Mail, Phone, Shield, Calendar, AtSign,
  Pencil, Lock, X, Eye, EyeOff, Loader2, Check, Camera, Trash2,
} from 'lucide-react';
import AdminLayout from '../../../layouts/AdminLayout';
import ProfLayout from '../../../layouts/ProfLayout';
import ComptableLayout from '../../../layouts/ComptableLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ROLE_LABELS = {
  admin: 'Administrateur',
  prof: 'Professeur',
  comptable: 'Comptable',
};

const ROLE_COLORS = {
  admin: 'bg-blue-100 text-blue-700',
  prof: 'bg-green-100 text-green-700',
  comptable: 'bg-purple-100 text-purple-700',
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

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
      if (!res.ok) {
        setError(data.message || 'Une erreur est survenue');
        return;
      }
      onSuccess(data);
      onClose();
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h3 className="text-lg font-bold text-[#1E293B]">Modifier mon profil</h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1E293B]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[#64748B]">Nom</label>
              <input
                name="nom" value={form.nom} onChange={handleChange}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#64748B]">Prénom</label>
              <input
                name="prenom" value={form.prenom} onChange={handleChange}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#64748B]">Nom d'utilisateur</label>
            <input
              name="nom_utilisateur" value={form.nom_utilisateur} onChange={handleChange}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#64748B]">Email</label>
            <input
              type="email" name="email" value={form.email} onChange={handleChange}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#64748B]">Téléphone</label>
            <input
              name="telephone" value={form.telephone} onChange={handleChange}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#64748B]">Date de naissance</label>
            <input
              type="date" name="date_naissance" value={form.date_naissance || ''} onChange={handleChange}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9]"
            >
              Annuler
            </button>
            <button
              type="submit" disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 flex items-center gap-2"
            >
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

    if (form.nouveau !== form.confirmation) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }
    if (form.nouveau.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/me/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ancien_mot_de_passe: form.ancien,
          nouveau_mot_de_passe: form.nouveau,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Une erreur est survenue');
        return;
      }
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const pwdField = (name, label) => (
    <div>
      <label className="text-xs font-medium text-[#64748B]">{label}</label>
      <div className="relative mt-1">
        <input
          type={showPwd[name] ? 'text' : 'password'}
          name={name} value={form[name]} onChange={handleChange}
          className="w-full px-3 py-2 pr-10 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        />
        <button
          type="button" onClick={() => toggleShow(name)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
        >
          {showPwd[name] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h3 className="text-lg font-bold text-[#1E293B]">Changer le mot de passe</h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1E293B]">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check size={24} className="text-green-600" />
            </div>
            <p className="text-sm font-medium text-[#1E293B]">Mot de passe mis à jour</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {pwdField('ancien', 'Mot de passe actuel')}
            {pwdField('nouveau', 'Nouveau mot de passe')}
            {pwdField('confirmation', 'Confirmer le nouveau mot de passe')}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button" onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9]"
              >
                Annuler
              </button>
              <button
                type="submit" disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 flex items-center gap-2"
              >
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
// Contenu principal du profil
// ============================================================
const ProfileContent = ({ user, onUpdated }) => {
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef(null);

  const isActive = !user?.archived;
  const memberSince = formatMemberSince(user?.created_at);

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
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E293B]">Mon Profil</h1>
        <p className="text-[#64748B] text-sm mt-1">Vos informations personnelles</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {/* Bannière */}
        <div className="h-16 bg-[#EFF6FF]" />

        {/* Avatar + nom + bouton Modifier */}
        <div className="px-6 -mt-8 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 group">
              <div className="w-16 h-16 rounded-full bg-white border-4 border-white shadow-sm flex items-center justify-center overflow-hidden">
                {user?.photo_url ? (
                  <img src={user.photo_url} alt="avatar" className="w-full h-full object-cover" />
                ) : user?.nom || user?.prenom ? (
                  <span className="text-lg font-bold text-[#2563EB]">{getInitials(user)}</span>
                ) : (
                  <User size={28} className="text-[#2563EB]" />
                )}
              </div>

              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {photoLoading ? (
                  <Loader2 size={16} className="text-white animate-spin" />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-white hover:scale-110 transition-transform"
                      title="Changer la photo"
                    >
                      <Camera size={14} />
                    </button>
                    {user?.photo_url && (
                      <button
                        type="button"
                        onClick={handlePhotoDelete}
                        className="text-white hover:scale-110 transition-transform"
                        title="Supprimer la photo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
            <div className="mt-8">
              <h2 className="text-xl font-bold text-[#1E293B]">
                {user?.nom} {user?.prenom}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-xs text-[#64748B]">
                  {isActive ? 'Compte actif' : 'Compte inactif'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setEditOpen(true)}
            className="mt-8 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#1E293B] hover:bg-[#F1F5F9]"
          >
            <Pencil size={14} />
            Modifier
          </button>
        </div>

        {/* Badges rôle + membre depuis */}
        <div className="px-6 pb-5 flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[user?.role] ?? 'bg-gray-100 text-gray-500'}`}>
            {ROLE_LABELS[user?.role] ?? user?.role}
          </span>
          {memberSince && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
              Membre depuis {memberSince}
            </span>
          )}
        </div>

        <div className="border-t border-[#E2E8F0]" />

        {/* Informations personnelles */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold tracking-wide text-[#94A3B8] mb-3">
            INFORMATIONS PERSONNELLES
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {user?.nom_utilisateur && (
              <div className="rounded-xl border border-[#E2E8F0] px-4 py-3">
                <div className="flex items-center gap-1.5 text-[#94A3B8]">
                  <AtSign size={14} />
                  <span className="text-xs">Nom d'utilisateur</span>
                </div>
                <p className="text-sm font-bold text-[#1E293B] mt-1">{user?.nom_utilisateur}</p>
              </div>
            )}

            <div className="rounded-xl border border-[#E2E8F0] px-4 py-3">
              <div className="flex items-center gap-1.5 text-[#94A3B8]">
                <Mail size={14} />
                <span className="text-xs">Email</span>
              </div>
              <p className="text-sm font-bold text-[#1E293B] mt-1 truncate">{user?.email || '—'}</p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] px-4 py-3">
              <div className="flex items-center gap-1.5 text-[#94A3B8]">
                <Phone size={14} />
                <span className="text-xs">Téléphone</span>
              </div>
              <p className="text-sm font-bold text-[#1E293B] mt-1">{user?.telephone || '—'}</p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] px-4 py-3">
              <div className="flex items-center gap-1.5 text-[#94A3B8]">
                <Calendar size={14} />
                <span className="text-xs">Date de naissance</span>
              </div>
              <p className="text-sm font-bold text-[#1E293B] mt-1">{formatDate(user?.date_naissance)}</p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] px-4 py-3">
              <div className="flex items-center gap-1.5 text-[#94A3B8]">
                <Shield size={14} />
                <span className="text-xs">Rôle</span>
              </div>
              <p className="text-sm font-bold text-[#1E293B] mt-1">
                {ROLE_LABELS[user?.role] ?? user?.role}
              </p>
            </div>

            <div className="rounded-xl border border-[#E2E8F0] px-4 py-3">
              <div className="flex items-center gap-1.5 text-[#94A3B8]">
                <Calendar size={14} />
                <span className="text-xs">Inscrit le</span>
              </div>
              <p className="text-sm font-bold text-[#1E293B] mt-1">{formatDate(user?.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E2E8F0]" />

        {/* Mot de passe */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#64748B]">
            <Lock size={16} />
            <span className="text-sm">Mot de passe</span>
          </div>
          <button
            onClick={() => setPwdOpen(true)}
            className="text-sm font-medium text-[#2563EB] hover:underline"
          >
            Changer le mot de passe
          </button>
        </div>
      </div>

      {editOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setEditOpen(false)}
          onSuccess={onUpdated}
        />
      )}
      {pwdOpen && <ChangePasswordModal onClose={() => setPwdOpen(false)} />}
    </div>
  );
};

const Profile = () => {
  const { user, updateUser } = useAuth();

  if (user?.role === 'prof') {
    return (
      <ProfLayout>
        <ProfileContent user={user} onUpdated={updateUser} />
      </ProfLayout>
    );
  }

  if (user?.role === 'comptable') {
    return (
      <ComptableLayout>
        <ProfileContent user={user} onUpdated={updateUser} />
      </ComptableLayout>
    );
  }

  return (
    <AdminLayout>
      <ProfileContent user={user} onUpdated={updateUser} />
    </AdminLayout>
  );
};

export default Profile;