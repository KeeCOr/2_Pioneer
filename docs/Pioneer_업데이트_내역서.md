# Pioneer 업데이트 내역서

## 2026-06-24 문서 구조 정리
- 기획서와 업데이트 내역서를 분리했다.
- 기획서는 게임 소개, 핵심 루프, MVP 가설, KPI, UX 원칙 중심으로 재작성했다.
- 변경 이력, 구현 로그, 검증 기록은 이 문서에서 관리한다.
- 2026-06-24: stale v2.1 worktree cleanup completed.

## 기존 문서에서 분리한 이력 후보
- 이번 변경 사항
- 회귀 테스트 추가: 출항 시작 좌표가 출발 항구의 시각 중심에서 3 이상 떨어지는지 검증하는 Node 내장 테스트를 추가했다.
- 2026-05-29 추가 변경
- 자동 갱신: 2026-06-04. 코드, 씬, 프리팹, 설정 파일에서 참조가 확인된 리소스 기준입니다.
- 자동 갱신: 2026-06-04. 공유 시 문서와 함께 아래 이미지 경로가 포함되어야 합니다.
- 2026-06-19 업데이트 - SVG 런타임 이미지 교체
- 앱 로딩 경로를 PNG glob으로 갱신하고, 모달 프레임 CSS 참조를 PNG로 변경했다.
- 2026-06-19 업데이트 - 인라인 SVG 제거
- > 자동 갱신: 2026-06-04. 코드, 씬, 프리팹, 설정 파일에서 참조가 확인된 리소스 기준입니다.
- > 자동 갱신: 2026-06-04. 공유 시 문서와 함께 아래 이미지 경로가 포함되어야 합니다.

## 작성 규칙
- 기능 추가, 밸런스 변경, UI/UX 수정, 리소스 교체, 빌드/배포 변경은 날짜와 버전을 함께 기록한다.
- 기획서에는 최신 소개와 현재 설계 의도만 남기고, 과거 작업 로그는 이 문서로 이동한다.
- MD와 HTML은 항상 함께 갱신한다.

## 2026-06-29 v1.5.0

- Added route risk/profit summary helper and route confirmation UI summary.
- Covered low-risk profit, high-risk profit, and blocked/unprofitable route cases with tests.
- Verified with npm test and npm run build.


## 2026-06-29 v1.6.0

- Added a Fleet / Trade flow strip to the selected ship panel: Fleet selected, Cargo check, Market action, Route review, Depart.
- Added fleetTradeFlow logic tests for ordered flow, empty cargo market entry, and blocked route review.
- Refreshed web build. Portable executable packaging blocker was resolved on 2026-06-30 by recreating C:/temp/pioneer-electron; v1.6.0 portable is now current.
## 2026-06-30 v1.6.0 Release Artifact Consistency

- Recreated the missing `C:/temp/pioneer-electron` Electron wrapper and loaded the Vite build through a local HTTP server instead of `file://`.
- Built and placed `Pioneer_v1.6.0_portable.exe` in both `release/` and the project root.
- Removed stale local `Pioneer_v1.4.1_portable.exe` artifacts.
- Verification: `npm test` (25 passed), `npm run build`, `cd C:/temp/pioneer-electron && npm run dist`.

## 2026-07-03 Metadata And Portable Refresh

- Rewrote persona feedback into readable UTF-8 text and cleaned `package.json` description.
- Verified `npm test` with 25/25 passing and `npm run build` succeeding.
- Synced the new web `dist/` into `C:/temp/pioneer-electron`, ran `npm run dist`, and rebuilt `release/Pioneer_v1.6.0_portable.exe`.
- Copied the rebuilt portable executable to the project root and `G:/내 드라이브/실행파일/02_Pioneer_v1.6.0_portable.exe`.
