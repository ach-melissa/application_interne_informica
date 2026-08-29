import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User, LogOut, ClipboardList, CreditCard, History, Flag, Archive, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/images/logo_informica.png';

const ROLE_LABELS = {
  admin: 'Administrateur',
  prof: 'Professeur',
  comptable: 'Comptable',
};

const NOTIF_ICONS = {
  retard_paiement: { Icon: CreditCard, className: 'text-orange-600 bg-orange-50' },
  demande_salle: { Icon: ClipboardList, className: 'text-[#0369A1] bg-[#EAF4FC]' },
  groupe_complete: { Icon: Flag, className: 'text-emerald-600 bg-emerald-50' },
  groupe_a_archiver: { Icon: Archive, className: 'text-amber-700 bg-amber-50' },
  rappel_pointage: { Icon: Clock, className: 'text-sky-600 bg-sky-50' },
};
const DEMANDE_SALLE_STATUT_LABEL = {
  en_attente: 'En attente de réponse',
  approuvee: 'Approuvée',
  refusee: 'Refusée',
  proposee: 'Alternative proposée',
};

const getDemandeSalleText = (n, isAdmin) => {
  if (isAdmin) {
    const viaProposition = (n.data?.propositions?.length || 0) > 0;

    if (n.statut === 'approuvee' && viaProposition) {
      return {
        title: 'Proposition acceptée',
        subtitle: `${n.data?.demandeur_nom || '—'} a choisi une option — salle : ${n.data?.salle_assignee_nom || '—'}`,
      };
    }
    if (n.statut === 'refusee' && viaProposition) {
      return {
        title: 'Proposition refusée',
        subtitle: `${n.data?.demandeur_nom || '—'} a refusé toutes les options proposées`,
      };
    }
    return {
      title: 'Nouvelle demande de salle',
      subtitle: n.data?.demandeur_nom || n.message || n.titre,
    };
  }

  // côté prof : on affiche la décision + qui l'a traitée
  const statutLabel = DEMANDE_SALLE_STATUT_LABEL[n.statut] || 'En attente';
  const title =
    n.statut === 'approuvee' ? 'Demande approuvée' :
    n.statut === 'refusee' ? 'Demande refusée' :
    n.statut === 'proposee' ? 'Alternative proposée' :
    'Demande envoyée';

  let subtitle;
  if (n.statut === 'approuvee') {
    subtitle = `Salle : ${n.data?.salle_assignee_nom || '—'}${n.traite_par_nom ? ` — par ${n.traite_par_nom}` : ''}`;
  } else if (n.statut === 'refusee') {
    subtitle = n.traite_par_nom ? `Par ${n.traite_par_nom}` : statutLabel;
  } else if (n.statut === 'proposee') {
    subtitle = `${n.data?.propositions?.length || 0} option(s) — merci de confirmer`;
  } else {
    subtitle = statutLabel;
  }

  return { title, subtitle, reponse: n.reponse_message };
};

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
};

const Topbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const menuRef = useRef(null);
  const notifRef = useRef(null);

  const initials =
    [user?.prenom?.[0], user?.nom?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() || '?';

  const isAdmin = user?.role === 'admin';
  const isProf = user?.role === 'prof';
  const isSuperAdmin = user?.role === 'super_admin';
  const isComptable = user?.role === 'comptable';

  // Historique : visible pour admin, super_admin, comptable.
  // - admin        → voit les actions admin + super_admin
  // - comptable    → voit les actions comptable + super_admin
  // - super_admin  → voit tout (admin + comptable), car il partage les deux périmètres
  const canSeeHistorique = isAdmin || isSuperAdmin || isComptable;
  const historiqueScopeLabel = isSuperAdmin
    ? 'Actions admin & comptable'
    : isComptable
    ? 'Actions comptable & super admin'
    : 'Actions admin & super admin';

  const [historiqueOpen, setHistoriqueOpen] = useState(false);
  const historiqueRef = useRef(null);

 
  // selon le rôle courant, avec la même logique de périmètre que historiqueScopeLabel.
  const historiqueEntries = [];

  const fetchNotifications = useCallback(async () => {
    if (!isAdmin && !isProf) return;

    try {
      const token = localStorage.getItem('token');
      const url = isAdmin
        ? `${import.meta.env.VITE_API_URL}/api/notifications`
        : `${import.meta.env.VITE_API_URL}/api/notifications/mes-demandes`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        // Le prof ne doit voir une notification que lorsque l'admin a tranché
        // (pas au moment où il envoie lui-même sa demande).
        const filtered = isProf
          ? list.filter((n) => n.type !== 'demande_salle' || n.statut !== 'en_attente')
          : list;
        setNotifications(filtered);
      }
    } catch {
      // ignore
    }
  }, [isAdmin, isProf]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const close = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
      if (!notifRef.current?.contains(e.target)) setNotifOpen(false);
      if (!historiqueRef.current?.contains(e.target)) setHistoriqueOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const markAsRead = async (id) => {
    const field = isAdmin ? 'lu_admin' : 'lu';

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, [field]: true } : n))
    );

    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${id}/lu`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore — next poll will resync if this failed
    }
  };

  const handleNotificationClick = (notification) => {
    setNotifOpen(false);
    markAsRead(notification.id);

    if (notification.type === 'demande_salle') {
      navigate(isAdmin ? `/admin/demandes-salles/${notification.id}` : `/prof/mes-demandes-salles/${notification.id}`);
       } else if (notification.type === 'retard_paiement') {
      const { formation_id, group_id } = notification.data || {};
      if (formation_id && group_id) {
        navigate(`/admin/formations/${formation_id}/groups/${group_id}?tab=paiements`);
      }
      } else if (notification.type === 'groupe_complete') {
      const { formation_id, groupe_id } = notification.data || {};
      if (formation_id && groupe_id) {
        navigate(`/admin/formations/${formation_id}/groups/${groupe_id}?tab=pointage`);
      }
    } else if (notification.type === 'groupe_a_archiver') {
      const { formation_id } = notification.data || {};
      if (formation_id) {
        navigate(`/admin/formations/${formation_id}/groups`);
      }
    }
  };

  const isUnread = (n) => (isAdmin ? n.lu_admin !== true : n.lu !== true);
  const unreadCount = notifications.filter(isUnread).length;

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0">
      <img src={logo} alt="Informica" className="h-10 w-auto object-contain" />

            <div className="flex items-center gap-3">
        {/* Historique — statique pour l'instant */}
        {canSeeHistorique && (
          <div className="relative" ref={historiqueRef}>
            <button
              onClick={() => setHistoriqueOpen(!historiqueOpen)}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-50 transition-colors"
              title="Historique"
            >
              <History size={18} className="text-[#64748B]" />
            </button>

            {historiqueOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-700">Historique</p>
                  <p className="text-xs text-slate-400 mt-0.5">{historiqueScopeLabel}</p>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {historiqueEntries.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">
                      Aucune activité pour le moment
                    </p>
                  ) : (
                    historiqueEntries.map((h, i) => (
                      <div key={i} className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm text-slate-700">{h.description}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{h.date}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {(isAdmin || isProf) && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Bell size={18} className="text-[#64748B]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-orange-500 text-white text-[10px] font-semibold rounded-full border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Notifications</p>
                  {unreadCount > 0 && (
                    <span className="text-xs text-orange-600 font-medium">
                      {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">
                      Aucune notification
                    </p>
                  ) : (
                    notifications.map((n) => {
                      const isPaymentAlert = n.type === 'retard_paiement';
                      const isDemandeSalle = n.type === 'demande_salle';
                      const etudiants = n.data?.etudiants || [];
                      const { Icon, className } =
                        NOTIF_ICONS[n.type] || NOTIF_ICONS.demande_salle;
                      const unread = isUnread(n);

                      const demandeSalleText = isDemandeSalle ? getDemandeSalleText(n, isAdmin) : null;

                      return (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full flex gap-3 text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                            unread ? 'bg-slate-50/60' : ''
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${className}`}>
                            <Icon size={16} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {isDemandeSalle ? demandeSalleText.title : n.titre}
                              </p>
                              {unread && (
                                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                              )}
                            </div>

                            <p className="text-xs text-slate-500 mt-0.5">
                              {isDemandeSalle ? demandeSalleText.subtitle : (n.message || n.titre)}
                            </p>

                            {isDemandeSalle && demandeSalleText.reponse && (
                              <p className="text-xs text-slate-400 italic mt-0.5 truncate">
                                "{demandeSalleText.reponse}"
                              </p>
                            )}

                            {isPaymentAlert && etudiants.length > 0 && (
                              <ul className="mt-1.5 space-y-0.5">
                                {etudiants.slice(0, 5).map((e) => (
                                  <li
                                    key={e.etudiant_id}
                                    className="text-xs text-slate-600 truncate"
                                  >
                                    • {e.nom}
                                  </li>
                                ))}
                                {etudiants.length > 5 && (
                                  <li className="text-xs text-slate-400">
                                    + {etudiants.length - 5} autre(s)
                                  </li>
                                )}
                              </ul>
                            )}

                            <p className="text-[11px] text-slate-400 mt-1">
                              {formatRelativeTime(n.created_at)}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-[#1E293B]">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs text-[#64748B]">
                {ROLE_LABELS[user?.role] || user?.role}
              </p>
            </div>

            {user?.photo_url ? (
              <img src={user.photo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#DCEBFA] flex items-center justify-center">
                <span className="text-[#0369A1] text-sm font-bold">{initials}</span>
              </div>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-50">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/profile');
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 text-left"
              >
                <User size={16} />
                Voir profil
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 text-left"
              >
                <LogOut size={16} />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;