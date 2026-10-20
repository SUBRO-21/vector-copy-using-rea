/* Skyline Escape - an original free-running chase game inspired by the parkour runner genre.
   Everything (levels, gadgets, tricks, outfits) is unlocked and free. No ads, no purchases. */
(() => {
'use strict';

// ---------------------------------------------------------------- utilities
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (k) => k * k * (3 - 2 * k);
const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- save data
const SAVE_KEY = 'skyline-escape-save-v1';
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } }
const save = Object.assign({
  stars: {}, best: {}, endlessBest: 0, coins: 0, skin: 'midnight', muted: false, tricksOff: [],
  gadgets: { shoes: true, springs: false, magnet: true, shield: false, trickpro: false },
}, loadSave());
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ } }

// ---------------------------------------------------------------- content
// Prices are only shown crossed out: every item is free and unlocked.
const GADGETS = [
  { id: 'shoes', name: 'Velocity Shoes', desc: '+8% running speed.', price: '$1.99' },
  { id: 'springs', name: 'Spring Soles', desc: '+10% jump height. Gaps get easier.', price: '$2.99' },
  { id: 'magnet', name: 'Cube Magnet', desc: 'Pulls in nearby data cubes.', price: '$1.99' },
  { id: 'shield', name: 'Second Wind', desc: 'Survive one capture or fall per run.', price: '$4.99' },
  { id: 'trickpro', name: 'Trick Master', desc: 'Tricks score double and push the hunter back twice as far.', price: '$3.99' },
];
const SKIN_BASE = { skin: '#2b2522', hair: '#0c0c0f' };
const SKINS = [
  { id: 'midnight', name: 'Midnight Suit', body: '#16181e', back: '#2e323c', shirt: '#e9edf2', tie: '#19c3d6' },
  { id: 'charcoal', name: 'Charcoal Suit', body: '#3a3e47', back: '#555a66', shirt: '#f2f2f2', tie: '#e0353b', price: '$0.99' },
  { id: 'navy', name: 'Navy Suit', body: '#15223f', back: '#2a3c63', shirt: '#eef3fb', tie: '#ffd34d', price: '$0.99' },
  { id: 'crimson', name: 'Crimson Suit', body: '#4a0d14', back: '#6d1f27', shirt: '#f4e9ea', tie: '#14161c', price: '$1.99' },
  { id: 'emerald', name: 'Emerald Suit', body: '#0f3b2e', back: '#1f5a48', shirt: '#eef6f2', tie: '#ffd34d', price: '$1.99' },
  { id: 'royal', name: 'Royal Purple', body: '#2a0c4a', back: '#432070', shirt: '#f1eafa', tie: '#c26bff', price: '$2.99' },
  { id: 'tux', name: 'Black Tuxedo', body: '#0b0c10', back: '#23262d', shirt: '#ffffff', tie: '#0b0c10', price: '$4.99' },
].map((s) => ({ ...SKIN_BASE, ...s }));
const HUNTER_LOOK = { body: '#1c1f26', back: '#363a46', shirt: '#2a2e37', tie: '#e0353b', skin: '#1c1f26', hair: '#1c1f26', helmet: '#2e323d', visor: '#ff3b41' };
const THEMES = [
  { skyTop: '#bcd6e6', skyBot: '#f2f6f8', sun: 'rgba(255,255,255,.7)', far: '#c3d2dc', mid: '#a7b8c5', near: '#8a9cab',
    roof: '#56606e', cap: '#2f3640', win: '#47505c', lit: '#8e9aa8' },
  { skyTop: '#ecd2a8', skyBot: '#fbf2e3', sun: 'rgba(255,240,210,.8)', far: '#dfc7a2', mid: '#c7ab85', near: '#a98f6d',
    roof: '#5d544b', cap: '#3a322b', win: '#4d453d', lit: '#a08f78' },
  { skyTop: '#e3bdd2', skyBot: '#fbe7e1', sun: 'rgba(255,225,215,.85)', far: '#d9bccb', mid: '#bf9fb3', near: '#9e8296',
    roof: '#4f4a5c', cap: '#2f2b39', win: '#433e4f', lit: '#9a8da8' },
];
const LEVEL_NAMES = ['First Steps', 'Rooftop Run', 'Crate Alley', 'Low Clearance', 'The Climb', 'Flip Side',
  'Steel Yards', 'Smokestacks', 'Crane Line', 'Sunset Spires', 'Glass Towers', 'The Last Edge'];
const LEVELS = LEVEL_NAMES.map((name, i) => ({
  id: i, name, theme: Math.floor(i / 4), diff: i / (LEVEL_NAMES.length - 1), length: 6000 + i * 800, seed: 1000 + i * 7919,
}));

// Air tricks, performed by jumping inside a trick zone. rot/sx are functions of eased progress 0..1.
const TRICK_DEFS = [
  { name: 'FRONT FLIP', pose: 'tuck', dur: 0.55, rot: (e) => e * TAU, price: '250' },
  { name: 'BACK FLIP', pose: 'tuck', dur: 0.55, rot: (e) => -e * TAU, price: '250' },
  { name: 'WEBSTER', pose: 'webster', dur: 0.55, rot: (e) => e * TAU, price: '450' },
  { name: 'FOLD FLIP', pose: 'pike', dur: 0.58, rot: (e) => e * TAU, price: '1150' },
  { name: 'STRAIGHT LEGS FLIP', pose: 'layout', dur: 0.6, rot: (e) => e * TAU, price: '950' },
  { name: 'CHEAT GAINER', pose: 'layout', dur: 0.6, rot: (e) => -e * TAU, price: '800' },
  { name: 'DOUBLE BACK', pose: 'tuck', dur: 0.7, boost: 1.12, rot: (e) => -e * TAU * 2, points: 250, price: '1400' },
  { name: 'SCREWDRIVER', pose: 'layout', dur: 0.6, rot: (e) => Math.sin(e * Math.PI) * 0.35, sx: (e) => Math.cos(e * TAU * 2), price: '400' },
  { name: 'AIR SPIN', pose: 'spin', dur: 0.55, sx: (e) => Math.cos(e * TAU), price: '650' },
  { name: 'SPIN BICYCLE', pose: 'bicycle', dur: 0.6, sx: (e) => Math.cos(e * TAU), price: '1300' },
  { name: 'SUPERMAN', pose: 'superman', dur: 0.6, window: [0.12, 0.88], price: '600' },
  { name: 'SWALLOW', pose: 'swallow', dur: 0.6, rot: (e) => Math.sin(e * Math.PI) * 0.45, window: [0.1, 0.9], price: '1050' },
  { name: 'FLYING ARROW', pose: 'arrow', dur: 0.6, rot: (e) => Math.sin(e * Math.PI) * -0.25, window: [0.12, 0.88], price: '900' },
];
const SWING_TRICK = { name: 'GIANT SWING', pose: 'tuck', dur: 0.42, points: 250, rot: (e) => -1.75 - (TAU - 1.75) * e };
// Vaults happen when you jump right in front of a crate or desk. The vault is picked by obstacle length.
const VAULTS = {
  'SPEED VAULT': { pose: 'speedvault' },
  'DASH VAULT': { pose: 'dashvault' },
  'THIEF VAULT': { pose: 'thief' },
  'REVERSE VAULT': { pose: 'speedvault', sx: (q) => Math.cos(q * TAU) },
  'KONG VAULT': { pose: 'kong' },
  'MONKEY VAULT': { pose: 'kong' },
  'DOUBLE KONG': { pose: 'kong', double: true },
};
const SHORT_VAULTS = ['SPEED VAULT', 'DASH VAULT', 'THIEF VAULT', 'REVERSE VAULT'];

// ---------------------------------------------------------------- physics constants
const GRAV = 2100, JUMP_V = 740, BASE_SPEED = 360;
const P_W = 26, P_H = 80, P_HS = 36;
const CLIMB_MAX = 165, DT = 1 / 120, FALL_Y = 800, ROLL_T = 0.42, ROLL_IMPACT = 1000, SWING_R = 50;

// ---------------------------------------------------------------- canvas
const canvas = $('game');
const ctx = canvas.getContext('2d');
let VW = 960, VH = 540, scale = 1, dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  scale = Math.min(h / 540, w / 720);
  VW = w / scale; VH = h / scale;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  $('rotateHint').hidden = !(h > w && 'ontouchstart' in window);
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- audio (synthesised, no files)
let AC = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || /** @type {any} */ (window).webkitAudioContext)(); } catch (e) { return null; } }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(freq, dur, type = 'square', vol = 0.06, slide = 0, delay = 0) {
  if (save.muted || (G && G.demo)) return;
  const a = audio(); if (!a) return;
  const t0 = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, vol = 0.05) {
  if (save.muted || (G && G.demo)) return;
  const a = audio(); if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1200; g.gain.value = vol;
  s.buffer = buf; s.connect(f).connect(g).connect(a.destination); s.start();
}
const SFX = {
  jump: () => tone(300, 0.12, 'square', 0.04, 260),
  land: () => tone(110, 0.07, 'sine', 0.08),
  coin: () => { tone(880, 0.07, 'triangle', 0.05); tone(1320, 0.09, 'triangle', 0.04, 0, 0.05); },
  trick: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'triangle', 0.05, 0, i * 0.06)),
  vault: () => { tone(420, 0.08, 'triangle', 0.05, 200); tone(660, 0.1, 'triangle', 0.04, 0, 0.07); },
  swing: () => { tone(200, 0.35, 'sine', 0.06, 500); noise(0.2, 0.03); },
  sprint: () => [392, 523, 659].forEach((f, i) => tone(f, 0.09, 'square', 0.035, 0, i * 0.04)),
  roll: () => noise(0.18, 0.05),
  stumble: () => { tone(170, 0.22, 'sawtooth', 0.06, -90); noise(0.15, 0.06); },
  slide: () => noise(0.25, 0.04),
  climb: () => tone(220, 0.09, 'square', 0.03, 140),
  caught: () => { tone(240, 0.7, 'sawtooth', 0.07, -190); noise(0.3, 0.08); },
  fell: () => tone(500, 0.8, 'sine', 0.07, -440),
  win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.18, 'triangle', 0.06, 0, i * 0.09)),
  shield: () => [392, 523, 784].forEach((f, i) => tone(f, 0.15, 'sine', 0.07, 0, i * 0.07)),
};

// ---------------------------------------------------------------- level generation
function lastEnd(L) { const r = L.roofs[L.roofs.length - 1]; return r.x + r.w; }
function addCoin(L, x, y) { L.coins.push({ x, y, taken: false }); L.totalCoins++; }

function addRoof(L) {
  const R = L.rng, d = L.diff, prev = L.roofs[L.roofs.length - 1];
  const prevEnd = prev.x + prev.w;
  let k = R(), kind;
  const swingChance = L.roofs.length > 3 && !L.lastWasSwing ? 0.1 + d * 0.08 : 0;
  if (k < swingChance) kind = 'swing';
  else { k = R(); kind = k < 0.58 ? 'gap' : k < 0.78 ? 'wall' : 'drop'; }
  let gap = 0, top = prev.top;
  if (kind === 'swing') { gap = 300 + R() * 30; top = prev.top - 30 + R() * 60; }
  else if (kind === 'gap') { gap = 80 + R() * 50 + d * 40; top = prev.top - 70 + R() * 170; }
  else if (kind === 'wall') top = prev.top - (70 + R() * (50 + d * 30));
  else top = prev.top + 70 + R() * 110;
  top = clamp(top, 230, 470);
  if ((kind === 'wall' || kind === 'drop') && Math.abs(top - prev.top) < 50) { kind = 'gap'; gap = 90 + R() * 40; }
  if (kind === 'gap' && prev.top - top > 50) gap = Math.min(gap, 120);
  const roof = { x: prevEnd + gap, w: 540 + R() * 480 - d * 80, top, bottom: 1e9 };
  L.roofs.push(roof);
  L.lastWasSwing = kind === 'swing';

  if (kind === 'swing') {
    const bar = { x: prevEnd + 125, y: prev.top - 175, used: false };
    L.swings.push(bar);
    // cubes along the release arc
    const xr = bar.x + 49, yr = bar.y + 31;
    for (let i = 1; i <= 5; i++) {
      const dx = i * 55, t = dx / 414;
      addCoin(L, xr + dx, yr - 660 * t + 1050 * t * t - 40);
    }
  }
  // trick zone at the end of the previous roof, before a gap or drop
  // (only when the landing roof is long enough to catch a boosted trick jump)
  if ((kind === 'gap' || kind === 'drop') && prev.w > 300 && roof.w > 620 && R() < 0.45 + d * 0.25) {
    L.zones.push({ x1: prevEnd - 190, x2: prevEnd - 10, top: prev.top, trick: L.trickPool[Math.floor(R() * L.trickPool.length)], done: false });
    L.totalZones++;
  }
  if (kind === 'gap') {
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      addCoin(L, prevEnd - 40 + (gap + 80) * t, lerp(prev.top, top, t) - 70 - Math.sin(t * Math.PI) * 55);
    }
  }
  // obstacles on the new roof: keep the landing zone of the way you arrived and the last 230px clear
  let cur = roof.x + (kind === 'gap' || kind === 'swing' ? 430 : kind === 'drop' ? 330 : 200);
  const end = roof.x + roof.w - 230;
  while (cur < end) {
    const r = R();
    if (r < 0.2 + d * 0.1) {
      L.boxes.push({ x: cur, w: 48, top: top - 44, bottom: top, base: top, isBox: true, vault: SHORT_VAULTS[Math.floor(R() * SHORT_VAULTS.length)] });
      for (let i = 0; i < 3; i++) addCoin(L, cur - 30 + i * 54, top - 95 - (i === 1 ? 25 : 0));
      cur += 300;
    } else if (r < 0.36 + d * 0.14) {
      const w = Math.min(end - cur, 100 + R() * (60 + d * 100));
      if (w < 90) { cur += 120; continue; }
      const vault = w > 170 ? 'DOUBLE KONG' : R() < 0.5 ? 'KONG VAULT' : 'MONKEY VAULT';
      L.boxes.push({ x: cur, w, top: top - 48, bottom: top - 38, base: top, isBox: true, table: true, vault });
      for (let x = cur + 15; x < cur + w; x += 40) addCoin(L, x, top - 85);
      cur += w + 260;
    } else if (r < 0.5 + d * 0.22) {
      L.bars.push({ x: cur, w: 90, top: top - 125, bottom: top - 52, hit: false });
      for (let i = 0; i < 3; i++) addCoin(L, cur + 5 + i * 40, top - 18);
      cur += 320;
    } else if (r < 0.58 + d * 0.22) {
      L.pads.push({ x1: cur, x2: cur + 170, top, used: false, hinted: false });
      cur += 360;
    } else if (r < 0.8) {
      for (let i = 0; i < 4; i++) addCoin(L, cur + i * 40, top - 30);
      cur += 220;
    } else cur += 160;
  }
}

function newLevel(def, endless) {
  const pool = TRICK_DEFS.filter((t) => !save.tricksOff.includes(t.name));
  const L = {
    def, endless, rng: mulberry32(def.seed), diff: endless ? 0 : def.diff, theme: THEMES[def.theme % THEMES.length],
    roofs: [{ x: -1400, w: 2200, top: 400, bottom: 1e9 }], boxes: [], bars: [], coins: [], zones: [], swings: [], pads: [],
    totalCoins: 0, totalZones: 0, finishX: Infinity, trickPool: pool.length ? pool : TRICK_DEFS, lastWasSwing: false,
  };
  if (endless) { while (lastEnd(L) < 3000) addRoof(L); }
  else {
    while (lastEnd(L) < def.length) addRoof(L);
    const prev = L.roofs[L.roofs.length - 1];
    const fin = { x: prev.x + prev.w + 110, w: 1600, top: prev.top, bottom: 1e9 };
    L.roofs.push(fin);
    L.finishX = fin.x + 420;
  }
  return L;
}

function extendEndless(L, x) {
  while (lastEnd(L) < x + 2500) { L.diff = Math.min(1, lastEnd(L) / 30000); addRoof(L); }
  const cut = x - 2500;
  if (L.roofs.length > 4 && L.roofs[0].x + L.roofs[0].w < cut) {
    const keep = (o) => o.x + (o.w || 0) > cut || o.x2 > cut;
    L.roofs = L.roofs.filter(keep); L.boxes = L.boxes.filter(keep); L.bars = L.bars.filter(keep);
    L.coins = L.coins.filter((c) => c.x > cut); L.zones = L.zones.filter(keep);
    L.swings = L.swings.filter((s) => s.x > cut); L.pads = L.pads.filter(keep);
  }
}

function topAt(L, x) {
  let best = null;
  for (const r of L.roofs) if (x >= r.x && x < r.x + r.w && (best === null || r.top < best)) best = r.top;
  return best;
}

// ---------------------------------------------------------------- character animation
const SEG = { T: 26, TH: 19, SH: 19, UA: 15, FA: 14 };
const POSE_KEYS = ['lean', 'rT', 'rK', 'lT', 'lK', 'rA', 'rE', 'lA', 'lE'];
// States drawn with the hip at a fixed height above the feet reference (air moves, vaults, rolls).
// Every other state is planted: the lowest body point touches the ground.
const HIP = {
  jump: 40, fall: 40, flail: 40, tuck: 40, layout: 40, superman: 40, swallow: 40, pike: 40, webster: 40,
  arrow: 40, spin: 40, bicycle: 40, hang: 40, speedvault: 15, thief: 10, dashvault: 21, kong: 26, roll: 20,
};

function poseFor(state, ph) {
  const s = Math.sin(ph), c = Math.cos(ph), s2 = -s, c2 = -c;
  switch (state) {
    case 'run': return { lean: 0.25, rT: 0.1 + s * 0.85, rK: 0.25 + Math.max(0, c) * 1.5, lT: 0.1 + s2 * 0.85, lK: 0.25 + Math.max(0, c2) * 1.5, rA: -s * 0.9, rE: 1.4, lA: -s2 * 0.9, lE: 1.4 };
    case 'sprint': return { lean: 0.38, rT: 0.15 + s * 1.0, rK: 0.3 + Math.max(0, c) * 1.7, lT: 0.15 + s2 * 1.0, lK: 0.3 + Math.max(0, c2) * 1.7, rA: -s * 1.2, rE: 1.5, lA: -s2 * 1.2, lE: 1.5 };
    case 'jump': return { lean: 0.18, rT: 1.15, rK: 1.4, lT: -0.35, lK: 0.7, rA: -0.7, rE: 0.8, lA: 1.9, lE: 0.5 };
    case 'fall': return { lean: 0.05, rT: 0.7, rK: 0.6, lT: 0.1, lK: 0.9, rA: 2.4, rE: 0.3, lA: 1.6, lE: 0.4 };
    case 'flail': return { lean: -0.2 + s * 0.2, rT: 0.6 + s * 0.6, rK: 0.8, lT: 0.2 - s * 0.6, lK: 0.8, rA: 2.6 + s * 0.8, rE: 0.3, lA: 1.8 - s * 0.8, lE: 0.3 };
    case 'slide': return { lean: -1.0, rT: 1.5, rK: 0.1, lT: 1.1, lK: 1.0, rA: -0.5, rE: 0.2, lA: 0.6, lE: 0.8 };
    case 'stumble': return { lean: 0.85 + s * 0.1, rT: 0.2 + s * 0.4, rK: 0.6, lT: 0.2 + s2 * 0.4, lK: 0.6, rA: 2.4 + s * 1.1, rE: 0.3, lA: 1.4 - s * 1.1, lE: 0.3 };
    case 'push': return { lean: 0.55, rT: 0.2 + s * 0.3, rK: 0.5, lT: 0.2 + s2 * 0.3, lK: 0.5, rA: 1.5, rE: 0.2, lA: 1.4, lE: 0.3 };
    case 'climb': {
      const k = clamp(ph, 0, 1);
      if (k < 0.55) { const w = Math.sin(k * 22) * 0.35; return { lean: 0.15, rT: 1.3 + w, rK: 1.2, lT: 1.0 - w, lK: 1.5, rA: 2.9, rE: 0.2, lA: 2.7, lE: 0.3 }; }
      const q = (k - 0.55) / 0.45;
      return { lean: 0.55 - q * 0.3, rT: 1.7 - q * 1.4, rK: 2.0 - q * 1.6, lT: 0.4, lK: 0.7, rA: lerp(1.7, 0.3, q), rE: 0.2, lA: lerp(1.5, 0.2, q), lE: 0.2 };
    }
    case 'tuck': case 'roll': return { lean: 0.3, rT: 1.9, rK: 2.4, lT: 1.8, lK: 2.3, rA: 0.9, rE: 1.2, lA: 0.8, lE: 1.3 };
    case 'layout': return { lean: 0, rT: 0.15, rK: 0.1, lT: -0.15, lK: 0.1, rA: 1.57, rE: 0, lA: -1.57, lE: 0 };
    case 'pike': return { lean: 0.9, rT: 2.1, rK: 0, lT: 2.0, lK: 0.05, rA: 1.6, rE: 0, lA: 1.5, lE: 0 };
    case 'webster': return { lean: 0.35, rT: 1.8, rK: 0.05, lT: -0.3, lK: 1.2, rA: 2.2, rE: 0.3, lA: 1.8, lE: 0.4 };
    case 'swallow': return { lean: 0.7, rT: -0.5, rK: 0.05, lT: -0.6, lK: 0.1, rA: -2.2, rE: 0, lA: -2.4, lE: 0 };
    case 'arrow': return { lean: 1.5, rT: -1.45, rK: 0, lT: -1.6, lK: 0.05, rA: 0.2, rE: 0, lA: 0.1, lE: 0 };
    case 'spin': return { lean: 0.05, rT: 0.9, rK: 1.6, lT: 0.1, lK: 0.4, rA: 2.6, rE: 0.2, lA: 0.6, lE: 1.2 };
    case 'bicycle': return { lean: 0.1, rT: 1.0 + s * 0.8, rK: 1.0 + c * 0.6, lT: 1.0 - s * 0.8, lK: 1.0 - c * 0.6, rA: 2.5, rE: 0.3, lA: 1.2, lE: 0.6 };
    case 'superman': return { lean: 1.4, rT: -0.6, rK: 0.1, lT: -0.4, lK: 0.3, rA: 0.34, rE: 0, lA: 0.2, lE: 0 };
    case 'speedvault': return { lean: -0.9, rT: 1.6, rK: 0.15, lT: 1.3, lK: 0.5, rA: 1.0, rE: 0, lA: 2.2, lE: 0.4 };
    case 'thief': return { lean: -0.6, rT: 1.7, rK: 0.2, lT: 0.9, lK: 1.4, rA: 0.7, rE: 0, lA: 2.4, lE: 0.3 };
    case 'dashvault': return { lean: -1.25, rT: 1.9, rK: 0.1, lT: 1.8, lK: 0.2, rA: 1.05, rE: 0, lA: 1.05, lE: 0 };
    case 'kong': return { lean: 1.45, rT: 1.7, rK: 2.2, lT: 1.6, lK: 2.3, rA: -1.25, rE: 0, lA: -1.2, lE: 0 };
    case 'hang': return { lean: 0, rT: 0.15, rK: 0.25, lT: -0.05, lK: 0.35, rA: 3.1, rE: 0, lA: 3.0, lE: 0 };
    case 'win': return { lean: 0, rT: 0.08, rK: 0.05, lT: -0.08, lK: 0.05, rA: 2.8, rE: 0.3, lA: 2.9, lE: 0.2 };
    case 'dead': return { lean: -1.45, rT: 1.5, rK: 0.2, lT: 1.3, lK: 0.5, rA: -1.2, rE: 0.3, lA: 0.4, lE: 0.2 };
    case 'tackle': return { lean: 1.2, rT: -0.3, rK: 0.4, lT: 0.6, lK: 0.8, rA: 0.5, rE: 0.2, lA: 0.4, lE: 0.2 };
    default: return { lean: 0.05, rT: 0.1, rK: 0.05, lT: -0.1, lK: 0.05, rA: 0.15, rE: 0.3, lA: -0.1, lE: 0.3 };
  }
}
function blendPose(cur, target, k) { for (const key of POSE_KEYS) cur[key] += (target[key] - cur[key]) * k; }

function solve(p) {
  const u = [Math.sin(p.lean), -Math.cos(p.lean)];
  const sh = [u[0] * SEG.T * 0.9, u[1] * SEG.T * 0.9];
  const leg = (th, kn) => {
    const k = [Math.sin(th) * SEG.TH, Math.cos(th) * SEG.TH], a = th - kn;
    return [k, [k[0] + Math.sin(a) * SEG.SH, k[1] + Math.cos(a) * SEG.SH]];
  };
  const arm = (a, e) => {
    const A = a + p.lean, el = [sh[0] + Math.sin(A) * SEG.UA, sh[1] + Math.cos(A) * SEG.UA], B = A + e;
    return [el, [el[0] + Math.sin(B) * SEG.FA, el[1] + Math.cos(B) * SEG.FA]];
  };
  return { sh, lL: leg(p.lT, p.lK), rL: leg(p.rT, p.rK), lA: arm(p.lA, p.lE), rA: arm(p.rA, p.rE) };
}
function groundHip(pose) {
  const J = solve(pose);
  return Math.max(J.lL[1][1], J.rL[1][1], J.lA[1][1], J.rA[1][1], J.lL[0][1], J.rL[0][1]) + 3;
}

function capsule(c, a, b, ra, rb) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 0.001;
  const nx = -dy / L, ny = dx / L;
  c.beginPath();
  c.moveTo(a[0] + nx * ra, a[1] + ny * ra); c.lineTo(b[0] + nx * rb, b[1] + ny * rb);
  c.lineTo(b[0] - nx * rb, b[1] - ny * rb); c.lineTo(a[0] - nx * ra, a[1] - ny * ra);
  c.closePath(); c.fill();
  c.beginPath(); c.arc(a[0], a[1], ra, 0, TAU); c.fill();
  c.beginPath(); c.arc(b[0], b[1], rb, 0, TAU); c.fill();
}
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fill(); }

function drawLeg(c, hip, seg, col, shoe) {
  const [k, f] = seg;
  c.fillStyle = col;
  capsule(c, hip, k, 6.3, 4.8);
  capsule(c, k, f, 4.6, 3.2);
  const dx = f[0] - k[0], dy = f[1] - k[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const fx = uy, fy = -ux; // forward, perpendicular to the shin
  c.fillStyle = shoe;
  capsule(c, [f[0] - fx * 2.5 + ux * 1.5, f[1] - fy * 2.5 + uy * 1.5], [f[0] + fx * 8 + ux * 2, f[1] + fy * 8 + uy * 2], 3.5, 2.6);
}
function drawArm(c, sh, seg, col, skin) {
  const [e, h] = seg;
  c.fillStyle = col;
  capsule(c, sh, e, 4.5, 3.6);
  capsule(c, e, h, 3.5, 2.8);
  c.fillStyle = skin;
  c.beginPath(); c.arc(h[0], h[1], 3.2, 0, TAU); c.fill();
}

// Draws a suited runner (or the armoured hunter). The actor holds x/y (feet reference), pose, state, rot, sx, hipH.
function drawFigure(c, a, look, isHunter, t) {
  const pose = a.pose, J = solve(pose), size = isHunter ? 1.08 : 1;
  c.save();
  c.translate(a.x, a.y - a.hipH * size);
  if (a.rot) c.rotate(a.rot);
  c.scale((a.sx === undefined ? 1 : a.sx) * size, size);
  const u = [Math.sin(pose.lean), -Math.cos(pose.lean)], n = [Math.cos(pose.lean), Math.sin(pose.lean)];
  const P = (al, sd) => [u[0] * al + n[0] * sd, u[1] * al + n[1] * sd];
  const flap = Math.sin(t * 17 + a.x * 0.01) * 2.5;
  const shoe = isHunter ? '#0d0e12' : '#070708';

  // back limbs
  drawArm(c, J.sh, J.lA, look.back, look.skin);
  drawLeg(c, [-1, 0], J.lL, look.back, shoe);

  // jacket tails (flap in the wind)
  c.fillStyle = look.body;
  poly(c, [P(5, 7.5), P(-7, 8), P(-9, -2), P(-12, -11 - flap), P(4, -8.5)]);
  // torso
  c.beginPath();
  const hb = P(-1, -7.5), hf = P(-1, 7), cf = P(15, 9.8), sf = P(24, 6.5), sb = P(25, -7.5), bm = P(12, -9.2);
  c.moveTo(hb[0], hb[1]); c.lineTo(hf[0], hf[1]);
  let q = P(8, 9.4); c.quadraticCurveTo(q[0], q[1], cf[0], cf[1]);
  q = P(22, 10); c.quadraticCurveTo(q[0], q[1], sf[0], sf[1]);
  c.lineTo(sb[0], sb[1]);
  q = P(17, -10.5); c.quadraticCurveTo(q[0], q[1], bm[0], bm[1]);
  q = P(3, -8.8); c.quadraticCurveTo(q[0], q[1], hb[0], hb[1]);
  c.fill();
  if (isHunter) {
    c.fillStyle = look.back; // shoulder armour + belt
    c.beginPath(); const sp = P(21, -2); c.arc(sp[0], sp[1], 7, 0, TAU); c.fill();
    c.fillStyle = look.tie; poly(c, [P(1, -8), P(1, 7.5), P(4, 8), P(4, -8.5)]);
  } else {
    c.fillStyle = look.shirt; poly(c, [P(24.5, 3), P(23.5, 7.2), P(17.5, 9.6)]);
    c.fillStyle = look.tie; poly(c, [P(22.5, 7.3), P(22.5, 9.3), P(11, 10.9), P(9.5, 9.7)]);
  }
  // neck + head
  c.fillStyle = look.skin;
  capsule(c, P(23, 0.5), P(28, 1.5), 3.8, 3.4);
  const hc = P(33.5, 1.6);
  c.save();
  c.translate(hc[0], hc[1]); c.rotate(pose.lean);
  c.beginPath(); c.arc(0, 0, 7.2, 0, TAU); c.fill();
  c.beginPath(); c.arc(6.6, 0.8, 1.7, 0, TAU); c.fill(); // nose
  if (isHunter) {
    c.fillStyle = look.helmet;
    c.beginPath(); c.arc(0, -0.5, 8.6, Math.PI * 0.82, Math.PI * 2.08); c.lineTo(-7.5, 4.5); c.closePath(); c.fill();
    c.fillStyle = look.visor; c.fillRect(1.5, -2.6, 7.6, 3.2);
    c.fillStyle = '#ffd0d2'; c.fillRect(4, -1.8, 3.5, 1.2);
  } else {
    c.fillStyle = look.hair;
    c.beginPath(); c.arc(0, -0.6, 7.7, Math.PI * 0.88, Math.PI * 1.86); c.lineTo(5, -4.5); c.lineTo(-7.3, 3.5); c.closePath(); c.fill();
  }
  c.restore();

  // front limbs
  drawLeg(c, [1, 0], J.rL, look.body, shoe);
  drawArm(c, J.sh, J.rA, look.body, look.skin);
  c.restore();
}

function newActor(x, y) { return { x, y, state: 'run', ph: 0, rot: 0, sx: 1, pose: poseFor('run', 0), hipH: 37, wasGround: true }; }
function animateActor(a, dt) {
  blendPose(a.pose, poseFor(a.state, a.ph), Math.min(1, dt * 22));
  const air = HIP[a.state];
  const target = air !== undefined ? air : groundHip(a.pose);
  a.hipH = air === undefined && a.wasGround ? target : lerp(a.hipH, target, Math.min(1, dt * 22));
  a.wasGround = air === undefined;
}

// ---------------------------------------------------------------- game state
let G = null;                       // active run (also used for the menu's attract-mode demo)
let currentSkin = SKINS.find((s) => s.id === save.skin) || SKINS[0];

function baseSpeed() {
  let s = BASE_SPEED * (G.gear.shoes ? 1.08 : 1);
  s *= G.endless ? 1 + Math.min(0.25, G.p.x / 40000) : 1 + G.level.diff * 0.06;
  return s;
}
function restTau() { return G.endless ? 0.95 - Math.min(0.35, G.p.x / 60000) : 0.95; }
function recoverRate() { return G.endless ? 0.035 : 0.05 - G.level.diff * 0.03; }

function newPlayer() {
  return Object.assign(newActor(0, 400), {
    vx: BASE_SPEED, vy: 0, grounded: true, coyote: 0, jumpBuf: 0, slideBuf: 0, sprintBuf: 0, slideOnLand: false,
    slideT: 0, stumbleT: 0, rollT: 0, boostT: 0, move: null, trick: null, pushing: false, lastRoof: null,
  });
}

function startRun(def, endless, demo = false) {
  const level = newLevel(endless ? { ...def, seed: (Date.now() & 0xffffff) } : def, endless);
  G = {
    def, endless, demo, level, p: newPlayer(), gear: demo ? { shoes: true } : { ...save.gadgets },
    mode: 'playing', phase: 'run', time: 0, endT: 0, finished: false,
    tau: 0.95, tauTarget: 0.95, trail: [], hunter: newActor(-400, 400),
    score: 0, coins: 0, tricks: 0, vaults: 0, swings: 0, shieldUsed: false, camOff: demo ? 0.3 : 0.44,
    camX: -VW * 0.44, camY: 400 - VH * 0.62, particles: [], popups: [], shake: 0,
  };
  G.p.lastRoof = level.roofs[0];
  resetTrail(G.p.x, G.p.y);
  acc = 0;
  if (demo) return;
  popup(G.p.x + 60, G.p.y - 120, 'RUN!', '#e0353b', 1.4);
  showScreen(null);
  $('hud').hidden = false;
  $('hudProgressWrap').hidden = endless;
  tryLandscape();
}
function startDemo() {
  startRun(LEVELS[1 + Math.floor(Math.random() * 8)], false, true);
  $('hud').hidden = true;
}

function resetTrail(x, y) {
  G.trail = [];
  const v = baseSpeed();
  for (let i = 80; i >= 1; i--) {
    const t = G.time - i * 0.03, xx = x - v * i * 0.03;
    const ty = topAt(G.level, xx);
    G.trail.push({ t, x: xx, y: ty === null ? y : ty, st: 'run', ph: xx / 30, rot: 0, sx: 1 });
  }
}

function sampleTrail(t) {
  const tr = G.trail;
  if (t <= tr[0].t) return tr[0];
  let lo = 0, hi = tr.length - 1;
  if (t >= tr[hi].t) return tr[hi];
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tr[m].t <= t) lo = m; else hi = m; }
  const a = tr[lo], b = tr[hi], k = (t - a.t) / (b.t - a.t || 1);
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), st: a.st, ph: a.ph, rot: a.rot, sx: a.sx };
}

function popup(x, y, text, color = '#10141b', life = 1.1) { G.popups.push({ x, y, text, color, life, max: life }); }
function burst(x, y, color, n, spread = 160) {
  for (let i = 0; i < n; i++) {
    G.particles.push({ x, y, vx: (Math.random() - 0.5) * spread, vy: -Math.random() * spread * 0.7, life: 0.4 + Math.random() * 0.4, color, size: 2 + Math.random() * 3 });
  }
}
function buzz(pattern) { if (!G.demo && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* not allowed */ } } }

// ---------------------------------------------------------------- player actions
function doJump(p) {
  const L = G.level;
  p.vy = -JUMP_V * (G.gear.springs ? 1.05 : 1);
  p.grounded = false; p.coyote = 0; p.jumpBuf = 0; p.slideT = 0; p.rollT = 0;
  for (const z of L.zones) {
    if (!z.done && p.x >= z.x1 && p.x <= z.x2 && Math.abs(p.y - z.top) < 4) {
      z.done = true;
      p.trick = { def: z.trick, t: 0 };
      p.vy *= 1.06 * (z.trick.boost || 1);
      break;
    }
  }
  SFX.jump();
}

function stumble(p) {
  if (p.stumbleT > 0) return;
  p.stumbleT = 0.3;
  G.tauTarget -= 0.3;
  G.shake = 0.25;
  popup(p.x, p.y - 100, 'STUMBLE', '#e0353b');
  burst(p.x + 10, p.y - 20, 'rgba(60,60,60,.6)', 8);
  SFX.stumble();
  buzz(40);
}

function clearAir(p) { p.trick = null; p.rot = 0; p.sx = 1; p.slideT = 0; p.rollT = 0; }

function startClimb(p, s, dur) {
  p.move = { kind: 'climb', t: 0, dur, x0: p.x, y0: p.y, x1: s.x + P_W / 2 + 4, y1: s.top };
  p.vy = 0; p.grounded = false; clearAir(p);
  SFX.climb();
}

function findVaultable(L, p) {
  const front = p.x + P_W / 2;
  for (const b of L.boxes) {
    const d = b.x - front;
    if (d >= -2 && d <= 95 && Math.abs(b.base - p.y) < 2) return b;
  }
  return null;
}
function startVault(p, b, base) {
  const x0 = p.x, x1 = b.x + b.w + 30, span = x1 - x0;
  const kStart = clamp((b.x - 14 - x0) / span, 0.05, 0.85);
  const kEnd = clamp((b.x + b.w - x0) / span, kStart + 0.05, 0.95);
  p.move = { kind: 'vault', t: 0, dur: span / base, x0, x1, y0: p.y, top: b.top, kStart, kEnd, name: b.vault, def: VAULTS[b.vault] };
  p.jumpBuf = 0; p.grounded = false; clearAir(p);
  SFX.jump();
}
function startSwing(p, bar) {
  bar.used = true;
  const hx = p.x - bar.x, hy = (p.y - 40) - bar.y;
  const th0 = clamp(Math.atan2(hx, hy), -1.2, 0.8);
  p.move = { kind: 'swing', t: 0, dur: 0.8, bar, th0, th1: 1.75 + TAU };
  p.vy = 0; clearAir(p);
  SFX.swing();
}

function updateMove(p, dt, base) {
  const m = p.move;
  m.t += dt;
  const k = Math.min(1, m.t / m.dur);
  if (m.kind === 'climb') {
    p.x = lerp(m.x0, m.x1, smooth(clamp((k - 0.55) / 0.45, 0, 1)));
    p.y = lerp(m.y0, m.y1, smooth(Math.min(1, k / 0.7)));
    p.ph = k; p.state = 'climb';
    if (k >= 1) { p.move = null; p.grounded = true; p.vy = 0; p.vx = base * 0.75; p.ph = 0; }
  } else if (m.kind === 'vault') {
    p.x = lerp(m.x0, m.x1, k);
    if (k < m.kStart) p.y = lerp(m.y0, m.top, smooth(k / m.kStart));
    else if (k < m.kEnd) p.y = m.top;
    else p.y = lerp(m.top, m.y0, smooth((k - m.kEnd) / (1 - m.kEnd)));
    const q = clamp((k - m.kStart * 0.6) / (m.kEnd + 0.05 - m.kStart * 0.6), 0, 1);
    if (k < m.kStart * 0.6) p.state = 'jump';
    else if (k > m.kEnd + 0.05) p.state = 'fall';
    else p.state = m.def.double && q > 0.3 && q < 0.62 ? 'arrow' : m.def.pose;
    p.sx = m.def.sx && p.state !== 'jump' && p.state !== 'fall' ? m.def.sx(q) : 1;
    p.ph = k;
    if (k >= 1) {
      p.move = null; p.grounded = true; p.vy = 0; p.vx = base; p.sx = 1;
      G.vaults++; G.score += 60; G.tauTarget = Math.min(1.6, G.tauTarget + 0.06);
      popup(p.x, p.y - 110, m.name + '  +60', '#7a4a12');
      SFX.vault();
    }
  } else if (m.kind === 'swing') {
    const th = m.th0 + (m.th1 - m.th0) * (0.55 * k + 0.45 * k * k);
    p.x = m.bar.x + Math.sin(th) * SWING_R;
    p.y = m.bar.y + Math.cos(th) * SWING_R + 40;
    p.rot = -th; p.state = 'hang';
    if (k >= 1) {
      p.move = null; p.grounded = false;
      p.vx = base * 1.15; p.vy = -660;
      p.trick = { def: SWING_TRICK, t: 0 };
    }
  }
}

function landed(p, impact) {
  if (p.trick) {
    const pro = G.gear.trickpro ? 2 : 1, pts = (p.trick.def.points || 150) * pro;
    G.score += pts;
    if (p.trick.def === SWING_TRICK) G.swings++; else G.tricks++;
    G.tauTarget = Math.min(1.6, G.tauTarget + 0.22 * pro);
    popup(p.x, p.y - 110, p.trick.def.name + '  +' + pts, '#0b8a99', 1.3);
    burst(p.x, p.y - 40, '#19c3d6', 14, 220);
    SFX.trick();
    p.trick = null; p.rot = 0; p.sx = 1;
  } else if (impact > ROLL_IMPACT && !p.slideOnLand) {
    p.rollT = ROLL_T; G.score += 20;
    popup(p.x, p.y - 90, 'ROLL  +20', '#3a4250');
    SFX.roll();
  } else SFX.land();
  if (p.slideOnLand) { p.slideOnLand = false; p.slideT = 0.62; SFX.slide(); }
  burst(p.x, p.y, 'rgba(90,90,90,.45)', 5, 90);
}

// ---------------------------------------------------------------- simulation
function solidsNear(L, x) {
  const out = [];
  for (const r of L.roofs) if (r.x < x + 260 && r.x + r.w > x - 260) out.push(r);
  for (const b of L.boxes) if (b.x < x + 260 && b.x + b.w > x - 260) out.push(b);
  return out;
}

function physicsVertical(p, dt, solids) {
  const wasGrounded = p.grounded;
  p.vy = Math.min(1500, p.vy + GRAV * dt);
  const impact = p.vy;
  let ny = p.y + p.vy * dt;
  p.grounded = false;
  if (p.vy >= 0) {
    let best = null;
    for (const s of solids) {
      if (p.x + P_W / 2 > s.x && p.x - P_W / 2 < s.x + s.w && p.y <= s.top + 0.5 && ny >= s.top && (best === null || s.top < best.top)) best = s;
    }
    if (best) { ny = best.top; p.vy = 0; p.grounded = true; if (!best.isBox) p.lastRoof = best; }
  }
  p.y = ny;
  if (wasGrounded && !p.grounded) p.coyote = 0.1;
  return !wasGrounded && p.grounded ? impact : -1;
}

function updateRun(dt) {
  const p = G.p, L = G.level;
  const base = baseSpeed();
  const solids = solidsNear(L, p.x);
  p.jumpBuf -= dt; p.coyote -= dt; p.sprintBuf -= dt;
  if (p.boostT > 0) p.boostT -= dt;

  if (p.move) updateMove(p, dt, base);
  else {
    if (p.stumbleT > 0) p.stumbleT -= dt;
    const target = p.stumbleT > 0 ? base * 0.3 : base * (p.boostT > 0 ? 1.3 : 1);
    p.vx = lerp(p.vx, target, Math.min(1, dt * (p.stumbleT > 0 ? 18 : 4)));

    // sprint arrows
    for (const pd of L.pads) {
      if (pd.used || !p.grounded || p.x < pd.x1 || p.x > pd.x2 || Math.abs(p.y - pd.top) > 2) continue;
      if (!pd.hinted && !G.demo) { pd.hinted = true; popup(p.x + 40, p.y - 110, 'SWIPE →', '#b8860b', 0.8); }
      if (p.sprintBuf > 0) {
        pd.used = true; p.sprintBuf = 0; p.boostT = 1.6; p.vx = base * 1.3;
        G.score += 40; G.tauTarget = Math.min(1.6, G.tauTarget + 0.12);
        G.popups = G.popups.filter((q) => q.text !== 'SWIPE →');
        popup(p.x, p.y - 110, 'SPRINT  +40', '#b8860b');
        burst(p.x - 10, p.y - 10, '#ffd34d', 10, 160);
        SFX.sprint();
      }
    }

    if (p.jumpBuf > 0 && (p.grounded || p.coyote > 0) && p.stumbleT <= 0.1) {
      const v = p.grounded ? findVaultable(L, p) : null;
      if (v) { startVault(p, v, base); }
      else doJump(p);
    }
    if (!p.move) {
      if (p.slideBuf > 0 && p.grounded) { p.slideT = 0.62; p.rollT = 0; p.slideBuf = 0; SFX.slide(); }
      p.slideBuf -= dt;
      if (p.slideT > 0) p.slideT -= dt;
      if (p.rollT > 0) p.rollT -= dt;

      // keep sliding while under a beam or desk so the runner never stands up into it
      if (p.grounded && p.slideT > 0) {
        for (const b of L.bars) if (p.x + P_W / 2 > b.x && p.x - P_W / 2 < b.x + b.w) p.slideT = Math.max(p.slideT, 0.08);
        for (const b of L.boxes) if (b.table && p.x + P_W / 2 > b.x && p.x - P_W / 2 < b.x + b.w) p.slideT = Math.max(p.slideT, 0.08);
      }
    }
    const h = p.slideT > 0 || p.rollT > 0 ? P_HS : P_H;
    let nx = p.x + p.vx * dt, blocked = false;
    if (!p.move) {
      // horizontal movement and wall contact: step up, climb, scramble over, or get blocked
      for (const s of solids) {
        if (p.x + P_W / 2 <= s.x + 0.01 && nx + P_W / 2 > s.x && p.y > s.top + 0.5 && p.y - h < s.bottom) {
          const rise = p.y - s.top;
          if (rise <= 20 && !s.isBox) { p.y = s.top; continue; }
          if (s.isBox) {
            if (p.grounded) { stumble(p); startClimb(p, s, s.table ? 0.5 : 0.4); }
            else startClimb(p, s, 0.18);
            break;
          }
          if (rise <= CLIMB_MAX && (!p.grounded || p.jumpBuf > 0)) { startClimb(p, s, 0.22 + rise / 700); break; }
          nx = Math.min(nx, s.x - P_W / 2); blocked = true;
        }
      }
    }
    if (!p.move) {
      p.x = nx;
      p.pushing = blocked && p.grounded;
      if (blocked) p.vx = 0;
      const impact = physicsVertical(p, dt, solids);
      if (impact >= 0) landed(p, impact);

      // swing bars
      if (!p.grounded) {
        for (const sw of L.swings) {
          if (!sw.used && Math.abs(p.x - sw.x) < 30 && Math.abs((p.y - 85) - sw.y) < 55) { startSwing(p, sw); break; }
        }
      }
      // hazard beams
      if (!p.move) {
        for (const b of L.bars) {
          if (!b.hit && p.x + P_W / 2 > b.x && p.x - P_W / 2 < b.x + b.w && p.y - h < b.bottom && p.y > b.top) {
            b.hit = true; stumble(p);
            if (p.grounded) p.slideT = 0.6; else { p.slideOnLand = true; p.vy = Math.max(p.vy, 300); }
            p.trick = null; p.rot = 0; p.sx = 1;
          }
        }
      }
    }
    if (!p.move) {
      // trick animation
      if (p.trick) {
        const d = p.trick.def;
        p.trick.t += dt;
        const e = easeInOut(Math.min(1, p.trick.t / d.dur));
        p.rot = d.rot ? d.rot(e) : 0;
        p.sx = d.sx ? d.sx(e) : 1;
        p.ph = p.trick.t * 24;
      }
      if (p.rollT > 0) p.rot = (1 - p.rollT / ROLL_T) * TAU;
      else if (!p.trick) p.rot = 0;
      // state for animation
      if (!p.grounded) {
        if (p.trick) {
          const d = p.trick.def, k = p.trick.t / d.dur;
          p.state = d.window && (k < d.window[0] || k > d.window[1]) ? (p.vy < 0 ? 'jump' : 'fall') : d.pose;
        } else p.state = p.vy < 0 ? 'jump' : 'fall';
      } else if (p.rollT > 0) p.state = 'roll';
      else if (p.slideT > 0) p.state = 'slide';
      else if (p.stumbleT > 0) p.state = 'stumble';
      else if (p.pushing) p.state = 'push';
      else p.state = p.boostT > 0 ? 'sprint' : 'run';
      if (p.grounded) p.ph += (p.pushing ? 180 : Math.max(p.vx, 80)) * dt / 30;
    }
  }

  // collectables
  const magnet = G.gear.magnet;
  for (const c of L.coins) {
    if (c.taken || Math.abs(c.x - p.x) > 220) continue;
    const dx = p.x - c.x, dy = (p.y - 40) - c.y, dist = Math.hypot(dx, dy);
    if (magnet && dist < 170) { c.x += dx / dist * 600 * dt; c.y += dy / dist * 600 * dt; }
    if (dist < 34) {
      c.taken = true; G.coins++; G.score += 10;
      burst(c.x, c.y, '#19c3d6', 4, 100); SFX.coin();
    }
  }

  if (L.endless) extendEndless(L, p.x);

  // trail for the hunter
  G.trail.push({ t: G.time, x: p.x, y: p.y, st: p.state, ph: p.ph, rot: p.rot, sx: p.sx });
  if (G.trail.length > 1600) G.trail.splice(0, 600);

  // hunter pressure
  const rest = restTau();
  if (G.tauTarget < rest) G.tauTarget = Math.min(rest, G.tauTarget + recoverRate() * dt);
  else if (G.tauTarget > rest) G.tauTarget = Math.max(rest, G.tauTarget - 0.03 * dt);
  G.tau += clamp(G.tauTarget - G.tau, -0.6 * dt, 0.4 * dt);
  const hs = sampleTrail(G.time - G.tau), hu = G.hunter;
  hu.x = hs.x; hu.y = hs.y; hu.state = hs.st; hu.ph = hs.ph; hu.rot = hs.rot; hu.sx = hs.sx;

  // end conditions
  // (no touch check during scripted moves: a giant swing briefly loops back toward the hunter)
  if (G.tau < 0.05 || (!p.move && hu.x >= p.x - 18 && Math.abs(hu.y - p.y) < 60)) return endRun('caught');
  if (p.y > FALL_Y) return endRun('fell');
  if (p.x >= L.finishX) return endRun('won');
}

function endRun(kind) {
  const p = G.p;
  if (kind !== 'won' && G.gear.shield && !G.shieldUsed) {
    G.shieldUsed = true;
    if (kind === 'fell') {
      const r = p.lastRoof || G.level.roofs[0];
      p.x = r.x + 40; p.y = r.top; p.vy = 0; p.grounded = true;
    }
    p.move = null; clearAir(p); p.stumbleT = 0;
    p.vx = baseSpeed() * 0.6;
    G.tau = G.tauTarget = 0.95;
    resetTrail(p.x, p.y);
    popup(p.x, p.y - 120, 'SECOND WIND!', '#0b8a99', 1.5);
    burst(p.x, p.y - 40, '#3ee08a', 20, 260);
    SFX.shield();
    return;
  }
  G.phase = kind; G.endT = 0;
  p.move = null; clearAir(p);
  if (kind === 'caught') { SFX.caught(); G.shake = 0.4; buzz([60, 40, 120]); }
  else if (kind === 'fell') SFX.fell();
  else { SFX.win(); burst(p.x, p.y - 60, '#ffd34d', 30, 320); }
}

function updateEnd(dt) {
  const p = G.p, hu = G.hunter, solids = solidsNear(G.level, p.x);
  G.endT += dt;
  if (G.phase === 'won') {
    p.vx = Math.max(0, p.vx - 500 * dt); p.x += p.vx * dt;
    physicsVertical(p, dt, solids);
    p.state = p.vx > 60 ? 'run' : 'win';
    if (p.grounded) p.ph += Math.max(p.vx, 40) * dt / 30;
    hu.state = 'idle'; hu.rot = 0; hu.sx = 1;
  } else if (G.phase === 'caught') {
    p.vx = Math.max(0, p.vx - 700 * dt); p.x += p.vx * dt;
    physicsVertical(p, dt, solids);
    p.state = 'dead';
    hu.x = Math.min(hu.x + 500 * dt, p.x - 26); hu.y = p.y; hu.state = 'tackle'; hu.rot = 0; hu.sx = 1;
  } else {
    p.x += p.vx * 0.4 * dt; p.vy = Math.min(1500, p.vy + GRAV * dt); p.y += p.vy * dt;
    p.state = 'flail'; p.ph += dt * 12;
    hu.state = 'idle'; hu.rot = 0; hu.sx = 1;
  }
  if (G.endT > (G.phase === 'won' ? 1.8 : 1.3) && !G.finished) {
    G.finished = true;
    if (G.demo) startDemo(); else showResults();
  }
}

// Simple look-ahead pilot: drives the menu's background demo (and automated tests).
function autopilot(G) {
  const p = G.p, L = G.level;
  if (p.move || !p.grounded || G.phase !== 'run') return;
  const front = p.x + P_W / 2;
  for (const pd of L.pads) if (!pd.used && p.x > pd.x1 + 10 && p.x < pd.x2) p.sprintBuf = 0.2;
  for (const z of L.zones) if (!z.done && p.x > z.x2 - 40 && p.x < z.x2) { p.jumpBuf = 0.16; return; }
  for (const b of L.boxes) if (b.x - front > 10 && b.x - front < 55 && Math.abs(b.base - p.y) < 2) { p.jumpBuf = 0.16; return; }
  for (const b of L.bars) if (b.x - front > 0 && b.x - front < 60 && p.slideT <= 0) { p.slideBuf = 0.16; return; }
  for (const r of L.roofs) if (r.x - front >= -1 && r.x - front < 40 && r.top < p.y - 20) { p.jumpBuf = 0.16; return; }
  const roof = L.roofs.find((r) => p.x >= r.x - 13 && p.x < r.x + r.w + 13 && Math.abs(r.top - p.y) < 2);
  if (roof) {
    const edge = roof.x + roof.w, next = L.roofs.find((r) => r.x >= edge - 1 && r !== roof);
    if (next && next.x > edge + 1 && edge - p.x < 22) p.jumpBuf = 0.16;
  }
}

function step(dt) {
  G.time += dt;
  if (G.demo && G.phase === 'run') autopilot(G);
  if (G.phase === 'run') updateRun(dt); else updateEnd(dt);
  animateActor(G.p, dt);
  animateActor(G.hunter, dt);
  for (const q of G.particles) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 600 * dt; }
  G.particles = G.particles.filter((q) => q.life > 0);
  for (const q of G.popups) { q.life -= dt; q.y -= 40 * dt; }
  G.popups = G.popups.filter((q) => q.life > 0);
  if (G.shake > 0) G.shake -= dt;
  const p = G.p;
  G.camX = p.x - VW * G.camOff;
  const ty = (G.phase === 'fell' ? Math.min(p.y, FALL_Y - 200) : p.y) - VH * 0.62;
  G.camY = lerp(G.camY, ty, Math.min(1, dt * 4));
}

// ---------------------------------------------------------------- rendering
function drawSky(theme, camX, camY) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, theme.skyTop); g.addColorStop(1, theme.skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = theme.sun;
  ctx.beginPath(); ctx.arc(VW * 0.78, VH * 0.22, 46, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (let i = 0; i < 6; i++) {
    const w = 900, x = ((i * 260 - camX * 0.04) % w + w) % w * (VW / 900 + 0.3) - 120, y = 50 + hash(i) * VH * 0.3;
    ctx.beginPath(); ctx.ellipse(x, y, 60 + hash(i + 9) * 50, 14 + hash(i + 3) * 8, 0, 0, TAU); ctx.fill();
  }
  const ref = 400 - VH * 0.62;
  const layer = (f, color, cell, minH, maxH, seed) => {
    const baseY = VH * 0.95 - (camY - ref) * f * 0.6;
    const off = camX * f;
    ctx.fillStyle = color;
    const i0 = Math.floor(off / cell) - 1, i1 = Math.ceil((off + VW) / cell) + 1;
    for (let i = i0; i <= i1; i++) {
      const h1 = hash(i * 3.1 + seed), h2 = hash(i * 7.7 + seed * 2), h3 = hash(i * 1.3 + seed * 5);
      const w = cell * (0.55 + h2 * 0.5), x = i * cell - off + h3 * cell * 0.3, h = minH + h1 * (maxH - minH), y = baseY - h;
      ctx.fillRect(x, y, w, VH - y + 5);
      if (h1 > 0.72) ctx.fillRect(x + w * 0.45, y - 28, 3, 28);
      if (h2 > 0.8) ctx.fillRect(x + w * 0.15, y - 12, w * 0.3, 12);
    }
  };
  layer(0.08, theme.far, 90, 120, 300, 1);
  layer(0.22, theme.mid, 120, 80, 240, 2);
  layer(0.42, theme.near, 160, 40, 180, 3);
}

function drawWorld(L, camX, camY, t) {
  const th = L.theme, bottom = camY + VH + 10, left = camX - 60, right = camX + VW + 60;
  ctx.save();
  ctx.translate(-camX, -camY);

  // trick zones (glow behind runner)
  for (const z of L.zones) {
    if (z.x2 < left || z.x1 > right) continue;
    const a = z.done ? 0.07 : 0.2 + Math.sin(t * 5) * 0.05;
    const g = ctx.createLinearGradient(0, z.top - 120, 0, z.top);
    g.addColorStop(0, 'rgba(25,195,214,0)'); g.addColorStop(1, `rgba(25,195,214,${a})`);
    ctx.fillStyle = g; ctx.fillRect(z.x1, z.top - 120, z.x2 - z.x1, 120);
    if (!z.done) {
      ctx.fillStyle = '#0b8a99'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(z.trick.name, (z.x1 + z.x2) / 2, z.top - 128);
    }
  }

  // buildings
  for (const r of L.roofs) {
    if (r.x + r.w < left || r.x > right) continue;
    ctx.fillStyle = th.roof; ctx.fillRect(r.x, r.top, r.w, bottom - r.top);
    const x0 = Math.max(r.x + 18, r.x + 18 + Math.floor((left - r.x) / 40) * 40);
    for (let wx = x0; wx < Math.min(r.x + r.w - 28, right); wx += 40) {
      for (let wy = r.top + 34; wy < bottom; wy += 50) {
        ctx.fillStyle = hash(wx * 0.131 + wy * 0.71) > 0.82 ? th.lit : th.win;
        ctx.fillRect(wx, wy, 18, 26);
      }
    }
    ctx.fillStyle = th.cap; ctx.fillRect(r.x - 4, r.top, r.w + 8, 8);
    ctx.fillRect(r.x - 2, r.top - 14, 3, 14); ctx.fillRect(r.x + r.w - 1, r.top - 14, 3, 14);
  }
  for (const z of L.zones) {
    if (z.x2 < left || z.x1 > right || z.done) continue;
    ctx.fillStyle = '#19c3d6'; ctx.fillRect(z.x1, z.top - 2, z.x2 - z.x1, 4);
  }

  // sprint arrows
  for (const pd of L.pads) {
    if (pd.x2 < left || pd.x1 > right) continue;
    const a = pd.used ? 0.25 : 0.75 + Math.sin(t * 8) * 0.25;
    ctx.fillStyle = `rgba(255,196,0,${a})`;
    for (let i = 0; i < 4; i++) {
      const x = pd.x1 + 20 + i * 38;
      ctx.beginPath(); ctx.moveTo(x, pd.top - 3); ctx.lineTo(x + 14, pd.top - 3); ctx.lineTo(x + 26, pd.top - 12); ctx.lineTo(x + 14, pd.top - 21); ctx.lineTo(x, pd.top - 21); ctx.lineTo(x + 12, pd.top - 12); ctx.fill();
    }
  }

  // crates and office desks
  for (const b of L.boxes) {
    if (b.x + b.w < left || b.x > right) continue;
    if (b.table) {
      ctx.fillStyle = '#3b2f28';
      ctx.fillRect(b.x + 6, b.bottom, 6, b.base - b.bottom); ctx.fillRect(b.x + b.w - 12, b.bottom, 6, b.base - b.bottom);
      if (b.w > 150) ctx.fillRect(b.x + b.w / 2 - 3, b.bottom, 6, b.base - b.bottom);
      ctx.fillStyle = '#7a5a43'; ctx.fillRect(b.x, b.top, b.w, b.bottom - b.top);
      ctx.fillStyle = '#95725a'; ctx.fillRect(b.x, b.top, b.w, 3);
      // desk clutter: monitor and papers
      ctx.fillStyle = '#23262d'; ctx.fillRect(b.x + b.w * 0.3, b.top - 16, 20, 13); ctx.fillRect(b.x + b.w * 0.3 + 8, b.top - 3, 4, 3);
      ctx.fillStyle = '#e8e4da'; ctx.fillRect(b.x + b.w * 0.65, b.top - 3, 16, 3);
    } else {
      ctx.fillStyle = '#b77d3c'; ctx.fillRect(b.x, b.top, b.w, b.bottom - b.top);
      ctx.strokeStyle = '#7d5124'; ctx.lineWidth = 3;
      ctx.strokeRect(b.x + 1.5, b.top + 1.5, b.w - 3, b.bottom - b.top - 3);
      ctx.beginPath(); ctx.moveTo(b.x + 3, b.top + 3); ctx.lineTo(b.x + b.w - 3, b.bottom - 3);
      ctx.moveTo(b.x + b.w - 3, b.top + 3); ctx.lineTo(b.x + 3, b.bottom - 3); ctx.stroke();
    }
  }

  // hazard beams hanging on cables
  for (const b of L.bars) {
    if (b.x + b.w < left || b.x > right) continue;
    ctx.strokeStyle = '#3a3f48'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.x + 8, b.top); ctx.lineTo(b.x + 8, camY - 10); ctx.moveTo(b.x + b.w - 8, b.top); ctx.lineTo(b.x + b.w - 8, camY - 10); ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.rect(b.x, b.top, b.w, b.bottom - b.top); ctx.clip();
    ctx.fillStyle = '#f2c230'; ctx.fillRect(b.x, b.top, b.w, b.bottom - b.top);
    ctx.fillStyle = '#1d2026';
    for (let sx = b.x - 80; sx < b.x + b.w + 80; sx += 26) {
      ctx.beginPath(); ctx.moveTo(sx, b.bottom); ctx.lineTo(sx + 13, b.bottom); ctx.lineTo(sx + 13 + 73, b.top); ctx.lineTo(sx + 73, b.top); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#1d2026'; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.top, b.w, b.bottom - b.top);
  }

  // swing bars hanging from a crane
  for (const sw of L.swings) {
    if (sw.x + 60 < left || sw.x - 60 > right) continue;
    ctx.strokeStyle = '#3a3f48'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sw.x - 30, sw.y); ctx.lineTo(sw.x - 12, camY - 10); ctx.moveTo(sw.x + 30, sw.y); ctx.lineTo(sw.x + 12, camY - 10); ctx.stroke();
    if (!sw.used) {
      ctx.fillStyle = `rgba(25,195,214,${0.18 + Math.sin(t * 6) * 0.08})`;
      ctx.beginPath(); ctx.arc(sw.x, sw.y, 28, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = '#1d2026'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sw.x - 34, sw.y); ctx.lineTo(sw.x + 34, sw.y); ctx.stroke();
    ctx.strokeStyle = '#9aa3b0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sw.x - 32, sw.y - 1); ctx.lineTo(sw.x + 32, sw.y - 1); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // data cubes
  for (const c of L.coins) {
    if (c.taken || c.x < left || c.x > right) continue;
    const s = Math.abs(Math.cos(t * 3 + c.x * 0.01));
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(0.35 + s * 0.65, 1); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#19c3d6'; ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeStyle = '#0b7f8c'; ctx.lineWidth = 2; ctx.strokeRect(-7, -7, 14, 14);
    ctx.restore();
  }

  // finish gate
  if (L.finishX < right + 200) {
    const fx = L.finishX, fy = topAt(L, fx) || 400;
    ctx.fillStyle = '#10141b'; ctx.fillRect(fx - 4, fy - 200, 8, 200); ctx.fillRect(fx + 116, fy - 200, 8, 200);
    for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#10141b' : '#ffffff';
      ctx.fillRect(fx + 4 + i * 9.33, fy - 200 + j * 10, 9.33, 10);
    }
    ctx.fillStyle = 'rgba(255,211,77,.25)'; ctx.fillRect(fx + 4, fy - 170, 112, 170);
    ctx.fillStyle = '#10141b'; ctx.font = 'bold 16px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('FINISH', fx + 60, fy - 210);
  }
  ctx.restore();
}

function drawActors() {
  const t = G.time;
  ctx.save();
  let sx = 0, sy = 0;
  if (G.shake > 0) { sx = (Math.random() - 0.5) * 10 * G.shake; sy = (Math.random() - 0.5) * 10 * G.shake; }
  ctx.translate(-G.camX + sx, -G.camY + sy);
  drawFigure(ctx, G.hunter, HUNTER_LOOK, true, t);
  drawFigure(ctx, G.p, G.demo ? SKINS[0] : currentSkin, false, t);
  for (const q of G.particles) { ctx.globalAlpha = clamp(q.life * 2, 0, 1); ctx.fillStyle = q.color; ctx.fillRect(q.x, q.y, q.size, q.size); }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const q of G.popups) {
    ctx.globalAlpha = clamp(q.life / q.max * 2, 0, 1);
    ctx.font = '900 20px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText(q.text, q.x + 1.5, q.y + 1.5);
    ctx.fillStyle = q.color; ctx.fillText(q.text, q.x, q.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  const danger = clamp((0.55 - G.tau) / 0.5, 0, 1);
  if (danger > 0 && G.phase === 'run' && !G.demo) {
    const g = ctx.createLinearGradient(0, 0, VW * 0.35, 0);
    g.addColorStop(0, `rgba(224,53,59,${0.35 * danger})`); g.addColorStop(1, 'rgba(224,53,59,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW * 0.35, VH);
  }
}

function render() {
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  drawSky(G.level.theme, G.camX, G.camY);
  drawWorld(G.level, G.camX, G.camY, G.time);
  drawActors();
}

// ---------------------------------------------------------------- HUD
let hudCache = '';
function updateHud() {
  const meters = Math.max(0, Math.floor(G.p.x / 40));
  const total = G.score + meters;
  const key = total + '|' + G.coins;
  if (key !== hudCache) { hudCache = key; $('hudScore').textContent = total; $('hudCoins').textContent = G.coins; }
  $('hudMeter').style.width = (clamp(1 - (G.tau - 0.05) / 1.3, 0, 1) * 100).toFixed(1) + '%';
  if (!G.endless) $('hudProgress').style.width = (clamp(G.p.x / G.level.finishX, 0, 1) * 100).toFixed(1) + '%';
}

// ---------------------------------------------------------------- input
function canControl() { return G && !G.demo && G.mode === 'playing' && G.phase === 'run'; }
function pressJump() { if (canControl()) { audio(); G.p.jumpBuf = 0.16; } }
function pressSprint() { if (canControl()) { audio(); G.p.sprintBuf = 0.2; } }
function pressSlide() {
  if (!canControl()) return;
  audio();
  const p = G.p;
  if (p.grounded) p.slideBuf = 0.16;
  else if (!p.move) { p.slideOnLand = true; p.vy = Math.max(p.vy, 650); p.trick = null; p.rot = 0; p.sx = 1; }
}
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.code;
  if (k === 'ArrowUp' || k === 'KeyW' || k === 'Space') { pressJump(); if (canControl()) e.preventDefault(); }
  else if (k === 'ArrowDown' || k === 'KeyS') { pressSlide(); if (canControl()) e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'KeyD') { pressSprint(); if (canControl()) e.preventDefault(); }
  else if (k === 'Escape' || k === 'KeyP') { if (G && !G.demo && G.mode === 'playing') pause(); else if (G && G.mode === 'paused') resume(); }
});
let touch = null;
canvas.addEventListener('pointerdown', (e) => {
  if (touch) return;
  touch = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false };
});
window.addEventListener('pointermove', (e) => {
  if (!touch || touch.done || e.pointerId !== touch.id) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  if (Math.abs(dy) > 26 && Math.abs(dy) > Math.abs(dx) * 0.8) { touch.done = true; if (dy < 0) pressJump(); else pressSlide(); }
  else if (dx > 26 && dx > Math.abs(dy) * 1.25) { touch.done = true; pressSprint(); }
});
const endTouch = (e) => {
  if (!touch || e.pointerId !== touch.id) return;
  if (!touch.done && e.type === 'pointerup') pressJump();
  touch = null;
};
window.addEventListener('pointerup', endTouch);
window.addEventListener('pointercancel', endTouch);

// ---------------------------------------------------------------- screens
const SCREENS = { menu: 'scrMenu', levels: 'scrLevels', gear: 'scrGear', help: 'scrHelp', pause: 'scrPause', result: 'scrResult' };
function showScreen(name) {
  for (const [k, id] of Object.entries(SCREENS)) $(id).hidden = k !== name;
  if (name === 'menu') refreshMenu();
  if (name === 'levels') buildLevels();
  if (name === 'gear') buildGear();
}
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => showScreen(b.dataset.go)));

function refreshMenu() {
  $('menuCoins').textContent = save.coins;
  $('menuBest').textContent = save.endlessBest;
  $('btnMute').textContent = 'Sound: ' + (save.muted ? 'OFF' : 'ON');
}

function starHtml(n) { let s = ''; for (let i = 0; i < 3; i++) s += i < n ? '&#9733;' : '<span class="off">&#9733;</span>'; return s; }

function buildLevels() {
  const grid = $('levelGrid');
  grid.innerHTML = '';
  for (const def of LEVELS) {
    const b = document.createElement('button');
    b.className = 'level';
    b.innerHTML = `<div class="num">LEVEL ${def.id + 1}</div><div class="name">${def.name}</div>` +
      `<div class="lstars">${starHtml(save.stars[def.id] || 0)}</div>` +
      `<div class="best">${save.best[def.id] ? 'Best ' + save.best[def.id] : 'Not played'}</div>`;
    b.addEventListener('click', () => startRun(def, false));
    grid.appendChild(b);
  }
}

// Renders a small preview of a pose into its own canvas (outfit and trick cards).
function previewCanvas(look, state, ph, rot = 0, sx = 1) {
  const cv = document.createElement('canvas');
  cv.className = 'preview';
  cv.width = 240; cv.height = 180;
  const c = cv.getContext('2d');
  c.scale(2, 2);
  const a = newActor(60, 82);
  a.state = state; a.ph = ph; a.rot = rot; a.sx = sx; a.pose = poseFor(state, ph);
  a.hipH = HIP[state] !== undefined ? HIP[state] : groundHip(a.pose);
  if (HIP[state] !== undefined) a.y = 50 + a.hipH; // airborne poses: centre the hip in the card
  c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, 82, 120, 8);
  drawFigure(c, a, look, false, 0.4);
  return cv;
}

function card(html, on, label, onClick, preview) {
  const el = document.createElement('div');
  el.className = 'item' + (on ? ' on' : '');
  if (preview) el.appendChild(preview);
  el.insertAdjacentHTML('beforeend', html + (label ? `<button>${label}</button>` : ''));
  if (onClick) el.querySelector('button').addEventListener('click', onClick);
  return el;
}

function buildGear() {
  const gg = $('gearGrid');
  gg.innerHTML = '';
  for (const g of GADGETS) {
    const on = !!save.gadgets[g.id];
    gg.appendChild(card(`<div class="iname">${g.name}</div><div class="idesc">${g.desc}</div><div class="price"><s>${g.price}</s><b>FREE</b></div>`,
      on, on ? 'EQUIPPED' : 'EQUIP', () => { save.gadgets[g.id] = !on; writeSave(); buildGear(); }));
  }
  const tg = $('trickGrid');
  tg.innerHTML = '';
  for (const t of TRICK_DEFS) {
    const on = !save.tricksOff.includes(t.name);
    const toggle = () => {
      if (on) { if (save.tricksOff.length < TRICK_DEFS.length - 1) save.tricksOff.push(t.name); }
      else save.tricksOff = save.tricksOff.filter((n) => n !== t.name);
      writeSave(); buildGear();
    };
    tg.appendChild(card(`<div class="iname">${t.name}</div><div class="price"><s>${t.price} coins</s><b>FREE</b></div>`,
      on, on ? 'IN ROTATION' : 'OFF', toggle, previewCanvas(currentSkin, t.pose, 1.2, t.rot ? t.rot(0.1) : 0)));
  }
  const vg = $('vaultGrid');
  vg.innerHTML = '';
  for (const [name, v] of Object.entries(VAULTS)) {
    vg.appendChild(card(`<div class="iname">${name}</div><div class="price"><s>${v.double ? '1200' : '550'} coins</s><b>FREE</b></div>`,
      true, null, null, previewCanvas(currentSkin, v.pose, 0)));
  }
  const sg = $('skinGrid');
  sg.innerHTML = '';
  for (const s of SKINS) {
    const on = save.skin === s.id;
    sg.appendChild(card(`<div class="iname">${s.name}</div><div class="price">${s.price ? `<s>${s.price}</s>` : ''}<b>FREE</b></div>`,
      on, on ? 'WEARING' : 'WEAR', () => { save.skin = s.id; currentSkin = s; writeSave(); buildGear(); }, previewCanvas(s, 'run', 1.0)));
  }
}

function pause() {
  if (!G || G.demo || G.mode !== 'playing') return;
  G.mode = 'paused';
  showScreen('pause');
}
function resume() {
  if (!G || G.mode !== 'paused') return;
  G.mode = 'playing'; acc = 0; lastT = performance.now();
  showScreen(null);
}
function quitToMenu() {
  $('hud').hidden = true;
  startDemo();
  showScreen('menu');
}
$('btnPause').addEventListener('click', pause);
$('btnResume').addEventListener('click', resume);
$('btnRestart').addEventListener('click', () => startRun(G.def, G.endless));
$('btnQuit').addEventListener('click', quitToMenu);
$('btnRetry').addEventListener('click', () => startRun(G.def, G.endless));
$('btnResMenu').addEventListener('click', quitToMenu);
$('btnNext').addEventListener('click', () => { const n = LEVELS[G.def.id + 1]; if (n) startRun(n, false); });
$('btnEndless').addEventListener('click', () => startRun({ id: 'endless', name: 'Endless', theme: Math.floor(Math.random() * THEMES.length), diff: 0, seed: 1 }, true));
$('btnMute').addEventListener('click', () => { save.muted = !save.muted; writeSave(); refreshMenu(); if (!save.muted) SFX.coin(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

function showResults() {
  const p = G.p, L = G.level, won = G.phase === 'won';
  const meters = Math.max(0, Math.floor(p.x / 40));
  const score = G.score + meters + (won ? 500 : 0);
  G.mode = 'over';
  save.coins += G.coins;
  let stars = 0;
  if (won) {
    stars = 1;
    if (G.coins >= L.totalCoins * 0.7) stars++;
    if (G.tricks >= L.totalZones) stars++;
    save.stars[G.def.id] = Math.max(save.stars[G.def.id] || 0, stars);
    save.best[G.def.id] = Math.max(save.best[G.def.id] || 0, score);
  }
  if (G.endless) save.endlessBest = Math.max(save.endlessBest, meters);
  writeSave();

  $('resTitle').textContent = won ? 'ESCAPED' : G.phase === 'caught' ? 'CAUGHT' : 'YOU FELL';
  $('resStars').innerHTML = G.endless ? '' : starHtml(stars);
  const rows = [['Distance', meters + ' m']];
  if (G.endless) rows.push(['Data cubes', G.coins], ['Tricks', G.tricks]);
  else rows.push(['Data cubes', `${G.coins} / ${L.totalCoins}`], ['Tricks', `${G.tricks} / ${L.totalZones}`]);
  rows.push(['Vaults', G.vaults], ['Bar swings', G.swings]);
  if (G.endless) rows.push(['Best distance', save.endlessBest + ' m']);
  rows.push(['Score', score]);
  $('resStats').innerHTML = rows.map(([a, b]) => `<span>${a}</span><b>${b}</b>`).join('');
  $('btnNext').hidden = !(won && !G.endless && LEVELS[G.def.id + 1]);
  $('hud').hidden = true;
  showScreen('result');
}

// ---------------------------------------------------------------- mobile niceties
function tryLandscape() {
  if (!('ontouchstart' in window)) return;
  const el = document.documentElement;
  try {
    const req = el.requestFullscreen || /** @type {any} */ (el).webkitRequestFullscreen;
    const p = !document.fullscreenElement && req ? req.call(el) : null;
    const lock = () => { const o = /** @type {any} */ (screen.orientation); if (o && o.lock) o.lock('landscape').catch(() => {}); };
    if (p && p.then) p.then(lock).catch(() => {}); else lock();
  } catch (e) { /* fullscreen not supported */ }
}
let installEvt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
$('btnInstall').addEventListener('click', () => { if (installEvt) { installEvt.prompt(); installEvt = null; $('btnInstall').hidden = true; } });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// ---------------------------------------------------------------- main loop
let lastT = performance.now(), acc = 0;
function frame(now) {
  let dt = (now - lastT) / 1000;
  lastT = now;
  if (dt > 0.1) dt = 0.1;
  if (G.mode === 'playing' || G.mode === 'over') {
    acc += dt;
    while (acc >= DT) { step(DT); acc -= DT; }
    if (G.mode === 'playing' && !G.demo) updateHud();
  }
  render();
  requestAnimationFrame(frame);
}
startDemo();
showScreen('menu');
requestAnimationFrame(frame);

// small debug/test hook
window.__skyline = { get state() { return G; }, startRun, LEVELS, step, autopilot };
})();
