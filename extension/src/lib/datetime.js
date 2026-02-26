/**
 * Bangkok (GMT+7) datetime helpers. Used by background (serialization/API) and content (form).
 */

/**
 * Current datetime string in Bangkok time: "YYYY-MM-DD HH:mm:ss"
 */
export function getBangkokDateTime() {
  const bangkokTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const pad = (n) => String(n).padStart(2, '0');
  return `${bangkokTime.getFullYear()}-${pad(bangkokTime.getMonth() + 1)}-${pad(bangkokTime.getDate())} ${pad(bangkokTime.getHours())}:${pad(bangkokTime.getMinutes())}:${pad(bangkokTime.getSeconds())}`;
}

/**
 * Parse "YYYY-MM-DD [HH:mm:ss]" as Bangkok time and return UTC milliseconds.
 */
export function parseBangkokDateTimeToUtcMs(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = match;
  return Date.UTC(+y, +mo - 1, +d, +h - 7, +mi, +s);
}

/**
 * Bangkok datetime for datetime-local input: "YYYY-MM-DDTHH:mm"
 */
export function getBangkokDateTimeLocal() {
  const now = new Date();
  const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const year = bangkokTime.getFullYear();
  const month = String(bangkokTime.getMonth() + 1).padStart(2, '0');
  const day = String(bangkokTime.getDate()).padStart(2, '0');
  const hours = String(bangkokTime.getHours()).padStart(2, '0');
  const minutes = String(bangkokTime.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format datetime-local value to "YYYY-MM-DD HH:mm:ss"
 */
export function formatDateTime(datetimeLocal) {
  if (!datetimeLocal) return '';
  const date = new Date(datetimeLocal);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Convert Bangkok datetime string to UTC ISO string for API.
 */
export function toAppliedAtUtcIso(bangkokDatetime) {
  const ms = parseBangkokDateTimeToUtcMs(bangkokDatetime);
  return ms != null ? new Date(ms).toISOString() : new Date().toISOString();
}

/**
 * Format applied_at (ISO string) for notification: "Feb 16, 9:30pm"
 */
export function formatAppliedAtForNotification(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const hour = date.getHours() % 12 || 12;
  const minute = date.getMinutes();
  const ampm = date.getHours() < 12 ? 'am' : 'pm';
  const minStr = minute < 10 ? `0${minute}` : String(minute);
  return `${month} ${day}, ${hour}:${minStr}${ampm}`;
}
