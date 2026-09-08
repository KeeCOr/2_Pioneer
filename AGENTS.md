# Project Instructions

## Project Identity

`2_Pioneer / Pioneer`는 29개 항구, 8개 상품, 3레이어 시장 경제를 가진 해양 무역 시뮬레이션이다. 가격 변동 알고리즘과 함대 관리가 핵심이며 20-30분 세션을 목표로 한다.

## Authoritative Stack

- React 18 + Vite + Tailwind (v1.8.2)
- Electron 래퍼: `electron/main.cjs` (Steam 통합 포함)
- 빌드: `npm run build` (Vite) / `npm run dist:steam` (Electron 배포)
- 테스트: `node --test`
- 경로: `C:/Users/bada/2_Pioneer`

## Structure

- `src/App.jsx`: 앱 진입점
- `src/`: React 컴포넌트 및 게임 로직
- `electron/main.cjs`: Electron 메인 (dist/를 로컬 HTTP 서버로 서빙)
- `electron/preload.cjs`: contextBridge
- `electron-builder.config.cjs`: 빌드 설정

## Build And Verification

```powershell
# 웹 빌드만
cd C:/Users/bada/2_Pioneer && npm run build

# Steam 배포 빌드 (Vite + Electron-builder)
cd C:/Users/bada/2_Pioneer && npm run dist:steam
```

- 실행파일 출력: `release/Pioneer_v{버전}_portable.exe`
- `package.json`의 `version` 업데이트 후 빌드
- 시장 경제 변경은 가격 변동 단위 테스트로 확인

## Documentation Rules

- `docs/Pioneer_기획서.md`와 `docs/Pioneer_기획서.html` 동기화 유지
- 신규 항구/상품 추가 시 `docs/store-description.md` 업데이트
- `docs/steam-achievements.md`에 신규 업적 추가 시 구현과 일치 확인

## AI-Assisted Workflow

1. Plan: 시장 레이어, 함대, UI, 저장 중 어떤 부분인지 정한다
2. Split: 가격 로직, React 컴포넌트, 테스트, 문서를 분리한다
3. Build: 시장 알고리즘 불변성을 유지하며 좁게 수정한다
4. Verify: `node --test`, Vite 빌드, Electron 실행 확인
5. Reflect: 가격 모델 변경은 반드시 기획서에 남긴다

## Do Not

- `C:/Development/2_Pioneer` 또는 `C:/temp/pioneer-electron` 경로를 사용하지 않는다
- bash `cp -r` 명령을 사용하지 않는다 (PowerShell 환경: `Copy-Item` 사용)
- 3개 시장 레이어(미세변동/플레이어영향/이벤트)를 하나로 합치지 않는다
- 빌드 없이 portable 업데이트를 주장하지 않는다
