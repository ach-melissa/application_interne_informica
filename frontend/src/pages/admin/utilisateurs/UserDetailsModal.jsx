import { useState, useEffect } from 'react';
import { X, Pencil, Check, Trash2, Ban, AlertTriangle,
         User, Mail, Phone, CalendarDays, Shield, Lock, Eye, EyeOff,
         Camera, Loader2, BookOpen, CheckCircle2 } from 'lucide-react';
const PHOTO_REMOVED = '__REMOVE__';
const API = import.meta.env.VITE_API_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const roleMeta = { admin: 'Admin', super_admin: 'Super Admin', prof: 'Prof', comptable: 'Comptable' };

const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors disabled:bg-slate-50 disabled:text-slate-400';

const Label = ({ icon: Icon, text, required }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} className="text-slate-500" />}
    {text}{required && <span className="text-red-500 ml-0.5">*</span>}
  </p>
);

const StatusToggle = ({ active, onChange }) => (
  <div className="flex items-center justify-between bg-white border border-slate-200 rounded px-2.5 py-1.5">
    <span className={`flex items-center gap-1.5 text-xs font-medium ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
      <CheckCircle2 size={13} />{active ? 'Actif' : 'Inactif'}
    </span>
    <button type="button" onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${active ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  </div>
);

const Field = ({ icon, label, field, form, editing, set, opts, required }) => (
  <div>
    <Label icon={icon} text={label} required={required} />
    {editing ? (
      opts ? (
        <select value={form[field]} onChange={set(field)} className={inp}>
          {opts.map(o => <option key={o} value={o}>{roleMeta[o] ?? o}</option>)}
        </select>
      ) : (
        <input type={field === 'date_naissance' ? 'date' : field === 'email' ? 'email' : 'text'}
               value={form[field]} onChange={set(field)} className={inp} />
      )
    ) : (
      <p className="text-xs text-slate-700 font-medium px-0.5">
        {field === 'nom_utilisateur' && form[field] ? `@${form[field]}` : (form[field] || '—')}
      </p>
    )}
  </div>
);
const UserDetailsModal = ({ user, onClose, onSuccess }) => {
  const [editing, setEditing]   = useState(false);
  const [submitting, setSubmit] = useState(false);
  const [confirm, setConfirm]   = useState(null); // 'save' | 'archive' | 'delete' | null
  const [error, setError]       = useState(null);
  const [roles, setRoles]       = useState([]);
  const [formations, setFormations] = useState([]);
  const [selectedFormations, setSelectedFormations] = useState([]);
  const [photo, setPhoto]       = useState(null);
  const [preview, setPreview]   = useState(user.photo_url ?? null);

  const [form, setForm] = useState({
    nom: user.nom ?? '', prenom: user.prenom ?? '',
    email: user.email ?? '', nom_utilisateur: user.nom_utilisateur ?? '',
    telephone: user.telephone ?? '',
    date_naissance: user.date_naissance?.slice(0, 10) ?? '',
    role: user.role ?? 'prof',
  });
  const set = f => ev => setForm(p => ({ ...p, [f]: ev.target.value }));
const [newPassword, setNewPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    fetch(`${API}/api/users/roles`, { headers: authHeader() }).then(r => r.json()).then(setRoles).catch(() => {});
    fetch(`${API}/api/formations`, { headers: authHeader() })
      .then(r => r.json()).then(d => setFormations(d.filter(f => f.statut === 'active'))).catch(() => {});
    if (user.role === 'prof') {
      fetch(`${API}/api/teachers/by-user/${user.id}`, { headers: authHeader() })
        .then(r => r.json()).then(d => setSelectedFormations(d.formation_ids ?? [])).catch(() => {});
    }
  }, [user.id, user.role]);

  const toggleFormation = id =>
    setSelectedFormations(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

    const cancelEdit = () => {
    setEditing(false); setConfirm(null); setError(null);
    setPhoto(null); setPreview(user.photo_url ?? null);
    setNewPassword(''); setShowPassword(false);
  };

  const handlePhoto = ev => {
    const file = ev.target.files[0];
    if (!file) return;
    setPhoto(file); setPreview(URL.createObjectURL(file));
  };
  const handleRemovePhoto = () => { setPhoto(PHOTO_REMOVED); setPreview(null); };

  const requestSave = () => {
    if (!form.nom || !form.prenom || !form.email || !form.nom_utilisateur) {
  setError("Nom, prénom, email et nom d'utilisateur sont obligatoires."); return;
}
    if (!isValidEmail(form.email)) {
      setError('Adresse email invalide.'); return;
    }
    setError(null); setConfirm('save');
  };

  const doSave = async () => {
    setSubmit(true); setError(null); setConfirm(null);
    try {
      const fd = new FormData();
  Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
      if (form.role === 'prof') fd.append('formation_ids', JSON.stringify(selectedFormations));
            if (photo === PHOTO_REMOVED) fd.append('remove_photo', 'true');
      else if (photo) fd.append('photo', photo);
      if (newPassword.trim() !== '') fd.append('mot_de_passe', newPassword);
      const res = await fetch(`${API}/api/users/${user.id}`, { method: 'PATCH', headers: authHeader(), body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erreur de mise à jour');
            setEditing(false); setPhoto(null); setNewPassword(''); onSuccess?.();
    } catch (err) { setError(err.message); }
    finally { setSubmit(false); }
  };

  const doDelete = async () => {
    setSubmit(true); setError(null);
    try {
      const res = await fetch(`${API}/api/users/${user.id}`, { method: 'DELETE', headers: authHeader() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Suppression échouée');
      onSuccess?.(); onClose();
    } catch (err) { setError(err.message); setSubmit(false); setConfirm(null); }
  };

  const doArchiveToggle = async () => {
    setSubmit(true); setError(null); setConfirm(null);
    try {
      const action = user.archived ? 'restore' : 'archive';
      const res = await fetch(`${API}/api/users/${user.id}/${action}`, { method: 'PATCH', headers: authHeader() });
      if (!res.ok) throw new Error(user.archived ? 'Restauration échouée' : 'Désactivation échouée');
      onSuccess?.(); onClose();
    } catch (err) { setError(err.message); setSubmit(false); }
  };

  const confirmCopy = {
    save:    { text: 'Confirmer les modifications ?', cls: 'bg-[#DCEBFA]/50 text-[#0369A1]', btn: 'bg-[#0F2A4A] hover:bg-[#16385f]', action: doSave },
    archive: { text: user.archived ? 'Réactiver cet utilisateur ?' : 'Désactiver cet utilisateur ?',
               cls: user.archived ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
               btn: user.archived ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600', action: doArchiveToggle },
    delete:  { text: 'Supprimer ? Action irréversible.', cls: 'bg-red-50 text-red-600', btn: 'bg-red-500 hover:bg-red-600', action: doDelete },
  }[confirm];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-md shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="sticky top-0 bg-white z-10 border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-xl bg-[#0369A1] flex items-center justify-center shrink-0">
                <User size={14} className="text-white" />
              </span>
              <span className="truncate">{user.prenom} {user.nom} <span className="text-slate-400 font-normal">· @{user.nom_utilisateur}</span></span>
            </h2>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600 shrink-0"><X size={16} /></button>
          </div>

          <div className="flex items-center gap-1.5 px-5 pb-3">
            {editing ? (
              <>
                <button onClick={cancelEdit} className="flex items-center gap-1 text-xs bg-slate-500 text-white px-2.5 py-1.5 rounded-md hover:bg-slate-600">
                  <Ban size={11} /> Annuler
                </button>
                <button onClick={requestSave} disabled={submitting}
                  className="flex items-center gap-1 text-xs bg-[#0F2A4A] text-white px-2.5 py-1.5 rounded-md hover:bg-[#16385f] disabled:opacity-40">
                  <Check size={11} /> Enregistrer
                </button>
              </>
            ) : (
              <>
                {!user.archived && (
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1 text-xs bg-[#0369A1] text-white px-2.5 py-1.5 rounded-md hover:bg-[#0284C7]">
                    <Pencil size={11} /> Modifier
                  </button>
                )}
               
                <button onClick={() => setConfirm('delete')}
                  className="flex items-center gap-1 text-xs bg-red-500 text-white px-2.5 py-1.5 rounded-md hover:bg-red-600 ml-auto">
                  <Trash2 size={11} /> Supprimer
                </button>
              </>
            )}
          </div>

          {error && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 mx-5 mb-3 rounded-md">{error}</p>}
          {confirm && (
            <div className={`flex items-center justify-between gap-3 mx-5 mb-3 rounded-md p-3 ${confirmCopy.cls}`}>
              <p className="text-xs flex items-center gap-1.5"><AlertTriangle size={13} /> {confirmCopy.text}</p>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setConfirm(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
                <button onClick={confirmCopy.action} disabled={submitting}
                  className={`text-xs px-3 py-1.5 rounded-md text-white disabled:opacity-40 ${confirmCopy.btn}`}>
                  {submitting ? '...' : 'Oui'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="group relative w-16 h-16 rounded-full bg-[#DCEBFA] flex items-center justify-center overflow-hidden flex-shrink-0">
              {preview
                ? <img src={preview} alt="" className="w-full h-full object-cover" />
                : <span className="text-lg font-bold text-[#0369A1]">{user.prenom?.[0]}{user.nom?.[0]}</span>}
              {editing && (
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={16} className="text-white animate-spin" /> : (
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
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-[#1E293B]">Photo de profil</p>
              <p className="text-[10px] text-slate-400">{editing ? 'Survolez la photo pour la changer.' : 'Photo de profil de cet utilisateur.'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field icon={User}  label="Nom"    field="nom"    form={form} editing={editing} set={set} required />
            <Field icon={User}  label="Prénom" field="prenom" form={form} editing={editing} set={set} required />
            <div className="col-span-2">
              <Field icon={Mail} label="Email" field="email" form={form} editing={editing} set={set} required />
            </div>
            <Field icon={User}  label="Nom d'utilisateur" field="nom_utilisateur" form={form} editing={editing} set={set} required/>
            <Field icon={Phone} label="Téléphone" field="telephone" form={form} editing={editing} set={set} />
            <Field icon={CalendarDays} label="Date naissance" field="date_naissance" form={form} editing={editing} set={set} />
                       <Field icon={Shield} label="Rôle" field="role" form={form} editing={editing} set={set} opts={roles} />
            {editing && (
              <div className="col-span-2">
                <Label icon={Lock} text="Nouveau mot de passe (optionnel)" />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Laisser vide pour ne pas changer"
                    className={`${inp} pr-8`}
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            )}
          </div>
          {form.role === 'prof' && (
            <div>
              <Label icon={BookOpen} text="Formations enseignées" />
              {formations.length === 0 ? (
                <p className="text-xs text-slate-400 bg-[#F8FAFC] rounded-lg px-3 py-2">Aucune formation active.</p>
              ) : editing ? (
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {formations.map(f => {
                    const checked = selectedFormations.includes(f.id);
                    return (
                      <label key={f.id} className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer ${checked ? 'bg-[#DCEBFA]/40 text-[#0369A1] font-medium' : 'text-slate-600 hover:bg-[#F8FAFC]'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleFormation(f.id)} className="accent-[#0369A1] w-3.5 h-3.5" />
                        <span className="truncate">{f.nom}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-700 font-medium">
                  {formations.filter(f => selectedFormations.includes(f.id)).map(f => f.nom).join(', ') || '—'}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 border-t border-[#F1F5F9] pt-4">
            <div>
              <Label icon={CalendarDays} text="Créé le" />
              <p className="text-xs text-slate-700 font-medium px-0.5">{user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '—'}</p>
            </div>
            <div>
              <Label icon={CheckCircle2} text="Statut" />
              <StatusToggle active={!user.archived} onChange={() => setConfirm('archive')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;