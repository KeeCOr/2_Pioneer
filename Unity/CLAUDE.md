# Pioneer Unity — 작업 규칙

## 프로젝트 정보
- 엔진: Unity 6 LTS (6000.0.60f1)
- 언어: C# 9
- UI: UGUI (Canvas/RawImage/Button/TextMeshPro)
- 저장: JsonUtility → persistentDataPath/pioneer_save.json

## 네임스페이스
- `Pioneer.Core` — 데이터 클래스, GameManager, SaveSystem
- `Pioneer.Systems` — MarketSystem, NavigationSystem, WeatherSystem, CrewSystem, TaxSystem
- `Pioneer.Map` — MapController, PortMarker, ShipMarker, MapSpawner
- `Pioneer.UI` — HUDController, PortPanelController, FleetPanelController

## 좌표계
- 항구 좌표: % 단위 (0~100)
- MapController.GetPortAnchoredPos(pctX, pctY) → UI 앵커드포지션
- Y축: 아래가 양수 (UI 좌표 기준 Y 반전)

## 빌드
Unity 에디터에서 File > Build Settings > Build
출력: 추후 설정

## 테스트
Unity 에디터 > Window > General > Test Runner > EditMode > Run All

## Phase 이력
- Phase 1 (2026-08-11): 기반+데이터+시스템+세계지도 ✅
- Phase 2: 선박 이동 + 함대 패널 (예정)
- Phase 3: 거래 시스템 + 항구 패널 UI (예정)
- Phase 4: 날씨·선원·세금·데모·BGM·타이틀 (예정)
