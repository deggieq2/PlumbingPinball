import { CONFIG, createInitialState, stepState } from "./logic.js";

const canvas = document.getElementById("pinball");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const bonusEl = document.getElementById("bonus");

let state = createInitialState();
let paused = false;

const backgroundImage = new Image();
let backgroundReady = false;
backgroundImage.onload = () => {
  backgroundReady = true;
};
backgroundImage.src = "./assets/image.png";

const daveImage = new Image();
let daveReady = false;
daveImage.onload = () => {
  daveReady = true;
};
daveImage.src = "./assets/dave.png";

const input = {
  leftFlip: false,
  rightFlip: false,
  launch: false,
};

const activeTouches = new Map();

const updateTouchState = () => {
  input.leftFlip = false;
  input.rightFlip = false;
  activeTouches.forEach((side) => {
    if (side === "left") input.leftFlip = true;
    if (side === "right") input.rightFlip = true;
  });
};

const registerTouch = (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const side = x < rect.width / 2 ? "left" : "right";
  activeTouches.set(event.pointerId, side);
  updateTouchState();

  if (state.status === "waiting") {
    input.launch = true;
  }
};

const releaseTouch = (event) => {
  activeTouches.delete(event.pointerId);
  updateTouchState();
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

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  registerTouch(event);
});
canvas.addEventListener("pointerup", releaseTouch);
canvas.addEventListener("pointercancel", releaseTouch);
canvas.addEventListener("pointerleave", releaseTouch);

const drawBackground = () => {
  ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

  if (backgroundReady) {
    ctx.drawImage(backgroundImage, 0, 0, CONFIG.width, CONFIG.height);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    gradient.addColorStop(0, "#18242c");
    gradient.addColorStop(1, "#0c1216");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  ctx.strokeStyle = "rgba(47, 64, 76, 0.9)";
  ctx.lineWidth = 5;
  ctx.strokeRect(24, 10, 552, CONFIG.height - 20);

  const vignette = ctx.createRadialGradient(300, 240, 120, 300, 460, 500);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
};

const drawWallOverlay = () => {
  ctx.save();
  ctx.strokeStyle = "rgba(246, 241, 213, 0.35)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);

  const inset = CONFIG.wallInset;
  ctx.strokeRect(inset, inset, CONFIG.width - inset * 2, CONFIG.height - inset * 2);

  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(inset, CONFIG.drainY);
  ctx.lineTo(CONFIG.width - inset, CONFIG.drainY);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(126, 228, 255, 0.45)";
  ctx.lineWidth = 6;
  CONFIG.guides.forEach((guide) => {
    ctx.beginPath();
    ctx.moveTo(guide.x1, guide.y1);
    ctx.lineTo(guide.x2, guide.y2);
    ctx.stroke();
  });

  ctx.restore();
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

const drawTaunt = () => {
  if (!state.taunt.active) return;

  const alpha = Math.min(state.taunt.timer / CONFIG.tauntDuration, 1);
  const boxWidth = 320;
  const boxHeight = 130;
  const boxX = (CONFIG.width - boxWidth) / 2;
  const boxY = 120;

  ctx.save();
  ctx.globalAlpha = 0.9 * alpha;
  ctx.fillStyle = "rgba(10, 14, 18, 0.85)";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  ctx.strokeStyle = "#f6f1d5";
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  if (daveReady) {
    ctx.drawImage(daveImage, boxX + 14, boxY + 14, 88, 102);
  } else {
    ctx.fillStyle = "#23323a";
    ctx.fillRect(boxX + 14, boxY + 14, 88, 102);
  }

  ctx.fillStyle = "#f6f1d5";
  ctx.font = "18px 'IBM Plex Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText("DAVE:", boxX + 120, boxY + 44);

  ctx.fillStyle = "#aebec8";
  ctx.font = "14px 'IBM Plex Mono', monospace";
  ctx.fillText("Nice try! Ha!", boxX + 120, boxY + 72);
  ctx.fillText("Drop another one.", boxX + 120, boxY + 96);
  ctx.restore();
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
  drawWallOverlay();
  drawBumpers();
  drawValves();
  drawPaddles();
  drawBall();
  drawOverlay();
  drawTaunt();

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
