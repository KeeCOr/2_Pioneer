# Pioneer UI 및 리소스 목록

## 이번 적용 범위

- 통화 아이콘: 금화, 보석을 별도 PNG로 제작해 HUD 통화 배지에 적용.
- 거래 UI 아이콘: 거래소, 화물 상자, 나침반, 닻, 연료통, 수리 망치를 제작해 주요 버튼과 상태 표시에 적용.
- 버튼/프레임 리소스: 패널, 모달, 금색 버튼, 해양 버튼, 인벤토리 슬롯 PNG를 제작해 공통 카드와 주요 거래 UI 표면에 적용.
- 지도 리소스: 실제 대륙 실루엣에 가까운 투명 PNG 텍스처를 제작해 해도 배경 레이어에 적용.
- 자원 아이콘: 기존 `src/assets/icons/resources` PNG 10종을 거래소 목록, 상세 시세, 화물 인벤토리에 연결.
- 선박 아이콘: 기존 `src/assets/icons/ships` PNG 11종을 지도 위 선박, 함대 목록, 선박 상세, 구매 목록에 연결.

## 신규 제작 리소스

| 파일 | 용도 |
| --- | --- |
| `src/assets/icons/ui/gold-coin.png` | 금화 통화 배지 |
| `src/assets/icons/ui/gem-blue.png` | 보석 통화 배지 |
| `src/assets/icons/ui/cargo-crate.png` | 화물/인벤토리 상태 |
| `src/assets/icons/ui/market-stall.png` | 거래소 버튼 및 시장 헤더 |
| `src/assets/icons/ui/compass.png` | 목적지 선택/항해 명령 |
| `src/assets/icons/ui/anchor.png` | 정박/선박 상태 |
| `src/assets/icons/ui/fuel-barrel.png` | 연료 보충 |
| `src/assets/icons/ui/repair-hammer.png` | 선체 수리 |
| `src/assets/frames/panel-nautical.png` | 공통 카드/패널 프레임 |
| `src/assets/frames/modal-nautical.png` | 거래소·시세 팝업 프레임 |
| `src/assets/frames/button-gold.png` | 금색 주요 버튼 표면 |
| `src/assets/frames/button-ocean.png` | 해양색 보조/판매 버튼 표면 |
| `src/assets/frames/inventory-slot.png` | 화물 인벤토리 슬롯 |
| `src/assets/map/world-landmasses.png` | 실제 지형 느낌의 세계 대륙 지도 텍스처 |

## 추가 제작 후보

- 항구별 실루엣: 유럽 성벽항, 지중해 돔 항구, 아라비아 항구, 남아시아 항구, 동아시아 누각항, 아메리카 항구.
- 튜토리얼 컷인: 배 선택, 목적지 선택, 거래소 진입, 판매 완료를 안내하는 4장.
- 항해 이벤트 배너: 폭풍, 표류물, 해적, 보물, 해류, 포획 이벤트를 카드형 일러스트로 확장.
- 배 업그레이드 아이콘: 돛, 화물칸, 선원숙소를 현재 텍스트 중심 버튼에서 전용 아이콘으로 분리.
