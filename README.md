# MergeDrop

같은 과일을 떨어뜨려 합치는 물리 퍼즐 게임. 브라우저에서 바로 플레이할 수 있습니다.

## 플레이 방법

- 마우스를 좌우로 움직여 조준하고, 클릭(모바일은 탭)하면 과일이 떨어집니다.
- 같은 과일 둘이 닿으면 한 단계 큰 과일로 합쳐지고 점수를 얻습니다.
- 체리 → 딸기 → 포도 → 한라봉 → 오렌지 → 사과 → 배 → 복숭아 → 파인애플 → 멜론 → **수박**
- 과일이 위쪽 빨간 선 위에 멈춰 있으면 게임이 끝납니다.

## 개발

```bash
npm install
npm run dev      # http://localhost:5173/MergeDrop/
npm run check    # 타입 검사 + 린트 + 테스트
npm run build
```

## 기술 스택

Vite · TypeScript · Phaser 3 (Matter.js 물리) · GitHub Actions로 GitHub Pages 자동 배포.

게임 규칙(`src/game/`)은 Phaser에 의존하지 않는 순수 함수로 분리되어 있어 게임을 실행하지 않고
테스트할 수 있습니다. 점수 저장은 `ScoreService` 인터페이스 뒤에 있어, 현재는 브라우저
localStorage만 쓰지만 전역 랭킹 서버를 붙일 때 구현체만 추가하면 됩니다.

자세한 설계는 [docs/](docs/)를 참고하세요.
