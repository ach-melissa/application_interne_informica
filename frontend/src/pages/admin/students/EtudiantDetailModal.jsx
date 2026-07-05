import { useState, useEffect } from 'react';
import {
  X, Pencil, Check, Trash2, AlertTriangle, Ban, Printer, Archive,
  User, Phone, Mail, MapPin, GraduationCap, Calendar,
  Radio, UserCheck, ClipboardList, PhoneCall, UserPlus,
} from 'lucide-react';
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
const statutCls   = { confirmed:'bg-[#DCEBFA] text-[#0369A1]', pending:'bg-amber-50 text-amber-600', non_confirmed:'bg-red-50 text-red-600', rejected:'bg-slate-100 text-slate-500' };
const tryMeta     = { repondu:'bg-emerald-50 text-emerald-600', non_repondu:'bg-red-50 text-red-600', occupe:'bg-orange-50 text-orange-600', injoignable:'bg-slate-100 text-slate-500', P_bureau:'bg-[#DCEBFA] text-[#0369A1]', ferme:'bg-violet-50 text-violet-600' };

/* ── Shared design tokens (aligned with UserDetailsModal) ───────────────── */
const inp = 'w-full bg-[#F8FAFC] border border-transparent rounded-lg px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors';
const labelCls = 'flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide mb-0.5';
const sectionTitleCls = 'text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2 col-span-2 pb-2 border-b border-[#F1F5F9]';

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
const FICHE_HEADER = {
  address: 'Cité Alliliguia, Groupement PR. N°1224, N°01 -2ème étage – Boumerdès',
  phone: 'Tél./Fax : 028 65 80 73 — Mobile : 0561 148 563 - 0560 606 896',
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

const FICHE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#000;font-size:13px;background:#f1f5f9}
  .toolbar{position:sticky;top:0;background:#0F2A4A;padding:10px 16px;display:flex;gap:10px;justify-content:flex-end;z-index:10}
  .toolbar button{font-size:13px;font-weight:600;padding:7px 16px;border-radius:8px;border:none;cursor:pointer}
  .btn-print{background:#0369A1;color:#fff}
  .btn-download{background:#16a34a;color:#fff}
  .btn-close{background:transparent;color:#fff;border:1px solid #475569 !important}
  .top-line{border-top:2px solid #000;margin-bottom:1.25rem;width:100%}
  .bottom-line{position:absolute;left:16mm;right:16mm;bottom:18mm;border-top:2px solid #000}
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
  overflow:hidden;
}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:1rem;margin-bottom:1rem}
  .logo-text{font-size:1.8rem;font-weight:900;letter-spacing:.1em}
  .contact{font-size:10px;text-align:right;line-height:1.7;color:#6b7280}
  .title{text-align:center;margin-bottom:2.25rem}
  .title p{font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#6b7280;margin-bottom:.25rem}
  .title h1{font-size:2.2rem;font-weight:900;letter-spacing:.08em;color:#000}
  .fields{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;gap:2rem}
  .row{display:flex;align-items:flex-end;gap:8px}
  .row-fr{font-size:16px;font-weight:600;white-space:nowrap;width:180px;flex-shrink:0}
  .row-line{flex:1;min-width:0;border-bottom:1px dotted #000;height:1.3rem;display:flex;align-items:flex-end}
  .row-value{display:block;width:100%;white-space:normal;word-break:break-word;font-size:16px;line-height:1;padding-bottom:2px}
  .row-ar{font-size:16px;font-weight:600;white-space:nowrap;width:150px;flex-shrink:0;text-align:right;direction:rtl}
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

/* label + icon above value/input — aligned with UserDetailsModal's Row */
const Row = ({ icon: Icon, label, children }) => (
  <div>
    <p className={labelCls}>
      {Icon && <Icon size={10} className="text-[#0369A1]" />}{label}
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
  const [formations, setFormations] = useState([]);

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
    formation_id: inscription?.formation_id ?? '',
  });

  useEffect(() => {
    fetch(`${API}/api/formations`, { headers: getHeaders() })
      .then(r => r.json())
      .then(data => setFormations(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

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
          formation_id: form.formation_id || null,
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
          <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${tryMeta[val] ?? 'bg-slate-100 text-slate-400'}`}>
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
  
       {!showAssign && (
<div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={ev => ev.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-full bg-[#DCEBFA] flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-[#DCEBFA]">
              {e?.photo
                ? <img src={e.photo} alt="" className="w-full h-full object-cover" />
                : <span className="text-lg font-bold text-[#0369A1]">{e?.prenom?.[0]}{e?.nom?.[0]}</span>}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-800 truncate">{e?.nom} {e?.prenom}</h2>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {readOnly ? (
                  <button onClick={openFichePreview}
                    className="flex items-center gap-1 text-xs bg-[#DCEBFA] text-[#0369A1] px-2.5 py-1 rounded-lg hover:bg-[#c7e3f7]">
                    <Printer size={11} /> Aperçu / PDF
                  </button>
                ) : editing ? (
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
                    <button onClick={() => setEditing(true)}
                      className="flex items-center gap-1 text-xs bg-[#0369A1] text-white px-2.5 py-1 rounded-lg hover:bg-[#0284C7]">
                      <Pencil size={11} /> Modifier
                    </button>
                    <button onClick={() => setConfirmArchive(true)}
                      className="flex items-center gap-1 text-xs bg-amber-500 text-white px-2.5 py-1 rounded-lg hover:bg-amber-600">
                      <Archive size={11} /> Archiver
                    </button>
                    <button onClick={() => setConfirmDel(true)}
                      className="flex items-center gap-1 text-xs bg-red-500 text-white px-2.5 py-1 rounded-lg hover:bg-red-600">
                      <Trash2 size={11} /> Supprimer
                    </button>
                    <button onClick={openFichePreview}
                      className="flex items-center gap-1 text-xs bg-[#DCEBFA] text-[#0369A1] px-2.5 py-1 rounded-lg hover:bg-[#c7e3f7]">
                      <Printer size={11} /> Aperçu / PDF
                    </button>
                    {form.statut === 'confirmed' && (
                      <button onClick={() => setShowAssign(true)}
                        className="flex items-center gap-1 text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-600">
                        <UserPlus size={11} />
                        {inscription.group_id ? 'Changer groupe' : 'Affecter groupe'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 flex-shrink-0"><X size={16} /></button>
        </div>

        {(error || (!readOnly && (confirmSave || confirmDel || confirmArchive))) && (
          <div className="px-5 pb-3 pt-2 border-b border-[#F1F5F9] space-y-2">
            {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            {!readOnly && confirmSave && (
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

            {!readOnly && confirmDel && (
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

            {!readOnly && confirmArchive && (
              <div className="bg-amber-50 rounded-xl p-3 space-y-2">
                <p className="text-xs text-amber-700 flex items-center gap-1.5"><AlertTriangle size={13} /> Archiver cette inscription ?</p>
                <select value={archiveYear} onChange={ev => setArchiveYear(ev.target.value)} className={inp}>
                  <option value="">— Année scolaire (optionnel) —</option>
                  {getAnneesScolaires().map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setConfirmArchive(false)} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-white">Non</button>
                  <button onClick={doArchive} disabled={submitting} className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40">
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
            <Field icon={User}          label="Nom"             field="nom" />
            <Field icon={User}          label="Prénom"          field="prenom" />
            <Field icon={Phone}         label="Téléphone"       field="telephone" />
            <Field icon={Mail}          label="Email"           field="email" />
            <Field icon={Calendar}      label="Date naissance"  field="date_naissance" type="date" />
            <Field icon={MapPin}        label="Lieu naissance"  field="lieu_naissance" />
            <Field icon={GraduationCap} label="Niveau scolaire" field="niveau_scolaire" />
            <div className="col-span-2">
              <Field icon={MapPin} label="Adresse" field="adresse" />
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-3 pt-3 mt-1 border-t border-[#F1F5F9]">
              <div>
                <Row icon={User} label="Photo">
                  {editing ? (
                    <div>
                      <input type="file" accept="image/*" onChange={handleFile('photo')}
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-[#DCEBFA] file:text-[#0369A1] hover:file:bg-[#c7e3f7] cursor-pointer" />
                      {(files.photo || e?.photo) && (
                        <img src={files.photo ? URL.createObjectURL(files.photo) : e.photo}
                          className="mt-1.5 h-20 w-20 rounded-lg object-cover border border-[#F1F5F9]" />
                      )}
                    </div>
                  ) : e?.photo ? (
                    <img src={e.photo} className="h-20 w-20 rounded-lg object-cover border border-[#F1F5F9] mt-0.5" />
                  ) : <p className="text-xs text-slate-400">—</p>}
                </Row>
              </div>

              <div>
                <Row icon={User} label="Pièce d'identité">
                  {editing ? (
                    <div>
                      <input type="file" accept="image/*,application/pdf" onChange={handleFile('piece_identite')}
                        className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-[#DCEBFA] file:text-[#0369A1] hover:file:bg-[#c7e3f7] cursor-pointer" />
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
                <select value={form.formation_id} onChange={set('formation_id')} className={inp}>
                  <option value="">— aucune —</option>
                  {formations.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              ) : (
                <p className="text-xs text-slate-700 font-medium">{inscription.formation?.nom || '—'}</p>
              )}
            </Row>
            <Row icon={ClipboardList} label="Statut">
              {editing
                ? <select value={form.statut} onChange={set('statut')} className={inp}>
                    {STATUT_OPTS.map(o => <option key={o} value={o}>{statutLabel[o]}</option>)}
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
            <Field icon={Radio}     label="Source"         field="source"        select opts={SOURCE_OPTS} />
            <Field icon={UserCheck} label="Enregistré par" field="registered_by" select opts={REGISTERED_OPTS} />

            <div className="col-span-2 grid grid-cols-3 gap-3 pt-3 border-t border-[#F1F5F9] mt-1">
              <TryField label="1er appel"  field="first_try"  />
              <TryField label="2ème appel" field="second_try" prev="first_try" />
              <TryField label="3ème appel" field="third_try"  prev="second_try" />
            </div>

            <div className="col-span-2 pt-3 border-t border-[#F1F5F9] mt-1">
              <Row icon={UserCheck} label="Groupe">
                <p className="text-xs text-slate-700 font-medium">
                  {inscription.groups?.nom ?? <span className="text-slate-400 font-normal">—</span>}
                </p>
              </Row>
            </div>
          </div>
        </div>
      </div>
      )}


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