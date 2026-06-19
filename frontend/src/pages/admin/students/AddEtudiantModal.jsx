import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const REGISTERED_BY_OPTIONS = ['hanane', 'yasmine', 'page_facebook', 'amira'];
const SOURCE_OPTIONS = ['Amis/Famille', 'Instagram', 'TikTok', 'Facebook', 'Recherche Google', 'Site Web', 'Bouche-à-oreille', 'Publicité', 'Autre'];

const AddEtudiantModal = ({ onClose, onSuccess }) => {
  const [formations, setFormations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    nom: '', prenom: '', telephone: '', email: '',
    adresse: '', niveau_scolaire: '', date_naissance: '',
    formation_id: '', source: SOURCE_OPTIONS[0], registered_by: REGISTERED_BY_OPTIONS[0],
  });

  useEffect(() => {
    const fetchFormations = async () => {
      const res = await fetch(`${API}/api/formations`, { headers: getHeaders() });
      const data = await res.json();
      setFormations(data);
    };
    fetchFormations();
  }, []);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async () => {
    if (!form.nom || !form.prenom || !form.telephone || !form.formation_id) {
      setError('Nom, prénom, téléphone et formation sont obligatoires.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/etudiants`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#1E293B]">Ajouter un étudiant</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1E293B]"><X size={18} /></button>
        </div>

        {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1 block">Nom *</label>
              <input value={form.nom} onChange={set('nom')} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b8995a]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1 block">Prénom *</label>
              <input value={form.prenom} onChange={set('prenom')} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b8995a]" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#64748B] mb-1 block">Téléphone *</label>
            <input value={form.telephone} onChange={set('telephone')} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b8995a]" />
          </div>

          <div>
            <label className="text-xs font-medium text-[#64748B] mb-1 block">Email</label>
            <input type="email" value={form.email} onChange={set('email')} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b8995a]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1 block">Date de naissance</label>
              <input type="date" value={form.date_naissance} onChange={set('date_naissance')} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b8995a]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1 block">Niveau scolaire</label>
              <input value={form.niveau_scolaire} onChange={set('niveau_scolaire')} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b8995a]" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#64748B] mb-1 block">Adresse</label>
            <input value={form.adresse} onChange={set('adresse')} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b8995a]" />
          </div>

          <div>
            <label className="text-xs font-medium text-[#64748B] mb-1 block">Formation *</label>
            <select value={form.formation_id} onChange={set('formation_id')} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b8995a]">
              <option value="">Choisir une formation</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1 block">Source</label>
              <select value={form.source} onChange={set('source')} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b8995a]">
                {SOURCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1 block">Enregistré par</label>
              <select value={form.registered_by} onChange={set('registered_by')} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b8995a]">
                {REGISTERED_BY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-gray-50 transition">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 text-sm rounded-lg bg-[#b8995a] text-white hover:bg-[#a0854d] transition disabled:opacity-40 font-medium">
            {submitting ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEtudiantModal;