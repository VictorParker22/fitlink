// Notification utilities for FitLink PWA
// Uses the Web Notifications API (no server-side push needed for basic alerts)

const PERMISSION_KEY = 'fitlink_notif_asked';

/**
 * Request notification permission (shows browser prompt once)
 * @returns {Promise<boolean>} Whether permission was granted
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  // Only ask once per session
  if (sessionStorage.getItem(PERMISSION_KEY)) return false;
  sessionStorage.setItem(PERMISSION_KEY, 'true');

  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Show a local notification
 */
export function showNotification(title, body, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notif = new Notification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: options.tag || 'fitlink',
    renotify: !!options.tag,
    silent: false,
    ...options,
  });

  // Auto-close after 5 seconds
  setTimeout(() => notif.close(), 5000);

  if (options.onClick) {
    notif.onclick = () => {
      window.focus();
      options.onClick();
      notif.close();
    };
  }

  return notif;
}

/**
 * Schedule a session reminder (1 hour before)
 */
export function scheduleSessionReminder(session, clientName) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return null;

  const sessionTime = new Date(session.date).getTime();
  const reminderTime = sessionTime - 60 * 60 * 1000; // 1 hour before
  const now = Date.now();

  if (reminderTime <= now) return null; // Already past

  const delay = reminderTime - now;
  if (delay > 24 * 60 * 60 * 1000) return null; // Don't schedule more than 24h out

  const timeStr = new Date(session.date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const timerId = setTimeout(() => {
    showNotification(
      '⏰ Session in 1 hour',
      `${session.type} session with ${clientName || 'client'} at ${timeStr}`,
      { tag: `session-${session.id}` }
    );
  }, delay);

  return timerId;
}

/**
 * Show incoming message notification (when tab is not focused)
 */
export function notifyNewMessage(senderName, messagePreview) {
  if (document.hasFocus()) return; // Don't notify if app is focused

  showNotification(
    `💬 ${senderName}`,
    messagePreview.length > 60 ? messagePreview.slice(0, 60) + '...' : messagePreview,
    { tag: `msg-${senderName}` }
  );
}
