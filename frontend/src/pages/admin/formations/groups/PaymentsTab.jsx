import { useState, useEffect } from 'react';
import { Image } from 'lucide-react';

const PaymentsTab = ({ groupId, onSelectStudent }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bonsModal, setBonsModal] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null); // { nom, bons: [{tranche, bon_photo, date}] }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
        Erreur : {error}
      </p>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            <tr>
              <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Étudiant</th>
              <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Total</th>
              <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Payé</th>
              <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Restant</th>
              <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Bons</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-[#94A3B8]">
                  Aucun étudiant dans ce groupe.
                </td>
              </tr>
            ) : (
              payments.map((p) => {
                // p.tranches = [{tranche, bon_photo, date_paiement}] — sent by backend
                const tranches = p.tranches || [];
                const bonsCount = tranches.filter(t => t.bon_photo).length;
                const totalTranches = tranches.length;

                return (
                  <tr
                    key={p.studentId}
                    onClick={() => onSelectStudent(p)}
                    className="hover:bg-[#F8FAFC] transition cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-[#1E293B] whitespace-nowrap">{p.nom}</td>
                    <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{p.total.toLocaleString('fr-FR')} DA</td>
                    <td className="px-4 py-3 text-[#64748B] whitespace-nowrap">{p.paid.toLocaleString('fr-FR')} DA</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        p.remaining <= 0 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                      }`}>
                        {p.remaining.toLocaleString('fr-FR')} DA
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {totalTranches === 0 ? (
                        <span className="text-xs text-[#CBD5E1]">—</span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBonsModal({ nom: p.nom, bons: tranches });
                          }}
                          className="flex items-center gap-1.5 group"
                        >
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 transition ${
                            bonsCount === totalTranches
                              ? 'bg-green-100 text-green-600'
                              : bonsCount === 0
                                ? 'bg-[#F1F5F9] text-[#94A3B8] group-hover:bg-[#f1ede6] group-hover:text-[#b8995a]'
                                : 'bg-amber-50 text-[#b8995a]'
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

      {/* Bons viewer modal */}
      {bonsModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setBonsModal(null)}
        >
          <div
            className="bg-[#faf9f7] rounded-2xl w-full max-w-sm p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[#1E293B]">{bonsModal.nom}</h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">Bons de paiement</p>
              </div>
              <button onClick={() => setBonsModal(null)} className="text-[#94A3B8] hover:text-[#1E293B] transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {bonsModal.bons.map((t, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white rounded-xl border border-[#E2E8F0] px-3 py-2">
                  <span className="text-xs bg-[#f1ede6] text-[#b8995a] font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                    T{t.tranche}
                  </span>
                  <span className="text-xs text-[#94A3B8] flex-shrink-0">
                    {t.date_paiement ? new Date(t.date_paiement).toLocaleDateString('fr-FR') : '—'}
                  </span>
                  {t.bon_photo ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setLightboxUrl(t.bon_photo); }}
                      className="ml-auto flex-shrink-0 group relative"
                    >
                      <img
                        src={t.bon_photo}
                        alt={`bon T${t.tranche}`}
                        className="w-10 h-10 rounded-lg object-cover border border-[#E2E8F0] group-hover:opacity-80 transition"
                      />
                    </button>
                  ) : (
                    <span className="ml-auto text-xs text-[#CBD5E1] flex items-center gap-1 flex-shrink-0">
                      <Image size={12} />
                      Non fourni
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
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg text-[#1E293B] hover:text-red-400 transition z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <img
              src={lightboxUrl}
              alt="Bon de paiement"
              className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentsTab;