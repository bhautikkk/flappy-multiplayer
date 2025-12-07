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
  window.multiplayerMode = "solo";
  window.multiplayerRole = null;
  menu.style.display = "none";
};
