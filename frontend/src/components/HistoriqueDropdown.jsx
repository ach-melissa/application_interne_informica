import { useState, useRef, useEffect } from 'react';
import { History, Clock } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const ACTION_META = {
  creation:     { label: 'Ajout', cls: 'bg-emerald-50 text-emerald-600' },
  modification: { label: 'Modification', cls: 'bg-amber-50 text-amber-700' },
  suppression:  { label: 'Suppression', cls: 'bg-red-50 text-red-500' },
};
const HistoriqueDropdown = ({ scopeLabel }) => {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/historique/unread`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setHasUnread(d.hasUnread))
      .catch(() => {});
  }, []);

  const fetchHistorique = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/historique`, { headers: authHeaders() });
      if (res.ok) setEntries(await res.json());
    } catch {
      // ignore — dropdown just shows empty state
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      if (!loaded) fetchHistorique();
      if (hasUnread) {
        setHasUnread(false);
        fetch(`${API}/api/historique/seen`, { method: 'PATCH', headers: authHeaders() }).catch(() => {});
      }
    }
  };

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggleOpen} title="Historique"
        className="relative w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] transition">
        <History size={16} className="text-[#0369A1]" />
        {hasUnread && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>

      {open && (
 <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 w-auto sm:w-96 bg-white border border-[#F1F5F9] rounded-2xl shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3.5 border-b border-[#F1F5F9] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#DCEBFA] flex items-center justify-center flex-shrink-0">
              <Clock size={14} className="text-[#0369A1]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Historique</p>
              <p className="text-[11px] text-slate-400">{scopeLabel}</p>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-slate-400 text-center py-8">Chargement...</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Aucune activité pour le moment</p>
            ) : (
              entries.map((h) => (
                <div key={h.id} className="px-4 py-3 border-b border-[#F1F5F9] hover:bg-slate-50/60 transition">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-700 truncate">{h.utilisateur_nom}</span>
                    {ACTION_META[h.action] && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${ACTION_META[h.action].cls}`}>
                        {ACTION_META[h.action].label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{h.description}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatDate(h.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoriqueDropdown;