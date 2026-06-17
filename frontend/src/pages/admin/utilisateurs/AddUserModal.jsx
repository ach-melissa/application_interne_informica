import { useState } from 'react';
import { X } from 'lucide-react';

const AddUserModal = ({ onClose }) => {
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', nom_utilisateur: '',
    mot_de_passe: '', telephone: '', date_naissance: '', role: 'prof',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('New user:', form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#1E293B]">Ajouter un utilisateur</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1 block">Nom</label>
              <input name="nom" value={form.nom} onChange={handleChange} required
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1 block">Prénom</label>
              <input name="prenom" value={form.prenom} onChange={handleChange} required
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#64748B] mb-1 block">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#64748B] mb-1 block">Nom d'utilisateur</label>
            <input name="nom_utilisateur" value={form.nom_utilisateur} onChange={handleChange} required
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
          </div>
          <div>
            <label className="text-xs font-medium text-[#64748B] mb-1 block">Mot de passe</label>
            <input name="mot_de_passe" type="password" value={form.mot_de_passe} onChange={handleChange} required
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1 block">Téléphone</label>
              <input name="telephone" value={form.telephone} onChange={handleChange}
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
            </div>
            <div>
              <label className="text-xs font-medium text-[#64748B] mb-1 block">Date de naissance</label>
              <input name="date_naissance" type="date" value={form.date_naissance} onChange={handleChange}
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[#64748B] mb-1 block">Rôle</label>
            <select name="role" value={form.role} onChange={handleChange}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]">
              <option value="admin">Admin</option>
              <option value="prof">Prof</option>
              <option value="comptable">Comptable</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-gray-50 transition">
              Annuler
            </button>
            <button type="submit"
              className="px-4 py-2 text-sm rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition font-medium">
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;