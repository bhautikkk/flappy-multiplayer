// ======================== MENU ELEMENTS ===========================
const menuOverlay = document.getElementById("menuOverlay");
const soloBtn = document.getElementById("soloBtn");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const roomInput = document.getElementById("roomInput");

// Show menu when page loads
menuOverlay.style.display = "flex";

// Always disable gameplay while menu is visible
function freezeGame() {
    state.current = state.getReady;
}

// Freeze game initially
freezeGame();

// ======================== SOLO PLAY ================================
soloBtn.onclick = () => {
    menuOverlay.style.display = "none"; 
    state.current = state.getReady;   // Start normal solo game
};

// ======================== WEBSOCKET CONFIG ==========================
let ws = null;
let roomCode = "";
const WS_URL = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "ws://localhost:8080"
    : "wss://" + location.hostname;

// Connect WebSocket only once
function connectWS() {
    if (ws) return;
    ws = new WebSocket(WS_URL);

    ws.onopen = () => console.log("WS Connected");

    ws.onmessage = (msg) => {
        let data = JSON.parse(msg.data);

        if (data.type === "room_created") {
            alert("Room Code: " + data.code);
            roomCode = data.code;
        }

        if (data.type === "start_game") {
            menuOverlay.style.display = "none";
            state.current = state.getReady;
        }
    };
}

// ======================== CREATE ROOM ===============================
createBtn.onclick = () => {
    freezeGame();
    connectWS();

    ws.send(JSON.stringify({ type: "create_room" }));
};

// ======================== JOIN ROOM =================================
joinBtn.onclick = () => {
    freezeGame();
    connectWS();

    const code = roomInput.value.trim();
    if (!code) {
        alert("Enter a room code!");
        return;
    }

    ws.send(JSON.stringify({
        type: "join_room",
        code: code
    }));
};
