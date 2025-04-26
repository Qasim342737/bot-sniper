import https from 'https';
import pRetry from 'p-retry';

export function formattedTime() { 
  var today = new Date();
  var dd = today.getDate();

  var mm = today.getMonth()+1; 
  var yyyy = today.getFullYear();
  
  if(dd<10) dd='0'+dd;
  if(mm<10) mm='0'+mm; 

  return `${dd}-${mm}-${yyyy}`;
}


export function sleep(minMs, maxMs) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

export const robustFetch = (url, options = {}) => pRetry(
  () => fetch(url, { ...options, agent: new https.Agent({ keepAlive: true }) }),
  { retries: 3, minTimeout: 1000 }
);
