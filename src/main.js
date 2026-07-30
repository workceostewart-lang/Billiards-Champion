import "./style.css";
import * as THREE from "three";
import Matter from "matter-js";
import {
  BALL_GROUPS,
  TABLE,
  TUTORIAL_LESSON_COUNT,
  ballGroup,
  clamp,
  evaluateEightBall,
  makeRoomCode,
  normalizeRoomCode,
  oppositeGroup,
  rackOrder,
  rackPositions,
  shotAngleDegrees,
  tutorialRequirementMet,
} from "./game-rules.js";

const { Bodies, Body, Composite, Engine, Events } = Matter;
const app = document.querySelector("#app");
const saveKey = "billiards-champion-save";
const saved = JSON.parse(localStorage.getItem(saveKey) || "{}");

const state = {
  sound: saved.sound !== false,
  wins: Array.isArray(saved.wins) ? saved.wins.slice(0, 2) : [0, 0],
  matches: saved.matches || 0,
  longestRun: saved.longestRun || 0,
  currentRun: 0,
  mode: "solo",
  difficulty: saved.difficulty || "medium",
  raceTo: saved.raceTo || 3,
  currentPlayer: 0,
  groups: [null, null],
  breakShot: true,
  shotNumber: 0,
  shotPotted: [],
  aiming: false,
  power: 0,
  direction: { x: 1, y: 0 },
  spin: { x: 0, y: 0 },
  spinFrames: 0,
  ballsMoving: false,
  settling: false,
  firstHit: null,
  roomCode: "",
  gameOver: false,
  tutorialStep: 0,
  tutorialReady: true,
  tutorialComplete: saved.tutorialComplete === true,
};

const TUTORIAL_STEPS = [
  {
    kicker: "WELCOME TO THE CLUB",
    title: "Know the table",
    copy: "You play on one shared 8-ball table. Clear solids or stripes, then sink the 8-ball. The break never assigns a group.",
    tip: "All six pockets, every ball, and the complete 2:1 table stay visible.",
    target: "table",
    action: "START AIMING",
  },
  {
    kicker: "LESSON 2 • AIM",
    title: "Find your line",
    copy: "Press on the table and pull away from the cue ball. The thick white guide shows the cue ball's exact path.",
    tip: "Pull at least a little, then release. This lesson will not strike the ball yet.",
    target: "table",
    action: "NEXT: POWER",
  },
  {
    kicker: "LESSON 3 • POWER",
    title: "Control the strike",
    copy: "Pull farther until the left power meter reaches 35% or more. The colored fill and number always agree.",
    tip: "Short pull for touch. Long pull for a firm break.",
    target: "power",
    action: "NEXT: ENGLISH",
  },
  {
    kicker: "LESSON 4 • SPIN",
    title: "Add English",
    copy: "Drag the red tip dot away from center. Top adds follow, bottom adds draw, and the sides add English.",
    tip: "The label under the cue ball confirms the spin you selected.",
    target: "spin",
    action: "NEXT: BANK SHOT",
  },
  {
    kicker: "LESSON 5 • BANK SHOTS",
    title: "Read the bounce",
    copy: "Aim away from the rack until the guide bends off a rail, pull to at least 35%, then release to play the shot.",
    tip: "The line previews every rail reflection before you commit.",
    target: "table",
    action: "PLAY THE BANK",
  },
];

app.innerHTML = `
  <main class="app-shell">
    <section class="menu-view" data-view="menu">
      <canvas id="menu-canvas" class="menu-canvas" aria-hidden="true"></canvas>
      <div class="menu-atmosphere" aria-hidden="true"></div>

      <header class="menu-header">
        <a class="brand" href="#" aria-label="Billiards Champion home">
          <span class="brand-ball"><b>8</b></span>
          <span class="brand-type"><strong>BILLIARDS</strong><em>CHAMPION</em></span>
        </a>
        <div class="header-actions">
          <span class="save-label"><i></i> Progress saved</span>
          <button class="round-button" type="button" data-action="sound" aria-label="Toggle sound">
            <span data-sound-icon>♪</span>
          </button>
          <button class="player-chip" type="button" data-action="stats" aria-label="Open player stats">P1</button>
        </div>
      </header>

      <div class="menu-grid">
        <section class="hero-panel" aria-labelledby="game-title">
          <p class="eyebrow"><span>FANTOMZONE ORIGINAL</span> PRECISION 8-BALL</p>
          <h1 id="game-title">Read the angle.<br><span>Own the table.</span></h1>
          <p class="hero-copy">Every bank is visible. Every touch matters. Pull back, add English, and play your line with confidence.</p>
          <div class="feature-row" aria-label="Game features">
            <span><b>3×</b> bank preview</span>
            <span><b>360°</b> spin control</span>
            <span><b>2:1</b> full table view</span>
          </div>
        </section>

        <section class="table-preview" aria-label="Billiards table preview">
          <div class="preview-label"><span>LIVE TABLE</span><b>AIM ASSIST ON</b></div>
          <div class="preview-rail">
            <div class="preview-felt">
              <i class="preview-pocket p1"></i><i class="preview-pocket p2"></i><i class="preview-pocket p3"></i>
              <i class="preview-pocket p4"></i><i class="preview-pocket p5"></i><i class="preview-pocket p6"></i>
              <span class="preview-ball cue"></span>
              <span class="preview-ball red"></span>
              <span class="preview-ball blue"></span>
              <span class="preview-ball gold"></span>
              <span class="preview-ball eight">8</span>
              <div class="preview-line"></div>
            </div>
          </div>
          <p><span><i></i> Competition felt</span><b>TOURNAMENT READY</b></p>
        </section>

        <nav class="mode-menu" aria-label="Choose a game mode">
          <div class="menu-heading"><span>CHOOSE YOUR GAME</span><i></i></div>
          <button class="tutorial-callout" type="button" data-action="tutorial">
            <span class="tutorial-callout-icon">◎</span>
            <span class="mode-copy"><small data-tutorial-menu-kicker>${state.tutorialComplete ? "LESSONS COMPLETE" : "NEW PLAYER? START HERE"}</small><strong>GUIDED TUTORIAL</strong><em>Aim • Power • Banks • Spin</em></span>
            <span class="tutorial-callout-status" data-tutorial-menu-status>${state.tutorialComplete ? "REPLAY" : "5 LESSONS"}</span>
            <span class="mode-arrow">→</span>
          </button>
          <button class="mode-card mode-primary" type="button" data-action="solo">
            <span class="mode-number">01</span>
            <span class="mode-copy"><strong>SOLO PRACTICE</strong><small>Free play • Unlimited shots</small></span>
            <span class="mode-arrow">→</span>
          </button>
          <button class="mode-card" type="button" data-action="cpu">
            <span class="mode-number blue">02</span>
            <span class="mode-copy"><strong>VERSUS CPU</strong><small>Three skill levels</small></span>
            <span class="mode-arrow">→</span>
          </button>
          <button class="mode-card" type="button" data-action="multiplayer">
            <span class="mode-number red">03</span>
            <span class="mode-copy"><strong>MULTIPLAYER</strong><small>Create or join a room</small></span>
            <span class="live-pill">LIVE</span>
            <span class="mode-arrow">→</span>
          </button>
          <div class="utility-menu">
            <button type="button" data-action="how-to"><span>?</span> How to play</button>
            <button type="button" data-action="stats"><span>↗</span> Stats</button>
            <button type="button" data-action="settings"><span>⚙</span> Settings</button>
          </div>
        </nav>
      </div>

      <footer class="menu-footer">
        <span><i></i> ONLINE</span>
        <p>FANTOMZONE • BILLIARDS CLUB</p>
        <span>v1.0 • WEBGL</span>
      </footer>
    </section>

    <section class="game-view" data-view="game" hidden>
      <header class="game-toolbar">
        <button class="exit-button" type="button" data-action="exit-game">← <span>EXIT</span></button>
        <div class="match-identity">
          <small data-mode-label>SOLO PRACTICE</small>
          <strong data-turn-label>YOUR TABLE</strong>
        </div>
        <div class="score-pill">
          <span data-player-one-score>P1&nbsp; 0</span><i></i><span data-player-two-score>P2&nbsp; 0</span>
        </div>
        <button class="round-button light" type="button" data-action="sound" aria-label="Toggle sound">
          <span data-sound-icon>♪</span>
        </button>
      </header>

      <div class="game-content">
        <section class="tutorial-panel" data-tutorial-panel aria-live="polite" hidden>
          <div class="tutorial-coach" aria-hidden="true"><span>8</span></div>
          <div class="tutorial-panel-copy">
            <div class="tutorial-panel-head">
              <span data-tutorial-kicker>WELCOME TO THE CLUB</span>
              <div class="tutorial-progress" data-tutorial-progress aria-label="Tutorial progress"></div>
            </div>
            <h2 data-tutorial-title>Know the table</h2>
            <p data-tutorial-copy></p>
            <small data-tutorial-tip></small>
          </div>
          <div class="tutorial-panel-actions">
            <button type="button" class="tutorial-text-action" data-action="tutorial-back">BACK</button>
            <button type="button" class="tutorial-text-action" data-action="tutorial-skip">SKIP</button>
            <button type="button" class="tutorial-next" data-action="tutorial-next" disabled><span data-tutorial-action>CONTINUE</span> →</button>
          </div>
        </section>

        <div class="status-row">
          <div class="player-status active" data-player-card="0">
            <span class="player-dot one"></span>
            <p><small>PLAYER 1</small><strong data-player-one-group>OPEN TABLE</strong></p>
          </div>
          <div class="shot-status">
            <small>SHOT <span data-shot-number>01</span></small>
            <strong data-table-status>BREAK THE RACK</strong>
          </div>
          <div class="player-status right" data-player-card="1">
            <p><small data-player-two-name>PLAYER 2</small><strong data-player-two-group>OPEN TABLE</strong></p>
            <span class="player-dot two"></span>
          </div>
        </div>

        <section class="table-zone" aria-label="Billiards table and aiming controls">
          <div class="power-control" aria-label="Shot power">
            <span>POWER</span>
            <div class="power-track"><i data-power-fill></i><b></b></div>
            <strong><span data-power-value>0</span>%</strong>
          </div>

          <div class="table-frame" data-table-frame>
            <canvas
              id="table-canvas"
              aria-label="Playable top-down billiards table. Pull back from the cue ball and release to shoot."
            ></canvas>
            <div class="table-corner-label">CHAMPION CLOTH • 760</div>
            <div class="turn-banner" data-turn-banner>YOUR SHOT</div>
            <div class="result-card" data-result-card hidden>
              <span data-result-kicker>RACK COMPLETE</span>
              <strong data-result-title>TABLE CLEARED</strong>
              <p data-result-copy>That was clean.</p>
              <div>
                <button type="button" data-action="replay">RACK AGAIN</button>
                <button type="button" data-action="exit-game">MAIN MENU</button>
              </div>
            </div>
          </div>

          <div class="precision-controls">
            <div class="angle-control">
              <span>ANGLE</span>
              <strong><b data-angle-value>0</b>°</strong>
              <small>LIVE READOUT</small>
            </div>
            <div class="spin-wrap">
              <span>TIP POSITION</span>
              <button class="spin-control" type="button" data-spin-control aria-label="Drag the dot to set cue-ball spin">
                <i class="spin-cross horizontal"></i><i class="spin-cross vertical"></i>
                <b data-spin-dot></b>
              </button>
              <small data-spin-label>CENTER</small>
            </div>
          </div>
        </section>

        <div class="game-bottom-bar">
          <div class="input-hint"><span class="gesture-icon"></span><p><strong>PULL BACK TO AIM</strong><small>Release to strike • Guide shows rail bounces</small></p></div>
          <div class="ball-tray" data-ball-tray aria-label="Remaining billiard balls"></div>
          <button class="rerack-button" type="button" data-action="rerack"><span>↻</span> RE-RACK</button>
        </div>
      </div>
    </section>

    <div class="modal-backdrop" data-modal hidden>
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button>
        <div data-modal-content></div>
      </section>
    </div>

    <div class="toast" role="status" aria-live="polite" data-toast></div>
  </main>
`;

class BilliardsAudio {
  constructor() {
    this.context = null;
    this.lastCollision = 0;
  }

  tone(frequency, duration = 0.08, type = "sine", gain = 0.035, delay = 0) {
    if (!state.sound) return;
    this.context ||= new AudioContext();
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const volume = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    volume.gain.setValueAtTime(gain, now);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(volume).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  click() {
    this.tone(360, 0.045, "square", 0.02);
  }

  strike(power) {
    this.tone(120 + power * 0.8, 0.1, "triangle", 0.065);
    this.tone(72, 0.16, "sine", 0.025, 0.015);
  }

  collide(speed = 1) {
    const now = performance.now();
    if (now - this.lastCollision < 42) return;
    this.lastCollision = now;
    this.tone(620 + Math.min(speed, 8) * 42, 0.035, "sine", 0.016);
  }

  rail() {
    this.tone(185, 0.05, "triangle", 0.017);
  }

  pocket() {
    this.tone(90, 0.14, "sine", 0.055);
    this.tone(55, 0.2, "triangle", 0.025, 0.035);
  }

  win() {
    [392, 523, 659, 784].forEach((note, index) => this.tone(note, 0.22, "triangle", 0.045, index * 0.085));
  }
}

const audio = new BilliardsAudio();

function persist() {
  localStorage.setItem(saveKey, JSON.stringify({
    sound: state.sound,
    wins: state.wins,
    matches: state.matches,
    longestRun: state.longestRun,
    difficulty: state.difficulty,
    raceTo: state.raceTo,
    tutorialComplete: state.tutorialComplete,
  }));
}

function setSoundLabels() {
  document.querySelectorAll("[data-sound-icon]").forEach((icon) => {
    icon.textContent = state.sound ? "♪" : "×";
  });
}

let toastTimer;
function toast(message) {
  const element = document.querySelector("[data-toast]");
  element.textContent = message;
  element.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("visible"), 2500);
}

const BALL_COLORS = {
  0: 0xf7f2df,
  1: 0xf7c934,
  2: 0x1f68d6,
  3: 0xe34237,
  4: 0x6d45aa,
  5: 0xf2872f,
  6: 0x1f9c69,
  7: 0x7e2636,
  8: 0x111827,
  9: 0xf7c934,
  10: 0x1f68d6,
  11: 0xe34237,
  12: 0x6d45aa,
  13: 0xf2872f,
  14: 0x1f9c69,
  15: 0x7e2636,
};

function createNumberTexture(number, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 256, 256);
  if (number > 8) {
    context.fillStyle = "#f8f3df";
    context.fillRect(0, 0, 256, 256);
    context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    context.fillRect(0, 64, 256, 128);
  } else {
    context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    context.fillRect(0, 0, 256, 256);
  }
  if (number !== 0) {
    context.fillStyle = "#fffdf5";
    context.beginPath();
    context.arc(128, 128, 58, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#101725";
    context.font = "900 74px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(number), 128, 132);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createBallMesh(number) {
  const color = BALL_COLORS[number];
  const group = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(TABLE.ballRadius, 30, 20),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.03,
    }),
  );
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  group.add(sphere);

  if (number > 8) {
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(TABLE.ballRadius * 0.72, TABLE.ballRadius * 0.42, 12, 32),
      new THREE.MeshStandardMaterial({ color: 0xf8f3df, roughness: 0.32 }),
    );
    stripe.rotation.x = Math.PI / 2;
    group.add(stripe);
  }

  if (number !== 0) {
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createNumberTexture(number, color),
        transparent: true,
        depthTest: false,
      }),
    );
    label.scale.set(13, 13, 1);
    label.position.y = TABLE.ballRadius + 1.5;
    group.add(label);
  }
  return group;
}

function addRoundedBox(scene, size, position, color, height = 24) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size.x, height, size.y),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.04 }),
  );
  mesh.position.set(position.x, position.y, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function buildTableScene(scene) {
  addRoundedBox(scene, { x: 1050, y: 570 }, { x: 0, y: -22, z: 0 }, 0x5b2818, 38);
  addRoundedBox(scene, { x: 1018, y: 538 }, { x: 0, y: -4, z: 0 }, 0xbd6a2f, 23);
  addRoundedBox(scene, { x: 960, y: 480 }, { x: 0, y: 5, z: 0 }, 0x0b7a55, 10);

  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x7c351e, roughness: 0.5 });
  [
    [0, 17, -250, 884, 27],
    [0, 17, 250, 884, 27],
    [-490, 17, 0, 27, 404],
    [490, 17, 0, 27, 404],
  ].forEach(([x, y, z, width, depth]) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 24, depth), railMaterial);
    rail.position.set(x, y, z);
    rail.castShadow = true;
    scene.add(rail);
  });

  const pocketPositions = [
    [-480, -240],
    [0, -240],
    [480, -240],
    [-480, 240],
    [0, 240],
    [480, 240],
  ];
  pocketPositions.forEach(([x, z]) => {
    const pocket = new THREE.Mesh(
      new THREE.CylinderGeometry(29, 34, 8, 40),
      new THREE.MeshStandardMaterial({ color: 0x03070a, roughness: 0.9 }),
    );
    pocket.position.set(x, 13, z);
    scene.add(pocket);
  });

  const sights = [-360, -240, -120, 120, 240, 360];
  sights.forEach((x) => {
    [-268, 268].forEach((z) => {
      const sight = new THREE.Mesh(
        new THREE.CylinderGeometry(2.3, 2.3, 2, 12),
        new THREE.MeshStandardMaterial({ color: 0xf6c84c }),
      );
      sight.position.set(x, 30, z);
      scene.add(sight);
    });
  });
}

function setupRenderer(canvas, scene, camera) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== width * pixelRatio || canvas.height !== height * pixelRatio) {
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      if (camera.isPerspectiveCamera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    }
  };
  return { renderer, resize, scene, camera };
}

function createMenuScene() {
  const canvas = document.querySelector("#menu-canvas");
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x061725, 0.0019);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2200);
  camera.position.set(210, 470, 620);
  camera.lookAt(80, 0, 0);
  const ambient = new THREE.HemisphereLight(0x96d9ff, 0x092019, 2.4);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffe8bc, 4.2);
  key.position.set(-280, 500, 300);
  key.castShadow = true;
  scene.add(key);
  const rim = new THREE.PointLight(0x2787ff, 95, 900);
  rim.position.set(400, 130, -190);
  scene.add(rim);

  const table = new THREE.Group();
  scene.add(table);
  buildTableScene(table);
  table.rotation.y = -0.1;
  table.position.set(115, -44, -60);

  const previewBalls = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15].map((number, index) => {
    const ball = createBallMesh(number);
    const row = Math.floor(index / 5);
    const slot = index % 5;
    ball.position.set(80 + row * 26 + slot * 2, 24, (slot - 2) * 26 + row * 10);
    table.add(ball);
    return ball;
  });

  const cue = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 5, 470, 14),
    new THREE.MeshStandardMaterial({ color: 0xeac88a, roughness: 0.42 }),
  );
  cue.rotation.z = Math.PI / 2;
  cue.rotation.x = -0.22;
  cue.position.set(-160, 68, 112);
  table.add(cue);

  const runtime = setupRenderer(canvas, scene, camera);
  let elapsed = 0;
  const animate = (time) => {
    requestAnimationFrame(animate);
    runtime.resize();
    elapsed = time * 0.00025;
    table.rotation.y = -0.1 + Math.sin(elapsed) * 0.012;
    previewBalls.forEach((ball, index) => {
      ball.rotation.x += 0.0007 * (index % 3);
      ball.rotation.z += 0.0005;
    });
    runtime.renderer.render(scene, camera);
  };
  requestAnimationFrame(animate);
}

let engine;
let tableRuntime;
let ballEntries = [];
let guideLine;
let secondaryGuideLine;
let impactMarker;
let cueStick;
let frameTime = performance.now();
let cpuTimer;
let collisionActive = false;

const pockets = [
  { x: TABLE.inset, y: TABLE.inset },
  { x: TABLE.width / 2, y: TABLE.inset },
  { x: TABLE.width - TABLE.inset, y: TABLE.inset },
  { x: TABLE.inset, y: TABLE.height - TABLE.inset },
  { x: TABLE.width / 2, y: TABLE.height - TABLE.inset },
  { x: TABLE.width - TABLE.inset, y: TABLE.height - TABLE.inset },
];

function worldToScene(point, height = 19) {
  return new THREE.Vector3(point.x - TABLE.width / 2, height, point.y - TABLE.height / 2);
}

function sceneToWorld(event) {
  if (!tableRuntime) return null;
  const canvas = tableRuntime.renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, tableRuntime.camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -18), hit)) return null;
  return {
    x: hit.x + TABLE.width / 2,
    y: hit.z + TABLE.height / 2,
  };
}

function lineObject(color, dashed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 12, gapSize: 8, linewidth: 3, transparent: true, opacity: 0.95 })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geometry, material);
  line.visible = false;
  line.renderOrder = 8;
  tableRuntime.scene.add(line);
  return line;
}

function setLinePoints(line, points) {
  if (!points || points.length < 2) {
    line.visible = false;
    return;
  }
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => worldToScene(point, 24)));
  line.computeLineDistances();
  line.visible = true;
}

function rayCircleDistance(origin, direction, center, radius) {
  const ox = origin.x - center.x;
  const oy = origin.y - center.y;
  const projection = -(ox * direction.x + oy * direction.y);
  if (projection <= 0) return null;
  const closestSq = ox * ox + oy * oy - projection * projection;
  const radiusSq = radius * radius;
  if (closestSq > radiusSq) return null;
  return projection - Math.sqrt(radiusSq - closestSq);
}

function computeGuide(origin, initialDirection) {
  const bounds = {
    left: TABLE.inset + TABLE.ballRadius,
    right: TABLE.width - TABLE.inset - TABLE.ballRadius,
    top: TABLE.inset + TABLE.ballRadius,
    bottom: TABLE.height - TABLE.inset - TABLE.ballRadius,
  };
  const points = [{ ...origin }];
  let position = { ...origin };
  let direction = { ...initialDirection };
  let objectPath = [];
  let impact = null;

  for (let bounce = 0; bounce <= 3; bounce += 1) {
    const xTime = direction.x > 0
      ? (bounds.right - position.x) / direction.x
      : direction.x < 0
        ? (bounds.left - position.x) / direction.x
        : Number.POSITIVE_INFINITY;
    const yTime = direction.y > 0
      ? (bounds.bottom - position.y) / direction.y
      : direction.y < 0
        ? (bounds.top - position.y) / direction.y
        : Number.POSITIVE_INFINITY;
    const wallDistance = Math.min(xTime, yTime);
    let nearest = null;
    ballEntries.forEach((entry) => {
      if (entry.number === 0 || entry.potted) return;
      const distance = rayCircleDistance(position, direction, entry.body.position, TABLE.ballRadius * 2.05);
      if (distance !== null && distance < wallDistance && distance > 1 && (!nearest || distance < nearest.distance)) {
        nearest = { entry, distance };
      }
    });

    if (nearest) {
      impact = {
        x: position.x + direction.x * nearest.distance,
        y: position.y + direction.y * nearest.distance,
      };
      points.push(impact);
      const targetCenter = nearest.entry.body.position;
      const targetDirection = {
        x: targetCenter.x - impact.x,
        y: targetCenter.y - impact.y,
      };
      const magnitude = Math.hypot(targetDirection.x, targetDirection.y) || 1;
      targetDirection.x /= magnitude;
      targetDirection.y /= magnitude;
      const targetRailDistance = Math.min(
        targetDirection.x > 0 ? (bounds.right - targetCenter.x) / targetDirection.x : (bounds.left - targetCenter.x) / targetDirection.x,
        targetDirection.y > 0 ? (bounds.bottom - targetCenter.y) / targetDirection.y : (bounds.top - targetCenter.y) / targetDirection.y,
      );
      const previewDistance = Math.min(155, Math.abs(targetRailDistance));
      objectPath = [
        { x: targetCenter.x, y: targetCenter.y },
        {
          x: targetCenter.x + targetDirection.x * previewDistance,
          y: targetCenter.y + targetDirection.y * previewDistance,
        },
      ];
      break;
    }

    const wallPoint = {
      x: clamp(position.x + direction.x * wallDistance, bounds.left, bounds.right),
      y: clamp(position.y + direction.y * wallDistance, bounds.top, bounds.bottom),
    };
    points.push(wallPoint);
    if (bounce === 3) break;
    if (Math.abs(xTime - wallDistance) < 0.001) direction = { ...direction, x: -direction.x };
    if (Math.abs(yTime - wallDistance) < 0.001) direction = { ...direction, y: -direction.y };
    position = {
      x: wallPoint.x + direction.x * 0.01,
      y: wallPoint.y + direction.y * 0.01,
    };
  }
  return { points, objectPath, impact };
}

function updateAimVisuals() {
  const cue = ballEntries.find((entry) => entry.number === 0 && !entry.potted);
  if (!cue || !state.aiming) {
    guideLine && (guideLine.visible = false);
    secondaryGuideLine && (secondaryGuideLine.visible = false);
    impactMarker && (impactMarker.visible = false);
    cueStick && (cueStick.visible = false);
    return;
  }
  const guide = computeGuide(cue.body.position, state.direction);
  setLinePoints(guideLine, guide.points);
  setLinePoints(secondaryGuideLine, guide.objectPath);
  if (guide.impact) {
    impactMarker.position.copy(worldToScene(guide.impact, 25));
    impactMarker.visible = true;
  } else {
    impactMarker.visible = false;
  }
  const angle = Math.atan2(state.direction.y, state.direction.x);
  const behind = 145 + state.power * 0.55;
  cueStick.position.copy(worldToScene({
    x: cue.body.position.x - state.direction.x * behind,
    y: cue.body.position.y - state.direction.y * behind,
  }, 33));
  cueStick.rotation.y = -angle;
  cueStick.visible = true;
  document.querySelector("[data-angle-value]").textContent = String(shotAngleDegrees(state.direction));
}

function setupTableRuntime() {
  if (tableRuntime) return;
  const canvas = document.querySelector("#table-canvas");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x061822);
  const camera = new THREE.OrthographicCamera(-540, 540, 300, -300, 1, 1400);
  camera.position.set(0, 780, 0.01);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xc7efff, 0x092113, 2.7));
  const key = new THREE.DirectionalLight(0xffedc5, 3.6);
  key.position.set(-280, 580, 260);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -560;
  key.shadow.camera.right = 560;
  key.shadow.camera.top = 320;
  key.shadow.camera.bottom = -320;
  scene.add(key);
  const blueRim = new THREE.PointLight(0x2d8cff, 42, 780);
  blueRim.position.set(450, 120, -250);
  scene.add(blueRim);
  buildTableScene(scene);
  tableRuntime = setupRenderer(canvas, scene, camera);

  guideLine = lineObject(0xffffff, true);
  secondaryGuideLine = lineObject(0xf6c84c, false);
  impactMarker = new THREE.Mesh(
    new THREE.RingGeometry(14, 18, 32),
    new THREE.MeshBasicMaterial({ color: 0xf6c84c, transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
  );
  impactMarker.rotation.x = -Math.PI / 2;
  impactMarker.visible = false;
  impactMarker.renderOrder = 9;
  scene.add(impactMarker);

  cueStick = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 5.1, 270, 12),
    new THREE.MeshStandardMaterial({ color: 0xe8c689, roughness: 0.38 }),
  );
  cueStick.rotation.z = Math.PI / 2;
  cueStick.castShadow = true;
  cueStick.visible = false;
  scene.add(cueStick);

  canvas.addEventListener("pointerdown", beginAim);
  canvas.addEventListener("pointermove", moveAim);
  canvas.addEventListener("pointerup", releaseAim);
  canvas.addEventListener("pointercancel", cancelAim);

  const animate = (time) => {
    requestAnimationFrame(animate);
    tableRuntime.resize();
    const delta = clamp(time - frameTime, 8, 32);
    frameTime = time;
    if (engine) {
      const substeps = Math.ceil(delta / 16.667);
      for (let step = 0; step < substeps; step += 1) {
        Engine.update(engine, delta / substeps);
        applySpin();
      }
      detectPockets();
      syncBallMeshes();
      trackSettling();
    }
    updateAimVisuals();
    tableRuntime.renderer.render(scene, camera);
  };
  requestAnimationFrame(animate);
}

function createPhysicsWorld() {
  if (engine) Engine.clear(engine);
  ballEntries.forEach((entry) => {
    entry.mesh.removeFromParent();
    entry.mesh.traverse((child) => {
      child.geometry?.dispose?.();
      if (child.material?.map) child.material.map.dispose();
      child.material?.dispose?.();
    });
  });
  ballEntries = [];
  engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
  engine.positionIterations = 12;
  engine.velocityIterations = 10;

  const wallOptions = {
    isStatic: true,
    restitution: 0.92,
    friction: 0.02,
    label: "rail",
  };
  const walls = [
    Bodies.rectangle(TABLE.width / 2, 29, TABLE.width - 108, 25, wallOptions),
    Bodies.rectangle(TABLE.width / 2, TABLE.height - 29, TABLE.width - 108, 25, wallOptions),
    Bodies.rectangle(29, TABLE.height / 2, 25, TABLE.height - 108, wallOptions),
    Bodies.rectangle(TABLE.width - 29, TABLE.height / 2, 25, TABLE.height - 108, wallOptions),
  ];
  Composite.add(engine.world, walls);

  const cuePosition = { x: 264, y: TABLE.height / 2 };
  createBall(0, cuePosition.x, cuePosition.y);
  const numbers = rackOrder();
  rackPositions().forEach((position, index) => {
    createBall(numbers[index], position.x, position.y);
  });

  Events.on(engine, "collisionStart", (event) => {
    event.pairs.forEach((pair) => {
      const entryA = ballEntries.find((entry) => entry.body === pair.bodyA);
      const entryB = ballEntries.find((entry) => entry.body === pair.bodyB);
      if (entryA && entryB) {
        const speed = Math.max(entryA.body.speed, entryB.body.speed);
        audio.collide(speed);
        if (!state.firstHit && (entryA.number === 0 || entryB.number === 0)) {
          state.firstHit = entryA.number === 0 ? entryB.number : entryA.number;
          collisionActive = true;
        }
      } else if ((entryA || entryB) && Math.max(pair.bodyA.speed, pair.bodyB.speed) > 1.2) {
        audio.rail();
      }
    });
  });
  Events.on(engine, "collisionEnd", () => {
    collisionActive = false;
  });
}

function createBall(number, x, y) {
  const body = Bodies.circle(x, y, TABLE.ballRadius, {
    label: `ball-${number}`,
    restitution: 0.965,
    friction: 0.003,
    frictionAir: 0.0125,
    density: 0.002,
    slop: 0.05,
  });
  const mesh = createBallMesh(number);
  tableRuntime.scene.add(mesh);
  ballEntries.push({ number, body, mesh, potted: false });
  Composite.add(engine.world, body);
}

function syncBallMeshes() {
  ballEntries.forEach((entry) => {
    if (entry.potted) return;
    entry.mesh.position.copy(worldToScene(entry.body.position, TABLE.ballRadius + 17));
    const speed = entry.body.speed;
    if (speed > 0.02) {
      entry.mesh.rotation.z -= entry.body.velocity.x * 0.018;
      entry.mesh.rotation.x += entry.body.velocity.y * 0.018;
    }
  });
}

function detectPockets() {
  ballEntries.forEach((entry) => {
    if (entry.potted) return;
    const pocket = pockets.find((target) => Math.hypot(entry.body.position.x - target.x, entry.body.position.y - target.y) < TABLE.pocketRadius);
    if (!pocket) return;
    entry.potted = true;
    entry.mesh.visible = false;
    Composite.remove(engine.world, entry.body);
    audio.pocket();
    if (entry.number === 0) {
      state.shotPotted.push(0);
      toast("Scratch • Cue ball returns after the shot");
    } else {
      state.shotPotted.push(entry.number);
      state.currentRun += 1;
      state.longestRun = Math.max(state.longestRun, state.currentRun);
      if (entry.number === 8) resolveEightBall();
    }
    updateBallTray();
  });
}

function allBallsStopped() {
  return ballEntries
    .filter((entry) => !entry.potted)
    .every((entry) => entry.body.speed < 0.085);
}

function trackSettling() {
  if (!state.ballsMoving || state.gameOver) return;
  if (!allBallsStopped()) {
    state.settling = false;
    return;
  }
  if (!state.settling) {
    state.settling = true;
    setTimeout(() => {
      if (state.ballsMoving && allBallsStopped() && !state.gameOver) finishShot();
      state.settling = false;
    }, 320);
  }
}

function applySpin() {
  if (state.spinFrames <= 0) return;
  const cue = ballEntries.find((entry) => entry.number === 0 && !entry.potted);
  if (!cue || cue.body.speed < 0.15) {
    state.spinFrames = 0;
    return;
  }
  const velocityMagnitude = Math.hypot(cue.body.velocity.x, cue.body.velocity.y) || 1;
  const perpendicular = {
    x: -cue.body.velocity.y / velocityMagnitude,
    y: cue.body.velocity.x / velocityMagnitude,
  };
  const sideForce = state.spin.x * 0.000009 * Math.min(cue.body.speed, 12);
  Body.applyForce(cue.body, cue.body.position, {
    x: perpendicular.x * sideForce,
    y: perpendicular.y * sideForce,
  });
  if (collisionActive && state.spin.y !== 0) {
    const multiplier = 1 + state.spin.y * 0.0018;
    Body.setVelocity(cue.body, {
      x: cue.body.velocity.x * multiplier,
      y: cue.body.velocity.y * multiplier,
    });
  }
  state.spinFrames -= 1;
}

function updateTutorialMenuStatus() {
  const kicker = document.querySelector("[data-tutorial-menu-kicker]");
  const status = document.querySelector("[data-tutorial-menu-status]");
  if (kicker) kicker.textContent = state.tutorialComplete ? "LESSONS COMPLETE" : "NEW PLAYER? START HERE";
  if (status) status.textContent = state.tutorialComplete ? "REPLAY" : `${TUTORIAL_LESSON_COUNT} LESSONS`;
}

function tutorialBankBounces() {
  if (!state.aiming) return 0;
  const cue = ballEntries.find((entry) => entry.number === 0 && !entry.potted);
  if (!cue) return 0;
  const guide = computeGuide(cue.body.position, state.direction);
  return Math.max(0, guide.points.length - 2);
}

function updateTutorialRequirement() {
  if (state.mode !== "tutorial" || state.tutorialStep >= TUTORIAL_LESSON_COUNT) return;
  const spinMagnitude = Math.hypot(state.spin.x, state.spin.y);
  const requirementMet = tutorialRequirementMet(state.tutorialStep, {
    aiming: state.aiming,
    power: state.power,
    spinMagnitude,
    bankBounces: tutorialBankBounces(),
  });
  if (requirementMet !== state.tutorialReady) {
    state.tutorialReady = requirementMet;
    updateTutorialPanel();
  }
}

function updateTutorialPanel() {
  const panel = document.querySelector("[data-tutorial-panel]");
  const gameView = document.querySelector("[data-view='game']");
  if (!panel || !gameView) return;
  const isTutorial = state.mode === "tutorial";
  panel.hidden = !isTutorial;
  gameView.classList.toggle("tutorial-mode", isTutorial);
  if (!isTutorial) {
    delete gameView.dataset.tutorialTarget;
    return;
  }

  const complete = state.tutorialStep >= TUTORIAL_LESSON_COUNT;
  const step = complete
    ? {
        kicker: "TUTORIAL COMPLETE",
        title: "You own the basics",
        copy: "You aimed, set power, applied English, and played a readable bank shot. The full table is yours now.",
        tip: "Continue in free practice, challenge the CPU, or open a private table.",
        target: "none",
        action: "FREE PRACTICE",
      }
    : TUTORIAL_STEPS[state.tutorialStep];
  gameView.dataset.tutorialTarget = step.target;
  document.querySelector("[data-tutorial-kicker]").textContent = step.kicker;
  document.querySelector("[data-tutorial-title]").textContent = step.title;
  document.querySelector("[data-tutorial-copy]").textContent = step.copy;
  document.querySelector("[data-tutorial-tip]").textContent = step.tip;

  const progress = document.querySelector("[data-tutorial-progress]");
  progress.innerHTML = Array.from({ length: TUTORIAL_LESSON_COUNT }, (_, index) => {
    const className = index < state.tutorialStep ? "complete" : index === state.tutorialStep ? "current" : "";
    return `<i class="${className}" aria-hidden="true"></i>`;
  }).join("");
  progress.setAttribute(
    "aria-label",
    complete ? "Tutorial complete" : `Lesson ${state.tutorialStep + 1} of ${TUTORIAL_LESSON_COUNT}`,
  );

  const back = document.querySelector("[data-action='tutorial-back']");
  const skip = document.querySelector("[data-action='tutorial-skip']");
  const next = document.querySelector("[data-action='tutorial-next']");
  back.hidden = complete;
  back.disabled = state.tutorialStep === 0;
  skip.textContent = complete ? "MAIN MENU" : "SKIP";
  next.disabled = !complete && (!state.tutorialReady || state.tutorialStep === 4);
  next.classList.toggle("ready", complete || state.tutorialReady);
  const actionLabel = state.tutorialStep === 4 && state.tutorialReady ? "RELEASE TO SHOOT" : step.action;
  document.querySelector("[data-tutorial-action]").textContent = actionLabel;
}

function advanceTutorial() {
  if (state.mode !== "tutorial") return;
  if (state.tutorialStep >= TUTORIAL_LESSON_COUNT) {
    startGame("solo");
    toast("Tutorial complete • Free practice unlocked");
    return;
  }
  if (!state.tutorialReady || state.tutorialStep === 4) return;
  cancelAim();
  state.tutorialStep += 1;
  state.tutorialReady = tutorialRequirementMet(state.tutorialStep);
  if (state.tutorialStep === 3) resetSpinUi();
  syncGameUi();
  updateTutorialPanel();
}

function backTutorial() {
  if (state.mode !== "tutorial" || state.tutorialStep <= 0 || state.tutorialStep >= TUTORIAL_LESSON_COUNT) return;
  cancelAim();
  state.tutorialStep -= 1;
  state.tutorialReady = tutorialRequirementMet(state.tutorialStep);
  syncGameUi();
  updateTutorialPanel();
}

function canLocalPlayerShoot() {
  if (state.gameOver || state.ballsMoving || state.aiming) return false;
  if (state.mode === "cpu" && state.currentPlayer === 1) return false;
  if (state.mode === "tutorial" && ![1, 2, 4].includes(state.tutorialStep)) return false;
  return true;
}

function beginAim(event) {
  if (!canLocalPlayerShoot()) return;
  const point = sceneToWorld(event);
  const cue = ballEntries.find((entry) => entry.number === 0 && !entry.potted);
  if (!point || !cue) return;
  event.currentTarget.setPointerCapture?.(event.pointerId);
  state.aiming = true;
  state.power = 0;
  updateShotFromPointer(point);
  document.querySelector("[data-turn-banner]").classList.add("aiming");
  updateTutorialRequirement();
}

function moveAim(event) {
  if (!state.aiming) return;
  const point = sceneToWorld(event);
  if (point) updateShotFromPointer(point);
}

function updateShotFromPointer(point) {
  const cue = ballEntries.find((entry) => entry.number === 0 && !entry.potted);
  if (!cue) return;
  const pull = {
    x: cue.body.position.x - point.x,
    y: cue.body.position.y - point.y,
  };
  const magnitude = Math.hypot(pull.x, pull.y);
  if (magnitude > 2) {
    state.direction = { x: pull.x / magnitude, y: pull.y / magnitude };
  }
  state.power = Math.round(clamp((magnitude / 190) * 100, 0, 100));
  document.querySelector("[data-power-value]").textContent = String(state.power);
  document.querySelector("[data-power-fill]").style.height = `${state.power}%`;
  updateTutorialRequirement();
}

function releaseAim(event) {
  if (!state.aiming) return;
  event.currentTarget.releasePointerCapture?.(event.pointerId);
  document.querySelector("[data-turn-banner]").classList.remove("aiming");
  const power = state.power;
  state.aiming = false;
  if (state.mode === "tutorial" && state.tutorialStep < 4) {
    const lessonPassed = state.tutorialReady;
    cancelAim();
    state.tutorialReady = lessonPassed;
    updateTutorialPanel();
    return;
  }
  if (state.mode === "tutorial" && state.tutorialStep === 4 && !state.tutorialReady) {
    cancelAim();
    toast("Aim for a rail bounce and pull to at least 35%");
    updateTutorialPanel();
    return;
  }
  if (power < 4) {
    state.power = 0;
    document.querySelector("[data-power-value]").textContent = "0";
    document.querySelector("[data-power-fill]").style.height = "0%";
    return;
  }
  shoot(state.direction, power);
}

function cancelAim() {
  state.aiming = false;
  state.power = 0;
  document.querySelector("[data-power-value]").textContent = "0";
  document.querySelector("[data-power-fill]").style.height = "0%";
}

function shoot(direction, power) {
  const cue = ballEntries.find((entry) => entry.number === 0 && !entry.potted);
  if (!cue || state.ballsMoving || state.gameOver) return;
  clearTimeout(cpuTimer);
  state.aiming = false;
  state.shotPotted = [];
  state.firstHit = null;
  state.power = power;
  state.shotNumber += 1;
  state.spinFrames = 115;
  state.ballsMoving = true;
  state.settling = false;
  const velocity = 5.1 + power * 0.195;
  Body.setVelocity(cue.body, {
    x: direction.x * velocity,
    y: direction.y * velocity,
  });
  audio.strike(power);
  document.querySelector("[data-shot-number]").textContent = String(state.shotNumber).padStart(2, "0");
  document.querySelector("[data-table-status]").textContent = "BALLS IN MOTION";
  document.querySelector("[data-turn-banner]").textContent = "SHOT PLAYING";
  document.querySelector("[data-power-value]").textContent = "0";
  document.querySelector("[data-power-fill]").style.height = "0%";
}

function remainingForGroup(group) {
  return ballEntries.filter((entry) => !entry.potted && ballGroup(entry.number) === group).length;
}

function assignGroupsIfNeeded() {
  if (state.breakShot || state.groups[0] || state.groups[1]) return;
  const assignedBall = state.shotPotted.find((number) => ballGroup(number));
  if (!assignedBall) return;
  const group = ballGroup(assignedBall);
  state.groups[state.currentPlayer] = group;
  state.groups[1 - state.currentPlayer] = oppositeGroup(group);
  toast(`${state.currentPlayer === 0 ? "Player 1" : "Player 2"} takes ${group}`);
}

function restoreCueBall() {
  const cue = ballEntries.find((entry) => entry.number === 0);
  if (!cue?.potted) return;
  cue.potted = false;
  cue.mesh.visible = true;
  Body.setPosition(cue.body, { x: 264, y: TABLE.height / 2 });
  Body.setVelocity(cue.body, { x: 0, y: 0 });
  Composite.add(engine.world, cue.body);
}

function finishShot() {
  state.ballsMoving = false;
  if (state.mode === "tutorial" && state.tutorialStep === 4) {
    restoreCueBall();
    state.tutorialStep = TUTORIAL_LESSON_COUNT;
    state.tutorialReady = true;
    state.tutorialComplete = true;
    state.power = 0;
    persist();
    updateTutorialMenuStatus();
    syncGameUi();
    updateTutorialPanel();
    audio.win();
    toast("Tutorial complete • Precision unlocked");
    return;
  }
  const wasBreak = state.breakShot;
  state.breakShot = false;
  restoreCueBall();
  if (!wasBreak) assignGroupsIfNeeded();
  const playerGroup = state.groups[state.currentPlayer];
  const keptTurn =
    state.mode === "solo"
    || (wasBreak && state.shotPotted.some((number) => ballGroup(number)))
    || state.shotPotted.some((number) => ballGroup(number) === playerGroup);
  if (!keptTurn && state.mode !== "solo") {
    state.currentRun = 0;
    state.currentPlayer = 1 - state.currentPlayer;
  }
  if (wasBreak) toast("Table open • First legal pot claims a group");
  state.power = 0;
  syncGameUi();
  if (state.mode === "cpu" && state.currentPlayer === 1) scheduleCpuShot();
}

function resolveEightBall() {
  if (state.mode === "tutorial") return;
  const result = evaluateEightBall({
    pottedNumber: 8,
    playerGroup: state.groups[state.currentPlayer],
    remainingGroupBalls: remainingForGroup(state.groups[state.currentPlayer]),
  });
  const winner = result === "win" ? state.currentPlayer : 1 - state.currentPlayer;
  state.wins[winner] += 1;
  state.matches += 1;
  state.gameOver = true;
  state.ballsMoving = false;
  persist();
  audio.win();
  const resultCard = document.querySelector("[data-result-card]");
  resultCard.hidden = false;
  document.querySelector("[data-result-kicker]").textContent = result === "win" ? "CLEAN FINISH" : "EARLY EIGHT";
  document.querySelector("[data-result-title]").textContent = state.mode === "solo"
    ? result === "win"
      ? "TABLE CLEARED"
      : "RACK ENDED"
    : `${winner === 0 ? "PLAYER 1" : state.mode === "cpu" ? "CPU" : "PLAYER 2"} WINS`;
  document.querySelector("[data-result-copy]").textContent = result === "win"
    ? "The eight dropped on a legal table. Champion work."
    : "The eight went early. Re-rack and read the finish.";
  syncGameUi();
}

function scheduleCpuShot() {
  clearTimeout(cpuTimer);
  document.querySelector("[data-table-status]").textContent = "CPU READING TABLE";
  document.querySelector("[data-turn-banner]").textContent = "CPU AIMING";
  const delay = { easy: 1050, medium: 850, hard: 680 }[state.difficulty];
  cpuTimer = setTimeout(() => {
    if (state.currentPlayer !== 1 || state.gameOver || state.ballsMoving) return;
    const cue = ballEntries.find((entry) => entry.number === 0 && !entry.potted);
    const cpuGroup = state.groups[1];
    let targets = ballEntries.filter((entry) => !entry.potted && entry.number !== 0 && entry.number !== 8);
    if (cpuGroup) targets = targets.filter((entry) => ballGroup(entry.number) === cpuGroup);
    if (cpuGroup && remainingForGroup(cpuGroup) === 0) {
      targets = ballEntries.filter((entry) => !entry.potted && entry.number === 8);
    }
    if (!cue || !targets.length) return;
    targets.sort((a, b) => {
      const distanceA = Math.hypot(a.body.position.x - cue.body.position.x, a.body.position.y - cue.body.position.y);
      const distanceB = Math.hypot(b.body.position.x - cue.body.position.x, b.body.position.y - cue.body.position.y);
      return distanceA - distanceB;
    });
    const target = targets[0];
    const baseAngle = Math.atan2(target.body.position.y - cue.body.position.y, target.body.position.x - cue.body.position.x);
    const spread = { easy: 0.14, medium: 0.065, hard: 0.018 }[state.difficulty];
    const angle = baseAngle + (Math.random() - 0.5) * spread;
    state.direction = { x: Math.cos(angle), y: Math.sin(angle) };
    state.spin = { x: (Math.random() - 0.5) * 0.6, y: 0.2 };
    shoot(state.direction, { easy: 48, medium: 58, hard: 66 }[state.difficulty]);
  }, delay);
}

function groupLabel(group) {
  if (group === BALL_GROUPS.SOLIDS) return "SOLIDS 1–7";
  if (group === BALL_GROUPS.STRIPES) return "STRIPES 9–15";
  return "OPEN TABLE";
}

function updateBallTray() {
  const tray = document.querySelector("[data-ball-tray]");
  tray.innerHTML = Array.from({ length: 15 }, (_, index) => index + 1)
    .map((number) => {
      const potted = ballEntries.find((entry) => entry.number === number)?.potted;
      return `<span class="tray-ball ball-${number} ${potted ? "potted" : ""}">${number}</span>`;
    })
    .join("");
}

function syncGameUi() {
  const names = {
    tutorial: ["GUIDED TUTORIAL", state.tutorialStep >= TUTORIAL_LESSON_COUNT ? "LESSONS COMPLETE" : `LESSON ${state.tutorialStep + 1} OF ${TUTORIAL_LESSON_COUNT}`],
    solo: ["SOLO PRACTICE", "YOUR TABLE"],
    cpu: ["VERSUS CPU", state.currentPlayer === 0 ? "YOUR TURN" : "CPU TURN"],
    multiplayer: ["MULTIPLAYER", state.currentPlayer === 0 ? "PLAYER 1 TURN" : "PLAYER 2 TURN"],
  };
  document.querySelector("[data-mode-label]").textContent = names[state.mode][0];
  document.querySelector("[data-turn-label]").textContent = names[state.mode][1];
  document.querySelector("[data-player-two-name]").textContent = state.mode === "tutorial" ? "TABLE COACH" : state.mode === "cpu" ? "CPU RIVAL" : "PLAYER 2";
  document.querySelector("[data-player-one-group]").textContent = groupLabel(state.groups[0]);
  document.querySelector("[data-player-two-group]").textContent = groupLabel(state.groups[1]);
  document.querySelector("[data-player-one-score]").textContent = `P1  ${state.wins[0]}`;
  document.querySelector("[data-player-two-score]").textContent = `${state.mode === "tutorial" ? "COACH" : state.mode === "cpu" ? "CPU" : "P2"}  ${state.wins[1]}`;
  document.querySelectorAll("[data-player-card]").forEach((card, index) => {
    card.classList.toggle("active", index === state.currentPlayer);
  });
  document.querySelector("[data-table-status]").textContent = state.mode === "tutorial"
    ? state.tutorialStep >= TUTORIAL_LESSON_COUNT
      ? "LESSONS COMPLETE"
      : TUTORIAL_STEPS[state.tutorialStep].title.toUpperCase()
    : state.breakShot
    ? "BREAK THE RACK"
    : state.mode === "solo"
      ? "PRACTICE TABLE"
      : state.currentPlayer === 1 && state.mode === "cpu"
        ? "CPU READING TABLE"
        : "LINE UP YOUR SHOT";
  document.querySelector("[data-turn-banner]").textContent = state.mode === "tutorial"
    ? state.tutorialStep >= TUTORIAL_LESSON_COUNT
      ? "TUTORIAL COMPLETE"
      : state.tutorialStep === 4
      ? "BANK SHOT"
      : "COACH MODE"
    : state.mode === "cpu" && state.currentPlayer === 1
    ? "CPU AIMING"
    : state.mode === "solo"
      ? "FREE PLAY"
      : "YOUR SHOT";
  updateBallTray();
}

function startGame(mode, options = {}) {
  state.mode = mode;
  state.difficulty = options.difficulty || state.difficulty;
  state.raceTo = options.raceTo || state.raceTo;
  state.currentPlayer = 0;
  state.groups = [null, null];
  state.breakShot = true;
  state.shotNumber = 0;
  state.shotPotted = [];
  state.currentRun = 0;
  state.gameOver = false;
  state.ballsMoving = false;
  state.aiming = false;
  state.spin = { x: 0, y: 0 };
  if (mode === "tutorial") {
    state.tutorialStep = 0;
    state.tutorialReady = true;
  }
  document.querySelector("[data-result-card]").hidden = true;
  document.querySelector("[data-shot-number]").textContent = "01";
  document.querySelector("[data-view='menu']").hidden = true;
  document.querySelector("[data-view='game']").hidden = false;
  closeModal();
  setupTableRuntime();
  createPhysicsWorld();
  syncGameUi();
  resetSpinUi();
  updateTutorialPanel();
  persist();
  requestAnimationFrame(() => tableRuntime.resize());
}

function exitGame() {
  clearTimeout(cpuTimer);
  state.aiming = false;
  state.ballsMoving = false;
  updateTutorialPanel();
  document.querySelector("[data-view='game']").hidden = true;
  document.querySelector("[data-view='menu']").hidden = false;
  closeModal();
}

function replay() {
  startGame(state.mode, { difficulty: state.difficulty, raceTo: state.raceTo });
}

function modalTemplate(kind) {
  const templates = {
    cpu: `
      <p class="modal-eyebrow">VERSUS CPU</p>
      <h2 id="modal-title">Pick your rival.</h2>
      <p class="modal-intro">Every opponent plays the same shared table. Choose how tightly they read the line.</p>
      <div class="difficulty-grid" role="group" aria-label="CPU difficulty">
        <button type="button" data-difficulty="easy"><span>EASY</span><small>Relaxed aim</small></button>
        <button type="button" class="selected" data-difficulty="medium"><span>MEDIUM</span><small>Club regular</small></button>
        <button type="button" data-difficulty="hard"><span>HARD</span><small>Near-perfect line</small></button>
      </div>
      <div class="race-row"><span>RACE TO</span><button type="button" data-race="1">1</button><button type="button" class="selected" data-race="3">3</button><button type="button" data-race="5">5</button></div>
      <button class="modal-primary" type="button" data-action="start-cpu">START MATCH <span>→</span></button>`,
    multiplayer: `
      <p class="modal-eyebrow">MULTIPLAYER</p>
      <h2 id="modal-title">Share one live table.</h2>
      <p class="modal-intro">Host a private table or enter a six-character room code. Both players always see the same table.</p>
      <div class="room-actions">
        <button class="room-card host" type="button" data-action="host-room"><span>＋</span><strong>HOST TABLE</strong><small>Create a private room</small></button>
        <div class="join-card">
          <label for="room-code">ROOM CODE</label>
          <input id="room-code" inputmode="text" autocomplete="off" maxlength="6" placeholder="ABC123" />
          <button type="button" data-action="join-room">JOIN ROOM →</button>
        </div>
      </div>
      <small class="modal-note"><i></i> Private room setup is ready for shared-table play.</small>`,
    room: `
      <p class="modal-eyebrow">PRIVATE TABLE</p>
      <h2 id="modal-title">Room <span class="code-accent">${state.roomCode}</span></h2>
      <p class="modal-intro">Share this code with Player 2. The rack is ready and both players keep the same table view.</p>
      <div class="room-code-display"><span>${state.roomCode}</span><button type="button" data-action="copy-room">COPY</button></div>
      <div class="waiting-row"><i></i><span>Table ready</span><b>2 PLAYERS</b></div>
      <button class="modal-primary" type="button" data-action="start-multiplayer">START TABLE <span>→</span></button>`,
    howTo: `
      <p class="modal-eyebrow">HOW TO PLAY</p>
      <h2 id="modal-title">See the line. Then own it.</h2>
      <div class="how-grid">
        <article><span>01</span><h3>Pull back</h3><p>Drag away from the cue ball. A longer pull adds power.</p></article>
        <article><span>02</span><h3>Read the guide</h3><p>The white guide reflects off up to three rails. Gold predicts the object ball.</p></article>
        <article><span>03</span><h3>Add English</h3><p>Move the tip dot for topspin, draw, or side spin, then release to strike.</p></article>
      </div>
      <p class="rules-copy">Clear solids or stripes, then legally pocket the 8-ball. The break leaves the table open. No foul penalties or ball-in-hand.</p>
      <button class="modal-primary" type="button" data-action="tutorial">START GUIDED TUTORIAL <span>→</span></button>`,
    stats: `
      <p class="modal-eyebrow">PLAYER CARD</p>
      <h2 id="modal-title">Your table record.</h2>
      <div class="stats-grid">
        <article><strong>${state.matches}</strong><span>RACKS PLAYED</span></article>
        <article><strong>${state.wins[0]}</strong><span>RACKS WON</span></article>
        <article><strong>${state.longestRun}</strong><span>BEST RUN</span></article>
      </div>
      <p class="modal-intro">Progress is saved automatically on this device.</p>
      <button class="modal-primary" type="button" data-action="close-modal">BACK TO TABLE <span>→</span></button>`,
    settings: `
      <p class="modal-eyebrow">SETTINGS</p>
      <h2 id="modal-title">Tune your table.</h2>
      <div class="settings-list">
        <button type="button" data-action="sound"><span><strong>Sound effects</strong><small>Cue, rail, collision, and pocket audio</small></span><b data-setting-sound>${state.sound ? "ON" : "OFF"}</b></button>
        <div><span><strong>Aim assistance</strong><small>Three-rail trajectory and impact guides</small></span><b>ON</b></div>
        <div><span><strong>Table camera</strong><small>Full 2:1 surface always visible</small></span><b>LOCKED</b></div>
      </div>
      <button class="modal-primary" type="button" data-action="close-modal">SAVE SETTINGS <span>→</span></button>`,
  };
  return templates[kind];
}

function openModal(kind) {
  const backdrop = document.querySelector("[data-modal]");
  document.querySelector("[data-modal-content]").innerHTML = modalTemplate(kind);
  backdrop.hidden = false;
  requestAnimationFrame(() => backdrop.classList.add("open"));
}

function closeModal() {
  const backdrop = document.querySelector("[data-modal]");
  backdrop.classList.remove("open");
  backdrop.hidden = true;
}

function resetSpinUi() {
  state.spin = { x: 0, y: 0 };
  const dot = document.querySelector("[data-spin-dot]");
  if (dot) dot.style.transform = "translate(-50%, -50%)";
  const label = document.querySelector("[data-spin-label]");
  if (label) label.textContent = "CENTER";
}

function updateSpinFromPointer(event) {
  const control = document.querySelector("[data-spin-control]");
  const dot = document.querySelector("[data-spin-dot]");
  const rect = control.getBoundingClientRect();
  const radius = rect.width * 0.32;
  let x = event.clientX - (rect.left + rect.width / 2);
  let y = event.clientY - (rect.top + rect.height / 2);
  const magnitude = Math.hypot(x, y);
  if (magnitude > radius) {
    x = (x / magnitude) * radius;
    y = (y / magnitude) * radius;
  }
  state.spin = { x: x / radius, y: -y / radius };
  dot.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  const vertical = state.spin.y > 0.35 ? "TOP" : state.spin.y < -0.35 ? "DRAW" : "";
  const horizontal = state.spin.x > 0.35 ? "RIGHT" : state.spin.x < -0.35 ? "LEFT" : "";
  document.querySelector("[data-spin-label]").textContent = [vertical, horizontal].filter(Boolean).join(" + ") || "CENTER";
  updateTutorialRequirement();
}

const spinControl = document.querySelector("[data-spin-control]");
let draggingSpin = false;
spinControl.addEventListener("pointerdown", (event) => {
  draggingSpin = true;
  spinControl.setPointerCapture?.(event.pointerId);
  updateSpinFromPointer(event);
});
spinControl.addEventListener("pointermove", (event) => {
  if (draggingSpin) updateSpinFromPointer(event);
});
spinControl.addEventListener("pointerup", (event) => {
  draggingSpin = false;
  spinControl.releasePointerCapture?.(event.pointerId);
});

document.addEventListener("input", (event) => {
  if (event.target.id === "room-code") {
    event.target.value = normalizeRoomCode(event.target.value);
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action], [data-difficulty], [data-race]");
  if (!button) return;
  const action = button.dataset.action;
  audio.click();

  if (button.dataset.difficulty) {
    document.querySelectorAll("[data-difficulty]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    state.difficulty = button.dataset.difficulty;
    return;
  }
  if (button.dataset.race) {
    document.querySelectorAll("[data-race]").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    state.raceTo = Number(button.dataset.race);
    return;
  }

  const actions = {
    tutorial: () => startGame("tutorial"),
    solo: () => startGame("solo"),
    cpu: () => openModal("cpu"),
    multiplayer: () => openModal("multiplayer"),
    "how-to": () => openModal("howTo"),
    stats: () => openModal("stats"),
    settings: () => openModal("settings"),
    "close-modal": closeModal,
    "start-cpu": () => startGame("cpu", { difficulty: state.difficulty, raceTo: state.raceTo }),
    "host-room": () => {
      state.roomCode = makeRoomCode();
      openModal("room");
    },
    "join-room": () => {
      const code = normalizeRoomCode(document.querySelector("#room-code")?.value);
      if (code.length !== 6) {
        toast("Enter a complete 6-character room code");
        return;
      }
      state.roomCode = code;
      openModal("room");
    },
    "copy-room": async () => {
      try {
        await navigator.clipboard.writeText(state.roomCode);
        toast("Room code copied");
      } catch {
        toast(`Room code: ${state.roomCode}`);
      }
    },
    "start-multiplayer": () => startGame("multiplayer"),
    "tutorial-back": backTutorial,
    "tutorial-next": advanceTutorial,
    "tutorial-skip": () => {
      if (state.tutorialStep >= TUTORIAL_LESSON_COUNT) exitGame();
      else {
        startGame("solo");
        toast("Tutorial skipped • Free practice is ready");
      }
    },
    "exit-game": exitGame,
    replay,
    rerack: replay,
    sound: () => {
      state.sound = !state.sound;
      setSoundLabels();
      const setting = document.querySelector("[data-setting-sound]");
      if (setting) setting.textContent = state.sound ? "ON" : "OFF";
      persist();
      if (state.sound) audio.tone(520, 0.08, "sine", 0.03);
    },
  };
  actions[action]?.();
});

document.querySelector("[data-modal]").addEventListener("click", (event) => {
  if (event.target.matches("[data-modal]")) closeModal();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!document.querySelector("[data-modal]").hidden) closeModal();
    else if (!document.querySelector("[data-view='game']").hidden) exitGame();
  }
  if (event.key.toLowerCase() === "r" && !document.querySelector("[data-view='game']").hidden) replay();
});

setSoundLabels();
updateTutorialMenuStatus();
createMenuScene();
