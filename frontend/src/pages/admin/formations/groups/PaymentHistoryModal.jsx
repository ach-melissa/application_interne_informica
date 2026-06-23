import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Pencil, Plus, Check, Camera, Image, ZoomIn } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});
const getAuthHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const PaymentHistoryModal = ({ student, formationId, onClose, onRefresh }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [montant, setMontant] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editMontant, setEditMontant] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const fileInputRef = useRef(null);
  const [pendingUploadId, setPendingUploadId] = useState(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API}/api/payments/student/${student.studentId}/formation/${formationId}`,
        { headers: getHeaders() }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de chargement');
      setHistory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (student) refresh(); }, [student, formationId]);

  const handleAdd = async () => {
    if (!montant) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/payments`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          etudiant_id: student.studentId,
          formation_id: formationId,
          montant: Number(montant),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMontant('');
      await refresh();
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    if (!editMontant) return;
    try {
      const res = await fetch(`${API}/api/payments/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ montant: Number(editMontant) }),
      });
      if (!res.ok) throw new Error('Erreur modification');
      setEditingId(null);
      await refresh();
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce paiement ?')) return;
    try {
      const res = await fetch(`${API}/api/payments/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Erreur suppression');
      await refresh();
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    }
  };

  // Trigger file picker for a specific payment
  const triggerUpload = (paymentId) => {
    setPendingUploadId(paymentId);
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  // Upload photo after file chosen
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadId) return;

    setUploadingId(pendingUploadId);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('bon', file);

      const res = await fetch(`${API}/api/payments/${pendingUploadId}/bon`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur upload');
      await refresh();
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingId(null);
      setPendingUploadId(null);
    }
  };

  if (!student) return null;
  const totalPaid = history.reduce((sum, p) => sum + Number(p.montant), 0);
  const remaining = student.total - totalPaid;

  return (
    <>
      {/* Hidden file input shared for all tranches */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
        <div
          className="bg-[#faf9f7] rounded-2xl w-full max-w-sm p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-[#1E293B]">{student.nom}</h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">Historique des paiements</p>
            </div>
            <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1E293B] transition">
              <X size={18} />
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</p>
          )}

          {/* Summary pills */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 bg-white rounded-xl border border-[#E2E8F0] px-3 py-2 text-center">
              <p className="text-[10px] text-[#94A3B8] mb-0.5">Payé</p>
              <p className="text-sm font-semibold text-[#1E293B]">{totalPaid.toLocaleString('fr-FR')} DA</p>
            </div>
            <div className={`flex-1 rounded-xl border px-3 py-2 text-center ${remaining <= 0 ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
              <p className="text-[10px] text-[#94A3B8] mb-0.5">Restant</p>
              <p className={`text-sm font-semibold ${remaining <= 0 ? 'text-green-600' : 'text-[#b8995a]'}`}>
                {remaining.toLocaleString('fr-FR')} DA
              </p>
            </div>
          </div>

          {/* History */}
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-[#b8995a] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ul className="space-y-1 mb-4 max-h-52 overflow-y-auto">
              {history.length === 0 ? (
                <li className="text-center text-[#94A3B8] text-xs py-6">Aucun paiement enregistré.</li>
              ) : (
                history.map((p) => (
                  <li key={p.id} className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2">
                    {editingId === p.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          className="border border-[#E2E8F0] rounded-lg px-2 py-1 text-sm flex-1 bg-[#faf9f7]"
                          value={editMontant}
                          onChange={(e) => setEditMontant(e.target.value)}
                          placeholder="Montant"
                          autoFocus
                        />
                        <button onClick={() => handleEdit(p.id)} className="text-green-500 hover:text-green-700">
                          <Check size={15} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-[#94A3B8] hover:text-[#1E293B]">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {/* Row 1: tranche info + actions */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-[#f1ede6] text-[#b8995a] font-medium px-2 py-0.5 rounded-full">
                              T{p.tranche}
                            </span>
                            <span className="text-xs text-[#94A3B8]">
                              {new Date(p.date_paiement).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-[#1E293B]">
                              {Number(p.montant).toLocaleString('fr-FR')} DA
                            </span>
                            <button
                              onClick={() => { setEditingId(p.id); setEditMontant(p.montant); }}
                              className="text-[#94A3B8] hover:text-[#b8995a] transition"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="text-[#94A3B8] hover:text-red-400 transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Row 2: bon photo */}
                        <div className="flex items-center gap-2">
                          {p.bon_photo ? (
                            <>
                              {/* Thumbnail */}
                              <button
                                onClick={() => setLightboxUrl(p.bon_photo)}
                                className="relative group flex-shrink-0"
                              >
                                <img
                                  src={p.bon_photo}
                                  alt="bon"
                                  className="w-10 h-10 rounded-lg object-cover border border-[#E2E8F0] group-hover:opacity-80 transition"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                  <ZoomIn size={14} className="text-white drop-shadow" />
                                </div>
                              </button>
                              {/* Replace button */}
                              <button
                                onClick={() => triggerUpload(p.id)}
                                disabled={uploadingId === p.id}
                                className="flex items-center gap-1 text-[10px] text-[#94A3B8] hover:text-[#b8995a] transition disabled:opacity-40"
                              >
                                {uploadingId === p.id ? (
                                  <div className="w-3 h-3 border border-[#b8995a] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Camera size={12} />
                                )}
                                <span>Remplacer</span>
                              </button>
                            </>
                          ) : (
                            /* No photo yet */
                            <button
                              onClick={() => triggerUpload(p.id)}
                              disabled={uploadingId === p.id}
                              className="flex items-center gap-1.5 text-[10px] text-[#94A3B8] hover:text-[#b8995a] border border-dashed border-[#E2E8F0] hover:border-[#b8995a] rounded-lg px-2 py-1 transition disabled:opacity-40"
                            >
                              {uploadingId === p.id ? (
                                <div className="w-3 h-3 border border-[#b8995a] border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Camera size={12} />
                              )}
                              <span>Ajouter bon</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}

          {/* Add */}
          <div className="flex gap-2">
            <input
              type="number"
              className="border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm flex-1 bg-white"
              placeholder="Montant (DA)"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={submitting || !montant}
              className="bg-[#b8995a] text-white rounded-xl px-4 py-2 hover:bg-[#a0854d] transition disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

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
              <X size={16} />
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

export default PaymentHistoryModal;