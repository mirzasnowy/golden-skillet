// The Golden Skillet — input: mouse clicks and keyboard, mapped to game actions
// through the same layout rectangles the renderer draws.
import { INGREDIENTS, LAYOUT, VIEW, binRect, grillSlotRect, inside } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';

/**
 * Handlers: onBin(id), onGrill(), onServe(), onTrash(), onPause(), onMute(),
 * onConfirm(), onRestart(). getScreen() returns the current screen string.
 */
export function createInput(canvas, handlers, getScreen) {
  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEW.width,
      y: ((event.clientY - rect.top) / rect.height) * VIEW.height,
    };
  }

  function clickAt(x, y) {
    const screen = getScreen();
    if (screen === 'title') {
      handlers.onConfirm();
      return;
    }
    if (screen === 'over') {
      handlers.onRestart();
      return;
    }
    if (inside(LAYOUT.pauseBtn, x, y)) {
      handlers.onPause();
      return;
    }
    if (inside(LAYOUT.muteBtn, x, y)) {
      handlers.onMute();
      return;
    }
    if (screen === 'paused') return;
    if (inside(LAYOUT.serveBtn, x, y)) {
      handlers.onServe();
      return;
    }
    if (inside(LAYOUT.trashBtn, x, y)) {
      handlers.onTrash();
      return;
    }
    for (let i = 0; i < 2; i += 1) {
      if (inside(grillSlotRect(i), x, y)) {
        handlers.onGrillSlot(i);
        return;
      }
    }
    for (let i = 0; i < INGREDIENTS.length; i += 1) {
      if (inside(binRect(i), x, y)) {
        handlers.onBin(INGREDIENTS[i].id);
        return;
      }
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    const { x, y } = toLogical(event);
    clickAt(x, y);
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const screen = getScreen();
    const key = event.key;
    if (key === 'Enter') {
      if (screen === 'title') handlers.onConfirm();
      return;
    }
    if (key === 'p' || key === 'P') {
      handlers.onPause();
      return;
    }
    if (key === 'm' || key === 'M') {
      handlers.onMute();
      return;
    }
    if (key === 'r' || key === 'R') {
      if (screen === 'over' || screen === 'play') handlers.onRestart();
      return;
    }
    if (screen !== 'play') return;
    if (key === ' ') {
      event.preventDefault();
      handlers.onServe();
      return;
    }
    if (key === 't' || key === 'T') {
      handlers.onTrash();
      return;
    }
    if (key === 'g' || key === 'G') {
      handlers.onGrill();
      return;
    }
    const ing = INGREDIENTS.find((item) => item.key === key);
    if (ing) handlers.onBin(ing.id);
  });
}
