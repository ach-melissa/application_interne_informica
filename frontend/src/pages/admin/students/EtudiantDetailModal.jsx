import { useState, useEffect } from 'react';
import {
  X, Pencil, Check, Trash2, AlertTriangle, Ban, Printer, Archive,
  User, Phone, Mail, MapPin, GraduationCap, Calendar,
  Radio, UserCheck, ClipboardList, PhoneCall, UserPlus, Layers, Plus,
} from 'lucide-react';
import AssignGroupModal from './AssignGroupModal';
import logo from '../../../assets/images/logo_informica.png';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});




const statutLabel = { confirmed:'Confirmé', pending:'En attente', non_confirmed:'Non confirmé', rejected:'Rejeté' };
const statutCls   = { confirmed:'bg-[#DCEBFA] text-[#0369A1]', pending:'bg-amber-50 text-amber-600', non_confirmed:'bg-red-50 text-red-600', rejected:'bg-slate-100 text-slate-500' };
const tryMeta     = { repondu:'bg-emerald-50 text-emerald-600', non_repondu:'bg-red-50 text-red-600', occupe:'bg-orange-50 text-orange-600', injoignable:'bg-slate-100 text-slate-500', P_bureau:'bg-[#DCEBFA] text-[#0369A1]', ferme:'bg-violet-50 text-violet-600' };

const inp = 'w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:border-[#0369A1] transition-colors';
const labelCls = 'flex items-center gap-1 text-[10px] text-slate-600 uppercase tracking-wide mb-0.5';
const sectionTitleCls = 'text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 col-span-2 pb-2 border-b border-[#F1F5F9]';
/* ── Fiche d'inscription (print/PDF preview) — unchanged, keeps letterhead ── */

const printRows = [
  { fr: 'Nom',                  ar: 'اللقب',             key: 'nom' },
  { fr: 'Prénom',               ar: 'الاسم',             key: 'prenom' },
  { fr: 'Date de naissance',    ar: 'تاريخ الميلاد',     key: 'ddn' },
  { fr: 'Lieu de naissance',    ar: 'مكان الميلاد',      key: 'lieu' },
  { fr: 'Adresse personnelle',  ar: 'العنوان الشخصي',    key: 'adresse' },
  { fr: 'Niveau scolaire',      ar: 'المستوى التعليمي',  key: 'niveau' },
  { fr: 'Adresse électronique', ar: 'البريد الإلكتروني', key: 'email' },
  { fr: 'Numéro de téléphone',  ar: 'رقم الهاتف',        key: 'tel' },
  { fr: 'Formation choisie',    ar: 'التكوين المختار',    key: 'formation_label' },
  { fr: 'Durée de formation',   ar: 'مدة التكوين',        key: 'duree' },
  { fr: 'Groupe',               ar: 'الفوج',              key: 'groupe' },
];
const getAnneesScolaires = () => {
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const years = [];
  for (let y = startYear + 1; y >= startYear - 5; y--) years.push(`${y}-${y + 1}`);
  return years;
};
const getCurrentAnneeScolaire = () => {
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
};
const FICHE_HEADER = {
  address: 'Cité Alliliguia, Groupement PR. N°1224, N°01 -2ème étage – Boumerdès',
  phone: 'Tél./Fax : 028 65 80 73 — Mobile : 0561 148 563 - 0560 606 896',
  email: 'informicadz@gmail.com',
  site: 'informica.dz',
  rc: 'RC 353671752-00/A16',
};

const ICONS = {
  pin: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  phone: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  mail: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  globe: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>`,
};

function buildFicheInner(logoHtml, rows) {
  return `
    <div class="frame">
      <div class="header">
        <div class="logo-block">${logoHtml}</div>
        <div class="contact">
          <div class="contact-row">${ICONS.pin}<span>${FICHE_HEADER.address}</span></div>
          <div class="contact-row">${ICONS.phone}<span>${FICHE_HEADER.phone}</span></div>
          <div class="contact-row">${ICONS.mail}<span>${FICHE_HEADER.email} &nbsp;|&nbsp; ${FICHE_HEADER.rc}</span></div>
          <div class="contact-row">${ICONS.globe}<span>${FICHE_HEADER.site}</span></div>
        </div>
      </div>
      <div class="header-line"></div>

      <div class="title">
        <h1>Fiche d'Inscription</h1>
        <p class="subtitle">École de Formation</p>
        <div class="brand-line">
          <span class="line"></span>
          <span class="brand">INFORMICA</span>
          <span class="line"></span>
        </div>
      </div>

                       <div class="fields">
        ${rows.map(r => {
          const isTall = r.key === 'adresse';
          if (isTall) {
            const rowHtml = `
            <div class="row">
              <span class="row-fr">${r.fr}${r.fr ? ' :' : ''}</span>
              <div class="row-line ${r.value ? 'filled' : ''}"><span class="row-value" id="adresseLine1"></span></div>
                            <span class="row-ar">${r.ar ? `<span class="ar-colon">:</span><span class="ar-word">${r.ar}</span>` : ''}</span>
              </div>`;
            const valueLine = `<div class="row-line-full" id="adresseLine2Wrap"${r.value ? ' style="display:none"' : ''}><span class="row-value" id="adresseLine2"></span></div>`;
            return `<div class="row-adresse">${rowHtml}${valueLine}</div>`;
          }
          return `
          <div class="row">
            <span class="row-fr">${r.fr}${r.fr ? ' :' : ''}</span>
            <div class="row-line ${r.value ? 'filled' : ''}"><span class="row-value">${r.value}</span></div>
             <span class="row-ar">${r.ar ? `<span class="ar-colon">:</span><span class="ar-word">${r.ar}</span>` : ''}</span>
          </div>`;
        }).join('')}
      </div>
      <div class="footer">
        <div>
          <p class="sig-label">
            <span class="fr">Signature</span>
            <span class="sep">/</span>
            <span class="ar">إمضاء المعني</span>
          </p>
          <div class="sig-box"></div>
        </div>
        <div class="date-line">
          <span class="fr">Date :</span> .... / .... / ........
          
          <span class="ar">التاريخ 
        </div>
      </div>
    </div>`;
}

const FICHE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#171717;font-size:13px;background:#f1f5f9}

.toolbar{position:sticky;top:0;background:#0F2A4A;padding:10px 16px;display:flex;gap:10px;justify-content:flex-end;z-index:10}
.toolbar button{font-size:13px;font-weight:600;padding:7px 16px;border-radius:8px;border:none;cursor:pointer}
  .btn-print{background:#0369A1;color:#fff}
  .btn-download{background:#16a34a;color:#fff}
  .btn-close{background:transparent;color:#fff;border:1px solid #475569 !important}

  .page-wrap{display:flex;justify-content:center;padding:24px 16px}
  .sheet{
    width:210mm;height:297mm;
    background:#fff;padding:10mm;border-radius:4px;
    box-shadow:0 1px 4px rgba(0,0,0,.15);
    position:relative;
    overflow:hidden;
  }

  /* Cadre autour de la feuille */
  .frame{
    height:100%;
    border:1.4px solid #0F2A4A;
    border-radius:2px;
    padding:9mm 10mm;
    display:flex;
    flex-direction:column;
  }

  /* Header — logo gauche / contact droite */
  .header{display:flex;justify-content:space-between;align-items:center;gap:16px}
  .logo-block img{height:58px;width:auto;object-fit:contain}
  .logo-text{font-size:1.5rem;font-weight:700;letter-spacing:.06em;color:#0F2A4A}

  .contact{display:flex;flex-direction:column;gap:5px;align-items:flex-end}
  .contact-row{display:flex;align-items:center;gap:6px;font-size:9.5px;color:#334155;font-weight:500}
  .contact-row svg{color:#0F2A4A;flex-shrink:0}
  .contact-row span{white-space:nowrap}

  .header-line{height:2px;background:#0F2A4A;margin:10px 0 1.6rem}

  /* Title */
  .title{text-align:center;margin-bottom:2rem}
  .title h1{font-size:1.9rem;font-weight:700;letter-spacing:.03em;color:#171717;text-transform:uppercase}
  .subtitle{font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:#64748B;font-weight:500;margin-top:.3rem}
  .brand-line{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:.6rem}
  .brand-line .line{width:70px;height:1px;background:#CBD5E1}
  .brand{font-size:1rem;font-weight:600;letter-spacing:.14em;color:#171717}

  /* Fields */
.fields{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;gap:1.1rem}
.row{display:flex;align-items:flex-end;gap:10px;page-break-inside:avoid;break-inside:avoid}
  .row-fr{font-size:13px;font-weight:700;white-space:nowrap;width:160px;flex-shrink:0;color:#334155}
  .row-line{
    flex:1;min-width:0;height:1.5rem;display:flex;align-items:flex-end;
    border-bottom:1.5px dotted #94A3B8;
  }
  .row-line.filled{
    border-bottom:none;
  }
    .row-value{display:block;width:100%;white-space:normal;word-break:break-word;font-size:14px;font-weight:600;line-height:1;padding-bottom:0;color:#171717}
.row-ar{font-size:13px;font-weight:500;white-space:nowrap;width:135px;flex-shrink:0;display:flex;align-items:baseline;justify-content:flex-end;gap:3px;color:#334155}
.row-ar .ar-word{direction:rtl;unicode-bidi:isolate;font-family:'Noto Naskh Arabic','Segoe UI',Tahoma,Arial,sans-serif;font-weight:700;font-size:14px;color:#334155}
.row-ar .ar-colon{font-family:'Noto Naskh Arabic','Segoe UI',Tahoma,Arial,sans-serif;font-weight:700;color:#334155}
.row-adresse{page-break-inside:avoid;break-inside:avoid}
  .row-line-full{
    width:100%;
    min-height:1.2rem;
    border-bottom:1.5px dotted #94A3B8;
    margin-top:0.4rem;
  }
  .row-line-full.filled{
    border-bottom:none;
    margin-top:0.2rem;
  }
  .row-line-full .row-value{
    display:block;
    font-size:14px;font-weight:600;line-height:1.3;color:#171717;
    white-space:normal;word-break:break-word;
  }
  /* Footer */
  .footer{margin-top:2.4rem;padding-top:1.3rem;border-top:1px solid #E2E8F0;display:flex;justify-content:space-between;align-items:flex-start}

.sig-label{font-size:11.5px;margin-bottom:.55rem;font-weight:700;color:#334155;display:flex;align-items:center;gap:6px}
  .sig-label .fr{direction:ltr}
.sig-label .ar{direction:rtl}
  .sig-label .sep{color:#CBD5E1}

  .sig-box{width:175px;height:62px;border:1px dashed #CBD5E1;border-radius:6px}

  .date-line{font-size:11.5px;color:#334155;padding-top:.3rem;display:flex;align-items:center;gap:6px;direction:ltr}
  .date-line .fr{font-weight:700}
  .date-line .ar{direction:rtl;font-family:'Noto Naskh Arabic','Segoe UI',Tahoma,Arial,sans-serif;font-weight:700}
  .date-line .sep{color:#CBD5E1}

  @media print {
    *{
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .toolbar{display:none}
    body{background:#fff}
    .page-wrap{padding:0;justify-content:flex-start}
    .sheet{box-shadow:none;border-radius:0;width:100%;height:297mm}
    @page{size:A4;margin:0}
  }
`;

function imgToBase64(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* label + icon above value/input — aligned with UserDetailsModal's Row */
const Row = ({ icon: Icon, label, children, required }) => (
  <div>
    <p className={labelCls}>
      {Icon && <Icon size={10} className="text-slate-500" />}{label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </p>
    {children}
  </div>
);
const TryField = ({ label, field, prev, form, set, editing, opts = [] }) => {
  const disabled = editing && prev !== undefined && !form[prev];
  const val = form[field];
  return (
    <Row icon={PhoneCall} label={label}>
      {editing ? (
        <select value={val} onChange={set(field)} disabled={disabled} className={`${inp} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
          <option value="">— aucun —</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${tryMeta[val] ?? 'bg-slate-100 text-slate-400'}`}>
          {val || '—'}
        </span>
      )}
    </Row>
  );
};

const Field = ({ icon, label, field, type = 'text', select, opts, form, set, editing }) => (
  <Row icon={icon} label={label}>
    {editing
      ? select
        ? <select value={form[field]} onChange={set(field)} className={inp}>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        : <input type={type} value={form[field]} onChange={set(field)} className={inp} />
      : field === 'telephone' && form[field]
        ? <a href={`tel:${form[field]}`} className="text-xs text-[#0369A1] font-medium hover:underline">{form[field]}</a>
        : <p className="text-xs text-slate-700 font-medium">{form[field] || '—'}</p>}
  </Row>
);

const EtudiantDetailModal = ({ inscription, onClose, onSuccess, readOnly = false }) => {
  const e = inscription?.etudiant;
const isGroupLocked = dateFin => {
    if (!dateFin) return false;
    const limit = new Date(dateFin);
    limit.setDate(limit.getDate() + 30);
    return new Date() > limit;
  };
  const [files, setFiles] = useState({ photo: null, piece_identite: null });
  const [showAssign, setShowAssign] = useState(false);
  const handleFile = f => e => setFiles(p => ({ ...p, [f]: e.target.files[0] }));
  const [editing, setEditing]       = useState(false);
  const [submitting, setSubmit]     = useState(false);
const [confirm, setConfirm] = useState(null); // 'save' | 'archive' | 'delete' | null
const [archiveYear, setArchiveYear] = useState('');
  const [error, setError]           = useState(null);
const [formations, setFormations] = useState([]);
const [wilayas, setWilayas]       = useState([]);
const [sourceOpts, setSourceOpts] = useState([]);
const [registeredByOpts, setRegisteredByOpts] = useState([]);
const [niveauOpts, setNiveauOpts] = useState([]);
const [firstTryOpts, setFirstTryOpts]   = useState([]);
const [secondTryOpts, setSecondTryOpts] = useState([]);
const [thirdTryOpts, setThirdTryOpts]   = useState([]);
const [statutOpts, setStatutOpts] = useState([]);
const [groupInfo, setGroupInfo] = useState(inscription.groups ?? null);
const [groupId, setGroupId] = useState(inscription.group_id ?? null);
const locked = isGroupLocked(groupInfo?.date_fin);
const today = new Date().toISOString().slice(0, 10);
const groupNotFinished = !!groupInfo && (!groupInfo.date_fin || groupInfo.date_fin > today);
  const [form, setForm] = useState({
  nom: e?.nom ?? '', prenom: e?.prenom ?? '', telephone: e?.telephone ?? '',
  email: e?.email ?? '', adresse: e?.adresse ?? '',
  niveau_scolaire: e?.niveau_scolaire ?? '',
  date_naissance: e?.date_naissance?.slice(0, 10) ?? '',
  lieu_naissance: e?.lieu_naissance ?? '',
  wilaya: e?.wilaya ?? '',
  source: inscription?.source ?? '',
  registered_by: inscription?.registered_by ?? '',
  statut: inscription?.statut ?? 'pending',
  first_try: inscription?.first_try ?? '',
  second_try: inscription?.second_try ?? '',
  third_try: inscription?.third_try ?? '',
   formation_id: inscription?.formation_id ?? '',
  niveau_id: inscription?.niveau_id ?? '',
  commentaire: inscription?.commentaire ?? '',
});
const selectedFormation = formations.find(f => f.id === form.formation_id);
const showNiveauField = selectedFormation?.a_niveaux;
const setFormationField = ev => setForm(p => ({ ...p, formation_id: ev.target.value, niveau_id: '' }));


useEffect(() => {
  const cat = c => fetch(`${API}/api/parametres?categorie=${c}`, { headers: getHeaders() }).then(r => r.json());
  fetch(`${API}/api/formations`, { headers: getHeaders() })
    .then(r => r.json())
    .then(data => setFormations(Array.isArray(data) ? data : []))
    .catch(() => {});
  fetch(`${API}/api/etudiants/statut-options`, { headers: getHeaders() })
    .then(r => r.json())
    .then(setStatutOpts)
    .catch(() => {});
   Promise.all([
    cat('wilaya'), cat('source'), cat('registered_by'), cat('niveau_scolaire'),
    cat('first_try'), cat('second_try'), cat('third_try'),
  ])
    .then(([wl, src, rb, niv, ft, st, tt]) => {
      setWilayas((wl || []).filter(v => v.actif).map(v => v.label));
      setSourceOpts((src || []).filter(v => v.actif).map(v => v.label));
      setRegisteredByOpts((rb || []).filter(v => v.actif).map(v => v.label));
      setNiveauOpts((niv || []).filter(v => v.actif).map(v => v.label));
      setFirstTryOpts((ft || []).filter(v => v.actif).map(v => v.label));
      setSecondTryOpts((st || []).filter(v => v.actif).map(v => v.label));
      setThirdTryOpts((tt || []).filter(v => v.actif).map(v => v.label));
    })
    .catch(() => {});
}, []);

  if (!inscription) return null;
  const set = f => ev => setForm(p => ({ ...p, [f]: ev.target.value }));
  const cancelEdit = () => { setEditing(false); setConfirm(null); setError(null); };

  const doSave = async () => {
    setSubmit(true); setError(null); setConfirm(null);
    try {
      const r2 = await fetch(`${API}/api/etudiants/${inscription.id}`, {
        method: 'PATCH', headers: getHeaders(),
               body: JSON.stringify({
          source: form.source, registered_by: form.registered_by,
          statut: form.statut, first_try: form.first_try || null,
          second_try: form.second_try || null, third_try: form.third_try || null,
          formation_id: form.formation_id || null,
          niveau_id: form.niveau_id || null,
          commentaire: form.commentaire || null,
        }),
      });

      const fd = new FormData();
['nom','prenom','telephone','email','adresse','niveau_scolaire','date_naissance','lieu_naissance','wilaya']
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

const doArchive = async () => {
  if (!archiveYear) {
    setError('Veuillez sélectionner une année scolaire.');
    return;
  }
  setSubmit(true); setError(null);
  try {
    const res = await fetch(`${API}/api/etudiants/${inscription.id}/archive`, {
      method: 'PATCH', headers: getHeaders(),
      body: JSON.stringify({ annee_scolaire: archiveYear }),
    });
    if (!res.ok) throw new Error('Archivage échoué');
    onSuccess?.(); onClose();
  } catch (err) { setError(err.message); setSubmit(false); }
};

  const doDelete = async () => {
    setSubmit(true); setError(null);
    try {
      const res = await fetch(`${API}/api/etudiants/${inscription.id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Suppression échouée');
      onSuccess?.(); onClose();
    } catch (err) { setError(err.message); setSubmit(false); }
  };

  /* ── open preview window with Imprimer/Télécharger inside (letterhead kept) ── */
  const openFichePreview = async () => {
    const logoBase64 = await imgToBase64(logo);
    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" alt="INFORMICA" style="height:80px;width:auto;object-fit:contain" />`
      : `<div class="logo-text">INFORMICA</div>`;

    const printData = {
      nom: form.nom, prenom: form.prenom, ddn: form.date_naissance,
      lieu: form.lieu_naissance, adresse: form.adresse, niveau: form.niveau_scolaire,
      email: form.email, tel: form.telephone,
      formation_label: inscription.formation?.nom || '',
    };
    const rows = printRows.map(r => ({ ...r, value: r.key ? printData[r.key] || '' : '' }));
    const fileName = `fiche_inscription_${form.nom || 'etudiant'}_${form.prenom || ''}`.trim().replace(/\s+/g, '_');

    const win = window.open('', '_blank');
win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@500;700&display=swap" rel="stylesheet">
    <style>${FICHE_CSS}</style></head>
    <body>
      <div class="toolbar">
        <button class="btn-print" onclick="window.print()">Imprimer</button>
        <button class="btn-download" id="downloadBtn">Télécharger (PDF)</button>
        <button class="btn-close" onclick="window.close()">Fermer</button>
      </div>
      <div class="page-wrap">
        <div class="sheet" id="ficheSheet">
          ${buildFicheInner(logoHtml, rows)}
        </div>
      </div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
      <script>
      var ADRESSE_TEXT = ${JSON.stringify(printData.adresse || '')};
      function measureTextWidth(text, font) {
        var canvas = measureTextWidth.canvas || (measureTextWidth.canvas = document.createElement('canvas'));
        var ctx = canvas.getContext('2d');
        ctx.font = font;
        return ctx.measureText(text).width;
      }
      function splitToFit(text, maxWidth, font) {
        if (!text) return { first: '', rest: '' };
        if (measureTextWidth(text, font) <= maxWidth) return { first: text, rest: '' };
        var words = text.split(' ');
        var first = '';
        var i = 0;
        for (; i < words.length; i++) {
          var test = first ? first + ' ' + words[i] : words[i];
          if (measureTextWidth(test, font) > maxWidth) break;
          first = test;
        }
        if (!first && words.length) { first = words[0]; i = 1; }
        var rest = words.slice(i).join(' ');
        return { first: first, rest: rest };
      }
      function layoutAdresse() {
        var line1 = document.getElementById('adresseLine1');
        var line2Wrap = document.getElementById('adresseLine2Wrap');
        var line2 = document.getElementById('adresseLine2');
        if (!line1 || !ADRESSE_TEXT) return;
        var font = '600 14px "Helvetica Neue", Arial, sans-serif';
        var maxWidth = line1.parentElement.clientWidth - 4;
        var parts = splitToFit(ADRESSE_TEXT, maxWidth, font);
        line1.textContent = parts.first;
        if (parts.rest) {
          line2.textContent = parts.rest;
          line2Wrap.classList.add('filled');
          line2Wrap.style.display = 'block';
        } else {
          line2Wrap.style.display = 'none';
        }
      }
      layoutAdresse();
      <\/script>
      <script>
      document.getElementById('downloadBtn').addEventListener('click', function () {
  var btn = this;
  btn.disabled = true;
  var prevLabel = btn.textContent;
  btn.textContent = 'Génération...';
  window.scrollTo(0, 0);
  html2pdf()
    .set({
      margin: 0,
      filename: '${fileName}.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all'] },
    })
    .from(document.getElementById('ficheSheet'))
    .save()
    .then(function () { btn.disabled = false; btn.textContent = prevLabel; })
    .catch(function () { btn.disabled = false; btn.textContent = prevLabel; });
});
      <\/script>
    </body></html>`);
    win.document.close();
    win.focus();
        fetch(`${API}/api/etudiants/log-impression`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ids: [inscription.id] }),
    }).catch(console.error);
  };

 

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
  
       {!showAssign && (
<div className="bg-white rounded-md shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={ev => ev.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-3 min-w-0">
    <div className="w-16 h-16 rounded-full bg-[#DCEBFA] flex items-center justify-center overflow-hidden flex-shrink-0">
              {e?.photo
                ? <img src={e.photo} alt="" className="w-full h-full object-cover" />
                : <span className="text-lg font-bold text-[#0369A1]">{e?.prenom?.[0]}{e?.nom?.[0]}</span>}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-800 truncate">{e?.nom} {e?.prenom}</h2>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {readOnly ? (
                  <button onClick={openFichePreview}
                    className="flex items-center gap-1 text-xs bg-[#DCEBFA] text-[#0369A1] px-2.5 py-1.5 rounded-md hover:bg-[#c7e3f7]">
                    <Printer size={11} /> Aperçu / PDF
                  </button>
                ) : editing ? (
                  <>
                    <button onClick={cancelEdit} className="flex items-center gap-1 text-xs bg-slate-500 text-white px-2.5 py-1.5 rounded-md hover:bg-slate-600">
                      <Ban size={11} /> Annuler
                    </button>
                   <button onClick={() => setConfirm('save')} disabled={submitting}
  className="flex items-center gap-1 text-xs bg-[#0F2A4A] text-white px-2.5 py-1.5 rounded-md shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] disabled:opacity-40 transition-all">
  <Check size={11} /> Enregistrer
</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing(true)}
                      className="flex items-center gap-1 text-xs bg-[#0369A1] text-white px-2.5 py-1.5 rounded-md hover:bg-[#0284C7]">
                      <Pencil size={11} /> Modifier
                    </button>

                    <button onClick={() => setConfirm('delete')}
                      className="flex items-center gap-1 text-xs bg-red-500 text-white px-2.5 py-1.5 rounded-md hover:bg-red-600">
                      <Trash2 size={11} /> Supprimer
                    </button>
                    <button onClick={() => { setArchiveYear(getCurrentAnneeScolaire()); setConfirm('archive'); }}
  className="flex items-center gap-1 text-xs bg-amber-500 text-white px-2.5 py-1.5 rounded-md hover:bg-amber-600">
  <Archive size={11} /> Archiver
</button>
                    <button onClick={openFichePreview}
                      className="flex items-center gap-1 text-xs bg-[#DCEBFA] text-[#0369A1] px-2.5 py-1.5 rounded-md hover:bg-[#c7e3f7]">
                      <Printer size={11} /> Aperçu / PDF
                    </button>
 {form.statut === 'confirmed' && (
  <button onClick={() => !locked && setShowAssign(true)} disabled={locked}
    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md ${locked ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
    <UserPlus size={11} />
    {groupId ? 'Changer groupe' : 'Affecter groupe'}
  </button>
)}
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 flex-shrink-0"><X size={16} /></button>
        </div>

       
{(error || (!readOnly && confirm)) && (
  <div className="px-5 pb-3 pt-2 border-b border-[#F1F5F9] space-y-2">
    {error && <p className="text-red-500 text-xs bg-red-50 rounded-md px-3 py-2">{error}</p>}

    {!readOnly && confirm === 'save' && (
      <div className="bg-[#DCEBFA]/50 rounded-md p-3 flex items-center justify-between gap-3">
        <p className="text-xs text-[#0369A1] flex items-center gap-1.5"><AlertTriangle size={13} /> Confirmer les modifications ?</p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setConfirm(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
          <button onClick={doSave} disabled={submitting} className="text-xs px-3 py-1.5 rounded-md bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40">
            {submitting ? '...' : 'Oui'}
          </button>
        </div>
      </div>
    )}

    {!readOnly && confirm === 'delete' && (
      <div className="bg-red-50 rounded-md p-3 flex items-center justify-between gap-3">
        <p className="text-xs text-red-600 flex items-center gap-1.5"><AlertTriangle size={13} /> Supprimer ? Action irréversible.</p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setConfirm(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
          <button onClick={doDelete} disabled={submitting} className="text-xs px-3 py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-40">
            {submitting ? '...' : 'Oui'}
          </button>
        </div>
      </div>
    )}

 {!readOnly && confirm === 'archive' && (
  <div className="bg-amber-50 rounded-md p-3 space-y-2">
    <p className="text-xs text-amber-700 flex items-center gap-1.5"><AlertTriangle size={13} /> Archiver cette inscription ?</p>
    <select value={archiveYear} onChange={ev => setArchiveYear(ev.target.value)} required className={inp}>
      <option value="" disabled>— Sélectionner une année scolaire —</option>
      {getAnneesScolaires().map(y => <option key={y} value={y}>{y}</option>)}
    </select>
    <div className="flex justify-end gap-2">
      <button onClick={() => setConfirm(null)} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-white">Non</button>
      <button onClick={doArchive} disabled={submitting || !archiveYear} className="text-xs px-3 py-1.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40">
        {submitting ? '...' : 'Oui'}
      </button>
    </div>
  </div>
)}
  </div>
)}
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <p className={sectionTitleCls}>Informations personnelles</p>
       <Field icon={User}          label="Nom"             field="nom"       form={form} set={set} editing={editing} />
<Field icon={User}          label="Prénom"          field="prenom"    form={form} set={set} editing={editing} />
<Field icon={Phone}         label="Téléphone"       field="telephone" form={form} set={set} editing={editing} />
<Field icon={Mail}          label="Email"           field="email"     form={form} set={set} editing={editing} />
<Field icon={Calendar}      label="Date naissance"  field="date_naissance" type="date" form={form} set={set} editing={editing} />
<Field icon={MapPin}        label="Lieu naissance"  field="lieu_naissance" form={form} set={set} editing={editing} />
<Field icon={MapPin}        label="Wilaya"          field="wilaya" select opts={wilayas} form={form} set={set} editing={editing} />
<Field icon={GraduationCap} label="Niveau scolaire" field="niveau_scolaire" select opts={niveauOpts} form={form} set={set} editing={editing} />
            <div className="col-span-2">
             <Field icon={MapPin} label="Adresse" field="adresse" form={form} set={set} editing={editing} />
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-3 pt-3 mt-1 border-t border-[#F1F5F9]">
              <div>
                <Row icon={User} label="Photo">
                  {editing ? (
                    <div>
                      <input type="file" accept="image/*" onChange={handleFile('photo')}
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-[#DCEBFA] file:text-[#0369A1] hover:file:bg-[#c7e3f7] cursor-pointer" />
                      {(files.photo || e?.photo) && (
                        <img src={files.photo ? URL.createObjectURL(files.photo) : e.photo}
                          className="mt-1.5 h-20 w-20 rounded-md object-cover border border-[#F1F5F9]" />
                      )}
                    </div>
                  ) : e?.photo ? (
                    <img src={e.photo} className="h-20 w-20 rounded-md object-cover border border-[#F1F5F9] mt-0.5" />
                  ) : <p className="text-xs text-slate-400">—</p>}
                </Row>
              </div>

              <div>
                <Row icon={User} label="Pièce d'identité">
                  {editing ? (
                    <div>
                      <input type="file" accept="image/*,application/pdf" onChange={handleFile('piece_identite')}
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-[#DCEBFA] file:text-[#0369A1] hover:file:bg-[#c7e3f7] cursor-pointer" />
                      {files.piece_identite && <p className="text-[10px] text-slate-400 mt-1 truncate">{files.piece_identite.name}</p>}
                      {!files.piece_identite && e?.piece_identite && (
                        <a href={e.piece_identite} target="_blank" rel="noreferrer" className="text-[11px] text-[#0369A1] underline mt-1 block">Voir actuelle</a>
                      )}
                    </div>
                  ) : e?.piece_identite ? (
                    <a href={e.piece_identite} target="_blank" rel="noreferrer" className="text-[11px] text-[#0369A1] underline">Voir le document</a>
                  ) : <p className="text-xs text-slate-400">—</p>}
                </Row>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[#F1F5F9] pt-4">
            <p className={sectionTitleCls}>Inscription</p>
                      <Row icon={GraduationCap} label="Formation">
  {editing ? (
    <select value={form.formation_id} onChange={setFormationField} disabled={locked} className={`${inp} ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}>
      <option value="">— aucune —</option>
      {formations.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
    </select>
  ) : (
                <p className="text-xs text-slate-700 font-medium">{inscription.formation?.nom || '—'}</p>
              )}
            </Row>
            {showNiveauField && (
              <Row icon={Layers} label="Niveau">
                {editing ? (
                  <select value={form.niveau_id} onChange={set('niveau_id')} disabled={locked} className={`${inp} ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <option value="">— Aucun —</option>
                    {selectedFormation.niveaux?.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
                  </select>
                ) : (
                  <p className="text-xs text-slate-700 font-medium">{inscription.niveau?.nom || '—'}</p>
                )}
              </Row>
            )}
        <Row icon={ClipboardList} label="Statut">
              {editing
                ? <select value={form.statut} onChange={set('statut')} disabled={locked} className={`${inp} ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    {statutOpts.map(o => <option key={o} value={o}>{statutLabel[o]}</option>)}
                  </select>
                : <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${statutCls[form.statut] ?? 'bg-slate-100 text-slate-500'}`}>
                    {statutLabel[form.statut] ?? form.statut}
                  </span>}
            </Row>
            <Row icon={Calendar} label="Date d'inscription">
              <p className="text-xs text-slate-700 font-medium">
                {inscription.date_inscription ? new Date(inscription.date_inscription).toLocaleDateString('fr-FR') : '—'}
              </p>
            </Row>
<Field icon={Radio}     label="Source"     field="source"        select opts={sourceOpts}       form={form} set={set} editing={editing} />
<Field icon={UserCheck} label="Rapporteur" field="registered_by" select opts={registeredByOpts} form={form} set={set} editing={editing} />
            <div className="col-span-2 grid grid-cols-3 gap-3 pt-3 border-t border-[#F1F5F9] mt-1">
             <TryField label="1er appel"  field="first_try"  form={form} set={set} editing={editing && !locked} opts={firstTryOpts} />
<TryField label="2ème appel" field="second_try" prev="first_try"  form={form} set={set} editing={editing && !locked} opts={secondTryOpts} />
<TryField label="3ème appel" field="third_try"  prev="second_try" form={form} set={set} editing={editing && !locked} opts={thirdTryOpts} />
            </div>

          <div className="col-span-2 pt-3 border-t border-[#F1F5F9] mt-1">
  <Row icon={UserCheck} label="Groupe">
    <p className="text-xs text-slate-700 font-medium">
      {groupInfo?.nom ?? <span className="text-slate-400 font-normal">—</span>}
    </p>
  </Row>
</div>
<div className="col-span-2">
  <Row icon={UserCheck} label="Ajouté par">
    <p className="text-xs text-slate-700 font-medium">
      {inscription.added_by ?? <span className="text-slate-400 font-normal">— (inscription en ligne)</span>}
    </p>
  </Row>
</div>
<div className="col-span-2">
  <Row label="Commentaire">
    {editing ? (
      <textarea value={form.commentaire} onChange={set('commentaire')} rows={3} className={inp} />
    ) : (
      <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap">{form.commentaire || '—'}</p>
    )}
  </Row>
</div>
          </div>
        </div>
      </div>
      )}


 {!readOnly && showAssign && (
  <AssignGroupModal
    inscription={inscription}
    locked={locked}
    formations={formations}
    niveauId={form.niveau_id}
    onClose={() => setShowAssign(false)}
    onSuccess={(selectedGroup) => {
      setGroupInfo(selectedGroup);
      setGroupId(selectedGroup?.id ?? null);
      onSuccess?.();
      setShowAssign(false);
    }}
  />
)}
    </div>
  );
};

export default EtudiantDetailModal;
export { printRows, FICHE_CSS, buildFicheInner, imgToBase64 };