// =====================================================================
// Widget Dashboard — ultimele 5 notificări ale user-ului curent
// Click pe o notificare → marcare automată ca citită + navigare la link
// Include buton "Marchează toate ca citite"
// =====================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Circle } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import Card from '../ui/Card';
import Spinner from '../ui/Spinner';

/**
 * Format relativ de timp ("acum X min / ore / zile")
 */
const timeAgo = (dateStr) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins   = Math.floor(diffMs / (1000 * 60));

  if (mins < 1)  return 'acum câteva secunde';
  if (mins < 60) return `acum ${mins} min`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `acum ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `acum ${days} zile`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `acum ${weeks} săpt`;

  return new Date(dateStr).toLocaleDateString('ro-RO');
};

export default function RecentNotificationsWidget() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // ------------------------------------------------------------------
  // Încărcare notificări la mount
  // ------------------------------------------------------------------
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await notificationService.recent(5);
        setNotifications(res.data || []);
        setUnreadCount(res.unreadCount || 0);
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  // ------------------------------------------------------------------
  // Click pe notificare: marchează ca citită (dacă e necitită) + navigare
  // ------------------------------------------------------------------
  const handleClick = async (notif) => {
    // Optimistic update — marcăm ca citită local imediat pentru UX rapid
    if (!notif.isRead) {
      try {
        await notificationService.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Eroare silențioasă — navigăm oricum
      }
    }

    // Dacă notificarea are un link intern, navigăm la el
    if (notif.link) navigate(notif.link);
  };

  // ------------------------------------------------------------------
  // Marchează toate notificările ca citite
  // ------------------------------------------------------------------
  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignorat
    }
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span>Notificări recente</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
      }
      subtitle={
        unreadCount > 0 ? (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-primary-700 hover:underline"
          >
            Marchează toate ca citite
          </button>
        ) : 'Toate notificările sunt citite'
      }
    >
      {loading ? (
        <Spinner />
      ) : notifications.length === 0 ? (
        <div className="text-center py-6">
          <BellOff size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Nu ai nicio notificare.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`
                w-full text-left flex items-start gap-3 p-2.5 rounded-lg transition
                ${notif.isRead ? 'hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'}
              `}
            >
              {/* Indicator citit/necitit */}
              <div className="flex-shrink-0 mt-1">
                {notif.isRead ? (
                  <Bell size={14} className="text-gray-400" />
                ) : (
                  <Circle size={10} className="text-primary-600 fill-current" />
                )}
              </div>

              {/* Conținut notificare */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${notif.isRead ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                  {notif.title}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                  {notif.message}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {timeAgo(notif.createdAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}