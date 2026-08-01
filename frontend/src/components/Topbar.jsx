import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User, LogOut, DoorClosed, Check, X as XIcon, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/images/logo_informica.png';

const ROLE_LABELS = { admin: 'Administrateur', prof: 'Professeur', comptable: 'Comptable' };
const JOUR_LABELS = { samedi: 'Samedi', dimanche: 'Dimanche', lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi' };
const PERIODE_LABELS = { matin: 'Matin', midi: 'A Midi' };

const NOTIF_POLL_MS = 30000;

const STATUT_BADGE = {
  approuvee: { label: 'Approuvée', className: 'bg-emerald-50 text-emerald-600' },
  refusee: { label: 'Refusée', className: 'bg-red-50 text-red-500' },
  proposee: { label: 'À choisir', className: 'bg-blue-50 text-blue-600' },
};

const Topbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const initials = [user?.prenom?.[0], user?.nom?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const roleLabel = ROLE_LABELS[user?.role] ?? user?.role;

  const isAdmin = user?.role === 'admin';
  const isProf = user?.role === 'prof';

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [salleInputs, setSalleInputs] = useState({});
  const [replyInputs, setReplyInputs] = useState({});
  const [expandedThread, setExpandedThread] = useState(null); // id de la notif dont le fil est ouvert
  const [sendingReplyId, setSendingReplyId] = useState(null);
  const notifRef = useRef(null);

const pendingCount = isAdmin
  ? notifications.filter((n) => n.statut === 'en_attente' || n.lu_admin === false).length
  : notifications.filter((n) => n.lu === false).length;

  const fetchNotifications = useCallback(async () => {
    if (!isAdmin && !isProf) return;
    try {
      const token = localStorage.getItem('token');
      const url = isAdmin
        ? `${import.meta.env.VITE_API_URL}/api/notifications`
        : `${import.meta.env.VITE_API_URL}/api/notifications/mes-demandes`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // silencieux
    }
  }, [isAdmin, isProf]);

  useEffect(() => {
    if (!isAdmin && !isProf) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, NOTIF_POLL_MS);
    return () => clearInterval(interval);
  }, [isAdmin, isProf, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

const handleOpenNotif = () => {
  const wasOpen = notifOpen;
  setNotifOpen((o) => !o);
  if (!wasOpen) {
    const champ = isAdmin ? 'lu_admin' : 'lu';
    const aMarquer = notifications.filter((n) => n[champ] === false);
    aMarquer.forEach(async (n) => {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${n.id}/lu`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // silencieux
      }
    });
    if (aMarquer.length > 0) {
      setTimeout(
        () =>
          setNotifications((prev) =>
            prev.map((n) => (aMarquer.find((a) => a.id === n.id) ? { ...n, [champ]: true } : n))
          ),
        300
      );
    }
  }
};

  const traiterDemande = async (notif, statut) => {
    setProcessingId(notif.id);
    try {
      const token = localStorage.getItem('token');
      const body = { statut };
      if (statut === 'approuvee') {
        const salle = salleInputs[notif.id]?.trim();
        if (!salle) {
          alert('Merci d\'indiquer au moins une salle avant d\'approuver.');
          setProcessingId(null);
          return;
        }
        body.salle_assignee = salle;
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${notif.id}/traiter`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? updated : n)));
    } catch {
      alert('Erreur lors du traitement de la demande.');
    } finally {
      setProcessingId(null);
    }
  };

  const choisirSalle = async (notif, salle) => {
    setProcessingId(notif.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${notif.id}/choisir-salle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ salle }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? updated : n)));
    } catch {
      alert('Erreur lors du choix de la salle.');
    } finally {
      setProcessingId(null);
    }
  };

  const envoyerReponse = async (notif) => {
    const message = replyInputs[notif.id]?.trim();
    if (!message) return;
    setSendingReplyId(notif.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${notif.id}/repondre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? updated : n)));
      setReplyInputs((prev) => ({ ...prev, [notif.id]: '' }));
    } catch {
      alert('Erreur lors de l\'envoi de la réponse.');
    } finally {
      setSendingReplyId(null);
    }
  };

  const voirEmploiGlobal = () => {
    setNotifOpen(false);
    navigate('/admin/emplois');
  };

  const showBell = isAdmin || isProf;

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0">
      <img src={logo} alt="Infomica" className="h-10 w-auto object-contain shrink-0" />

      <div className="flex items-center gap-3">
        {showBell ? (
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleOpenNotif}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg transition group"
            >
              <Bell size={18} className="text-[#64748B] group-hover:text-[#0F2A4A] transition" />
              {pendingCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border border-white" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-50 max-h-[520px] overflow-y-auto">
                <div className="px-4 py-3 border-b border-[#F1F5F9]">
                  <p className="text-sm font-semibold text-[#1E293B]">Notifications</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {isAdmin
                      ? `${pendingCount} demande${pendingCount !== 1 ? 's' : ''} en attente`
                      : `${notifications.length} demande${notifications.length !== 1 ? 's' : ''} envoyée${notifications.length !== 1 ? 's' : ''}`}
                  </p>
                </div>

                {notifications.length === 0 ? (
                  <p className="text-sm text-[#94A3B8] text-center py-8">Aucune notification.</p>
                ) : (
                  notifications.map((n) => {
                    const badge = STATUT_BADGE[n.statut];
                    const threadOpen = expandedThread === n.id;
                    const replies = n.replies || [];
                    return (
                      <div key={n.id} className="px-4 py-3 border-b border-[#F1F5F9] last:border-b-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[#1E293B]">
                            {isAdmin ? n.titre : 'Demande de salle'}
                          </p>
                          {badge && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${badge.className}`}>
                              {badge.label}
                            </span>
                          )}
                        </div>

                        {n.type === 'demande_salle' && n.data && (
                          <p className="text-xs text-[#64748B] mt-1 flex items-center gap-1.5 flex-wrap">
                            <DoorClosed size={12} />
                            {JOUR_LABELS[n.data.jour_semaine] || n.data.jour_semaine} · {PERIODE_LABELS[n.data.periode] || n.data.periode} · {n.data.heure_debut?.slice(0, 5)}–{n.data.heure_fin?.slice(0, 5)}
                            {n.data.salle_assignee && n.statut === 'approuvee' && (
                              <span className="text-emerald-600 font-medium">· {n.data.salle_assignee}</span>
                            )}
                          </p>
                        )}

                        {n.message && (
                          <p className="text-xs text-[#94A3B8] mt-1 italic">"{n.message}"</p>
                        )}

                        {/* ── Admin : traiter une demande en attente ── */}
                        {isAdmin && n.statut === 'en_attente' && (
                          <>
                            <button
                              onClick={voirEmploiGlobal}
                              className="text-xs text-[#0369A1] font-medium mt-2 hover:underline"
                            >
                              Voir l'emploi global →
                            </button>
                            <div className="mt-2.5">
                              <input
                                type="text"
                                placeholder="Salle(s), séparées par une virgule si plusieurs…"
                                value={salleInputs[n.id] || ''}
                                onChange={(e) => setSalleInputs((prev) => ({ ...prev, [n.id]: e.target.value }))}
                                className="w-full border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs mb-2"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => traiterDemande(n, 'approuvee')}
                                  disabled={processingId === n.id}
                                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium py-1.5 hover:bg-emerald-100 transition disabled:opacity-50"
                                >
                                  <Check size={13} /> Approuver
                                </button>
                                <button
                                  onClick={() => traiterDemande(n, 'refusee')}
                                  disabled={processingId === n.id}
                                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium py-1.5 hover:bg-red-100 transition disabled:opacity-50"
                                >
                                  <XIcon size={13} /> Refuser
                                </button>
                              </div>
                            </div>
                          </>
                        )}

                        {/* ── Prof : choisir une salle parmi celles proposées ── */}
                        {isProf && n.statut === 'proposee' && n.data?.salles_proposees?.length > 0 && (
                          <div className="mt-2.5">
                            <p className="text-xs text-[#64748B] mb-1.5">Plusieurs salles disponibles, choisissez :</p>
                            <div className="flex flex-wrap gap-2">
                              {n.data.salles_proposees.map((salle) => (
                                <button
                                  key={salle}
                                  onClick={() => choisirSalle(n, salle)}
                                  disabled={processingId === n.id}
                                  className="px-3 py-1.5 rounded-lg border border-[#0369A1]/30 text-[#0369A1] text-xs font-medium hover:bg-[#DCEBFA] transition disabled:opacity-50"
                                >
                                  {salle}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ── Fil de discussion (répondre) ── */}
                        <button
                          onClick={() => setExpandedThread(threadOpen ? null : n.id)}
                          className="text-xs text-[#94A3B8] mt-2.5 hover:text-[#0369A1] transition"
                        >
                          {threadOpen ? 'Masquer la discussion' : `Discussion${replies.length > 0 ? ` (${replies.length})` : ''}`}
                        </button>

                        {threadOpen && (
                          <div className="mt-2 space-y-2">
                            {replies.length > 0 && (
                              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {replies.map((r, idx) => (
                                  <div key={idx} className="bg-[#F8FAFC] rounded-lg px-2.5 py-1.5">
                                    <p className="text-[10px] font-semibold text-[#0369A1]">
                                      {r.auteur_nom} <span className="text-[#94A3B8] font-normal">· {ROLE_LABELS[r.auteur_role] || r.auteur_role}</span>
                                    </p>
                                    <p className="text-xs text-[#1E293B] mt-0.5">{r.message}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Écrire une réponse…"
                                value={replyInputs[n.id] || ''}
                                onChange={(e) => setReplyInputs((prev) => ({ ...prev, [n.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') envoyerReponse(n); }}
                                className="flex-1 border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs"
                              />
                              <button
                                onClick={() => envoyerReponse(n)}
                                disabled={sendingReplyId === n.id || !replyInputs[n.id]?.trim()}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#0369A1] text-white hover:bg-[#0369A1]/90 transition disabled:opacity-40"
                              >
                                <Send size={13} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ) : (
          <button className="relative w-9 h-9 flex items-center justify-center rounded-lg transition group">
            <Bell size={18} className="text-[#64748B] group-hover:text-[#0F2A4A] transition" />
          </button>
        )}

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition group"
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-[#1E293B] group-hover:text-[#0F2A4A] leading-none transition">{user?.prenom} {user?.nom}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{roleLabel}</p>
            </div>
            {user?.photo_url ? (
              <img src={user.photo_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#DCEBFA] flex items-center justify-center shrink-0">
                <span className="text-[#0369A1] text-sm font-bold">{initials}</span>
              </div>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-50">
              <button
                onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1E293B] hover:bg-[#F8FAFC] transition text-left"
              >
                <User size={16} className="text-[#64748B]" /> Voir profil
              </button>
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition text-left"
              >
                <LogOut size={16} /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;