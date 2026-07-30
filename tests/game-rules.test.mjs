import test from "node:test";
import assert from "node:assert/strict";
import {
  BALL_GROUPS,
  ballGroup,
  evaluateEightBall,
  normalizeRoomCode,
  rackOrder,
  rackPositions,
  shotAngleDegrees,
  traceBankPath,
  tutorialRequirementMet,
} from "../src/game-rules.js";

test("rack contains every numbered ball once with eight in the center", () => {
  const rack = rackOrder(() => 0.41);
  assert.equal(rack.length, 15);
  assert.deepEqual([...rack].sort((a, b) => a - b), Array.from({ length: 15 }, (_, index) => index + 1));
  assert.equal(rack[4], 8);
  assert.notEqual(ballGroup(rack[10]), ballGroup(rack[14]));
});

test("rack positions form five rows and preserve the 2:1 table orientation", () => {
  const positions = rackPositions();
  assert.equal(positions.length, 15);
  assert.equal(positions[0].y, 240);
  assert.ok(positions.at(-1).x > positions[0].x);
});

test("room codes are legible, uppercase, and six characters", () => {
  assert.equal(normalizeRoomCode(" oi-l2_$abc "), "0112AB");
});

test("trajectory reflects off rails for readable bank shots", () => {
  const path = traceBankPath({ x: 100, y: 100 }, { x: 1, y: -1 }, undefined, 2);
  assert.equal(path.length, 4);
  assert.equal(path[1].y, 42);
  assert.ok(path[2].x > path[1].x);
  assert.ok(path[2].y > path[1].y);
});

test("angle readout uses conventional screen-space degrees", () => {
  assert.equal(shotAngleDegrees({ x: 1, y: 0 }), 0);
  assert.equal(shotAngleDegrees({ x: 0, y: -1 }), 90);
  assert.equal(shotAngleDegrees({ x: -1, y: 0 }), 180);
});

test("eight ball is legal only after the assigned group is clear", () => {
  assert.equal(
    evaluateEightBall({ pottedNumber: 8, playerGroup: BALL_GROUPS.SOLIDS, remainingGroupBalls: 0 }),
    "win",
  );
  assert.equal(
    evaluateEightBall({ pottedNumber: 8, playerGroup: BALL_GROUPS.STRIPES, remainingGroupBalls: 1 }),
    "loss",
  );
  assert.equal(
    evaluateEightBall({ pottedNumber: 4, playerGroup: BALL_GROUPS.SOLIDS, remainingGroupBalls: 0 }),
    null,
  );
});

test("tutorial lessons unlock only after their real interaction is demonstrated", () => {
  assert.equal(tutorialRequirementMet(0), true);
  assert.equal(tutorialRequirementMet(1, { aiming: true, power: 4 }), false);
  assert.equal(tutorialRequirementMet(1, { aiming: true, power: 5 }), true);
  assert.equal(tutorialRequirementMet(2, { power: 34 }), false);
  assert.equal(tutorialRequirementMet(2, { power: 35 }), true);
  assert.equal(tutorialRequirementMet(3, { spinMagnitude: 0.34 }), false);
  assert.equal(tutorialRequirementMet(3, { spinMagnitude: 0.35 }), true);
  assert.equal(tutorialRequirementMet(4, { bankBounces: 1, power: 34 }), false);
  assert.equal(tutorialRequirementMet(4, { bankBounces: 1, power: 35 }), true);
});
