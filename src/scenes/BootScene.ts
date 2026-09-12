import Phaser from 'phaser';

import { FRUIT_TIERS } from '../game/config';

/** Texture key for a fruit tier. Generated at runtime — no image files ship. */
export function fruitTextureKey(tier: number): string {
  return `fruit-${tier}`;
}

/**
 * Draws every fruit as a texture with Graphics, then hands off to the game.
 *
 * Generating textures instead of loading sprites keeps the bundle free of image
 * assets; swapping in real art later means loading files here and leaving the
 * rest of the game untouched, since everything references these keys.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    FRUIT_TIERS.forEach((tier, index) => {
      const r = tier.radius;
      const g = this.make.graphics({ x: 0, y: 0 }, false);

      g.fillStyle(tier.color, 1);
      g.fillCircle(r, r, r);

      // Rim shading and a highlight so flat colours still read as round.
      g.lineStyle(Math.max(2, r * 0.06), 0x000000, 0.14);
      g.strokeCircle(r, r, r * 0.97);
      g.fillStyle(0xffffff, 0.28);
      g.fillEllipse(r * 0.68, r * 0.6, r * 0.5, r * 0.34);

      g.generateTexture(fruitTextureKey(index), r * 2, r * 2);
      g.destroy();
    });

    this.scene.start('GameScene');
  }
}
