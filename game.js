// ======================= CANVAS SETUP ===========================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ======================= GAME VARIABLES =========================
let frames = 0;
const DEGREE = Math.PI / 180;

const state = {
  current: 0,
  getReady: 0,
  game: 1,
  over: 2,
  spectating: 3
};

// Global flags for Multiplay Logic
// window.playerName / window.enemyName / window.waitingForRestart / window.multiplayerMode

// ======================= ACTION (FIXED FOR MOBILE) ==============
function action(evt) {
  const menu = document.getElementById("menuOverlay");

  // 👉 Agar menu dikha hua hai to game input ignore karo
  // aur default behaviour allow karo (button clicks ke liye)
  if (menu && menu.style.display !== "none") {
    return;
  }

  let rect = canvas.getBoundingClientRect();
  let clickX = evt.clientX - rect.left;
  let clickY = evt.clientY - rect.top;

  // Handle touch
  if (evt.type === "touchstart") {
    evt.preventDefault();
    clickX = evt.touches[0].clientX - rect.left;
    clickY = evt.touches[0].clientY - rect.top;
  }

  // GAME OVER CLICKS (Restart / Exit)
  if (state.current === state.over) {
    // Simple hitbox approximation (Center screen)
    let w = 300; // box width
    let h = 320; // box height (increased for buttons)
    let x = canvas.width / 2 - w / 2;
    let y = canvas.height / 2 - h / 2;

    // RESTART BUTTON (Approx y + 200 to y + 240)
    if (clickX >= x && clickX <= x + w && clickY >= y + 200 && clickY <= y + 250) {
      if (window.multiplayerMode === "online") {
        if (window.waitingForRestart) return;
        if (window.multiplayerSocket && window.multiplayerSocket.readyState === 1) {
          window.multiplayerSocket.send(JSON.stringify({ type: "request_restart" }));
        }
        window.waitingForRestart = true;
      } else {
        resetGame();
      }
      return;
    }

    // EXIT BUTTON (Approx y + 260 to y + 300)
    if (clickX >= x && clickX <= x + w && clickY >= y + 260 && clickY <= y + 310) {
      if (window.multiplayerMode === "online") {
        if (window.multiplayerSocket) {
          window.multiplayerSocket.send(JSON.stringify({ type: "exit_game" }));
        }
        // Fallback if loose connection
        setTimeout(() => location.reload(), 500);
      } else {
        location.reload();
      }
      return;
    }

    // Agar buttons pe nahi laga, to default restart behavior (old style)
    // But with buttons, let's restrict click to buttons to avoid accidents
    // Or keep it looser? Let's restricting to buttons for clarity.
    // Actually, original code allowed any click. Let's allowing any click ONLY for Solo if we want fast retry.
    // But user asked for specific buttons. So let's stick to buttons.
    return;
  }

  switch (state.current) {
    case state.getReady:
      state.current = state.game;
      break;

    case state.game:
      bird.flap();
      break;
  }
}

// Make resetGame globally accessible for WS callback
window.resetGame = function () {
  bird.speed = 0;
  bird.rotation = 0;
  pipes.position = [];
  score.value = 0;
  frames = 0;
  state.current = state.getReady;
  window.waitingForRestart = false;
  window.opponentWantsRestart = false; // Reset flag
  window.finalResult = null;

  // Clear enemy score too if needed (though it comes from server updates)
  // In strict sync, server sends start_game which resets things.
  window.enemyScore = 0;
};


window.addEventListener("mousedown", action);
window.addEventListener("touchstart", action, { passive: false });
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") action({ type: "keydown" }); // Mock event
});

// ======================= BIRD ===========================
const bird = {
  x: 50,
  y: 150,
  w: 34,
  h: 24,
  speed: 0,
  gravity: 0.25,
  jump: 4.6,
  rotation: 0,

  draw() {
    ctx.save();

    let drawX = Math.min(canvas.width * 0.2, 100);
    ctx.translate(drawX, this.y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = "#FFD700";
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";
    ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);

    ctx.fillStyle = "#FFF";
    ctx.fillRect(2, -8, 10, 10);
    ctx.strokeRect(2, -8, 10, 10);

    ctx.fillStyle = "#000";
    ctx.fillRect(8, -5, 2, 2);

    ctx.fillStyle = "#FF4500";
    ctx.fillRect(6, 4, 14, 8);
    ctx.strokeRect(6, 4, 14, 8);

    ctx.restore();
  },

  flap() {
    this.speed = -this.jump;
  },

  update() {
    let startY = canvas.height / 2 - 50;

    if (state.current === state.getReady) {
      this.y = startY - 10 * Math.cos(frames * 0.1);
      this.rotation = 0;
    } else {
      this.speed += this.gravity;
      this.y += this.speed;

      if (this.speed < this.jump / 2) {
        this.rotation = -25 * DEGREE;
      } else {
        this.rotation += 5 * DEGREE;
        if (this.rotation > 90 * DEGREE) this.rotation = 90 * DEGREE;
      }

      if (this.y + this.h / 2 >= canvas.height - fg.h) {
        this.y = canvas.height - fg.h - this.h / 2;
        if (state.current === state.game) {
          if (window.multiplayerMode === "online") {
            state.current = state.spectating;
            if (window.multiplayerSocket && window.multiplayerSocket.readyState === 1) {
              window.multiplayerSocket.send(JSON.stringify({ type: "player_died", score: score.value }));
            }
          } else {
            state.current = state.over;
          }
        }
      }
    }
  }
};

// ======================= BACKGROUND ===========================
const bg = {
  draw() {
    ctx.fillStyle = "#70c5ce";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(100, canvas.height - 200, 30, 0, Math.PI * 2);
    ctx.arc(140, canvas.height - 190, 40, 0, Math.PI * 2);
    ctx.arc(180, canvas.height - 200, 30, 0, Math.PI * 2);
    ctx.fill();
  }
};

// ======================= GROUND ===========================
const fg = {
  h: 100,
  x: 0,
  dx: 2,

  draw() {
    ctx.fillStyle = "#ded895";
    ctx.fillRect(0, canvas.height - this.h, canvas.width, this.h);

    ctx.fillStyle = "#73bf2e";
    ctx.fillRect(0, canvas.height - this.h, canvas.width, 15);

    ctx.strokeStyle = "#558c22";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - this.h + 15);
    ctx.lineTo(canvas.width, canvas.height - this.h + 15);
    ctx.stroke();
  },

  update() {
    if (state.current === state.game) {
      this.x = (this.x - this.dx) % 20;
    }
  }
};

// ======================= PIPES ===========================
const pipes = {
  position: [],
  w: 60,
  gap: 120,
  dx: 3,

  draw() {
    for (let p of this.position) {
      let bottomY = p.h + this.gap;

      // Pipe Body
      ctx.fillStyle = "#73bf2e";
      ctx.fillRect(p.x, 0, this.w, p.h);
      ctx.fillRect(p.x, bottomY, this.w, canvas.height - bottomY - fg.h);

      // Pipe Border
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, 0, this.w, p.h);
      ctx.strokeRect(p.x, bottomY, this.w, canvas.height - bottomY - fg.h);

      // Pipe Caps (Rims)
      // Top Pipe Cap (at p.h - 20)
      ctx.fillStyle = "#73bf2e";
      ctx.fillRect(p.x - 2, p.h - 20, this.w + 4, 20);
      ctx.strokeRect(p.x - 2, p.h - 20, this.w + 4, 20);

      // Bottom Pipe Cap (at bottomY)
      ctx.fillRect(p.x - 2, bottomY, this.w + 4, 20);
      ctx.strokeRect(p.x - 2, bottomY, this.w + 4, 20);
    }
  },

  update() {
    if (state.current !== state.game) return;

    if (frames % 100 === 0) {
      let minH = canvas.height * 0.1;
      let maxH = canvas.height - fg.h - this.gap - minH;
      let h = Math.floor(Math.random() * (maxH - minH + 1) + minH);

      this.position.push({ x: canvas.width, h });
    }

    for (let i = 0; i < this.position.length; i++) {
      let p = this.position[i];
      p.x -= this.dx;

      let birdX = Math.min(canvas.width * 0.2, 100);

      if (
        birdX + bird.w / 2 > p.x &&
        birdX - bird.w / 2 < p.x + this.w &&
        (bird.y - bird.h / 2 < p.h ||
          bird.y + bird.h / 2 > p.h + this.gap)
      ) {
        if (window.multiplayerMode === "online") {
          state.current = state.spectating;
          if (window.multiplayerSocket && window.multiplayerSocket.readyState === 1) {
            window.multiplayerSocket.send(JSON.stringify({ type: "player_died", score: score.value }));
          }
        } else {
          state.current = state.over;
        }
      }

      if (p.x + this.w <= 0) {
        this.position.shift();
        score.value++;
        score.best = Math.max(score.value, score.best);
      }
    }
  }
};

// ======================= SCORE ===========================
const score = {
  best: localStorage.getItem("flappy_full_best") || 0,
  value: 0,

  draw() {
    ctx.fillStyle = "#FFF";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.textAlign = "center";

    if (state.current === state.game) {
      ctx.font = "bold 60px Arial";
      ctx.fillText(this.value, canvas.width / 2, 100);
      ctx.strokeText(this.value, canvas.width / 2, 100);

      if (window.playerName) {
        ctx.font = "20px Arial";
        ctx.fillText("You", canvas.width * 0.2, 40);
      }
      if (window.enemyName) {
        let eScore = window.enemyScore || 0;
        ctx.font = "20px Arial";
        ctx.fillText(window.enemyName + ": " + eScore, canvas.width * 0.8, 40);
      }
    }

    if (state.current === state.spectating) {
      // Semi-transparent BG
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let w = 320, h = 250;
      let x = canvas.width / 2 - w / 2;
      let y = canvas.height / 2 - h / 2;

      // Box
      ctx.fillStyle = "#fff";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = "#000";
      ctx.textAlign = "center";

      // Line 1: Header
      ctx.font = "bold 24px Arial";
      ctx.fillText("YOU ARE SPECTATING...", canvas.width / 2, y + 40);

      // Line 2: You : Score
      ctx.font = "20px Arial";
      ctx.fillText("You : " + score.value, canvas.width / 2, y + 90);

      // Line 3: Friend : Score
      let eScore = window.enemyScore || 0;
      let eName = window.enemyName || "Friend";
      ctx.fillText(eName + " : " + eScore, canvas.width / 2, y + 130);

      // Line 4: Status
      ctx.fillStyle = "#e91e63"; // distinct color
      ctx.font = "bold 18px Arial";
      let statusName = window.enemyName || "Friend";
      ctx.fillText(statusName + " is still playing...", canvas.width / 2, y + 190);
    }

    if (state.current === state.over) {
      let w = 300, h = 320;
      let x = canvas.width / 2 - w / 2;
      let y = canvas.height / 2 - h / 2;

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = "#333";
      ctx.strokeRect(x, y, w, h);

      if (window.multiplayerMode === "online" && window.finalResult) {
        // MULTIPLAYER RESULT
        let res = window.finalResult; // { winner, myScore, enemyScore }

        ctx.fillStyle = (res.winner === window.playerName) ? "#4caf50" : "#f44336";
        ctx.font = "40px Impact";
        let title = (res.winner === window.playerName) ? "YOU WIN!" : "YOU LOSE!";
        if (res.winner === "Draw") title = "DRAW!";
        ctx.fillText(title, canvas.width / 2, y + 50);

        ctx.fillStyle = "#000";
        ctx.font = "20px Arial";
        ctx.fillText("Your Score: " + res.myScore, canvas.width / 2, y + 100);

        let eName = window.enemyName || "Enemy";
        ctx.fillText(eName + " Score: " + res.enemyScore, canvas.width / 2, y + 130);

      } else {
        // SOLO RESULT
        ctx.fillStyle = "#000";
        ctx.font = "30px Impact";
        ctx.fillText("SCORE", canvas.width / 2, y + 50);

        ctx.font = "50px Impact";
        ctx.fillText(this.value, canvas.width / 2, y + 100);

        ctx.fillStyle = "#e8802e";
        ctx.font = "25px Impact";
        ctx.fillText("BEST: " + this.best, canvas.width / 2, y + 150);
        localStorage.setItem("flappy_full_best", this.best);
      }

      // RESTART BUTTON
      ctx.fillStyle = window.waitingForRestart ? "#999" : "#4caf50";
      ctx.fillRect(x + 50, y + 200, 200, 50);
      ctx.fillStyle = "#fff";
      ctx.font = "20px Arial";

      let btnText = "Restart";
      if (window.waitingForRestart) btnText = "Waiting for friend...";
      ctx.fillText(btnText, x + 150, y + 232);

      // Opponent wants restart notification
      if (window.multiplayerMode === "online" && window.opponentWantsRestart && !window.waitingForRestart) {
        ctx.fillStyle = "#E91E63";
        ctx.font = "bold 14px Arial";
        let oppName = window.enemyName || "Friend";
        ctx.fillText(oppName + " wants to play!", canvas.width / 2, y + 190);
      }
      if (window.waitingForRestart) {
        ctx.fillStyle = "#555";
        ctx.font = "italic 14px Arial";
        let oppName = window.enemyName || "friend";
        ctx.fillText("Waiting for " + oppName + " to restart...", canvas.width / 2, y + 190);
      }

      // EXIT BUTTON
      ctx.fillStyle = "#f44336";
      ctx.fillRect(x + 50, y + 260, 200, 50);
      ctx.fillStyle = "#fff";
      ctx.font = "20px Arial";
      ctx.fillText("Exit", x + 150, y + 292);
    }


    if (state.current === state.getReady) {
      ctx.fillStyle = "#000";
      ctx.font = "40px Impact";
      ctx.fillText("GET READY", canvas.width / 2, canvas.height / 2 - 50);

      ctx.font = "20px Arial";
      ctx.fillText("Tap to Fly", canvas.width / 2, canvas.height / 2);
    }
  }
};

// ======================= LOOP ===========================
function draw() {
  bg.draw();
  pipes.draw();
  fg.draw();
  bird.draw();
  score.draw();
}

function update() {
  bird.update();
  fg.update();
  pipes.update();

  // Send Multiplayer Updates
  if (state.current === state.game && window.multiplayerMode === "online" && frames % 15 === 0) {
    if (window.multiplayerSocket && window.multiplayerSocket.readyState === 1) {
      window.multiplayerSocket.send(JSON.stringify({
        type: "update",
        y: bird.y,
        score: score.value
      }));
    }
  }
}

function loop() {
  update();
  draw();
  frames++;
  requestAnimationFrame(loop);
}

// Hook for Multiplayer logic
window.handleMultiplayerMessage = function (data) {
  if (data.type === "opponent_died") {
    // Optional: Show notification?
  }
  if (data.type === "final_result") {
    // Both dead, show result
    window.finalResult = data;
    state.current = state.over;
  }
  if (data.type === "update") {
    // Always update enemy score
    window.enemyScore = data.score;
  }
  if (data.type === "opponent_requested_restart") {
    window.opponentWantsRestart = true;
  }
  if (data.type === "game_terminated") {
    location.reload(); // Force exit to main menu
  }
};

loop();

