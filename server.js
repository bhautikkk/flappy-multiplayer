const express = require("express");
const WebSocket = require("ws");
const path = require("path");

// ================= HTTP SERVER =====================
const app = express();
const PORT = process.env.PORT || 8080;

// static files (index.html, game.js, menu.js, multiplayer.js, etc.)
app.use(express.static(__dirname));

const server = app.listen(PORT, () => {
  console.log("HTTP server running on port", PORT);
});

// ================= WEBSOCKET SERVER =================
const wss = new WebSocket.Server({ server });
console.log("WebSocket attached, ready.");

// roomCode -> { players: [ws1, ws2] }
const rooms = {};

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

wss.on("connection", (ws) => {
  console.log("Player connected");
  ws.roomCode = null;

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg.toString());
    } catch (e) {
      console.error("Bad message:", msg.toString());
      return;
    }

    // --------- CREATE ROOM ----------
    if (data.type === "create_room") {
      const code = generateRoomCode();
      rooms[code] = { players: [ws] };
      ws.roomCode = code;

      console.log("Room created:", code);

      ws.send(
        JSON.stringify({
          type: "room_created",
          code: code,
        })
      );
      return;
    }

    // --------- JOIN ROOM -------------
    if (data.type === "join_room") {
      const code = data.code;
      const room = rooms[code];

      if (!room || room.players.length >= 2) {
        console.log("Join failed for", code);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Room not found or already full",
          })
        );
        return;
      }

      room.players.push(ws);
      ws.roomCode = code;

      console.log("Player joined room", code);

      // dono players ko start_game bhejo
      room.players.forEach((player, index) => {
        if (player.readyState === WebSocket.OPEN) {
          player.send(
            JSON.stringify({
              type: "start_game",
              role: index === 0 ? "host" : "guest",
              code: code,
            })
          );
        }
      });

      return;
    }

    // --------- BAKI SAARE MSG: room ke dusre player ko forward ----------
    const code = ws.roomCode;
    if (!code || !rooms[code]) return;

    const room = rooms[code];

    room.players.forEach((player) => {
      if (player !== ws && player.readyState === WebSocket.OPEN) {
        player.send(msg.toString());
      }
    });
  });

  ws.on("close", () => {
    console.log("Player disconnected");
    const code = ws.roomCode;
    if (!code) return;
    const room = rooms[code];
    if (!room) return;

    // iss player ko room se hatao
    room.players = room.players.filter((p) => p !== ws);

    // agar room khaali ho gaya to delete
    if (room.players.length === 0) {
      delete rooms[code];
      console.log("Room", code, "deleted (empty)");
    }
  });
});
