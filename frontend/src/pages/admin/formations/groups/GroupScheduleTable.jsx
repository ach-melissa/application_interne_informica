import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const inp = 'w-full bg-[#F8FAFC] border border-transparent rounded-lg px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors';
const Label = ({ icon: Icon, text }) => (
  <p className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">
    {Icon && <Icon size={10} className="text-[#0369A1]" />}{text}
  </p>
);

const PERIODES = ['matin', 'midi'];
const makeKey = (j, s, p) => `${j}|${s}|${p}`;
const getHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function GroupScheduleTable({ groupId, staged, onAddStaged, onRemoveStaged }) {
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

  const loadSchedules = () => {
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL}/api/schedules`, { headers: getHeaders() })
      .then(r => r.json())
      .then((data) => {
        const map = {};
        data.forEach((row) => {
          const k = makeKey(row.jour_semaine, row.salle, row.periode);
          (map[k] ??= []).push({
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
      .then(r => r.json()).then((data) => setSalles(data.map((s) => s.nom)));
    fetch(`${import.meta.env.VITE_API_URL}/api/schedules/jours`, { headers: getHeaders() })
      .then(r => r.json()).then(setJours);
  }, []);

  const displayCells = {};
  Object.keys(cells).forEach((k) => { displayCells[k] = [...cells[k]]; });
  if (!groupId) {
    staged.forEach((slot) => {
      const k = makeKey(slot.jour_semaine, slot.salle, slot.periode);
      (displayCells[k] ??= []).push({ ...slot, isOwn: true, stagedLocalId: slot._localId });
    });
  }

  const resetForm = () => { setSalle(''); setContenu(''); setHeureDebut(''); setHeureFin(''); setShowForm(false); };

  const handleAdd = async () => {
    if (!salle) return alert('Choisissez une salle libre.');
    if (!heureDebut || !heureFin) return alert('Heure début et heure fin sont obligatoires.');

    const existing = displayCells[makeKey(jour, salle, periode)] ?? [];
    const conflict = existing.find((e) => heureDebut < e.heure_fin && heureFin > e.heure_debut);
    if (conflict) return alert(`${salle} est déjà occupée ce jour-là de ${conflict.heure_debut} à ${conflict.heure_fin}.`);

    if (!groupId) {
      onAddStaged({ _localId: `${Date.now()}-${Math.random()}`, jour_semaine: jour, salle, periode, contenu, heure_debut: heureDebut, heure_fin: heureFin });
      return resetForm();
    }

    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/schedules`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ group_id: groupId, jour_semaine: jour, salle, periode, contenu, heure_debut: heureDebut, heure_fin: heureFin }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'Erreur serveur');
      loadSchedules();
      resetForm();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (entry) => {
    if (!entry?.isOwn) return;
    if (!groupId) return onRemoveStaged(entry.stagedLocalId);
    if (!entry.id || !confirm('Retirer ce créneau ?')) return;
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
          <button onClick={handleAdd} disabled={saving || !heureDebut || !heureFin} className="w-full text-xs py-1.5 rounded-lg bg-[#0F2A4A] text-white disabled:opacity-40">
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
                  const openForm = () => { setJour(j); setSalle(s); setPeriode(p); setHeureDebut(''); setHeureFin(''); setContenu(''); setShowForm(true); };
                  return (
                    <td key={makeKey(j, s, p)} className={`border border-slate-200 p-1.5 align-top min-w-[6rem] ${isSelected ? 'bg-slate-100 ring-2 ring-inset ring-slate-400' : ''}`}>
                      <div className="space-y-1">
                        {entries.map((entry, idx) => (
                          <div key={entry.id ?? entry.stagedLocalId ?? idx} className={entry.isOwn ? 'text-[#0369A1] ' : 'opacity-50'}>
                            {(entry.heure_debut || entry.heure_fin) && (
                              <p className={`text-[10px] font-medium ${entry.isOwn ? 'text-[#0369A1]' : 'text-slate-500'}`}>{entry.heure_debut?.slice(0, 5)}{entry.heure_fin ? ` → ${entry.heure_fin.slice(0, 5)}` : ''}</p>
                            )}
                            <p className={`text-xs ${entry.isOwn ? 'text-[#0369A1] font-medium' : 'text-slate-800'}`}>{entry.contenu}</p>
                            {entry.isOwn && <button onClick={() => handleRemove(entry)} className="text-[9px] text-red-400 hover:text-red-600 mt-0.5">Retirer</button>}
                          </div>
                        ))}
                        <button type="button" onClick={openForm} className="w-full flex justify-center text-slate-300 hover:text-slate-700 hover:bg-slate-100 rounded transition text-sm py-0.5">+</button>
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
}