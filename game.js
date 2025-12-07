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
    over: 2
};

// ======================= ACTION (FIXED FOR MOBILE) ==============
function action(evt) {
    const menu = document.getElementById("menuOverlay");

    // 👉 Agar menu dikha hua hai to game input ignore karo
    // aur default behaviour allow karo (button clicks ke liye)
    if (menu && menu.style.display !== "none") {
        return;
    }

    // Ab yahan aa gaye matlab menu hidden hai, sirf game control chahiye
    if (evt.type === "touchstart") evt.preventDefault();

    switch (state.current) {
        case state.getReady:
            state.current = state.game;
            break;

        case state.game:
            bird.flap();
            break;

        case state.over:
            resetGame();
            break;
    }
}

window.addEventListener("mousedown", action);
window.addEventListener("touchstart", action, { passive: false });
window.addEventListener("keydown", (e) => {
    if (e.code === "Space") action(e);
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
                    state.current = state.over;
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

            ctx.fillStyle = "#73bf2e";

            ctx.fillRect(p.x, 0, this.w, p.h);
            ctx.fillRect(p.x, bottomY, this.w, canvas.height - bottomY - fg.h);

            ctx.strokeStyle = "#555";
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x, 0, this.w, p.h);
            ctx.strokeRect(p.x, bottomY, this.w, canvas.height - bottomY - fg.h);
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
                state.current = state.over;
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
        }

        if (state.current === state.over) {
            let w = 300, h = 250;
            let x = canvas.width / 2 - w / 2;
            let y = canvas.height / 2 - h / 2;

            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.fillRect(x, y, w, h);

            ctx.strokeStyle = "#333";
            ctx.strokeRect(x, y, w, h);

            ctx.fillStyle = "#000";
            ctx.font = "30px Impact";
            ctx.fillText("SCORE", canvas.width / 2, y + 50);

            ctx.font = "50px Impact";
            ctx.fillText(this.value, canvas.width / 2, y + 100);

            ctx.fillStyle = "#e8802e";
            ctx.font = "25px Impact";
            ctx.fillText("BEST: " + this.best, canvas.width / 2, y + 150);

            localStorage.setItem("flappy_full_best", this.best);

            ctx.fillStyle = "#555";
            ctx.font = "20px Arial";
            ctx.fillText("Tap to Restart", canvas.width / 2, y + 220);
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

// ======================= RESET ===========================
function resetGame() {
    bird.speed = 0;
    bird.rotation = 0;
    pipes.position = [];
    score.value = 0;
    frames = 0;
    state.current = state.getReady;
}

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
}

function loop() {
    update();
    draw();
    frames++;
    requestAnimationFrame(loop);
}

loop();
