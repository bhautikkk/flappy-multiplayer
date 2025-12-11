// ===== MENU HANDLING (only UI) =====
const menu = document.getElementById("menuOverlay");
const btnSolo = document.getElementById("btnSolo");
const btnCreate = document.getElementById("btnCreate");
const btnJoin = document.getElementById("btnJoin");
const roomCodeInput = document.getElementById("roomCodeInput");
const roomInfo = document.getElementById("roomInfo");

// Global flags jisse game.js ko pata chale
window.multiplayerMode = "solo";   // 'solo' | 'online'
window.multiplayerRole = null;     // 'host' | 'guest'

// SOLO: sirf menu hide, game.js normal physics se chalega
btnSolo.onclick = () => {
  const nameInput = document.getElementById("playerName");
  if (!nameInput.value.trim()) {
    roomInfo.textContent = "Please enter your name!";
    roomInfo.style.color = "red";
    return;
  }
  roomInfo.textContent = "";
  roomInfo.style.color = "#222";
  window.playerName = nameInput.value.trim();

  window.multiplayerMode = "solo";
  window.multiplayerRole = null;
  menu.style.display = "none";
};
