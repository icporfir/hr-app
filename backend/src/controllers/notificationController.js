// =====================================================================
// NOTIFICATIONS Controller — notificări interne
// Fiecare user vede DOAR propriile notificări (filtrare pe req.user.userId)
// =====================================================================

import prisma from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * GET /api/notifications/recent
 * Returnează ultimele N notificări ale user-ului curent (default 5).
 * Folosit pe Dashboard pentru widget-ul „Notificări recente".
 */
export const getRecentNotifications = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20); // max 20

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  // Numărăm notificările necitite (pentru badge vizual)
  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  res.json({
    success: true,
    unreadCount,
    data: notifications,
  });
});

/**
 * GET /api/notifications
 * Returnează toate notificările user-ului (paginate: ?limit & ?offset)
 */
export const listNotifications = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const limit  = Math.min(parseInt(req.query.limit, 10)  || 50, 100);
  const offset = parseInt(req.query.offset, 10) || 0;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  res.json({
    success: true,
    total,
    data: notifications,
  });
});

/**
 * PUT /api/notifications/:id/read
 * Marchează o notificare specifică drept citită.
 * Verifică ownership — nu poți citi notificările altuia.
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const id = parseInt(req.params.id, 10);

  // Verificăm ownership (securitate — prevenim IDOR)
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) {
    return res.status(404).json({ success: false, message: 'Notificare inexistentă.' });
  }
  if (notif.userId !== userId) {
    return res.status(403).json({ success: false, message: 'Acces interzis.' });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data:  { isRead: true },
  });

  res.json({ success: true, data: updated });
});

/**
 * PUT /api/notifications/read-all
 * Marchează TOATE notificările user-ului ca citite.
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true },
  });

  res.json({
    success: true,
    message: `${result.count} notificări marcate ca citite.`,
  });
});