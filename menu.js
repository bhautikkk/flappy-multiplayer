// ===================== MENU ELEMENTS =====================
const menu = document.getElementById("menuOverlay");
const btnSolo = document.getElementById("btnSolo");
const btnCreate = document.getElementById("btnCreate");
const btnJoin = document.getElementById("btnJoin");
const roomCodeInput = document.getElementById("roomCodeInput");
const roomInfo = document.getElementById("roomInfo");

// ===================== Generate Room Code =====================
function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ===================== SOLO BUTTON =====================
btnSolo.onclick = () => {
    menu.style.display = "none";
    if (typeof startSolo === "function") startSolo();
};

// ===================== CREATE ROOM =====================
btnCreate.onclick = () => {
    const code = generateRoomCode();

    // Code display
    alert("Room Code: " + code);
    roomInfo.textContent = "Room Code: " + code;

    // Host ko yahin rukna है (कोई auto-start नहीं)
    // जब host चाहे तब नीचे वाला button दबाकर गेम शुरू कर सकता है
};

// ===================== JOIN ROOM =====================
btnJoin.onclick = () => {
    const code = roomCodeInput.value.trim();

    if (code.length !== 6) {
        roomInfo.textContent = "Enter a valid 6-digit code!";
        return;
    }

    roomInfo.textContent = "Joining room: " + code;

    // Join करने वाले का game तुरंत start होगा
    if (typeof startMulti === "function") startMulti();

    // Menu hide
    menu.style.display = "none";
};
