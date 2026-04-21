# Pioneer Game v1.1 — Plan Document

**Feature**: pioneer-game-v1.1
**Phase**: Plan
**Date**: 2026-04-03
**Status**: Planning
**Base Version**: [pioneer-game v1.0](pioneer-game.plan.md) (Design Match Rate 97%, Production Ready)

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | v1.0 게임은 세션 간 진행 저장 불가(새로고침 시 초기화), 시세 추이 파악 불가, 항구 특산물 경제 미반영, 날씨 변수 부재로 반복 플레이 유인이 약하다. |
| **Solution** | localStorage 기반 저장/불러오기로 장기 플레이 지원. 시세 히스토리 차트로 정보 기반 의사결정 강화. 항구 특산 자원 가격 보너스로 지역 경제 현실감 추가. 날씨·해류 이벤트로 무작위 변수 도입. |
| **Function UX Effect** | 저장 버튼 1클릭으로 진행 보존. 미니 차트로 자원 가격 추이를 직관적으로 확인. 특산 자원 표시로 항구 선택 전략 강화. 날씨 알림으로 리스크 관리 유도. |
| **Core Value** | 장기 플레이 기반 구축 — 저장·불러오기로 세션을 이어나가고, 시세 히스토리·특산물·날씨 변수로 전략 깊이를 높여 재플레이 가치를 극대화. |

---

## 1. 프로젝트 개요

### 1.1 v1.0 달성 현황

| 항목 | 결과 |
|------|------|
| 핵심 시스템 구현 | 7개 완성 (지도·함선·승무원·무역·정보·항구·재화) |
| 설계 충실도 | 97% Match Rate |
| 함선 | 8종 × 3단계 업그레이드 |
| 항구 | 15개 × 지역별 판매 배 차등 |
| 정보 상품 | 4종 (기본 2종·프리미엄 2종) |
| 상태 | Production Ready |

### 1.2 v1.1 개발 목표

v1.0 플랜의 "단기 구현 목표" 4개를 v1.1에서 전부 구현한다.
코드 구조는 기존 `src/App.jsx` 단일 파일을 유지하며 확장한다.

---

## 2. 기능 범위

### 2.1 저장/불러오기 시스템 (localStorage)

| 항목 | 내용 |
|------|------|
| **저장 키** | `pioneer_save` |
| **저장 대상** | gs (gold, gems, ships[], crew[], availableCrew[], purchasedInfo{}, predictions[]) |
| **비저장 항목** | prices{} (휘발성), log (세션 한정), UI 로컬 state |
| **저장 트리거** | 수동 (헤더 "저장" 버튼) + 자동 (시세 갱신 주기마다) |
| **불러오기** | 게임 초기화 시 자동 감지 → 계속하기/새 게임 선택 |
| **버전 필드** | `saveVersion: "1.1"` — 구 저장파일 호환성 처리용 |

**저장 데이터 구조:**
```js
{
  saveVersion: "1.1",
  savedAt: ISO string,
  gs: { gold, gems, ships[], crew[], availableCrew[], purchasedInfo{}, predictions[] },
  priceHistory: {}   // v1.1 신규
}
```

### 2.2 시세 히스토리 차트

| 항목 | 내용 |
|------|------|
| **추적 범위** | 최근 5회 시세 갱신 결과 |
| **구조** | `priceHistory: { [portKey]: { [resource]: number[] } }` |
| **업데이트** | 시세 갱신(3600초) 후 배열 앞에 push → 5개 초과 시 마지막 제거 |
| **표시 위치** | 화물 탭 → 시장 거래 패널 내 자원 행에 미니 스파크라인 |
| **시각화** | SVG 폴리라인 (너비 50px, 높이 20px) — 상승 초록·하락 빨강 색상 |
| **툴팁** | 각 점 hover 시 시세값 표시 (선택 구현) |

### 2.3 항구 특산 자원 가격 보너스

| 항목 | 내용 |
|------|------|
| **규칙** | 각 항구마다 전문 자원 1종 → 구매가 20% 저렴, 판매가 20% 비쌈 |
| **적용 방식** | 거래 시 `tradePct` 보너스와 별도로 곱하기 적용 |
| **표시** | 화물 탭 자원 행에 ⭐ 아이콘 + "특산물" 라벨 |
| **초기 시세** | 특산 자원 초기 가격을 표준보다 30% 낮게 설정 (공급 풍부 반영) |

**PORT_SPECIALTY 구조:**
```js
const PORT_SPECIALTY = {
  london: 'wool', lisbon: 'wine', antwerp: 'diamond',
  venice: 'silk', genoa: 'seafood', istanbul: 'embroidery',
  alexandria: 'spice', dubai: 'aromatics', mumbai: 'cotton',
  calicut: 'spice', colombo: 'cinnamon', singapore: 'spice',
  bangkok: 'rice', shanghai: 'ceramics', yokohama: 'ceramics'
};
```

### 2.4 날씨·해류 이벤트

| 항목 | 내용 |
|------|------|
| **이벤트 종류** | 순풍(+30% 속도), 역풍(-30% 속도), 폭풍(-50% 속도 + 모사일 손실 위험), 잔잔한 날씨(효과 없음) |
| **발생 주기** | 시세 갱신(3600초)과 동기화 → 매 시간 전역 날씨 1종 무작위 결정 |
| **확률 분포** | 잔잔 50%, 순풍 20%, 역풍 20%, 폭풍 10% |
| **적용 대상** | 모든 항해 중인 배의 실효 속도 |
| **UI 표시** | 헤더 날씨 아이콘 + 효과 설명 텍스트 |
| **폭풍 화물 손실** | 화물 보유 시 각 자원 0~20% 랜덤 손실 (선원 스태미나 평균이 높을수록 손실 감소) |

**날씨 state:**
```js
weather: { type: 'calm' | 'tailwind' | 'headwind' | 'storm', speedMult: number }
```

---

## 3. 미구현 (v1.2+ 예정)

### 3.1 중장기 로드맵

| 기능 | 버전 |
|------|------|
| 보석 인앱 결제 연동 | v1.2 |
| 경쟁 NPC 상인 (AI 무역 경쟁자) | v1.2 |
| 해적 조우 이벤트 | v1.3 |
| 업적 시스템 | v1.3 |
| 모바일 최적화 (터치 UI 개선) | v1.4 |

---

## 4. 기술 스택 (변경 없음)

| 항목 | 기술 |
|------|------|
| Framework | React 18 + Vite 5 |
| Styling | TailwindCSS 3 |
| State | useState / useEffect (단일 파일 유지) |
| Persistence | localStorage (`pioneer_save`) |
| Build | `npm run build` → dist/ |
| 실행 | Pioneer_Game.bat / npm run preview |

---

## 5. 파일 구조 (변경 최소화)

```
2_Pioneer/
├── src/
│   ├── App.jsx          # v1.1 기능 추가 (저장·차트·특산물·날씨)
│   ├── main.jsx         # 변경 없음
│   └── index.css        # 변경 없음
├── dist/                # 빌드 산출물
├── Pioneer_Game.bat     # 변경 없음
└── docs/
    ├── 01-plan/features/pioneer-game-v1.1.plan.md
    ├── 02-design/features/pioneer-game-v1.1.design.md  ← 다음 생성
    └── ...
```

---

## 6. 성공 기준

| 기준 | 목표 |
|------|------|
| 저장/불러오기 | 저장 후 새로고침해도 금화·배·화물 완벽 복원 |
| 시세 히스토리 | 시세 갱신 5회 후 각 항구·자원에 5개 히스토리 확인 가능 |
| 특산 자원 보너스 | 특산 항구에서 해당 자원 구매가가 비특산 항구 대비 20% 저렴 |
| 날씨 이벤트 | 시세 갱신마다 날씨 변경, 폭풍 시 속도·화물 손실 정상 작동 |
| 코드 규모 | App.jsx 1,100줄 이내 (v1.0 ~800줄 + v1.1 ~300줄) |
