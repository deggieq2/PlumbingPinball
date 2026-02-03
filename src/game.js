import { CONFIG, createInitialState, stepState } from "./logic.js";

const canvas = document.getElementById("pinball");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const bonusEl = document.getElementById("bonus");

let state = createInitialState();
let paused = false;

const input = {
  leftFlip: false,
  rightFlip: false,
  launch: false,
};

const KEY_MAP = {
  left: new Set(["ArrowLeft", "KeyA"]),
  right: new Set(["ArrowRight", "KeyD"]),
  launch: new Set(["ArrowUp", "KeyW", "Space"]),
};

const restartGame = () => {
  state = createInitialState();
  paused = false;
};

const handleKeyChange = (event, isDown) => {
  if (KEY_MAP.left.has(event.code)) {
    input.leftFlip = isDown;
    event.preventDefault();
  }

  if (KEY_MAP.right.has(event.code)) {
    input.rightFlip = isDown;
    event.preventDefault();
  }

  if (isDown && KEY_MAP.launch.has(event.code)) {
    input.launch = true;
    event.preventDefault();
  }

  if (isDown && event.code === "KeyP") {
    paused = !paused;
  }

  if (isDown && (event.code === "KeyR" || event.code === "Enter")) {
    restartGame();
  }
};

window.addEventListener("keydown", (event) => handleKeyChange(event, true));
window.addEventListener("keyup", (event) => handleKeyChange(event, false));

const drawBackground = () => {
  ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
  gradient.addColorStop(0, "#18242c");
  gradient.addColorStop(1, "#0c1216");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  ctx.fillStyle = "#1a2a33";
  ctx.fillRect(40, 0, 520, CONFIG.height);

  const noiseGradient = ctx.createLinearGradient(0, 0, CONFIG.width, CONFIG.height);
  noiseGradient.addColorStop(0, "rgba(23, 35, 44, 0.4)");
  noiseGradient.addColorStop(1, "rgba(14, 21, 27, 0.4)");
  ctx.fillStyle = noiseGradient;
  ctx.fillRect(40, 0, 520, CONFIG.height);

  ctx.strokeStyle = "#2f404c";
  ctx.lineWidth = 6;
  ctx.strokeRect(30, 10, 540, CONFIG.height - 20);

  ctx.strokeStyle = "#223039";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(90, 84);
  ctx.lineTo(510, 84);
  ctx.moveTo(90, 640);
  ctx.lineTo(510, 640);
  ctx.stroke();

  ctx.strokeStyle = "#31434f";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(140, 120);
  ctx.lineTo(140, 600);
  ctx.moveTo(460, 120);
  ctx.lineTo(460, 600);
  ctx.stroke();

  ctx.fillStyle = "#202d35";
  ctx.fillRect(70, 130, 40, 460);
  ctx.fillRect(490, 130, 40, 460);

  ctx.strokeStyle = "#3b4c57";
  ctx.lineWidth = 6;
  ctx.strokeRect(70, 130, 40, 460);
  ctx.strokeRect(490, 130, 40, 460);

  ctx.strokeStyle = "#3f5665";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let y = 160; y <= 560; y += 80) {
    ctx.moveTo(70, y);
    ctx.lineTo(110, y);
    ctx.moveTo(490, y);
    ctx.lineTo(530, y);
  }
  ctx.stroke();

  ctx.fillStyle = "#1e2b33";
  ctx.fillRect(470, 80, 70, 620);

  ctx.strokeStyle = "#394b57";
  ctx.lineWidth = 4;
  ctx.strokeRect(470, 80, 70, 620);

  ctx.fillStyle = "#23323a";
  ctx.fillRect(100, 40, 120, 50);
  ctx.fillRect(240, 40, 120, 50);
  ctx.fillRect(380, 40, 120, 50);

  ctx.strokeStyle = "#526471";
  ctx.lineWidth = 3;
  ctx.strokeRect(100, 40, 120, 50);
  ctx.strokeRect(240, 40, 120, 50);
  ctx.strokeRect(380, 40, 120, 50);

  ctx.strokeStyle = "#2a3943";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(470, 660);
  ctx.lineTo(520, 520);
  ctx.lineTo(520, 180);
  ctx.stroke();

  ctx.strokeStyle = "#3a4b58";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(120, 150);
  ctx.quadraticCurveTo(80, 240, 140, 300);
  ctx.stroke();

  ctx.fillStyle = "#2a3b44";
  ctx.fillRect(420, 380, 90, 170);
  ctx.strokeStyle = "#526471";
  ctx.lineWidth = 3;
  ctx.strokeRect(420, 380, 90, 170);

  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  for (let i = 0; i < 14; i += 1) {
    ctx.beginPath();
    ctx.arc(200 + i * 24, 720, 10, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawBumpers = () => {
  state.bumpers.forEach((bumper) => {
    ctx.fillStyle = "#cc5c3c";
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f7d580";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "rgba(247, 213, 128, 0.4)";
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
};

const drawValves = () => {
  state.valves.forEach((valve) => {
    ctx.fillStyle = valve.lit ? "#7ee4ff" : "#49606c";
    ctx.beginPath();
    ctx.arc(valve.x, valve.y, valve.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = valve.lit ? "#d5fbff" : "#24323b";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = valve.lit ? "#d5fbff" : "#202c33";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(valve.x - valve.radius + 2, valve.y);
    ctx.lineTo(valve.x + valve.radius - 2, valve.y);
    ctx.moveTo(valve.x, valve.y - valve.radius + 2);
    ctx.lineTo(valve.x, valve.y + valve.radius - 2);
    ctx.stroke();
  });
};

const drawPaddles = () => {
  const paddles = [
    { data: state.paddles.left, pivot: CONFIG.paddle.leftPivot, color: "#f2f2f2" },
    { data: state.paddles.right, pivot: CONFIG.paddle.rightPivot, color: "#f2f2f2" },
  ];

  paddles.forEach((paddle, index) => {
    const direction = {
      x: Math.cos(paddle.data.angle),
      y: Math.sin(paddle.data.angle),
    };
    const tip = {
      x: paddle.pivot.x + direction.x * CONFIG.paddle.length,
      y: paddle.pivot.y + direction.y * CONFIG.paddle.length,
    };

    ctx.strokeStyle = paddle.color;
    ctx.lineWidth = CONFIG.paddle.thickness;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(paddle.pivot.x, paddle.pivot.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();

    ctx.fillStyle = index === 0 ? "#d97a57" : "#d9b257";
    ctx.beginPath();
    ctx.arc(paddle.pivot.x, paddle.pivot.y, 10, 0, Math.PI * 2);
    ctx.fill();
  });
};

const drawBall = () => {
  ctx.fillStyle = "#f6f1d5";
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, CONFIG.ballRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#f9f6e8";
  ctx.lineWidth = 2;
  ctx.stroke();
};

const drawOverlay = () => {
  if (paused) {
    drawBanner("Paused", "Press P to resume");
    return;
  }

  if (state.status === "waiting") {
    drawBanner("Ready", "Press Up/W or Space to launch");
  }

  if (state.status === "gameover") {
    drawBanner("Game Over", "Press R or Enter to restart");
  }
};

const drawBanner = (title, subtitle) => {
  ctx.fillStyle = "rgba(12, 18, 22, 0.8)";
  ctx.fillRect(60, 360, 480, 140);

  ctx.strokeStyle = "#f6f1d5";
  ctx.lineWidth = 2;
  ctx.strokeRect(60, 360, 480, 140);

  ctx.fillStyle = "#f6f1d5";
  ctx.font = "28px 'IBM Plex Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(title, CONFIG.width / 2, 420);

  ctx.fillStyle = "#aebec8";
  ctx.font = "14px 'IBM Plex Mono', monospace";
  ctx.fillText(subtitle, CONFIG.width / 2, 455);
};

const render = () => {
  drawBackground();
  drawBumpers();
  drawValves();
  drawPaddles();
  drawBall();
  drawOverlay();

  scoreEl.textContent = state.score.toString();
  livesEl.textContent = state.lives.toString();
  bonusEl.textContent = state.bonus.active
    ? `ACTIVE (${Math.ceil(state.bonus.timer)}s)`
    : "OFF";
};

let lastTime = 0;
let accumulator = 0;
const fixedStep = 1 / 60;

const loop = (timestamp) => {
  if (!lastTime) lastTime = timestamp;
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  accumulator += delta;

  if (!paused) {
    while (accumulator >= fixedStep) {
      state = stepState(state, input, fixedStep);
      input.launch = false;
      accumulator -= fixedStep;
    }
  } else {
    input.launch = false;
    accumulator = 0;
  }

  render();
  requestAnimationFrame(loop);
};

render();
requestAnimationFrame(loop);
