// ================================
// BASIC MULTIPLAYER STATE
// ================================
let mpMode = "solo"; // "solo" | "multi"
let socket = null;

let otherBirdY = null;
let otherScore = 0;
let otherPhase = 0;
let otherIsDead = false;
let localDead = false;
let restartTriggered = false;

// original functions save
const originalScoreDraw = score.draw;
const originalUpdate = window.update;
const originalDraw = window.draw;

// ================================
// WS URL (local + live dono ke liye)
// ================================
function getWsUrl() {
    // Local par run kare to localhost:8080
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
        return "ws://localhost:8080";
    }
    // Render / internet par:
    const proto = location.protocol === "https:" ? "wss://" : "ws://";
    // yahan host automatically "flappy-multiplayer.onrender.com" hoga live pe
    return proto + location.host;
}

// ================================
// CONNECT WEBSOCKET
// ================================
function connectWebSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) return;

    socket = new WebSocket(getWsUrl());

    socket.onopen = () => {
        console.log("Connected to WS");
    };

    socket.onmessage = (evt) => {
        try {
            const data = JSON.parse(evt.data);
            if (data.type === "state") {
                otherBirdY = data.y;
                otherScore = data.score;
                otherPhase = data.phase;
                otherIsDead = data.dead;
            }
        } catch (e) {
            console.error("WS message parse error", e);
        }
    };

    socket.onclose = () => {
        console.log("WS disconnected");
    };
}

// ================================
// SEND STATE TO OTHERS
// ================================
function sendState() {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
        type: "state",
        y: bird.y,
        score: score.value,
        phase: state.current,
        dead: localDead
    }));
}

// ================================
// DRAW GHOST BIRD
// ================================
function drawOtherPlayer() {
    if (mpMode === "solo") return;
    if (otherBirdY == null) return;
    if (otherIsDead) return;

    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillRect(40, otherBirdY, 34, 24);
}

// ================================
// OVERRIDE SCORE.DRAW
// ================================
score.draw = function () {
    // SOLO → original
    if (mpMode === "solo") {
        return originalScoreDraw.call(score);
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.fillStyle = "#FFF";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.textAlign = "center";

    // GAME STATE: top scoreboard
    if (state.current === state.game) {
        ctx.font = "bold 32px Arial";
        ctx.fillText("You: " + score.value, centerX, 60);
        ctx.strokeText("You: " + score.value, centerX, 60);

        ctx.font = "bold 24px Arial";
        ctx.fillText("Friend: " + otherScore, centerX, 95);
        ctx.strokeText("Friend: " + otherScore, centerX, 95);
        return;
    }

    // MAIN dead, friend alive → spectate
    if (state.current === state.over && localDead && !otherIsDead) {
        ctx.fillStyle = "#000";
        ctx.font = "32px Impact";
        ctx.fillText("SPECTATING...", centerX, centerY - 30);

        ctx.font = "20px Arial";
        ctx.fillText("Your score: " + score.value, centerX, centerY + 5);
        ctx.fillText("Friend: " + otherScore, centerX, centerY + 30);
        return;
    }

    // DONO dead → final result box
    if (state.current === state.over && localDead && otherIsDead) {
        const boxW = 320;
        const boxH = 220;
        const boxX = centerX - boxW / 2;
        const boxY = centerY - boxH / 2;

        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = "#333";
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        ctx.fillStyle = "#000";
        ctx.font = "30px Impact";
        ctx.fillText("RESULTS", centerX, boxY + 40);

        ctx.font = "22px Arial";
        ctx.fillText("You: " + score.value, centerX, boxY + 85);
        ctx.fillText("Friend: " + otherScore, centerX, boxY + 115);

        let msg = "DRAW";
        if (score.value > otherScore) msg = "YOU WIN!";
        else if (score.value < otherScore) msg = "YOU LOSE";

        ctx.fillStyle = "#e8802e";
        ctx.font = "26px Impact";
        ctx.fillText(msg, centerX, boxY + 160);

        ctx.fillStyle = "#555";
        ctx.font = "18px Arial";
        ctx.fillText("New round in a moment...", centerX, boxY + 190);

        if (!restartTriggered) {
            restartTriggered = true;
            setTimeout(() => {
                resetGame();
                localDead = false;
                otherIsDead = false;
                otherBirdY = null;
                otherScore = 0;
                otherPhase = 0;
                restartTriggered = false;
            }, 2000);
        }
        return;
    }

    // Baki sab cases me original
    return originalScoreDraw.call(score);
};

// ================================
// OVERRIDE UPDATE & DRAW
// ================================
window.update = function () {
    originalUpdate();

    if (mpMode !== "solo") {
        if (state.current === state.game) {
            sendState();
        } else if (state.current === state.over && !localDead) {
            localDead = true;
            sendState();
        }
    }
};

window.draw = function () {
    originalDraw();
    drawOtherPlayer();
};

// ================================
// PUBLIC FUNCTIONS FOR MENU
// ================================
window.startSolo = function () {
    mpMode = "solo";
    localDead = false;
    otherIsDead = false;
    otherBirdY = null;
    otherScore = 0;
    otherPhase = 0;
    restartTriggered = false;

    document.getElementById("menuOverlay").style.display = "none";
    resetGame();
};

window.startMulti = function () {
    mpMode = "multi";
    localDead = false;
    otherIsDead = false;
    otherBirdY = null;
    otherScore = 0;
    otherPhase = 0;
    restartTriggered = false;

    connectWebSocket();
    document.getElementById("menuOverlay").style.display = "none";
    resetGame();
};

console.log("multiplayer.js loaded");
