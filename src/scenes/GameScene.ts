import Phaser from 'phaser';

import { FRUIT_TIERS, LAYOUT, PHYSICS } from '../game/config';
import { pickDropTier, resolveMerge, tierRadius } from '../game/merge';
import type { ScoreService } from '../services/ScoreService';
import { fruitTextureKey } from './BootScene';

/** Matter bodies carry a back-reference to their Phaser object; the types don't say so. */
type FruitBody = MatterJS.BodyType & { gameObject?: Phaser.GameObjects.GameObject | null };

const FRUIT_LABEL = 'fruit';

/** Events this scene emits for UIScene to render. */
export const GameEvents = {
  score: 'score',
  next: 'next',
  gameOver: 'game-over',
} as const;

/**
 * Physics, rendering and input. All merge *decisions* come from `game/merge`;
 * this scene only reports collisions to it and applies the outcome.
 */
export class GameScene extends Phaser.Scene {
  private fruits: Phaser.Physics.Matter.Image[] = [];
  private pendingMerges: Array<[FruitBody, FruitBody]> = [];

  private heldTier = 0;
  private nextTier = 0;
  private held?: Phaser.GameObjects.Image;
  private guide?: Phaser.GameObjects.Rectangle;

  private score = 0;
  private canDrop = false;
  private isOver = false;
  private aimX = LAYOUT.width / 2;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.fruits = [];
    this.pendingMerges = [];
    this.score = 0;
    this.isOver = false;
    this.canDrop = true;

    this.buildPlayfield();

    this.heldTier = pickDropTier(Math.random());
    this.nextTier = pickDropTier(Math.random());

    this.guide = this.add
      .rectangle(this.aimX, LAYOUT.dropY, 2, LAYOUT.floorY - LAYOUT.dropY, 0xffffff, 0.12)
      .setOrigin(0.5, 0);
    this.held = this.add.image(this.aimX, LAYOUT.dropY, fruitTextureKey(this.heldTier));

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.aim(p.x));
    // Firing on pointerup (not pointerdown) keeps a mobile scroll gesture from
    // dropping a fruit the player never meant to release.
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.aim(p.x);
      this.drop();
    });

    this.matter.world.on('collisionstart', this.onCollisionStart, this);

    this.scene.launch('UIScene');
    // The UI scene boots a frame later; emit once it is listening.
    this.time.delayedCall(0, () => {
      this.events.emit(GameEvents.score, this.score);
      this.events.emit(GameEvents.next, this.nextTier);
    });
  }

  private buildPlayfield(): void {
    const { wallLeft, wallRight, floorY, wallThickness, height } = LAYOUT;
    const wallHeight = height;
    const opts = { isStatic: true, restitution: 0, friction: PHYSICS.friction };

    this.matter.add.rectangle(
      wallLeft - wallThickness / 2,
      wallHeight / 2,
      wallThickness,
      wallHeight,
      opts,
    );
    this.matter.add.rectangle(
      wallRight + wallThickness / 2,
      wallHeight / 2,
      wallThickness,
      wallHeight,
      opts,
    );
    this.matter.add.rectangle(
      LAYOUT.width / 2,
      floorY + wallThickness / 2,
      LAYOUT.width,
      wallThickness,
      opts,
    );

    const innerWidth = wallRight - wallLeft;
    this.add
      .rectangle(
        LAYOUT.width / 2,
        (LAYOUT.dangerY + floorY) / 2,
        innerWidth,
        floorY - LAYOUT.dangerY,
        0x000000,
        0.12,
      )
      .setDepth(-1);
    this.add
      .rectangle(LAYOUT.width / 2, LAYOUT.dangerY, innerWidth, 2, 0xff5252, 0.45)
      .setDepth(-1);
  }

  private aim(x: number): void {
    if (this.isOver) return;
    const r = tierRadius(this.heldTier);
    this.aimX = Phaser.Math.Clamp(x, LAYOUT.wallLeft + r, LAYOUT.wallRight - r);
    this.held?.setX(this.aimX);
    this.guide?.setX(this.aimX);
  }

  private drop(): void {
    if (!this.canDrop || this.isOver) return;
    this.canDrop = false;

    this.spawnFruit(this.aimX, LAYOUT.dropY, this.heldTier);
    this.heldTier = this.nextTier;
    this.nextTier = pickDropTier(Math.random());
    this.events.emit(GameEvents.next, this.nextTier);

    this.held?.setVisible(false);
    this.time.delayedCall(PHYSICS.dropCooldownMs, () => {
      if (this.isOver) return;
      this.canDrop = true;
      this.held?.setTexture(fruitTextureKey(this.heldTier)).setVisible(true);
      this.aim(this.aimX);
    });
  }

  private spawnFruit(x: number, y: number, tier: number): Phaser.Physics.Matter.Image {
    const radius = tierRadius(tier);
    const image = this.matter.add.image(x, y, fruitTextureKey(tier), undefined, {
      shape: { type: 'circle', radius },
      restitution: PHYSICS.restitution,
      friction: PHYSICS.friction,
      frictionStatic: PHYSICS.frictionStatic,
      density: PHYSICS.density,
      label: FRUIT_LABEL,
    });
    image.setData('tier', tier);
    image.setData('dangerSince', undefined);
    this.fruits.push(image);
    return image;
  }

  private onCollisionStart(event: Phaser.Physics.Matter.Events.CollisionStartEvent): void {
    if (this.isOver) return;
    for (const pair of event.pairs) {
      const a = pair.bodyA as FruitBody;
      const b = pair.bodyB as FruitBody;
      if (a.label !== FRUIT_LABEL || b.label !== FRUIT_LABEL) continue;
      // Never mutate the world inside a physics callback — queue it for update().
      this.pendingMerges.push([a, b]);
    }
  }

  override update(time: number): void {
    this.processMerges();
    this.fruits = this.fruits.filter((f) => f.active);
    if (!this.isOver) this.checkDanger(time);
  }

  private processMerges(): void {
    if (this.pendingMerges.length === 0) return;

    // One fruit can collide with several others in a single step; each may only
    // be consumed once, or the same body gets destroyed twice.
    const consumed = new Set<number>();

    for (const [bodyA, bodyB] of this.pendingMerges) {
      if (consumed.has(bodyA.id) || consumed.has(bodyB.id)) continue;

      const a = bodyA.gameObject as Phaser.Physics.Matter.Image | null | undefined;
      const b = bodyB.gameObject as Phaser.Physics.Matter.Image | null | undefined;
      if (!a?.active || !b?.active) continue;

      const outcome = resolveMerge(a.getData('tier') as number, b.getData('tier') as number);
      if (!outcome) continue;

      consumed.add(bodyA.id);
      consumed.add(bodyB.id);

      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      // A tween still running against a destroyed body throws inside Matter and
      // kills the whole game loop, so stop them before the object goes away.
      this.tweens.killTweensOf(a);
      this.tweens.killTweensOf(b);
      a.destroy();
      b.destroy();

      this.addScore(outcome.score);
      if (outcome.kind === 'promote') {
        this.popIn(this.spawnFruit(x, y, outcome.tier));
      } else {
        this.burst(x, y, 0xfff59d, 150);
      }
    }

    this.pendingMerges.length = 0;
  }

  /**
   * The run ends when a fruit comes to rest above the danger line.
   *
   * Keying on "settled" rather than "has been below the line once" matters: a
   * fruit dropped onto a pile that is already too high never dips below the
   * line, and an arming rule would let it sit there forever without ending the
   * run. Falling fruit is exempt because it is still moving.
   */
  private checkDanger(time: number): void {
    for (const fruit of this.fruits) {
      const body = fruit.body as MatterJS.BodyType | null;
      const settled = body !== null && body.speed < PHYSICS.settleSpeed;
      const top = fruit.y - tierRadius(fruit.getData('tier') as number);

      if (!settled || top >= LAYOUT.dangerY) {
        fruit.setData('dangerSince', undefined);
        continue;
      }

      const since = fruit.getData('dangerSince') as number | undefined;
      if (since === undefined) {
        fruit.setData('dangerSince', time);
      } else if (time - since > PHYSICS.dangerGraceMs) {
        this.endRun();
        return;
      }
    }
  }

  private addScore(points: number): void {
    if (points <= 0) return;
    this.score += points;
    this.events.emit(GameEvents.score, this.score);
  }

  private popIn(image: Phaser.Physics.Matter.Image): void {
    // Never tween `scale` on a Matter image: Phaser's Matter transform rescales
    // the physics body too, which both distorts collisions and throws once the
    // body is gone. Alpha touches only the display object.
    image.setAlpha(0.3);
    this.tweens.add({ targets: image, alpha: 1, duration: 170, ease: 'Quad.easeOut' });
    this.burst(image.x, image.y, 0xffffff);
  }

  private burst(x: number, y: number, color: number, radius = 70): void {
    const ring = this.add.circle(x, y, 10, color, 0.55);
    this.tweens.add({
      targets: ring,
      radius,
      alpha: 0,
      duration: 300,
      onComplete: () => ring.destroy(),
    });
  }

  private endRun(): void {
    if (this.isOver) return;
    this.isOver = true;
    this.canDrop = false;
    this.held?.setVisible(false);
    this.guide?.setVisible(false);

    const service = this.registry.get('scoreService') as ScoreService | undefined;
    const finalScore = this.score;
    void (async () => {
      const best = (await service?.getBest()) ?? 0;
      const isNewBest = (await service?.submit(finalScore)) ?? false;
      this.events.emit(GameEvents.gameOver, {
        score: finalScore,
        best: Math.max(best, finalScore),
        isNewBest,
      });
    })();
  }
}

/** Largest tier currently on the board, for the UI progress strip. */
export function tierName(tier: number): string {
  return FRUIT_TIERS[tier]?.name ?? '';
}
