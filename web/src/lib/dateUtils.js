/**
 * Today's date in Bangkok as YYYY-MM-DD (for input[type=date]).
 */
export function getTodayBangkok() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
}

/**
 * Day boundary: 08:00 Bangkok to next day 07:59:59.999 Bangkok.
 * Given YYYY-MM-DD, returns { from, to } as ISO strings for that day:
 * from = that date 08:00 Bangkok, to = next date 07:59:59.999 Bangkok.
 * (08:00 UTC+7 = 01:00 UTC)
 */
export function getBangkokDayRange(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  // 08:00 Bangkok = 01:00 UTC same calendar day
  const start = new Date(Date.UTC(y, m - 1, d, 1, 0, 0, 0))
  // Next day 07:59:59.999 Bangkok = next day 00:59:59.999 UTC
  const end = new Date(Date.UTC(y, m - 1, d + 1, 0, 59, 59, 999))
  return { from: start.toISOString(), to: end.toISOString() }
}
