# Billiards Champion

A responsive precision-first 8-ball game for desktop and mobile browsers.

## Highlights

- Three.js/WebGL top-down table with all 16 balls and six pockets
- Matter.js ball, rail, collision, and pocket physics
- Pull-back mouse and touch shooting
- Three-rail trajectory preview, object-ball impact guide, power %, and angle readout
- Draggable topspin, draw, and side-English control
- Solo practice, three CPU difficulty levels, and room-code multiplayer entry
- Fully visible 2:1 table at a 390×844 mobile viewport
- Saved sound, difficulty, match, and run statistics

## Commands

```bash
npm install
npm run dev
npm test
npm run build
npm run deploy
```

## Product source

See `Billiards-Champion-PRD.md` and `.agent` for product requirements and shipping checks.

## Deployment

The Cloudflare Worker serves the static Vite build at:

`https://billiards-champion.fantomzone.app`
