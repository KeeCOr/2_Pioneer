# Pioneer Game v1.1 — Design Document

**Feature**: pioneer-game-v1.1
**Phase**: Design
**Date**: 2026-04-06
**Based on**: [pioneer-game-v1.1.plan.md](../../01-plan/features/pioneer-game-v1.1.plan.md)
**Base Implementation**: `src/App.jsx` (v1.0, ~800줄)

---

## 1. 아키텍처 개요

### 1.1 변경 범위

v1.0 단일 파일 구조를 유지하며 4개 시스템을 추가한다.
새 파일은 생성하지 않는다 — `src/App.jsx` 단독 수정.

```
App.jsx (OceanTycoon 컴포넌트)
│
├── 상수 (기존 + 신규)
│   ├── (기존) SHIP_TYPES, PORT_SHIPS, PORT_INFO, CREW_NAMES, makePrediction
│   └── PORT_SPECIALTY          ← NEW: 항구별 특산 자원 맵
│
├── State (gs: GameState) — 변경 없음
│
├── UI State (로컬) — 신규 추가
│   ├── (기존) selShip, tab, prices{}, mapView, paused ...
│   ├── priceHistory{}          ← NEW: 항구×자원 시세 히스토리
│   └── weather{}               ← NEW: 현재 날씨 상태
│
├── Effects
│   ├── (기존) 초기화, 이동 루프 300ms, 시세 갱신 1000ms
│   └── 저장 자동화: 시세 갱신 주기마다 localStorage 기록  ← NEW
│
├── 함수
│   ├── (기존) calcStats, addLog, portOf, buyInfo ...
│   ├── saveGame()              ← NEW
│   ├── loadGame()              ← NEW
│   └── applyWeather(stats)     ← NEW: speedMult 적용
│
└── UI
    ├── (기존) 헤더, 지도, 우측 패널, 로그
    ├── 헤더: 날씨 아이콘 + 효과 텍스트  ← NEW
    ├── 헤더: 저장 버튼               ← NEW
    └── 화물 탭: 자원 행 스파크라인     ← NEW
```

---

## 2. 신규 데이터 모델

### 2.1 PORT_SPECIALTY (상수)

```js
const PORT_SPECIALTY = {
  london:     'wool',
  lisbon:     'wine',
  antwerp:    'diamond',
  venice:     'silk',
  genoa:      'seafood',
  istanbul:   'embroidery',
  alexandria: 'spice',
  dubai:      'aromatics',
  mumbai:     'cotton',
  calicut:    'spice',
  colombo:    'cinnamon',
  singapore:  'spice',
  bangkok:    'rice',
  shanghai:   'ceramics',
  yokohama:   'ceramics',
};
```

### 2.2 priceHistory (UI State)

```js
// 구조
priceHistory: {
  [portKey: string]: {
    [resource: string]: number[]  // 최신 → 오래된 순, 최대 5개
  }
}

// 초기값: 각 항구×자원 빈 배열
// 갱신: 시세 갱신 후 현재 가격을 unshift → length > 5 이면 pop
```

### 2.3 weather (UI State)

```js
weather: {
  type: 'calm' | 'tailwind' | 'headwind' | 'storm',
  speedMult: number,   // calm=1.0, tailwind=1.3, headwind=0.7, storm=0.5
  label: string,       // 헤더 표시용 한글 텍스트
  icon: string,        // 이모지
}

// 초기값
{ type: 'calm', speedMult: 1.0, label: '잔잔한 바다', icon: '🌊' }
```

### 2.4 saveData (localStorage)

```js
// 키: 'pioneer_save'
{
  saveVersion: '1.1',
  savedAt: string,          // ISO 8601
  gs: GameState,            // gold, gems, ships[], crew[], availableCrew[], purchasedInfo{}, predictions[]
  priceHistory: {},         // 현재 히스토리 포함 저장
}
// prices{}는 저장하지 않음 — 불러오기 시 초기 난수로 재생성
```

---

## 3. 핵심 로직

### 3.1 저장/불러오기

#### saveGame()

```
1. saveData 객체 조립 (saveVersion, savedAt, gs, priceHistory)
2. JSON.stringify → localStorage.setItem('pioneer_save', ...)
3. addLog('게임이 저장되었습니다.')
```

#### loadGame() — 컴포넌트 초기화 시 1회 호출

```
1. raw = localStorage.getItem('pioneer_save')
2. raw가 없으면 return null (새 게임)
3. data = JSON.parse(raw)
4. saveVersion 불일치 시 경고 로그 + return null
5. setGs(data.gs)
6. setPriceHistory(data.priceHistory ?? {})
7. addLog(`저장된 게임을 불러왔습니다. (${data.savedAt})`)
```

#### 자동 저장 트리거

시세 갱신 effect 내부, 새 prices를 set한 직후:
```js
// 시세 갱신 블록 마지막
saveGame();  // 자동 저장
```

#### UI — 저장 버튼

헤더 오른쪽에 위치:
```jsx
<button onClick={saveGame} className="px-2 py-1 bg-blue-700 rounded text-xs">
  💾 저장
</button>
```

불러오기 대화상자 (초기 렌더 시):
```jsx
// saveExists state (boolean)로 제어
{saveExists && !saveDecided && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
    <div className="bg-gray-800 p-6 rounded-xl text-center">
      <p className="text-white mb-4">저장된 게임이 있습니다. 계속할까요?</p>
      <button onClick={handleLoad}>계속하기</button>
      <button onClick={handleNew}>새 게임</button>
    </div>
  </div>
)}
```

### 3.2 시세 히스토리

#### 업데이트 (시세 갱신 직후)

```js
setPriceHistory(prev => {
  const next = { ...prev };
  Object.entries(newPrices).forEach(([port, resources]) => {
    if (!next[port]) next[port] = {};
    Object.entries(resources).forEach(([res, val]) => {
      const arr = [val, ...(next[port][res] ?? [])];
      next[port][res] = arr.slice(0, 5);
    });
  });
  return next;
});
```

#### 스파크라인 SVG 컴포넌트

```jsx
function Sparkline({ data }) {
  // data: number[], 최대 5개, 최신이 마지막
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 50, H = 20;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');
  const color = data[data.length - 1] >= data[0] ? '#4ade80' : '#f87171';
  return (
    <svg width={W} height={H} className="inline-block ml-1">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
```

#### 화물 탭 자원 행 통합

```jsx
// 기존 자원 행 오른쪽에 스파크라인 추가
<Sparkline data={priceHistory[portKey]?.[res] ?? []} />
```

### 3.3 항구 특산 자원 가격 보너스

#### 거래가 계산 수정

기존 `calcStats()` 의 `tradePct` (승무원 상술 보너스)에 특산 보너스를 별도 적용.

```js
// 구매가
const specialty = PORT_SPECIALTY[portKey] === resource;
const specialtyMult = specialty ? 0.8 : 1.0;   // 20% 저렴
const buyPrice = Math.floor(basePrice * specialtyMult * (1 - tradePct / 100));

// 판매가
const sellSpecialtyMult = specialty ? 1.2 : 1.0; // 20% 비쌈
const sellPrice = Math.floor(basePrice * sellSpecialtyMult * (1 + tradePct / 100));
```

#### 초기 가격 설정 수정

prices 초기화 시 특산 자원에 0.7 배율 적용:

```js
const initPrices = () => {
  const p = {};
  PORTS.forEach(port => {
    p[port.key] = {};
    RESOURCES.forEach(res => {
      const base = 80 + Math.random() * 120;  // 80~200
      const mult = PORT_SPECIALTY[port.key] === res ? 0.7 : 1.0;
      p[port.key][res] = Math.floor(base * mult);
    });
  });
  return p;
};
```

#### UI 표시

화물 탭 자원 행, 현재 항구의 특산물에 ⭐ 뱃지:

```jsx
{PORT_SPECIALTY[portKey] === res && (
  <span className="text-yellow-400 text-xs ml-1">⭐특산</span>
)}
```

### 3.4 날씨·해류 이벤트

#### 날씨 결정 (시세 갱신과 동기화)

```js
const WEATHER_TABLE = [
  { type: 'calm',     speedMult: 1.0, label: '잔잔한 바다', icon: '🌊', weight: 50 },
  { type: 'tailwind', speedMult: 1.3, label: '순풍',        icon: '💨', weight: 20 },
  { type: 'headwind', speedMult: 0.7, label: '역풍',        icon: '🌬️', weight: 20 },
  { type: 'storm',    speedMult: 0.5, label: '폭풍',        icon: '⛈️', weight: 10 },
];

// 가중치 랜덤 선택
const rollWeather = () => {
  const total = WEATHER_TABLE.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of WEATHER_TABLE) {
    r -= w.weight;
    if (r <= 0) return w;
  }
  return WEATHER_TABLE[0];
};
```

시세 갱신 블록 내:
```js
const newWeather = rollWeather();
setWeather(newWeather);
addLog(`날씨 변화: ${newWeather.icon} ${newWeather.label}`);
```

#### 이동 루프 속도 적용

```js
// calcStats 반환값에 weather.speedMult 추가 적용
const effectiveSpeed = speedBoost ? 0.12 : stats.speed * weather.speedMult;
```

`speedBoost` 활성 시에는 날씨 무관 — 보석 즉시 도착은 날씨 초월.

#### 폭풍 화물 손실

폭풍 발생(날씨가 storm으로 바뀌는 시점)에 항해 중인 배에 적용:

```js
if (newWeather.type === 'storm') {
  setGs(prev => {
    const ships = prev.ships.map(ship => {
      if (!ship.isMoving) return ship;
      const crewOnShip = prev.crew.filter(c => c.shipId === ship.id);
      const avgStam = crewOnShip.length
        ? crewOnShip.reduce((s, c) => s + c.stamina, 0) / crewOnShip.length
        : 50;
      // 손실률: 0~20%, 스태미나 높을수록 감소 (stamina 100 → 0%, stamina 0 → 20%)
      const lossPct = (1 - avgStam / 100) * 0.2;
      const newCargo = {};
      Object.entries(ship.cargo).forEach(([res, qty]) => {
        newCargo[res] = Math.max(0, Math.floor(qty * (1 - lossPct * Math.random())));
      });
      return { ...ship, cargo: newCargo };
    });
    return { ...prev, ships };
  });
  addLog('⛈️ 폭풍으로 일부 화물이 손실되었습니다!');
}
```

#### 헤더 UI

```jsx
// 헤더 금/보석 표시 옆
<span className="text-sm">
  {weather.icon} {weather.label}
  {weather.speedMult !== 1.0 && (
    <span className={weather.speedMult > 1 ? 'text-green-400' : 'text-red-400'}>
      {' '}({weather.speedMult > 1 ? '+' : ''}{Math.round((weather.speedMult - 1) * 100)}% 속도)
    </span>
  )}
</span>
```

---

## 4. UI 레이아웃 변경

### 4.1 헤더 (변경)

```
┌──────────────────────────────────────────────────────────┐
│ 🌊 Pioneer  |  💰 금화  |  💎 보석  |  🌊 잔잔한 바다  | 💾 저장 │
└──────────────────────────────────────────────────────────┘
```

### 4.2 화물 탭 자원 행 (변경)

```
[ 향신료 ⭐특산  구매: 68금  판매: 92금  [수량] [구매] [판매] ▁▂▃▅▄ ]
```

스파크라인은 자원 행 오른쪽 끝. 히스토리 < 2개이면 숨김.

### 4.3 불러오기 대화상자 (신규)

게임 최초 렌더 시, localStorage에 저장 데이터 존재하면 표시:

```
┌──────────────────────────────┐
│  저장된 게임이 있습니다.       │
│  (저장일시: 2026-04-06 ...)   │
│                              │
│  [계속하기]    [새 게임]      │
└──────────────────────────────┘
```

---

## 5. 구현 파일 목록

| 파일 | 변경 여부 | 내용 |
|------|----------|------|
| `src/App.jsx` | ✏️ 수정 | 4개 시스템 추가, ~300줄 증가 예상 |
| `src/main.jsx` | — 변경 없음 | |
| `src/index.css` | — 변경 없음 | |
| `tailwind.config.js` | — 변경 없음 | |
| `vite.config.js` | — 변경 없음 | |
| `Pioneer_Game.bat` | — 변경 없음 | |

---

## 6. 성공 기준 (Design 관점)

| 항목 | 기준 |
|------|------|
| 저장 완결성 | 저장 후 `localStorage.getItem('pioneer_save')` 파싱 시 gs 필드 완전 복원 |
| 히스토리 크기 | 시세 갱신 6회 후에도 히스토리 배열 길이 ≤ 5 유지 |
| 특산 보너스 격리 | tradePct(승무원 상술)와 specialtyMult가 독립적으로 곱해져 중첩 적용 |
| 날씨 확률 | 1000회 시뮬레이션 시 calm 45~55%, tailwind 15~25%, headwind 15~25%, storm 5~15% |
| speedBoost 우선 | speedBoost=true 시 weather.speedMult 무시, 항상 0.12 속도 |
| 폭풍 손실 상한 | 화물 손실량 ≤ 원래 수량의 20% (Math.random() 기반이므로 평균값) |
| 코드 규모 | 최종 App.jsx ≤ 1,100줄 |
