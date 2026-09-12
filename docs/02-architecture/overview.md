# 아키텍처 개요

## 큰 그림

```
┌──────────────── 순수 로직 (Phaser 비의존) ────────────────┐
│  game/config.ts   튜닝 값 단일 소스                        │
│  game/merge.ts    머지 판정, 스폰 티어 추첨                │
└──────────────▲────────────────────────────────────────────┘
               │ 규칙 질의 (동기 함수 호출)
┌──────────────┴──────────── Phaser 씬 ─────────────────────┐
│  BootScene    Graphics로 과일 텍스처 생성 → GameScene      │
│  GameScene    Matter 월드, 입력, 충돌 → 머지 파이프라인     │
│  UIScene      GameScene과 나란히 실행. 점수·오버레이        │
└──────────────┬────────────────────────────────────────────┘
               │ 이벤트 (score / next / game-over)
┌──────────────▼──────────── 경계 ──────────────────────────┐
│  services/ScoreService.ts        인터페이스                │
│  services/LocalScoreService.ts   localStorage 구현         │
└───────────────────────────────────────────────────────────┘
```

## 원칙 1 — 게임 규칙은 Phaser를 모른다

이 프로젝트에서 가장 중요한 구조적 결정이다.

`src/game/`의 두 모듈은 Phaser를 import하지 않는다. 머지 판정, 점수 계산, 스폰 티어 추첨이 전부
순수 함수다. 씬은 물리 엔진에서 받은 사실(무엇과 무엇이 충돌했는가)을 이 함수에 넘기고, 돌아온
결과를 화면에 반영하기만 한다.

```ts
// GameScene은 판정하지 않는다. 물어보고 적용할 뿐이다.
const outcome = resolveMerge(a.getData('tier'), b.getData('tier'));
if (!outcome) continue;
```

`resolveMerge()`는 판별 유니온을 돌려준다:

- `{ kind: 'promote', tier, score }` — 둘을 없애고 다음 티어 하나를 만든다
- `{ kind: 'clear', score }` — 수박 둘이 만났다. 둘 다 없애고 아무것도 만들지 않는다
- `null` — 합쳐지지 않는다

**얻는 것**: 게임을 띄우지 않고 규칙 전체를 테스트할 수 있다. 현재 27개 테스트가 브라우저 없이
73ms에 돈다. 밸런싱을 바꿔도 렌더링 코드를 건드리지 않는다.

**깨뜨리면 안 되는 것**: 씬 안에 판정 로직을 넣는 순간 그 부분은 테스트 불가능해진다.

## 원칙 2 — 튜닝 값은 config.ts 한 곳에

과일 사다리(이름·반지름·색·점수), 스폰 가중치, 레이아웃 좌표, 물리 상수가 전부
`src/game/config.ts`에 있다. 씬에 매직 넘버가 나타나면 그건 버그다.

점수는 삼각수(1, 3, 6, 10, 15, 21, 28, 36, 45, 55)를 쓴다. 위 단계 하나가 아래 단계 여러 번보다
확실히 값지도록 하기 위해서다.

`tests/config.test.ts`가 테이블 자체의 정합성을 지킨다 — 반지름과 점수의 단조 증가, 가장 큰 과일이
플레이필드에 들어가는지, 낙하 지점이 위험선보다 위인지 등. 밸런싱을 잘못 건드리면 테스트가 잡는다.

## 씬 구성

세 개로 나눈다. 더 잘게 쪼개지 않는다.

- **BootScene** — 과일 텍스처를 `Graphics`로 그려 `generateTexture()`로 굽는다. **이미지 파일이
  하나도 없다.** 나중에 실제 아트로 교체할 때는 여기서 파일을 로드하면 되고, 나머지 코드는 텍스처
  키만 알기 때문에 바뀌지 않는다.
- **GameScene** — Matter 물리 월드, 벽/바닥, 포인터 입력, 충돌 → 머지 파이프라인.
- **UIScene** — `scene.launch()`로 GameScene **위에 동시 실행**한다. GameScene 안에 두지 않은
  이유는, 게임이 끝나 물리가 멈춘 뒤에도 게임오버 패널이 입력을 받아야 하기 때문이다.

씬 간 통신은 `GameScene.events`로 emit하고 UIScene이 listen한다. UIScene은 shutdown 시 리스너를
반드시 해제한다 — 재시작할 때마다 GameScene에 리스너가 쌓이기 때문이다.

## 머지 파이프라인

충돌 처리에 순서 제약이 있다.

```
collisionstart (물리 스텝 중)
   └─ 과일 쌍을 pendingMerges 큐에 넣기만 한다. 월드는 절대 건드리지 않는다.

update() (물리 스텝 밖)
   └─ processMerges()
        ├─ consumed Set으로 같은 바디의 중복 소비 방지
        ├─ killTweensOf() → destroy()
        └─ resolveMerge() 결과대로 새 과일 생성 또는 클리어
```

**충돌 콜백 안에서 바디를 제거하면 Matter 엔진이 깨진다.** 그래서 큐에 모았다가 다음 `update()`에서
처리한다. 또 한 과일이 한 스텝에 여러 개와 충돌할 수 있어서, 같은 바디가 두 번 파괴되지 않도록
`consumed` 집합으로 막는다.

## 게임오버 판정

**"정지한 과일이 위험선 위에 있으면"** 종료한다. 그 상태가 `dangerGraceMs`(1400ms) 이상 이어져야
한다.

처음에는 "위험선 아래로 한 번 내려간 과일만 판정 대상"이라는 무장(arming) 규칙을 썼는데, 이미 높이
쌓인 더미 위에 바로 얹힌 과일은 선 아래로 내려가는 일이 없어 영원히 무장되지 않았다. 즉 가장 위험한
상황에서 게임이 끝나지 않는 결함이었다. 낙하 중인 과일은 속도가 있으므로 "정지" 조건만으로 자연히
제외된다.

## 배포

```
main push → GitHub Actions
              ├─ npm ci
              ├─ npm run check   (tsc + eslint + vitest) ← 실패하면 배포 안 됨
              ├─ npm run build
              └─ upload-pages-artifact → deploy-pages
```

`vite.config.ts`의 `base: '/MergeDrop/'`가 GitHub Pages 프로젝트 사이트의 서브경로와 일치해야 한다.
빠뜨리면 배포본에서 모든 에셋이 404가 난다. 개발 서버 URL도 `http://localhost:5173/MergeDrop/`로
바뀐다는 점에 유의.

## 파일 지도

| 경로 | 역할 |
| --- | --- |
| `src/game/config.ts` | 모든 튜닝 값 |
| `src/game/merge.ts` | 머지 규칙 (순수) |
| `src/scenes/BootScene.ts` | 텍스처 생성 |
| `src/scenes/GameScene.ts` | 물리·입력·머지 파이프라인 |
| `src/scenes/UIScene.ts` | HUD, 게임오버 오버레이 |
| `src/services/ScoreService.ts` | 저장 경계 인터페이스 |
| `src/services/LocalScoreService.ts` | localStorage 구현 |
| `src/main.ts` | 게임 부팅, 구현체 주입 (교체 지점) |
| `tests/` | 순수 로직 테스트 27개 |
