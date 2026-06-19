import { useState, useEffect } from 'react';

const PaymentsTab = ({ groupId, onSelectStudent }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <tr>
            <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Étudiant</th>
            <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Total</th>
            <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Payé</th>
            <th className="text-left px-4 py-3.5 text-[#64748B] font-medium whitespace-nowrap">Restant</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F1F5F9]">
          {payments.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-10 text-[#94A3B8]">
                Aucun étudiant dans ce groupe.
              </td>
            </tr>
          ) : (
            payments.map((p) => (
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentsTab;