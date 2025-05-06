const socket = io();

let loading = false;
const notifications = document.getElementById('notifications');
const history  = document.getElementById('history');
const historyBody = document.getElementById('history-body');

function formattedTime() {
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

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    const tabId = this.getAttribute("data-tab");
    tab(tabId);
  });
});

function tab(id) {
  id = Number(id);
  document.getElementById("tab1").style.display = id === 1 ? "block" : "none";
  document.getElementById("tab2").style.display = id === 2 ? "block" : "none";
}

const solInput = document.getElementById('tradeAmount');

solInput.addEventListener('change', () => {
  const value = parseFloat(solInput.value);

  if (!isNaN(value)) {
    const lamports = value * 1_000_000_000;
    solInput.value = lamports; // Replace input value with lamports
  } else {
    solInput.value = '';
  }
});

// Activate Bot
document.getElementById('toggleActivateBot').addEventListener('click', async () => {
    try {
        const res = await fetch('/toggle-bot');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        document.getElementById('toggleBotStatus').textContent = data.status ? 'BOT is running..' : 'BOT is not active 😴';
        document.getElementById('toggleActivateBot').textContent = data.status ? 'Terminate' : 'Activate';
    } catch (error) {
        console.error('Error toggling auto trade:', error);
    }
});

// Activate Bot
document.getElementById('toggleAlternativeBtn').addEventListener('click', async () => {
    try {
        const res = await fetch('/toggle-alternate');
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        document.getElementById('toggleAlternativeStatus').textContent = data.status ? 'Alternative Mode Active..' : 'Normal mode';
        document.getElementById('toggleAlternativeBtn').textContent = data.status ? 'switch to normal Mode' : 'switch to alternative Mode';
    } catch (error) {
        console.error('Error toggling auto trade:', error);
    }
});

// Threshold Form Submission
document.getElementById('withdraw').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const formData = new FormData(e.target);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        loading = true;
        const res = await fetch('/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        loading = false;

        if (!res.ok) alert('success');
         else alerr("try again later")
    } catch (error) {
        alert(error.message);
    }
});

// Threshold Form Submission
document.getElementById('thresholdForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (loading) return;
    try {
        const formData = new FormData(e.target);
        const thresholds = {};
        formData.forEach((value, key) => {
            thresholds[key] = value;
        });
        loading = true;
        const res = await fetch('/thresholds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(thresholds)
        });
        
        loading = false;

        if (!res.ok) throw new Error('Network response was not ok or incorrect password');
        alert('updated');
    } catch (error) {
        alert(error.message);
    }
});

// Handle notifications
socket.on('notification', (message) => {
    if (typeof message === 'object') { 
      history.style.display = "block"; 
      historyBody.innerHTML += `
    <tr>
      <td>${message.chain}</td>
      <td>
        <a style="margin: 0;" href="https://dexscreener.com/${message.chain}/${message.address}" target="_blank">
          ${message.name}
        </a>
      </td>
      <td>
        <a style="margin: 0;" href="https://rugcheck.xyz/tokens/${message.address}" target="_blank">
          Check Rug
        </a>
      </td>
      <td>${formattedTime()}</td>
    </tr>`;
    } else {
        const newMessage = document.createElement('p');
        newMessage.textContent += message;
        notifications.appendChild(newMessage);
        notifications.focus();
    }
});

