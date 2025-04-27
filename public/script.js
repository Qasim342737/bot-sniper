const socket = io();

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

// const solInput = document.getElementById('tradeAmount');

// solInput.addEventListener('change', () => {
//   const value = parseFloat(solInput.value);
//
//   if (!isNaN(value)) {
//     const lamports = Math.round(value * 1_000_000_000);
//     solInput.value = lamports; // Replace input value with lamports
//   } else {
//     solInput.value = '';
//   }
// });

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

// Threshold Form Submission
document.getElementById('thresholdForm').addEventListener('submit', async (e) => {
    e.preventDefault();
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

        if (!res.ok) throw new Error('Network response was not ok or incorrect password');
        const updatedThresholds = await res.json();
        alert('updated') 
        // console.log('Thresholds updated:', updatedThresholds);
    } catch (error) {
        // console.error('Error updating thresholds:', error);
        alert(error.message);
    }
});

// Handle notifications
socket.on('notification', (message) => {
    const notifications = document.getElementById('notifications');
    const history  = document.getElementById('history');
    if (typeof message === 'object') {
      history.style.display = "block";
      history.innerHTML += `<span style="display: flex; justify-items: space-between"> 
                              <p>${message.chain}</p>
                              <a href="https://dexscreener.com/${message.chain}/${message.address}" target="_blank">${message.name}</a>
                              <a href="https://rugcheck.xyz/tokens/${message.address}" target="_blank">check rug</a>
                              <small>${formattedTime()}</small>
                            </span>`; 
    } else {
        const newMessage = document.createElement('p');
        newMessage.textContent += message;
        notifications.appendChild(newMessage);
        notifications.focus();
    }
});

