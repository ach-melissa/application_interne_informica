import { useState } from 'react';
import { X, Pencil, Check, Trash2, Ban, AlertTriangle,
         User, Mail, Phone, Calendar, Shield, UserCheck,
         Archive, RotateCcw, Camera, Loader2 } from 'lucide-react';
const PHOTO_REMOVED = '__REMOVE__';
const API = import.meta.env.VITE_API_URL;
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const ROLES = ['admin','prof','comptable'];
const roleMeta = {
  admin:     { cls: 'bg-[#DCEBFA] text-[#0369A1]',    label: 'Admin' },
  prof:      { cls: 'bg-emerald-50 text-emerald-700', label: 'Prof' },
  comptable: { cls: 'bg-violet-50 text-violet-700',   label: 'Comptable' },
  etudiant:  { cls: 'bg-orange-50 text-orange-700',   label: 'Étudiant' },
};

const inp = 'w-full bg-[#F8FAFC] border border-transparent rounded-lg px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors';

const Row = ({ icon: Icon, label, children }) => (
  <div>
    <p className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">
      {Icon && <Icon size={10} className="text-[#0369A1]" />}{label}
    </p>
    {children}
  </div>
);

const Field = ({ icon, label, field, form, editing, set, opts }) => (
  <Row icon={icon} label={label}>
    {editing
      ? opts
        ? <select value={form[field]} onChange={set(field)} className={inp}>
            {opts.map(o => <option key={o} value={o}>{roleMeta[o]?.label ?? o}</option>)}
          </select>
        : <input type={field === 'date_naissance' ? 'date' : field === 'email' ? 'email' : 'text'}
                 value={form[field]} onChange={set(field)} className={inp} />
      : <p className="text-xs text-slate-700 font-medium">{form[field] || '—'}</p>}
  </Row>
);

const UserDetailsModal = ({ user, onClose, onSuccess }) => {
  const [editing, setEditing]         = useState(false);
  const [submitting, setSubmit]       = useState(false);
  const [confirmDel, setConfirmDel]       = useState(false);
  const [confirmSave, setConfirmSave]     = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError]             = useState(null);

  const [form, setForm] = useState({
    nom: user.nom ?? '', prenom: user.prenom ?? '',
    email: user.email ?? '', telephone: user.telephone ?? '',
    date_naissance: user.date_naissance?.slice(0,10) ?? '',
    role: user.role ?? 'prof',
  });

  const [photo, setPhoto]     = useState(null);
  const [preview, setPreview] = useState(user.photo_url ?? null);

  const set = f => ev => setForm(p => ({ ...p, [f]: ev.target.value }));
  const cancelEdit = () => {
    setEditing(false); setConfirmSave(false); setError(null);
    setPhoto(null); setPreview(user.photo_url ?? null);
  };

  const handlePhoto = ev => {
    const file = ev.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setPhoto(PHOTO_REMOVED);
    setPreview(null);
  };

  const doSave = async () => {
    setSubmit(true); setError(null); setConfirmSave(false);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
      if (photo === PHOTO_REMOVED) fd.append('remove_photo', 'true');
      else if (photo) fd.append('photo', photo);

      const res = await fetch(`${API}/api/users/${user.id}`, {
        method: 'PATCH', headers: authHeader(), body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erreur de mise à jour');
      setEditing(false); setPhoto(null); onSuccess?.();
    } catch (err) { setError(err.message); }
    finally { setSubmit(false); }
  };

  const doDelete = async () => {
    setSubmit(true); setError(null);
    try {
      const res = await fetch(`${API}/api/users/${user.id}`, { method: 'DELETE', headers: authHeader() });
      if (!res.ok) throw new Error('Suppression échouée');
      onSuccess?.(); onClose();
    } catch (err) { setError(err.message); setSubmit(false); }
  };

  const doArchiveToggle = async () => {
    setSubmit(true); setError(null); setConfirmArchive(false);
    try {
      const action = user.archived ? 'restore' : 'archive';
      const res = await fetch(`${API}/api/users/${user.id}/${action}`, { method: 'PATCH', headers: authHeader() });
      if (!res.ok) throw new Error(user.archived ? 'Restauration échouée' : 'Désactivation échouée');
      onSuccess?.(); onClose();
    } catch (err) { setError(err.message); setSubmit(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header — avatar left, name + buttons stacked on the right, single row */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#F1F5F9] sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="group relative w-14 h-14 rounded-full bg-[#DCEBFA] flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-[#DCEBFA]">
              {preview
                ? <img src={preview} alt="" className="w-full h-full object-cover" />
                : <span className="text-lg font-bold text-[#0369A1]">{user.prenom?.[0]}{user.nom?.[0]}</span>}

              {editing && (
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
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-800 truncate">{user.prenom} {user.nom}</h2>
              <p className="text-[11px] text-slate-400 truncate">@{user.nom_utilisateur}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {editing ? (
                  <>
                    <button onClick={cancelEdit} className="flex items-center gap-1 text-xs bg-slate-500 text-white px-2.5 py-1 rounded-lg hover:bg-slate-600">
                      <Ban size={11} /> Annuler
                    </button>
                    <button onClick={() => setConfirmSave(true)} disabled={submitting}
                      className="flex items-center gap-1 text-xs bg-[#0F2A4A] text-white px-2.5 py-1 rounded-lg hover:bg-[#16385f] disabled:opacity-40">
                      <Check size={11} /> Enregistrer
                    </button>
                  </>
                ) : (
                  <>
                    {!user.archived && (
                      <button onClick={() => setEditing(true)}
                        className="flex items-center gap-1 text-xs bg-[#0369A1] text-white px-2.5 py-1 rounded-lg hover:bg-[#0284C7]">
                        <Pencil size={11} /> Modifier
                      </button>
                    )}
                    <button onClick={() => setConfirmArchive(true)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-white ${
                        user.archived ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'
                      }`}>
                      {user.archived ? <><RotateCcw size={11} /> Restaurer</> : <><Archive size={11} /> Désactiver</>}
                    </button>
                    <button onClick={() => setConfirmDel(true)}
                      className="flex items-center gap-1 text-xs bg-red-500 text-white px-2.5 py-1 rounded-lg hover:bg-red-600">
                      <Trash2 size={11} /> Supprimer
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 flex-shrink-0"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {confirmSave && (
            <div className="bg-[#DCEBFA]/50 rounded-xl p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-[#0369A1] flex items-center gap-1.5"><AlertTriangle size={13} /> Confirmer les modifications ?</p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setConfirmSave(false)} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-white">Non</button>
                <button onClick={doSave} disabled={submitting} className="text-xs px-3 py-1.5 rounded-lg bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40">
                  {submitting ? '...' : 'Oui'}
                </button>
              </div>
            </div>
          )}

          {confirmArchive && (
            <div className={`rounded-xl p-3 flex items-center justify-between gap-3 ${
              user.archived ? 'bg-emerald-50' : 'bg-amber-50'
            }`}>
              <p className={`text-xs flex items-center gap-1.5 ${user.archived ? 'text-emerald-700' : 'text-amber-700'}`}>
                <AlertTriangle size={13} /> {user.archived ? 'Restaurer cet utilisateur ?' :  'Désactiver cet utilisateur ?'}
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setConfirmArchive(false)} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-white">Non</button>
                <button onClick={doArchiveToggle} disabled={submitting}
                  className={`text-xs px-3 py-1.5 rounded-lg text-white disabled:opacity-40 ${
                    user.archived ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'
                  }`}>
                  {submitting ? '...' : 'Oui'}
                </button>
              </div>
            </div>
          )}

          {confirmDel && (
            <div className="bg-red-50 rounded-xl p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-red-600 flex items-center gap-1.5"><AlertTriangle size={13} /> Supprimer ? Action irréversible.</p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setConfirmDel(false)} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-white">Non</button>
                <button onClick={doDelete} disabled={submitting} className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-40">
                  {submitting ? '...' : 'Oui'}
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="grid grid-cols-2 gap-3">
            <Field icon={User}     label="Nom"            field="nom"            form={form} editing={editing} set={set} />
            <Field icon={User}     label="Prénom"         field="prenom"         form={form} editing={editing} set={set} />
            <Field icon={Mail}     label="Email"          field="email"          form={form} editing={editing} set={set} />
            <Field icon={Phone}    label="Téléphone"      field="telephone"      form={form} editing={editing} set={set} />
            <Field icon={Calendar} label="Date naissance" field="date_naissance" form={form} editing={editing} set={set} />
            <Field icon={Shield}   label="Rôle"           field="role"           form={form} editing={editing} set={set} opts={ROLES} />
          </div>

          <div className="border-t border-[#F1F5F9] pt-4 grid grid-cols-2 gap-3">
            <Row icon={UserCheck} label="Nom d'utilisateur">
              <p className="text-xs text-slate-700 font-medium">@{user.nom_utilisateur}</p>
            </Row>
            <Row icon={Calendar} label="Créé le">
              <p className="text-xs text-slate-700 font-medium">
                {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '—'}
              </p>
            </Row>
            <Row icon={Shield} label="Statut">
              <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${
                user.archived ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-700'
              }`}>
                {user.archived ? 'Inactif' : 'Actif'}
              </span>
            </Row>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;