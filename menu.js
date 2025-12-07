// ======================== MENU ELEMENTS ===========================
// IDs same as index.html
const menuOverlay = document.getElementById("menuOverlay");
const soloBtn = document.getElementById("btnSolo");
const createBtn = document.getElementById("btnCreate");
const joinBtn = document.getElementById("btnJoin");
const roomInput = document.getElementById("roomCodeInput");

// Agar kuch galat ho to console me error dikhe (but game na toote)
if (!menuOverlay || !soloBtn || !createBtn || !joinBtn || !roomInput) {
    console.error("Menu elements missing, check IDs in index.html");
}

// ======================== INITIAL STATE ===========================

// Page load par menu dikhana hai
if (menuOverlay) {
    menuOverlay.style.display = "flex";
}

// Game ko freeze rakhna jab tak menu hai
function freezeGame() {
    if (typeof state !== "undefined") {
        state.current = state.getReady;
    }
}

// Start me freeze
freezeGame();

// ======================== SOLO PLAY ================================
if (soloBtn) {
    soloBtn.onclick = () => {
        if (menuOverlay) menuOverlay.style.display = "none";
        if (typeof state !== "undefined") {
            state.current = state.getReady;   // normal solo game
        }
    };
}

// ======================== WEBSOCKET CONFIG ==========================
let ws = null;
let roomCode = "";
const WS_URL = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "ws://localhost:8080"
    : "wss://" + location.hostname;

// Connect WebSocket only once
function connectWS() {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    if (ws && ws.readyState === WebSocket.CONNECTING) return;

    ws = new WebSocket(WS_URL);

    ws.onopen = () => console.log("WS Connected");

    ws.onmessage = (msg) => {
        let data;
        try {
            data = JSON.parse(msg.data);
        } catch (e) {
            console.error("Bad WS message", msg.data);
            return;
        }

        if (data.type === "room_created") {
            roomCode = data.code;
            alert("Room Code: " + data.code);
        }

        if (data.type === "start_game") {
            if (menuOverlay) menuOverlay.style.display = "none";
            if (typeof state !== "undefined") {
                state.current = state.getReady;
            }
        }
    };

    ws.onerror = (e) => {
        console.error("WS error:", e);
    };
}

// ======================== CREATE ROOM ===============================
if (createBtn) {
    createBtn.onclick = () => {
        freezeGame();
        connectWS();

        if (!ws) return;

        ws.send(JSON.stringify({ type: "create_room" }));
    };
}

// ======================== JOIN ROOM =================================
if (joinBtn) {
    joinBtn.onclick = () => {
        freezeGame();
        connectWS();

        const code = roomInput ? roomInput.value.trim() : "";
        if (!code) {
            alert("Enter a room code!");
            return;
        }

        if (!ws) return;

        ws.send(JSON.stringify({
            type: "join_room",
            code: code
        }));
    };
}
