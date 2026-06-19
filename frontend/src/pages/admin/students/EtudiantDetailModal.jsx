import { useState } from 'react';
import { X, Pencil, Check } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const EtudiantDetailModal = ({ inscription, onClose, onSuccess }) => {
  const e = inscription?.etudiant;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nom: e?.nom ?? '',
    prenom: e?.prenom ?? '',
    telephone: e?.telephone ?? '',
    email: e?.email ?? '',
    adresse: e?.adresse ?? '',
    niveau_scolaire: e?.niveau_scolaire ?? '',
    date_naissance: e?.date_naissance ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!inscription) return null;

  const set = (field) => (ev) => setForm({ ...form, [field]: ev.target.value });

  const handleSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/etudiants/etudiant/${e.id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditing(false);
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const Field = ({ label, field, type = 'text' }) => (
    <div>
      <p className="text-xs text-[#94A3B8] mb-0.5">{label}</p>
      {editing ? (
        <input
          type={type}
          value={form[field]}
          onChange={set(field)}
          className="w-full border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#b8995a] bg-[#faf9f7]"
        />
      ) : (
        <p className="text-sm text-[#1E293B] font-medium">{form[field] || '—'}</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#faf9f7] rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-[#1E293B]">{e?.nom} {e?.prenom}</h2>
            <p className="text-xs text-[#94A3B8]">{inscription.formation?.nom ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <button onClick={handleSave} disabled={submitting} className="flex items-center gap-1.5 text-xs bg-[#b8995a] text-white px-3 py-1.5 rounded-lg hover:bg-[#a0854d] disabled:opacity-40">
                <Check size={13} /> Enregistrer
              </button>
            ) : (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs border border-[#E2E8F0] text-[#64748B] px-3 py-1.5 rounded-lg hover:bg-white">
                <Pencil size={13} /> Modifier
              </button>
            )}
            <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1E293B]"><X size={18} /></button>
          </div>
        </div>

        {error && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>}

        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 grid grid-cols-2 gap-4">
          <Field label="Nom" field="nom" />
          <Field label="Prénom" field="prenom" />
          <Field label="Téléphone" field="telephone" />
          <Field label="Email" field="email" />
          <Field label="Date de naissance" field="date_naissance" type="date" />
          <Field label="Niveau scolaire" field="niveau_scolaire" />
          <div className="col-span-2">
            <Field label="Adresse" field="adresse" />
          </div>
        </div>

        <div className="mt-4 bg-white rounded-xl border border-[#E2E8F0] p-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-[#94A3B8] mb-0.5">Statut inscription</p>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              inscription.statut === 'confirmed' ? 'bg-green-100 text-green-600' :
              inscription.statut === 'pending' ? 'bg-yellow-100 text-yellow-600' :
              'bg-red-100 text-red-500'
            }`}>
              {inscription.statut === 'confirmed' ? 'Confirmé' : inscription.statut === 'pending' ? 'En attente' : 'Non confirmé'}
            </span>
          </div>
          <div>
            <p className="text-xs text-[#94A3B8] mb-0.5">Date d'inscription</p>
            <p className="text-sm text-[#1E293B] font-medium">
              {inscription.date_inscription ? new Date(inscription.date_inscription).toLocaleDateString('fr-FR') : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#94A3B8] mb-0.5">Source</p>
            <p className="text-sm text-[#1E293B] font-medium">{inscription.source ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[#94A3B8] mb-0.5">Enregistré par</p>
            <p className="text-sm text-[#1E293B] font-medium">{inscription.registered_by ?? '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EtudiantDetailModal;