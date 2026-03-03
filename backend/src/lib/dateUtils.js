/**
 * Bangkok timezone helpers (08:00 Bangkok = 01:00 UTC).
 * All ranges are [from, to] inclusive at boundaries.
 */

/**
 * Day range for YYYY-MM-DD: from 08:00 Bangkok that day to 07:59:59.999 next day.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {{ from: string, to: string }} ISO strings
 */
export function getBangkokDayRange(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d + 1, 0, 59, 59, 999));
  return { from: start.toISOString(), to: end.toISOString() };
}

/**
 * Week range (Mon-Sun) containing the given date.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {{ from: string, to: string }} ISO strings
 */
export function getBangkokWeekRange(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  const dow = date.getUTCDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = (dow + 6) % 7; // days back to Monday
  const mondayDate = new Date(date);
  mondayDate.setUTCDate(mondayDate.getUTCDate() - mondayOffset);
  const my = mondayDate.getUTCFullYear();
  const mm = mondayDate.getUTCMonth();
  const md = mondayDate.getUTCDate();
  const start = new Date(Date.UTC(my, mm, md, 1, 0, 0, 0));
  const end = new Date(Date.UTC(my, mm, md + 7, 0, 59, 59, 999));
  return { from: start.toISOString(), to: end.toISOString() };
}

/**
 * Month range containing the given date.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {{ from: string, to: string }} ISO strings
 */
export function getBangkokMonthRange(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 1, 0, 0, 0)); // 1st 08:00 Bangkok
  const end = new Date(Date.UTC(y, m, 1, 0, 59, 59, 999));   // 1st next month 07:59:59 Bangkok
  return { from: start.toISOString(), to: end.toISOString() };
}
