// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play, paused
// and game over.
//
// ?seed=N fixes the order pattern. ?shot=start|play|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BURNT, EVENT_EXPIRED, EVENT_OVER } from './world.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

/* ---- tiny synthesized sounds (WebAudio, no files) ---- */
let audio = null;
let muted = false;
function ensureAudio() {
  if (audio) return audio;
  try {
    audio = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    audio = null;
  }
  return audio;
}
function tone(freq, dur, type = 'sine', gain = 0.08) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}
function sizzle() {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const len = Math.floor(ctx.sampleRate * 0.35);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3000;
  const g = ctx.createGain();
  g.gain.value = 0.05;
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start();
}
const sfx = {
  click() {
    tone(660, 0.06, 'triangle', 0.05);
  },
  grill() {
    sizzle();
    tone(220, 0.12, 'sawtooth', 0.03);
  },
  serve() {
    tone(523, 0.1, 'sine', 0.09);
    setTimeout(() => tone(784, 0.16, 'sine', 0.09), 90);
  },
  bad() {
    tone(160, 0.18, 'square', 0.06);
  },
  burnt() {
    tone(110, 0.3, 'sawtooth', 0.06);
  },
};

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

let screen = SCREEN_TITLE;
let best = readBest();

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, muted);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    ensureAudio();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Take orders, grill patties, serve dishes.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift complete. Score ${world.state.score}. Best ${best}.`);
  }

  createInput(
    canvas,
    {
      onBin(id) {
        ensureAudio();
        const result = world.addIngredient(id);
        if (result === 'plate') sfx.click();
        else if (result === 'grill') sfx.grill();
        else sfx.bad();
      },
      onGrillSlot(index) {
        ensureAudio();
        if (world.takePatty(index)) sfx.click();
        else sfx.bad();
      },
      onGrill() {
        ensureAudio();
        const ready = world.state.grill.findIndex((g) => g.state === 'ready');
        if (ready >= 0) {
          if (world.takePatty(ready)) sfx.click();
          return;
        }
        const result = world.addIngredient('patty');
        if (result === 'grill') sfx.grill();
        else sfx.bad();
      },
      onServe() {
        ensureAudio();
        const served = world.serve();
        if (served) sfx.serve();
        else sfx.bad();
      },
      onTrash() {
        ensureAudio();
        world.trash();
        sfx.click();
      },
      onPause() {
        if (screen === SCREEN_PLAY) {
          screen = SCREEN_PAUSED;
          announce('Paused.');
        } else if (screen === SCREEN_PAUSED) {
          screen = SCREEN_PLAY;
          announce('Playing.');
        }
      },
      onMute() {
        muted = !muted;
      },
      onConfirm() {
        startGame();
      },
      onRestart() {
        startGame();
      },
    },
    () => screen,
  );

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    if (screen === SCREEN_PLAY) {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = world.step(STEP);
        if (events & EVENT_OVER) endGame();
        if (events & EVENT_EXPIRED) sfx.bad();
        if (events & EVENT_BURNT) sfx.burnt();
      }
    }
    renderer.draw(world.state, screen, best, muted);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
