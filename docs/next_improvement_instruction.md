# Pioneer Next Improvement Instruction

## 2026-09-17 Core Identity Correction

- Define Pioneer as a game about **predicting changing commodity prices from imperfect information and reinvesting the profit to grow a fleet**.
- Make the primary loop `gather information → compare reliability and expiry → predict port/item movement → buy and assign cargo → sail and sell → review forecast accuracy → expand fleet and information network`.
- Give every rumor a source, confidence, affected port/item, expected direction/range, and expiry. Conflicting reports are intentional decision material, not errors.
- Fleet growth must increase the number, distance, and diversity of market predictions the player can act on simultaneously; it must not be a detached collection layer.
- Release validation must confirm that a new player makes at least one information-led trade and understands why the prediction succeeded or failed before route optimization dominates play.

## Scope
- Project: `C:\Development\2_Pioneer`
- Task class: follow-up improvement planning
- Build: do not build until the next implementation batch is complete.

## Next Tasks

### 1. Route Risk / Profit Summary
- Add a compact route summary before departure that compares expected profit, travel time, risk level, and likely threat sources for the selected trade route.
- Surface the same summary near any route confirmation CTA so the player can decide without jumping between map, cargo, and market panels.
- Validation: create or update at least 3 logic tests covering profitable low-risk, profitable high-risk, and unprofitable/blocked routes.

### 2. Fleet / Trade Screen Flow
- Review the fleet management and trade screens as one continuous flow: select fleet, inspect cargo capacity, choose market goods, confirm route, then depart.
- Reduce duplicated decision points and make back/confirm states explicit so players do not lose the selected fleet, cargo, or route when moving between screens.
- Validation: manually verify loading, empty fleet/cargo, error/retry, 100+ goods or routes, and long Korean item names without layout breakage.

### 3. Release Artifact Consistency
- Audit root, `release/`, `dist/`, and any configured Drive copy path for duplicate or stale Pioneer portable executables.
- Keep exactly one current portable executable name in the expected format and document any intentionally retained helper/runtime files.
- Validation: report artifact path, version, timestamp, size, stale-file cleanup result, and Drive copy status after the next release build.

## Completed 2026-06-29 v1.5.0

- Completed Route Risk / Profit Summary.
- Added route summary near the route confirmation CTA.
- Added three route-summary logic tests.
- Verified with npm test and npm run build.

## Remaining Follow-up

- Completed Fleet / Trade Screen Flow in v1.6.0.
- Release Artifact Consistency remains for the next release build batch.


## Completed 2026-06-29 v1.6.0

- Completed Fleet / Trade Screen Flow.
- Added selected-ship flow strip and three fleetTradeFlow tests.
- Verified npm test and npm run build.
- Release artifact audit completed; portable packaging blocker resolved by recreating C:/temp/pioneer-electron HTTP-server Electron wrapper.
## Completed 2026-06-30 v1.6.0 Release Artifact Consistency

- Recreated the missing `C:/temp/pioneer-electron` Electron wrapper with an internal `127.0.0.1` static server for the Vite build.
- Built `release/Pioneer_v1.6.0_portable.exe` and copied it to the project root.
- Removed stale local `Pioneer_v1.4.1_portable.exe` artifacts and release helper output.
- Synced the latest executable and planning documents to Google Drive.
## Completed 2026-07-03 Metadata And Persona Recheck

- Rewrote persona feedback into readable UTF-8 text.
- Cleaned `package.json` description so project metadata no longer exposes mojibake.
- Confirmed the route-summary and fleet-trade-flow improvements are already implemented; remaining risk is visual density QA with long Korean labels.

## Completed 2026-07-03 Portable Refresh

- Rebuilt the Electron portable after syncing the latest Vite `dist/` into `C:/temp/pioneer-electron`.
- Verification: `npm test` 25/25, `npm run build`, wrapper `npm run dist` with local HTTP server check.
- Copied `Pioneer_v1.6.0_portable.exe` to project root, `release/`, and Google Drive.


## 2026-09-18 전체 프로젝트 공통 완료 조건

1. **첫 5분 핵심 루프**: 시작 10초 안에 목표가 읽히고, 5분 안에 첫 판단→실행→결과→보상/손실→다음 목표가 한 번 완결되어야 한다.
2. **판단 전후 피드백**: 선택 전 예상 이득·위험·비용, 실행 직후 성공·실패·상태 변화, 결과 화면의 원인·변화·다음 점검 행동을 같은 흐름으로 제공한다. 정답을 자동 추천하지 않는다.
3. **출시 증거 패키지**: 테스트·빌드·첫 5분 수동 확인·대표 실행 화면·로딩/빈 상태/오류/저장 복귀·버전과 검증 날짜를 기록한다. 수행하지 않은 항목은 미검증으로 표시한다.

공통 기준 원문: `C:\Development\_workspace_docs\전체_프로젝트_공통_개선기준_2026-09-18.md`

## 2026-09-18 프로젝트별 고유 개선 3개
> 아래 세 항목은 이 프로젝트의 고유 우선순위다. 구현 후에만 완료로 표시한다.

1. [완료·자동 검증] 정보 출처·신뢰도·유효 기간·대상 시장을 한 카드에 표시하고 동일 시장·품목의 반대 예측을 `상충 정보`로 우선 표시
2. 거래 전에 플레이어가 예상 방향과 투자 이유를 기록
3. 적중 수익으로 정보망·동시 운용 선단이 확장되는 성장 연결

### 2026-09-21 완료 근거

- 예시 화면: `docs/design-references/2026-09-21-prediction-conflict-comparison.png`
- 구현: `src/predictionSignals.js`, `src/App.jsx` 보유 예측 카드
- 자동 검증: `src/predictionSignals.test.js`에서 상충 판정·제외 조건·결정 우선 정렬 검증
- 미검증: 실제 플레이에서의 상충 발생 빈도, 데스크톱·좁은 폭 카드 밀도
- 다음 개선 후보: 투자 이유 기록과 예측 결과를 연결하는 사후 검토 화면
