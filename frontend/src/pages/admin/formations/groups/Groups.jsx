import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Pencil, Trash2, X, ChevronRight, GraduationCap } from 'lucide-react';
import AdminLayout from '../../../../layouts/AdminLayout';

const inp = 'w-full bg-[#F8FAFC] border border-transparent rounded-lg px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors';
const Label = ({ icon: Icon, text }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} className="text-[#0369A1]" />}{text}
  </p>
);
const Section = ({ children }) => (
  <div className="p-2 grid grid-cols-2 gap-3">{children}</div>
);

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

  if (loading) return <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="overflow-x-auto rounded-xl border border-[#F1F5F9]">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="bg-[#DCEBFA]">
            <th className="border border-[#F1F5F9] px-2 py-1.5" rowSpan={2} />
            {JOURS.map((jour) => (
              <th key={jour} colSpan={2} className="border border-[#F1F5F9] px-2 py-1.5 text-[#0369A1] font-semibold capitalize">{jour}</th>
            ))}
          </tr>
          <tr className="bg-[#DCEBFA]">
            {JOURS.map((jour) => PERIODES.map((p) => (
              <th key={`${jour}-${p}`} className="border border-[#F1F5F9] px-2 py-1.5 text-[#0369A1]/70">{p === 'matin' ? 'Matin' : 'Midi'}</th>
            )))}
          </tr>
        </thead>
        <tbody>
          {SALLES.map((salle) => (
            <tr key={salle}>
              <td className="border border-[#F1F5F9] px-2 py-2 font-semibold text-slate-800 bg-[#DCEBFA]/40 whitespace-nowrap">{salle}</td>
              {JOURS.map((jour) => PERIODES.map((periode) => {
                const k = makeKey(jour, salle, periode);
                const cell = cells[k];
                const isEditing = editingKey === k;
                return (
                  <td key={k} className="border border-[#F1F5F9] p-0 align-top min-w-[6rem]">
                    {isEditing ? (
                      <div className="p-1.5 space-y-1 bg-[#fffef9]">
                        <input type="text" value={editValues.contenu} onChange={(e) => setEditValues((v) => ({ ...v, contenu: e.target.value }))}
                          placeholder="Contenu..." className="w-full border border-[#0369A1]/30 rounded px-1.5 py-1 text-xs bg-white outline-none"
                          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(jour, salle, periode); if (e.key === 'Escape') cancelEdit(); }} />
                        <div className="flex gap-1">
                          <input type="time" value={editValues.heure_debut} onChange={(e) => setEditValues((v) => ({ ...v, heure_debut: e.target.value }))}
                            className="flex-1 border border-[#F1F5F9] rounded px-1 py-0.5 text-[10px] bg-white outline-none" />
                          <span className="text-slate-400 self-center">→</span>
                          <input type="time" value={editValues.heure_fin} onChange={(e) => setEditValues((v) => ({ ...v, heure_fin: e.target.value }))}
                            className="flex-1 border border-[#F1F5F9] rounded px-1 py-0.5 text-[10px] bg-white outline-none" />
                        </div>
                        <div className="flex justify-between items-center pt-0.5">
                          <button onClick={() => clearCell(jour, salle, periode)} className="text-[10px] text-red-400 hover:text-red-600">Effacer</button>
                          <div className="flex gap-1">
                            <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-700 text-xs">✕</button>
                            <button onClick={() => saveEdit(jour, salle, periode)} disabled={saving} className="text-[#0369A1] hover:text-[#065e8f] text-xs">✓</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(jour, salle, periode)}
                        className="w-full h-full min-h-[3rem] text-left px-2 py-1.5 hover:bg-[#DCEBFA]/40 transition group">
                        {cell?.contenu ? (
                          <div>
                            {(cell.heure_debut || cell.heure_fin) && (
                              <p className="text-[10px] text-[#0369A1] font-medium">{cell.heure_debut?.slice(0,5)}{cell.heure_fin ? ` → ${cell.heure_fin.slice(0,5)}` : ''}</p>
                            )}
                            <p className="text-xs text-slate-800">{cell.contenu}</p>
                          </div>
                        ) : (
                          <span className="text-[#F1F5F9] group-hover:text-slate-300 text-lg">+</span>
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

const openAdd = () => {
  setEditGroup(null);
  setForm({ nom: '', teacher_id: '' });
  setShowModal(true);
  setUnassignedStudents([]);
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
      const saved = await res.json();
      fetchGroups();
      if (isNewGroup) {
        // reste ouvert : bascule en mode édition pour permettre l'affectation d'étudiants et l'emploi du temps
        setEditGroup(saved);
        setIsNewGroup(false);
        fetchUnassignedStudents();
      } else {
        setShowModal(false);
      }
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
const [archivingGroup, setArchivingGroup] = useState(null);
const [archiveYear, setArchiveYear] = useState('');

const getAnneesScolaires = () => {
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const years = [];
  for (let y = startYear + 1; y >= startYear - 5; y--) years.push(`${y}-${y + 1}`);
  return years;
};

const confirmArchiveGroup = async () => {
  const token = localStorage.getItem('token');
  await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${archivingGroup}/archive`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ annee_scolaire: archiveYear || null }),
  });
  setArchivingGroup(null);
  setArchiveYear('');
  fetchGroups();
};
  return (
    <AdminLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs mb-3">
        <button onClick={() => navigate('/admin/formations')} className="text-slate-400 hover:text-[#0369A1] transition">
          Formations
        </button>
        <ChevronRight size={12} className="text-slate-300" />
        <span className="text-[#0369A1] font-medium">{formation?.nom ?? 'Groupes'}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/formations')}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-[#F1F5F9] hover:bg-[#DCEBFA] transition"
          >
            <ArrowLeft size={16} className="text-[#0369A1]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Groupes</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {formation?.nom ?? `Formation #${formation_id}`} — {groups.length} groupe(s)
            </p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-lg text-xs font-medium
            shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all"
        >
          <Plus size={18} />
          Ajouter un groupe
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          Erreur : {error}
        </p>
      )}

      {/* Cards */}
      {!loading && !error && (
        <>
          {groups.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucun groupe pour cette formation.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center">
                      <Users size={20} className="text-emerald-600" />
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      g.statut === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {g.statut === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  <h2 className="text-slate-800 font-semibold text-base mb-1">{g.nom}</h2>
                  <p className="text-slate-400 text-xs mb-4">
                    {g.teacher?.user
                      ? `${g.teacher.user.nom} ${g.teacher.user.prenom}`
                      : 'Aucun professeur assigné'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-5">
                    <span className="flex items-center gap-1"><Users size={13} className="text-[#0369A1]" /> {g.nb_etudiants} étudiant(s)</span>
                    {g.created_at && (
                      <span>Créé le {new Date(g.created_at).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => navigate(`/admin/formations/${formation_id}/groups/${g.id}`)}
                      className="flex items-center gap-1 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] border border-[#0369A1]/20 px-3 py-1.5 rounded-full hover:bg-[#c9e2f7] hover:shadow-sm active:scale-95 transition"
                    >
                      Voir détails <ChevronRight size={13} />
                    </button>
                    <button
                      onClick={() => openEdit(g)}
                      className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-700/20 px-3 py-1.5 rounded-full hover:bg-amber-100 hover:shadow-sm active:scale-95 transition"
                    >
                      <Pencil size={12} /> Modifier
                    </button>
                  <button
  onClick={() => handleDelete(g.id)}
  className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 border border-red-500/20 px-3 py-1.5 rounded-full hover:bg-red-100 hover:shadow-sm active:scale-95 transition"
>
  <Trash2 size={12} /> Supprimer
</button>
<button
  onClick={() => setArchivingGroup(g.id)}
  className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-500/20 px-3 py-1.5 rounded-full hover:bg-slate-200 hover:shadow-sm active:scale-95 transition"
>
  Archiver
</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {archivingGroup && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-xl p-5 w-full max-w-sm mx-4 space-y-3">
      <p className="text-sm font-medium text-slate-800">Archiver ce groupe ?</p>
      <select value={archiveYear} onChange={e => setArchiveYear(e.target.value)}
        className="w-full border border-[#F1F5F9] rounded-lg px-3 py-2 text-sm">
        <option value="">— Année scolaire (optionnel) —</option>
        {getAnneesScolaires().map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <div className="flex justify-end gap-2">
        <button onClick={() => { setArchivingGroup(null); setArchiveYear(''); }}
          className="text-xs px-3 py-1.5 rounded-lg border border-[#F1F5F9] text-slate-500 hover:bg-slate-50">Annuler</button>
        <button onClick={confirmArchiveGroup}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-500 text-white hover:bg-slate-600">Archiver</button>
      </div>
    </div>
  </div>
)}
        </>
      )}

{showModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] sticky top-0 bg-white z-10">
        <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-[#DCEBFA] text-[#0369A1] flex items-center justify-center">
            <Users size={14} />
          </span>
          {isNewGroup ? 'Ajouter un groupe' : 'Modifier le groupe'}
        </h2>
        <button onClick={() => setShowModal(false)}>
          <X size={16} className="text-slate-300 hover:text-slate-600" />
        </button>
      </div>

      <div className="p-5 space-y-4">

        {/* Section 1 : infos de base */}
        <Section>
          <div className="col-span-2">
            <Label icon={Users} text="Nom du groupe *" />
            <input
              type="text"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex: Groupe A"
              className={inp}
            />
          </div>
          <div className="col-span-2">
            <Label icon={GraduationCap} text="Professeur" />
            <select
              value={form.teacher_id}
              onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
              className={inp}
            >
              <option value="">— Aucun professeur —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.nom} {t.prenom}</option>
              ))}
            </select>
          </div>
        </Section>

        {/* Section 2 : étudiants à affecter */}
        <div>
          <Label icon={GraduationCap} text="Étudiants confirmés non affectés" />
          {unassignedStudents.length === 0 ? (
            <p className="text-xs text-slate-400 mt-1">Aucun étudiant disponible.</p>
          ) : (
            <div className="border border-[#F1F5F9] rounded-xl overflow-hidden mt-1">
              <table className="w-full text-xs">
                <thead className="bg-[#DCEBFA]">
                  <tr>
                    <th className="text-left px-3 py-2 text-[#0369A1] font-semibold text-[10px] uppercase tracking-wide">Étudiant</th>
                    <th className="text-left px-3 py-2 text-[#0369A1] font-semibold text-[10px] uppercase tracking-wide">Téléphone</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {unassignedStudents.map((i) => (
                    <tr key={i.id} className="hover:bg-[#DCEBFA]/30">
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {i.etudiant?.nom} {i.etudiant?.prenom}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{i.etudiant?.telephone ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {editGroup ? (
                          <button
                            onClick={() => handleAssignStudent(i.id)}
                            className="text-[11px] font-medium text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1 rounded-full hover:bg-[#c9e2f7] transition"
                          >
                            Affecter
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Sauvegarder d'abord</span>
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
            <Label icon={Users} text="Emploi du temps" />
            <div className="mt-1">
              <GroupScheduleTable groupId={editGroup.id} formation_id={formation_id} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => setShowModal(false)} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">
            {isNewGroup ? 'Annuler' : 'Fermer'}
          </button>
          <button onClick={handleSave} disabled={saving || !form.nom.trim()}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40 font-medium">
            {saving ? 'Enregistrement...' : isNewGroup ? 'Ajouter' : 'Modifier'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </AdminLayout>
  );
};

export default Groups;