import { useState } from 'react';
import {
  X, Pencil, Check, Trash2, AlertTriangle, Ban, Printer, Archive,
  User, Phone, Mail, MapPin, GraduationCap, Calendar,
  Radio, UserCheck, ClipboardList, PhoneCall,
} from 'lucide-react';
import { UserPlus } from 'lucide-react';
import AssignGroupModal from './AssignGroupModal';
import logo from '../../../assets/images/logo_informica.png';

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
const statutCls   = { confirmed:'bg-blue-50 text-[#2563EB]', pending:'bg-amber-50 text-amber-600', non_confirmed:'bg-red-50 text-red-600', rejected:'bg-slate-100 text-[#64748B]' };
const tryMeta     = { repondu:'bg-emerald-50 text-emerald-600', non_repondu:'bg-red-50 text-red-600', occupe:'bg-orange-50 text-orange-600', injoignable:'bg-slate-100 text-[#64748B]', P_bureau:'bg-blue-50 text-[#2563EB]', ferme:'bg-violet-50 text-violet-600' };

/* ── Shared design tokens (matches InscriptionForm) ─────────────────────── */
const inp = 'w-full border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white text-[#1E293B]';
const labelCls = 'flex items-center gap-1 text-[10px] font-semibold text-[#64748B] uppercase tracking-wide mb-1';
const sectionCls = 'bg-white rounded-xl border border-[#E2E8F0] p-4 grid grid-cols-2 gap-4';
const sectionTitleCls = 'text-xs font-bold text-[#1E293B] uppercase tracking-wide mb-3 col-span-2 pb-2 border-b border-[#E2E8F0]';

/* ── Fiche d'inscription (print/PDF preview) ───────────────────────────── */

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
const FICHE_HEADER = {
  address: 'Cité Alliliguia, Groupement PR. N°1224, N°01 -2ème étage – Boumerdès',
  phone: 'Tél./Fax : 024 79 97 67 — Mobile : 0561 148 563 - 0561 678 654',
  email: 'informicadz@gmail.com',
  site: 'informica.dz',
  rc: 'RC 353671752-00/A16',
};

function buildFicheInner(logoHtml, rows) {
  return `
    <div class="top-line"></div>
    <div class="header">
      ${logoHtml}
      <div class="contact">
        <div>${FICHE_HEADER.address}</div>
        <div>${FICHE_HEADER.phone}</div>
        <div>${FICHE_HEADER.email} | ${FICHE_HEADER.site} | ${FICHE_HEADER.rc}</div>
      </div>
    </div>
    <div class="title">
      <h1>École de Formation</h1>
      <h1>INFORMICA</h1>
    </div>
    <div class="fields">
     ${rows.map(r => `
  <div class="row">
    <span class="row-fr">${r.fr}${r.fr ? ' :' : ''}</span>
    <div class="row-line ${r.value ? 'filled' : ''} ${r.key === 'adresse' ? 'row-line-tall' : ''}"><span class="row-value">${r.value}</span></div>
    <span class="row-ar">${r.ar ? `: ${r.ar}` : ''}</span>
  </div>`).join('')}
    </div>
    <div class="footer">
      <div><p class="sig-label">إمضاء المعني</p><div class="sig-box"></div></div>
      <div class="date-line">التاريخ : .... / .... / ........</div>
    </div>
    <div class="bottom-line"></div>`;
}
/* Matches InscriptionForm's printed "fiche" look: dotted underlines,
   black/white, serif-free, same header/title structure as the digital form. */
const FICHE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#000;font-size:13px;background:#f1f5f9}
  .toolbar{position:sticky;top:0;background:#1E293B;padding:10px 16px;display:flex;gap:10px;justify-content:flex-end;z-index:10}
  .toolbar button{font-size:13px;font-weight:600;padding:7px 16px;border-radius:8px;border:none;cursor:pointer}
  .btn-print{background:#2563EB;color:#fff}
  .btn-download{background:#16a34a;color:#fff}
  .btn-close{background:transparent;color:#fff;border:1px solid #475569 !important}
.top-line{border-top:2px solid #000;margin-bottom:1.25rem;width:100%}
  .bottom-line{position:absolute;left:16mm;right:16mm;bottom:18mm;border-top:2px solid #000}/* the actual A4 page: fixed height so content stretches edge to edge,
     no leftover gap at the bottom */
    .row-line-tall{
    height:2.8rem;
    border-bottom:none;
    align-items:flex-start;
    background-image:repeating-linear-gradient(to bottom, transparent 0, transparent calc(1.4rem - 1px), #000 1.4rem, #000 calc(1.4rem + 1px));
    background-size:100% 1.4rem;
    background-repeat:repeat-y;
  }
  .row-line-tall .row-value{
    display:block;
    width:100%;
    white-space:normal;
    line-height:1.4rem;
  }
  .page-wrap{display:flex;justify-content:center;padding:24px 16px}
  .sheet{
  width:210mm;height:297mm;
  background:#fff;padding:18mm 16mm;border-radius:4px;
  display:flex;flex-direction:column;
  box-shadow:0 1px 4px rgba(0,0,0,.15);
  position:relative;
  overflow:hidden;   /* <-- hard clip, guarantees no bleed onto page 2 */
}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:1rem;margin-bottom:1rem}
  .logo-text{font-size:1.8rem;font-weight:900;letter-spacing:.1em}
  .contact{font-size:10px;text-align:right;line-height:1.7;color:#6b7280}
  .title{text-align:center;margin-bottom:2.25rem}
  .title p{font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#6b7280;margin-bottom:.25rem}
  .title h1{font-size:2.2rem;font-weight:900;letter-spacing:.08em;color:#000}

  /* body grows to fill remaining vertical space, rows space themselves out */
  .fields{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;gap:2rem}

 .row{display:flex;align-items:flex-end;gap:8px}
  .row-fr{font-size:16px;font-weight:600;white-space:nowrap;width:180px;flex-shrink:0}
  .row-line{flex:1;min-width:0;border-bottom:1px dotted #000;height:1.3rem;display:flex;align-items:flex-end}
.row-value{display:block;width:100%;white-space:normal;word-break:break-word;font-size:16px;line-height:1;padding-bottom:2px}.row-ar{font-size:16px;font-weight:600;white-space:nowrap;width:150px;flex-shrink:0;text-align:right;direction:rtl}
.row-line.filled{border-bottom:none}
  .footer{margin-top:2.5rem;padding-top:1.5rem;display:flex;justify-content:space-between;align-items:flex-start}
  .sig-label{font-size:13px;margin-bottom:.5rem;font-weight:600;direction:rtl}
  .sig-box{width:180px;height:72px;border-radius:6px}
  .date-line{font-size:13px;direction:rtl}
 
  @media print {
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

/* label + icon above value/input */
const Row = ({ icon: Icon, label, children }) => (
  <div>
    <p className={labelCls}>
      {Icon && <Icon size={11} />}{label}
    </p>
    {children}
  </div>
);

const EtudiantDetailModal = ({ inscription, onClose, onSuccess, readOnly = false }) => {
  const e = inscription?.etudiant;
  const [files, setFiles] = useState({ photo: null, piece_identite: null });
  const [showAssign, setShowAssign] = useState(false);
  const handleFile = f => e => setFiles(p => ({ ...p, [f]: e.target.files[0] }));
  const [editing, setEditing]       = useState(false);
  const [submitting, setSubmit]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
const [confirmArchive, setConfirmArchive] = useState(false);
const [archiveYear, setArchiveYear] = useState('');
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
const doArchive = async () => {
  setSubmit(true); setError(null);
  try {
    const res = await fetch(`${API}/api/etudiants/${inscription.id}/archive`, {
      method: 'PATCH', headers: getHeaders(),
      body: JSON.stringify({ annee_scolaire: archiveYear || null }),
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

  /* ── open preview window with Imprimer/Télécharger inside ───────────── */
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
      document.getElementById('downloadBtn').addEventListener('click', function () {
  var btn = this;
  btn.disabled = true;
  var prevLabel = btn.textContent;
  btn.textContent = 'Génération...';
  window.scrollTo(0, 0);   // reset scroll before capture
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
  };

  /* try field — 2nd disabled if 1st empty, 3rd disabled if 2nd empty */
  const TryField = ({ label, field, prev }) => {
    const disabled = editing && prev !== undefined && !form[prev];
    const val = form[field];
    return (
      <Row icon={PhoneCall} label={label}>
        {editing ? (
          <select value={val} onChange={set(field)} disabled={disabled} className={`${inp} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
            <option value="">— aucun —</option>
            {TRY_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${tryMeta[val] ?? 'bg-slate-100 text-[#94A3B8]'}`}>
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
        : <p className="text-sm text-[#1E293B] font-medium">{form[field] || '—'}</p>}
    </Row>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#F8FAFC] rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={ev => ev.stopPropagation()}>

        {/* Header — mirrors InscriptionForm's brand header, condensed */}
        <div className="bg-white px-5 pt-5 pb-4 border-b border-[#E2E8F0] sticky top-0 z-10">
          <div className="flex items-start justify-between gap-3 mb-3">
            <img src={logo} alt="INFORMICA" className="h-12 w-auto object-contain" />
            <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1E293B]"><X size={18} /></button>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-[#1E293B]">{e?.nom} {e?.prenom}</h2>
              <p className="text-[11px] text-[#64748B] uppercase tracking-wide">{inscription.formation?.nom ?? '—'}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {readOnly ? (
                <button onClick={openFichePreview}
                  className="flex items-center gap-1 text-xs border border-[#E2E8F0] text-[#1E293B] px-3 py-1.5 rounded-lg hover:bg-slate-50">
                  <Printer size={12} /> Aperçu / Imprimer / PDF
                </button>
              ) : editing ? (
                <>
                  <button onClick={cancelEdit} className="flex items-center gap-1 text-xs border border-[#E2E8F0] text-[#64748B] px-3 py-1.5 rounded-lg hover:bg-slate-50">
                    <Ban size={12} /> Annuler
                  </button>
                  <button onClick={() => setConfirmSave(true)} disabled={submitting}
                    className="flex items-center gap-1 text-xs bg-[#2563EB] text-white px-3 py-1.5 rounded-lg hover:bg-[#1d4ed8] disabled:opacity-40">
                    <Check size={12} /> Enregistrer
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1 text-xs border border-[#E2E8F0] text-[#2563EB] px-3 py-1.5 rounded-lg hover:bg-blue-50">
                    <Pencil size={12} /> Modifier
                  </button>
                  <button onClick={() => setConfirmDel(true)}
                    className="flex items-center gap-1 text-xs border border-[#E2E8F0] text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50">
                    <Trash2 size={12} /> Supprimer
                  </button>
                  <button onClick={() => setConfirmArchive(true)}
  className="flex items-center gap-1 text-xs border border-[#E2E8F0] text-[#64748B] px-3 py-1.5 rounded-lg hover:bg-slate-50">
  <Archive size={12} /> Archiver
</button>
                  <button onClick={openFichePreview}
                    className="flex items-center gap-1 text-xs border border-[#E2E8F0] text-[#1E293B] px-3 py-1.5 rounded-lg hover:bg-slate-50">
                    <Printer size={12} /> Aperçu / Imprimer / PDF
                  </button>
                  {!editing && form.statut === 'confirmed' && (
                    <button onClick={() => setShowAssign(true)}
                      className="flex items-center gap-1 text-xs border border-[#E2E8F0] text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-50">
                      <UserPlus size={12} />
                      {inscription.group_id ? 'Changer groupe' : 'Affecter groupe'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {error && <p className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          {/* Confirm save */}
          {!readOnly && confirmSave && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-[#1E293B] flex items-center gap-1.5 font-medium"><AlertTriangle size={13} className="text-[#2563EB]" /> Confirmer les modifications ?</p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setConfirmSave(false)} className="text-xs px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-white">Non</button>
                <button onClick={doSave} disabled={submitting} className="text-xs px-3 py-1.5 rounded-lg bg-[#2563EB] text-white hover:bg-[#1d4ed8] disabled:opacity-40">
                  {submitting ? '...' : 'Oui, enregistrer'}
                </button>
              </div>
            </div>
          )}

          {/* Confirm delete */}
          {!readOnly && confirmDel && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-red-600 flex items-center gap-1.5 font-medium"><AlertTriangle size={13} /> Supprimer ? Action irréversible.</p>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => setConfirmDel(false)} className="text-xs px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-white">Non</button>
                <button onClick={doDelete} disabled={submitting} className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-40">
                  {submitting ? '...' : 'Oui, supprimer'}
                </button>
              </div>
            </div>
          )}

{/* Confirm archive */}
{!readOnly && confirmArchive && (
  <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 space-y-2">
    <p className="text-xs text-[#1E293B] flex items-center gap-1.5 font-medium"><AlertTriangle size={13} className="text-[#64748B]" /> Archiver cette inscription ?</p>
    <select value={archiveYear} onChange={e => setArchiveYear(e.target.value)} className={inp}>
      <option value="">— Année scolaire (optionnel) —</option>
      {getAnneesScolaires().map(y => <option key={y} value={y}>{y}</option>)}
    </select>
    <div className="flex justify-end gap-2">
      <button onClick={() => setConfirmArchive(false)} className="text-xs px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-white">Non</button>
      <button onClick={doArchive} disabled={submitting} className="text-xs px-3 py-1.5 rounded-lg bg-[#64748B] text-white hover:bg-[#475569] disabled:opacity-40">
        {submitting ? '...' : 'Oui, archiver'}
      </button>
    </div>
  </div>
)}
          {/* Étudiant */}
          <div className={sectionCls}>
            <p className={sectionTitleCls}>Informations personnelles</p>
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

            <div className="col-span-2 grid grid-cols-2 gap-4 pt-3 mt-1 border-t border-[#E2E8F0]">
              {/* Photo */}
              <div>
                <Row icon={User} label="Photo">
                  {editing ? (
                    <div>
                      <input type="file" accept="image/*" onChange={handleFile('photo')}
                        className="w-full text-xs text-[#64748B] file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-blue-50 file:text-[#2563EB] hover:file:bg-blue-100 cursor-pointer" />
                      {(files.photo || e?.photo) && (
                        <img src={files.photo ? URL.createObjectURL(files.photo) : e.photo}
                          className="mt-1.5 h-20 w-20 rounded-lg object-cover border border-[#E2E8F0]" />
                      )}
                    </div>
                  ) : e?.photo ? (
                    <img src={e.photo} className="h-20 w-20 rounded-lg object-cover border border-[#E2E8F0] mt-0.5" />
                  ) : <p className="text-xs text-[#94A3B8]">—</p>}
                </Row>
              </div>

              {/* Pièce d'identité */}
              <div>
                <Row icon={User} label="Pièce d'identité">
                  {editing ? (
                    <div>
                      <input type="file" accept="image/*,application/pdf" onChange={handleFile('piece_identite')}
                        className="w-full text-xs text-[#64748B] file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-blue-50 file:text-[#2563EB] hover:file:bg-blue-100 cursor-pointer" />
                      {files.piece_identite && <p className="text-[10px] text-[#94A3B8] mt-1 truncate">{files.piece_identite.name}</p>}
                      {!files.piece_identite && e?.piece_identite && (
                        <a href={e.piece_identite} target="_blank" rel="noreferrer" className="text-[11px] text-[#2563EB] underline mt-1 block">Voir actuelle</a>
                      )}
                    </div>
                  ) : e?.piece_identite ? (
                    <a href={e.piece_identite} target="_blank" rel="noreferrer" className="text-[11px] text-[#2563EB] underline">Voir le document</a>
                  ) : <p className="text-xs text-[#94A3B8]">—</p>}
                </Row>
              </div>
            </div>
          </div>

          {/* Inscription */}
          <div className={sectionCls}>
            <p className={sectionTitleCls}>Inscription</p>
            <Row icon={ClipboardList} label="Statut">
              {editing
                ? <select value={form.statut} onChange={set('statut')} className={inp}>
                    {STATUT_OPTS.map(o => <option key={o} value={o}>{statutLabel[o]}</option>)}
                  </select>
                : <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${statutCls[form.statut] ?? 'bg-slate-100 text-[#64748B]'}`}>
                    {statutLabel[form.statut] ?? form.statut}
                  </span>}
            </Row>
            <Row icon={Calendar} label="Date d'inscription">
              <p className="text-sm text-[#1E293B] font-medium">
                {inscription.date_inscription ? new Date(inscription.date_inscription).toLocaleDateString('fr-FR') : '—'}
              </p>
            </Row>
            <Field icon={Radio}     label="Source"         field="source"        select opts={SOURCE_OPTS} />
            <Field icon={UserCheck} label="Enregistré par" field="registered_by" select opts={REGISTERED_OPTS} />

            <div className="col-span-2 grid grid-cols-3 gap-4 pt-3 border-t border-[#E2E8F0] mt-1">
              <TryField label="1er appel"  field="first_try"  />
              <TryField label="2ème appel" field="second_try" prev="first_try" />
              <TryField label="3ème appel" field="third_try"  prev="second_try" />
            </div>

            <div className="col-span-2 pt-3 border-t border-[#E2E8F0] mt-1">
              <Row icon={UserCheck} label="Groupe">
                <p className="text-sm text-[#1E293B] font-medium">
                  {inscription.groups?.nom ?? <span className="text-[#94A3B8] font-normal">—</span>}
                </p>
              </Row>
            </div>
          </div>
        </div>
      </div>

      {!readOnly && showAssign && (
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