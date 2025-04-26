import https from 'https';
import pRetry from 'p-retry';


export function formattedTime() {
  const offset = 1; // Fixed UTC+1
  const today = new Date();
  
  let utc = today.getTime() + (today.getTimezoneOffset() * 60000);

  let adjustedDate = new Date(utc + (3600000 * offset));

  let dd = adjustedDate.getDate();
  let mm = adjustedDate.getMonth() + 1;
  const yyyy = adjustedDate.getFullYear();
  let hr = adjustedDate.getHours();
  let m = adjustedDate.getMinutes();

  if (dd < 10) dd = '0' + dd;
  if (mm < 10) mm = '0' + mm;
  if (hr < 10) hr = '0' + hr;
  if (m < 10) m = '0' + m; 
  
  return `${dd}-${mm}-${yyyy} ${hr}:${m} UTC+1`;
}

export function sleep(minMs, maxMs) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

export const robustFetch = (url, options = {}) => pRetry(
  () => fetch(url, { ...options, agent: new https.Agent({ keepAlive: true }) }),
  { retries: 3, minTimeout: 1000 }
);
