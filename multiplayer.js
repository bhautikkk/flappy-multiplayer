// ===== MULTIPLAYER (WebSocket + Rooms) =====
(function () {
  // Same host pe connect karo (Render + local dono me chalega)
  const WS_URL =
    (location.protocol === "https:" ? "wss://" : "ws://") + location.host;

  console.log("Connecting to", WS_URL);
  const socket = new WebSocket(WS_URL);

  const menu = document.getElementById("menuOverlay");
  const btnSolo = document.getElementById("btnSolo");
  const btnCreate = document.getElementById("btnCreate");
  const btnJoin = document.getElementById("btnJoin");
  const roomCodeInput = document.getElementById("roomCodeInput");
  const roomInfo = document.getElementById("roomInfo");

  let currentRoomCode = null;

  socket.addEventListener("open", () => {
    console.log("WebSocket OPEN");
    roomInfo.textContent = "";
  });

  socket.addEventListener("error", (e) => {
    console.error("WebSocket ERROR", e);
    alert("Connection error. Try again later.");
  });

  socket.addEventListener("close", () => {
    console.log("WebSocket CLOSED");
  });

  // ---- Buttons ----

  // SOLO handler ko override mat karo (menu.js ne set kar diya)
  // Yahan sirf Create/Join handle kar rahe hain

  btnCreate.onclick = () => {
    if (socket.readyState !== WebSocket.OPEN) {
      alert("Not connected to server yet. Wait 1–2 sec and try again.");
      return;
    }

    socket.send(JSON.stringify({ type: "create_room" }));
    roomInfo.textContent = "Creating room...";
  };

  btnJoin.onclick = () => {
    const code = roomCodeInput.value.trim();

    if (code.length < 6) {
      roomInfo.textContent = "Enter 6-digit code";
      return;
    }

    if (socket.readyState !== WebSocket.OPEN) {
      alert("Not connected to server yet. Wait 1–2 sec and try again.");
      return;
    }

    socket.send(
      JSON.stringify({
        type: "join_room",
        code: code,
      })
    );

    roomInfo.textContent = "Joining room " + code + "...";
  };

  // ---- Messages from server ----
  socket.addEventListener("message", (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.error("Bad JSON from server:", event.data);
      return;
    }

    console.log("WS message:", data);

    // ROOM CREATED
    if (data.type === "room_created") {
      currentRoomCode = data.code;
      roomCodeInput.value = currentRoomCode;
      roomInfo.textContent = "Room Code: " + currentRoomCode;
      alert("Room Code: " + currentRoomCode);
      return;
    }

    // ERROR (e.g. room not found)
    if (data.type === "error") {
      alert(data.message || "Error");
      roomInfo.textContent = data.message || "Error";
      return;
    }

    // START GAME (both players connected)
    if (data.type === "start_game") {
      currentRoomCode = data.code;
      window.multiplayerMode = "online";
      window.multiplayerRole = data.role; // 'host' or 'guest'

      roomInfo.textContent =
        "Connected! Room " +
        currentRoomCode +
        " (" +
        window.multiplayerRole +
        ")";

      // menu hide, game.js normal se chalega, multiplayer flags set ho gaye
      menu.style.display = "none";
      return;
    }

    // Baaki sab game ke sync messages hain
    if (window.handleMultiplayerMessage) {
      window.handleMultiplayerMessage(data);
    }
  });

  // Dusre scripts ko socket access chahiye to:
  window.multiplayerSocket = socket;
})();
