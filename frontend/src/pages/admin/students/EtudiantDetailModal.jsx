import { useState } from 'react';
import {
  X, Pencil, Check, Trash2, AlertTriangle, Ban,
  User, Phone, Mail, MapPin, GraduationCap, Calendar,
  Radio, UserCheck, ClipboardList, PhoneCall,
} from 'lucide-react';
import { UserPlus } from 'lucide-react';
import AssignGroupModal from './AssignGroupModal';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const SOURCE_OPTS     = ['Amis/Famille','Instagram','TikTok','Facebook','Recherche Google','Site Web','Bouche-à-oreille','Publicité','Autre'];
const REGISTERED_OPTS = ['hanane','yasmine','page_facebook','amira'];
const STATUT_OPTS     = ['pending','confirmed','non_confirmed','rejected'];
const TRY_OPTS        = ['repondu','non_repondu','occupe','injoignable','P_bureau','ferme'];

const statutLabel = { confirmed:'Confirmé', pending:'En attente', non_confirmed:'Non confirmé', rejected:'Rejeté' };
const statutCls   = { confirmed:'bg-blue-100 text-blue-700', pending:'bg-amber-100 text-amber-700', non_confirmed:'bg-red-100 text-red-600', rejected:'bg-slate-100 text-slate-500' };
const tryMeta     = { repondu:'bg-emerald-100 text-emerald-700', non_repondu:'bg-red-100 text-red-600', occupe:'bg-orange-100 text-orange-600', injoignable:'bg-slate-100 text-slate-500', P_bureau:'bg-blue-100 text-blue-600', ferme:'bg-violet-100 text-violet-600' };

const inp = 'w-full border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white';

/* label + icon above value/input */
const Row = ({ icon: Icon, label, children }) => (
  <div>
    <p className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">
      {Icon && <Icon size={10} />}{label}
    </p>
    {children}
  </div>
);

const EtudiantDetailModal = ({ inscription, onClose, onSuccess }) => {
  const e = inscription?.etudiant;
const [files, setFiles] = useState({ photo: null, piece_identite: null });
const [showAssign, setShowAssign] = useState(false);
const handleFile = f => e => setFiles(p => ({ ...p, [f]: e.target.files[0] }));
  const [editing, setEditing]       = useState(false);
  const [submitting, setSubmit]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [error, setError]           = useState(null);

  const [form, setForm] = useState({
    nom: e?.nom ?? '', prenom: e?.prenom ?? '', telephone: e?.telephone ?? '',
    email: e?.email ?? '', adresse: e?.adresse ?? '',
    niveau_scolaire: e?.niveau_scolaire ?? '',
    date_naissance: e?.date_naissance?.slice(0, 10) ?? '',
    lieu_naissance: e?.lieu_naissance ?? '',
    source: inscription?.source ?? '',
    registered_by: inscription?.registered_by ?? '',
    statut: inscription?.statut ?? 'pending',
    first_try: inscription?.first_try ?? '',
    second_try: inscription?.second_try ?? '',
    third_try: inscription?.third_try ?? '',
  });

  if (!inscription) return null;
  const set = f => ev => setForm(p => ({ ...p, [f]: ev.target.value }));
  const cancelEdit = () => { setEditing(false); setConfirmSave(false); setError(null); };

 const doSave = async () => {
  setSubmit(true); setError(null); setConfirmSave(false);
  try {
    const r2 = await fetch(`${API}/api/etudiants/${inscription.id}`, {
      method: 'PATCH', headers: getHeaders(),
      body: JSON.stringify({
        source: form.source, registered_by: form.registered_by,
        statut: form.statut, first_try: form.first_try || null,
        second_try: form.second_try || null, third_try: form.third_try || null,
      }),
    });

    const fd = new FormData();
    ['nom','prenom','telephone','email','adresse','niveau_scolaire','date_naissance','lieu_naissance']
      .forEach(k => { if (form[k] !== undefined) fd.append(k, form[k]); });
    if (files.photo)          fd.append('photo',          files.photo);
    if (files.piece_identite) fd.append('piece_identite', files.piece_identite);

    const r1 = await fetch(`${API}/api/etudiants/etudiant/${e.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: fd,
    });

    if (!r1.ok || !r2.ok) throw new Error('Erreur de mise à jour');
    setEditing(false); onSuccess?.();
  } catch (err) { setError(err.message); }
  finally { setSubmit(false); }
};

  const doDelete = async () => {
    setSubmit(true); setError(null);
    try {
      const res = await fetch(`${API}/api/etudiants/${inscription.id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Suppression échouée');
      onSuccess?.(); onClose();
    } catch (err) { setError(err.message); setSubmit(false); }
  };

  /* try field — 2nd disabled if 1st empty, 3rd disabled if 2nd empty */
  const TryField = ({ label, field, prev }) => {
    const disabled = editing && prev !== undefined && !form[prev];
    const val = form[field];
    return (
      <Row icon={PhoneCall} label={label}>
        {editing ? (
          <select value={val} onChange={set(field)} disabled={disabled} className={`${inp} ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${tryMeta[val] ?? ''}`}>
            <option value="">— aucun —</option>
            {TRY_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${tryMeta[val] ?? 'bg-slate-100 text-slate-400'}`}>
            {val || '—'}
          </span>
        )}
      </Row>
    );
  };

  const Field = ({ icon, label, field, type = 'text', select, opts }) => (
    <Row icon={icon} label={label}>
      {editing
        ? select
          ? <select value={form[field]} onChange={set(field)} className={inp}>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          : <input type={type} value={form[field]} onChange={set(field)} className={inp} />
        : <p className="text-xs text-slate-700 font-medium">{form[field] || '—'}</p>}
    </Row>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={ev => ev.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-blue-50 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">{e?.nom} {e?.prenom}</h2>
            <p className="text-[11px] text-slate-400">{inscription.formation?.nom ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
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
                {!editing && form.statut === 'confirmed' && (
  <button onClick={() => setShowAssign(true)}
    className="flex items-center gap-1 text-xs border border-emerald-200 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-50">
    <UserPlus size={12} />
    {inscription.group_id ? 'Changer groupe' : 'Affecter groupe'}
  </button>
)}
              </>
            )}
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={16} /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          {/* Confirm save */}
          {confirmSave && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-blue-700 flex items-center gap-1.5"><AlertTriangle size={13} /> Confirmer les modifications ?</p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setConfirmSave(false)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white">Non</button>
                <button onClick={doSave} disabled={submitting} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
                  {submitting ? '...' : 'Oui, enregistrer'}
                </button>
              </div>
            </div>
          )}

          {/* Confirm delete */}
          {confirmDel && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-red-600 flex items-center gap-1.5"><AlertTriangle size={13} /> Supprimer ? Action irréversible.</p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setConfirmDel(false)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white">Non</button>
                <button onClick={doDelete} disabled={submitting} className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-40">
                  {submitting ? '...' : 'Oui, supprimer'}
                </button>
              </div>
            </div>
          )}

          {/* Etudiant */}
          <div className="bg-blue-50/40 rounded-xl border border-blue-100 p-4 grid grid-cols-2 gap-3">
            <Field icon={User}           label="Nom"             field="nom" />
            <Field icon={User}           label="Prénom"          field="prenom" />
            <Field icon={Phone}          label="Téléphone"       field="telephone" />
            <Field icon={Mail}           label="Email"           field="email" />
            <Field icon={Calendar}       label="Date naissance"  field="date_naissance" type="date" />
            <Field icon={MapPin}         label="Lieu naissance"  field="lieu_naissance" />
            <Field icon={GraduationCap}  label="Niveau scolaire" field="niveau_scolaire" />
            <div className="col-span-2">
  <Field icon={MapPin} label="Adresse" field="adresse" />
</div>

{/* 👇 add this right after */}
<div className="col-span-2 grid grid-cols-2 gap-3 pt-2 border-t border-blue-100">
  {/* Photo */}
  <div>
    <Row icon={User} label="Photo">
      {editing ? (
        <div>
          <input type="file" accept="image/*" onChange={handleFile('photo')}
            className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer" />
          {(files.photo || e?.photo) && (
            <img src={files.photo ? URL.createObjectURL(files.photo) : e.photo}
              className="mt-1.5 h-20 w-20 rounded-lg object-cover border border-blue-100" />
          )}
        </div>
      ) : e?.photo ? (
        <img src={e.photo} className="h-20 w-20 rounded-lg object-cover border border-blue-100 mt-0.5" />
      ) : <p className="text-xs text-slate-400">—</p>}
    </Row>
  </div>

  {/* Pièce d'identité */}
  <div>
    <Row icon={User} label="Pièce d'identité">
      {editing ? (
        <div>
          <input type="file" accept="image/*,application/pdf" onChange={handleFile('piece_identite')}
            className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer" />
          {files.piece_identite && <p className="text-[10px] text-slate-400 mt-1 truncate">{files.piece_identite.name}</p>}
          {!files.piece_identite && e?.piece_identite && (
            <a href={e.piece_identite} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 underline mt-1 block">Voir actuelle</a>
          )}
        </div>
      ) : e?.piece_identite ? (
        <a href={e.piece_identite} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 underline">Voir le document</a>
      ) : <p className="text-xs text-slate-400">—</p>}
    </Row>
  </div>
</div>
          </div>

          {/* Inscription */}
<div className="bg-blue-50/40 rounded-xl border border-blue-100 p-4 grid grid-cols-2 gap-3">
            {/* statut */}
            <Row icon={ClipboardList} label="Statut">
              {editing
                ? <select value={form.statut} onChange={set('statut')} className={inp}>
                    {STATUT_OPTS.map(o => <option key={o} value={o}>{statutLabel[o]}</option>)}
                  </select>
                : <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${statutCls[form.statut] ?? 'bg-slate-100 text-slate-500'}`}>
                    {statutLabel[form.statut] ?? form.statut}
                  </span>}
            </Row>
            {/* date inscription (read-only) */}
            <Row icon={Calendar} label="Date d'inscription">
              <p className="text-xs text-slate-700 font-medium">
                {inscription.date_inscription ? new Date(inscription.date_inscription).toLocaleDateString('fr-FR') : '—'}
              </p>
            </Row>
            <Field icon={Radio}     label="Source"         field="source"        select opts={SOURCE_OPTS} />
            <Field icon={UserCheck} label="Enregistré par" field="registered_by" select opts={REGISTERED_OPTS} />

            {/* calls — full width row each */}
            <div className="col-span-2 grid grid-cols-3 gap-3 pt-1 border-t border-blue-100 mt-1">
              <TryField label="1er appel"  field="first_try"  />
              <TryField label="2ème appel" field="second_try" prev="first_try" />
              <TryField label="3ème appel" field="third_try"  prev="second_try" />
            </div>
            {/* Groupe assigné */}
            <div className="col-span-2 pt-1 border-t border-blue-100 mt-1">
              <Row icon={UserCheck} label="Groupe">
                <p className="text-xs text-slate-700 font-medium">
                  {inscription.groups?.nom ?? <span className="text-slate-300 font-normal">—</span>}
                </p>
              </Row>
            </div>
          </div>
        </div>
      </div>

      {showAssign && (
        <AssignGroupModal
          inscription={inscription}
          onClose={() => setShowAssign(false)}
          onSuccess={() => { onSuccess?.(); setShowAssign(false); }}
        />
      )}
    </div>
  );
};

export default EtudiantDetailModal;