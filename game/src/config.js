// The Golden Skillet — shared constants: dishes, ingredients, timings, layout.
// The renderer and the input handler both read LAYOUT, so a click always lands where
// the picture says it does.
export const VIEW = { width: 1280, height: 800 };
export const STEP = 1 / 60;
export const SHIFT_SECONDS = 150;
export const MAX_ORDERS = 3;
export const ORDER_EVERY = 14;
export const ORDER_PATIENCE = 45;
export const GRILL_COOK_SECONDS = 6;
export const GRILL_BURN_SECONDS = 9; // seconds after READY before the patty burns
export const BEST_KEY = 'golden-skillet-best';

export const INGREDIENTS = [
  { id: 'bun', name: 'Bun', key: '1', color: '#E8B96A', dark: '#B98A3E' },
  { id: 'patty', name: 'Patty', key: '2', color: '#B06A4A', dark: '#7E4527' },
  { id: 'lettuce', name: 'Lettuce', key: '3', color: '#7BC96F', dark: '#4E9A44' },
  { id: 'tomato', name: 'Tomato', key: '4', color: '#E4573D', dark: '#A82E1B' },
  { id: 'cheese', name: 'Cheese', key: '5', color: '#F2C230', dark: '#C79A12' },
  { id: 'pasta', name: 'Pasta', key: '6', color: '#F5D76E', dark: '#D9B13B' },
];

export const DISHES = [
  { id: 'burger', name: 'Golden Burger', price: 14, items: ['bun', 'patty', 'lettuce', 'tomato'] },
  { id: 'salad', name: 'Garden Salad', price: 10, items: ['lettuce', 'tomato', 'cheese'] },
  { id: 'pasta', name: 'Tomato Pasta', price: 12, items: ['pasta', 'tomato', 'cheese'] },
  { id: 'melt', name: 'Skillet Melt', price: 13, items: ['bun', 'cheese', 'patty'] },
];
export const DISH_BY_ID = Object.fromEntries(DISHES.map((d) => [d.id, d]));
export const ING_BY_ID = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

// Layout rectangles (logical 1280x800 canvas).
export const LAYOUT = {
  topBar: { x: 0, y: 0, w: 1280, h: 64 },
  orders: { x: 24, y: 88, w: 1232, h: 110 },
  grill: { x: 24, y: 214, w: 396, h: 300 },
  plate: { x: 440, y: 214, w: 400, h: 300 },
  pass: { x: 860, y: 214, w: 396, h: 300 },
  bins: { x: 24, y: 546, w: 1232, h: 174 },
  bottomBar: { x: 0, y: 736, w: 1280, h: 64 },
  serveBtn: { x: 490, y: 462, w: 300, h: 44 },
  trashBtn: { x: 764, y: 226, w: 64, h: 30 },
  pauseBtn: { x: 1150, y: 744, w: 52, h: 48 },
  muteBtn: { x: 1210, y: 744, w: 52, h: 48 },
};

/** Ingredient bin rectangles, in counter order. */
export function binRect(index) {
  const w = 192;
  const gap = 16;
  return { x: LAYOUT.bins.x + index * (w + gap), y: LAYOUT.bins.y, w, h: LAYOUT.bins.h };
}

/** Grill slot rectangles (two burners). */
export function grillSlotRect(index) {
  return { x: LAYOUT.grill.x + 36 + index * 182, y: LAYOUT.grill.y + 96, w: 150, h: 120 };
}

export function inside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
