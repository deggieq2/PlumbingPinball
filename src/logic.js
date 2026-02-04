export const CONFIG = {
  width: 600,
  height: 900,
  wallInset: 18,
  ballRadius: 8,
  gravity: 360,
  maxSpeed: 1100,
  paddle: {
    length: 98,
    thickness: 14,
    speed: 14,
    leftPivot: { x: 185, y: 805 },
    rightPivot: { x: 415, y: 805 },
    leftDown: 0.35,
    leftUp: -0.45,
    rightDown: Math.PI - 0.35,
    rightUp: Math.PI + 0.45,
    damping: 0.86,
  },
  guides: [
    { id: "g1", x1: 140, y1: 620, x2: 205, y2: 805, thickness: 12 },
    { id: "g2", x1: 460, y1: 620, x2: 395, y2: 805, thickness: 12 },
    { id: "g3", x1: 520, y1: 260, x2: 520, y2: 760, thickness: 10 },
    { id: "g4", x1: 85, y1: 150, x2: 125, y2: 700, thickness: 10 },
    { id: "g5", x1: 505, y1: 240, x2: 440, y2: 275, thickness: 12 },
  ],
  curves: [
    {
      id: "c1",
      cx: 510,
      cy: 150,
      radius: 90,
      startAngle: Math.PI / 2,
      endAngle: Math.PI,
      boost: 1.02,
    },
  ],
  bumpers: [
    { id: "b1", x: 300, y: 280, radius: 26, score: 180 },
    { id: "b2", x: 245, y: 340, radius: 24, score: 150 },
    { id: "b3", x: 355, y: 340, radius: 24, score: 150 },
    { id: "b4", x: 300, y: 395, radius: 22, score: 160 },
  ],
  valves: [
    { id: "v1", x: 300, y: 240, radius: 9, score: 90 },
    { id: "v2", x: 260, y: 300, radius: 9, score: 90 },
    { id: "v3", x: 340, y: 300, radius: 9, score: 90 },
    { id: "v4", x: 220, y: 360, radius: 9, score: 90 },
    { id: "v5", x: 380, y: 360, radius: 9, score: 90 },
    { id: "v6", x: 300, y: 430, radius: 10, score: 110 },
  ],
  targets: [
    { id: "t1", x: 190, y: 210, radius: 18, score: 140 },
    { id: "t2", x: 410, y: 215, radius: 18, score: 140 },
    { id: "t3", x: 300, y: 470, radius: 20, score: 160 },
  ],
  ports: [
    { id: "p1", x: 270, y: 520, radius: 12, score: 80 },
    { id: "p2", x: 330, y: 520, radius: 12, score: 80 },
    { id: "p3", x: 230, y: 500, radius: 12, score: 80 },
    { id: "p4", x: 370, y: 500, radius: 12, score: 80 },
  ],
  bonusDuration: 10,
  bonusMultiplier: 2,
  launchSpeed: -980,
  launchSideKick: 70,
  launchPosition: { x: 550, y: 846 },
  drainY: 880,
  lives: 3,
  tauntDuration: 3,
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
      x: CONFIG.launchPosition.x,
      y: CONFIG.launchPosition.y,
      vx: 0,
      vy: 0,
    },
    paddles: {
      left: { angle: leftDown },
      right: { angle: rightDown },
    },
    bumpers: CONFIG.bumpers.map((b) => ({ ...b })),
    valves: CONFIG.valves.map((v) => ({ ...v, lit: false })),
    targets: CONFIG.targets.map((t) => ({ ...t, cooldown: 0 })),
    ports: CONFIG.ports.map((p) => ({ ...p, cooldown: 0 })),
    taunt: {
      active: false,
      timer: 0,
    },
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
  targets: state.targets.map((t) => ({ ...t })),
  ports: state.ports.map((p) => ({ ...p })),
  taunt: { ...state.taunt },
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

  const boost = active ? 1.03 : 1.0;
  const reflected = reflectVelocity(ball.vx, ball.vy, normal.x, normal.y, boost);
  ball.vx = reflected.x * CONFIG.paddle.damping;
  ball.vy = (reflected.y - (active ? 70 : 20)) * CONFIG.paddle.damping;

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

const angleBetween = (angle, start, end) => {
  const normalized = (value) => (value + Math.PI * 2) % (Math.PI * 2);
  const a = normalized(angle);
  const s = normalized(start);
  const e = normalized(end);
  if (s <= e) return a >= s && a <= e;
  return a >= s || a <= e;
};

const resolveArcCollision = (state, arc) => {
  const { ball } = state;
  const dx = ball.x - arc.cx;
  const dy = ball.y - arc.cy;
  const distance = Math.hypot(dx, dy);
  const minDistance = CONFIG.ballRadius + arc.radius;

  if (distance >= minDistance || distance === 0) return false;

  const angle = Math.atan2(dy, dx);
  if (!angleBetween(angle, arc.startAngle, arc.endAngle)) return false;

  const normal = normalize(dx, dy);
  const approach = ball.vx * normal.x + ball.vy * normal.y;
  if (approach >= 0) return false;

  const reflected = reflectVelocity(ball.vx, ball.vy, normal.x, normal.y, arc.boost ?? 1);
  ball.vx = reflected.x;
  ball.vy = reflected.y;

  ball.x = arc.cx + normal.x * (minDistance + 0.5);
  ball.y = arc.cy + normal.y * (minDistance + 0.5);
  return true;
};

const handleCurves = (state) => {
  CONFIG.curves.forEach((curve) => {
    resolveArcCollision(state, curve);
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

const updateTaunt = (state, dt) => {
  if (!state.taunt.active) return;
  state.taunt.timer -= dt;
  if (state.taunt.timer > 0) return;
  state.taunt.active = false;
  state.taunt.timer = 0;
};

const handleSensors = (state, sensors, dt, cooldownDuration) => {
  const { ball } = state;
  sensors.forEach((sensor) => {
    sensor.cooldown = Math.max(0, sensor.cooldown - dt);
    const dx = ball.x - sensor.x;
    const dy = ball.y - sensor.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = CONFIG.ballRadius + sensor.radius;

    if (distance >= minDistance || distance === 0) return;

    if (sensor.cooldown <= 0) {
      addScore(state, sensor.score);
      sensor.cooldown = cooldownDuration;
    }

    const normal = normalize(dx, dy);
    ball.x = sensor.x + normal.x * (minDistance + 0.5);
    ball.y = sensor.y + normal.y * (minDistance + 0.5);
  });
};

const handleDrain = (state) => {
  if (state.ball.y - CONFIG.ballRadius < CONFIG.drainY) return false;

  state.lives -= 1;
  state.taunt.active = true;
  state.taunt.timer = CONFIG.tauntDuration;
  if (state.lives <= 0) {
    state.status = "gameover";
  } else {
    resetBall(state);
    state.status = "waiting";
  }
  return true;
};

const resetBall = (state) => {
  state.ball.x = CONFIG.launchPosition.x;
  state.ball.y = CONFIG.launchPosition.y;
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

  updatePaddles(next, input, dt);
  updateTaunt(next, dt);

  if (next.status === "gameover") return next;

  if (next.status === "waiting") {
    if (input.launch) {
      launchBall(next);
    }
    return next;
  }

  advanceBall(next, dt);
  resolveWallCollisions(next);
  handleCurves(next);
  handleBumpers(next);
  handleValves(next);
  resolvePaddleCollision(next, true, input.leftFlip);
  resolvePaddleCollision(next, false, input.rightFlip);
  resolveGuideCollisions(next);
  handleSensors(next, next.targets, dt, 0.6);
  handleSensors(next, next.ports, dt, 0.4);
  updateBonus(next, dt);
  handleDrain(next);

  return next;
};
