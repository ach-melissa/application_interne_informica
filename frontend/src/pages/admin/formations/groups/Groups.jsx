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

const Toggle = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-2.5 cursor-pointer select-none">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
        checked ? 'bg-[#0369A1]' : 'bg-slate-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
    <span className="text-xs text-slate-600">{label}</span>
  </label>
);

const PERIODES = ['matin', 'midi'];
const GroupScheduleTable = ({ groupId, formation_id, staged, onAddStaged, onRemoveStaged }) => {
  const [cells, setCells] = useState({});
  const [salles, setSalles] = useState([]);
  const [jours, setJours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jour, setJour] = useState('');
  const [periode, setPeriode] = useState(PERIODES[0]);
  const [salle, setSalle] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [contenu, setContenu] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const makeKey = (j, s, p) => `${j}|${s}|${p}`;
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const loadSchedules = () => {
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/api/schedules`, { headers: getHeaders() })
      .then(r => r.json())
      .then((data) => {
        const map = {};
        data.forEach((row) => {
          const k = makeKey(row.jour_semaine, row.salle, row.periode);
          if (!map[k]) map[k] = [];
          map[k].push({
            id: row.id,
            contenu: row.contenu ?? '',
            heure_debut: row.heure_debut ?? '',
            heure_fin: row.heure_fin ?? '',
            isOwn: row.group_id === groupId,
          });
        });
        setCells(map);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSchedules();
    fetch(`${import.meta.env.VITE_API_URL}/api/schedules/salles`, { headers: getHeaders() })
      .then(r => r.json())
      .then((data) => setSalles(data.map((s) => s.nom)));
    fetch(`${import.meta.env.VITE_API_URL}/api/schedules/jours`, { headers: getHeaders() })
      .then(r => r.json())
      .then((data) => setJours(data));
  }, []);

  const displayCells = {};
  Object.keys(cells).forEach((k) => { displayCells[k] = [...cells[k]]; });
  if (!groupId) {
    staged.forEach((slot) => {
      const k = makeKey(slot.jour_semaine, slot.salle, slot.periode);
      if (!displayCells[k]) displayCells[k] = [];
      displayCells[k].push({ ...slot, isOwn: true, stagedLocalId: slot._localId });
    });
  }

  const handleAdd = async () => {
    if (!salle) return alert('Choisissez une salle libre.');
    if (!heureDebut || !heureFin) return alert('Heure début et heure fin sont obligatoires.');

    const key = makeKey(jour, salle, periode);
    const existing = displayCells[key] ?? [];
    const conflict = existing.find((e) => heureDebut < e.heure_fin && heureFin > e.heure_debut);
    if (conflict) {
      return alert(`${salle} est déjà occupée ce jour-là de ${conflict.heure_debut} à ${conflict.heure_fin}.`);
    }

    if (!groupId) {
      onAddStaged({
        _localId: `${Date.now()}-${Math.random()}`,
        jour_semaine: jour, salle, periode, contenu,
        heure_debut: heureDebut, heure_fin: heureFin,
      });
      setSalle(''); setContenu(''); setHeureDebut(''); setHeureFin('');
      setShowForm(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/schedules`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ group_id: groupId, jour_semaine: jour, salle, periode, contenu, heure_debut: heureDebut, heure_fin: heureFin }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'Erreur serveur');
      await res.json();
      loadSchedules();
      setSalle(''); setContenu(''); setHeureDebut(''); setHeureFin('');
      setShowForm(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };
  const handleRemove = async (entry) => {
    if (!entry?.isOwn) return;

    if (!groupId) {
      onRemoveStaged(entry.stagedLocalId);
      return;
    }
    if (!entry.id) return;
    if (!confirm('Retirer ce créneau ?')) return;
    await fetch(`${import.meta.env.VITE_API_URL}/api/schedules/${entry.id}`, { method: 'DELETE', headers: getHeaders() });
    loadSchedules();
  };

  if (loading) return <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" /></div>;
  return (
    <div className="space-y-4">
      <p className="text-[10px] text-slate-400">Cliquez une case libre de la grille pour y ajouter un créneau.</p>

      {showForm && (
        <div className="border border-[#0369A1]/30 rounded-xl p-3 space-y-2 bg-[#F0F9FF]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#0369A1] capitalize">{salle} · {jour} · {periode === 'matin' ? 'Matin' : 'Midi'}</p>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><Label text="Heure début" /><input type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} className={inp} /></div>
            <div><Label text="Heure fin" /><input type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} className={inp} /></div>
          </div>

          <button onClick={handleAdd} disabled={saving || !heureDebut || !heureFin}
            className="w-full text-xs py-1.5 rounded-lg bg-[#0F2A4A] text-white disabled:opacity-40">
            {saving ? 'Ajout...' : 'Ajouter au planning'}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr>
              <th className="border border-slate-700 px-2 py-1.5 bg-slate-900" rowSpan={2} />
              {jours.map((j) => <th key={j} colSpan={2} className="border border-slate-700 px-2 py-1.5 bg-slate-900 text-white font-semibold uppercase text-[9px] capitalize">{j}</th>)}
            </tr>
            <tr>
              {jours.map((j) => PERIODES.map((p) => <th key={`${j}-${p}`} className="border border-slate-200 px-2 py-1.5 bg-white text-slate-500">{p === 'matin' ? 'Matin' : 'Midi'}</th>))}
            </tr>
          </thead>
          <tbody>
            {salles.map((s) => (
              <tr key={s}>
                <td className="border border-slate-700 px-2 py-2 font-semibold text-white bg-slate-900 whitespace-nowrap">{s}</td>
                {jours.map((j) => PERIODES.map((p) => {
                  const entries = displayCells[makeKey(j, s, p)] ?? [];
                  const isSelected = showForm && jour === j && salle === s && periode === p;
                  const openForm = () => {
                    setJour(j); setSalle(s); setPeriode(p);
                    setHeureDebut(''); setHeureFin(''); setContenu('');
                    setShowForm(true);
                  };
                  return (
                    <td
                      key={makeKey(j, s, p)}
                      className={`border border-slate-200 p-1.5 align-top min-w-[6rem] ${isSelected ? 'bg-slate-100 ring-2 ring-inset ring-slate-400' : ''}`}
                    >
                      <div className="space-y-1">
                        {entries.map((entry, idx) => (
                          <div key={entry.id ?? entry.stagedLocalId ?? idx} className={entry.isOwn ? 'text-[#0369A1] ' : 'opacity-50'}>
                            {(entry.heure_debut || entry.heure_fin) && (
                              <p className={`text-[10px] font-medium ${entry.isOwn ? 'text-[#0369A1]' : 'text-slate-500'}`}>{entry.heure_debut?.slice(0, 5)}{entry.heure_fin ? ` → ${entry.heure_fin.slice(0, 5)}` : ''}</p>
                            )}
                            <p className={`text-xs ${entry.isOwn ? 'text-[#0369A1] font-medium' : 'text-slate-800'}`}>{entry.contenu}</p>
                            {entry.isOwn && (
                              <button onClick={() => handleRemove(entry)} className="text-[9px] text-red-400 hover:text-red-600 mt-0.5">
                                Retirer
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={openForm}
                          className="w-full flex justify-center text-slate-300 hover:text-slate-700 hover:bg-slate-100 rounded transition text-sm py-0.5"
                        >
                          +
                        </button>
                      </div>
                    </td>
                  );
                }))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  const [form, setForm] = useState({ nom: '', teacher_id: '', en_promotion: false, prix_promotion: '', date_debut: '' });
  const [periods, setPeriods] = useState([]); // [{ jours_offset, montant }]
  const [useDefaultPeriods, setUseDefaultPeriods] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [stagedStudents, setStagedStudents] = useState([]);
  const [stagedSchedules, setStagedSchedules] = useState([]);
  const [archivingGroup, setArchivingGroup] = useState(null);
  const [archiveYear, setArchiveYear] = useState('');

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups?formation_id=${formation_id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erreur serveur');
      setGroups(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/formation/${formation_id}/unassigned`, { headers: { Authorization: `Bearer ${token}` } });
      setUnassignedStudents(await res.json());
    } catch (err) { console.error('fetchUnassigned error:', err); }
  };

  const handleAssignStudent = async (inscription_id) => {
    if (!editGroup) {
      const student = unassignedStudents.find((i) => i.id === inscription_id);
      if (student) setStagedStudents((prev) => [...prev, student]);
      setUnassignedStudents((prev) => prev.filter((i) => i.id !== inscription_id));
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL}/api/inscriptions/${inscription_id}/assign-group`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ group_id: editGroup.id }),
      });
      setUnassignedStudents((prev) => prev.filter((i) => i.id !== inscription_id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUnstageStudent = (inscription_id) => {
    const student = stagedStudents.find((i) => i.id === inscription_id);
    if (student) setUnassignedStudents((prev) => [...prev, student]);
    setStagedStudents((prev) => prev.filter((i) => i.id !== inscription_id));
  };

  const fetchFormation = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/formations`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setFormation(data.find((f) => f.id === formation_id));
    } catch {}
  };

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/teachers?formation_id=${formation_id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTeachers(data);
    } catch (err) {
      console.error('fetchTeachers error:', err);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchFormation();
    fetchTeachers();
  }, [formation_id]);

  const copyFromTemplate = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/formations/${formation_id}/periods`, { headers: { Authorization: `Bearer ${token}` } });
    const template = await res.json();
    
    if (!template.length) { alert("Cette formation n'a pas d'échéancier par défaut."); return []; }
  const copied = template
    .slice()
    .sort((a, b) => Number(a.jours_offset) - Number(b.jours_offset))
    .map(t => ({ _id: crypto.randomUUID(), jours_offset: t.jours_offset, montant: t.montant }));
    setPeriods(copied);
    return copied;
  };

  const openAdd = () => {
    setEditGroup(null);
    setForm({ nom: '', teacher_id: '', en_promotion: false, prix_promotion: '', date_debut: '' });
    setPeriods([]);
    setUseDefaultPeriods(true);
    setShowModal(true);
    setStagedStudents([]);
    setStagedSchedules([]);
    fetchUnassignedStudents();
    setIsNewGroup(true);
  };

  const openEdit = (g) => {
    setEditGroup(g);
    setForm({
      nom: g.nom, teacher_id: g.teacher_id ?? '', en_promotion: g.en_promotion ?? false,
      prix_promotion: g.prix_promotion ?? '', date_debut: g.date_debut?.slice(0, 10) ?? '',
    });
    setShowModal(true);
    setStagedStudents([]);
    setStagedSchedules([]);
    fetchUnassignedStudents();
    setIsNewGroup(false);

    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL}/api/groups/${g.id}/periods`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setUseDefaultPeriods(data.use_default_periods);
      const sorted = (data.periods ?? [])
          .slice()
          .sort((a, b) => Number(a.jours_offset) - Number(b.jours_offset))
          .map(p => ({ _id: crypto.randomUUID(), jours_offset: p.jours_offset, montant: p.montant }));
        setPeriods(sorted);
      })
      .catch(() => { setUseDefaultPeriods(true); setPeriods([]); });
  };

  const addPeriod = () => setPeriods(prev => [...prev, { _id: crypto.randomUUID(), jours_offset: 0, montant: '' }]);
  const removePeriod = (id) => setPeriods(prev => prev.filter(p => p._id !== id));
const updatePeriodField = (id, field, value) => setPeriods(prev => prev.map(p => p._id === id ? { ...p, [field]: value } : p));
  const targetTotal = form.en_promotion && form.prix_promotion
    ? Number(form.prix_promotion)
    : Number(formation?.prix_etudiant ?? formation?.prix ?? 0);
  const periodsTotal = periods.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const periodsMismatch = !useDefaultPeriods && periods.length > 0 && Math.abs(periodsTotal - targetTotal) > 0.01;

 const cumulativeDates = (() => {
  if (!form.date_debut) return [];
  let current = new Date(form.date_debut);
  return periods.map((p) => {
    current = new Date(current);
    current.setDate(current.getDate() + Number(p.jours_offset || 0));
    return current.toLocaleDateString('fr-FR');
  });
})();

  const handleSave = async () => {
    if (!form.nom.trim()) return;
    if (!useDefaultPeriods && periods.length > 0 && Math.abs(periodsTotal - targetTotal) > 0.01) {
      alert(`Le total des tranches (${periodsTotal.toLocaleString('fr-FR')} DA) doit être égal au prix du groupe (${targetTotal.toLocaleString('fr-FR')} DA).`);
      return;
    }
    setSaving(true);
    try {
      const url = editGroup ? `${import.meta.env.VITE_API_URL}/api/groups/${editGroup.id}` : `${import.meta.env.VITE_API_URL}/api/groups`;
      const method = editGroup ? 'PATCH' : 'POST';
      const body = editGroup
        ? { nom: form.nom, teacher_id: form.teacher_id || null, en_promotion: form.en_promotion, prix_promotion: form.en_promotion ? form.prix_promotion || null : null, date_debut: form.date_debut || null }
        : { nom: form.nom, formation_id, teacher_id: form.teacher_id || null, en_promotion: form.en_promotion, prix_promotion: form.en_promotion ? form.prix_promotion || null : null, date_debut: form.date_debut || null };

      const token = localStorage.getItem('token');
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Erreur serveur');
      const saved = await res.json();

      // Échéancier : s'applique à la création ET à la modification.
      if (!useDefaultPeriods) {
        const periodsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${saved.id}/periods`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ periods: periods.filter(p => p.montant !== '' && p.montant != null) }),
        });
        if (!periodsRes.ok) {
          const err = await periodsRes.json().catch(() => ({}));
          throw new Error(err.error || "Erreur lors de l'enregistrement de l'échéancier.");
        }
      } else if (editGroup) {
        const periodsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${saved.id}/periods`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ periods: [] }),
        });
        if (!periodsRes.ok) {
          const err = await periodsRes.json().catch(() => ({}));
          throw new Error(err.error || "Erreur lors de la réinitialisation de l'échéancier.");
        }
      }

      if (isNewGroup) {
        for (const slot of stagedSchedules) {
          const { _localId, ...cleanSlot } = slot;
          await fetch(`${import.meta.env.VITE_API_URL}/api/schedules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...cleanSlot, group_id: saved.id }),
          });
        }
        for (const student of stagedStudents) {
          await fetch(`${import.meta.env.VITE_API_URL}/api/inscriptions/${student.id}/assign-group`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ group_id: saved.id }),
          });
        }
        setStagedSchedules([]);
        setStagedStudents([]);
      }

      fetchGroups();
      setShowModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (group) => {
    if (group.nb_etudiants > 0) {
      alert(`Ce groupe a ${group.nb_etudiants} étudiant(s) inscrit(s). Retirez-les ou réaffectez-les à un autre groupe avant de le supprimer.`);
      return;
    }
    if (!confirm('Supprimer ce groupe ?')) return;
    const token = localStorage.getItem('token');
    await fetch(`${import.meta.env.VITE_API_URL}/api/groups/${group.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchGroups();
  };

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
      <div className="flex items-center gap-1.5 text-xs mb-3">
        <button onClick={() => navigate('/admin/formations')} className="text-slate-400 hover:text-[#0369A1] transition">Formations</button>
        <ChevronRight size={12} className="text-slate-300" />
        <span className="text-[#0369A1] font-medium">{formation?.nom ?? 'Groupes'}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/formations')} className="w-8 h-8 flex items-center justify-center rounded-full border border-[#F1F5F9] hover:bg-[#DCEBFA] transition">
            <ArrowLeft size={16} className="text-[#0369A1]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Groupes</h1>
            <p className="text-slate-400 text-xs mt-0.5">{formation?.nom ?? `Formation #${formation_id}`} — {groups.length} groupe(s)</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-lg text-xs font-medium shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all">
          <Plus size={18} /> Ajouter un groupe
        </button>
      </div>

      {loading && <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" /></div>}
      {error && <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-lg px-4 py-3">Erreur : {error}</p>}

      {!loading && !error && (
        <>
          {groups.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucun groupe pour cette formation.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {groups.map((g) => (
                <div key={g.id} className="bg-white rounded-2xl border border-[#F1F5F9] p-5 shadow-sm hover:shadow-md hover:border-[#DCEBFA] transition">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center"><Users size={20} className="text-emerald-600" /></div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${g.statut === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {g.statut === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <h2 className="text-slate-800 font-semibold text-base mb-1">{g.nom}</h2>
                  <p className="text-slate-400 text-xs mb-1">{g.teacher?.user ? `${g.teacher.user.nom} ${g.teacher.user.prenom}` : 'Aucun professeur assigné'}</p>
                  {g.en_promotion && g.prix_promotion && (
                    <p className="text-xs font-medium text-amber-700 bg-amber-50 inline-block px-2 py-0.5 rounded-full mb-3">Promo: {Number(g.prix_promotion).toLocaleString()} DA</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-5">
                    <span className="flex items-center gap-1"><Users size={13} className="text-[#0369A1]" /> {g.nb_etudiants} étudiant(s)</span>
                    {g.created_at && <span>Créé le {new Date(g.created_at).toLocaleDateString('fr-FR')}</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => navigate(`/admin/formations/${formation_id}/groups/${g.id}`)} className="flex items-center gap-1 text-xs font-medium text-[#0369A1] bg-[#DCEBFA] border border-[#0369A1]/20 px-3 py-1.5 rounded-full hover:bg-[#c9e2f7] hover:shadow-sm active:scale-95 transition">
                      Voir détails <ChevronRight size={13} />
                    </button>
                    <button onClick={() => openEdit(g)} className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-700/20 px-3 py-1.5 rounded-full hover:bg-amber-100 hover:shadow-sm active:scale-95 transition">
                      <Pencil size={12} /> Modifier
                    </button>
                    <button onClick={() => handleDelete(g)} className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 border border-red-500/20 px-3 py-1.5 rounded-full hover:bg-red-100 hover:shadow-sm active:scale-95 transition">
                      <Trash2 size={12} /> Supprimer
                    </button>
                    <button onClick={() => setArchivingGroup(g.id)} className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-500/20 px-3 py-1.5 rounded-full hover:bg-slate-200 hover:shadow-sm active:scale-95 transition">
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
                <select value={archiveYear} onChange={e => setArchiveYear(e.target.value)} className="w-full border border-[#F1F5F9] rounded-lg px-3 py-2 text-sm">
                  <option value="">— Année scolaire (optionnel) —</option>
                  {getAnneesScolaires().map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setArchivingGroup(null); setArchiveYear(''); }} className="text-xs px-3 py-1.5 rounded-lg border border-[#F1F5F9] text-slate-500 hover:bg-slate-50">Annuler</button>
                  <button onClick={confirmArchiveGroup} className="text-xs px-3 py-1.5 rounded-lg bg-slate-500 text-white hover:bg-slate-600">Archiver</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] sticky top-0 bg-white z-10">
              <h2 className="text-sm font-bold text-[#1E293B] flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-[#DCEBFA] text-[#0369A1] flex items-center justify-center"><Users size={14} /></span>
                {isNewGroup ? 'Ajouter un groupe' : 'Modifier le groupe'}
              </h2>
              <button onClick={() => setShowModal(false)}><X size={16} className="text-slate-300 hover:text-slate-600" /></button>
            </div>

            <div className="p-5 space-y-4">
              <Section>
                <div className="col-span-2">
                  <Label icon={Users} text="Nom du groupe *" />
                  <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex: Groupe A" className={inp} />
                </div>

                <div className="col-span-2">
                  <Label icon={GraduationCap} text="Professeur" />
                  <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className={inp}>
                    <option value="">— Aucun professeur —</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.nom} {t.prenom}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <Toggle
                    checked={form.en_promotion}
                    onChange={(val) => setForm({ ...form, en_promotion: val, prix_promotion: '' })}
                    label="En promotion (prix différent pour ce groupe)"
                  />
                </div>
                {form.en_promotion && (
                  <div className="col-span-2">
                    <Label icon={Users} text="Prix pour ce groupe (DA)" />
                    <input type="number" value={form.prix_promotion} onChange={(e) => setForm({ ...form, prix_promotion: e.target.value })} className={inp} />
                  </div>
                )}

                <div className="col-span-2">
                  <Label text="Date de début" />
                  <input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} className={inp} />
                </div>
              </Section>

              <div className="border-t border-[#F1F5F9] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-600">Échéancier de paiement</p>
                  <span className="text-[11px] text-slate-400">Prix du groupe : {targetTotal.toLocaleString('fr-FR')} DA</span>
                </div>

                <Toggle
                  checked={useDefaultPeriods}
                  onChange={(val) => {
                    setUseDefaultPeriods(val);
                    if (!val && periods.length === 0) copyFromTemplate();
                  }}
                  label="Utiliser l'échéancier par défaut de la formation"
                />

                {!useDefaultPeriods && (
  <div className="mt-2 space-y-1.5">
    <p className="text-[10px] text-slate-400 bg-[#F0F9FF] border border-[#DCEBFA] rounded-lg px-2.5 py-1.5">
      💡 Le nombre de jours de chaque tranche se compte depuis la tranche précédente (P1 se compte depuis la date de début). Ex : P1 = 0 (immédiat), P2 = 30 (30 jours après P1).
    </p>
    {periods.length === 0 && (
      <p className="text-[11px] text-slate-400">Aucune période — ajoutez-en une ou copiez le modèle.</p>
    )}
              {periods.map((p, idx) => (
  <div key={p._id} className="flex items-center gap-2 bg-[#F8FAFC] rounded-lg px-2.5 py-1.5">
    <span className="text-[10px] text-slate-400 w-8 flex-shrink-0">P{idx + 1}</span>
    <input
      type="number"
      value={p.jours_offset}
      onChange={(e) => updatePeriodField(p._id, 'jours_offset', e.target.value)}
      placeholder={idx === 0 ? 'Jours après le début (0 = immédiat)' : 'Jours après P' + idx}
      className="flex-1 bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
    />
    <input type="number" value={p.montant} onChange={(e) => updatePeriodField(p._id, 'montant', e.target.value)} placeholder="Montant"
      className="flex-1 bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40" />
    <span className="text-[10px] text-slate-400 w-16 flex-shrink-0 text-right">{cumulativeDates[idx] ?? '—'}</span>
    <button type="button" onClick={() => removePeriod(p._id)} className="text-slate-300 hover:text-red-400 flex-shrink-0"><X size={13} /></button>
  </div>
))}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex gap-1.5">
                        <button type="button" onClick={addPeriod} className="text-[11px] font-medium text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1 rounded-full hover:bg-[#c9e2f7] transition">+ Période</button>
                       </div>
                      <span className={`text-[11px] font-medium ${periodsMismatch ? 'text-red-500' : 'text-emerald-600'}`}>
                        Total : {periodsTotal.toLocaleString('fr-FR')} / {targetTotal.toLocaleString('fr-FR')} DA
                      </span>
                    </div>
                    {periodsMismatch && (
                      <p className="text-[10px] text-red-500">Le total des tranches doit être exactement égal au prix du groupe.</p>
                    )}
                  </div>
                )}
              </div>

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
                            <td className="px-3 py-2 font-medium text-slate-800">{i.etudiant?.nom} {i.etudiant?.prenom}</td>
                            <td className="px-3 py-2 text-slate-500">{i.etudiant?.telephone ?? '—'}</td>
                            <td className="px-3 py-2 text-right">
                              <button onClick={() => handleAssignStudent(i.id)} className="text-[11px] font-medium text-[#0369A1] bg-[#DCEBFA] px-2.5 py-1 rounded-full hover:bg-[#c9e2f7] transition">Affecter</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {stagedStudents.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">À affecter dès l'enregistrement</p>
                    {stagedStudents.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-700 rounded-lg px-2.5 py-1.5">
                        <span>{s.etudiant?.nom} {s.etudiant?.prenom}</span>
                        <button onClick={() => handleUnstageStudent(s.id)} className="text-red-400 hover:text-red-600 text-[11px]">Retirer</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label icon={Users} text="Emploi du temps" />
                <div className="mt-1">
                  <GroupScheduleTable
                    groupId={editGroup?.id ?? null}
                    formation_id={formation_id}
                    staged={stagedSchedules}
                    onAddStaged={(slot) => setStagedSchedules((prev) => [...prev, slot])}
                    onRemoveStaged={(id) => setStagedSchedules((prev) => prev.filter((s) => s._localId !== id))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowModal(false)} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">
                  {isNewGroup ? 'Annuler' : 'Fermer'}
                </button>
                <button onClick={handleSave} disabled={saving || !form.nom.trim() || periodsMismatch} className="text-xs px-3 py-1.5 rounded-lg bg-[#0F2A4A] text-white hover:bg-[#16385f] disabled:opacity-40 font-medium">
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