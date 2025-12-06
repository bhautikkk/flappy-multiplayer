const path = require("path");
const express = require("express");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 8080;

// static files serve karna (index.html, game.js, menu.js, multiplayer.js, etc.)
app.use(express.static(__dirname));

// HTTP server start
const server = app.listen(PORT, () => {
    console.log("HTTP server running on port", PORT);
});

// WebSocket server, same HTTP server ke upar
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
    console.log("Player connected");

    ws.on("message", (msg) => {
        // simple broadcast: jo message ek player se aaya,
        // sab doosre players ko forward kar do
        for (const client of wss.clients) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(msg.toString());
            }
        }
    });

    ws.on("close", () => {
        console.log("Player disconnected");
    });
});

console.log("WebSocket attached, ready.");
