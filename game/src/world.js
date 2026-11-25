// The Golden Skillet — world: orders, grill, plate, timer, scoring.
// Pure rules, no drawing: the renderer paints this state, the input handler calls
// these actions, and the screenshot stager drives them directly.
import {
  DISHES,
  GRILL_BURN_SECONDS,
  GRILL_COOK_SECONDS,
  MAX_ORDERS,
  ORDER_EVERY,
  ORDER_PATIENCE,
  SHIFT_SECONDS,
} from './config.js';

export const EVENT_SERVED = 1;
export const EVENT_EXPIRED = 2;
export const EVENT_OVER = 4;
export const EVENT_BURNT = 8;

let nextOrderId = 1;

function sameItems(a, b) {
  if (a.length !== b.length) return false;
  const count = new Map();
  for (const item of a) count.set(item, (count.get(item) ?? 0) + 1);
  for (const item of b) {
    const left = count.get(item) ?? 0;
    if (left === 0) return false;
    count.set(item, left - 1);
  }
  return true;
}

export function createWorld(random) {
  const state = freshState();

  function freshState() {
    return {
      score: 0,
      coins: 0,
      served: 0,
      lost: 0,
      combo: 0,
      bestCombo: 0,
      timeLeft: SHIFT_SECONDS,
      spawnIn: 2,
      orders: [],
      plate: [],
      grill: [
        { state: 'empty', t: 0 },
        { state: 'empty', t: 0 },
      ],
      message: '',
      messageT: 0,
      shakeT: 0,
      over: false,
    };
  }

  function say(text) {
    state.message = text;
    state.messageT = 2.2;
  }

  function spawnOrder() {
    const dish = random.pick(DISHES);
    state.orders.push({
      id: nextOrderId,
      dish: dish.id,
      name: dish.name,
      items: [...dish.items],
      price: dish.price,
      patience: ORDER_PATIENCE,
      maxPatience: ORDER_PATIENCE,
    });
    nextOrderId += 1;
  }

  /** Add an ingredient to the plate; a patty goes on the grill instead. Returns what happened. */
  function addIngredient(id) {
    if (state.over) return 'over';
    if (id === 'patty') {
      const slot = state.grill.find((g) => g.state === 'empty');
      if (!slot) {
        say('Grill is full — take a patty off first!');
        return 'full';
      }
      slot.state = 'cooking';
      slot.t = 0;
      say('Patty on the grill…');
      return 'grill';
    }
    if (state.plate.length >= 6) {
      say('Plate is full — serve it or trash it!');
      return 'full';
    }
    state.plate.push(id);
    return 'plate';
  }

  /** Take a ready patty off the grill onto the plate. */
  function takePatty(index) {
    const slot = state.grill[index];
    if (!slot || slot.state !== 'ready') return false;
    if (state.plate.length >= 6) {
      say('Plate is full — serve it or trash it!');
      return false;
    }
    slot.state = 'empty';
    slot.t = 0;
    state.plate.push('patty');
    say('Grilled patty on the plate!');
    return true;
  }

  /** Serve the plate to the first order it matches. Returns the dish served, or null. */
  function serve() {
    if (state.over) return null;
    if (state.plate.length === 0) {
      say('The plate is empty!');
      state.shakeT = 0.3;
      return null;
    }
    const match = state.orders.find((o) => sameItems(o.items, state.plate));
    if (!match) {
      say("That plate matches no order — check the board!");
      state.shakeT = 0.4;
      state.combo = 0;
      return null;
    }
    state.orders = state.orders.filter((o) => o.id !== match.id);
    state.plate = [];
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const patienceBonus = Math.round((match.patience / match.maxPatience) * 5);
    const earned = match.price + patienceBonus;
    const comboBonus = state.combo > 1 ? (state.combo - 1) * 2 : 0;
    state.coins += earned;
    state.score += earned * 10 + comboBonus * 10;
    state.served += 1;
    say(
      state.combo > 1
        ? `Served ${match.name}! +$${earned}  COMBO x${state.combo}`
        : `Served ${match.name}! +$${earned}`,
    );
    return match;
  }

  function trash() {
    if (state.plate.length === 0 && !state.grill.some((g) => g.state === 'burnt')) {
      say('Nothing to trash.');
      return;
    }
    state.plate = [];
    for (const slot of state.grill) {
      if (slot.state === 'burnt') {
        slot.state = 'empty';
        slot.t = 0;
      }
    }
    state.combo = 0;
    say('Plate cleared.');
  }

  function reset() {
    const keep = freshState();
    for (const key of Object.keys(keep)) state[key] = keep[key];
    spawnOrder();
    spawnOrder();
  }

  /** Advance the world by dt seconds. Returns an event bitmask. */
  function step(dt) {
    let events = 0;
    if (state.over) return events;
    state.timeLeft -= dt;
    if (state.messageT > 0) state.messageT -= dt;
    if (state.shakeT > 0) state.shakeT -= dt;

    // Grill: raw cooks, ready burns.
    for (const slot of state.grill) {
      if (slot.state === 'cooking') {
        slot.t += dt;
        if (slot.t >= GRILL_COOK_SECONDS) {
          slot.state = 'ready';
          slot.t = 0;
        }
      } else if (slot.state === 'ready') {
        slot.t += dt;
        if (slot.t >= GRILL_BURN_SECONDS) {
          slot.state = 'burnt';
          slot.t = 0;
          say('A patty burnt! Trash it before it stinks up the kitchen.');
          events |= EVENT_BURNT;
        }
      }
    }

    // Orders: patience runs out, new ones arrive.
    for (const order of state.orders) order.patience -= dt;
    const expired = state.orders.filter((o) => o.patience <= 0);
    if (expired.length > 0) {
      state.orders = state.orders.filter((o) => o.patience > 0);
      state.lost += expired.length;
      state.combo = 0;
      state.score = Math.max(0, state.score - 30 * expired.length);
      say(`A customer walked out! -$${30 * expired.length} in spirit…`);
      events |= EVENT_EXPIRED;
    }
    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      state.spawnIn = ORDER_EVERY;
      if (state.orders.length < MAX_ORDERS) spawnOrder();
    }

    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  reset();
  return { state, reset, spawnOrder, addIngredient, takePatty, serve, trash, step, say };
}
