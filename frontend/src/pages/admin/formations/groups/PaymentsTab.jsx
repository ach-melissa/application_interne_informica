import { useState, useEffect } from 'react';
import { Image, Search, X, CheckCircle2, CreditCard } from 'lucide-react';

const PaymentsTab = ({ groupId, onSelectStudent }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bonsModal, setBonsModal] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/group/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur de chargement');
        setPayments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [groupId]);

  const filtered = payments.filter(p => {
    if (search && !p.nom.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus === 'paid' && p.remaining > 0) return false;
    if (filterStatus === 'pending' && p.remaining <= 0) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
        Erreur : {error}
      </p>
    );
  }

  return (
    <>
      {/* Filter bar — matches Students */}
      <div className="bg-white border border-blue-100 rounded-xl px-3 py-2.5 mb-4 flex flex-wrap gap-2 items-center shadow-sm">
        <div className="relative min-w-[160px] flex-1 max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
          <input
            placeholder="Rechercher un étudiant…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-blue-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
        </div>

        <div className="w-px h-5 bg-blue-100" />

        <div className="relative flex items-center">
          <CheckCircle2 size={13} className="absolute left-2 text-blue-400 pointer-events-none" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className={`text-xs border rounded-lg py-1.5 pl-7 pr-6 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer transition
              ${filterStatus ? 'border-blue-400 text-blue-700 font-medium' : 'border-blue-200 text-slate-500'}`}
          >
            <option value="">Statut paiement</option>
            <option value="paid">Soldé</option>
            <option value="pending">En attente</option>
          </select>
          {filterStatus && (
            <button onClick={() => setFilterStatus('')} className="absolute right-1.5 text-slate-300 hover:text-red-400 transition">
              <X size={10} />
            </button>
          )}
        </div>

        {(search || filterStatus) && (
          <button
            onClick={() => { setSearch(''); setFilterStatus(''); }}
            className="ml-auto flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50"
          >
            <X size={11} /> Tout effacer
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-blue-50 border-b border-blue-100">
              <tr>
                {['Étudiant', 'Total', 'Payé', 'Restant', 'Bons'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-blue-500 font-semibold text-[10px] tracking-wide uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    Aucun étudiant trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const tranches = p.tranches || [];
                  const bonsCount = tranches.filter(t => t.bon_photo).length;
                  const totalTranches = tranches.length;

                  return (
                    <tr
                      key={p.studentId}
                      onClick={() => onSelectStudent(p)}
                      className="hover:bg-blue-50/40 transition cursor-pointer"
                    >
                      <td className="px-3 py-2 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">
                            {(p.nom?.[0] ?? '?').toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-700 truncate">{p.nom}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.total.toLocaleString('fr-FR')} DA</td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{p.paid.toLocaleString('fr-FR')} DA</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          p.remaining <= 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {p.remaining.toLocaleString('fr-FR')} DA
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {totalTranches === 0 ? (
                          <span className="text-xs text-slate-300">—</span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setBonsModal({ nom: p.nom, bons: tranches }); }}
                            className="flex items-center gap-1"
                          >
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 transition ${
                              bonsCount === totalTranches
                                ? 'bg-green-100 text-green-700'
                                : bonsCount === 0
                                  ? 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}>
                              <Image size={11} />
                              {bonsCount}/{totalTranches}
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bons modal */}
      {bonsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setBonsModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">{bonsModal.nom}</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Bons de paiement</p>
              </div>
              <button onClick={() => setBonsModal(null)} className="text-slate-300 hover:text-slate-600 transition">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {bonsModal.bons.map((t, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-blue-50/40 rounded-xl border border-blue-100 px-3 py-2">
                  <span className="text-[11px] bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                    T{t.tranche}
                  </span>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {t.date_paiement ? new Date(t.date_paiement).toLocaleDateString('fr-FR') : '—'}
                  </span>
                  {t.bon_photo ? (
                    <button onClick={() => setLightboxUrl(t.bon_photo)} className="ml-auto flex-shrink-0 group relative">
                      <img
                        src={t.bon_photo}
                        alt={`bon T${t.tranche}`}
                        className="w-10 h-10 rounded-lg object-cover border border-blue-100 group-hover:opacity-80 transition"
                      />
                    </button>
                  ) : (
                    <span className="ml-auto text-xs text-slate-300 flex items-center gap-1 flex-shrink-0">
                      <Image size={12} /> Non fourni
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg text-slate-700 hover:text-red-400 transition z-10"
            >
              <X size={16} />
            </button>
            <img src={lightboxUrl} alt="Bon de paiement" className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]" />
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentsTab;