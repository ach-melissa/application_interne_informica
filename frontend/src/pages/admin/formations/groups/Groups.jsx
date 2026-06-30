import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Pencil, Trash2, X } from 'lucide-react';
import AdminLayout from '../../../../layouts/AdminLayout';

const JOURS = ['samedi', 'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi'];
const PERIODES = ['matin', 'midi'];
const SALLES = ['Salle 01', 'Salle 02', 'Salle 03', 'Salle 04', 'Salle 05'];

const GroupScheduleTable = ({ groupId, formation_id }) => {
  const [cells, setCells] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState(null);
  const [editValues, setEditValues] = useState({ contenu: '', heure_debut: '', heure_fin: '' });
  const [saving, setSaving] = useState(false);

  const makeKey = (jour, salle, periode) => `${jour}|${salle}|${periode}`;
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/schedules/formation/${formation_id}`, { headers: getHeaders() })
      .then(r => r.json())
      .then((data) => {
        const map = {};
        data.forEach((row) => {
          const k = makeKey(row.jour_semaine, row.salle, row.periode);
          // case appartient au groupe courant → éditable
          // case appartient à un autre groupe → non éditable
          map[k] = {
            id: row.id,
            contenu: row.contenu ?? '',
            heure_debut: row.heure_debut ?? '',
            heure_fin: row.heure_fin ?? '',
            isOwn: row.group_id === groupId,  // 👈 clé importante
          };
        });
        setCells(map);
      })
      .finally(() => setLoading(false));
  }, [groupId]);

  const startEdit = (jour, salle, periode) => {
    const k = makeKey(jour, salle, periode);
    const existing = cells[k] ?? { contenu: '', heure_debut: '', heure_fin: '' };
    setEditingKey(k);
    setEditValues({ ...existing });
  };

  const cancelEdit = () => setEditingKey(null);

  const saveEdit = async (jour, salle, periode) => {
    const k = makeKey(jour, salle, periode);
    setSaving(true);
    try {
      const existing = cells[k];
      const payload = { group_id: groupId, jour_semaine: jour, salle, periode, contenu: editValues.contenu, heure_debut: editValues.heure_debut || null, heure_fin: editValues.heure_fin || null };
      const res = existing?.id
        ? await fetch(`${import.meta.env.VITE_API_URL}/api/schedules/${existing.id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(payload) })
        : await fetch(`${import.meta.env.VITE_API_URL}/api/schedules`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
      const data = await res.json();
      setCells((prev) => ({ ...prev, [k]: { id: data.id, contenu: data.contenu ?? '', heure_debut: data.heure_debut ?? '', heure_fin: data.heure_fin ?? '' } }));
      setEditingKey(null);
    } finally {
      setSaving(false);
    }
  };

  const clearCell = async (jour, salle, periode) => {
    const k = makeKey(jour, salle, periode);
    const existing = cells[k];
    if (!existing?.id) { setEditingKey(null); return; }
    await fetch(`${import.meta.env.VITE_API_URL}/api/schedules/${existing.id}`, { method: 'DELETE', headers: getHeaders() });
    setCells((prev) => { const next = { ...prev }; delete next[k]; return next; });
    setEditingKey(null);
  };

  if (loading) return <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="bg-[#F8FAFC]">
            <th className="border border-[#E2E8F0] px-2 py-1.5" rowSpan={2} />
            {JOURS.map((jour) => (
              <th key={jour} colSpan={2} className="border border-[#E2E8F0] px-2 py-1.5 text-[#1E293B] font-semibold capitalize">{jour}</th>
            ))}
          </tr>
          <tr className="bg-[#F8FAFC]">
            {JOURS.map((jour) => PERIODES.map((p) => (
              <th key={`${jour}-${p}`} className="border border-[#E2E8F0] px-2 py-1.5 text-[#94A3B8]">{p === 'matin' ? 'Matin' : 'Midi'}</th>
            )))}
          </tr>
        </thead>
        <tbody>
          {SALLES.map((salle) => (
            <tr key={salle}>
              <td className="border border-[#E2E8F0] px-2 py-2 font-semibold text-[#1E293B] bg-[#F8FAFC] whitespace-nowrap">{salle}</td>
              {JOURS.map((jour) => PERIODES.map((periode) => {
                const k = makeKey(jour, salle, periode);
                const cell = cells[k];
                const isEditing = editingKey === k;
                return (
                  <td key={k} className="border border-[#E2E8F0] p-0 align-top min-w-[6rem]">
                    {isEditing ? (
                      <div className="p-1.5 space-y-1 bg-[#fffef9]">
                        <input type="text" value={editValues.contenu} onChange={(e) => setEditValues((v) => ({ ...v, contenu: e.target.value }))}
                          placeholder="Contenu..." className="w-full border border-blue-300 rounded px-1.5 py-1 text-xs bg-white outline-none"
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(jour, salle, periode); if (e.key === 'Escape') cancelEdit(); }} />
                        <div className="flex gap-1">
                          <input type="time" value={editValues.heure_debut} onChange={(e) => setEditValues((v) => ({ ...v, heure_debut: e.target.value }))}
                            className="flex-1 border border-[#E2E8F0] rounded px-1 py-0.5 text-[10px] bg-white outline-none" />
                          <span className="text-[#94A3B8] self-center">→</span>
                          <input type="time" value={editValues.heure_fin} onChange={(e) => setEditValues((v) => ({ ...v, heure_fin: e.target.value }))}
                            className="flex-1 border border-[#E2E8F0] rounded px-1 py-0.5 text-[10px] bg-white outline-none" />
                        </div>
                        <div className="flex justify-between items-center pt-0.5">
                          <button onClick={() => clearCell(jour, salle, periode)} className="text-[10px] text-red-400 hover:text-red-600">Effacer</button>
                          <div className="flex gap-1">
                            <button onClick={cancelEdit} className="text-[#94A3B8] hover:text-[#1E293B] text-xs">✕</button>
                            <button onClick={() => saveEdit(jour, salle, periode)} disabled={saving} className="text-blue-500 hover:text-blue-700 text-xs">✓</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(jour, salle, periode)}
                        className="w-full h-full min-h-[3rem] text-left px-2 py-1.5 hover:bg-blue-50 transition group">
                        {cell?.contenu ? (
                          <div>
                            {(cell.heure_debut || cell.heure_fin) && (
                              <p className="text-[10px] text-blue-500 font-medium">{cell.heure_debut?.slice(0,5)}{cell.heure_fin ? ` → ${cell.heure_fin.slice(0,5)}` : ''}</p>
                            )}
                            <p className="text-xs text-[#1E293B]">{cell.contenu}</p>
                          </div>
                        ) : (
                          <span className="text-[#E2E8F0] group-hover:text-[#CBD5E1] text-lg">+</span>
                        )}
                      </button>
                    )}
                  </td>
                );
              }))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

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
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [form, setForm] = useState({ nom: '', teacher_id: '' });
  const [saving, setSaving] = useState(false);
const [unassignedStudents, setUnassignedStudents] = useState([]);

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
const fetchUnassignedStudents = async () => {
  console.log('fetching unassigned for formation:', formation_id);
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/formation/${formation_id}/unassigned`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log('unassigned data:', JSON.stringify(data));
    setUnassignedStudents(data);
 } catch (err) { console.error('fetchUnassigned error:', err); }
};

const handleAssignStudent = async (inscription_id) => {
  if (!editGroup) return;
  try {
    const token = localStorage.getItem('token');
    await fetch(`${import.meta.env.VITE_API_URL}/api/inscriptions/${inscription_id}/assign-group`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ group_id: editGroup.id }),
    });
    // retire l'étudiant de la liste
    setUnassignedStudents((prev) => prev.filter((i) => i.id !== inscription_id));
  } catch (err) {
    alert(err.message);
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

const openAdd = async () => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nom: 'Nouveau groupe', formation_id, teacher_id: null }),
  });
  const saved = await res.json();
  setEditGroup(saved);
  setForm({ nom: '', teacher_id: '' });
  setShowModal(true);
  fetchUnassignedStudents();
  setIsNewGroup(true);
};

  const openEdit = (g) => {
    setEditGroup(g);
    setForm({
      nom: g.nom,
      teacher_id: g.teacher_id ?? '',
    });
    setShowModal(true);
    fetchUnassignedStudents();
    setIsNewGroup(false);
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
                    <button
  className="text-xs font-medium text-[#64748B] border border-[#64748B] px-3 py-1.5 rounded-lg hover:bg-slate-50 transition"
>
  Archiver
</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

{showModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] flex-shrink-0">
        <h2 className="text-lg font-bold text-[#1E293B]">
          {isNewGroup ? 'Ajouter un groupe' : 'Modifier le groupe'}
        </h2>
        <button onClick={async () => {
  if (!form.nom.trim() && editGroup) {
    const token = localStorage.getItem('token');
    await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${editGroup.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchGroups();
  }
  setShowModal(false);
}}>
          <X size={20} className="text-[#64748B]" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-6 space-y-6">

        {/* Section 1 : infos de base */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">Informations</p>
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

        {/* Section 2 : étudiants à affecter */}
        <div>
          <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">
            Étudiants confirmés non affectés
          </p>
          {unassignedStudents.length === 0 ? (
            <p className="text-xs text-[#94A3B8]">Aucun étudiant disponible.</p>
          ) : (
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-[#64748B]">Étudiant</th>
                    <th className="text-left px-3 py-2.5 text-[#64748B]">Téléphone</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {unassignedStudents.map((i) => (
                    <tr key={i.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-3 py-2.5 font-medium text-[#1E293B]">
                        {i.etudiant?.nom} {i.etudiant?.prenom}
                      </td>
                      <td className="px-3 py-2.5 text-[#64748B]">{i.etudiant?.telephone ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right">
                        {editGroup ? (
                          <button
                            onClick={() => handleAssignStudent(i.id)}
                            className="text-[11px] font-medium text-[#2563EB] border border-[#2563EB] px-2.5 py-1 rounded-lg hover:bg-[#EFF6FF] transition"
                          >
                            Affecter
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#94A3B8]">Sauvegarder d'abord</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 3 : emploi du temps (seulement en mode édition) */}
        {editGroup && (
          <div>
            <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-3">
              Emploi du temps
            </p>
            <GroupScheduleTable groupId={editGroup.id} formation_id={formation_id} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-6 py-4 border-t border-[#E2E8F0] flex-shrink-0">
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
         {saving ? 'Enregistrement...' : isNewGroup ? 'Ajouter' : 'Modifier'}
        </button>
      </div>
    </div>
  </div>
)}
    </AdminLayout>
  );
};

export default Groups;