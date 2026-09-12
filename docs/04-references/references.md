# 참고 자료

## Phaser

- [Phaser 3 API 문서](https://docs.phaser.io/api-documentation/api-documentation) — 3.90 기준
- [Phaser 3 예제](https://labs.phaser.io/) — Matter 물리 예제가 특히 유용
- [Phaser Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager) — `Scale.FIT`, 반응형 캔버스

주의: 검색하면 Phaser 4 자료가 섞여 나온다. 이 프로젝트는 3.90.0에 고정되어 있고 4는 API가 다르다
([ADR-001](../02-architecture/adr-001-phaser-스택-선택.md)).

## Matter.js

- [Matter.js 문서](https://brm.io/matter-js/docs/) — `restitution`, `friction`, `frictionStatic` 튜닝
- Phaser에 내장되어 있어 별도 설치는 필요 없다 (`phaser/types/matter.d.ts`)

## 배포

- [GitHub Pages + Actions 공식 가이드](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow)
- [Vite: 정적 사이트 배포](https://vite.dev/guide/static-deploy.html#github-pages) — 서브경로 `base` 설정

## 원작 게임

- 스이카 게임(スイカゲーム) — 이 장르의 원형. 티어 구성과 점수 체계를 참고했으나 그대로 옮기지는 않았다.
