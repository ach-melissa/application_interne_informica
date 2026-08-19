import { useState, useEffect, useCallback } from 'react';
import { Plus, Tag, CheckCircle2, Search } from 'lucide-react';
import AjouterValeurModal from './AjouterValeurModal';
import ModifierValeurModal from './ModifierValeurModal';

const API = import.meta.env.VITE_API_URL;

const ParametreValeurs = ({ categorie }) => {
  const [valeurs, setValeurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const fetchValeurs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/api/parametres?categorie=${categorie}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (res.ok) setValeurs(await res.json());
    setLoading(false);
  }, [categorie]);

  useEffect(() => { fetchValeurs(); }, [fetchValeurs]);

  const filteredValeurs = valeurs.filter(v =>
    v.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] gap-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 shrink-0">
          <Tag size={14} className="text-[#0369A1]" />{filteredValeurs.length} valeur(s)
        </p>

        <div className="relative flex-1 max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40"
          />
        </div>

        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-[#0F2A4A] text-white px-3.5 py-2 rounded-md text-xs font-medium
            shadow-[0_3px_0_#0A1E36] hover:shadow-[0_2px_0_#0A1E36] hover:translate-y-[1px] active:shadow-none active:translate-y-[3px] transition-all shrink-0">
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredValeurs.length === 0 ? (
        <p className="text-center py-10 text-slate-400 text-sm">
          {search ? 'Aucun résultat trouvé.' : "Aucune valeur pour l'instant."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table style={{ tableLayout: 'fixed', width: '100%' }} className="text-xs">
            <colgroup>
              <col />
              <col style={{ width: '140px' }} />
            </colgroup>
            <thead className="bg-[#0F2A4A]">
              <tr>
                <th className="text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-l border-[#0F2A4A]">
                  <span className="flex items-center gap-1.5"><Tag size={12} className="text-white/70" />Libellé</span>
                </th>
                <th className="text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A]">
                  <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-white/70" />Statut</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredValeurs.map((v, idx) => (
                <tr key={v.id} onClick={() => setSelected(v)}
                  className={`hover:bg-slate-50 transition cursor-pointer ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                  <td className="px-3 py-2 border-b border-l border-slate-100">
                    <span className={`font-medium ${!v.actif ? 'text-slate-400' : 'text-slate-700'}`}>{v.label}</span>
                  </td>
                  <td className="px-3 py-2 border-b border-slate-100">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shadow-sm ${v.actif ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500'}`}>
                      {v.actif ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AjouterValeurModal categorie={categorie} valeurs={valeurs} onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); fetchValeurs(); }} />
      )}
      {selected && (
        <ModifierValeurModal valeur={selected} valeurs={valeurs} onClose={() => setSelected(null)} onSuccess={() => { setSelected(null); fetchValeurs(); }} />
      )}
    </div>
  );
};

export default ParametreValeurs;