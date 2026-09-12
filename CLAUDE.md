# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

MergeDrop is a Suika-style physics puzzle: drop fruit into a jar, equal fruit merge into the next
tier up, the run ends when a fruit comes to rest above the danger line. Vite + TypeScript +
Phaser 3 with Matter.js physics, deployed as a static site to GitHub Pages.

All player-facing copy is Korean. There is no backend.

## Commands

```bash
npm run dev      # Vite dev server — note the base path: http://localhost:5173/MergeDrop/
npm run check    # tsc --noEmit && eslint . && vitest run  ← must pass before calling work done
npm test         # vitest only
npm run build    # type-check then produce dist/
npm run preview  # serve the built dist/
```

CI runs `npm run check` before building, so a failing check blocks deployment.

## Architecture

**Game rules never touch Phaser.** `src/game/merge.ts` holds every merge decision as pure
functions and `src/game/config.ts` holds every tunable number. Neither imports Phaser, so the
whole rule set is unit-tested without booting a game. Scenes translate physics events into calls
on these functions and apply the returned outcome — do not move rule logic into a scene.

- `src/game/config.ts` — the **only** place balance lives: the fruit tier ladder (radius, colour,
  score), spawn weights, layout coordinates, physics constants. Magic numbers in a scene are a bug.
- `src/game/merge.ts` — `resolveMerge()` returns a discriminated outcome (`promote` to the next
  tier, or `clear` when two max-tier fruit meet) or `null` for no merge. `pickDropTier()` takes the
  random value as an argument rather than calling `Math.random()`, which is what makes it testable.
- `src/scenes/BootScene.ts` — draws every fruit texture at runtime with `Graphics`. **No image
  assets ship.** Swapping in real art means loading files here; the rest of the game only knows
  the texture keys.
- `src/scenes/GameScene.ts` — Matter world, input, and the merge pipeline.
- `src/scenes/UIScene.ts` — runs *alongside* GameScene via `scene.launch()`, not inside it, so the
  game-over panel stays interactive while physics is frozen.
- `src/services/ScoreService.ts` — the persistence boundary. The game never calls `localStorage` or
  `fetch` directly. Adding a global leaderboard later means one new implementation plus the single
  injection line in `main.ts`; no game code changes.

## Gotchas

These each cost real debugging time. Do not reintroduce them.

- **Never tween `scale` on a `Phaser.Physics.Matter.Image`.** Phaser's Matter transform rescales
  the physics body too. If that fruit is merged away mid-tween, the tween keeps writing to a
  destroyed body and throws inside Matter, which kills the entire game loop — the game silently
  freezes with no visible error. Tween alpha instead, and `killTweensOf()` before `destroy()`.
- **Never mutate the world inside a collision callback.** `collisionstart` queues pairs into
  `pendingMerges`; `update()` resolves them. Removing a body mid-step corrupts the engine.
- One fruit can collide with several others in a single step, so `processMerges()` tracks consumed
  body ids — without it the same body is destroyed twice.
- **Game-over is keyed on "settled above the line", not "has been below the line once".** An
  arming rule looks correct but lets a fruit dropped onto an already-too-high pile sit there
  forever, so the run never ends.
- `Rectangle.setStrokeStyle(width, color, alpha)` takes alpha as a third argument. Packing it into
  the colour (`0xffffff22`) renders a bright wrong hue with no error.
- **`vite.config.ts` `base` must stay `'/MergeDrop/'`** to match the Pages project-site subpath.
  Removing it 404s every asset on the deployed site (and changes the dev URL too).

## Documentation

Follow the `save-docs` skill for anything under `docs/`.
