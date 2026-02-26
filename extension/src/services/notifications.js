import { NOTIFICATION } from '../lib/constants.js';

/**
 * Show a Chrome notification. Reusable from background.
 */
export function showNotification(options = {}) {
  const {
    title = NOTIFICATION.DEFAULT_TITLE,
    message = '',
    priority = NOTIFICATION.PRIORITY.LOW,
    requireInteraction = false,
  } = options;
  const iconUrl = chrome.runtime.getURL(NOTIFICATION.ICON_PATH);
  chrome.notifications.create({
    type: 'basic',
    iconUrl,
    title,
    message,
    priority,
    requireInteraction,
  });
}
