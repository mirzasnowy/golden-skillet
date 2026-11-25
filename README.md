# The Golden Skillet

A tiny diner cooking game, built for the make.fun bounty
"Make the best cooking game" (`best-cooking-game-20261125-0137`).

You run a one-cook diner for a 150-second shift. Orders land on the
board with a patience timer. Pick ingredients from the counter, grill
patties on the stove (take them off before they burn), build the dish
on the plate, and serve it while the customer is still happy. Fast
serves build a combo; expired orders cost you.

## How to play

- **Mouse:** click an ingredient bin to add it to the plate, click a
  raw patty bin to put a patty on the grill, click a cooked patty on
  the grill to move it to the plate, click **SERVE** to hand the plate
  to the first matching order, click the trash to clear the plate.
- **Keyboard:** `1`–`6` ingredients, `G` grill / take patty,
  `Space` serve, `T` trash, `P` pause, `M` mute, `R` restart,
  `Enter` start.

## Dishes

| Dish | Needs | Pays |
| --- | --- | --- |
| Golden Burger | bun, grilled patty, lettuce, tomato | $14 |
| Garden Salad | lettuce, tomato, cheese | $10 |
| Tomato Pasta | pasta, tomato, cheese | $12 |
| Skillet Melt | bun, cheese, grilled patty | $13 |

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

No build step, no network requests: `game/index.html` plus its files
under `game/` is the whole game. Sounds are synthesized with WebAudio.

## Screenshots

`?shot=start`, `?shot=play` and `?shot=end` stage the title, a
mid-assembly, and a plate-ready-to-serve scene (see `shots.json`).

## License

MIT — see `LICENSE`.
