# Pioneer — NAN 2026 AI 활용 기술 문서

**제출일:** 2026-08-03 | **버전:** v1.7.0

---

## 핵심 요약

Pioneer는 AI를 두 축으로 활용했습니다.

1. **게임 내 생성형 경제 AI** — 알고리즘이 매 3분·1시간마다 시장을 새로 만들어 어떤 플레이어도 "최적 루트"를 암기할 수 없게 합니다.
2. **개발 전 과정 AI 보조** — 기획, 구현, 테스트, 비주얼, 문서화 다섯 단계 모두에 AI 도구를 활용했습니다.

---

## 1. 게임 내 AI: 동적 시장 생성 엔진

`src/marketPrices.js`가 Pioneer 경제의 핵심 AI입니다.

### 세 레이어 구조

```
소형 드리프트 (3분 주기)
  └ 모든 항구·상품에 독립적 가우시안 노이즈 적용 (±2.5%)

플레이어 충격 (실시간)
  └ 매입/매도 수량에 비례한 즉각 가격 조정 (최대 ±18% 캡)

대형 시장 이벤트 (1시간 주기)
  └ 무작위 상품·항구 조합에 충격파 생성 (16~38%, 2~4개 항구 동시)
```

세 레이어가 독립 주기로 간섭하면 사람이 설계할 수 없는 복잡한 패턴이 자연적으로 생성됩니다. 동일한 플레이가 두 번 반복되지 않습니다.

### 행동 반응형 시장

플레이어가 한 항구에서 대량 매도를 반복하면 그 항구의 가격이 하락합니다.
시장이 플레이어의 행동을 "기억"하고 반응하는 구조입니다.

```js
// 매도 수량이 클수록, 해당 자원의 가격이 더 크게 내려간다
export const applyPlayerTradeImpact = (prices, portKey, resource, quantity, side) => {
  const direction = side === 'sell' ? -1 : 1;
  const impactRate = Math.max(-PLAYER_IMPACT_CAP,
    Math.min(PLAYER_IMPACT_CAP, quantity * PLAYER_IMPACT_RATE)) * direction;
  // ...
};
```

### 시장 메모리

`appendPriceHistorySnapshot`이 최근 20턴 시세를 시계열로 보존합니다.
게임이 과거를 "기억"하고, 플레이어는 그 추세를 읽어 다음 이벤트를 예측합니다.

---

## 2. 개발 AI: 도구 및 활용 내역

### 주요 도구

| 도구 | 활용 영역 |
|------|---------|
| **Claude Code (Anthropic)** | 기획 브레인스토밍, React/JSX 코드 작성, 테스트 케이스 설계, 리팩터링, 문서화 |
| **ChatGPT / DALL-E 3 (OpenAI)** | 게임플레이 예시 이미지, UI 프레임, 지도 텍스처, 아이콘 생성 |

### 단계별 상세 활용

#### 기획
- 핵심 루프 설계: "짧은 세션에서 반복 판단이 의미를 갖는 항해 무역 구조"를 AI와 반복 정제
- 레퍼런스 분석: Port Royale 4(8단계), Patrician IV(5단계), Cultist Simulator(1단계)의 의사결정 흐름을 AI와 분석해 Pioneer는 3단계로 압축
- MVP 가설 4개를 AI 브레인스토밍으로 구체화 (핵심 루프 / 힌트 표시 / 선박 성장 / 이벤트 알림)

#### 구현
- `marketPrices.js` 파라미터 조정: 드리프트 강도·플레이어 충격 캡·이벤트 진폭을 AI와 시뮬레이션하며 "재미있는 불확실성" 구간 도출
- React 아키텍처: 2,600줄 규모 단일 컴포넌트에서 시장 로직 분리 리팩터링 보조
- 테스트 케이스 초안: 수익 높음·위험 낮음 / 수익 높음·위험 높음 / 수익 없음(차단) 3가지 경계 케이스 설계

#### 비주얼
- 항구별 테마 프롬프트 예시:
  - 런던: `"misty harbor dawn, oil painting, 1700s, merchant vessels, foggy atmosphere"`
  - 이스탄불: `"golden bosphorus at sunset, ottoman harbor, mosaic architecture, trade ships"`
- 생성 후 실제 게임 HUD와 겹침 여부를 수동 검증, 레이어 배치 조정
- 도구: ChatGPT (DALL-E 3), 이후 밝기·대비 후처리 적용

#### 검증
- `npm test` 25/25 통과, `npm run build` 프로덕션 빌드 검증 절차를 AI와 함께 구성
- 시각적 QA 체크리스트 (로딩·빈 상태·에러·100개+ 항목·긴 한글 텍스트) 항목화

#### 문서화
- 기획서·업데이트 내역서·NAN 제출 PDF 구조 및 요약 작성에 Claude 보조

### AI 사용 원칙

AI 산출물은 모두 로컬 테스트(`npm test`) → 빌드(`npm run build`) → 브라우저 수동 확인을 거쳐 채택했습니다. 판단·설계·최종 검증의 주체는 개발자입니다.

---

## 3. 외부 에셋 및 오픈소스 출처

| 구분 | 항목 | 라이선스 | 비고 |
|------|------|---------|------|
| 런타임 | React 18.2.x, React DOM | MIT | package.json 기준 |
| 빌드 | Vite, @vitejs/plugin-react | MIT | |
| 스타일 | Tailwind CSS, PostCSS, Autoprefixer | MIT | |
| 기타 의존성 | lockfile 하위 의존성 | MIT 외 Apache-2.0, BSD-3-Clause, ISC | 별첨 라이선스 목록 참조 |
| 게임 이미지 | src/assets PNG, docs 플레이 예시 | 자체 제작 / AI 생성 | DALL-E 3 생성 후 편집 |
| 상표/IP | Pioneer 고유 명칭·세계관 | 독립 창작물 | 타 게임 IP 미사용 |

---

## 4. 제출 유의사항

- 출품작은 개발자의 독립 창작물이며 타인의 권리를 침해하지 않습니다.
- 사용한 AI 도구와 활용 내역을 본 문서에 모두 기재했습니다.
- GitHub, YouTube 등 제출 링크는 심사 종료 시점까지 접근 가능하게 유지합니다.
- 접수 후 제출 내용을 변경할 수 없으므로 링크·빌드·문서 버전을 접수 직전에 재확인합니다.
