# Pioneer Game — Gap Analysis Report

**Feature**: pioneer-game
**Analysis Date**: 2026-04-06
**Design Doc**: `docs/02-design/features/pioneer-game.design.md`
**Implementation**: `src/App.jsx`

---

## Overall Match Rate: **97%** ✅

| 항목 | 점수 | 상태 |
|------|:----:|:----:|
| 데이터 모델 | 100% | ✅ |
| 핵심 로직 | 94% | ✅ |
| UI 레이아웃 | 100% | ✅ |
| 항구 데이터 | 100% | ✅ |
| 함선 스펙 | 100% | ✅ |
| 성공 기준 | 90% | ✅ |
| **종합 (가중 평균)** | **97%** | **✅** |

---

## 1. 데이터 모델 비교

### Ship (100% — 10/10 필드)
모든 필드 완전 일치: id, type, name, x/y, targetX/Y, isMoving, speedBoost, cargo, upgrades, morale

### Crew (100% — 7/7 필드)
navigation 30~100, trading 30~100, stamina 30~100, hireCost 500~2000 — 설계 범위와 정확히 일치

### Prediction (100% — 12/12 필드)
id, infoId, tier, resource, targetPort, targetPortName, direction, accuracy, mag, applied, hit, boughtAt — 전부 일치

### ShipType (100% — 7/7 필드)
name, icon, desc, baseSpeed, baseCapacity, maxCrew, cost — 전부 일치

### PORT_INFO (100%)
4종 상품의 accuracy·magMin·magMax·repeat 값 완전 일치:
- 항구 소문: accuracy 0.45, mag 15~45, repeat true ✅
- 상인 귀띔: accuracy 0.55, mag 25~65, repeat true ✅
- 상업 분석 보고서: accuracy 0.78, mag 60~130, repeat false ✅
- 내부 정보: accuracy 0.92, mag 100~200, repeat false ✅

---

## 2. 핵심 로직 비교 (94%)

### calcStats / stats (86%)
| 항목 | 설계 | 구현 |
|------|------|------|
| 함수명 | `calcStats` | `stats` ⚠️ 이름 변경 |
| speed 공식 | `baseSpeed × (1 + (avgNav-50)/200 + upgrades.speed×0.15)` | 동일 + Math.max(0.0003) 하한 추가 ✅ |
| capacity | `baseCapacity + upgrades.cargo × 25` | 동일 ✅ |
| maxCrew | `min(12, type.maxCrew + upgrades.crew)` | 동일 ✅ |
| tradePct | `round((avgTrading-50)/2)` | 동일 ✅ |

### 이동 루프 (100%)
300ms interval, 도착 임계값 0.3, speedBoost 0.12 — 설계와 완전 일치

### 시세 갱신 (86%)
기본 ±30 변동, predictions 순회, accuracy 확률 적중, mag 적용 — 설계와 동일
추가: `Math.max(20, ...)` 가격 하한 ⚠️ (설계에 명시 없음, 합리적 추가)

### makePrediction (100%)
자원 랜덤, 항구 랜덤, 방향 50/50, mag 범위 설계와 동일

### 항구 제한 Guard (100%)
승무원(탭), 업그레이드(탭), 정보구매(조건부 렌더), 배 구매(함수 내 guard) — 전부 구현

---

## 3. UI 레이아웃 비교 (100%)

설계 섹션 4의 모든 컴포넌트 구현 확인:
- ✅ 헤더 (금/보석)
- ✅ 지도 (pan/zoom, 항구·배 렌더, 경로선)
- ✅ 우측 패널 (함대 목록 + 배 상세 4탭)
- ✅ 정보 구매 패널 (atPort 시)
- ✅ 보유 예측 현황
- ✅ 로그 (하단)

지도 인터랙션 7종 모두 구현:
마우스 휠 줌, 드래그 pan, 터치 핀치, 터치 드래그, 배 클릭 선택, 항구 클릭 항해, 빈 곳 클릭 취소

---

## 4. 항구 데이터 (100% — 15/15)

15개 항구 전체 이름·좌표·판매 배 완전 일치.

---

## 5. 함선 스펙 (100% — 8종 × 4필드 = 32/32)

8종 함선의 baseSpeed, baseCapacity, maxCrew, cost 전부 일치.

---

## 6. 성공 기준 (90% — 4.5/5)

| 기준 | 결과 |
|------|------|
| gs 단일 객체 + calcStats 파생 | ✅ |
| 예측 시스템 정확히 반영 | ✅ |
| atPort 항구 제한 | ✅ |
| 지도 줌 0.5~6x, 바다 배경 유지 | ✅ |
| 헬퍼 함수 호이스팅 | ⚠️ `addLog`가 setInterval 클로저 내부에서 stale closure 가능성 (실제 동작에는 문제없음 — React functional updater 사용) |

---

## 갭 목록

### 설계 대비 구현 추가 (코드 변경 불필요)

| # | 항목 | 구현 위치 | 비고 |
|---|------|---------|------|
| 1 | Port `country` 이모지 필드 | L97-112 | 시각적 개선 |
| 2 | `RESOURCES` 상수 (10종 자원) | L113-117 | 설계에 암묵적으로 포함 |
| 3 | 가격 하한 `Math.max(20, ...)` | L282, L291 | 안정성 강화 |
| 4 | 속도 하한 `Math.max(0.0003, ...)` | L221 | 안정성 강화 |
| 5 | 일시정지/재개 버튼 | L465 | UX 추가 |
| 6 | 승무원 새로고침/해고 | L369-378 | 기능 추가 |

### 문서 업데이트 권장 (코드 변경 불필요)

| # | 항목 |
|---|------|
| 1 | 설계의 `calcStats` → 구현의 `stats`로 이름 통일 |
| 2 | RESOURCES 상수 설계 문서에 추가 |
| 3 | 항구 `country` 필드 설계 문서에 추가 |
| 4 | 가격/속도 하한값 설계 문서에 명시 |

---

## 결론

**Match Rate 97% — 코드 수정 필요 없음. 설계 문서 minor 업데이트 권장.**

구현이 설계를 충실히 따르며, 추가된 항목들은 모두 설계를 해치지 않는 합리적 개선입니다.
