# MergeDrop 문서

이 디렉토리는 MergeDrop(낙하 머지 퍼즐 웹 게임) 프로젝트의 기획/설계/작업 문서를 모아둔 곳입니다.

## 목차

- [01-planning](01-planning/) — 기획 및 범위
  - [overview.md](01-planning/overview.md) — 무엇을 만드는가, 1차 릴리스 범위와 제외 항목
- [02-architecture](02-architecture/) — 설계 문서, ADR
  - [overview.md](02-architecture/overview.md) — 전체 구조, 씬 구성, 머지 파이프라인, 배포 흐름
  - [adr-001-phaser-스택-선택.md](02-architecture/adr-001-phaser-스택-선택.md) — Flutter Web·바닐라 Canvas와 비교한 스택 결정
  - [adr-002-점수-저장-추상화.md](02-architecture/adr-002-점수-저장-추상화.md) — 서버를 미루고 인터페이스만 둔 결정, 클라우드 승격 경로
- [03-notes](03-notes/) — 작업 메모
  - [2026-09-12-초기-구현과-배포.md](03-notes/2026-09-12-초기-구현과-배포.md) — 첫 구현과 배포, 실플레이로 잡은 버그 기록
- [04-references](04-references/) — 참고 자료
  - [references.md](04-references/references.md)
- [assets/images](assets/images/) — 스크린샷, 다이어그램

## 코드를 만질 때

먼저 루트 [CLAUDE.md](../CLAUDE.md)의 **Gotchas** 절을 읽으세요. 재발하면 원인 찾기 어려운 함정들이
정리되어 있습니다.
