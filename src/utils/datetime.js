// Get Bangkok datetime for datetime-local input
export function getBangkokDateTimeLocal() {
  const now = new Date();
  const bangkokTime = new Date(now.toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok'
  }));

  const year = bangkokTime.getFullYear();
  const month = String(bangkokTime.getMonth() + 1).padStart(2, '0');
  const day = String(bangkokTime.getDate()).padStart(2, '0');
  const hours = String(bangkokTime.getHours()).padStart(2, '0');
  const minutes = String(bangkokTime.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Convert datetime-local input to formatted datetime string
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
