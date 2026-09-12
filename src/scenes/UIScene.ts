import Phaser from 'phaser';

import { FRUIT_TIERS, LAYOUT, MAX_TIER } from '../game/config';
import type { ScoreService } from '../services/ScoreService';
import { fruitTextureKey } from './BootScene';
import { GameEvents } from './GameScene';

/** Rendered by canvas, so a CJK-capable stack is enough — no font file needed. */
const FONT = '"Apple SD Gothic Neo", "Noto Sans KR", -apple-system, BlinkMacSystemFont, sans-serif';

interface GameOverPayload {
  score: number;
  best: number;
  isNewBest: boolean;
}

/**
 * HUD and overlays. Runs *alongside* GameScene rather than inside it, so the
 * game-over panel stays interactive while the physics scene is frozen.
 */
export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private nextPreview!: Phaser.GameObjects.Image;
  private overlay?: Phaser.GameObjects.Container;

  constructor() {
    super('UIScene');
  }

  create(): void {
    const game = this.scene.get('GameScene');

    this.scoreText = this.add.text(24, 22, '0', {
      fontFamily: FONT,
      fontSize: '40px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.bestText = this.add.text(24, 68, '최고 0', {
      fontFamily: FONT,
      fontSize: '17px',
      color: '#ffffffaa',
    });

    this.add
      .text(LAYOUT.width - 24, 22, 'NEXT', {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#ffffff88',
      })
      .setOrigin(1, 0);
    this.nextPreview = this.add.image(LAYOUT.width - 46, 68, fruitTextureKey(0)).setScale(0.7);

    void this.loadBest();

    const onScore = (score: number) => this.scoreText.setText(String(score));
    const onNext = (tier: number) => {
      // Preview slots are a fixed size; scale the largest droppable fruit to fit.
      this.nextPreview.setTexture(fruitTextureKey(tier));
      this.nextPreview.setScale(Math.min(1, 26 / FRUIT_TIERS[tier].radius));
    };
    const onGameOver = (payload: GameOverPayload) => this.showGameOver(payload);

    game.events.on(GameEvents.score, onScore);
    game.events.on(GameEvents.next, onNext);
    game.events.on(GameEvents.gameOver, onGameOver);

    // Without this the listeners pile up on GameScene across restarts.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      game.events.off(GameEvents.score, onScore);
      game.events.off(GameEvents.next, onNext);
      game.events.off(GameEvents.gameOver, onGameOver);
    });
  }

  private async loadBest(): Promise<void> {
    const service = this.registry.get('scoreService') as ScoreService | undefined;
    const best = (await service?.getBest()) ?? 0;
    this.bestText.setText(`최고 ${best}`);
  }

  private showGameOver({ score, best, isNewBest }: GameOverPayload): void {
    this.bestText.setText(`최고 ${best}`);

    const cx = LAYOUT.width / 2;
    const cy = LAYOUT.height / 2;

    const dim = this.add.rectangle(cx, cy, LAYOUT.width, LAYOUT.height, 0x000000, 0.62);
    const panel = this.add
      .rectangle(cx, cy, 340, 260, 0x1e2430, 0.98)
      // setStrokeStyle takes alpha as a third argument — packing it into the
      // colour (0xffffff22) silently renders a bright, wrong hue instead.
      .setStrokeStyle(2, 0xffffff, 0.16);

    const title = this.add
      .text(cx, cy - 82, '게임 오버', {
        fontFamily: FONT,
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const result = this.add
      .text(cx, cy - 24, `${score}점`, {
        fontFamily: FONT,
        fontSize: '46px',
        color: '#ffd54f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const note = this.add
      .text(cx, cy + 24, isNewBest ? '최고 기록 경신!' : `최고 기록 ${best}점`, {
        fontFamily: FONT,
        fontSize: '17px',
        color: isNewBest ? '#81c784' : '#ffffff99',
      })
      .setOrigin(0.5);

    const button = this.add
      .rectangle(cx, cy + 88, 200, 54, 0x4caf50)
      .setInteractive({ useHandCursor: true });
    const buttonLabel = this.add
      .text(cx, cy + 88, '다시 하기', {
        fontFamily: FONT,
        fontSize: '21px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    button.on('pointerover', () => button.setFillStyle(0x66bb6a));
    button.on('pointerout', () => button.setFillStyle(0x4caf50));
    button.once('pointerup', () => this.restart());

    this.overlay = this.add.container(0, 0, [dim, panel, title, result, note, button, buttonLabel]);
    this.overlay.setAlpha(0);
    this.tweens.add({ targets: this.overlay, alpha: 1, duration: 220 });
  }

  private restart(): void {
    const game = this.scene.get('GameScene');
    this.scene.stop();
    game.scene.restart();
  }
}

/** Exposed for the progress strip and tests; keeps MAX_TIER referenced in one place. */
export const LADDER_LENGTH = MAX_TIER + 1;
