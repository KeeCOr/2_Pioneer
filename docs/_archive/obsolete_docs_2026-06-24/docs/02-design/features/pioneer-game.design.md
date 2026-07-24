# Pioneer Game — Design Document

**Feature**: pioneer-game
**Phase**: Design
**Date**: 2026-04-06
**Based on**: [pioneer-game.plan.md](../../01-plan/features/pioneer-game.plan.md)

---

## 1. 아키텍처 개요

### 1.1 전체 구조

```
App.jsx (단일 컴포넌트 — OceanTycoon)
│
├── 상수 (컴포넌트 외부)
│   ├── SHIP_TYPES        - 8종 함선 스펙
│   ├── PORT_SHIPS        - 항구별 판매 함선 목록
│   ├── PORT_INFO         - 4종 정보 상품 정의
│   ├── CREW_NAMES        - 승무원 이름 풀
│   └── makePrediction()  - 정보 예측 생성 유틸
│
├── State (gs: GameState)
│   ├── gold, gems
│   ├── ships[]           - 보유 함선 목록
│   ├── crew[]            - 고용된 승무원 목록
│   ├── availableCrew[]   - 항구 모집 가능 승무원
│   ├── purchasedInfo{}   - 고급 정보 구매 기록
│   └── predictions[]     - 보유 정보 예측 목록
│
├── UI State (컴포넌트 로컬)
│   ├── selShip, tab, showBuy, routeMode
│   ├── prices{}          - 항구별 자원 시세
│   ├── mapView { x, y, zoom }
│   └── 기타 (log, selRes, qty, paused 등)
│
├── Effects
│   ├── 초기화: prices 생성
│   ├── 이동 루프: setInterval 300ms
│   └── 시세 갱신: setInterval 1000ms (3600초마다 갱신)
│
└── UI
    ├── 헤더 (금/보석)
    ├── 지도 (Pan/Zoom, 항구·배 렌더)
    ├── 우측 패널 (함대·배 상세·정보구매)
    └── 로그
```

---

## 2. 데이터 모델

### 2.1 Ship (함선)

```js
{
  id: number,
  type: 'sloop' | 'merchant' | 'caravel' | 'galley' | 'dhow' | 'junk' | 'galleon' | 'frigate',
  name: string,
  x: number,          // 현재 좌표 (0~100 %)
  y: number,
  targetX: number | null,
  targetY: number | null,
  isMoving: boolean,
  speedBoost: boolean, // 보석 부스트 활성화
  cargo: { [resource: string]: number },
  upgrades: { speed: 0~5, cargo: 0~5, crew: 0~5 },
  morale: number,
}
```

### 2.2 Crew (승무원)

```js
{
  id: number,
  name: string,
  navigation: 30~100,  // 항해술 → 배 속도 영향
  trading:    30~100,  // 상술 → 거래가 보너스
  stamina:    30~100,  // 체력 (미래 확장용)
  hireCost:   500~2000,
  shipId: number | null,  // null = 미배치
}
```

### 2.3 Prediction (정보 예측)

```js
{
  id: number,
  infoId: 'rumor' | 'hint' | 'analysis' | 'route',
  tier: 'basic' | 'premium',
  resource: string,         // 대상 자원
  targetPort: string,       // 대상 항구 key
  targetPortName: string,
  direction: 'up' | 'down', // 예측 방향
  accuracy: 0~1,            // 적중 확률
  mag: number,              // 예측 변동 크기 (금)
  applied: boolean,         // 시세 갱신 시 적용 여부
  hit: boolean | null,      // null=대기, true=적중, false=빗나감
  boughtAt: string,         // 구매 항구명
}
```

### 2.4 ShipType (함선 종류 스펙)

```js
{
  name: string, icon: string, desc: string,
  baseSpeed: number,    // 0.0008 ~ 0.002 (단위: %/tick)
  baseCapacity: number, // 50 ~ 200
  maxCrew: number,      // 4 ~ 12
  cost: number,         // 3000 ~ 50000
}
```

### 2.5 PORT_INFO (정보 상품)

```js
{
  id: string,
  tier: 'basic' | 'premium',
  cost: number,
  name: string,
  desc: string,
  accuracy: number,  // 기대 적중률
  magMin: number,    // 변동폭 최솟값
  magMax: number,    // 변동폭 최댓값
  repeat: boolean,   // true = 반복 구매 가능
}
```

| 상품 | tier | 적중률 | 변동폭 | 반복 |
|------|------|-------|--------|------|
| 항구 소문 | basic | 45% | 15~45금 | O |
| 상인 귀띔 | basic | 55% | 25~65금 | O |
| 상업 분석 보고서 | premium | 78% | 60~130금 | X (항구당 1회) |
| 내부 정보 | premium | 92% | 100~200금 | X (항구당 1회) |

---

## 3. 핵심 로직

### 3.1 calcStats (배 능력치 계산)

```
입력: ship, crewList
출력: { speed, capacity, maxCrew, tradePct, crewCnt }

speed    = baseSpeed × (1 + (avgNavigation-50)/200 + upgrades.speed×0.15)
capacity = baseCapacity + upgrades.cargo × 25
maxCrew  = min(12, type.maxCrew + upgrades.crew)
tradePct = round((avgTrading-50) / 2)   → 거래가 ±%
```

### 3.2 이동 루프 (300ms interval)

```
for each isMoving ship:
  distance = hypot(targetX-x, targetY-y)
  if distance < 0.3 → 도착 처리 (speedBoost 초기화)
  speed = speedBoost ? 0.12 : calcStats(ship).speed
  x += speed × cos(angle)
  y += speed × sin(angle)
```

**속도 기준 (merchant 기준, 최근접 항구 ~1시간)**
- 300ms tick, 3600초 = 12,000 tick
- 최근접 거리 ≈ 12 유닛 → 필요 speed = 12/12000 = 0.001/tick ✓

### 3.3 시세 갱신 (매 3600초)

```
1. 모든 항구 자원: 기본 랜덤 변동 ±30금
2. predictions[] 순회:
   if !applied:
     hit = random() < accuracy
     if hit: prices[targetPort][resource] += direction × mag
     prediction.applied = true
     prediction.hit = hit
```

### 3.4 정보 예측 생성 (makePrediction)

```
resource   = RESOURCES에서 랜덤 1종
targetPort = PORTS에서 랜덤 1곳
direction  = 'up' | 'down' (50/50)
mag        = magMin + random × (magMax - magMin)
```

### 3.5 항구 제한 Guard

거래 외 모든 상호작용(승무원·업그레이드·정보구매·배구매)은
`atPort = portOf(currentShip) !== null` 조건으로 차단.

---

## 4. UI 레이아웃

```
┌─────────────────────────────────────────────────┐
│ 헤더: 타이틀 | 금화 | 보석                        │
├─────────────────────────┬───────────────────────┤
│                         │ 함대 목록 + 배 구매    │
│   지도 (pan/zoom)       │                       │
│   - 항구 🏛️            │ 배 상세 탭             │
│   - 배 아이콘           │ [현황|승무원|화물|업그] │
│   - 항해 경로           │                       │
│   - 목적지 점선         │ 정보 구매 (atPort시)   │
│                         │ 보유 예측 현황         │
├─────────────────────────┴───────────────────────┤
│ 로그 (최근 30줄 스크롤)                           │
└─────────────────────────────────────────────────┘
```

### 4.1 지도 인터랙션

| 입력 | 동작 |
|------|------|
| 마우스 휠 | 커서 기준 줌 인/아웃 (0.5x ~ 6x) |
| 마우스 드래그 | 지도 이동 (pan) |
| 터치 핀치 | 줌 인/아웃 |
| 터치 드래그 | 지도 이동 |
| 배 클릭 | 선택 + routeMode 진입 |
| 항구 클릭 (routeMode) | 해당 항구로 항해 시작 |
| 지도 빈 곳 클릭 | routeMode 취소 |

### 4.2 우측 패널 탭

| 탭 | 내용 | 항구 제한 |
|---|------|---------|
| 현황 | 위치·ETA·속도·화물·승무원·보석부스트 | 없음 |
| 승무원 | 탑승·미배치·모집 가능 | 항구 전용 |
| 화물 | 적재 목록 + 시장 거래 | 거래는 항구 전용 |
| 업그레이드 | 돛·화물칸·선원숙소 (각 5레벨) | 항구 전용 |

---

## 5. 항구 데이터

| key | 이름 | 전문 자원 | 좌표(x,y) | 판매 배 |
|-----|------|---------|---------|------|
| london | 런던 | 양털 | 8,5 | merchant, caravel |
| lisbon | 리스본 | 와인 | 3,24 | sloop, merchant |
| antwerp | 앤트워프 | 다이아몬드 | 21,5 | sloop, merchant, caravel |
| venice | 베니스 | 비단 | 36,12 | merchant, galley |
| genoa | 제노바 | 해산물 | 26,23 | sloop, galley |
| istanbul | 이스탄불 | 자수 | 47,18 | merchant, galley, caravel |
| alexandria | 알렉산드리아 | 향신료 | 43,33 | merchant, dhow |
| dubai | 두바이 | 향료 | 61,33 | merchant, dhow |
| mumbai | 뭄바이 | 면직물 | 49,53 | merchant, dhow, galleon |
| calicut | 칼리컷 | 향신료 | 57,65 | dhow, junk |
| colombo | 콜롬보 | 계피 | 66,74 | merchant, dhow |
| singapore | 싱가포르 | 향신료 | 76,63 | caravel, junk |
| bangkok | 방콕 | 쌀 | 71,50 | merchant, junk |
| shanghai | 상하이 | 도자기 | 86,26 | junk, galleon |
| yokohama | 요코하마 | 도자기 | 94,15 | junk, frigate |

---

## 6. 함선 스펙 상세

| 종류 | 속도 | 화물 | 최대승무원 | 비용 | 판매 지역 |
|------|------|------|---------|------|---------|
| 슬루프 ⛵ | 0.0015 | 50 | 4 | 3,000 | 유럽 서부 |
| 상인선 🚢 | 0.001 | 100 | 8 | 8,000 | 전 항구 |
| 카라벨 ⛴️ | 0.0013 | 80 | 6 | 15,000 | 유럽·인도양 |
| 갤리 🚣 | 0.0011 | 65 | 8 | 12,000 | 지중해 |
| 다우 🛶 | 0.0016 | 70 | 6 | 18,000 | 인도양 |
| 정크선 🛸 | 0.0009 | 160 | 10 | 22,000 | 동아시아 |
| 갤리온 🛳️ | 0.0008 | 200 | 12 | 25,000 | 남아시아·동아시아 |
| 프리깃 🏴‍☠️ | 0.002 | 120 | 12 | 50,000 | 요코하마 단독 |

---

## 7. 구현 파일 목록

| 파일 | 역할 |
|------|------|
| `src/App.jsx` | 전체 게임 로직 + UI (단일 파일, ~800줄) |
| `src/main.jsx` | React 진입점 |
| `src/index.css` | TailwindCSS + 커스텀 클래스 |
| `tailwind.config.js` | ocean-dark, gold 등 커스텀 색상 |
| `vite.config.js` | 빌드 설정 |
| `Pioneer_Game.bat` | 빌드 산출물 실행 스크립트 |

---

## 8. 성공 기준 (Design 관점)

| 항목 | 기준 |
|------|------|
| 상태 일관성 | `gs` 단일 객체에서 파생 가능한 모든 값은 calcStats로 계산 |
| 예측 시스템 | 시세 갱신 시 applied=false인 예측 전부 처리, hit 결과 반영 |
| 항구 제한 | atPort=false 시 승무원·업그레이드·정보구매 UI 차단 |
| 지도 UX | 줌 0.5x~6x 범위, 줌아웃 시 바다 배경 항상 표시 |
| 함선 호이스팅 | 헬퍼 함수(getCurrentShip 등) 사용 전에 선언 완료 |
