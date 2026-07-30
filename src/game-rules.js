export const TABLE = Object.freeze({
  width: 960,
  height: 480,
  inset: 42,
  ballRadius: 12,
  pocketRadius: 27,
});

export const BALL_GROUPS = Object.freeze({
  SOLIDS: "solids",
  STRIPES: "stripes",
});

export const TUTORIAL_LESSON_COUNT = 5;

export function tutorialRequirementMet(step, progress = {}) {
  const power = Number(progress.power) || 0;
  const spinMagnitude = Number(progress.spinMagnitude) || 0;
  const bankBounces = Number(progress.bankBounces) || 0;
  if (step === 0) return true;
  if (step === 1) return progress.aiming === true && power >= 5;
  if (step === 2) return power >= 35;
  if (step === 3) return spinMagnitude >= 0.35;
  if (step === 4) return bankBounces >= 1 && power >= 35;
  return false;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function ballGroup(number) {
  if (number >= 1 && number <= 7) return BALL_GROUPS.SOLIDS;
  if (number >= 9 && number <= 15) return BALL_GROUPS.STRIPES;
  return null;
}

export function normalizeRoomCode(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/[O]/g, "0")
    .replace(/[IL]/g, "1")
    .slice(0, 6);
}

export function makeRoomCode(random = Math.random) {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => alphabet[Math.floor(random() * alphabet.length) % alphabet.length],
  ).join("");
}

export function rackOrder(random = Math.random) {
  const solids = [1, 2, 3, 4, 5, 6, 7];
  const stripes = [9, 10, 11, 12, 13, 14, 15];
  const shuffle = (values) => {
    const items = [...values];
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    }
    return items;
  };
  const s = shuffle(solids);
  const t = shuffle(stripes);
  const rack = Array(15).fill(null);
  rack[4] = 8;
  rack[10] = s.pop();
  rack[14] = t.pop();
  const remaining = shuffle([...s, ...t]);
  rack.forEach((value, index) => {
    if (value === null) rack[index] = remaining.pop();
  });
  return rack;
}

export function rackPositions(apexX = 688, centerY = TABLE.height / 2) {
  const diameter = TABLE.ballRadius * 2 + 0.7;
  const positions = [];
  for (let row = 0; row < 5; row += 1) {
    for (let slot = 0; slot <= row; slot += 1) {
      positions.push({
        x: apexX + row * diameter * 0.88,
        y: centerY + (slot - row / 2) * diameter,
      });
    }
  }
  return positions;
}

export function shotAngleDegrees(direction) {
  const degrees = (Math.atan2(-direction.y, direction.x) * 180) / Math.PI;
  return Math.round((degrees + 360) % 360);
}

export function traceBankPath(
  origin,
  direction,
  bounds = {
    left: TABLE.inset,
    right: TABLE.width - TABLE.inset,
    top: TABLE.inset,
    bottom: TABLE.height - TABLE.inset,
  },
  bounces = 3,
) {
  const magnitude = Math.hypot(direction.x, direction.y) || 1;
  let vector = { x: direction.x / magnitude, y: direction.y / magnitude };
  let point = { ...origin };
  const result = [{ ...point }];

  for (let bounce = 0; bounce <= bounces; bounce += 1) {
    const xTime =
      vector.x > 0
        ? (bounds.right - point.x) / vector.x
        : vector.x < 0
          ? (bounds.left - point.x) / vector.x
          : Number.POSITIVE_INFINITY;
    const yTime =
      vector.y > 0
        ? (bounds.bottom - point.y) / vector.y
        : vector.y < 0
          ? (bounds.top - point.y) / vector.y
          : Number.POSITIVE_INFINITY;
    const time = Math.min(xTime, yTime);
    if (!Number.isFinite(time) || time <= 0) break;
    point = {
      x: clamp(point.x + vector.x * time, bounds.left, bounds.right),
      y: clamp(point.y + vector.y * time, bounds.top, bounds.bottom),
    };
    result.push(point);
    if (bounce === bounces) break;
    if (Math.abs(xTime - time) < 0.001) vector = { ...vector, x: -vector.x };
    if (Math.abs(yTime - time) < 0.001) vector = { ...vector, y: -vector.y };
    point = {
      x: point.x + vector.x * 0.001,
      y: point.y + vector.y * 0.001,
    };
  }
  return result;
}

export function evaluateEightBall({
  pottedNumber,
  playerGroup,
  remainingGroupBalls,
}) {
  if (pottedNumber !== 8) return null;
  return playerGroup && remainingGroupBalls === 0 ? "win" : "loss";
}

export function oppositeGroup(group) {
  if (group === BALL_GROUPS.SOLIDS) return BALL_GROUPS.STRIPES;
  if (group === BALL_GROUPS.STRIPES) return BALL_GROUPS.SOLIDS;
  return null;
}
