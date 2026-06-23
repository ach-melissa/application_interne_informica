import { useState, useEffect } from 'react';
import logo from '../../assets/images/logo_informica.png';

const API = 'http://localhost:5000/api';

const EMPTY = { nom: '', prenom: '', ddn: '', lieu: '', adresse: '', niveau: '', email: '', tel: '', formation_id: '', source: '' };

const printRows = [
  { fr: 'Nom',                  ar: 'اللقب',             key: 'nom' },
  { fr: 'Prénom',               ar: 'الاسم',             key: 'prenom' },
  { fr: 'Date de naissance',    ar: 'تاريخ الميلاد',     key: 'ddn' },
  { fr: 'Lieu de naissance',    ar: 'مكان الميلاد',      key: 'lieu' },
  { fr: 'Adresse personnelle',  ar: 'العنوان الشخصي',    key: 'adresse' },
  { fr: '',                     ar: '',                   key: null },
  { fr: 'Niveau scolaire',      ar: 'المستوى التعليمي',  key: 'niveau' },
  { fr: 'Adresse électronique', ar: 'البريد الإلكتروني', key: 'email' },
  { fr: 'Numéro de téléphone',  ar: 'رقم الهاتف',        key: 'tel' },
  { fr: 'Formation choisie',    ar: 'التكوين المختار',    key: 'formation_label' },
];

// Converts an img element (from imported asset) to base64 for use in print window
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

export default function InscriptionForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  // Data from DB
  const [formations, setFormations] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  Promise.all([
    fetch(`${API}/formations`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    }).then(r => r.json()),

    fetch(`${API}/enums`).then(r => r.json()),
  ])
    .then(([formationsData, enumsData]) => {
      setFormations(Array.isArray(formationsData) ? formationsData : []);
      setNiveaux(enumsData.niveau_scolaire || []);
      setSources(enumsData.source || []);
    })
    .catch(() => setApiError('Impossible de charger les données.'))
    .finally(() => setLoading(false));
}, []);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: false }));
  };

  const validate = () => {
    const newErrors = {};
    Object.keys(EMPTY).forEach(k => { if (!form[k]?.trim()) newErrors[k] = true; });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');
    try {
      const res = await fetch(`${API}/etudiants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom,
          prenom: form.prenom,
          telephone: form.tel,
          email: form.email,
          adresse: form.adresse,
          niveau_scolaire: form.niveau,
          date_naissance: form.ddn,
          lieu_naissance: form.lieu,
          formation_id: form.formation_id,
          source: form.source,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur serveur');
      }
      setSubmitted(true);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = async () => {
    const logoBase64 = await imgToBase64(logo);
    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" alt="INFORMICA" style="height:80px;width:auto;object-fit:contain" />`
      : `<div class="logo-text">INFORMICA</div>`;

    const formationLabel = formations.find(f => f.id === form.formation_id)?.nom || '';
    const printData = { ...form, formation_label: formationLabel };
    const rows = printRows.map(r => ({ ...r, value: r.key ? printData[r.key] || '' : '' }));

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fiche Inscription – INFORMICA</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Georgia,serif;padding:2.5rem;color:#000;font-size:13px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:1rem;margin-bottom:1rem}
      .logo-text{font-size:1.8rem;font-weight:bold;letter-spacing:.1em}
      .contact{font-size:10px;text-align:right;line-height:1.8;color:#444}
      .title{text-align:center;margin-bottom:2rem}
      .title p{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#666;margin-bottom:.25rem}
      .title h1{font-size:2.2rem;font-weight:bold;letter-spacing:.2em}
      .title small{font-size:12px;color:#555}
      .row{display:flex;align-items:flex-end;gap:8px;margin-bottom:1.2rem}
      .row-fr{font-size:13px;font-weight:bold;white-space:nowrap;width:190px;flex-shrink:0}
      .row-line{flex:1;border-bottom:1px dotted #000;height:20px;padding-bottom:2px;font-size:13px}
      .row-ar{font-size:13px;font-weight:bold;white-space:nowrap;width:150px;flex-shrink:0;text-align:right;direction:rtl}
      .footer{border-top:1px dotted #000;margin-top:2.5rem;padding-top:1.5rem;display:flex;justify-content:space-between;align-items:flex-start}
      .sig-label{font-size:13px;margin-bottom:.5rem;font-weight:bold;direction:rtl}
      .sig-box{border:1px solid #aaa;width:180px;height:64px;border-radius:4px}
      .date-line{font-size:13px;direction:rtl}
      .date-line span{display:inline-block;border-bottom:1px dotted #000;width:120px;margin-right:4px}
    </style></head><body>
    <div class="header">
      ${logoHtml}
      <div class="contact">
        <div>Cité Amiguela, Groupement Rés. N°1234, N°34 – Blida</div>
        <div>Tél./Fax : 034 70 07 47 / GSM : 0661 675 954</div>
        <div>informica@gmail.com | informica.com | RC : 3RS071762</div>
      </div>
    </div>
    <div class="title">
      <p>École de Formation</p>
      <h1>INFORMICA</h1>
      <small>Fiche d'Inscription / استمارة التسجيل</small>
    </div>
    ${rows.map(r => `
      <div class="row">
        <span class="row-fr">${r.fr}${r.fr ? ' :' : ''}</span>
        <span class="row-line">${r.value}</span>
        <span class="row-ar">${r.ar ? `: ${r.ar}` : ''}</span>
      </div>`).join('')}
    <div class="footer">
      <div><p class="sig-label">إمضاء المعني</p><div class="sig-box"></div></div>
      <div class="date-line">التاريخ : <span></span></div>
    </div>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const inp = (hasErr) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white transition ${hasErr ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'}`;
  const sel = (hasErr) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white text-slate-800 transition ${hasErr ? 'border-red-400 ring-1 ring-red-300' : 'border-slate-200'}`;
  const lbl = 'block text-xs font-medium text-slate-500 mb-1';
  const Req = () => <span className="text-red-400 ml-0.5">*</span>;
  const Err = ({ field }) => errors[field] ? <p className="text-xs text-red-400 mt-1">Champ requis</p> : null;
  const LoadingSelect = () => (
    <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-400 bg-slate-50 animate-pulse">
      Chargement…
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4">
     <div className="bg-white w-full max-w-2xl sm:max-w-3xl lg:max-w-6xl mx-auto rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 md:p-8">
        {/* Header */}
        
       <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b-2 border-black pb-4 mb-4 gap-4">  <img src={logo} alt="INFORMICA" className="h-24 w-auto object-contain" />
          <div className="text-right text-[10px] text-gray-500 leading-[1.7]">
            <p>Cité Amiguela, Groupement Rés. N°1234, N°34 – 2ème – Blida – Boumérdès</p>
            <p>Tél./Fax : 034 70 07 47 / GSM : 0661 675 954</p>
            <p>Email : informica@gmail.com | Site : informica.com</p>
          </div>
        </div>
        <div className="text-center mb-6">
          <p className="text-lg tracking-widest text-gray-500 uppercase">ECOLE DE FORMATION</p>
          <h1 className="text-4xl font-black tracking-widest text-black leading-tight">INFORMICA</h1>
        </div>

        {submitted ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-800 mb-1">Inscription envoyée !</h2>
            <p className="text-sm text-slate-500">Nous vous contacterons très bientôt.</p>
            <button
              onClick={() => { setSubmitted(false); setForm(EMPTY); setErrors({}); }}
              className="mt-6 text-sm text-slate-600 underline underline-offset-2"
            >Nouvelle inscription</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={lbl}>Nom / اللقب <Req /></label><input className={inp(errors.nom)} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Nom de famille" /><Err field="nom" /></div>
              <div><label className={lbl}>Prénom / الاسم <Req /></label><input className={inp(errors.prenom)} value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Prénom" /><Err field="prenom" /></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={lbl}>Date de naissance / تاريخ الميلاد <Req /></label><input type="date" className={inp(errors.ddn)} value={form.ddn} onChange={e => set('ddn', e.target.value)} /><Err field="ddn" /></div>
              <div><label className={lbl}>Lieu de naissance / مكان الميلاد <Req /></label><input className={inp(errors.lieu)} value={form.lieu} onChange={e => set('lieu', e.target.value)} placeholder="Ville" /><Err field="lieu" /></div>
            </div>

            <div>
              <label className={lbl}>Adresse personnelle / العنوان الشخصي <Req /></label>
              <input className={inp(errors.adresse)} value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="Adresse complète" />
              <Err field="adresse" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Niveau scolaire / المستوى التعليمي <Req /></label>
                {loading ? <LoadingSelect /> : (
                  <select className={sel(errors.niveau)} value={form.niveau} onChange={e => set('niveau', e.target.value)}>
                    <option value="">— Choisir —</option>
                    {niveaux.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
                <Err field="niveau" />
              </div>
              <div>
                <label className={lbl}>Téléphone / رقم الهاتف <Req /></label>
                <input className={inp(errors.tel)} value={form.tel} onChange={e => set('tel', e.target.value)} placeholder="0X XX XX XX XX" />
                <Err field="tel" />
              </div>
            </div>

            <div>
              <label className={lbl}>Email / البريد الإلكتروني <Req /></label>
              <input type="email" className={inp(errors.email)} value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemple.com" />
              <Err field="email" />
            </div>

            <div>
              <label className={lbl}>Formation / التكوين <Req /></label>
              {loading ? <LoadingSelect /> : (
                <select className={sel(errors.formation_id)} value={form.formation_id} onChange={e => set('formation_id', e.target.value)}>
                  <option value="">— Choisir —</option>
                  {formations.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              )}
              <Err field="formation_id" />
            </div>

            <div>
              <label className={lbl}>Comment nous avez-vous connu ? <Req /></label>
              {loading ? <LoadingSelect /> : (
                <select className={sel(errors.source)} value={form.source} onChange={e => set('source', e.target.value)}>
                  <option value="">— Choisir —</option>
                  {sources.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
              <Err field="source" />
            </div>

            {apiError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{apiError}</p>
            )}

            <p className="text-xs text-slate-400">Les champs marqués <span className="text-red-400">*</span> sont obligatoires.</p>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 9V4h12v5M6 18H4a1 1 0 01-1-1v-5a1 1 0 011-1h16a1 1 0 011 1v5a1 1 0 01-1 1h-2M6 14h12v6H6v-6z" /></svg>
                Imprimer
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-slate-800 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-slate-900 transition disabled:opacity-50"
              >
                {submitting ? 'Envoi en cours…' : "Soumettre l'inscription"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}