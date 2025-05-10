const socket = io();

const notifications = document.getElementById('notifications');
const history = document.getElementById('history');
const historyBody = document.getElementById('history-body');

// Load notifications from sessionStorage
let storedNotifications = localStorage.getItem('notifications');
let notificationArray = storedNotifications ? JSON.parse(storedNotifications) : [];

function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}


// Restore notifications on page load
window.onload = (event) => {
  fetch('/bal')
    .then(res => res.text())
    .then(data => {
      if (!data) return;
      document.getElementById('bal').innerHTML = "$SOL " + `<span style="color: gray; font-size: 35px;">${data}</span>`;
    })
    .catch(error => {
      console.error('Error:', error);
    });

  notificationArray.forEach((msg) => {
    if (typeof msg === 'object') {
      history.style.display = "block";
      historyBody.innerHTML += `
        <tr>
          <td>${msg.chain}</td>
          <td>
            <a style="margin: 0;" href="https://dexscreener.com/${msg.chain}/${msg.address}" target="_blank">
              ${msg.name}
            </a>
          </td>
          <td>
            <a style="margin: 0;" href="https://rugcheck.xyz/tokens/${msg.address}" target="_blank">
              Check Rug
            </a>
          </td>
          <td>${formattedTime()}</td>
          <td> 
            <button class="sell-btn" style="background: red;" data-address="${msg.address}">Sell</button>
          </td>
        </tr>`;
    } else {
      const p = document.createElement('p');
      p.textContent = msg;
      notifications.appendChild(p);
    }
  });
};

let loading = false;

function formattedTime() {
  const offset = 1; // UTC+1
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
    solInput.value = lamports;
  } else {
    solInput.value = '';
  }
});

// Toggle Main Bot
document.getElementById('toggleActivateBot').addEventListener('click', async () => {
  try {
    loading = true;
    showLoading();
    const res = await fetch('/toggle-bot');
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    document.getElementById('toggleBotStatus').textContent = data.status ? 'BOT is running..' : 'BOT is not active 😴';
    document.getElementById('toggleActivateBot').textContent = data.status ? 'Terminate' : 'Activate';
    loading = false;
    hideLoading();
  } catch (error) {
    console.error('Error toggling auto trade:', error);
  }
});

// Toggle Alternate Bot Mode
document.getElementById('toggleAlternativeBtn').addEventListener('click', async () => {
  try {
    loading = true;
    showLoading();
    const res = await fetch('/toggle-alternate');
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    document.getElementById('toggleAlternativeStatus').textContent = data.status ? 'Alternative Mode Active..' : 'Normal mode';
    document.getElementById('toggleAlternativeBtn').textContent = data.status ? 'switch to normal Mode' : 'switch to alternative Mode';
    loading = false;
    hideLoading();
  } catch (error) {
    console.error('Error toggling auto trade:', error);
  }
});

// Withdraw Form
document.getElementById('withdraw').addEventListener('submit', async (e) => {
  e.preventDefault();
  loading = true;
  showLoading();
  try {
    const formData = new FormData(e.target);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    const res = await fetch('/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    loading = false;
    hideLoading();
    if (!res.ok) throw new Error(await res.text());
    else alert('success');
  } catch (error) {
    alert(error.message);
  }
});

// Threshold Form
document.getElementById('thresholdForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  loading = true;
  showLoading();
  try {
    const formData = new FormData(e.target);
    const thresholds = {};
    formData.forEach((value, key) => {
      thresholds[key] = value;
    });
    const res = await fetch('/thresholds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thresholds)
    });
    loading = false;
    hideLoading();
    if (!res.ok) throw new Error(await res.text());
    alert('updated');
  } catch (error) {
    alert(error.message);
  }
});

// Live Notifications Handler
socket.on('notification', (message) => {
  notificationArray.push(message);
  localStorage.setItem('notifications', JSON.stringify(notificationArray));

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
    <td> 
      <button class="sell-btn" style="background: red;" data-address="${message.address}">Sell</button>
    </td>
  </tr>`;
  } else {
    const newMessage = document.createElement('p');
    newMessage.textContent += message;
    notifications.appendChild(newMessage);
    notifications.focus();
  }
});

// Clear Notifications
document.getElementById('clearNotificationsBtn').addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all notifications?')) {
    localStorage.removeItem('notifications');
    notificationArray = [];
    notifications.innerHTML = '';
    historyBody.innerHTML = '';
    history.style.display = 'none';
  }
});

// Handle sell modal
function openSellModal(address) {
  document.getElementById('sellTokenAddress').value = address;
  document.getElementById('sellModal').style.display = 'flex';
}

function closeSellModal() {
  document.getElementById('sellModal').style.display = 'none';
}

// Handle sell form submission
document.getElementById('sellForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  loading = true;
  showLoading();
  const formData = new FormData(e.target);
  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });

  try {
    const res = await fetch('/sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    loading = false;
    hideLoading();

    if (!res.ok) throw new Error(await res.text());
    closeSellModal();
    alert('Sell triggered');
  } catch (error) {
    alert(error.message);
  }
});  

document.addEventListener("click", function(e) {
    if (e.target && e.target.classList.contains("sell-btn")) {
        const address = e.target.getAttribute("data-address"); 
        if(address === "close") closeSellModal();
        else openSellModal(address);
    }
});
