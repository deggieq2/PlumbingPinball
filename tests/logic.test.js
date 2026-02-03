import assert from "node:assert/strict";
import { createInitialState, stepState, CONFIG } from "../src/logic.js";

const makePlayingState = () => {
  const state = createInitialState();
  state.status = "playing";
  return state;
};

const step = (state, dt = 1 / 60) => stepState(state, { leftFlip: false, rightFlip: false, launch: false }, dt);

{
  const state = makePlayingState();
  state.ball.x = 200;
  state.ball.y = 200;
  state.ball.vx = 0;
  state.ball.vy = 0;

  const next = step(state, 1);
  assert.ok(next.ball.y > state.ball.y, "ball should move downward with gravity");
  assert.ok(next.ball.vy > 0, "ball velocity should increase downward");
}

{
  const state = makePlayingState();
  state.ball.x = CONFIG.wallInset + CONFIG.ballRadius + 1;
  state.ball.y = 200;
  state.ball.vx = -200;
  state.ball.vy = 0;

  const next = step(state, 0.05);
  assert.ok(next.ball.vx > 0, "ball should bounce off left wall");
}

{
  const state = makePlayingState();
  const bumper = state.bumpers[0];
  state.ball.x = bumper.x - bumper.radius - CONFIG.ballRadius + 1;
  state.ball.y = bumper.y;
  state.ball.vx = 180;
  state.ball.vy = 0;

  const next = step(state, 1 / 60);
  assert.ok(next.score > 0, "bumper collision should add score");
  assert.ok(next.ball.vx < 0, "bumper collision should reflect ball");
}

{
  let state = makePlayingState();

  state.valves.forEach((valve) => {
    state.ball.x = valve.x - valve.radius - CONFIG.ballRadius + 1;
    state.ball.y = valve.y;
    state.ball.vx = 160;
    state.ball.vy = 0;
    state = step(state, 1 / 60);
  });

  assert.ok(state.valves.every((valve) => valve.lit), "all valves should be lit after hits");
  assert.ok(state.bonus.active, "bonus mode should activate when all valves are lit");
}

{
  const state = makePlayingState();
  state.lives = 1;
  state.ball.y = CONFIG.drainY + CONFIG.ballRadius + 2;
  state.ball.vy = 0;

  const next = step(state, 1 / 60);
  assert.equal(next.lives, 0, "drain should decrement lives");
  assert.equal(next.status, "gameover", "game should end when lives reach zero");
}

console.log("All logic tests passed.");
