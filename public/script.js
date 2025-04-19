const socket = io();

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
    const lamports = Math.round(value * 1_000_000_000);
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

// Threshold Form Submission
document.getElementById('thresholdForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const formData = new FormData(e.target);
        const thresholds = {};
        formData.forEach((value, key) => {
            thresholds[key] = Number(value);
        });

        const res = await fetch('/thresholds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(thresholds)
        });

        if (!res.ok) throw new Error('Network response was not ok');
        const updatedThresholds = await res.json();
        alert('updated')
        console.log('Thresholds updated:', updatedThresholds);
    } catch (error) {
        console.error('Error updating thresholds:', error);
        alert('Error updating thresholds');
    }
});

// Handle notifications
socket.on('notification', (message) => {
    const notifications = document.getElementById('notifications');
    if (Array.isArray(message.message)) {
        message.message.forEach(m => {
            const newMessage = document.createElement('ul');
            newMessage.innerHTML += `<li>${m}</i>`; // Use innerHTML to render HTML
            notifications.appendChild(newMessage);
        });
    } else {
        const newMessage = document.createElement('p');
        newMessage.textContent += message.message;
        notifications.appendChild(newMessage);
        notifications.focus();
    }
});

