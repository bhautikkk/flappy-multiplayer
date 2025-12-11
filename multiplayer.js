// ===== MULTIPLAYER (WebSocket + Rooms) =====
(function () {
  const WS_URL =
    (location.protocol === "https:" ? "wss://" : "ws://") + location.host;

  console.log("Connecting to", WS_URL);
  let socket = null; // connect on demand

  const menu = document.getElementById("menuOverlay");
  const btnSolo = document.getElementById("btnSolo");
  const btnCreate = document.getElementById("btnCreate");
  const btnJoin = document.getElementById("btnJoin");
  const roomCodeInput = document.getElementById("roomCodeInput");
  const roomInfo = document.getElementById("roomInfo");
  const nameInput = document.getElementById("playerName");

  // New UI Elements
  const createdRoomRow = document.getElementById("createdRoomRow");
  const createdRoomCode = document.getElementById("createdRoomCode");
  const btnCopyCode = document.getElementById("btnCopyCode");

  let currentRoomCode = null;

  function connectSocket(callback) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      callback();
      return;
    }

    socket = new WebSocket(WS_URL);

    socket.addEventListener("open", () => {
      console.log("WebSocket OPEN");
      callback();
    });

    socket.addEventListener("error", (e) => {
      console.error("WebSocket ERROR", e);
      roomInfo.textContent = "Connection error.";
      enableButtons();
    });

    socket.addEventListener("close", () => {
      console.log("WebSocket CLOSED");
    });

    // Handle Messages
    socket.addEventListener("message", handleMessage);

    // Global Access
    window.multiplayerSocket = socket;
  }

  function disableButtons() {
    btnCreate.disabled = true;
    btnJoin.disabled = true;
    if (nameInput) nameInput.disabled = true;
    if (roomCodeInput) roomCodeInput.disabled = true;
  }

  function enableButtons() {
    btnCreate.disabled = false;
    btnJoin.disabled = false;
    if (nameInput) nameInput.disabled = false;
    if (roomCodeInput) roomCodeInput.disabled = false;
  }

  // ---- Buttons ----

  btnCreate.onclick = () => {
    const name = nameInput.value.trim();
    if (!name) {
      roomInfo.textContent = "Please enter your name!";
      roomInfo.style.color = "red";
      return;
    }
    roomInfo.style.color = "#222";
    window.playerName = name; // Save locally

    roomInfo.textContent = "Creating room... (approx 2s)";
    disableButtons();

    // 2s Delay
    setTimeout(() => {
      connectSocket(() => {
        socket.send(JSON.stringify({ type: "create_room", name: name }));
      });
    }, 2000);
  };

  btnJoin.onclick = () => {
    const code = roomCodeInput.value.trim();
    const name = nameInput.value.trim();

    if (!name) {
      roomInfo.textContent = "Please enter your name!";
      roomInfo.style.color = "red";
      return;
    }
    roomInfo.style.color = "#222";
    window.playerName = name;

    if (code.length < 6) {
      roomInfo.textContent = "Enter 6-digit code";
      return;
    }

    roomInfo.textContent = "Joining room " + code + "... (approx 2s)";
    disableButtons();

    // 2s Delay
    setTimeout(() => {
      connectSocket(() => {
        socket.send(JSON.stringify({ type: "join_room", code: code, name: name }));
      });
    }, 2000);
  };

  if (btnCopyCode) {
    btnCopyCode.onclick = () => {
      if (createdRoomCode && createdRoomCode.value) {
        createdRoomCode.select();
        document.execCommand("copy");
        btnCopyCode.innerText = "Copied!";
        setTimeout(() => btnCopyCode.innerText = "Copy", 1500);
      }
    };
  }

  // ---- Messages from server ----
  function handleMessage(event) {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.error("Bad JSON:", event.data);
      return;
    }

    console.log("WS message:", data);

    // ROOM CREATED (Host View)
    if (data.type === "room_created") {
      currentRoomCode = data.code;

      // Update UI for Host Waiting
      roomInfo.textContent = "";
      btnCreate.style.display = "none";
      btnJoin.parentElement.style.display = "none"; // Hide Join row
      btnSolo.style.display = "none";
      nameInput.disabled = true;

      // Show Code & Waiting Logic
      if (createdRoomRow) {
        createdRoomRow.style.display = "flex";
        createdRoomCode.value = currentRoomCode;
      }
      return;
    }

    // ERROR
    if (data.type === "error") {
      alert(data.message || "Error");
      roomInfo.textContent = data.message || "Error";
      enableButtons();
      return;
    }

    // START GAME
    if (data.type === "start_game") {
      currentRoomCode = data.code;
      window.multiplayerMode = "online";
      window.multiplayerRole = data.role; // 'host' or 'guest'

      // Store Enemy Name
      window.enemyName = data.enemyName || "Opponent";

      console.log("Game Starting! Enemy:", window.enemyName);

      roomInfo.textContent = "Connected!";
      menu.style.display = "none";

      // Reset any waiting UI if game restarts
      if (createdRoomRow) createdRoomRow.style.display = "none";

      // Ensure game is reset/ready
      if (window.resetGame) window.resetGame();

      return;
    }

    // RESTART SYNC (Waiting state)
    if (data.type === "waiting_for_restart") {
      // Draw this on canvas or show overlay? 
      // Game.js will handle drawing "Waiting for friend..." based on a flag
      window.waitingForRestart = true;
      return;
    }

    // GAME UPDATES
    if (window.handleMultiplayerMessage) {
      window.handleMultiplayerMessage(data);
    }
  };

})();
