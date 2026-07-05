import { useState, useEffect } from 'react';
import {
  User, Phone, Mail, MapPin, Calendar, GraduationCap,
  BookOpen, Sparkles, Radio, Rocket, RotateCcw, Globe,
} from 'lucide-react';
import logo from '../../assets/images/logo_informica.png';

const API = 'http://localhost:5000/api';
const EMPTY = { nom: '', prenom: '', ddn: '', lieu: '', adresse: '', niveau: '', email: '', tel: '', formation_id: '', source: '' };
const REQUIRED = ['nom', 'prenom', 'tel', 'formation_id', 'ddn', 'niveau'];

const inp = (err) => `w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm bg-white transition focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] ${err ? 'border-orange-400' : 'border-slate-200'}`;
const lbl = 'block text-xs font-semibold text-slate-600 mb-1';
const Req = () => <span className="text-orange-500">*</span>;

function Err({ errors, f }) {
  return errors[f] ? <p className="text-[11px] text-orange-500 mt-1">{errors[f]}</p> : null;
}

function Field({ icon: Icon, label, ar, field, type = 'text', required, form, errors, set, ...props }) {
  return (
    <div>
      <label className={lbl + ' flex items-center justify-between'}>
        <span>{label} {required && <Req />}</span>
        {ar && <span className="text-slate-400 font-normal" dir="rtl">{ar}</span>}
      </label>
      <div className="relative">
        <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type={type} className={inp(errors[field])} value={form[field]} onChange={e => set(field, e.target.value)} {...props} />
      </div>
      <Err errors={errors} f={field} />
    </div>
  );
}

function Select({ icon: Icon, label, ar, field, options, required, form, errors, set, loading }) {
  return (
    <div>
      <label className={lbl + ' flex items-center justify-between'}>
        <span>{label} {required && <Req />}</span>
        {ar && <span className="text-slate-400 font-normal" dir="rtl">{ar}</span>}
      </label>
      <div className="relative">
        <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
        {loading ? (
          <div className={inp(false) + ' animate-pulse text-slate-300'}>Chargement…</div>
        ) : (
          <select className={inp(errors[field])} value={form[field]} onChange={e => set(field, e.target.value)}>
            <option value="">— Choisir —</option>
            {options.map(o => <option key={o.id ?? o} value={o.id ?? o}>{o.nom ?? o}</option>)}
          </select>
        )}
      </div>
      <Err errors={errors} f={field} />
    </div>
  );
}

function Section({ icon: Icon, title, ar, children }) {
  return (
    <div className="space-y-3">
      <h3 className="flex items-center justify-between text-sm font-bold text-[#1E3A5F]">
        <span className="flex items-center gap-2">
          <Icon size={16} className="text-orange-500" /> {title}
        </span>
        {ar && <span className="text-xs font-normal text-slate-400" dir="rtl">{ar}</span>}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export default function InscriptionForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [formations, setFormations] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/formations`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.json()),
      fetch(`${API}/enums`).then(r => r.json()),
    ])
      .then(([f, e]) => { setFormations(Array.isArray(f) ? f : []); setNiveaux(e.niveau_scolaire || []); setSources(e.source || []); })
      .catch(() => setApiError('Impossible de charger les données.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => {
    if (k === 'tel') v = v.replace(/\D/g, '').slice(0, 10);
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: false }));
  };

  const validate = () => {
    const ne = {};
    REQUIRED.forEach(k => { if (!form[k]?.trim()) ne[k] = 'Champ requis'; });
    if (form.tel && !/^0[567]\d{8}$/.test(form.tel)) ne.tel = 'Doit commencer par 05/06/07 — 10 chiffres';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) ne.email = 'Email invalide';
    setErrors(ne);
    return Object.keys(ne).length === 0;
  };

  const handleReset = () => {
    setForm(EMPTY);
    setErrors({});
    setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setApiError('');
    try {
      const res = await fetch(`${API}/etudiants`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom, prenom: form.prenom, telephone: form.tel,
          email: form.email || null, adresse: form.adresse || null,
          niveau_scolaire: form.niveau, date_naissance: form.ddn,
          lieu_naissance: form.lieu || null, formation_id: form.formation_id,
          source: form.source || null,
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erreur serveur'); }
      setSubmitted(true);
    } catch (err) { setApiError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b-2 border-[#1E3A5F] p-6">
          <img src={logo} alt="INFORMICA" className="h-20 w-auto object-contain" />
          <div className="text-left sm:text-right text-[11px] text-slate-500 leading-relaxed space-y-1">
            <p>Cité Alliliguia, Groupement PR. N°1224, N°01 -2ème étage – Boumerdès</p>
            <p>Tél./Fax : 028 65 80 73   Mobile : 0561 148 563 - 0560 606 896</p>
            <p className="flex items-center gap-3 sm:justify-end flex-wrap">
              <span className="flex items-center gap-1">
                <Mail size={12} className="text-orange-400 shrink-0" /> informicadz@gmail.com
              </span>
              <span className="flex items-center gap-1">
                <Globe size={12} className="text-orange-400 shrink-0" /> informica.dz
              </span>
              <span>RC 353671752-00/A16</span>
            </p>
          </div>
        </div>

        <div className="text-center px-6 pt-6 pb-2">
          <p className="text-xs tracking-[0.2em] text-slate-400 uppercase">École de Formation</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-wide text-[#1E3A5F]">INFORMICA</h1>
          <p className="mt-2 text-sm text-slate-500 flex items-center justify-center gap-1.5">
            <Sparkles size={14} className="text-orange-400" />
            Prêt(e) à booster ta carrière ? Remplis ce formulaire, on s'occupe du reste !
          </p>
        </div>

        {submitted ? (
  <div className="text-center py-16 px-6">
    <div className="relative w-20 h-20 mx-auto mb-5">
      <div className="absolute inset-0 rounded-full bg-orange-100 animate-ping opacity-40" />
      <div className="relative w-20 h-20 rounded-full bg-[#1E3A5F] flex items-center justify-center">
        <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>

    <h2 className="text-xl font-bold text-[#1E3A5F] mb-1">Inscription envoyée avec succès !</h2>
    <p className="text-sm text-slate-500 max-w-sm mx-auto">
      Merci, <span className="font-semibold text-slate-700">{form.prenom || 'futur(e) étudiant(e)'}</span> ! Notre équipe va étudier ton dossier et te contactera très bientôt.
    </p>

    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
      <Sparkles size={13} className="text-orange-400" />
      Bienvenue dans la famille INFORMICA
      <Sparkles size={13} className="text-orange-400" />
    </div>

    <button onClick={() => { setSubmitted(false); setForm(EMPTY); setErrors({}); }}
      className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-white bg-[#1E3A5F] px-5 py-2.5 rounded-xl hover:bg-[#152C49] transition">
      <RotateCcw size={14} /> Nouvelle inscription
    </button>
  </div>
) : (
          <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8 space-y-8">

            <Section icon={User} title="Informations personnelles" ar="المعلومات الشخصية">
              <Field icon={User} label="Nom" ar="اللقب" field="nom" required placeholder="Nom de famille" form={form} errors={errors} set={set} />
              <Field icon={User} label="Prénom" ar="الاسم" field="prenom" required placeholder="Prénom" form={form} errors={errors} set={set} />
              <Field icon={Calendar} label="Date de naissance" ar="تاريخ الميلاد" field="ddn" type="date" required form={form} errors={errors} set={set} />
              <Field icon={MapPin} label="Lieu de naissance" ar="مكان الميلاد" required field="lieu" placeholder="Ville" form={form} errors={errors} set={set} />
            </Section>

            <Section icon={Phone} title="Contact" ar="الاتصال">
              <Field icon={Phone} label="Téléphone" ar="رقم الهاتف" field="tel" required placeholder="05XXXXXXXX" inputMode="numeric" maxLength={10} form={form} errors={errors} set={set} />
              <Field icon={Mail} label="Adresse électronique " ar="البريد الإلكتروني" field="email" type="email" placeholder="email@exemple.com" form={form} errors={errors} set={set} />
              <div className="sm:col-span-2">
                <Field icon={MapPin} label="Adresse personnelle" ar="العنوان الشخصي" field="adresse" required placeholder="Adresse complète" form={form} errors={errors} set={set} />
              </div>
            </Section>

            <Section icon={BookOpen} title="Formation" ar="التكوين">
              <Select icon={GraduationCap} label="Niveau scolaire" ar="المستوى التعليمي" field="niveau" required options={niveaux} form={form} errors={errors} set={set} loading={loading} />
              <Select icon={BookOpen} label="Formation choisie" ar="التكوين المختار" field="formation_id" required options={formations} form={form} errors={errors} set={set} loading={loading} />
              <div className="sm:col-span-2">
                <Select icon={Radio} label="Comment nous avez-vous connu ?" ar="كيف تعرفت علينا؟" field="source" options={sources} form={form} errors={errors} set={set} loading={loading} />
              </div>
            </Section>

            {apiError && <p className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">{apiError}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={handleReset}
                className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-50 transition">
                <RotateCcw size={15} /> Effacer tout
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1E3A5F] text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-[#152C49] transition disabled:opacity-50">
                {submitting ? 'Envoi en cours…' : <>Soumettre l'inscription <Rocket size={15} /></>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}