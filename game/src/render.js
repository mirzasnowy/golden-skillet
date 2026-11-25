// The Golden Skillet — renderer: paints the whole kitchen on one canvas.
// Everything is drawn with canvas shapes (no image files), so the game has no
// network requests and looks the same in any desktop browser.
import {
  DISHES,
  INGREDIENTS,
  ING_BY_ID,
  LAYOUT,
  VIEW,
  binRect,
  grillSlotRect,
  inside,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const WALL = '#F6E7C8';
const FLOOR_A = '#D9A066';
const FLOOR_B = '#C68B4E';
const WOOD = '#8B5A2B';
const WOOD_TOP = '#A9703A';
const INK = '#2B1D12';
const CREAM = '#FFF6E0';
const BROWN = '#7A3B1E';
const GREEN = '#3E9B4F';
const RED = '#C0392B';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, weight = 700, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

/** Draw one ingredient icon centred at (cx, cy) with radius r. */
export function drawIngredient(ctx, id, cx, cy, r) {
  const ing = ING_BY_ID[id];
  ctx.save();
  ctx.translate(cx, cy);
  if (id === 'bun') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.arc(0, r * 0.15, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ing.dark;
    ctx.fillRect(-r, r * 0.1, r * 2, r * 0.35);
    ctx.fillStyle = '#FBEBC0';
    for (const [dx, dy] of [[-0.45, -0.35], [0, -0.6], [0.45, -0.35], [-0.2, -0.15], [0.25, -0.15]]) {
      ctx.beginPath();
      ctx.arc(dx * r, dy * r, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'patty') {
    ctx.fillStyle = ing.color;
    rr(ctx, -r, -r * 0.55, r * 2, r * 1.1, r * 0.4);
    ctx.fill();
    ctx.strokeStyle = ing.dark;
    ctx.lineWidth = r * 0.12;
    for (const dx of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(dx * r - r * 0.15, -r * 0.4);
      ctx.lineTo(dx * r + r * 0.15, r * 0.4);
      ctx.stroke();
    }
  } else if (id === 'lettuce') {
    ctx.fillStyle = ing.color;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.arc(i * r * 0.55, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = ing.dark;
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, -r * 0.1);
    ctx.quadraticCurveTo(0, r * 0.25, r * 0.8, -r * 0.1);
    ctx.stroke();
  } else if (id === 'tomato') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F28B7A';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.3, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ing.dark;
    ctx.beginPath();
    ctx.arc(0, -r * 0.85, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'cheese') {
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.85);
    ctx.lineTo(r * 0.9, r * 0.7);
    ctx.lineTo(-r * 0.9, r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ing.dark;
    for (const [dx, dy] of [[-0.3, 0.3], [0.25, 0.35], [0, -0.1]]) {
      ctx.beginPath();
      ctx.arc(dx * r, dy * r, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'pasta') {
    ctx.strokeStyle = ing.color;
    ctx.lineWidth = r * 0.22;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, i * r * 0.5);
      ctx.bezierCurveTo(-r * 0.4, i * r * 0.5 - r * 0.45, r * 0.4, i * r * 0.5 + r * 0.45, r * 0.9, i * r * 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function plateMatches(state) {
  if (state.plate.length === 0) return false;
  const count = new Map();
  for (const item of state.plate) count.set(item, (count.get(item) ?? 0) + 1);
  return DISHES.some((d) => {
    if (d.items.length !== state.plate.length) return false;
    const need = new Map();
    for (const item of d.items) need.set(item, (need.get(item) ?? 0) + 1);
    for (const [k, v] of need) if ((count.get(k) ?? 0) !== v) return false;
    return true;
  });
}

function fmtTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const scale = Math.min(w / VIEW.width, h / VIEW.height);
    ctx.setTransform((w * dpr) / VIEW.width, 0, 0, (h * dpr) / VIEW.height, 0, 0);
    return scale;
  }

  function drawKitchen(state) {
    // Wall + floor.
    ctx.fillStyle = WALL;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#EAD9AE';
    ctx.fillRect(0, 200, VIEW.width, 14);
    ctx.fillStyle = FLOOR_A;
    ctx.fillRect(0, 530, VIEW.width, 270);
    ctx.fillStyle = FLOOR_B;
    for (let x = 0; x < VIEW.width; x += 80) {
      for (let y = 530; y < VIEW.height; y += 80) {
        if (((x + y) / 80) % 2 === 0) ctx.fillRect(x, y, 80, 80);
      }
    }
    // Wall decor: a hanging sign and a clock.
    ctx.fillStyle = BROWN;
    rr(ctx, 560, 18, 160, 34, 8);
    ctx.fill();
    text(ctx, 'THE GOLDEN SKILLET', 640, 42, 20, CREAM, 800, 'center');
  }

  function drawTopBar(state) {
    const bar = LAYOUT.topBar;
    ctx.fillStyle = BROWN;
    ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
    text(ctx, 'SCORE  ' + state.score, 24, 40, 24, CREAM);
    text(ctx, 'COINS  $' + state.coins, 280, 40, 24, '#FFD76A');
    if (state.combo > 1) text(ctx, 'COMBO x' + state.combo, 520, 40, 24, '#8FE388');
    // Shift timer.
    const tw = 260;
    const tx = VIEW.width - tw - 24;
    text(ctx, 'SHIFT  ' + fmtTime(state.timeLeft), tx, 26, 20, CREAM, 800, 'left');
    ctx.fillStyle = '#4A2412';
    rr(ctx, tx, 34, tw, 16, 8);
    ctx.fill();
    const frac = Math.max(0, state.timeLeft / 150);
    ctx.fillStyle = frac > 0.33 ? '#8FE388' : '#FF6B57';
    if (frac > 0) {
      rr(ctx, tx, 34, tw * frac, 16, 8);
      ctx.fill();
    }
  }

  function drawOrders(state) {
    const board = LAYOUT.orders;
    ctx.fillStyle = 'rgba(43,29,18,0.06)';
    rr(ctx, board.x - 8, board.y - 8, board.w + 16, board.h + 16, 12);
    ctx.fill();
    text(ctx, 'ORDER BOARD', board.x, board.y - 8, 13, BROWN, 800);
    if (state.orders.length === 0) {
      text(ctx, 'No orders — the lunch rush is coming…', board.x + 16, board.y + 66, 20, '#8A6A45', 600);
      return;
    }
    state.orders.forEach((order, i) => {
      const x = board.x + i * 418;
      const y = board.y + 8;
      const w = 400;
      const h = 96;
      const urgent = order.patience < 12;
      ctx.fillStyle = CREAM;
      rr(ctx, x, y, w, h, 10);
      ctx.fill();
      ctx.strokeStyle = urgent ? RED : '#D9C49A';
      ctx.lineWidth = urgent ? 3 : 2;
      rr(ctx, x, y, w, h, 10);
      ctx.stroke();
      text(ctx, order.name, x + 14, y + 26, 20, INK);
      text(ctx, '$' + order.price, x + w - 14, y + 26, 20, '#2E7D32', 800, 'right');
      order.items.forEach((id, j) => drawIngredient(ctx, id, x + 30 + j * 44, y + 54, 14));
      // Patience bar.
      const frac = Math.max(0, order.patience / order.maxPatience);
      ctx.fillStyle = '#E8DCC0';
      rr(ctx, x + 14, y + 78, w - 28, 10, 5);
      ctx.fill();
      ctx.fillStyle = frac > 0.5 ? GREEN : frac > 0.25 ? '#E8A13D' : RED;
      if (frac > 0) {
        rr(ctx, x + 14, y + 78, (w - 28) * frac, 10, 5);
        ctx.fill();
      }
      if (urgent) text(ctx, 'HURRY!', x + w - 14, y + 54, 15, RED, 800, 'right');
    });
  }

  function drawGrill(state) {
    const g = LAYOUT.grill;
    ctx.fillStyle = '#3A3F44';
    rr(ctx, g.x, g.y, g.w, g.h, 12);
    ctx.fill();
    text(ctx, 'STOVE — grill the patty', g.x + 16, g.y + 30, 17, '#E8E8E8', 800);
    state.grill.forEach((slot, i) => {
      const r = grillSlotRect(i);
      ctx.fillStyle = '#22262A';
      rr(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.fill();
      ctx.strokeStyle = '#5A6167';
      ctx.lineWidth = 2;
      rr(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.stroke();
      if (slot.state === 'empty') {
        text(ctx, 'empty burner', r.x + r.w / 2, r.y + r.h / 2 + 6, 15, '#7A8288', 600, 'center');
      } else {
        const burnt = slot.state === 'burnt';
        const ready = slot.state === 'ready';
        // Flame under a cooking patty.
        if (slot.state === 'cooking') {
          ctx.fillStyle = '#FF8A3D';
          ctx.beginPath();
          ctx.moveTo(r.x + 30, r.y + r.h - 12);
          ctx.quadraticCurveTo(r.x + r.w / 2, r.y + r.h - 52, r.x + r.w - 30, r.y + r.h - 12);
          ctx.closePath();
          ctx.fill();
        }
        ctx.save();
        if (burnt) ctx.globalAlpha = 0.9;
        // Patty: raw pink-brown, ready golden-brown, burnt black.
        ctx.fillStyle = burnt ? '#1C1C1C' : ready ? '#8A5A2B' : '#B06A4A';
        rr(ctx, r.x + 25, r.y + 28, r.w - 50, 56, 20);
        ctx.fill();
        ctx.strokeStyle = burnt ? '#000' : '#7E4527';
        ctx.lineWidth = 3;
        for (const dx of [-22, 0, 22]) {
          ctx.beginPath();
          ctx.moveTo(r.x + r.w / 2 + dx - 6, r.y + 36);
          ctx.lineTo(r.x + r.w / 2 + dx + 6, r.y + 76);
          ctx.stroke();
        }
        ctx.restore();
        if (slot.state === 'cooking') {
          const frac = Math.min(1, slot.t / 6);
          ctx.fillStyle = '#22262A';
          rr(ctx, r.x + 14, r.y + r.h - 20, r.w - 28, 10, 5);
          ctx.fill();
          ctx.fillStyle = '#FFB13D';
          rr(ctx, r.x + 14, r.y + r.h - 20, (r.w - 28) * frac, 10, 5);
          ctx.fill();
          text(ctx, 'grilling…', r.x + r.w / 2, r.y + r.h - 28, 13, '#FFD76A', 700, 'center');
        } else if (ready) {
          text(ctx, 'READY — click to plate!', r.x + r.w / 2, r.y + r.h - 8, 13, '#8FE388', 800, 'center');
        } else if (burnt) {
          text(ctx, 'BURNT — trash it!', r.x + r.w / 2, r.y + r.h - 8, 13, '#FF6B57', 800, 'center');
        }
      }
    });
  }

  function drawPlate(state) {
    const p = LAYOUT.plate;
    ctx.fillStyle = WOOD;
    rr(ctx, p.x, p.y, p.w, p.h, 12);
    ctx.fill();
    ctx.fillStyle = WOOD_TOP;
    rr(ctx, p.x + 8, p.y + 8, p.w - 16, p.h - 16, 8);
    ctx.fill();
    text(ctx, 'PLATE — build the dish here', p.x + 16, p.y + 30, 17, '#FFF3D6', 800);
    // The plate itself.
    const cx = p.x + p.w / 2;
    const cy = p.y + 168;
    const shake = state.shakeT > 0 ? Math.sin(state.shakeT * 60) * 4 : 0;
    ctx.save();
    ctx.translate(shake, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 150, 78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E0D4B8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 150, 78, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, 118, 58, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (state.plate.length === 0) {
      text(ctx, 'empty plate', cx, cy + 6, 18, '#B9A98C', 600, 'center');
    } else {
      // Stack the assembled ingredients across the plate.
      const n = state.plate.length;
      state.plate.forEach((id, i) => {
        const px = cx + (i - (n - 1) / 2) * 52;
        const py = cy - 8 + (i % 2) * 10;
        drawIngredient(ctx, id, px, py, 24);
      });
    }
    ctx.restore();
    // Serve button.
    const s = LAYOUT.serveBtn;
    const match = plateMatches(state);
    const pulse = match ? 1 + Math.sin(Date.now() / 180) * 0.04 : 1;
    ctx.save();
    ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-(s.x + s.w / 2), -(s.y + s.h / 2));
    ctx.fillStyle = state.plate.length === 0 ? '#9AA3AD' : match ? GREEN : '#E8A13D';
    rr(ctx, s.x, s.y, s.w, s.h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    rr(ctx, s.x, s.y, s.w, s.h, 10);
    ctx.stroke();
    text(ctx, match ? 'SERVE IT!  (Space)' : 'SERVE  (Space)', s.x + s.w / 2, s.y + 29, 20, '#FFFFFF', 800, 'center');
    ctx.restore();
    // Trash button.
    const t = LAYOUT.trashBtn;
    ctx.fillStyle = RED;
    rr(ctx, t.x, t.y, t.w, t.h, 8);
    ctx.fill();
    text(ctx, 'TRASH', t.x + t.w / 2, t.y + 21, 14, '#FFFFFF', 800, 'center');
  }

  function drawPass(state) {
    const p = LAYOUT.pass;
    ctx.fillStyle = '#FFF6E0';
    rr(ctx, p.x, p.y, p.w, p.h, 12);
    ctx.fill();
    ctx.strokeStyle = '#D9C49A';
    ctx.lineWidth = 2;
    rr(ctx, p.x, p.y, p.w, p.h, 12);
    ctx.stroke();
    text(ctx, 'PASS — served dishes', p.x + 16, p.y + 30, 17, BROWN, 800);
    text(ctx, `Served: ${state.served}    Lost: ${state.lost}    Best combo: x${state.bestCombo}`, p.x + 16, p.y + 66, 18, INK);
    ctx.fillStyle = '#EAD9AE';
    rr(ctx, p.x + 16, p.y + 84, p.w - 32, 1, 1);
    ctx.fill();
    text(ctx, 'MENU', p.x + 16, p.y + 112, 15, BROWN, 800);
    DISHES.forEach((d, i) => {
      const y = p.y + 138 + i * 40;
      text(ctx, `${d.name} — $${d.price}`, p.x + 16, y, 17, INK, 700);
      text(ctx, d.items.map((id) => ING_BY_ID[id].name).join(' + '), p.x + 16, y + 22, 14, '#8A6A45', 600);
    });
  }

  function drawBins(state) {
    const b = LAYOUT.bins;
    ctx.fillStyle = WOOD;
    rr(ctx, b.x - 8, b.y - 8, b.w + 16, b.h + 16, 12);
    ctx.fill();
    text(ctx, 'COUNTER — click an ingredient (or press 1–6)', b.x + 8, b.y - 10, 13, BROWN, 800);
    INGREDIENTS.forEach((ing, i) => {
      const r = binRect(i);
      ctx.fillStyle = '#FFF6E0';
      rr(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.fill();
      ctx.strokeStyle = '#D9C49A';
      ctx.lineWidth = 2;
      rr(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.stroke();
      drawIngredient(ctx, ing.id, r.x + r.w / 2, r.y + 56, 32);
      text(ctx, ing.name, r.x + r.w / 2, r.y + 118, 19, INK, 700, 'center');
      ctx.fillStyle = BROWN;
      rr(ctx, r.x + r.w / 2 - 14, r.y + 130, 28, 26, 6);
      ctx.fill();
      text(ctx, ing.key, r.x + r.w / 2, r.y + 149, 16, '#FFFFFF', 800, 'center');
      if (ing.id === 'patty') text(ctx, 'needs the grill', r.x + r.w / 2, r.y + 170, 12, '#8A6A45', 600, 'center');
    });
  }

  function drawBottomBar(state, muted) {
    const b = LAYOUT.bottomBar;
    ctx.fillStyle = BROWN;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // A live message takes the hint line while it shows, so it never covers the game.
    if (state.messageT > 0 && state.message) {
      text(ctx, state.message, 24, b.y + 40, 18, '#FFD76A', 700);
    } else {
      text(ctx, '1–6 ingredients   •   G grill / take patty   •   Space serve   •   T trash   •   P pause   •   M sound', 24, b.y + 40, 17, CREAM, 600);
    }
    for (const [rect, label] of [[LAYOUT.pauseBtn, 'II'], [LAYOUT.muteBtn, muted ? 'OFF' : 'ON']]) {
      ctx.fillStyle = '#4A2412';
      rr(ctx, rect.x, rect.y, rect.w, rect.h, 8);
      ctx.fill();
      text(ctx, label, rect.x + rect.w / 2, rect.y + 31, 16, CREAM, 800, 'center');
    }
  }

  function drawMessage(state) {
    // Messages now live in the bottom bar (see drawBottomBar); nothing floats
    // over the kitchen, so screenshots stay clean.
    void state;
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(43,29,18,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = CREAM;
    rr(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = BROWN;
    ctx.lineWidth = 3;
    rr(ctx, x, y, w, h, 16);
    ctx.stroke();
  }

  function drawTitle(state, best) {
    panel(290, 150, 700, 500);
    text(ctx, 'THE GOLDEN SKILLET', 640, 230, 46, BROWN, 800, 'center');
    text(ctx, 'A tiny diner cooking game', 640, 272, 22, '#8A6A45', 600, 'center');
    const lines = [
      'Orders land on the board — each has a patience timer.',
      'Click ingredients on the counter to build the dish on the plate.',
      'Patties must grill first: take them off before they burn!',
      'Serve the plate while the customer is still happy. Fast serves',
      'build a combo. The shift lasts 2 minutes 30 seconds.',
    ];
    lines.forEach((line, i) => text(ctx, line, 640, 330 + i * 30, 19, INK, 600, 'center'));
    text(ctx, 'Click or press Enter to start', 640, 520, 22, GREEN, 800, 'center');
    if (best > 0) text(ctx, 'Best score: ' + best, 640, 560, 18, '#8A6A45', 700, 'center');
    text(ctx, 'Keys: 1–6 ingredients · G grill · Space serve · T trash · P pause', 640, 610, 16, '#8A6A45', 600, 'center');
  }

  function drawPaused() {
    panel(440, 280, 400, 200);
    text(ctx, 'PAUSED', 640, 350, 40, BROWN, 800, 'center');
    text(ctx, 'Press P or click II to keep cooking', 640, 400, 18, INK, 600, 'center');
  }

  function drawOver(state, best) {
    panel(390, 170, 500, 460);
    text(ctx, 'SHIFT COMPLETE!', 640, 240, 40, BROWN, 800, 'center');
    text(ctx, 'The dinner rush is over.', 640, 278, 20, '#8A6A45', 600, 'center');
    const rows = [
      ['Score', String(state.score)],
      ['Coins earned', '$' + state.coins],
      ['Dishes served', String(state.served)],
      ['Customers lost', String(state.lost)],
      ['Best combo', 'x' + state.bestCombo],
      ['Best score', String(Math.max(best, state.score))],
    ];
    rows.forEach(([k, v], i) => {
      const y = 330 + i * 38;
      text(ctx, k, 450, y, 21, INK, 600);
      text(ctx, v, 830, y, 21, BROWN, 800, 'right');
    });
    text(ctx, 'Press R to cook another shift', 640, 580, 20, GREEN, 800, 'center');
  }

  function draw(state, screen, best, muted) {
    fit();
    drawKitchen(state);
    drawTopBar(state);
    drawOrders(state);
    drawGrill(state);
    drawPlate(state);
    drawPass(state);
    drawBins(state);
    drawBottomBar(state, muted);
    drawMessage(state);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
    void inside;
  }

  return { draw };
}
