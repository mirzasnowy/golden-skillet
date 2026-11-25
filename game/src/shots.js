// The screenshot scenes behind ?shot=start|play|end. Each one builds its frame by
// driving the real rules (spawnOrder, the plate and grill state) from a fresh
// world with a fixed seed, so the frame is what a real game looks like and the
// same seed always gives the same frame.
import { DISH_BY_ID } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function restyleOrders(world, dishes, patienceList) {
  world.state.orders.forEach((order, i) => {
    const dish = DISH_BY_ID[dishes[i]];
    order.dish = dish.id;
    order.name = dish.name;
    order.items = [...dish.items];
    order.price = dish.price;
    order.patience = patienceList[i];
    order.maxPatience = 45;
  });
}

/**
 * Stage `world` into the named scene and return the screen to draw over it and
 * the best score to show.
 */
export function stageShot(name, world) {
  const { state } = world;
  world.reset();
  if (name !== 'play' && name !== 'end') {
    // Title over a fresh kitchen: two orders waiting, full counter, shift untouched.
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Mid-shift: a burger half-built on the plate, a patty mid-grill, three
    // orders on the board, timer running.
    world.spawnOrder();
    state.timeLeft = 98;
    state.score = 240;
    state.coins = 24;
    state.served = 2;
    state.combo = 2;
    state.bestCombo = 2;
    restyleOrders(world, ['burger', 'salad', 'pasta'], [20, 38, 12]);
    // Plate: bun + grilled patty + lettuce (burger missing its tomato).
    state.plate = ['bun', 'patty', 'lettuce'];
    // Grill: one patty halfway cooked, one burner free.
    state.grill[0].state = 'cooking';
    state.grill[0].t = 3.2;
    state.grill[1].state = 'empty';
    state.grill[1].t = 0;
    state.message = 'Patty on the grill…';
    state.messageT = 2.2;
    return { screen: SCREEN_PLAY, best: 240 };
  }
  // end: a complete burger on the plate, matching the first order, SERVE lit.
  world.spawnOrder();
  state.timeLeft = 41;
  state.score = 520;
  state.coins = 52;
  state.served = 5;
  state.combo = 3;
  state.bestCombo = 4;
  restyleOrders(world, ['burger', 'melt', 'salad'], [30, 18, 40]);
  state.plate = ['bun', 'patty', 'lettuce', 'tomato'];
  state.grill[0].state = 'ready';
  state.grill[0].t = 0;
  state.grill[1].state = 'empty';
  state.grill[1].t = 0;
  state.message = 'Burger complete — serve it!';
  state.messageT = 2.2;
  return { screen: SCREEN_PLAY, best: 520 };
}
