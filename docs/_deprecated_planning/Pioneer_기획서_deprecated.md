# Pioneer 기획서

문제 정의: 느긋한 탐험과 경제 최적화를 좋아하는 플레이어가 매 항해마다 의미 있는 노선 결정을 원한다.

## 게임 소개
항해, 교역, 선단 확장을 한 루프로 묶은 해상 경영 게임.

Pioneer의 핵심 매력은 한 번의 선택이 다음 장면의 위험도, 보상, 성장 방향으로 이어지는 구조다. 이 문서는 처음 보는 사람에게 게임의 재미와 현재 방향을 빠르게 소개하기 위한 단일 기획서이며, 세부 변경 이력은 별도 업데이트 내역서에서 관리한다.

## 한 줄 소개
항해, 교역, 선단 확장을 한 루프로 묶은 해상 경영 게임.

## 핵심 루프
유저가 현재 전장의 정보를 읽고 선택을 하면 전투/운영 결과가 갱신되고, 그 보상과 손실 때문에 다시 다음 선택을 준비한다.

## 게임 플레이 예시
- 1단계: 플레이어가 Pioneer의 현재 목표, 보유 자원, 즉시 대응해야 할 위험을 확인한다.
- 2단계: 카드, 유닛, 배치, 명령, 이동 중 현재 상황에 맞는 핵심 행동을 선택한다.
- 3단계: 선택 결과가 전투, 운영, 보상, 손실로 즉시 갱신되고 다음 판단의 근거가 된다.
- 4단계: 획득한 보상이나 변화한 상태를 바탕으로 다음 선택을 준비하며 핵심 루프를 반복한다.
- 플레이 감각: 짧은 세션 안에서 상황 파악, 의미 있는 선택, 즉각적인 피드백, 다음 목표 제시가 끊기지 않는 흐름을 지향한다.

## 핵심 재미
- 읽기 쉬운 상황 판단: 지금 위험한 요소와 얻을 수 있는 보상이 한눈에 들어온다.
- 직접적인 선택 피드백: 선택 직후 전투, 점수, 자원, 성장 상태가 변해 손맛을 만든다.
- 누적되는 성장감: 반복 플레이가 단순 재시작이 아니라 다음 전략의 재료로 이어진다.

## 주요 시스템
- 핵심 선택 시스템: 현재 국면에서 가능한 행동을 5개 이하의 명확한 선택지로 제시한다.
- 위험/보상 피드백: 행동 전후의 이득, 손실, 위협 변화를 빠르게 보여준다.
- 성장과 해금: 세션 결과가 능력, 카드, 유닛, 건물, 장비, 스테이지 등 다음 플레이의 선택지를 넓힌다.
- 상태별 UX: 로딩, 빈 상태, 오류, 많은 데이터, 긴 텍스트 상황에서도 레이아웃이 무너지지 않도록 관리한다.
- 실행 안정성: 테스트와 빌드 산출물을 기준으로 현재 플레이 가능한 범위를 계속 확인한다.

## 게임 구성과 규칙 (GDD 통합)
- 통합 기준 문서: `02-design/features/pioneer-game-v1.1.design.md`, `02-design/features/pioneer-game-v1.2.design.md`, `02-design/features/pioneer-game.design.md`
- 작성 기준: 16_PokerStrike_GDD처럼 화면 구조, 핵심 시스템, 진행/승패 규칙, UI/HUD, 미결 항목을 한 문서에서 바로 읽을 수 있게 정리한다.

### 화면/플레이 구조
- **1.1 변경 범위** (02-design/features/pioneer-game-v1.1.design.md)
  - v1.0 단일 파일 구조를 유지하며 4개 시스템을 추가한다.
  - 새 파일은 생성하지 않는다 — `src/App.jsx` 단독 수정.
  - App.jsx (OceanTycoon 컴포넌트)
  - ├── 상수 (기존 + 신규)
  - │ ├── (기존) SHIP_TYPES, PORT_SHIPS, PORT_INFO, CREW_NAMES, makePrediction
  - │ └── PORT_SPECIALTY ← NEW: 항구별 특산 자원 맵
  - ├── State (gs: GameState) — 변경 없음
- **2.2 priceHistory (UI State)** (02-design/features/pioneer-game-v1.1.design.md)
  - priceHistory: {
  - [portKey: string]: {
  - [resource: string]: number[] // 최신 → 오래된 순, 최대 5개
  - // 초기값: 각 항구×자원 빈 배열
  - // 갱신: 시세 갱신 후 현재 가격을 unshift → length > 5 이면 pop
- **이동 루프 속도 적용** (02-design/features/pioneer-game-v1.1.design.md)
  - // calcStats 반환값에 weather.speedMult 추가 적용
  - const effectiveSpeed = speedBoost ? 0.12 : stats.speed * weather.speedMult;
  - `speedBoost` 활성 시에는 날씨 무관 — 보석 즉시 도착은 날씨 초월.

### 핵심 시스템
- **2.1 PORT_SPECIALTY (상수)** (02-design/features/pioneer-game-v1.1.design.md)
  - const PORT_SPECIALTY = {
  - london: 'wool',
  - lisbon: 'wine',
  - antwerp: 'diamond',
  - venice: 'silk',
  - genoa: 'seafood',
  - istanbul: 'embroidery',
  - alexandria: 'spice',
  - dubai: 'aromatics',
  - mumbai: 'cotton',
- **2.3 weather (UI State)** (02-design/features/pioneer-game-v1.1.design.md)
  - type: 'calm' | 'tailwind' | 'headwind' | 'storm',
  - speedMult: number, // calm=1.0, tailwind=1.3, headwind=0.7, storm=0.5
  - label: string, // 헤더 표시용 한글 텍스트
  - icon: string, // 이모지
  - { type: 'calm', speedMult: 1.0, label: '잔잔한 바다', icon: '🌊' }
- **2.4 saveData (localStorage)** (02-design/features/pioneer-game-v1.1.design.md)
  - // 키: 'pioneer_save'
  - saveVersion: '1.1',
  - savedAt: string, // ISO 8601
  - gs: GameState, // gold, gems, ships[], crew[], availableCrew[], purchasedInfo{}, predictions[]
  - priceHistory: {}, // 현재 히스토리 포함 저장
  - // prices{}는 저장하지 않음 — 불러오기 시 초기 난수로 재생성
- **화물 탭 자원 행 통합** (02-design/features/pioneer-game-v1.1.design.md)
  - // 기존 자원 행 오른쪽에 스파크라인 추가
  - <Sparkline data={priceHistory[portKey]?.[res] ?? []} />

### 진행/승패 규칙
- **거래가 계산 수정** (02-design/features/pioneer-game-v1.1.design.md)
  - 기존 `calcStats()` 의 `tradePct` (승무원 상술 보너스)에 특산 보너스를 별도 적용.
  - const specialty = PORT_SPECIALTY[portKey] === resource;
  - const specialtyMult = specialty ? 0.8 : 1.0; // 20% 저렴
  - const buyPrice = Math.floor(basePrice * specialtyMult * (1 - tradePct / 100));
  - const sellSpecialtyMult = specialty ? 1.2 : 1.0; // 20% 비쌈
  - const sellPrice = Math.floor(basePrice * sellSpecialtyMult * (1 + tradePct / 100));
- **9.1 일반 퀘스트 (3개 고정 제공)** (02-design/features/pioneer-game-v1.2.design.md)
| 유형 | 내용 | 보상 |
|------|------|------|
| 운송 | 특정 상품 N개를 특정 항구에서 판매 | 금화 |
| 탐험 | 새 항구 N곳 방문 | 금화 + 보석 1 |
| 무역 | 누적 판매액 N금 달성 | 금화 |
  - 퀘스트는 시세 변동 시마다 갱신 (3개 유지)
- **9.2 일일 목표 (4개, 매일 자정 리셋)** (02-design/features/pioneer-game-v1.2.design.md)
| 유형 | 내용 | 보상 |
|------|------|------|
| 일일 운송 | 특정 상품 N개를 오늘 안에 판매 | 금화 + 보석 1 |
| 일일 항구 순례 | 새 항구 N곳 발견 | 금화 + 보석 1 |
| 일일 매출 목표 | 오늘 누적 판매액 N금 | 금화 |
| 일일 거래 횟수 | 오늘 판매 N회 완료 | 금화 |
  - 난이도는 세금 레벨에 따라 자동 스케일

### UI/HUD/피드백
- **UI — 저장 버튼** (02-design/features/pioneer-game-v1.1.design.md)
  - <button onClick={saveGame} className="px-2 py-1 bg-blue-700 rounded text-xs">
  - 불러오기 대화상자 (초기 렌더 시):
  - // saveExists state (boolean)로 제어
  - {saveExists && !saveDecided && (
  - <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
  - <div className="bg-gray-800 p-6 rounded-xl text-center">
  - <p className="text-white mb-4">저장된 게임이 있습니다. 계속할까요?</p>
- **헤더 UI** (02-design/features/pioneer-game-v1.1.design.md)
  - // 헤더 금/보석 표시 옆
  - <span className="text-sm">
  - {weather.icon} {weather.label}
  - {weather.speedMult !== 1.0 && (
  - <span className={weather.speedMult > 1 ? 'text-green-400' : 'text-red-400'}>
  - {' '}({weather.speedMult > 1 ? '+' : ''}{Math.round((weather.speedMult - 1) * 100)}% 속도)

### 구현 메모/미결
- **Pioneer Game v1.1 — Design Document** (02-design/features/pioneer-game-v1.1.design.md)
  - **Feature**: pioneer-game-v1.1
  - **Phase**: Design
  - **Date**: 2026-04-06
  - **Based on**: [pioneer-game-v1.1.plan.md](../../01-plan/features/pioneer-game-v1.1.plan.md)
  - **Base Implementation**: `src/App.jsx` (v1.0, ~800줄)
- **Pioneer Game — 현행 기획서 (v1.2)** (02-design/features/pioneer-game-v1.2.design.md)
  - **최종 갱신**: 2026-04-27
  - **구현 파일**: `src/App.jsx` (단일 파일, ~1,700줄)
  - **현행 버전**: v1.10 포터블 exe
- **12.2 날씨 (기획 완료, 구현 예정)** (02-design/features/pioneer-game-v1.2.design.md)
| 날씨 | 속도 배율 | 확률 |
|------|---------|------|
| 잔잔 🌊 | 1.0× | 50% |
| 순풍 💨 | 1.3× | 20% |
| 역풍 🌬️ | 0.7× | 20% |
| 폭풍 ⛈️ | 0.5× | 10% |
  - 폭풍 시 이동 중인 배 화물 최대 20% 손실 (스태미나로 완화)

## MVP 가설
| 기능 | 검증할 가설 | 검증 방법 |
|------|-------------|-----------|
| 핵심 전투/운영 루프 | 플레이어는 한 판 안에서 선택 결과를 이해하면 다음 판을 자발적으로 시작한다. | 1회 플레이 후 재시작률 60% 이상 |
| 위험/보상 표시 | 위험과 보상이 동시에 보이면 선택 시간이 줄고 납득도가 오른다. | 주요 선택 평균 8초 이내, 결과 불만 피드백 20% 이하 |
| 성장 보상 | 보상이 다음 전략을 바꾸면 반복 플레이 피로가 낮아진다. | 3판 내 서로 다른 빌드 선택률 50% 이상 |

## 레퍼런스 분석
- 장르 기준 레퍼런스는 한 판 시작까지 3단계 이내, 첫 의미 있는 선택까지 30초 이내가 목표다.
- 적용 교훈: 규칙 설명보다 먼저 선택 가능한 상황을 보여주고, 결과 화면에서 다음 판의 개선 포인트를 바로 제안한다.

## 현재 개발 상태 예상 수치
- 완성 목표 대비 구현 체감도: 약 82%
- 첫 세션에서 핵심 루프가 전달될 가능성: 약 88%
- UI/리소스 일관성 체감: 약 78%
- 콘텐츠와 반복 플레이 분량 충족도: 약 78%
- 빌드/실행 안정성 기대치: 약 90%
- 해석 기준: 현재 문서, 최근 산출물 기록, 연결된 예시 이미지 유무를 기준으로 한 사전 추정치이며 실제 플레이 테스트 후 ±15%p 정도 보정이 필요하다.

- 첫 세션 평균 플레이 시간 8분 이상
- 첫 세션 내 2회차 진입률 55% 이상
- 핵심 선택 화면에서 무응답/이탈률 15% 이하

## 현재 구현 상태
- 이 문서는 2026-06-24 기준으로 현재 플레이 방향과 구현 체감 상태를 요약한다.
- 핵심 루프, 조작 원칙, 리소스 적용 현황, 빌드 기준은 프로젝트별 실제 구현과 산출물 기록을 기준으로 계속 보정한다.
- 세부 변경 이력은 별도 업데이트 내역서에서 관리하고, 본 기획서는 처음 보는 사람이 현재 방향을 빠르게 이해하는 공유 문서로 유지한다.
- 새 기능, 밸런스 변경, 리소스 교체, UX 개선이 들어가면 본문과 HTML 문서를 함께 갱신한다.

## 조작과 UX 원칙
- 주요 버튼은 44px 이상으로 유지하고, 화면당 CTA 강조색은 하나만 사용한다.
- 버튼/선택지는 한 번에 5개 이하로 노출해 판단 부담을 줄인다.
- 로딩, 빈 상태, 에러, 많은 데이터, 긴 텍스트 상태를 각각 별도 화면/컴포넌트로 확인한다.
- HUD 동일 레이어 요소는 겹치지 않게 배치하고, 겹침이 필요한 효과는 별도 depth/z-order를 쓴다.

## 적용 리소스
- 런타임에 쓰이는 대표 이미지와 UI 리소스는 프로젝트별 asset/public/Resources 경로를 기준으로 관리한다.
- 새 이미지가 필요할 때는 프로젝트 접두어를 포함한 lowercase kebab-case 파일명을 사용한다.
- 최종 런타임 비주얼은 PNG/WebP 등 비트맵 자산을 우선 사용하고, SVG 또는 코드 드로잉은 문서/임시 참조로만 남긴다.

## 공유용 이미지 미리보기
![Pioneer 공유용 예시 1](archive/Pioneer_gameplay_preview_v1.png)

![Pioneer 공유용 예시 2](Pioneer_01_플레이예시.png)

![Pioneer 공유용 예시 3](Pioneer_레퍼런스_플레이예시_구버전.png)

- docs/Pioneer_01_플레이예시.png
- docs/Pioneer_레퍼런스_플레이예시_구버전.png
- src/assets/frames/button-gold.png

## 빌드, 테스트, 릴리스
- npm test
- npm run build
- 현재 문서 기준 버전: 1.4.0

## 남은 리스크와 다음 우선순위
- 첫 화면에서 게임의 목표와 다음 행동이 5초 안에 보이는지 확인한다.
- 주요 선택의 결과 예측과 실제 결과가 어긋나는 지점을 플레이 테스트로 수집한다.
- 기획서에 남아 있던 변경 이력성 내용은 업데이트 내역서로 계속 이동해 소개 문서의 밀도를 유지한다.
