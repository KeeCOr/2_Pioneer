# Pioneer UI 및 리소스 목록

## 이번 적용 범위

- 통화 아이콘: 금화, 보석을 별도 SVG로 제작해 HUD 통화 배지에 적용.
- 거래 UI 아이콘: 거래소, 화물 상자, 나침반, 닻, 연료통, 수리 망치를 제작해 주요 버튼과 상태 표시에 적용.
- 자원 아이콘: 기존 `src/assets/icons/resources` SVG 10종을 거래소 목록, 상세 시세, 화물 인벤토리에 연결.
- 선박 아이콘: 기존 `src/assets/icons/ships` SVG 11종을 지도 위 선박, 함대 목록, 선박 상세, 구매 목록에 연결.

## 신규 제작 리소스

| 파일 | 용도 |
| --- | --- |
| `src/assets/icons/ui/gold-coin.svg` | 금화 통화 배지 |
| `src/assets/icons/ui/gem-blue.svg` | 보석 통화 배지 |
| `src/assets/icons/ui/cargo-crate.svg` | 화물/인벤토리 상태 |
| `src/assets/icons/ui/market-stall.svg` | 거래소 버튼 및 시장 헤더 |
| `src/assets/icons/ui/compass.svg` | 목적지 선택/항해 명령 |
| `src/assets/icons/ui/anchor.svg` | 정박/선박 상태 |
| `src/assets/icons/ui/fuel-barrel.svg` | 연료 보충 |
| `src/assets/icons/ui/repair-hammer.svg` | 선체 수리 |

## 추가 제작 후보

- 항구별 실루엣: 유럽 성벽항, 지중해 돔 항구, 아라비아 항구, 남아시아 항구, 동아시아 누각항, 아메리카 항구.
- 튜토리얼 컷인: 배 선택, 목적지 선택, 거래소 진입, 판매 완료를 안내하는 4장.
- 항해 이벤트 배너: 폭풍, 표류물, 해적, 보물, 해류, 포획 이벤트를 카드형 일러스트로 확장.
- 배 업그레이드 아이콘: 돛, 화물칸, 선원숙소를 현재 텍스트 중심 버튼에서 전용 아이콘으로 분리.
