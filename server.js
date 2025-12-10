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

// roomCode -> { players: [ws1, ws2], restartRequests: Set<ws> }
const rooms = {};

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

wss.on("connection", (ws) => {
  console.log("Player connected");
  ws.roomCode = null;
  ws.playerName = "Player";
  ws.isAlive = true;
  ws.score = 0; // default
  ws.isAlive = true;        // New: Track life status
  ws.score = 0;             // New: Track score

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
      if (data.name) ws.playerName = data.name.substring(0, 8);

      rooms[code] = {
        players: [ws],
        restartRequests: new Set()
      };
      ws.roomCode = code;
      ws.isAlive = true;
      ws.score = 0;

      console.log("Room created:", code, "by", ws.playerName);

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
      if (data.name) ws.playerName = data.name.substring(0, 8);

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
      ws.isAlive = true;
      ws.score = 0;

      console.log("Player joined room", code, "as", ws.playerName);

      // Start Game for both
      // Pass ENEMY name to each player
      const p1 = room.players[0];
      const p2 = room.players[1];

      // Reset states on start
      p1.isAlive = true; p1.score = 0;
      p2.isAlive = true; p2.score = 0;
      room.restartRequests.clear();

      if (p1.readyState === WebSocket.OPEN) {
        p1.send(JSON.stringify({
          type: "start_game",
          role: "host",
          code: code,
          enemyName: p2.playerName
        }));
      }

      if (p2.readyState === WebSocket.OPEN) {
        p2.send(JSON.stringify({
          type: "start_game",
          role: "guest",
          code: code,
          enemyName: p1.playerName
        }));
      }
      return;
    }

    // --------- GAME UPDATE (Position/Score) ----------
    if (data.type === "update") {
      ws.score = data.score || 0; // Update server-side score tracking
      // Forward to other player
      const code = ws.roomCode;
      if (code && rooms[code]) {
        rooms[code].players.forEach(p => {
          if (p !== ws && p.readyState === WebSocket.OPEN) {
            p.send(msg.toString());
          }
        });
      }
      return;
    }

    // --------- PLAYER DIED ----------
    if (data.type === "player_died") {
      const code = ws.roomCode;
      if (!code || !rooms[code]) return;

      const room = rooms[code];
      ws.isAlive = false;
      ws.score = data.score || 0;

      console.log(`Player ${ws.playerName} died. Score: ${ws.score}`);

      // Notify other player immediately (so they know opponent died)
      // This helps if we want to show a "X died" notification
      room.players.forEach(p => {
        if (p !== ws && p.readyState === WebSocket.OPEN) {
          p.send(JSON.stringify({ type: "opponent_died", score: ws.score }));
        }
      });

      // Check if GAME OVER (Both dead)
      const allDead = room.players.every(p => !p.isAlive);

      if (allDead) {
        console.log("Both players died. Sending final results.");

        // Determine Winner
        const p1 = room.players[0];
        const p2 = room.players[1];

        if (!p1 || !p2) return; // safety

        let winner = "Draw";
        if (p1.score > p2.score) winner = p1.playerName;
        else if (p2.score > p1.score) winner = p2.playerName;

        // Send Final Result to each
        [p1, p2].forEach(p => {
          // Find opponent
          const opp = (p === p1) ? p2 : p1;
          if (p.readyState === WebSocket.OPEN) {
            p.send(JSON.stringify({
              type: "final_result",
              winner: winner,
              myScore: p.score,
              enemyScore: opp.score,
              enemyName: opp.playerName
            }));
          }
        });
      }
      return;
    }

    // --------- RESTART REQUEST ----------
    if (data.type === "request_restart") {
      const code = ws.roomCode;
      if (!code || !rooms[code]) return;

      const room = rooms[code];
      room.restartRequests.add(ws);

      // Broadcast "waiting" to sender (already handled by client logic mostly, but good to confirm)
      ws.send(JSON.stringify({ type: "waiting_for_restart" }));

      // If both requested
      if (room.restartRequests.size >= 2) {
        console.log("Both players requested restart. Starting new game.");
        room.restartRequests.clear();

        const p1 = room.players[0];
        const p2 = room.players[1];

        // Reset states
        if (p1) { p1.isAlive = true; p1.score = 0; }
        if (p2) { p2.isAlive = true; p2.score = 0; }

        if (p1 && p1.readyState === WebSocket.OPEN) {
          p1.send(JSON.stringify({ type: "start_game", role: "host", code: code, enemyName: p2.playerName }));
        }
        if (p2 && p2.readyState === WebSocket.OPEN) {
          p2.send(JSON.stringify({ type: "start_game", role: "guest", code: code, enemyName: p1.playerName }));
        }
      } else {
        // Notify other player that opponent wants to restart
        room.players.forEach(p => {
          if (p !== ws && p.readyState === WebSocket.OPEN) {
            p.send(JSON.stringify({ type: "opponent_requested_restart" }));
          }
        });
      }
      return;
    }

    // --------- EXIT GAME ----------
    if (data.type === "exit_game") {
      const code = ws.roomCode;
      if (!code || !rooms[code]) return;

      const room = rooms[code];
      console.log(`Player ${ws.playerName} exited. Terminating room ${code}.`);

      // Notify ALL players to exit
      room.players.forEach(p => {
        if (p.readyState === WebSocket.OPEN) {
          p.send(JSON.stringify({ type: "game_terminated" }));
        }
        p.roomCode = null; // Clear their room code
      });

      // Delete room immediately
      delete rooms[code];
      return;
    }

    // --------- GENERIC FORWARDING ----------
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
    room.restartRequests.delete(ws); // clear restart request if they leave

    // agar room khaali ho gaya to delete
    if (room.players.length === 0) {
      delete rooms[code];
      console.log("Room", code, "deleted (empty)");
    } else {
      // Notify remaining player? (Optional, but good UX)
      // room.players[0].send(JSON.stringify({ type: "error", message: "Opponent disconnected." }));
    }
  });
});

