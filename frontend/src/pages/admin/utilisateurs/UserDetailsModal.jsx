import { useState } from 'react';
import { X, Pencil, Check, Trash2, Ban, AlertTriangle,
         User, Mail, Phone, Calendar, Shield, UserCheck, Lock } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const ROLES = ['admin','prof','comptable'];
const roleMeta = {
  admin:     { cls: 'bg-blue-100 text-blue-700',       label: 'Admin' },
  prof:      { cls: 'bg-emerald-100 text-emerald-700', label: 'Prof' },
  comptable: { cls: 'bg-violet-100 text-violet-700',   label: 'Comptable' },
  etudiant:  { cls: 'bg-orange-100 text-orange-700',   label: 'Étudiant' },
};

const inp = 'w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';

const Row = ({ icon: Icon, label, children }) => (
  <div>
    <p className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">
      {Icon && <Icon size={10} />}{label}
    </p>
    {children}
  </div>
);

const Avatar = ({ user, size = 14 }) => {
  const s = `w-${size} h-${size}`;
  return user.photo_url
    ? <img src={user.photo_url} alt="" className={`${s} rounded-full object-cover flex-shrink-0 ring-2 ring-blue-100`} />
    : <div className={`${s} rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600 flex-shrink-0`}>
        {user.prenom?.[0]}{user.nom?.[0]}
      </div>;
};

const UserDetailsModal = ({ user, onClose, onSuccess }) => {
  const [editing, setEditing]         = useState(false);
  const [submitting, setSubmit]       = useState(false);
  const [confirmDel, setConfirmDel]   = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [error, setError]             = useState(null);

const [form, setForm] = useState({
  nom: user.nom ?? '', prenom: user.prenom ?? '',
  email: user.email ?? '', telephone: user.telephone ?? '',
  date_naissance: user.date_naissance?.slice(0,10) ?? '',
  role: user.role ?? 'prof',
});

  const set = f => ev => setForm(p => ({ ...p, [f]: ev.target.value }));
  const cancelEdit = () => { setEditing(false); setConfirmSave(false); setError(null); };

const doSave = async () => {
  setSubmit(true); setError(null); setConfirmSave(false);
  try {
    const res = await fetch(`${API}/api/users/${user.id}`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify(form),
    });
    if (!res.ok) throw new Error('Erreur de mise à jour');
    setEditing(false); onSuccess?.();
  } catch (err) { setError(err.message); }
  finally { setSubmit(false); }
};

  const doDelete = async () => {
    setSubmit(true); setError(null);
    try {
      const res = await fetch(`${API}/api/users/${user.id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Suppression échouée');
      onSuccess?.(); onClose();
    } catch (err) { setError(err.message); setSubmit(false); }
  };

  const Field = ({ icon, label, field, type = 'text', select, opts }) => (
    <Row icon={icon} label={label}>
      {editing
        ? select
          ? <select value={form[field]} onChange={set(field)} className={inp}>
              {opts.map(o => <option key={o} value={o}>{roleMeta[o]?.label ?? o}</option>)}
            </select>
          : <input type={type} value={form[field]} onChange={set(field)} className={inp} />
        : <p className="text-xs text-slate-700 font-medium">{form[field] || '—'}</p>}
    </Row>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-blue-50 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <Avatar user={user} size={10} />
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{user.prenom} {user.nom}</h2>
              <p className="text-[11px] text-slate-400">@{user.nom_utilisateur}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button onClick={cancelEdit} className="flex items-center gap-1 text-xs border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                  <Ban size={12} /> Annuler
                </button>
                <button onClick={() => setConfirmSave(true)} disabled={submitting}
                  className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-40">
                  <Check size={12} /> Enregistrer
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-xs border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                  <Pencil size={12} /> Modifier
                </button>
                <button onClick={() => setConfirmDel(true)}
                  className="flex items-center gap-1 text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50">
                  <Trash2 size={12} /> Supprimer
                </button>
              </>
            )}
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          {confirmSave && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-blue-700 flex items-center gap-1.5"><AlertTriangle size={13} /> Confirmer les modifications ?</p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setConfirmSave(false)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white">Non</button>
                <button onClick={doSave} disabled={submitting} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
                  {submitting ? '...' : 'Oui'}
                </button>
              </div>
            </div>
          )}

          {confirmDel && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-red-600 flex items-center gap-1.5"><AlertTriangle size={13} /> Supprimer ? Action irréversible.</p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setConfirmDel(false)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white">Non</button>
                <button onClick={doDelete} disabled={submitting} className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-40">
                  {submitting ? '...' : 'Oui'}
                </button>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50/40 rounded-xl border border-blue-100 p-4 grid grid-cols-2 gap-3">
            <Field icon={User}     label="Nom"            field="nom" />
            <Field icon={User}     label="Prénom"         field="prenom" />
            <Field icon={Mail}     label="Email"          field="email" type="email" />
            <Field icon={Phone}    label="Téléphone"      field="telephone" />
            <Field icon={Calendar} label="Date naissance" field="date_naissance" type="date" />
<Field icon={Shield}   label="Rôle"           field="role" select opts={ROLES} />
          </div>

          <div className="bg-blue-50/40 rounded-xl border border-blue-100 p-4 grid grid-cols-2 gap-3">
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
                user.archived ? 'bg-red-100 text-red-500' :
                user.statut === 'inactive' ? 'bg-slate-100 text-slate-500' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {user.archived ? 'Archivé' : user.statut === 'inactive' ? 'Inactif' : 'Actif'}
              </span>
            </Row>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;