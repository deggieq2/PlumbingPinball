export const CONFIG = {
  width: 600,
  height: 900,
  wallInset: 18,
  ballRadius: 8,
  gravity: 360,
  maxSpeed: 1100,
  paddle: {
    length: 90,
    thickness: 14,
    speed: 14,
    leftPivot: { x: 190, y: 800 },
    rightPivot: { x: 410, y: 800 },
    leftDown: 0.35,
    leftUp: -0.45,
    rightDown: Math.PI - 0.35,
    rightUp: Math.PI + 0.45,
  },
  guides: [
    { id: "g1", x1: 80, y1: 640, x2: 180, y2: 860, thickness: 12 },
    { id: "g2", x1: 520, y1: 640, x2: 420, y2: 860, thickness: 12 },
  ],
  bumpers: [
    { id: "b1", x: 170, y: 170, radius: 22, score: 140 },
    { id: "b2", x: 300, y: 200, radius: 24, score: 120 },
    { id: "b3", x: 410, y: 180, radius: 22, score: 120 },
    { id: "b4", x: 260, y: 300, radius: 26, score: 160 },
    { id: "b5", x: 380, y: 320, radius: 24, score: 140 },
  ],
  valves: [
    { id: "v1", x: 450, y: 420, radius: 12, score: 90 },
    { id: "v2", x: 470, y: 470, radius: 12, score: 90 },
    { id: "v3", x: 430, y: 520, radius: 12, score: 90 },
  ],
  bonusDuration: 10,
  bonusMultiplier: 2,
  launchSpeed: -620,
  launchSideKick: 110,
  drainY: 880,
  lives: 3,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const magnitude = (x, y) => Math.hypot(x, y);

const normalize = (x, y) => {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
};

const reflectVelocity = (vx, vy, nx, ny, boost = 1) => {
  const dot = vx * nx + vy * ny;
  const rx = (vx - 2 * dot * nx) * boost;
  const ry = (vy - 2 * dot * ny) * boost;
  return { x: rx, y: ry };
};

export const createInitialState = () => {
  const leftDown = CONFIG.paddle.leftDown;
  const rightDown = CONFIG.paddle.rightDown;

  return {
    status: "waiting",
    score: 0,
    lives: CONFIG.lives,
    ball: {
      x: CONFIG.width - CONFIG.wallInset - 40,
      y: CONFIG.drainY - 20,
      vx: 0,
      vy: 0,
    },
    paddles: {
      left: { angle: leftDown },
      right: { angle: rightDown },
    },
    bumpers: CONFIG.bumpers.map((b) => ({ ...b })),
    valves: CONFIG.valves.map((v) => ({ ...v, lit: false })),
    bonus: {
      active: false,
      timer: 0,
      multiplier: CONFIG.bonusMultiplier,
    },
  };
};

const cloneState = (state) => ({
  status: state.status,
  score: state.score,
  lives: state.lives,
  ball: { ...state.ball },
  paddles: {
    left: { ...state.paddles.left },
    right: { ...state.paddles.right },
  },
  bumpers: state.bumpers.map((b) => ({ ...b })),
  valves: state.valves.map((v) => ({ ...v })),
  bonus: { ...state.bonus },
});

const setBallSpeedLimit = (ball) => {
  const speed = magnitude(ball.vx, ball.vy);
  if (speed > CONFIG.maxSpeed) {
    const scale = CONFIG.maxSpeed / speed;
    ball.vx *= scale;
    ball.vy *= scale;
  }
};

const addScore = (state, amount) => {
  const multiplier = state.bonus.active ? state.bonus.multiplier : 1;
  state.score += amount * multiplier;
};

const getPaddleSegment = (paddle, isLeft) => {
  const pivot = isLeft ? CONFIG.paddle.leftPivot : CONFIG.paddle.rightPivot;
  const length = CONFIG.paddle.length;
  const angle = paddle.angle;
  const direction = {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
  return {
    p1: { ...pivot },
    p2: {
      x: pivot.x + direction.x * length,
      y: pivot.y + direction.y * length,
    },
  };
};

const resolveWallCollisions = (state) => {
  const { ball } = state;
  const left = CONFIG.wallInset + CONFIG.ballRadius;
  const right = CONFIG.width - CONFIG.wallInset - CONFIG.ballRadius;
  const top = CONFIG.wallInset + CONFIG.ballRadius;

  if (ball.x < left) {
    ball.x = left;
    ball.vx = Math.abs(ball.vx);
  }

  if (ball.x > right) {
    ball.x = right;
    ball.vx = -Math.abs(ball.vx);
  }

  if (ball.y < top) {
    ball.y = top;
    ball.vy = Math.abs(ball.vy);
  }
};

const resolveCircleCollision = (state, circle, boost = 1) => {
  const { ball } = state;
  const dx = ball.x - circle.x;
  const dy = ball.y - circle.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = CONFIG.ballRadius + circle.radius;

  if (distance >= minDistance || distance === 0) return false;

  const normal = normalize(dx, dy);
  const approach = ball.vx * normal.x + ball.vy * normal.y;
  if (approach >= 0) return false;

  const reflected = reflectVelocity(ball.vx, ball.vy, normal.x, normal.y, boost);
  ball.vx = reflected.x;
  ball.vy = reflected.y;

  ball.x = circle.x + normal.x * (minDistance + 0.5);
  ball.y = circle.y + normal.y * (minDistance + 0.5);

  return true;
};

const resolvePaddleCollision = (state, isLeft, active) => {
  const { ball } = state;
  const segment = getPaddleSegment(state.paddles[isLeft ? "left" : "right"], isLeft);
  const thickness = CONFIG.paddle.thickness / 2 + CONFIG.ballRadius;

  const segDx = segment.p2.x - segment.p1.x;
  const segDy = segment.p2.y - segment.p1.y;
  const segLenSq = segDx * segDx + segDy * segDy || 1;
  const t = clamp(
    ((ball.x - segment.p1.x) * segDx + (ball.y - segment.p1.y) * segDy) / segLenSq,
    0,
    1
  );
  const closest = {
    x: segment.p1.x + segDx * t,
    y: segment.p1.y + segDy * t,
  };
  const dx = ball.x - closest.x;
  const dy = ball.y - closest.y;
  const distance = Math.hypot(dx, dy);

  if (distance >= thickness || distance === 0) return false;

  const normal = normalize(dx, dy);
  const approach = ball.vx * normal.x + ball.vy * normal.y;
  if (approach >= 0) return false;

  const boost = active ? 1.08 : 1.02;
  const reflected = reflectVelocity(ball.vx, ball.vy, normal.x, normal.y, boost);
  ball.vx = reflected.x;
  ball.vy = reflected.y - (active ? 90 : 30);

  ball.x = closest.x + normal.x * (thickness + 0.5);
  ball.y = closest.y + normal.y * (thickness + 0.5);

  return true;
};

const resolveGuideCollisions = (state) => {
  const { ball } = state;

  CONFIG.guides.forEach((guide) => {
    const segDx = guide.x2 - guide.x1;
    const segDy = guide.y2 - guide.y1;
    const segLenSq = segDx * segDx + segDy * segDy || 1;
    const t = clamp(
      ((ball.x - guide.x1) * segDx + (ball.y - guide.y1) * segDy) / segLenSq,
      0,
      1
    );
    const closest = {
      x: guide.x1 + segDx * t,
      y: guide.y1 + segDy * t,
    };
    const dx = ball.x - closest.x;
    const dy = ball.y - closest.y;
    const distance = Math.hypot(dx, dy);
    const thickness = guide.thickness / 2 + CONFIG.ballRadius;

    if (distance >= thickness || distance === 0) return;

    const normal = normalize(dx, dy);
    const approach = ball.vx * normal.x + ball.vy * normal.y;
    if (approach >= 0) return;

    const reflected = reflectVelocity(ball.vx, ball.vy, normal.x, normal.y, 1.02);
    ball.vx = reflected.x;
    ball.vy = reflected.y;

    ball.x = closest.x + normal.x * (thickness + 0.5);
    ball.y = closest.y + normal.y * (thickness + 0.5);
  });
};

const updatePaddles = (state, input, dt) => {
  const speed = CONFIG.paddle.speed;
  const left = state.paddles.left;
  const right = state.paddles.right;
  const leftTarget = input.leftFlip ? CONFIG.paddle.leftUp : CONFIG.paddle.leftDown;
  const rightTarget = input.rightFlip ? CONFIG.paddle.rightUp : CONFIG.paddle.rightDown;

  left.angle += clamp(leftTarget - left.angle, -speed * dt, speed * dt);
  right.angle += clamp(rightTarget - right.angle, -speed * dt, speed * dt);
};

const advanceBall = (state, dt) => {
  const { ball } = state;
  ball.vy += CONFIG.gravity * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  setBallSpeedLimit(ball);
};

const handleBumpers = (state) => {
  state.bumpers.forEach((bumper) => {
    if (resolveCircleCollision(state, bumper, 1.2)) {
      addScore(state, bumper.score);
    }
  });
};

const handleValves = (state) => {
  state.valves.forEach((valve) => {
    if (valve.lit) return;
    if (resolveCircleCollision(state, valve, 1.08)) {
      valve.lit = true;
      addScore(state, valve.score);
    }
  });

  const allLit = state.valves.every((valve) => valve.lit);
  if (allLit && !state.bonus.active) {
    state.bonus.active = true;
    state.bonus.timer = CONFIG.bonusDuration;
    addScore(state, 250);
  }
};

const updateBonus = (state, dt) => {
  if (!state.bonus.active) return;
  state.bonus.timer -= dt;
  if (state.bonus.timer > 0) return;
  state.bonus.active = false;
  state.bonus.timer = 0;
  state.valves.forEach((valve) => {
    valve.lit = false;
  });
};

const handleDrain = (state) => {
  if (state.ball.y - CONFIG.ballRadius < CONFIG.drainY) return false;

  state.lives -= 1;
  if (state.lives <= 0) {
    state.status = "gameover";
  } else {
    resetBall(state);
    state.status = "waiting";
  }
  return true;
};

const resetBall = (state) => {
  state.ball.x = CONFIG.width - CONFIG.wallInset - 40;
  state.ball.y = CONFIG.drainY - 20;
  state.ball.vx = 0;
  state.ball.vy = 0;
};

const launchBall = (state) => {
  state.ball.vx = -CONFIG.launchSideKick;
  state.ball.vy = CONFIG.launchSpeed;
  state.status = "playing";
};

export const stepState = (state, input, dt) => {
  const next = cloneState(state);

  if (next.status === "gameover") return next;

  updatePaddles(next, input, dt);

  if (next.status === "waiting") {
    if (input.launch) {
      launchBall(next);
    }
    return next;
  }

  advanceBall(next, dt);
  resolveWallCollisions(next);
  handleBumpers(next);
  handleValves(next);
  resolvePaddleCollision(next, true, input.leftFlip);
  resolvePaddleCollision(next, false, input.rightFlip);
  resolveGuideCollisions(next);
  updateBonus(next, dt);
  handleDrain(next);

  return next;
};
