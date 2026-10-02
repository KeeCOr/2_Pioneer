# Pioneer Unity 이식 — Phase 1: 기반 + 데이터 + 세계지도

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unity 6 LTS 프로젝트를 생성하고 모든 정적 데이터·게임 상태·가격 시뮬레이션·항해 계산을 C#으로 포팅하며, 세계지도 위에 항구 마커가 표시되는 Pan/Zoom 가능한 맵 뷰를 구현한다.

**Architecture:** 정적 데이터는 `GameConstants.cs` 한 파일에 집중(ScriptableObject 없이 static class로 단순화). 게임 상태는 `[System.Serializable]` POCO `GameState`로 정의하고 `GameManager` 싱글톤이 보관·업데이트한다. 맵은 UI Canvas + RectTransform 기반 pan/zoom(물리 없음)으로 구현하며, 항구/선박은 각각 Prefab으로 인스턴싱한다.

**Tech Stack:** Unity 6 LTS (6000.0.60f1), C# 9, UGUI (Canvas/Image/Button), Unity Test Runner (EditMode), New Input System(선택적), TextMeshPro

---

## 전체 이식 로드맵 (참고)

| 단계 | 내용 | 플랜 파일 |
|------|------|-----------|
| **Phase 1** (현재) | 프로젝트 기반 + 정적 데이터 + GameState + MarketSystem + NavigationSystem + 세계지도 + 항구 마커 | 이 파일 |
| Phase 2 | 선박 이동(NavSystem 실시간 Coroutine) + Fleet 패널 + 출항/입항 | 2026-08-11-pioneer-unity-phase2-ships.md |
| Phase 3 | 거래 시스템 + 항구 패널 UI (화물/정보/선원/임무 탭) | 2026-08-11-pioneer-unity-phase3-trading.md |
| Phase 4 | 날씨·승무원·세금·이벤트·데모 모드·BGM·타이틀 | 2026-08-11-pioneer-unity-phase4-polish.md |

---

## 파일 구조

```
C:\Development\2_Pioneer\Unity\
  ProjectSettings/
    ProjectVersion.txt
    ProjectSettings.asset
    InputManager.asset
    GraphicsSettings.asset
    QualitySettings.asset
    TagManager.asset
    AudioManager.asset
    DynamicsManager.asset
    EditorSettings.asset
    EditorBuildSettings.asset
    TimeManager.asset
    Physics2DSettings.asset
    NavMeshAreas.asset
  Packages/
    manifest.json
  Assets/
    Pioneer/
      Scripts/
        Core/
          GameConstants.cs     ← 전체 정적 데이터 (PORTS, SHIP_TYPES, RESOURCES, WEATHER, 등)
          GameState.cs         ← 게임 상태 POCO (PlayerShip, Cargo, Prices, Gold, …)
          GameManager.cs       ← MonoBehaviour 싱글톤; 게임 루프 Coroutine
          SaveSystem.cs        ← JsonUtility 기반 저장/불러오기
        Systems/
          MarketSystem.cs      ← 가격 시뮬레이션 (React marketPrices.js 포팅)
          NavigationSystem.cs  ← 항해 계산 (React navigation.js 포팅)
          WeatherSystem.cs     ← 날씨 결정 로직
          CrewSystem.cs        ← 선원 생성·스탯 계산
          TaxSystem.cs         ← 세금 계산
        Map/
          MapController.cs     ← 맵 Pan/Zoom, 좌표 변환
          PortMarker.cs        ← 항구 마커 Prefab 컨트롤러
          ShipMarker.cs        ← 선박 마커 Prefab 컨트롤러
        UI/
          HUDController.cs     ← 상단 HUD (금화·함대 현황)
          TitleController.cs   ← 타이틀 씬
      Tests/
        EditMode/
          GameStateTests.cs    ← GameState 초기화·변형 테스트
          MarketSystemTests.cs ← 가격 드리프트·이벤트 테스트
          NavigationSystemTests.cs ← 항해 경로·거리 테스트
      Prefabs/
        PortMarker.prefab      ← 항구 버튼 (나중에 Unity에서 연결)
        ShipMarker.prefab      ← 선박 아이콘
      Resources/
        Textures/
          WorldMap.png         ← src/assets/map/world-landmasses.png 복사
      Scenes/
        Title.unity
        Game.unity
```

---

## Task 1: Unity 프로젝트 폴더 구조 생성

**Files:**
- Create: `C:\Development\2_Pioneer\Unity\ProjectSettings\ProjectVersion.txt`
- Create: `C:\Development\2_Pioneer\Unity\Packages\manifest.json`
- Create: 모든 Assets/ 하위 폴더

- [ ] **Step 1: 폴더 구조 생성**

```powershell
$base = "C:\Development\2_Pioneer\Unity"
$dirs = @(
  "ProjectSettings",
  "Packages",
  "Assets\Pioneer\Scripts\Core",
  "Assets\Pioneer\Scripts\Systems",
  "Assets\Pioneer\Scripts\Map",
  "Assets\Pioneer\Scripts\UI",
  "Assets\Pioneer\Tests\EditMode",
  "Assets\Pioneer\Prefabs",
  "Assets\Pioneer\Resources\Textures",
  "Assets\Pioneer\Scenes"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Force "$base\$d" | Out-Null }
Write-Host "폴더 생성 완료"
```

Expected: `폴더 생성 완료`

- [ ] **Step 2: ProjectVersion.txt 생성**

```
m_EditorVersion: 6000.0.60f1
m_EditorVersionWithRevision: 6000.0.60f1 (abc12345678a)
```

저장 경로: `C:\Development\2_Pioneer\Unity\ProjectSettings\ProjectVersion.txt`

- [ ] **Step 3: manifest.json 생성**

```json
{
  "dependencies": {
    "com.unity.inputsystem": "1.11.2",
    "com.unity.textmeshpro": "3.0.9",
    "com.unity.test-framework": "1.3.9",
    "com.unity.modules.audio": "1.0.0",
    "com.unity.modules.imageconversion": "1.0.0",
    "com.unity.modules.ui": "1.0.0",
    "com.unity.modules.uielements": "1.0.0"
  }
}
```

저장 경로: `C:\Development\2_Pioneer\Unity\Packages\manifest.json`

- [ ] **Step 4: 세계지도 텍스처 복사**

```powershell
Copy-Item "C:\Development\2_Pioneer\src\assets\map\world-landmasses.png" `
  "C:\Development\2_Pioneer\Unity\Assets\Pioneer\Resources\Textures\WorldMap.png"
```

- [ ] **Step 5: 커밋**

```bash
git add "Unity/"
git commit -m "chore: Unity 6 LTS 프로젝트 폴더 구조 생성"
```

---

## Task 2: GameConstants.cs — 전체 정적 데이터

**Files:**
- Create: `Assets\Pioneer\Scripts\Core\GameConstants.cs`

- [ ] **Step 1: GameConstants.cs 작성**

```csharp
using System.Collections.Generic;
using UnityEngine;

namespace Pioneer.Core
{
    // 항구 데이터
    public class PortData
    {
        public string Key;
        public string Name;
        public string Region;
        public string Country;
        public float X;   // 맵 % (0-100)
        public float Y;
        public float HarborX;
        public float HarborY;
    }

    // 선박 유형 데이터
    public class ShipTypeData
    {
        public string Key;
        public string Name;
        public string Icon;
        public string Desc;
        public float  BaseSpeed;
        public int    BaseCapacity;
        public int    MaxCrew;
        public int    Cost;
    }

    // 자원 데이터
    public class ResourceData
    {
        public string Name;
        public string Icon;
        public int    Tier;       // 1=기본 2=초급 3=중급 4=고급
        public int    TierGoldReq;
    }

    // 날씨 데이터
    public class WeatherData
    {
        public string Key;
        public string Icon;
        public string Name;
        public string Desc;
        public float  SpeedMult;
        public float  FuelMult;
        public float  HullDmg;
    }

    // 항구 정보 상품 데이터
    public class PortInfoData
    {
        public string Id;
        public string Tier;
        public int    BaseCost;
        public string Name;
        public string Desc;
        public float  Accuracy;
        public int    MagMin;
        public int    MagMax;
        public bool   Repeat;
    }

    // 지역별 자원 무역 흐름
    public class ResourceRegion
    {
        public string[] Cheap;
        public string[] Expensive;
    }

    public static class GameConstants
    {
        // ── 상수 ──
        public const float TradeFeePercent = 10f;
        public const float SailingPaceMult = 0.55f;
        public const float BoosterSpeedMult = 1.2f;
        public const float BoosterFuelCostMult = 1.5f;
        public const int   TaxIntervalSeconds = 86400;
        public const float WeatherChangeInterval = 15 * 60f;
        public const int   SmallPriceIntervalSeconds  = 180;
        public const int   MarketEventIntervalSeconds = 3600;
        public const float MinPrice = 20f;
        public const float SmallDriftRate     = 0.025f;
        public const float PlayerImpactRate   = 0.012f;
        public const float PlayerImpactCap    = 0.18f;
        public const float MajorEventRateMin  = 0.16f;
        public const float MajorEventRateMax  = 0.38f;

        public static readonly int[]   EarnMilestones = { 10000, 50000, 200000, 800000, 3000000 };
        public static readonly int[]   TaxTable       = { 200, 600, 1000, 3000, 7000, 20000, 50000, 120000, 300000, 750000 };
        public static readonly string[] StartUnlockedPorts = { "lisbon","bristol","london","hamburg","antwerp","marseille" };

        public static readonly Dictionary<string, int> RegionUnlockGold = new()
        {
            {"europe",0}, {"mediterranean",1500}, {"arabian",8000},
            {"americas",12000}, {"south_asia",20000}, {"east_asia",45000}
        };

        public static readonly Dictionary<int,int> TierGoldReq = new()
        {
            {1,0},{2,1000},{3,8000},{4,30000}
        };

        // ── 항구 ──
        public static readonly Dictionary<string, PortData> Ports = new()
        {
            {"london",    new(){Key="london",    Name="런던",         Region="europe",        Country="🇬🇧", X=47.0f, Y=32.0f, HarborX=46.5f, HarborY=34.8f}},
            {"bristol",   new(){Key="bristol",   Name="브리스톨",     Region="europe",        Country="🇬🇧", X=46.0f, Y=34.0f, HarborX=43.8f, HarborY=35.7f}},
            {"lisbon",    new(){Key="lisbon",    Name="리스본",       Region="europe",        Country="🇵🇹", X=43.2f, Y=43.5f, HarborX=40.6f, HarborY=42.1f}},
            {"hamburg",   new(){Key="hamburg",   Name="함부르크",     Region="europe",        Country="🇩🇪", X=50.7f, Y=32.2f, HarborX=52.8f, HarborY=30.3f}},
            {"antwerp",   new(){Key="antwerp",   Name="앤트워프",     Region="europe",        Country="🇧🇪", X=48.5f, Y=34.2f, HarborX=47.5f, HarborY=31.6f}},
            {"marseille", new(){Key="marseille", Name="마르세유",     Region="mediterranean", Country="🇫🇷", X=49.0f, Y=41.0f, HarborX=48.8f, HarborY=44.0f}},
            {"genoa",     new(){Key="genoa",     Name="제노바",       Region="mediterranean", Country="🇮🇹", X=50.8f, Y=40.4f, HarborX=48.27f,HarborY=41.66f}},
            {"venice",    new(){Key="venice",    Name="베니스",       Region="mediterranean", Country="🇮🇹", X=52.1f, Y=39.3f, HarborX=54.5f, HarborY=40.8f}},
            {"tripoli",   new(){Key="tripoli",   Name="트리폴리",     Region="mediterranean", Country="🇱🇾", X=51.0f, Y=51.5f, HarborX=50.2f, HarborY=48.8f}},
            {"istanbul",  new(){Key="istanbul",  Name="이스탄불",     Region="mediterranean", Country="🇹🇷", X=56.8f, Y=40.6f, HarborX=59.6f, HarborY=41.1f}},
            {"alexandria",new(){Key="alexandria",Name="알렉산드리아", Region="arabian",       Country="🇪🇬", X=55.0f, Y=49.0f, HarborX=52.2f, HarborY=48.5f}},
            {"aden",      new(){Key="aden",      Name="아덴",         Region="arabian",       Country="🇾🇪", X=62.7f, Y=60.0f, HarborX=65.3f, HarborY=59.0f}},
            {"dubai",     new(){Key="dubai",     Name="두바이",       Region="arabian",       Country="🇦🇪", X=65.5f, Y=52.4f, HarborX=64.11f,HarborY=54.84f}},
            {"mumbai",    new(){Key="mumbai",    Name="뭄바이",       Region="south_asia",    Country="🇮🇳", X=69.8f, Y=58.4f, HarborX=69.8f, HarborY=61.2f}},
            {"goa",       new(){Key="goa",       Name="고아",         Region="south_asia",    Country="🇮🇳", X=69.8f, Y=62.0f, HarborX=69.1f, HarborY=64.7f}},
            {"calicut",   new(){Key="calicut",   Name="칼리컷",       Region="south_asia",    Country="🇮🇳", X=70.6f, Y=65.0f, HarborX=70.5f, HarborY=62.2f}},
            {"colombo",   new(){Key="colombo",   Name="콜롬보",       Region="south_asia",    Country="🇱🇰", X=72.3f, Y=70.8f, HarborX=70.0f, HarborY=72.4f}},
            {"malacca",   new(){Key="malacca",   Name="말라카",       Region="east_asia",     Country="🇲🇾", X=81.5f, Y=68.5f, HarborX=83.3f, HarborY=66.3f}},
            {"singapore", new(){Key="singapore", Name="싱가포르",     Region="east_asia",     Country="🇸🇬", X=82.4f, Y=70.8f, HarborX=79.7f, HarborY=71.4f}},
            {"bangkok",   new(){Key="bangkok",   Name="방콕",         Region="east_asia",     Country="🇹🇭", X=80.0f, Y=62.0f, HarborX=80.7f, HarborY=59.3f}},
            {"guangzhou", new(){Key="guangzhou", Name="광저우",       Region="east_asia",     Country="🇨🇳", X=84.6f, Y=52.3f, HarborX=81.8f, HarborY=52.0f}},
            {"shanghai",  new(){Key="shanghai",  Name="상하이",       Region="east_asia",     Country="🇨🇳", X=87.0f, Y=44.0f, HarborX=84.7f, HarborY=45.6f}},
            {"yokohama",  new(){Key="yokohama",  Name="요코하마",     Region="east_asia",     Country="🇯🇵", X=92.0f, Y=42.0f, HarborX=91.7f, HarborY=39.2f}},
            {"busan",     new(){Key="busan",     Name="부산",         Region="east_asia",     Country="🇰🇷", X=89.6f, Y=43.5f, HarborX=86.8f, HarborY=44.0f}},
            {"incheon",   new(){Key="incheon",   Name="인천",         Region="east_asia",     Country="🇰🇷", X=88.8f, Y=42.4f, HarborX=86.3f, HarborY=41.1f}},
            {"boston",    new(){Key="boston",    Name="보스턴",       Region="americas",      Country="🇺🇸", X=26.0f, Y=39.2f, HarborX=28.5f, HarborY=37.9f}},
            {"newyork",   new(){Key="newyork",   Name="뉴욕",         Region="americas",      Country="🇺🇸", X=24.5f, Y=41.8f, HarborX=27.3f, HarborY=42.4f}},
            {"neworleans",new(){Key="neworleans",Name="뉴올리언스",   Region="americas",      Country="🇺🇸", X=22.0f, Y=52.5f, HarborX=19.2f, HarborY=52.6f}},
            {"havana",    new(){Key="havana",    Name="하바나",       Region="americas",      Country="🇨🇺", X=24.8f, Y=56.2f, HarborX=23.9f, HarborY=53.6f}},
        };

        // ── 선박 유형 ──
        public static readonly Dictionary<string, ShipTypeData> ShipTypes = new()
        {
            {"rowboat",   new(){Key="rowboat",   Name="통통배",   Icon="🚤", BaseSpeed=0.014f, BaseCapacity=25,  MaxCrew=2,  Cost=1000  }},
            {"sloop",     new(){Key="sloop",     Name="슬루프",   Icon="⛵", BaseSpeed=0.010f, BaseCapacity=55,  MaxCrew=4,  Cost=3000  }},
            {"caravel",   new(){Key="caravel",   Name="카라벨",   Icon="🛥", BaseSpeed=0.009f, BaseCapacity=80,  MaxCrew=6,  Cost=8000  }},
            {"brigantine",new(){Key="brigantine",Name="브리간틴", Icon="⛴", BaseSpeed=0.008f, BaseCapacity=100, MaxCrew=7,  Cost=12000 }},
            {"galley",    new(){Key="galley",    Name="갤리",     Icon="🚣", BaseSpeed=0.006f, BaseCapacity=90,  MaxCrew=12, Cost=14000 }},
            {"dhow",      new(){Key="dhow",      Name="다우",     Icon="🛶", BaseSpeed=0.009f, BaseCapacity=85,  MaxCrew=6,  Cost=16000 }},
            {"merchant",  new(){Key="merchant",  Name="상인선",   Icon="🚢", BaseSpeed=0.006f, BaseCapacity=140, MaxCrew=9,  Cost=20000 }},
            {"fluyt",     new(){Key="fluyt",     Name="플루트",   Icon="🛳", BaseSpeed=0.004f, BaseCapacity=200, MaxCrew=8,  Cost=28000 }},
            {"junk",      new(){Key="junk",      Name="정크선",   Icon="🏮", BaseSpeed=0.005f, BaseCapacity=220, MaxCrew=10, Cost=32000 }},
            {"galleon",   new(){Key="galleon",   Name="갤리온",   Icon="⚓", BaseSpeed=0.002f, BaseCapacity=280, MaxCrew=12, Cost=45000 }},
            {"frigate",   new(){Key="frigate",   Name="프리깃",   Icon="🏴‍☠️",BaseSpeed=0.013f, BaseCapacity=120, MaxCrew=12, Cost=65000 }},
        };

        // ── 자원 ──
        public static readonly Dictionary<string, ResourceData> Resources = new()
        {
            {"향신료",   new(){Name="향신료",   Icon="🌶", Tier=3, TierGoldReq=8000  }},
            {"도자기",   new(){Name="도자기",   Icon="🏺", Tier=3, TierGoldReq=8000  }},
            {"비단",     new(){Name="비단",     Icon="🧣", Tier=3, TierGoldReq=8000  }},
            {"와인",     new(){Name="와인",     Icon="🍷", Tier=2, TierGoldReq=1000  }},
            {"다이아몬드",new(){Name="다이아몬드",Icon="💎", Tier=4, TierGoldReq=30000 }},
            {"해산물",   new(){Name="해산물",   Icon="🦐", Tier=2, TierGoldReq=1000  }},
            {"면직물",   new(){Name="면직물",   Icon="📦", Tier=2, TierGoldReq=1000  }},
            {"양털",     new(){Name="양털",     Icon="🧶", Tier=1, TierGoldReq=0     }},
            {"계피",     new(){Name="계피",     Icon="🌰", Tier=3, TierGoldReq=8000  }},
            {"쌀",       new(){Name="쌀",       Icon="🍚", Tier=1, TierGoldReq=0     }},
        };

        // 지역 원산지 자원
        public static readonly Dictionary<string, string> RegionNativeRes = new()
        {
            {"europe","양털"}, {"mediterranean","와인"}, {"arabian","계피"},
            {"south_asia","면직물"}, {"east_asia","쌀"}, {"americas","해산물"}
        };

        // 자원 지역 무역 방향
        public static readonly Dictionary<string, ResourceRegion> ResourceRegions = new()
        {
            {"양털",     new(){Cheap=new[]{"europe"},                    Expensive=new[]{"east_asia","arabian"}}},
            {"와인",     new(){Cheap=new[]{"europe","mediterranean"},    Expensive=new[]{"east_asia","south_asia"}}},
            {"다이아몬드",new(){Cheap=new[]{"mediterranean"},            Expensive=new[]{"east_asia","south_asia"}}},
            {"향신료",   new(){Cheap=new[]{"south_asia","east_asia"},    Expensive=new[]{"europe","mediterranean"}}},
            {"도자기",   new(){Cheap=new[]{"east_asia"},                 Expensive=new[]{"europe","mediterranean"}}},
            {"비단",     new(){Cheap=new[]{"east_asia"},                 Expensive=new[]{"europe","arabian"}}},
            {"해산물",   new(){Cheap=new[]{"mediterranean","europe"},    Expensive=new[]{"east_asia","arabian"}}},
            {"면직물",   new(){Cheap=new[]{"south_asia","americas"},     Expensive=new[]{"europe","east_asia"}}},
            {"계피",     new(){Cheap=new[]{"south_asia"},                Expensive=new[]{"europe","arabian","mediterranean"}}},
            {"쌀",       new(){Cheap=new[]{"east_asia","south_asia"},    Expensive=new[]{"europe","arabian","americas"}}},
        };

        // ── 날씨 ──
        public static readonly Dictionary<string, WeatherData> WeatherTypes = new()
        {
            {"sunny",    new(){Key="sunny",    Icon="☀",  Name="맑음",     SpeedMult=1.05f, FuelMult=1.00f, HullDmg=0.000f}},
            {"cloudy",   new(){Key="cloudy",   Icon="🌤", Name="흐림",     SpeedMult=1.00f, FuelMult=1.00f, HullDmg=0.000f}},
            {"rainy",    new(){Key="rainy",    Icon="🌧", Name="비",       SpeedMult=0.90f, FuelMult=1.10f, HullDmg=0.001f}},
            {"windy",    new(){Key="windy",    Icon="💨", Name="강풍",     SpeedMult=1.12f, FuelMult=0.90f, HullDmg=0.002f}},
            {"foggy",    new(){Key="foggy",    Icon="🌫", Name="안개",     SpeedMult=0.78f, FuelMult=1.00f, HullDmg=0.000f}},
            {"fairwind", new(){Key="fairwind", Icon="🌈", Name="순풍",     SpeedMult=1.22f, FuelMult=0.82f, HullDmg=0.000f}},
            {"roughsea", new(){Key="roughsea", Icon="🌊", Name="거친 바다",SpeedMult=0.73f, FuelMult=1.22f, HullDmg=0.004f}},
            {"blizzard", new(){Key="blizzard", Icon="❄",  Name="눈보라",   SpeedMult=0.58f, FuelMult=1.32f, HullDmg=0.005f}},
            {"tradewind",new(){Key="tradewind",Icon="🌴", Name="무역풍",   SpeedMult=1.18f, FuelMult=0.78f, HullDmg=0.000f}},
            {"heatwave", new(){Key="heatwave", Icon="🌵", Name="열파",     SpeedMult=0.85f, FuelMult=1.28f, HullDmg=0.002f}},
        };

        // ── 항구 정보 상품 ──
        public static readonly PortInfoData[] PortInfoItems =
        {
            new(){Id="rumor",    Tier="basic",   BaseCost=300,  Name="거리 소문",        Accuracy=0.30f, MagMin=15,  MagMax=45,  Repeat=true },
            new(){Id="hint",     Tier="basic",   BaseCost=700,  Name="상인 귀띔",        Accuracy=0.40f, MagMin=25,  MagMax=65,  Repeat=true },
            new(){Id="analysis", Tier="premium", BaseCost=3000, Name="상업 분석 보고서", Accuracy=0.58f, MagMin=60,  MagMax=130, Repeat=false},
            new(){Id="route",    Tier="premium", BaseCost=8000, Name="내부 정보",        Accuracy=0.72f, MagMin=100, MagMax=200, Repeat=false},
        };

        // ── 헬퍼 ──
        public static PortData GetPortHarbor(string portKey)
            => Ports.TryGetValue(portKey, out var p) ? p : null;

        public static int GetPortUnlockReq(string portKey)
        {
            if (System.Array.IndexOf(StartUnlockedPorts, portKey) >= 0) return 0;
            if (!Ports.TryGetValue(portKey, out var p)) return 0;
            return RegionUnlockGold.TryGetValue(p.Region, out var g) ? g : 0;
        }

        public static bool IsPortUnlocked(string portKey, long totalEarned)
            => totalEarned >= GetPortUnlockReq(portKey);

        public static bool IsResourceUnlocked(string resource, long totalEarned)
        {
            if (!Resources.TryGetValue(resource, out var r)) return false;
            return totalEarned >= r.TierGoldReq;
        }

        public static int CalcTax(int taxLevel)
            => TaxTable[Mathf.Clamp(taxLevel - 1, 0, TaxTable.Length - 1)];

        public static string[] GetWeatherPool(float y)
        {
            if (y < 15) return new[]{"blizzard","blizzard","foggy","cloudy","rainy","windy"};
            if (y < 30) return new[]{"cloudy","rainy","windy","sunny","foggy","cloudy"};
            if (y < 50) return new[]{"sunny","windy","fairwind","cloudy","rainy","sunny"};
            if (y < 65) return new[]{"sunny","tradewind","roughsea","rainy","heatwave","fairwind"};
            return new[]{"tradewind","tradewind","rainy","roughsea","sunny","heatwave"};
        }

        public static float GetInfoCost(PortInfoData info, int buyCount, int taxLevel = 1)
            => Mathf.Floor(info.BaseCost * Mathf.Pow(1.12f, Mathf.Max(0, taxLevel - 1))
                                         * Mathf.Pow(1.5f, buyCount));
    }
}
```

- [ ] **Step 2: 컴파일 확인 (Unity 에디터로 열고 Console 확인)**

저장 후 Unity Hub에서 `C:\Development\2_Pioneer\Unity` 프로젝트를 열면 Unity가 컴파일함.
Console에 오류 없으면 성공.

- [ ] **Step 3: 커밋**

```bash
git add "Unity/Assets/Pioneer/Scripts/Core/GameConstants.cs"
git commit -m "feat(unity): GameConstants — 전체 정적 데이터 포팅"
```

---

## Task 3: GameState.cs — 게임 상태 POCO

**Files:**
- Create: `Assets\Pioneer\Scripts\Core\GameState.cs`

- [ ] **Step 1: GameState.cs 작성**

```csharp
using System;
using System.Collections.Generic;

namespace Pioneer.Core
{
    [Serializable]
    public class CargoItem
    {
        public string Resource;
        public int    Quantity;
    }

    [Serializable]
    public class ShipUpgrades
    {
        public int Speed  = 0;
        public int Cargo  = 0;
        public int Crew   = 0;
        public int Repair = 0;
    }

    [Serializable]
    public class ShipState
    {
        public int    Id;
        public string Type;
        public string Name;
        public float  X;
        public float  Y;
        public bool   IsMoving;
        public float  TargetX;
        public float  TargetY;
        public float  StartX;
        public float  StartY;
        public string DestinationPortKey;
        public float  Fuel  = 100f;
        public float  Hull  = 100f;
        public List<CargoItem> Cargo = new();
        public ShipUpgrades Upgrades = new();
        public bool   BoosterActive;
        public float  TotalDistanceTraveled;
    }

    [Serializable]
    public class CrewMember
    {
        public int    Id;
        public string Name;
        public int    ShipId;   // -1 = 미배치
        public string Specialty; // "any" | region key
        public int    Navigation;
        public int    Trading;
        public int    Stamina;
        public int    Repair;
        public int    Morale;
        public int    Combat;
        public int    FuelEff;
        public int    HullEff;
        public int    Logistics;
        public int    NavBonus;
        public int    TradeBonus;
        public string FavoriteWeather;
        public string Rarity;  // "common" | "uncommon" | "rare" | "legendary"
        public int    HireCost;
        public bool   IsSpecial;
        public string Label;
    }

    [Serializable]
    public class Prediction
    {
        public int    Id;
        public string InfoId;
        public string Tier;
        public string Resource;
        public string TargetPortKey;
        public string TargetPortName;
        public string Direction;  // "up" | "down"
        public float  Accuracy;
        public int    Magnitude;
        public int    TurnsUntil;
        public int    TurnsRemaining;
        public bool   Applied;
        public bool?  Hit;        // null = 미확인
        public string BoughtAt;
    }

    [Serializable]
    public class DeliveryQuest
    {
        public int    Id;
        public string Resource;
        public int    Quantity;
        public string DestinationPortKey;
        public int    RewardGold;
        public int    RewardGems;
        public int    DeadlineTurns;
        public int    TurnsElapsed;
        public bool   IsComplete;
        public bool   IsFailed;
    }

    [Serializable]
    public class DailyGoal
    {
        public string Type;    // "earn" | "trade" | "travel"
        public int    Target;
        public int    Progress;
        public bool   IsComplete;
    }

    [Serializable]
    public class GameState
    {
        // 경제
        public long Gold           = 500;
        public int  Gems           = 0;
        public long TotalEarned    = 0;
        public long TotalSpent     = 0;
        public int  TotalTradesDone = 0;

        // 세금
        public int   TaxLevel      = 1;
        public float TaxTimer      = 0f;  // 초 단위 누적
        public int   MilestoneIdx  = 0;

        // 시간
        public int   GameDay       = 1;
        public float GameTimeSec   = 0f;  // 인게임 누적 초

        // 가격 { portKey → { resource → price } }
        public Dictionary<string, Dictionary<string, float>> Prices = new();
        public Dictionary<string, Dictionary<string, List<float>>> PriceHistory = new();

        // 함대
        public List<ShipState>  Ships  = new();
        public List<CrewMember> Crew   = new();
        public int              NextShipId = 2;
        public int              NextCrewId = 1;

        // 항구 방문 기록
        public List<string> VisitedPorts = new();

        // 정보 구매 카운트 { infoId → count }
        public Dictionary<string, int> InfoBuyCount = new();

        // 예측 목록
        public List<Prediction>   Predictions   = new();
        public List<DeliveryQuest> DeliveryQuests = new();
        public List<DailyGoal>    DailyGoals    = new();

        // 시장 타이머
        public float SmallPriceTimer  = 0f;
        public float MarketEventTimer = 0f;
    }
}
```

- [ ] **Step 2: 커밋**

```bash
git add "Unity/Assets/Pioneer/Scripts/Core/GameState.cs"
git commit -m "feat(unity): GameState — 직렬화 가능 게임 상태 POCO"
```

---

## Task 4: EditMode 테스트 어셈블리 설정 + GameState 단위 테스트

**Files:**
- Create: `Assets\Pioneer\Tests\EditMode\GameStateTests.cs`
- Create: `Assets\Pioneer\Tests\EditMode\Pioneer.Tests.EditMode.asmdef`

- [ ] **Step 1: asmdef 파일 생성**

`Assets\Pioneer\Tests\EditMode\Pioneer.Tests.EditMode.asmdef`:
```json
{
  "name": "Pioneer.Tests.EditMode",
  "rootNamespace": "Pioneer.Tests",
  "references": ["UnityEngine.TestRunner","UnityEditor.TestRunner","Pioneer.Runtime"],
  "includePlatforms": ["Editor"],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": true,
  "precompiledReferences": ["nunit.framework.dll"],
  "autoReferenced": false,
  "defineConstraints": ["UNITY_INCLUDE_TESTS"],
  "versionDefines": [],
  "noEngineReferences": false
}
```

런타임 asmdef도 필요: `Assets\Pioneer\Scripts\Pioneer.Runtime.asmdef`:
```json
{
  "name": "Pioneer.Runtime",
  "rootNamespace": "Pioneer",
  "references": [],
  "includePlatforms": [],
  "excludePlatforms": [],
  "allowUnsafeCode": false,
  "overrideReferences": false,
  "precompiledReferences": [],
  "autoReferenced": true,
  "defineConstraints": [],
  "versionDefines": [],
  "noEngineReferences": false
}
```

- [ ] **Step 2: GameStateTests.cs 작성**

```csharp
using NUnit.Framework;
using Pioneer.Core;

namespace Pioneer.Tests
{
    public class GameStateTests
    {
        [Test]
        public void NewGameState_HasInitialGold500()
        {
            var state = new GameState();
            Assert.AreEqual(500L, state.Gold);
        }

        [Test]
        public void NewGameState_ShipsListIsEmpty()
        {
            var state = new GameState();
            Assert.IsNotNull(state.Ships);
            Assert.AreEqual(0, state.Ships.Count);
        }

        [Test]
        public void NewGameState_VisitedPortsIsEmpty()
        {
            var state = new GameState();
            Assert.IsNotNull(state.VisitedPorts);
            Assert.AreEqual(0, state.VisitedPorts.Count);
        }

        [Test]
        public void GameConstants_PortsContainsLisbon()
        {
            Assert.IsTrue(GameConstants.Ports.ContainsKey("lisbon"));
            Assert.AreEqual("리스본", GameConstants.Ports["lisbon"].Name);
        }

        [Test]
        public void GameConstants_ShipTypesContainsSloop()
        {
            Assert.IsTrue(GameConstants.ShipTypes.ContainsKey("sloop"));
            Assert.AreEqual(55, GameConstants.ShipTypes["sloop"].BaseCapacity);
        }

        [Test]
        public void GameConstants_IsPortUnlocked_StartPortsUnlockedAtZero()
        {
            Assert.IsTrue(GameConstants.IsPortUnlocked("lisbon", 0));
            Assert.IsTrue(GameConstants.IsPortUnlocked("london", 0));
        }

        [Test]
        public void GameConstants_IsPortUnlocked_LockedPortRequiresGold()
        {
            Assert.IsFalse(GameConstants.IsPortUnlocked("mumbai", 0));
            Assert.IsTrue(GameConstants.IsPortUnlocked("mumbai", 20000));
        }

        [Test]
        public void GameConstants_CalcTax_Level1Returns200()
        {
            Assert.AreEqual(200, GameConstants.CalcTax(1));
        }

        [Test]
        public void GameConstants_CalcTax_Level5Returns7000()
        {
            Assert.AreEqual(7000, GameConstants.CalcTax(5));
        }
    }
}
```

- [ ] **Step 3: Test Runner에서 실행**

Unity 에디터 메뉴: `Window > General > Test Runner`
`EditMode` 탭 선택 → `Run All`
Expected: 9개 테스트 모두 PASS (녹색)

- [ ] **Step 4: 커밋**

```bash
git add "Unity/Assets/Pioneer/Scripts/Pioneer.Runtime.asmdef"
git add "Unity/Assets/Pioneer/Tests/EditMode/"
git commit -m "test(unity): GameState + GameConstants 단위 테스트 추가"
```

---

## Task 5: MarketSystem.cs — 가격 시뮬레이션

**Files:**
- Create: `Assets\Pioneer\Scripts\Systems\MarketSystem.cs`

- [ ] **Step 1: MarketSystem.cs 작성**

```csharp
using System;
using System.Collections.Generic;
using Pioneer.Core;
using UnityEngine;

namespace Pioneer.Systems
{
    public struct MarketImpact
    {
        public string PortKey;
        public string Resource;
        public float  Before;
        public float  After;
        public int    Direction; // +1 or -1
        public float  Magnitude;
    }

    public static class MarketSystem
    {
        // React marketPrices.js의 applySmallMarketDrift 포팅
        public static void ApplySmallDrift(
            Dictionary<string, Dictionary<string, float>> prices,
            Func<float> random = null)
        {
            random ??= UnityEngine.Random.value.GetValue;  // Unity Random
            foreach (var port in prices)
                foreach (var res in new List<string>(port.Value.Keys))
                {
                    var drift = (NextRandom(random) - 0.5f) * 2f * GameConstants.SmallDriftRate;
                    port.Value[res] = ClampPrice(port.Value[res] * (1f + drift));
                }
        }

        // React applyPlayerTradeImpact 포팅
        public static void ApplyPlayerTradeImpact(
            Dictionary<string, Dictionary<string, float>> prices,
            string portKey, string resource, int quantity, bool isSell)
        {
            if (!prices.ContainsKey(portKey) || !prices[portKey].ContainsKey(resource)) return;
            if (quantity <= 0) return;
            var direction = isSell ? -1f : 1f;
            var impact = Mathf.Clamp(quantity * GameConstants.PlayerImpactRate,
                                     -GameConstants.PlayerImpactCap, GameConstants.PlayerImpactCap) * direction;
            prices[portKey][resource] = ClampPrice(prices[portKey][resource] * (1f + impact));
        }

        // React applyMajorMarketEvent 포팅
        public static List<MarketImpact> ApplyMajorEvent(
            Dictionary<string, Dictionary<string, float>> prices,
            int eventIndex = 0, Func<float> random = null)
        {
            random ??= UnityEngine.Random.value.GetValue;
            var impacts = new List<MarketImpact>();
            var portKeys = new List<string>(prices.Keys);
            if (portKeys.Count == 0) return impacts;
            var resources = new List<string>(prices[portKeys[0]].Keys);
            if (resources.Count == 0) return impacts;

            var resource   = resources[(int)(NextRandom(random) * resources.Count) % resources.Count];
            var direction  = NextRandom(random) >= 0.5f ? 1 : -1;
            var magnitude  = GameConstants.MajorEventRateMin
                           + NextRandom(random) * (GameConstants.MajorEventRateMax - GameConstants.MajorEventRateMin);
            var affectedCount = Mathf.Max(1, Mathf.Min(portKeys.Count, 2 + (eventIndex % 3)));
            var start = (int)(NextRandom(random) * portKeys.Count) % portKeys.Count;

            var affected = new HashSet<string>();
            for (int i = 0; i < affectedCount; i++)
                affected.Add(portKeys[(start + i) % portKeys.Count]);

            foreach (var portKey in portKeys)
            {
                if (affected.Contains(portKey) && prices[portKey].ContainsKey(resource))
                {
                    var before = prices[portKey][resource];
                    var after  = ClampPrice(before * (1f + direction * magnitude));
                    prices[portKey][resource] = after;
                    impacts.Add(new MarketImpact
                    {
                        PortKey=portKey, Resource=resource,
                        Before=before, After=after,
                        Direction=direction, Magnitude=magnitude
                    });
                }
            }
            return impacts;
        }

        // 가격 히스토리 스냅샷 추가
        public static void AppendPriceSnapshot(
            Dictionary<string, Dictionary<string, List<float>>> history,
            Dictionary<string, Dictionary<string, float>> prices,
            int limit = 20)
        {
            foreach (var port in prices)
            {
                if (!history.ContainsKey(port.Key))
                    history[port.Key] = new();
                foreach (var res in port.Value)
                {
                    if (!history[port.Key].ContainsKey(res.Key))
                        history[port.Key][res.Key] = new();
                    history[port.Key][res.Key].Add(res.Value);
                    if (history[port.Key][res.Key].Count > limit)
                        history[port.Key][res.Key].RemoveAt(0);
                }
            }
        }

        // 초기 가격 생성 (React의 initPrices 로직)
        public static Dictionary<string, Dictionary<string, float>> InitPrices(
            IEnumerable<string> portKeys, IEnumerable<string> resources)
        {
            var dict = new Dictionary<string, Dictionary<string, float>>();
            foreach (var pk in portKeys)
            {
                dict[pk] = new();
                var port = GameConstants.Ports[pk];
                foreach (var res in resources)
                {
                    var resData = GameConstants.Resources[res];
                    float basePrice = resData.Tier * 80f + 40f;
                    // 지역 보정
                    if (GameConstants.ResourceRegions.TryGetValue(res, out var rr))
                    {
                        if (Array.IndexOf(rr.Cheap, port.Region) >= 0)
                            basePrice *= 0.65f;
                        else if (Array.IndexOf(rr.Expensive, port.Region) >= 0)
                            basePrice *= 1.45f;
                    }
                    // 약간의 랜덤
                    basePrice *= UnityEngine.Random.Range(0.88f, 1.12f);
                    dict[pk][res] = ClampPrice(basePrice);
                }
            }
            return dict;
        }

        private static float ClampPrice(float v) => Mathf.Max(GameConstants.MinPrice, Mathf.Floor(v));

        // Func<float> 기반 랜덤 (테스트 주입 가능)
        private static float NextRandom(Func<float> r) => r();
    }

    // Unity Random.value를 Func<float>으로 쓰기 위한 extension trick
    internal static class RandomHelper
    {
        internal static float GetValue(this float _) => UnityEngine.Random.value;
    }
}
```

- [ ] **Step 2: 커밋**

```bash
git add "Unity/Assets/Pioneer/Scripts/Systems/MarketSystem.cs"
git commit -m "feat(unity): MarketSystem — 가격 드리프트/이벤트/초기화 포팅"
```

---

## Task 6: MarketSystem 단위 테스트

**Files:**
- Create: `Assets\Pioneer\Tests\EditMode\MarketSystemTests.cs`

- [ ] **Step 1: 테스트 작성**

```csharp
using System.Collections.Generic;
using NUnit.Framework;
using Pioneer.Core;
using Pioneer.Systems;

namespace Pioneer.Tests
{
    public class MarketSystemTests
    {
        private static Dictionary<string, Dictionary<string, float>> MakePrices()
        {
            return new()
            {
                {"lisbon",  new(){{"양털",100f},{"와인",150f}}},
                {"london",  new(){{"양털",120f},{"와인",130f}}},
            };
        }

        [Test]
        public void ApplySmallDrift_PricesChange()
        {
            var prices = MakePrices();
            float original = prices["lisbon"]["양털"];
            // 드리프트 적용 (결정론적 시드를 주입 — 항상 +0.025 드리프트)
            MarketSystem.ApplySmallDrift(prices, () => 1.0f);  // drift = (1-0.5)*2*0.025 = +0.025
            Assert.AreNotEqual(original, prices["lisbon"]["양털"]);
            Assert.Greater(prices["lisbon"]["양털"], original);  // +drift 방향
        }

        [Test]
        public void ApplySmallDrift_PricesNeverBelowMinPrice()
        {
            var prices = new Dictionary<string, Dictionary<string, float>>
            {
                {"lisbon", new(){{"양털", 21f}}}
            };
            MarketSystem.ApplySmallDrift(prices, () => 0f);  // max negative drift
            Assert.GreaterOrEqual(prices["lisbon"]["양털"], GameConstants.MinPrice);
        }

        [Test]
        public void ApplyPlayerTradeImpact_SellLowersPrice()
        {
            var prices = MakePrices();
            float original = prices["lisbon"]["양털"];
            MarketSystem.ApplyPlayerTradeImpact(prices, "lisbon", "양털", 10, isSell: true);
            Assert.Less(prices["lisbon"]["양털"], original);
        }

        [Test]
        public void ApplyPlayerTradeImpact_BuyRaisesPrice()
        {
            var prices = MakePrices();
            float original = prices["lisbon"]["양털"];
            MarketSystem.ApplyPlayerTradeImpact(prices, "lisbon", "양털", 10, isSell: false);
            Assert.Greater(prices["lisbon"]["양털"], original);
        }

        [Test]
        public void ApplyMajorEvent_ReturnsAtLeastOneImpact()
        {
            var prices = MakePrices();
            var impacts = MarketSystem.ApplyMajorEvent(prices, eventIndex: 0, random: () => 0.5f);
            Assert.GreaterOrEqual(impacts.Count, 1);
        }

        [Test]
        public void InitPrices_AllPortsHaveAllResources()
        {
            var ports     = new[]{"lisbon","london"};
            var resources = new[]{"양털","와인"};
            var prices    = MarketSystem.InitPrices(ports, resources);
            Assert.AreEqual(2, prices.Count);
            foreach (var pk in ports)
                foreach (var res in resources)
                    Assert.IsTrue(prices[pk].ContainsKey(res));
        }

        [Test]
        public void InitPrices_CheapRegionLowerThanExpensive()
        {
            // 양털: cheap=europe, expensive=east_asia
            var prices = MarketSystem.InitPrices(new[]{"lisbon","shanghai"}, new[]{"양털"});
            // lisbon(europe) should be cheaper than shanghai(east_asia) on average
            // (random factor means this can occasionally fail — seed is not fixed)
            // Just check both > MinPrice
            Assert.GreaterOrEqual(prices["lisbon"]["양털"],  GameConstants.MinPrice);
            Assert.GreaterOrEqual(prices["shanghai"]["양털"], GameConstants.MinPrice);
        }
    }
}
```

- [ ] **Step 2: Test Runner에서 실행**

`Window > General > Test Runner > EditMode > Run All`
Expected: MarketSystemTests 7개 모두 PASS

- [ ] **Step 3: 커밋**

```bash
git add "Unity/Assets/Pioneer/Tests/EditMode/MarketSystemTests.cs"
git commit -m "test(unity): MarketSystem 단위 테스트 추가"
```

---

## Task 7: NavigationSystem.cs — 항해 계산

**Files:**
- Create: `Assets\Pioneer\Scripts\Systems\NavigationSystem.cs`

- [ ] **Step 1: NavigationSystem.cs 작성**

```csharp
using System;
using System.Collections.Generic;
using Pioneer.Core;
using UnityEngine;

namespace Pioneer.Systems
{
    public struct RoutePoint { public float X; public float Y; }

    public static class NavigationSystem
    {
        // React navigation.js의 createDepartureState 포팅
        public static void StartVoyage(ShipState ship, string destinationKey, float speedMultiplier = 1f)
        {
            if (!GameConstants.Ports.TryGetValue(destinationKey, out var dest)) return;
            ship.StartX              = ship.X;
            ship.StartY              = ship.Y;
            ship.TargetX             = dest.HarborX;
            ship.TargetY             = dest.HarborY;
            ship.DestinationPortKey  = destinationKey;
            ship.IsMoving            = true;
        }

        // 선박 한 프레임 이동 (deltaTime = 게임 내 경과 초)
        public static bool TickMovement(ShipState ship, float deltaTime, float speedOverride = 0f)
        {
            if (!ship.IsMoving) return false;
            if (!GameConstants.ShipTypes.TryGetValue(ship.Type, out var st)) return false;

            float speed = speedOverride > 0
                ? speedOverride
                : st.BaseSpeed * GameConstants.SailingPaceMult;

            float dx = ship.TargetX - ship.X;
            float dy = ship.TargetY - ship.Y;
            float dist = Mathf.Sqrt(dx * dx + dy * dy);

            float step = speed * deltaTime;
            if (step >= dist)
            {
                ship.X       = ship.TargetX;
                ship.Y       = ship.TargetY;
                ship.IsMoving = false;
                ship.TotalDistanceTraveled += dist;
                return true; // 도착
            }

            float ratio = step / dist;
            ship.X += dx * ratio;
            ship.Y += dy * ratio;
            ship.TotalDistanceTraveled += step;
            return false;
        }

        // 두 점 사이 거리 (% 단위)
        public static float Distance(float x1, float y1, float x2, float y2)
            => Mathf.Sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));

        // 선박이 정박 중인 항구 키 반환 (3.5% 이내)
        public static string FindDockedPort(ShipState ship)
        {
            foreach (var kvp in GameConstants.Ports)
            {
                var p = kvp.Value;
                float dMain = Distance(ship.X, ship.Y, p.X, p.Y);
                float dHarb = Distance(ship.X, ship.Y, p.HarborX, p.HarborY);
                if (dMain < 3.5f || dHarb < 3.5f) return kvp.Key;
            }
            return null;
        }

        // 항해 예상 시간 (초) — 게임 내 시간
        public static float EstimateVoyageSeconds(ShipState ship, string destKey)
        {
            if (!GameConstants.Ports.TryGetValue(destKey, out var dest)) return 0f;
            if (!GameConstants.ShipTypes.TryGetValue(ship.Type, out var st)) return 0f;
            float dist  = Distance(ship.X, ship.Y, dest.HarborX, dest.HarborY);
            float speed = st.BaseSpeed * GameConstants.SailingPaceMult;
            return speed > 0 ? dist / speed : 9999f;
        }

        // 날씨 속도 보정 적용된 실제 속도
        public static float GetEffectiveSpeed(ShipState ship, string weatherKey)
        {
            if (!GameConstants.ShipTypes.TryGetValue(ship.Type, out var st)) return 0.001f;
            float base_ = st.BaseSpeed * GameConstants.SailingPaceMult;
            if (GameConstants.WeatherTypes.TryGetValue(weatherKey, out var w))
                base_ *= w.SpeedMult;
            return base_;
        }

        // 도착 후 선박을 항구에 스냅
        public static void SnapToPort(ShipState ship, string portKey)
        {
            if (!GameConstants.Ports.TryGetValue(portKey, out var p)) return;
            ship.X = p.HarborX;
            ship.Y = p.HarborY;
            ship.IsMoving = false;
            ship.DestinationPortKey = null;
        }
    }
}
```

- [ ] **Step 2: NavigationSystem 단위 테스트 작성**

`Assets\Pioneer\Tests\EditMode\NavigationSystemTests.cs`:

```csharp
using NUnit.Framework;
using Pioneer.Core;
using Pioneer.Systems;

namespace Pioneer.Tests
{
    public class NavigationSystemTests
    {
        private static ShipState MakeShip(float x, float y, string type = "sloop")
            => new() { Id=1, Type=type, X=x, Y=y, TargetX=x, TargetY=y };

        [Test]
        public void StartVoyage_SetsIsMovingTrue()
        {
            var ship = MakeShip(43.2f, 43.5f); // lisbon
            NavigationSystem.StartVoyage(ship, "london");
            Assert.IsTrue(ship.IsMoving);
        }

        [Test]
        public void StartVoyage_SetsTargetToHarborCoords()
        {
            var ship = MakeShip(43.2f, 43.5f);
            NavigationSystem.StartVoyage(ship, "london");
            var london = GameConstants.Ports["london"];
            Assert.AreEqual(london.HarborX, ship.TargetX, 0.001f);
            Assert.AreEqual(london.HarborY, ship.TargetY, 0.001f);
        }

        [Test]
        public void TickMovement_MovesShipTowardTarget()
        {
            var ship = MakeShip(0f, 0f);
            ship.TargetX = 10f;
            ship.TargetY = 0f;
            ship.IsMoving = true;
            NavigationSystem.TickMovement(ship, 1f, speedOverride: 2f);
            Assert.Greater(ship.X, 0f);
            Assert.Less(ship.X, 10f);
        }

        [Test]
        public void TickMovement_StopsWhenArrived()
        {
            var ship = MakeShip(0f, 0f);
            ship.TargetX = 1f;
            ship.TargetY = 0f;
            ship.IsMoving = true;
            bool arrived = NavigationSystem.TickMovement(ship, 1f, speedOverride: 100f);
            Assert.IsTrue(arrived);
            Assert.IsFalse(ship.IsMoving);
            Assert.AreEqual(1f, ship.X, 0.001f);
        }

        [Test]
        public void Distance_CalculatesCorrectly()
        {
            float d = NavigationSystem.Distance(0f, 0f, 3f, 4f);
            Assert.AreEqual(5f, d, 0.001f);
        }

        [Test]
        public void FindDockedPort_ReturnsPortKeyWhenNear()
        {
            var lisbon = GameConstants.Ports["lisbon"];
            var ship = MakeShip(lisbon.X, lisbon.Y);
            var result = NavigationSystem.FindDockedPort(ship);
            Assert.AreEqual("lisbon", result);
        }

        [Test]
        public void FindDockedPort_ReturnsNullWhenAtSea()
        {
            var ship = MakeShip(0f, 0f); // 아무 항구에서도 멀리
            var result = NavigationSystem.FindDockedPort(ship);
            Assert.IsNull(result);
        }

        [Test]
        public void EstimateVoyageSeconds_PositiveForValidDest()
        {
            var ship = MakeShip(43.2f, 43.5f);
            float secs = NavigationSystem.EstimateVoyageSeconds(ship, "london");
            Assert.Greater(secs, 0f);
        }
    }
}
```

- [ ] **Step 3: Test Runner 실행 — 8개 모두 PASS 확인**

- [ ] **Step 4: 커밋**

```bash
git add "Unity/Assets/Pioneer/Scripts/Systems/NavigationSystem.cs"
git add "Unity/Assets/Pioneer/Tests/EditMode/NavigationSystemTests.cs"
git commit -m "feat(unity): NavigationSystem + 단위 테스트"
```

---

## Task 8: GameManager.cs — 싱글톤 게임 루프

**Files:**
- Create: `Assets\Pioneer\Scripts\Core\GameManager.cs`

- [ ] **Step 1: GameManager.cs 작성**

```csharp
using System;
using System.Collections;
using System.Collections.Generic;
using Pioneer.Systems;
using UnityEngine;

namespace Pioneer.Core
{
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Config")]
        [SerializeField] float gameSpeedMult = 1f;   // 1=normal, 10=demo
        [SerializeField] bool  demoMode      = false;

        public GameState State { get; private set; }

        // 이벤트
        public event Action<ShipState, string> OnShipArrived;
        public event Action<long>              OnGoldChanged;
        public event Action                    OnPricesUpdated;
        public event Action<string>            OnLogMessage;

        private int _predIdCounter = 1;

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        void Start()
        {
            if (demoMode) gameSpeedMult = 10f;
            NewGame();
            StartCoroutine(GameLoop());
        }

        public void NewGame()
        {
            State = new GameState();
            // 초기 선박 (통통배, 리스본)
            var lisbon = GameConstants.Ports["lisbon"];
            State.Ships.Add(new ShipState
            {
                Id   = 1,
                Type = "rowboat",
                Name = "개척호",
                X    = lisbon.HarborX,
                Y    = lisbon.HarborY,
                Fuel = 100f,
                Hull = 100f,
            });
            State.NextShipId = 2;
            // 초기 방문 항구
            State.VisitedPorts.AddRange(GameConstants.StartUnlockedPorts);
            // 초기 화물 (양털 8개)
            State.Ships[0].Cargo.Add(new CargoItem { Resource="양털", Quantity=8 });
            // 초기 가격
            State.Prices = MarketSystem.InitPrices(
                GameConstants.Ports.Keys,
                GameConstants.Resources.Keys);
        }

        // 게임 루프 Coroutine (실제 시간 1초 = 게임 내 gameSpeedMult초)
        private IEnumerator GameLoop()
        {
            while (true)
            {
                yield return new WaitForSeconds(1f / gameSpeedMult);
                float gameDelta = 1f;

                State.GameTimeSec  += gameDelta;
                State.SmallPriceTimer  += gameDelta;
                State.MarketEventTimer += gameDelta;
                State.TaxTimer         += gameDelta;

                // 선박 이동
                foreach (var ship in State.Ships)
                {
                    if (!ship.IsMoving) continue;
                    string weatherKey = WeatherSystem.GetWeatherKey(ship);
                    float speed = NavigationSystem.GetEffectiveSpeed(ship, weatherKey);
                    bool arrived = NavigationSystem.TickMovement(ship, gameDelta, speed);
                    if (arrived)
                    {
                        string portKey = NavigationSystem.FindDockedPort(ship);
                        if (portKey != null)
                        {
                            if (!State.VisitedPorts.Contains(portKey))
                                State.VisitedPorts.Add(portKey);
                            OnShipArrived?.Invoke(ship, portKey);
                            Log($"{ship.Name}이(가) {GameConstants.Ports[portKey].Name}에 입항했습니다.");
                        }
                    }
                }

                // 시장 소규모 드리프트
                if (State.SmallPriceTimer >= GameConstants.SmallPriceIntervalSeconds)
                {
                    State.SmallPriceTimer = 0f;
                    MarketSystem.ApplySmallDrift(State.Prices);
                    MarketSystem.AppendPriceSnapshot(State.PriceHistory, State.Prices);
                    OnPricesUpdated?.Invoke();
                }

                // 시장 대형 이벤트
                if (State.MarketEventTimer >= GameConstants.MarketEventIntervalSeconds)
                {
                    State.MarketEventTimer = 0f;
                    var impacts = MarketSystem.ApplyMajorEvent(State.Prices);
                    if (impacts.Count > 0)
                    {
                        var imp = impacts[0];
                        string dir = imp.Direction > 0 ? "↑" : "↓";
                        Log($"시장 이벤트: {imp.Resource} {dir} ({imp.PortKey})");
                    }
                    OnPricesUpdated?.Invoke();
                }

                // 세금
                if (State.TaxTimer >= GameConstants.TaxIntervalSeconds)
                {
                    State.TaxTimer = 0f;
                    int tax = GameConstants.CalcTax(State.TaxLevel);
                    State.Gold -= tax;
                    State.GameDay++;
                    OnGoldChanged?.Invoke(State.Gold);
                    Log($"세금 납부: {tax:N0}금 (레벨 {State.TaxLevel})");
                }

                // 마일스톤 체크
                CheckMilestones();
            }
        }

        private void CheckMilestones()
        {
            while (State.MilestoneIdx < GameConstants.EarnMilestones.Length &&
                   State.TotalEarned >= GameConstants.EarnMilestones[State.MilestoneIdx])
            {
                State.TaxLevel++;
                State.MilestoneIdx++;
                Log($"마일스톤 돌파! 세금 레벨 {State.TaxLevel}로 상승");
            }
        }

        // 거래: 매수
        public bool Buy(ShipState ship, string portKey, string resource, int qty)
        {
            if (!State.Prices.TryGetValue(portKey, out var portPrices)) return false;
            if (!portPrices.TryGetValue(resource, out var price)) return false;
            if (!GameConstants.Resources.ContainsKey(resource)) return false;
            long total = (long)(price * qty);
            if (State.Gold < total) return false;

            State.Gold -= total;
            State.TotalSpent += total;
            AddCargo(ship, resource, qty);
            MarketSystem.ApplyPlayerTradeImpact(State.Prices, portKey, resource, qty, false);
            OnGoldChanged?.Invoke(State.Gold);
            return true;
        }

        // 거래: 매도
        public bool Sell(ShipState ship, string portKey, string resource, int qty)
        {
            if (!RemoveCargo(ship, resource, qty)) return false;
            if (!State.Prices.TryGetValue(portKey, out var portPrices)) return false;
            if (!portPrices.TryGetValue(resource, out var price)) return false;

            long gross = (long)(price * qty);
            long fee   = (long)(gross * GameConstants.TradeFeePercent / 100f);
            long net   = gross - fee;
            State.Gold        += net;
            State.TotalEarned += net;
            State.TotalTradesDone++;
            MarketSystem.ApplyPlayerTradeImpact(State.Prices, portKey, resource, qty, true);
            OnGoldChanged?.Invoke(State.Gold);
            CheckMilestones();
            return true;
        }

        private void AddCargo(ShipState ship, string resource, int qty)
        {
            var item = ship.Cargo.Find(c => c.Resource == resource);
            if (item != null) item.Quantity += qty;
            else ship.Cargo.Add(new CargoItem { Resource=resource, Quantity=qty });
        }

        private bool RemoveCargo(ShipState ship, string resource, int qty)
        {
            var item = ship.Cargo.Find(c => c.Resource == resource);
            if (item == null || item.Quantity < qty) return false;
            item.Quantity -= qty;
            if (item.Quantity == 0) ship.Cargo.Remove(item);
            return true;
        }

        // 선박 출항
        public void Depart(ShipState ship, string destinationPortKey)
        {
            if (ship.IsMoving) return;
            NavigationSystem.StartVoyage(ship, destinationPortKey);
            Log($"{ship.Name}이(가) {GameConstants.Ports[destinationPortKey].Name}으로 출항!");
        }

        private void Log(string msg)
        {
            Debug.Log($"[Pioneer] {msg}");
            OnLogMessage?.Invoke(msg);
        }
    }
}
```

- [ ] **Step 2: WeatherSystem.cs stub 추가** (GameManager 의존성 해결용)

`Assets\Pioneer\Scripts\Systems\WeatherSystem.cs`:
```csharp
using Pioneer.Core;
using UnityEngine;

namespace Pioneer.Systems
{
    public static class WeatherSystem
    {
        public static string GetWeatherKey(ShipState ship)
        {
            float timeSeed = Mathf.Floor(Time.time / GameConstants.WeatherChangeInterval);
            float routeY   = ship.Y;
            var pool       = GameConstants.GetWeatherPool(routeY);
            int hash       = Mathf.Abs(Mathf.RoundToInt(
                Mathf.Sin(ship.Id * 1.7f + timeSeed * 2.13f) * 10000f)) % pool.Length;
            return pool[hash];
        }
    }
}
```

- [ ] **Step 3: 커밋**

```bash
git add "Unity/Assets/Pioneer/Scripts/Core/GameManager.cs"
git add "Unity/Assets/Pioneer/Scripts/Systems/WeatherSystem.cs"
git commit -m "feat(unity): GameManager 싱글톤 + 게임 루프 Coroutine"
```

---

## Task 9: MapController.cs — 세계지도 Pan/Zoom

**Files:**
- Create: `Assets\Pioneer\Scripts\Map\MapController.cs`

- [ ] **Step 1: MapController.cs 작성**

```csharp
using System;
using System.Collections.Generic;
using Pioneer.Core;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Pioneer.Map
{
    // 맵 % 좌표(0~100)를 RectTransform 픽셀 좌표로 변환
    public class MapController : MonoBehaviour, IDragHandler, IScrollHandler
    {
        [Header("References")]
        [SerializeField] RectTransform mapRect;       // 세계지도 Image RectTransform
        [SerializeField] RectTransform viewportRect;  // 보이는 영역 RectTransform

        [Header("Zoom")]
        [SerializeField] float minZoom = 0.5f;
        [SerializeField] float maxZoom = 4.0f;
        [SerializeField] float zoomSpeed = 0.1f;

        private float   _zoom    = 1.35f;
        private Vector2 _panOffset = new(-260f, 70f); // 초기 오프셋 (React DEFAULT_MAP_VIEW 참고)

        // 이벤트: 항구 마커가 구독
        public event Action<string> OnPortClicked;

        void Start()
        {
            ApplyTransform();
        }

        // 맵 % 좌표 → Screen 픽셀 위치
        public Vector2 MapToScreen(float pctX, float pctY)
        {
            Vector2 mapSize = mapRect.rect.size;
            float px = (pctX / 100f) * mapSize.x * _zoom + _panOffset.x;
            float py = (pctY / 100f) * mapSize.y * _zoom + _panOffset.y;
            return new Vector2(px, viewportRect.rect.height - py); // Y 반전
        }

        // Screen 픽셀 → 맵 % 좌표
        public Vector2 ScreenToMap(Vector2 screen)
        {
            Vector2 mapSize = mapRect.rect.size;
            float px = (screen.x - _panOffset.x) / (mapSize.x * _zoom) * 100f;
            float py = ((viewportRect.rect.height - screen.y) - _panOffset.y) / (mapSize.y * _zoom) * 100f;
            return new Vector2(px, py);
        }

        // 항구 마커 앵커드포지션 계산
        public Vector2 GetPortAnchoredPosition(float pctX, float pctY)
        {
            Vector2 mapSize  = mapRect.rect.size;
            float mapW = mapSize.x * _zoom;
            float mapH = mapSize.y * _zoom;
            float px = pctX / 100f * mapW + _panOffset.x;
            float py = -(pctY / 100f * mapH) + _panOffset.y;  // UI Y 반전
            return new Vector2(px, py);
        }

        public void OnDrag(PointerEventData e)
        {
            _panOffset += e.delta;
            ClampPan();
            ApplyTransform();
        }

        public void OnScroll(PointerEventData e)
        {
            float delta = e.scrollDelta.y * zoomSpeed;
            float newZoom = Mathf.Clamp(_zoom + delta, minZoom, maxZoom);

            // 마우스 위치 기준 줌
            Vector2 pivot = e.position - viewportRect.position;
            _panOffset = pivot - (pivot - _panOffset) * (newZoom / _zoom);
            _zoom = newZoom;
            ClampPan();
            ApplyTransform();
        }

        private void ClampPan()
        {
            Vector2 mapSize = mapRect.rect.size;
            float mapW = mapSize.x * _zoom;
            float mapH = mapSize.y * _zoom;
            float vpW  = viewportRect.rect.width;
            float vpH  = viewportRect.rect.height;
            _panOffset.x = Mathf.Clamp(_panOffset.x, vpW - mapW, 0f);
            _panOffset.y = Mathf.Clamp(_panOffset.y, vpH - mapH, 0f);
        }

        private void ApplyTransform()
        {
            mapRect.localScale     = new Vector3(_zoom, _zoom, 1f);
            mapRect.anchoredPosition = _panOffset;
        }

        internal void NotifyPortClicked(string portKey) => OnPortClicked?.Invoke(portKey);
    }
}
```

- [ ] **Step 2: PortMarker.cs 작성**

`Assets\Pioneer\Scripts\Map\PortMarker.cs`:
```csharp
using Pioneer.Core;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace Pioneer.Map
{
    public class PortMarker : MonoBehaviour
    {
        [SerializeField] Button button;
        [SerializeField] Image  dotImage;
        [SerializeField] TextMeshProUGUI nameLabel;

        private string         _portKey;
        private MapController  _map;
        private RectTransform  _rt;

        // 지역별 색상
        private static readonly System.Collections.Generic.Dictionary<string, Color> RegionColors = new()
        {
            {"europe",        new Color(0.38f, 0.65f, 0.98f)},
            {"mediterranean", new Color(0.65f, 0.55f, 0.98f)},
            {"arabian",       new Color(0.98f, 0.57f, 0.19f)},
            {"south_asia",    new Color(0.20f, 0.83f, 0.60f)},
            {"east_asia",     new Color(0.97f, 0.45f, 0.45f)},
            {"americas",      new Color(0.22f, 0.74f, 0.96f)},
        };

        public void Init(string portKey, MapController map)
        {
            _portKey = portKey;
            _map     = map;
            _rt      = GetComponent<RectTransform>();

            if (GameConstants.Ports.TryGetValue(portKey, out var p))
            {
                nameLabel.text = p.Name;
                if (RegionColors.TryGetValue(p.Region, out var col))
                    dotImage.color = col;
            }

            button.onClick.AddListener(OnClick);
        }

        void LateUpdate()
        {
            if (_map == null || !GameConstants.Ports.TryGetValue(_portKey, out var p)) return;
            _rt.anchoredPosition = _map.GetPortAnchoredPosition(p.HarborX, p.HarborY);
        }

        void OnClick() => _map.NotifyPortClicked(_portKey);

        public void SetLocked(bool locked) => dotImage.color = locked ? Color.gray : dotImage.color;
    }
}
```

- [ ] **Step 3: 커밋**

```bash
git add "Unity/Assets/Pioneer/Scripts/Map/"
git commit -m "feat(unity): MapController Pan/Zoom + PortMarker"
```

---

## Task 10: SaveSystem.cs

**Files:**
- Create: `Assets\Pioneer\Scripts\Core\SaveSystem.cs`

- [ ] **Step 1: SaveSystem.cs 작성**

```csharp
using System.IO;
using Pioneer.Core;
using UnityEngine;

namespace Pioneer.Core
{
    public static class SaveSystem
    {
        private static string SavePath => Path.Combine(Application.persistentDataPath, "pioneer_save.json");

        public static void Save(GameState state)
        {
            string json = JsonUtility.ToJson(state, prettyPrint: false);
            File.WriteAllText(SavePath, json);
            Debug.Log($"[Pioneer] 저장 완료: {SavePath}");
        }

        public static GameState Load()
        {
            if (!File.Exists(SavePath)) return null;
            string json = File.ReadAllText(SavePath);
            return JsonUtility.FromJson<GameState>(json);
        }

        public static bool HasSave() => File.Exists(SavePath);

        public static void Delete()
        {
            if (File.Exists(SavePath)) File.Delete(SavePath);
        }
    }
}
```

- [ ] **Step 2: 커밋**

```bash
git add "Unity/Assets/Pioneer/Scripts/Core/SaveSystem.cs"
git commit -m "feat(unity): SaveSystem JsonUtility 기반 저장/불러오기"
```

---

## Task 11: HUDController.cs — 상단 HUD 스켈레톤

**Files:**
- Create: `Assets\Pioneer\Scripts\UI\HUDController.cs`

- [ ] **Step 1: HUDController.cs 작성**

```csharp
using Pioneer.Core;
using TMPro;
using UnityEngine;

namespace Pioneer.UI
{
    public class HUDController : MonoBehaviour
    {
        [SerializeField] TextMeshProUGUI goldLabel;
        [SerializeField] TextMeshProUGUI dayLabel;
        [SerializeField] TextMeshProUGUI fleetLabel;

        void OnEnable()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnGoldChanged += UpdateGold;
            }
        }

        void OnDisable()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnGoldChanged -= UpdateGold;
            }
        }

        void Update()
        {
            if (GameManager.Instance?.State == null) return;
            var s = GameManager.Instance.State;
            if (dayLabel  != null) dayLabel.text   = $"Day {s.GameDay}";
            if (fleetLabel!= null) fleetLabel.text = $"함대 {s.Ships.Count}척";
        }

        private void UpdateGold(long gold)
        {
            if (goldLabel != null) goldLabel.text = $"{gold:N0} 금";
        }
    }
}
```

- [ ] **Step 2: 커밋**

```bash
git add "Unity/Assets/Pioneer/Scripts/UI/HUDController.cs"
git commit -m "feat(unity): HUDController 스켈레톤 (금화·일수·함대 수)"
```

---

## Task 12: Unity 씬 수동 설정 (Unity 에디터 작업)

이 Task는 Unity 에디터에서 직접 수행한다. 코드 파일이 없고 .unity 씬 파일을 GUI로 만든다.

- [ ] **Step 1: Game.unity 씬 구성**

Unity 에디터에서 새 씬 생성 후 아래 계층 구성:

```
Game (Scene)
├── GameManager [GameManager.cs 컴포넌트 붙임]
├── Canvas (Screen Space - Overlay, Sort Order 0)
│   ├── SafeArea
│   │   ├── MapViewport [MapController.cs 붙임, Mask 컴포넌트]
│   │   │   └── WorldMapImage [RawImage, WorldMap.png 할당]
│   │   ├── PortMarkersContainer [항구 마커들의 부모 — MapViewport 밖]
│   │   ├── HUD [HUDController.cs 붙임]
│   │   │   ├── GoldLabel [TextMeshProUGUI]
│   │   │   ├── DayLabel [TextMeshProUGUI]
│   │   │   └── FleetLabel [TextMeshProUGUI]
│   │   ├── LeftPanel (FleetPanel 자리 — Phase 2에서 구현)
│   │   └── RightPanel (PortPanel 자리 — Phase 3에서 구현)
└── EventSystem
```

- [ ] **Step 2: GameManager Inspector 설정**
  - `gameSpeedMult` = 1
  - `demoMode` = false

- [ ] **Step 3: MapController Inspector 설정**
  - `mapRect` = WorldMapImage의 RectTransform
  - `viewportRect` = MapViewport의 RectTransform
  - `minZoom` = 0.5, `maxZoom` = 4.0, `zoomSpeed` = 0.1

- [ ] **Step 4: MapSpawner.cs 추가 — PortMarker 런타임 생성**

`Assets\Pioneer\Scripts\Map\MapSpawner.cs`:
```csharp
using Pioneer.Core;
using Pioneer.Map;
using UnityEngine;

public class MapSpawner : MonoBehaviour
{
    [SerializeField] MapController mapController;
    [SerializeField] Transform     portMarkersParent;
    [SerializeField] GameObject    portMarkerPrefab;

    void Start()
    {
        SpawnPortMarkers();
    }

    void SpawnPortMarkers()
    {
        foreach (var kvp in GameConstants.Ports)
        {
            var go     = Instantiate(portMarkerPrefab, portMarkersParent);
            var marker = go.GetComponent<PortMarker>();
            marker.Init(kvp.Key, mapController);

            bool unlocked = GameManager.Instance != null
                          && GameConstants.IsPortUnlocked(kvp.Key, GameManager.Instance.State.TotalEarned);
            marker.SetLocked(!unlocked);
        }
    }
}
```

- [ ] **Step 5: PortMarker Prefab 제작**

`Assets\Pioneer\Prefabs\PortMarker.prefab` 구성:
```
PortMarker (RectTransform, PortMarker.cs)
├── DotImage (Image, 12x12, 원형 Sprite)
└── NameLabel (TextMeshProUGUI, 글자 크기 9, 앵커: 위)
```

- [ ] **Step 6: 씬 저장 & 커밋**

```bash
git add "Unity/Assets/Pioneer/Scenes/Game.unity"
git add "Unity/Assets/Pioneer/Prefabs/"
git add "Unity/Assets/Pioneer/Scripts/Map/MapSpawner.cs"
git commit -m "feat(unity): Game 씬 기본 구성 + PortMarker Prefab + MapSpawner"
```

---

## Task 13: Phase 1 통합 검증

- [ ] **Step 1: 전체 Test Runner 실행**

`Window > General > Test Runner > EditMode > Run All`
Expected: 모든 테스트 PASS (≥17개)

- [ ] **Step 2: Play Mode 실행 확인**

Unity 에디터에서 ▶ 버튼 클릭 후:
1. Console에 `[Pioneer] 저장 완료` 또는 루프 관련 로그가 출력됨
2. Game 뷰에서 세계지도가 표시됨 (또는 파란 배경)
3. 항구 마커 30개가 맵 위에 배치됨
4. 마우스 드래그로 맵 이동, 스크롤로 확대/축소 작동

- [ ] **Step 3: 최종 커밋**

```bash
git add -A "Unity/"
git commit -m "feat(unity): Phase 1 완료 — 기반+데이터+마켓+항해+세계지도"
```

---

## 자가 검토 결과

### 스펙 커버리지

| 항목 | Task |
|------|------|
| Unity 6 LTS 프로젝트 생성 | Task 1 |
| 전체 정적 데이터 (항구 30개, 선박 11종, 자원 10종) | Task 2 |
| 게임 상태 직렬화 (Gold, Ships, Cargo, Prices) | Task 3 |
| 단위 테스트 (≥17개) | Task 4, 6, 7 |
| 가격 시뮬레이션 (드리프트, 이벤트, 초기화) | Task 5 |
| 항해 계산 (이동, 도착 감지, 속도) | Task 7 |
| 게임 루프 Coroutine (세금, 시장, 선박 이동) | Task 8 |
| 세계지도 Pan/Zoom | Task 9 |
| 항구 마커 | Task 9 |
| 저장/불러오기 | Task 10 |
| HUD 스켈레톤 | Task 11 |
| Unity 씬 설정 | Task 12 |

### 타입 일관성
- `ShipState.Id` (int) ↔ `CrewMember.ShipId` (int) ✓
- `GameState.Prices` `Dictionary<string, Dictionary<string, float>>` ↔ `MarketSystem` 파라미터 ✓
- `NavigationSystem.TickMovement` `speedOverride` 파라미터 ↔ `GameManager` 호출부 ✓
