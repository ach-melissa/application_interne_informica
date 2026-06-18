import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Pencil, Trash2, X } from 'lucide-react';
import AdminLayout from '../../../../layouts/AdminLayout';

const Groups = () => {
  const { id: formation_id } = useParams();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [formation, setFormation] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [form, setForm] = useState({ nom: '', teacher_id: '' });
  const [saving, setSaving] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    try {
const token = localStorage.getItem('token');
const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups?formation_id=${formation_id}`, {
  headers: { Authorization: `Bearer ${token}` }
});
if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormation = async () => {
    try {
const token = localStorage.getItem('token');
const res = await fetch(`${import.meta.env.VITE_API_URL}/api/formations`, {
  headers: { Authorization: `Bearer ${token}` }
});
const data = await res.json();
      const found = data.find((f) => f.id === formation_id);
      setFormation(found);
    } catch {}
  };

  const fetchTeachers = async () => {
    try {
const token = localStorage.getItem('token');
const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teachers`, {
  headers: { Authorization: `Bearer ${token}` }
});
const data = await res.json();
      setTeachers(data);
    } catch {}
  };

  useEffect(() => {
    fetchGroups();
    fetchFormation();
    fetchTeachers();
  }, [formation_id]);

  const openAdd = () => {
    setEditGroup(null);
    setForm({ nom: '', teacher_id: '' });
    setShowModal(true);
  };

  const openEdit = (g) => {
    setEditGroup(g);
    setForm({
      nom: g.nom,
      teacher_id: g.teacher_id ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim()) return;
    setSaving(true);
    try {
      const url = editGroup
        ? `${import.meta.env.VITE_API_URL}/api/groups/${editGroup.id}`
        : `${import.meta.env.VITE_API_URL}/api/groups`;
      const method = editGroup ? 'PATCH' : 'POST';
      const body = editGroup
        ? { nom: form.nom, teacher_id: form.teacher_id || null }
        : { nom: form.nom, formation_id, teacher_id: form.teacher_id || null };

const token = localStorage.getItem('token');
const res = await fetch(url, {
  method,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(body),
});
      if (!res.ok) throw new Error('Erreur serveur');
      setShowModal(false);
      fetchGroups();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

const handleDelete = async (id) => {
  if (!confirm('Supprimer ce groupe ?')) return;
  const token = localStorage.getItem('token');
  await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  fetchGroups();
};

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/formations')}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E2E8F0] hover:bg-gray-100 transition"
          >
            <ArrowLeft size={16} className="text-[#64748B]" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Groupes</h1>
            <p className="text-[#64748B] text-sm mt-0.5">
              {formation?.nom ?? `Formation #${formation_id}`} — {groups.length} groupe(s)
            </p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2.5 rounded-lg hover:bg-[#1D4ED8] transition text-sm font-medium"
        >
          <Plus size={18} />
          Ajouter un groupe
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      )}

      {/* Cards */}
      {!loading && !error && (
        <>
          {groups.length === 0 ? (
            <p className="text-[#64748B] text-sm">Aucun groupe pour cette formation.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-[#FFF7ED] rounded-lg flex items-center justify-center">
                      <Users size={20} className="text-[#F97316]" />
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      g.statut === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {g.statut === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  <h2 className="text-[#1E293B] font-semibold text-base mb-1">{g.nom}</h2>
                  <p className="text-[#64748B] text-xs mb-4">
                    {g.teacher?.user
                      ? `${g.teacher.user.nom} ${g.teacher.user.prenom}`
                      : 'Aucun professeur assigné'}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-[#64748B] mb-5">
                    <Users size={13} /> {g.nb_etudiants} étudiant(s)
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => navigate(`/admin/formations/${formation_id}/groups/${g.id}`)}
                      className="text-xs font-medium text-[#2563EB] border border-[#2563EB] px-3 py-1.5 rounded-lg hover:bg-[#EFF6FF] transition"
                    >
                      Voir détails
                    </button>
                    <button
                      onClick={() => openEdit(g)}
                      className="flex items-center gap-1 text-xs font-medium text-[#F97316] border border-[#F97316] px-3 py-1.5 rounded-lg hover:bg-orange-50 transition"
                    >
                      <Pencil size={12} /> Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="flex items-center gap-1 text-xs font-medium text-red-500 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 size={12} /> Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1E293B]">
                {editGroup ? 'Modifier le groupe' : 'Ajouter un groupe'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X size={20} className="text-[#64748B]" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#1E293B] block mb-1">Nom du groupe</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Ex: Groupe A"
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#1E293B] block mb-1">Professeur</label>
                <select
                  value={form.teacher_id}
                  onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value="">— Aucun professeur —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.nom} {t.prenom}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-[#E2E8F0] rounded-lg py-2.5 text-sm text-[#64748B] hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nom.trim()}
                className="flex-1 bg-[#2563EB] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#1D4ED8] transition disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : editGroup ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Groups;