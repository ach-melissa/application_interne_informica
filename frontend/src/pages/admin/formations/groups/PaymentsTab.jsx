import { useState, useEffect } from 'react';
import { Image, Search, X, CheckCircle2, User, Wallet, PiggyBank, FileText, AlertCircle, Users, ChevronDown, Phone } from 'lucide-react';
const API = import.meta.env.VITE_API_URL;

// Same pill-style filter used in Formations.jsx / GroupDetail.jsx
const FilterSelect = ({ icon: Icon, label, value, onChange, opts, display }) => (
  <div className="relative flex items-center">
    {Icon && <Icon size={13} className="absolute left-2 text-[#0369A1] pointer-events-none" />}
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      className={`appearance-none text-xs rounded-full py-1.5 pr-7 pl-7 bg-white border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 cursor-pointer transition ${value ? 'text-[#0369A1] font-medium' : 'text-slate-500'}`}>
      <option value="">{label}</option>
      {opts.map(o => <option key={o.value ?? o} value={o.value ?? o}>{display ? display(o.value ?? o) : (o.label ?? o)}</option>)}
    </select>
    {value ? <button onClick={() => onChange('')} className="absolute right-2 text-slate-300 hover:text-red-400"><X size={11} /></button>
      : <ChevronDown size={11} className="absolute right-2 text-slate-400 pointer-events-none" />}
  </div>
);

const PaymentsTab = ({ groupId, onSelectStudent, refreshKey }) => {
  const [payments, setPayments] = useState([]);
  const [promoDraft, setPromoDraft] = useState({});   // { [inscriptionId]: prixString while typing }
  const [promoModal, setPromoModal] = useState(null); // the full payment object `p`, or null
  const [promoPrice, setPromoPrice] = useState('');
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
  }, [groupId, refreshKey]);

  const savePromo = async (p, enPromotion, prix) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/etudiants/${p.inscriptionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ en_promotion: enPromotion, prix_promotion: enPromotion ? prix : null }),
      });
      if (!res.ok) throw new Error('Erreur mise à jour promo');
      const newTotal = enPromotion ? Number(prix) : p.total;
      setPayments(prev => prev.map(x => x.studentId === p.studentId
        ? { ...x, enPromotion, prixPromotion: enPromotion ? Number(prix) : null,
            total: newTotal, remaining: newTotal - x.paid }
        : x));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTogglePromo = (p) => {
    if (p.enPromotion) {
      savePromo(p, false, null);
    } else {
      setPromoPrice('');
      setPromoModal(p);
    }
  };

  const handleConfirmPromo = () => {
    if (!promoPrice || Number(promoPrice) <= 0) {
      alert('Le prix de la promotion est obligatoire.');
      return;
    }
    savePromo(promoModal, true, promoPrice);
    setPromoModal(null);
  };

  const handleCancelPromo = (p) => {
    setPromoDraft(prev => { const n = { ...prev }; delete n[p.inscriptionId]; return n; });
    setPromoEditing(null);
  };

  const filtered = payments.filter(p => {
    if (search && !p.nom.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus === 'paid' && p.remaining > 0) return false;
    if (filterStatus === 'pending' && p.remaining <= 0) return false;
    return true;
  });

  const stats = {
    total: payments.length,
    paid: payments.filter(p => p.remaining <= 0).length,
    late: payments.filter(p => p.isOverdue).length,
    pending: payments.filter(p => p.remaining > 0 && !p.isOverdue).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-4 border-[#0369A1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
        Erreur : {error}
      </p>
    );
  }

  return (
    <>
    {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-[#F1F5F9] px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-[#DCEBFA] flex items-center justify-center flex-shrink-0">
            <Users size={16} className="text-[#0369A1]" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 leading-none">{stats.total}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">Étudiants</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#F1F5F9] px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600 leading-none">{stats.paid}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">Soldés</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#F1F5F9] px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertCircle size={16} className="text-red-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-red-500 leading-none">{stats.late}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">En retard</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#F1F5F9] px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Wallet size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-amber-600 leading-none">{stats.pending}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">En attente</p>
          </div>
        </div>
      </div>
      {/* Filter bar — matches Students */}
      <div className=" px-3 py-2.5 mb-4 flex flex-wrap gap-2 items-center ">
        <div className="relative min-w-[160px] flex-1 max-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0369A1] pointer-events-none" />
          <input
            placeholder="Rechercher un étudiant…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-[#E2E8F0] rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 bg-white"
          />
        </div>

        <div className="w-px h-5 bg-[#F1F5F9]" />

        <FilterSelect icon={CheckCircle2} label="Statut paiement" value={filterStatus} onChange={setFilterStatus}
          opts={[{ value: 'paid', label: 'Soldé' }, { value: 'pending', label: 'En attente' }]} />

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
      <div className="bg-white rounded-md shadow-[0_2px_10px_rgba(15,42,74,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#0F2A4A]">
             <tr>
                {[
                  { label: 'Étudiant', Icon: User },
                  { label: 'Téléphone', Icon: Phone },
                  { label: 'Scolarité', Icon: CheckCircle2 },
                  { label: 'Promo',    Icon: Wallet },
                  { label: 'Total',    Icon: Wallet },
                  { label: 'Payé',     Icon: PiggyBank },
                  { label: 'Restant',  Icon: CheckCircle2 },
                  { label: 'Bons',     Icon: FileText },
                ].map(({ label, Icon }, i) => (
                  <th key={label} className={`text-left px-3 py-2.5 text-white font-semibold text-[10px] tracking-wide uppercase border-b border-[#0F2A4A] whitespace-nowrap ${i === 0 ? 'border-l border-[#0F2A4A]' : ''}`}>
                    <div className="flex items-center gap-1">
                      <Icon size={11} className="text-white/70 flex-shrink-0" />
                      <span>{label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 bg-white">
                    Aucun étudiant trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => {
                  const tranches = p.tranches || [];
                  const bonsCount = tranches.filter(t => t.bon_photo).length;
                  const totalTranches = tranches.length;

                  return (
<tr
  key={p.studentId}
  onClick={() => onSelectStudent(p)}
  className={`hover:opacity-80 transition cursor-pointer ${
    p.isOverdue
      ? 'bg-red-50'
      : p.remaining <= 0
        ? 'bg-emerald-50'
        : p.remaining >= p.total
          ? 'bg-red-50'
          : 'bg-amber-50'
  }`}
>
                   <td className="px-3 py-2 overflow-hidden border-b border-l border-[#E2E8F0]">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-[#DCEBFA] flex items-center justify-center text-[10px] font-bold text-[#0369A1] flex-shrink-0">
                            {(p.nom?.[0] ?? '?').toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-700 truncate">{p.nom}</span>
                          {p.isOverdue && (
                            <span className="text-[10px] font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                              En retard
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]" onClick={e => e.stopPropagation()}>
                        {p.telephone ? (
                          <a href={`tel:${p.telephone}`} className="hover:text-[#0369A1] hover:underline">{p.telephone}</a>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap border-b border-[#E2E8F0]">
  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
    p.statutScolarite === 'abandonne' ? 'bg-red-50 text-red-500' :
    p.statutScolarite === 'termine' ? 'bg-slate-100 text-slate-500' :
    'bg-blue-50 text-blue-600'
  }`}>
    {p.statutScolarite === 'abandonne' ? 'Abandonné' : p.statutScolarite === 'termine' ? 'Terminé' : 'En cours'}
  </span>
</td>
<td className="px-3 py-2 whitespace-nowrap border-b border-[#E2E8F0]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePromo(p)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                              p.enPromotion ? 'bg-[#0369A1]' : 'bg-slate-200'
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              p.enPromotion ? 'translate-x-5' : 'translate-x-1'
                            }`} />
                          </button>
                          {p.enPromotion && (
                            <span className="text-[11px] text-[#0369A1] font-medium">{p.prixPromotion?.toLocaleString('fr-FR')} DA</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">{p.total.toLocaleString('fr-FR')} DA</td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap border-b border-[#E2E8F0]">{p.paid.toLocaleString('fr-FR')} DA</td>
<td className="px-3 py-2 whitespace-nowrap border-b border-[#E2E8F0]">
  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
    p.remaining <= 0
      ? 'bg-emerald-50 text-emerald-700'
      : p.remaining >= p.total
        ? 'bg-red-50 text-red-600'
        : 'bg-amber-50 text-amber-700'
  }`}>
    {p.remaining.toLocaleString('fr-FR')} DA
  </span>
</td>
                      <td className="px-3 py-2 whitespace-nowrap border-b border-[#E2E8F0]">
                        {totalTranches === 0 ? (
                          <span className="text-xs text-slate-300">—</span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setBonsModal({ nom: p.nom, bons: tranches }); }}
                            className="flex items-center gap-1"
                          >
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 transition ${
                              bonsCount === totalTranches
                                ? 'bg-emerald-50 text-emerald-700'
                                : bonsCount === 0
                                  ? 'bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-700'
                                  : 'bg-amber-50 text-amber-700'
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
                <div key={idx} className="flex items-center gap-3 bg-[#DCEBFA]/40 rounded-xl border border-[#F1F5F9] px-3 py-2">
                  <span className="text-[11px] bg-[#DCEBFA] text-[#0369A1] font-medium px-2 py-0.5 rounded-full flex-shrink-0">
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
                        className="w-10 h-10 rounded-lg object-cover border border-[#DCEBFA] group-hover:opacity-80 transition"
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

     {/* Promo price modal */}
      {promoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setPromoModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xs mx-4 p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-semibold text-slate-800 mb-1">Activer la promo</h2>
            <p className="text-xs text-slate-400 mb-4">{promoModal.nom}</p>

            <label className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 block">Prix promotionnel (DA) *</label>
            <input
              type="number"
              autoFocus
              value={promoPrice}
              onChange={e => setPromoPrice(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirmPromo()}
              placeholder="Ex: 8000"
              className="w-full bg-[#F8FAFC] border border-transparent rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0369A1]/40 focus:bg-white focus:border-[#DCEBFA] transition-colors mb-4"
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setPromoModal(null)} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-[#F1F5F9]">
                Annuler
              </button>
              <button onClick={handleConfirmPromo} className="text-xs px-3 py-1.5 rounded-lg bg-[#0F2A4A] text-white hover:bg-[#16385f] font-medium">
                Confirmer
              </button>
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