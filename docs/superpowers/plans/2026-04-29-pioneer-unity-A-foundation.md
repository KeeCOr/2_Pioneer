# Pioneer Unity — Plan A: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a Unity 2022.3 LTS project with all data types, game systems (Economy, Tax, Crew, Quest, Info, Event, DailyGoal), SaveSystem, and GameManager singleton — everything except visuals and UI.

**Architecture:** Single GameManager singleton owns a `GameState` struct (plain serializable data). Each system (EconomySystem, TaxSystem, etc.) is a static or MonoBehaviour class that reads/writes `GameState`. SaveSystem serializes `GameState` to JSON and stores it in PlayerPrefs (WebGL-compatible).

**Tech Stack:** Unity 2022.3 LTS, URP, C#, Newtonsoft.Json (`com.unity.nuget.newtonsoft-json`)

---

## File Structure

```
Assets/
  Scripts/
    Data/
      GameState.cs          — All runtime data (ships, ports, crew, quests, gold…)
      ShipData.cs           — Ship instance data + upgrades + crew list
      CrewMember.cs         — Crew stats, rarity, specialty
      QuestData.cs          — Quest definition + progress
      PredictionData.cs     — Market prediction (rumor/hint/info/report)
      DailyGoalData.cs      — Daily goal + progress
      PortPriceData.cs      — Price history per port per resource
    Core/
      GameConstants.cs      — All magic numbers (ported from App.jsx)
      GameManager.cs        — Singleton; owns GameState, ticks systems
      SaveSystem.cs         — PlayerPrefs JSON save/load
    Systems/
      EconomySystem.cs      — Price generation, buy/sell logic
      TaxSystem.cs          — Tax calculation + level escalation
      CrewSystem.cs         — Hire/fire crew, stat bonuses
      QuestSystem.cs        — Quest generation, progress check, reward
      InfoSystem.cs         — Prediction purchase, rumor on new port
      EventSystem.cs        — Forced/clickable event roll + effects
      DailyGoalSystem.cs    — Daily goal reset + progress tracking
    ScriptableObjects/
      ShipTypeSO.cs
      PortSO.cs
      ResourceSO.cs
  ScriptableObjects/
    ShipTypes/   (assets created in editor)
    Ports/
    Resources/
  Scenes/
    Main.unity
```

---

### Task 1: Unity Project Setup

**Files:**
- Create: `Assets/Scenes/Main.unity` (via Unity Editor)
- Create: `Assets/Scripts/` folder structure

- [ ] **Step 1: Create Unity project**

  In Unity Hub → New Project → "3D (URP)" template → Unity 2022.3.x LTS → name `Pioneer`.

- [ ] **Step 2: Add Newtonsoft.Json package**

  Window → Package Manager → + → "Add package by name":
  ```
  com.unity.nuget.newtonsoft-json
  ```
  Wait for import. Verify: no compiler errors.

- [ ] **Step 3: Create folder structure**

  In Project window, create these folders under `Assets/`:
  ```
  Scripts/Data
  Scripts/Core
  Scripts/Systems
  Scripts/ScriptableObjects
  ScriptableObjects/ShipTypes
  ScriptableObjects/Ports
  ScriptableObjects/Resources
  Prefabs/Ships
  Prefabs/Ports
  Prefabs/UI
  ```

- [ ] **Step 4: Open Main scene and save**

  File → Save As → `Assets/Scenes/Main.unity`. Confirm scene saved.

- [ ] **Step 5: Commit**

  ```bash
  git add -A
  git commit -m "feat(unity): initial Unity 2022.3 LTS URP project + Newtonsoft.Json"
  ```

---

### Task 2: ScriptableObjects

**Files:**
- Create: `Assets/Scripts/ScriptableObjects/ShipTypeSO.cs`
- Create: `Assets/Scripts/ScriptableObjects/PortSO.cs`
- Create: `Assets/Scripts/ScriptableObjects/ResourceSO.cs`

- [ ] **Step 1: Create ShipTypeSO.cs**

  ```csharp
  // Assets/Scripts/ScriptableObjects/ShipTypeSO.cs
  using UnityEngine;

  [CreateAssetMenu(menuName = "Pioneer/ShipType", fileName = "NewShipType")]
  public class ShipTypeSO : ScriptableObject
  {
      public string id;                // "sloop", "brigantine", "galleon"
      public string displayName;
      public int baseCargo;            // 50, 100, 200
      public float baseSpeed;          // 1.0, 0.9, 0.75
      public int maxCrew;              // 4, 8, 14
      public int fuelCapacity;         // 100, 150, 200
      public int hullMax;              // 100, 150, 200
      public int buyPrice;             // 0, 3000, 8000
      public GameObject prefab;        // 3D ship prefab
  }
  ```

- [ ] **Step 2: Create PortSO.cs**

  ```csharp
  // Assets/Scripts/ScriptableObjects/PortSO.cs
  using UnityEngine;

  [CreateAssetMenu(menuName = "Pioneer/Port", fileName = "NewPort")]
  public class PortSO : ScriptableObject
  {
      public string id;                // "lisbon", "london", etc.
      public string displayName;
      public Vector2 mapPosition;      // 0-100 game coords
      public string[] tradeGoods;      // resource IDs available here
      public GameObject prefab;        // 3D port prefab
  }
  ```

- [ ] **Step 3: Create ResourceSO.cs**

  ```csharp
  // Assets/Scripts/ScriptableObjects/ResourceSO.cs
  using UnityEngine;

  [CreateAssetMenu(menuName = "Pioneer/Resource", fileName = "NewResource")]
  public class ResourceSO : ScriptableObject
  {
      public string id;                // "grain", "silk", etc.
      public string displayName;
      public string icon;              // emoji fallback for UI text
      public int basePrice;
      public int priceMin;
      public int priceMax;
  }
  ```

- [ ] **Step 4: Verify — no compiler errors in Unity**

- [ ] **Step 5: Create asset instances in editor**

  Right-click `ScriptableObjects/Resources/` → Create → Pioneer → Resource.
  Create 8 resources: grain(50,30,80), fish(40,20,60), timber(80,50,120), cloth(120,80,180), spice(300,200,500), wine(150,100,250), iron(100,60,160), silk(400,250,600).

  Right-click `ScriptableObjects/ShipTypes/` → Create → Pioneer → ShipType.
  Create 3 ships: sloop(50,1.0,4,100,100,0), brigantine(100,0.9,8,150,150,3000), galleon(200,0.75,14,200,200,8000).

  Create 8 ports in `ScriptableObjects/Ports/` with approximate map positions:
  - lisbon (10,45), london (18,72), amsterdam (24,68), hamburg (28,74)
  - venice (35,50), istanbul (50,45), alexandria (48,32), tunis (32,38)

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "feat(unity): ShipTypeSO, PortSO, ResourceSO + asset instances"
  ```

---

### Task 3: Runtime Data Types

**Files:**
- Create: `Assets/Scripts/Data/GameState.cs`
- Create: `Assets/Scripts/Data/ShipData.cs`
- Create: `Assets/Scripts/Data/CrewMember.cs`
- Create: `Assets/Scripts/Data/QuestData.cs`
- Create: `Assets/Scripts/Data/PredictionData.cs`
- Create: `Assets/Scripts/Data/DailyGoalData.cs`
- Create: `Assets/Scripts/Data/PortPriceData.cs`

- [ ] **Step 1: Create CrewMember.cs**

  ```csharp
  // Assets/Scripts/Data/CrewMember.cs
  using System;

  [Serializable]
  public class CrewMember
  {
      public string id;
      public string name;
      public string rarity;      // "common","uncommon","rare","legendary"
      public string specialty;   // "navigator","merchant","engineer","captain",""
      public int navigation;     // 0-100
      public int trading;
      public int stamina;
      public int repair;
      public int hiringFee;
      public int weeklyWage;
      public int navBonus;       // specialty bonus applied separately
      public int tradingBonus;
  }
  ```

- [ ] **Step 2: Create QuestData.cs**

  ```csharp
  // Assets/Scripts/Data/QuestData.cs
  using System;

  [Serializable]
  public class QuestData
  {
      public string id;
      public string type;        // "deliver","profit","explore","battle"
      public string description;
      public string targetPortId;
      public string resourceId;
      public int targetAmount;
      public int rewardGold;
      public int rewardGems;
      public int progress;
      public bool completed;
      public bool claimed;
  }
  ```

- [ ] **Step 3: Create PredictionData.cs**

  ```csharp
  // Assets/Scripts/Data/PredictionData.cs
  using System;

  [Serializable]
  public class PredictionData
  {
      public string id;
      public string tier;        // "rumor","hint","info","report"
      public string quality;     // "basic","standard","premium","elite"
      public string portId;
      public string portName;
      public string resourceId;
      public string direction;   // "up","down"
      public int accuracy;       // 30,50,70,90
      public float magnitude;    // predicted % change
      public int turnsRemaining;
      public bool applied;
  }
  ```

- [ ] **Step 4: Create DailyGoalData.cs**

  ```csharp
  // Assets/Scripts/Data/DailyGoalData.cs
  using System;

  [Serializable]
  public class DailyGoalData
  {
      public string id;
      public string type;        // "profit","trade","explore","crew"
      public string description;
      public int target;
      public int progress;
      public int rewardGold;
      public bool completed;
      public bool claimed;
  }
  ```

- [ ] **Step 5: Create PortPriceData.cs**

  ```csharp
  // Assets/Scripts/Data/PortPriceData.cs
  using System;
  using System.Collections.Generic;

  [Serializable]
  public class PortPriceData
  {
      public string portId;
      public string resourceId;
      public int currentPrice;
      public List<int> priceHistory;  // last 20 values

      public PortPriceData(string port, string res, int price)
      {
          portId = port;
          resourceId = res;
          currentPrice = price;
          priceHistory = new List<int> { price };
      }
  }
  ```

- [ ] **Step 6: Create ShipData.cs**

  ```csharp
  // Assets/Scripts/Data/ShipData.cs
  using System;
  using System.Collections.Generic;

  [Serializable]
  public class ShipUpgrades
  {
      public int speed;   // 0-3, each +15% speed
      public int cargo;   // 0-3, each +25 capacity
      public int crew;    // 0-3, each +1 maxCrew
  }

  [Serializable]
  public class CargoItem
  {
      public string resourceId;
      public int quantity;
      public int buyPrice;   // price paid per unit (for profit calc)
  }

  [Serializable]
  public class ShipData
  {
      public string id;
      public string typeId;       // matches ShipTypeSO.id
      public string name;
      public float x;             // 0-100 game coords
      public float y;
      public float targetX;
      public float targetY;
      public string targetPortId; // null if not heading to port
      public float fuel;
      public int hull;
      public int captainId;       // crew id assigned as captain
      public List<string> crewIds;
      public List<CargoItem> cargo;
      public ShipUpgrades upgrades;
      public bool isDocked;
      public string dockedPortId;
  }
  ```

- [ ] **Step 7: Create GameState.cs**

  ```csharp
  // Assets/Scripts/Data/GameState.cs
  using System;
  using System.Collections.Generic;

  [Serializable]
  public class GameState
  {
      // Economy
      public int gold;
      public int gems;
      public List<PortPriceData> prices;

      // Fleet
      public List<ShipData> ships;
      public string activeShipId;

      // Crew pool (available to hire)
      public List<CrewMember> availableCrew;
      // All hired crew (owned)
      public List<CrewMember> crew;

      // Quests
      public List<QuestData> availableQuests;
      public List<QuestData> activeQuests;

      // Predictions / Info
      public List<PredictionData> predictions;
      public int infoPoints;     // currency for buying predictions

      // Daily goals
      public List<DailyGoalData> dailyGoals;
      public string lastGoalResetDate;  // "yyyy-MM-dd"

      // Tax
      public int taxLevel;       // escalates on tax payment + ship purchase
      public long lastTaxTime;   // Unix ms

      // Progress
      public List<string> visitedPorts;
      public int totalTradeCount;
      public int totalProfit;
      public int sessionTick;    // increments every price cycle

      // Skills (captain upgrades)
      public int tradingSkillLevel;  // reduces fee rate

      // Game time (in-game days)
      public int day;

      public static GameState CreateNew()
      {
          var gs = new GameState
          {
              gold = 1000,
              gems = 0,
              ships = new List<ShipData>(),
              crew = new List<CrewMember>(),
              availableCrew = new List<CrewMember>(),
              prices = new List<PortPriceData>(),
              availableQuests = new List<QuestData>(),
              activeQuests = new List<QuestData>(),
              predictions = new List<PredictionData>(),
              infoPoints = 0,
              dailyGoals = new List<DailyGoalData>(),
              lastGoalResetDate = "",
              taxLevel = 0,
              lastTaxTime = 0,
              visitedPorts = new List<string>(),
              totalTradeCount = 0,
              totalProfit = 0,
              sessionTick = 0,
              tradingSkillLevel = 0,
              day = 1,
              activeShipId = null
          };
          return gs;
      }
  }
  ```

- [ ] **Step 8: Verify — Unity compiles with no errors**

- [ ] **Step 9: Commit**

  ```bash
  git add -A
  git commit -m "feat(unity): runtime data types — GameState, ShipData, CrewMember, Quest, Prediction, DailyGoal"
  ```

---

### Task 4: GameConstants

**Files:**
- Create: `Assets/Scripts/Core/GameConstants.cs`

- [ ] **Step 1: Create GameConstants.cs**

  ```csharp
  // Assets/Scripts/Core/GameConstants.cs
  public static class GameConstants
  {
      // Economy
      public const float TRADE_FEE_PCT = 0.10f;          // 10% base fee
      public const int PRICE_HISTORY_MAX = 20;
      public const int PRICE_TICK_SECONDS = 60;           // real seconds per price cycle
      public const float PRICE_VOLATILITY_MIN = 0.03f;
      public const float PRICE_VOLATILITY_MAX = 0.12f;

      // Tax
      public const int TAX_INTERVAL_SECONDS = 120;        // real seconds between tax checks
      public const int TAX_BASE = 50;
      public const float TAX_LEVEL_MULTIPLIER = 1.4f;    // taxLevel exponential

      // Movement
      public const float BASE_SHIP_SPEED = 0.08f;        // units/second in game coords
      public const float FUEL_BURN_PER_UNIT = 0.5f;

      // Crew
      public const int CREW_POOL_SIZE = 6;               // refresh pool count
      public const int CREW_REFRESH_COST = 200;
      public const float NAV_SPEED_BONUS_PER_POINT = 0.003f;  // 100 nav → +30% speed

      // Events
      public const float EVENT_CHANCE_PER_TICK = 0.35f;  // 35% per 5s interval
      // Weights: storm, pirate, current, whale, wreck, treasure
      public static readonly int[] EVENT_WEIGHTS = { 35, 30, 25, 20, 8, 5 };
      public static readonly string[] EVENT_TYPES = { "storm","pirate","current","whale","wreck","treasure" };

      // Storm
      public const float STORM_HULL_DMG_MIN = 0.08f;
      public const float STORM_HULL_DMG_MAX = 0.20f;
      public const float STORM_FUEL_DMG_MIN = 0.05f;
      public const float STORM_FUEL_DMG_MAX = 0.15f;
      public const int STORM_DURATION_MIN_MS = 45000;
      public const int STORM_DURATION_MAX_MS = 90000;

      // Pirate
      public const float PIRATE_STEAL_MIN = 0.08f;
      public const float PIRATE_STEAL_MAX = 0.20f;

      // Whale bonus
      public const int WHALE_GOLD_MIN = 80;
      public const int WHALE_GOLD_MAX = 200;   // 80 + random 120

      // Current bonus
      public const int CURRENT_FUEL_MIN = 8;
      public const int CURRENT_FUEL_MAX = 18;  // 8 + random 10

      // Info / Predictions
      public const float RUMOR_CHANCE_NEW_PORT = 0.20f;  // 20% on first port arrival

      // Daily goals
      public const int DAILY_GOAL_COUNT = 4;

      // Upgrade costs
      public static readonly int[] SPEED_UPGRADE_COST  = { 500, 1200, 2500 };
      public static readonly int[] CARGO_UPGRADE_COST  = { 400, 1000, 2200 };
      public static readonly int[] CREW_UPGRADE_COST   = { 600, 1500, 3000 };

      // Info tier costs (gold)
      public static readonly int[] INFO_TIER_COST = { 0, 150, 400, 800 };  // rumor free on port, hint/info/report
  }
  ```

- [ ] **Step 2: Verify — Unity compiles**

- [ ] **Step 3: Commit**

  ```bash
  git add Assets/Scripts/Core/GameConstants.cs
  git commit -m "feat(unity): GameConstants — all magic numbers ported from App.jsx"
  ```

---

### Task 5: EconomySystem

**Files:**
- Create: `Assets/Scripts/Systems/EconomySystem.cs`

- [ ] **Step 1: Create EconomySystem.cs**

  ```csharp
  // Assets/Scripts/Systems/EconomySystem.cs
  using System.Collections.Generic;
  using UnityEngine;

  public static class EconomySystem
  {
      // Initialize prices for all port+resource combos
      public static void InitPrices(GameState gs, PortSO[] ports, ResourceSO[] resources)
      {
          gs.prices = new List<PortPriceData>();
          foreach (var port in ports)
          {
              foreach (var res in resources)
              {
                  int price = Mathf.RoundToInt(res.basePrice * Random.Range(0.8f, 1.2f));
                  gs.prices.Add(new PortPriceData(port.id, res.id, price));
              }
          }
      }

      // Tick all prices (call every PRICE_TICK_SECONDS)
      public static void TickPrices(GameState gs, ResourceSO[] resources)
      {
          gs.sessionTick++;
          var resMap = BuildResMap(resources);

          foreach (var pd in gs.prices)
          {
              if (!resMap.TryGetValue(pd.resourceId, out var res)) continue;

              float volatility = Random.Range(GameConstants.PRICE_VOLATILITY_MIN, GameConstants.PRICE_VOLATILITY_MAX);
              float direction = Random.value > 0.5f ? 1f : -1f;
              int delta = Mathf.RoundToInt(pd.currentPrice * volatility * direction);
              pd.currentPrice = Mathf.Clamp(pd.currentPrice + delta, res.priceMin, res.priceMax);

              pd.priceHistory.Add(pd.currentPrice);
              if (pd.priceHistory.Count > GameConstants.PRICE_HISTORY_MAX)
                  pd.priceHistory.RemoveAt(0);
          }
      }

      public static PortPriceData GetPrice(GameState gs, string portId, string resourceId)
      {
          return gs.prices.Find(p => p.portId == portId && p.resourceId == resourceId);
      }

      // Returns fee rate (0-10%) based on trading skill
      public static float GetFeeRate(GameState gs)
      {
          int tradePct = gs.tradingSkillLevel * 10;
          return Mathf.Max(0f, GameConstants.TRADE_FEE_PCT - Mathf.FloorToInt(tradePct / 2f) * 0.01f);
      }

      // Buy cargo at port — returns gold spent or -1 if insufficient
      public static int BuyCargo(GameState gs, ShipData ship, string resourceId, int qty, int unitPrice)
      {
          int total = unitPrice * qty;
          int fee = Mathf.RoundToInt(total * GetFeeRate(gs));
          int cost = total + fee;
          if (gs.gold < cost) return -1;

          int currentQty = GetCargoQty(ship, resourceId);
          int capacity = GetCapacity(ship);
          if (currentQty + qty > capacity) return -1;

          gs.gold -= cost;
          AddCargo(ship, resourceId, qty, unitPrice);
          gs.totalTradeCount++;
          return cost;
      }

      // Sell cargo at port — returns gold earned
      public static int SellCargo(GameState gs, ShipData ship, string resourceId, int qty, int unitPrice)
      {
          int removed = RemoveCargo(ship, resourceId, qty);
          if (removed == 0) return 0;

          int revenue = unitPrice * removed;
          int fee = Mathf.RoundToInt(revenue * GetFeeRate(gs));
          int earned = revenue - fee;
          gs.gold += earned;
          gs.totalProfit += earned;
          gs.totalTradeCount++;
          return earned;
      }

      public static int GetCapacity(ShipData ship)
      {
          // base capacity from ShipTypeSO injected at runtime; upgrades add 25 each
          // GameManager must call this with the resolved base
          return GetBaseCapacity(ship.typeId) + ship.upgrades.cargo * 25;
      }

      // Fallback base capacity by typeId (mirrors ShipTypeSO data)
      private static int GetBaseCapacity(string typeId) => typeId switch
      {
          "sloop" => 50,
          "brigantine" => 100,
          "galleon" => 200,
          _ => 50
      };

      public static int GetCargoQty(ShipData ship, string resourceId)
      {
          var item = ship.cargo.Find(c => c.resourceId == resourceId);
          return item?.quantity ?? 0;
      }

      public static int GetTotalCargo(ShipData ship)
      {
          int total = 0;
          foreach (var c in ship.cargo) total += c.quantity;
          return total;
      }

      private static void AddCargo(ShipData ship, string resourceId, int qty, int buyPrice)
      {
          var existing = ship.cargo.Find(c => c.resourceId == resourceId);
          if (existing != null)
          {
              // weighted average buy price
              int totalQty = existing.quantity + qty;
              existing.buyPrice = (existing.buyPrice * existing.quantity + buyPrice * qty) / totalQty;
              existing.quantity = totalQty;
          }
          else
          {
              ship.cargo.Add(new CargoItem { resourceId = resourceId, quantity = qty, buyPrice = buyPrice });
          }
      }

      private static int RemoveCargo(ShipData ship, string resourceId, int qty)
      {
          var existing = ship.cargo.Find(c => c.resourceId == resourceId);
          if (existing == null) return 0;
          int removed = Mathf.Min(existing.quantity, qty);
          existing.quantity -= removed;
          if (existing.quantity == 0) ship.cargo.Remove(existing);
          return removed;
      }

      private static Dictionary<string, ResourceSO> BuildResMap(ResourceSO[] resources)
      {
          var map = new Dictionary<string, ResourceSO>();
          foreach (var r in resources) map[r.id] = r;
          return map;
      }
  }
  ```

- [ ] **Step 2: Verify — Unity compiles**

- [ ] **Step 3: Commit**

  ```bash
  git add Assets/Scripts/Systems/EconomySystem.cs
  git commit -m "feat(unity): EconomySystem — price tick, buy/sell, fee rate, cargo management"
  ```

---

### Task 6: TaxSystem

**Files:**
- Create: `Assets/Scripts/Systems/TaxSystem.cs`

- [ ] **Step 1: Create TaxSystem.cs**

  ```csharp
  // Assets/Scripts/Systems/TaxSystem.cs
  using UnityEngine;

  public static class TaxSystem
  {
      // Returns current tax amount due based on taxLevel
      public static int CalcTax(GameState gs)
      {
          return Mathf.RoundToInt(GameConstants.TAX_BASE * Mathf.Pow(GameConstants.TAX_LEVEL_MULTIPLIER, gs.taxLevel));
      }

      // Called by GameManager on tax interval tick
      // Returns amount paid (0 if already paid recently)
      public static int PayTax(GameState gs)
      {
          long nowMs = System.DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
          if (nowMs - gs.lastTaxTime < GameConstants.TAX_INTERVAL_SECONDS * 1000L)
              return 0;

          int due = CalcTax(gs);
          gs.gold = Mathf.Max(0, gs.gold - due);
          gs.taxLevel++;              // escalate after each payment
          gs.lastTaxTime = nowMs;
          return due;
      }

      // Called when player buys a new ship
      public static void OnShipPurchase(GameState gs)
      {
          gs.taxLevel++;
      }
  }
  ```

- [ ] **Step 2: Verify — Unity compiles**

- [ ] **Step 3: Commit**

  ```bash
  git add Assets/Scripts/Systems/TaxSystem.cs
  git commit -m "feat(unity): TaxSystem — exponential escalation on pay + ship purchase"
  ```

---

### Task 7: CrewSystem

**Files:**
- Create: `Assets/Scripts/Systems/CrewSystem.cs`

- [ ] **Step 1: Create CrewSystem.cs**

  ```csharp
  // Assets/Scripts/Systems/CrewSystem.cs
  using System.Collections.Generic;
  using UnityEngine;

  public static class CrewSystem
  {
      private static readonly string[] Names = {
          "알론소","베아트리스","카를로스","디에고","에스테반","페르난도",
          "가브리엘","에르난","이사벨","하비에르","루이스","마리아",
          "니콜라스","오스카르","파블로","라파엘","세바스티안","테레사"
      };

      private static readonly string[] Rarities = { "common","uncommon","rare","legendary" };
      private static readonly float[] RarityWeights = { 0.55f, 0.28f, 0.13f, 0.04f };

      private static readonly string[] Specialties = { "","navigator","merchant","engineer","captain" };
      private static readonly float[] SpecialtyWeights = { 0.50f, 0.15f, 0.15f, 0.10f, 0.10f };

      public static void RefreshAvailableCrew(GameState gs)
      {
          gs.availableCrew = new List<CrewMember>();
          for (int i = 0; i < GameConstants.CREW_POOL_SIZE; i++)
              gs.availableCrew.Add(GenerateCrew());
      }

      public static CrewMember GenerateCrew()
      {
          string rarity = WeightedPick(Rarities, RarityWeights);
          string specialty = WeightedPick(Specialties, SpecialtyWeights);

          int statBase = rarity switch { "uncommon" => 35, "rare" => 55, "legendary" => 75, _ => 20 };
          int statRange = rarity switch { "uncommon" => 25, "rare" => 30, "legendary" => 25, _ => 30 };

          int nav  = Mathf.Clamp(statBase + Random.Range(0, statRange), 0, 100);
          int trade = Mathf.Clamp(statBase + Random.Range(0, statRange), 0, 100);
          int stam = Mathf.Clamp(statBase + Random.Range(0, statRange), 0, 100);
          int rep  = Mathf.Clamp(statBase + Random.Range(0, statRange), 0, 100);

          int navBonus = 0, tradingBonus = 0;
          if (specialty == "navigator") navBonus = Random.Range(10, 30);
          if (specialty == "merchant") tradingBonus = Random.Range(10, 30);
          if (specialty == "captain") { navBonus = Random.Range(5, 15); tradingBonus = Random.Range(5, 15); }

          int baseWage = rarity switch { "uncommon" => 40, "rare" => 80, "legendary" => 150, _ => 20 };
          int hiringFee = baseWage * Random.Range(3, 6);

          return new CrewMember
          {
              id = System.Guid.NewGuid().ToString(),
              name = Names[Random.Range(0, Names.Length)],
              rarity = rarity,
              specialty = specialty,
              navigation = nav,
              trading = trade,
              stamina = stam,
              repair = rep,
              navBonus = navBonus,
              tradingBonus = tradingBonus,
              weeklyWage = baseWage,
              hiringFee = hiringFee
          };
      }

      // Hire crew member from available pool to ship
      public static bool HireCrew(GameState gs, string crewId, string shipId)
      {
          var member = gs.availableCrew.Find(c => c.id == crewId);
          if (member == null) return false;
          if (gs.gold < member.hiringFee) return false;

          var ship = gs.ships.Find(s => s.id == shipId);
          if (ship == null) return false;

          int maxCrew = GetMaxCrew(ship);
          if (ship.crewIds.Count >= maxCrew) return false;

          gs.gold -= member.hiringFee;
          gs.availableCrew.Remove(member);
          gs.crew.Add(member);
          ship.crewIds.Add(member.id);
          return true;
      }

      public static void FireCrew(GameState gs, string crewId, string shipId)
      {
          var ship = gs.ships.Find(s => s.id == shipId);
          ship?.crewIds.Remove(crewId);
          gs.crew.RemoveAll(c => c.id == crewId);
      }

      // Effective speed multiplier from crew navigation stats
      public static float GetSpeedMultiplier(GameState gs, ShipData ship)
      {
          float totalNav = 0f;
          foreach (var id in ship.crewIds)
          {
              var m = gs.crew.Find(c => c.id == id);
              if (m != null) totalNav += m.navigation + m.navBonus;
          }
          float avgNav = ship.crewIds.Count > 0 ? totalNav / ship.crewIds.Count : 0f;
          return 1f + avgNav * GameConstants.NAV_SPEED_BONUS_PER_POINT;
      }

      private static int GetMaxCrew(ShipData ship)
      {
          int baseMax = ship.typeId switch { "brigantine" => 8, "galleon" => 14, _ => 4 };
          return baseMax + ship.upgrades.crew;
      }

      private static string WeightedPick(string[] options, float[] weights)
      {
          float roll = Random.value;
          float cumulative = 0f;
          for (int i = 0; i < options.Length; i++)
          {
              cumulative += weights[i];
              if (roll < cumulative) return options[i];
          }
          return options[options.Length - 1];
      }
  }
  ```

- [ ] **Step 2: Verify — Unity compiles**

- [ ] **Step 3: Commit**

  ```bash
  git add Assets/Scripts/Systems/CrewSystem.cs
  git commit -m "feat(unity): CrewSystem — generation, hire/fire, speed multiplier"
  ```

---

### Task 8: QuestSystem

**Files:**
- Create: `Assets/Scripts/Systems/QuestSystem.cs`

- [ ] **Step 1: Create QuestSystem.cs**

  ```csharp
  // Assets/Scripts/Systems/QuestSystem.cs
  using System.Collections.Generic;
  using UnityEngine;

  public static class QuestSystem
  {
      private static readonly string[] Types = { "deliver","profit","explore","trade" };

      public static void GenerateQuests(GameState gs, PortSO[] ports)
      {
          gs.availableQuests = new List<QuestData>();
          for (int i = 0; i < 3; i++)
              gs.availableQuests.Add(CreateQuest(ports));
      }

      private static QuestData CreateQuest(PortSO[] ports)
      {
          string type = Types[Random.Range(0, Types.Length)];
          var port = ports[Random.Range(0, ports.Length)];

          string desc;
          int rewardGold;
          int target = 0;

          switch (type)
          {
              case "deliver":
                  target = Random.Range(5, 25);
                  rewardGold = target * Random.Range(20, 50);
                  desc = $"{port.displayName}에 상품 {target}개 납품";
                  break;
              case "profit":
                  target = Random.Range(500, 3000);
                  rewardGold = Mathf.RoundToInt(target * 0.3f);
                  desc = $"무역 이익 {target}골드 달성";
                  break;
              case "explore":
                  target = Random.Range(3, 6);
                  rewardGold = target * 200;
                  desc = $"항구 {target}곳 방문";
                  break;
              default:
                  target = Random.Range(10, 30);
                  rewardGold = target * 30;
                  desc = $"거래 {target}회 완료";
                  break;
          }

          return new QuestData
          {
              id = System.Guid.NewGuid().ToString(),
              type = type,
              description = desc,
              targetPortId = port.id,
              targetAmount = target,
              rewardGold = rewardGold,
              rewardGems = Random.Range(0, 3),
              progress = 0,
              completed = false,
              claimed = false
          };
      }

      public static bool AcceptQuest(GameState gs, string questId)
      {
          if (gs.activeQuests.Count >= 3) return false;
          var q = gs.availableQuests.Find(x => x.id == questId);
          if (q == null) return false;
          gs.availableQuests.Remove(q);
          gs.activeQuests.Add(q);
          return true;
      }

      // Called after each trade/explore action to update progress
      public static void UpdateProgress(GameState gs, string eventType, int amount = 1)
      {
          foreach (var q in gs.activeQuests)
          {
              if (q.completed) continue;
              bool match = q.type switch
              {
                  "trade"   => eventType == "trade",
                  "profit"  => eventType == "profit",
                  "explore" => eventType == "explore",
                  "deliver" => eventType == "deliver",
                  _ => false
              };
              if (!match) continue;
              q.progress = Mathf.Min(q.progress + amount, q.targetAmount);
              if (q.progress >= q.targetAmount) q.completed = true;
          }
      }

      public static bool ClaimReward(GameState gs, string questId)
      {
          var q = gs.activeQuests.Find(x => x.id == questId);
          if (q == null || !q.completed || q.claimed) return false;
          gs.gold += q.rewardGold;
          gs.gems += q.rewardGems;
          q.claimed = true;
          gs.activeQuests.Remove(q);
          return true;
      }
  }
  ```

- [ ] **Step 2: Verify — Unity compiles**

- [ ] **Step 3: Commit**

  ```bash
  git add Assets/Scripts/Systems/QuestSystem.cs
  git commit -m "feat(unity): QuestSystem — generate, accept, progress, reward"
  ```

---

### Task 9: InfoSystem

**Files:**
- Create: `Assets/Scripts/Systems/InfoSystem.cs`

- [ ] **Step 1: Create InfoSystem.cs**

  ```csharp
  // Assets/Scripts/Systems/InfoSystem.cs
  using System.Collections.Generic;
  using UnityEngine;

  public static class InfoSystem
  {
      private static readonly string[] Directions = { "up", "down" };

      // Called when ship arrives at a port for the first time
      public static void OnNewPortArrival(GameState gs, string portId, string portName, ResourceSO[] resources)
      {
          if (Random.value > GameConstants.RUMOR_CHANCE_NEW_PORT) return;

          var res = resources[Random.Range(0, resources.Length)];
          var pred = MakePrediction("rumor", "basic", portId, portName, res.id, 30, 0.05f, 0.15f, Random.Range(1, 4));
          gs.predictions.Add(pred);
          if (gs.predictions.Count > 30) gs.predictions.RemoveAt(0);
      }

      // Called every price tick to apply due predictions
      public static void TickPredictions(GameState gs, ResourceSO[] resources)
      {
          foreach (var p in gs.predictions)
          {
              if (p.applied) continue;
              p.turnsRemaining--;
              if (p.turnsRemaining <= 0)
              {
                  ApplyPrediction(gs, p, resources);
                  p.applied = true;
              }
          }
          // Remove old applied predictions
          gs.predictions.RemoveAll(p => p.applied && p.turnsRemaining < -5);
      }

      // Buy a prediction tier (hint/info/report) from a specific port
      public static bool BuyPrediction(GameState gs, string tier, string portId, string portName, ResourceSO[] resources)
      {
          int cost = tier switch { "hint" => GameConstants.INFO_TIER_COST[1], "info" => GameConstants.INFO_TIER_COST[2], "report" => GameConstants.INFO_TIER_COST[3], _ => 0 };
          if (gs.gold < cost) return false;
          gs.gold -= cost;

          int accuracy = tier switch { "hint" => 50, "info" => 70, "report" => 90, _ => 30 };
          int turns = tier switch { "hint" => Random.Range(1, 3), "info" => 1, "report" => 1, _ => Random.Range(1, 4) };
          float magMin = tier switch { "hint" => 0.08f, "info" => 0.10f, "report" => 0.12f, _ => 0.05f };
          float magMax = tier switch { "hint" => 0.20f, "info" => 0.25f, "report" => 0.30f, _ => 0.15f };
          string quality = tier switch { "hint" => "standard", "info" => "premium", "report" => "elite", _ => "basic" };

          var res = resources[Random.Range(0, resources.Length)];
          var pred = MakePrediction(tier, quality, portId, portName, res.id, accuracy, magMin, magMax, turns);
          gs.predictions.Add(pred);
          if (gs.predictions.Count > 30) gs.predictions.RemoveAt(0);
          return true;
      }

      private static PredictionData MakePrediction(string tier, string quality, string portId, string portName,
          string resourceId, int accuracy, float magMin, float magMax, int turns)
      {
          return new PredictionData
          {
              id = System.Guid.NewGuid().ToString(),
              tier = tier,
              quality = quality,
              portId = portId,
              portName = portName,
              resourceId = resourceId,
              direction = Directions[Random.Range(0, 2)],
              accuracy = accuracy,
              magnitude = Random.Range(magMin, magMax),
              turnsRemaining = turns,
              applied = false
          };
      }

      private static void ApplyPrediction(GameState gs, PredictionData p, ResourceSO[] resources)
      {
          // Accuracy check: if fails, flip direction
          bool accurate = Random.value * 100f < p.accuracy;
          string actualDir = accurate ? p.direction : (p.direction == "up" ? "down" : "up");

          var pd = gs.prices.Find(x => x.portId == p.portId && x.resourceId == p.resourceId);
          if (pd == null) return;

          var res = System.Array.Find(resources, r => r.id == p.resourceId);
          if (res == null) return;

          float change = actualDir == "up" ? p.magnitude : -p.magnitude;
          pd.currentPrice = Mathf.Clamp(Mathf.RoundToInt(pd.currentPrice * (1f + change)), res.priceMin, res.priceMax);
          pd.priceHistory.Add(pd.currentPrice);
          if (pd.priceHistory.Count > GameConstants.PRICE_HISTORY_MAX)
              pd.priceHistory.RemoveAt(0);
      }
  }
  ```

- [ ] **Step 2: Verify — Unity compiles**

- [ ] **Step 3: Commit**

  ```bash
  git add Assets/Scripts/Systems/InfoSystem.cs
  git commit -m "feat(unity): InfoSystem — rumor on new port (20%), buy predictions, tick apply"
  ```

---

### Task 10: EventSystem

**Files:**
- Create: `Assets/Scripts/Systems/EventSystem.cs`

- [ ] **Step 1: Create EventSystem.cs**

  ```csharp
  // Assets/Scripts/Systems/EventSystem.cs
  using System;
  using UnityEngine;

  public static class EventSystem
  {
      public class EventResult
      {
          public string type;
          public string message;
          public int goldDelta;
          public int fuelDelta;
          public int hullDelta;
          public int stormDurationMs;
      }

      // Call every 5 seconds while ship is at sea
      public static EventResult TryTriggerEvent(GameState gs, ShipData ship)
      {
          if (ship.isDocked) return null;
          if (UnityEngine.Random.value > GameConstants.EVENT_CHANCE_PER_TICK) return null;

          string type = WeightedEventType();
          return ApplyEvent(gs, ship, type);
      }

      private static string WeightedEventType()
      {
          int[] weights = GameConstants.EVENT_WEIGHTS;
          string[] types = GameConstants.EVENT_TYPES;

          int total = 0;
          foreach (var w in weights) total += w;
          int roll = UnityEngine.Random.Range(0, total);

          int cumulative = 0;
          for (int i = 0; i < weights.Length; i++)
          {
              cumulative += weights[i];
              if (roll < cumulative) return types[i];
          }
          return types[types.Length - 1];
      }

      private static EventResult ApplyEvent(GameState gs, ShipData ship, string type)
      {
          var result = new EventResult { type = type };

          switch (type)
          {
              case "storm":
              {
                  float hullPct = UnityEngine.Random.Range(GameConstants.STORM_HULL_DMG_MIN, GameConstants.STORM_HULL_DMG_MAX);
                  float fuelPct = UnityEngine.Random.Range(GameConstants.STORM_FUEL_DMG_MIN, GameConstants.STORM_FUEL_DMG_MAX);
                  int maxHull = ship.typeId switch { "brigantine" => 150, "galleon" => 200, _ => 100 };
                  int hullDmg = Mathf.RoundToInt(maxHull * hullPct);
                  int fuelDmg = Mathf.RoundToInt(GetMaxFuel(ship.typeId) * fuelPct);
                  ship.hull = Mathf.Max(0, ship.hull - hullDmg);
                  ship.fuel = Mathf.Max(0, ship.fuel - fuelDmg);
                  result.hullDelta = -hullDmg;
                  result.fuelDelta = -fuelDmg;
                  result.stormDurationMs = UnityEngine.Random.Range(GameConstants.STORM_DURATION_MIN_MS, GameConstants.STORM_DURATION_MAX_MS);
                  result.message = $"폭풍 발생! 선체 -{hullDmg}, 연료 -{fuelDmg}";
                  break;
              }
              case "pirate":
              {
                  float stealPct = UnityEngine.Random.Range(GameConstants.PIRATE_STEAL_MIN, GameConstants.PIRATE_STEAL_MAX);
                  int stolen = Mathf.RoundToInt(gs.gold * stealPct);
                  gs.gold = Mathf.Max(0, gs.gold - stolen);
                  result.goldDelta = -stolen;
                  result.message = $"해적 출몰! 금화 {stolen}개 강탈당했습니다!";
                  break;
              }
              case "current":
              {
                  int fuelGain = UnityEngine.Random.Range(GameConstants.CURRENT_FUEL_MIN, GameConstants.CURRENT_FUEL_MAX + 1);
                  ship.fuel = Mathf.Min(GetMaxFuel(ship.typeId), ship.fuel + fuelGain);
                  result.fuelDelta = fuelGain;
                  result.message = $"순풍을 만났습니다! 연료 +{fuelGain}";
                  break;
              }
              case "whale":
              {
                  int gold = UnityEngine.Random.Range(GameConstants.WHALE_GOLD_MIN, GameConstants.WHALE_GOLD_MIN + GameConstants.WHALE_GOLD_MAX + 1);
                  gs.gold += gold;
                  result.goldDelta = gold;
                  result.message = $"고래를 발견했습니다! 금화 +{gold}";
                  break;
              }
              case "wreck":
              {
                  int gold = UnityEngine.Random.Range(50, 250);
                  gs.gold += gold;
                  result.goldDelta = gold;
                  result.message = $"난파선 발견! 금화 +{gold}";
                  break;
              }
              case "treasure":
              {
                  int gems = UnityEngine.Random.Range(1, 4);
                  gs.gems += gems;
                  result.message = $"보물 발견! 보석 +{gems}";
                  break;
              }
          }

          return result;
      }

      private static float GetMaxFuel(string typeId) => typeId switch { "brigantine" => 150f, "galleon" => 200f, _ => 100f };
  }
  ```

- [ ] **Step 2: Verify — Unity compiles**

- [ ] **Step 3: Commit**

  ```bash
  git add Assets/Scripts/Systems/EventSystem.cs
  git commit -m "feat(unity): EventSystem — storm/pirate/current/whale/wreck/treasure with new weights"
  ```

---

### Task 11: DailyGoalSystem

**Files:**
- Create: `Assets/Scripts/Systems/DailyGoalSystem.cs`

- [ ] **Step 1: Create DailyGoalSystem.cs**

  ```csharp
  // Assets/Scripts/Systems/DailyGoalSystem.cs
  using System;
  using System.Collections.Generic;
  using UnityEngine;

  public static class DailyGoalSystem
  {
      private static readonly string[] GoalTypes = { "profit","trade","explore","crew" };

      public static void CheckAndReset(GameState gs)
      {
          string today = DateTime.UtcNow.ToString("yyyy-MM-dd");
          if (gs.lastGoalResetDate == today) return;
          GenerateGoals(gs);
          gs.lastGoalResetDate = today;
      }

      public static void GenerateGoals(GameState gs)
      {
          gs.dailyGoals = new List<DailyGoalData>();
          for (int i = 0; i < GameConstants.DAILY_GOAL_COUNT; i++)
              gs.dailyGoals.Add(CreateGoal(GoalTypes[i]));
      }

      private static DailyGoalData CreateGoal(string type)
      {
          string desc;
          int target;
          int reward;

          switch (type)
          {
              case "profit":
                  target = UnityEngine.Random.Range(500, 2000);
                  reward = Mathf.RoundToInt(target * 0.2f);
                  desc = $"오늘 이익 {target}골드 달성";
                  break;
              case "trade":
                  target = UnityEngine.Random.Range(5, 20);
                  reward = target * 25;
                  desc = $"오늘 거래 {target}회 완료";
                  break;
              case "explore":
                  target = UnityEngine.Random.Range(2, 5);
                  reward = target * 150;
                  desc = $"오늘 항구 {target}곳 방문";
                  break;
              default:
                  target = 1;
                  reward = 200;
                  desc = "선원 1명 고용";
                  break;
          }

          return new DailyGoalData
          {
              id = System.Guid.NewGuid().ToString(),
              type = type,
              description = desc,
              target = target,
              progress = 0,
              rewardGold = reward,
              completed = false,
              claimed = false
          };
      }

      public static void UpdateProgress(GameState gs, string eventType, int amount = 1)
      {
          foreach (var goal in gs.dailyGoals)
          {
              if (goal.completed) continue;
              bool match = goal.type switch
              {
                  "trade" => eventType == "trade",
                  "profit" => eventType == "profit",
                  "explore" => eventType == "explore",
                  "crew" => eventType == "crew",
                  _ => false
              };
              if (!match) continue;
              goal.progress = Mathf.Min(goal.progress + amount, goal.target);
              if (goal.progress >= goal.target) goal.completed = true;
          }
      }

      public static bool ClaimReward(GameState gs, string goalId)
      {
          var goal = gs.dailyGoals.Find(g => g.id == goalId);
          if (goal == null || !goal.completed || goal.claimed) return false;
          gs.gold += goal.rewardGold;
          goal.claimed = true;
          return true;
      }
  }
  ```

- [ ] **Step 2: Verify — Unity compiles**

- [ ] **Step 3: Commit**

  ```bash
  git add Assets/Scripts/Systems/DailyGoalSystem.cs
  git commit -m "feat(unity): DailyGoalSystem — midnight reset, 4 goals, progress, reward claim"
  ```

---

### Task 12: SaveSystem

**Files:**
- Create: `Assets/Scripts/Core/SaveSystem.cs`

- [ ] **Step 1: Create SaveSystem.cs**

  ```csharp
  // Assets/Scripts/Core/SaveSystem.cs
  using UnityEngine;
  using Newtonsoft.Json;

  public static class SaveSystem
  {
      private const string SAVE_KEY = "pioneer_save_v1";

      public static void Save(GameState gs)
      {
          string json = JsonConvert.SerializeObject(gs);
          PlayerPrefs.SetString(SAVE_KEY, json);
          PlayerPrefs.Save();
      }

      public static GameState Load()
      {
          if (!PlayerPrefs.HasKey(SAVE_KEY)) return null;
          try
          {
              string json = PlayerPrefs.GetString(SAVE_KEY);
              return JsonConvert.DeserializeObject<GameState>(json);
          }
          catch (System.Exception e)
          {
              Debug.LogWarning($"[SaveSystem] Load failed: {e.Message}");
              return null;
          }
      }

      public static void Delete()
      {
          PlayerPrefs.DeleteKey(SAVE_KEY);
          PlayerPrefs.Save();
      }

      public static bool HasSave() => PlayerPrefs.HasKey(SAVE_KEY);
  }
  ```

- [ ] **Step 2: Verify — Unity compiles**

- [ ] **Step 3: Commit**

  ```bash
  git add Assets/Scripts/Core/SaveSystem.cs
  git commit -m "feat(unity): SaveSystem — PlayerPrefs JSON (WebGL compatible)"
  ```

---

### Task 13: GameManager

**Files:**
- Create: `Assets/Scripts/Core/GameManager.cs`

- [ ] **Step 1: Create GameManager.cs**

  ```csharp
  // Assets/Scripts/Core/GameManager.cs
  using System;
  using System.Collections;
  using UnityEngine;

  public class GameManager : MonoBehaviour
  {
      public static GameManager Instance { get; private set; }

      [Header("ScriptableObject References")]
      public ShipTypeSO[] shipTypes;
      public PortSO[] ports;
      public ResourceSO[] resources;

      public GameState State { get; private set; }

      // Timers
      private float _priceTimer;
      private float _taxTimer;
      private float _eventTimer;
      private float _saveTimer;

      private const float SAVE_INTERVAL = 30f;

      public event Action<GameState> OnStateChanged;
      public event Action<EventSystem.EventResult> OnEvent;
      public event Action<string> OnLog;

      void Awake()
      {
          if (Instance != null && Instance != this) { Destroy(gameObject); return; }
          Instance = this;
          DontDestroyOnLoad(gameObject);
      }

      void Start()
      {
          var saved = SaveSystem.Load();
          if (saved != null)
              State = saved;
          else
              InitNewGame();

          DailyGoalSystem.CheckAndReset(State);
          NotifyChanged();
      }

      void Update()
      {
          if (State == null) return;

          _priceTimer += Time.deltaTime;
          if (_priceTimer >= GameConstants.PRICE_TICK_SECONDS)
          {
              _priceTimer = 0f;
              EconomySystem.TickPrices(State, resources);
              InfoSystem.TickPredictions(State, resources);
              State.day++;
              NotifyChanged();
          }

          _taxTimer += Time.deltaTime;
          if (_taxTimer >= GameConstants.TAX_INTERVAL_SECONDS)
          {
              _taxTimer = 0f;
              int paid = TaxSystem.PayTax(State);
              if (paid > 0) AddLog($"세금 {paid}골드 납부. (세금 등급 {State.taxLevel})");
              NotifyChanged();
          }

          _saveTimer += Time.deltaTime;
          if (_saveTimer >= SAVE_INTERVAL)
          {
              _saveTimer = 0f;
              SaveSystem.Save(State);
          }

          // Event ticks are driven by ShipController calling TryTriggerEvent
      }

      private void InitNewGame()
      {
          State = GameState.CreateNew();
          EconomySystem.InitPrices(State, ports, resources);
          CrewSystem.RefreshAvailableCrew(State);
          QuestSystem.GenerateQuests(State, ports);
          DailyGoalSystem.GenerateGoals(State);

          // Start with one sloop at Lisbon
          var sloopType = Array.Find(shipTypes, s => s.id == "sloop");
          var lisbon = Array.Find(ports, p => p.id == "lisbon");
          var startShip = new ShipData
          {
              id = Guid.NewGuid().ToString(),
              typeId = "sloop",
              name = "선구자호",
              x = lisbon != null ? lisbon.mapPosition.x : 10f,
              y = lisbon != null ? lisbon.mapPosition.y : 45f,
              targetX = lisbon != null ? lisbon.mapPosition.x : 10f,
              targetY = lisbon != null ? lisbon.mapPosition.y : 45f,
              fuel = 100f,
              hull = 100,
              crewIds = new System.Collections.Generic.List<string>(),
              cargo = new System.Collections.Generic.List<CargoItem>(),
              upgrades = new ShipUpgrades(),
              isDocked = true,
              dockedPortId = "lisbon"
          };
          State.ships.Add(startShip);
          State.activeShipId = startShip.id;
          State.visitedPorts.Add("lisbon");
      }

      // Called by UI when player buys a new ship
      public bool BuyShip(string typeId)
      {
          var type = Array.Find(shipTypes, s => s.id == typeId);
          if (type == null) return false;
          if (State.gold < type.buyPrice) return false;

          State.gold -= type.buyPrice;
          TaxSystem.OnShipPurchase(State);

          var portSO = Array.Find(ports, p => p.id == "lisbon");
          var ship = new ShipData
          {
              id = Guid.NewGuid().ToString(),
              typeId = typeId,
              name = $"{type.displayName}호",
              x = portSO != null ? portSO.mapPosition.x : 10f,
              y = portSO != null ? portSO.mapPosition.y : 45f,
              targetX = portSO != null ? portSO.mapPosition.x : 10f,
              targetY = portSO != null ? portSO.mapPosition.y : 45f,
              fuel = type.fuelCapacity,
              hull = type.hullMax,
              crewIds = new System.Collections.Generic.List<string>(),
              cargo = new System.Collections.Generic.List<CargoItem>(),
              upgrades = new ShipUpgrades(),
              isDocked = true,
              dockedPortId = "lisbon"
          };
          State.ships.Add(ship);
          AddLog($"{ship.name} 구입 완료! (세금 등급 {State.taxLevel})");
          NotifyChanged();
          return true;
      }

      // Called by ShipController on port arrival
      public void OnShipArrivedAtPort(ShipData ship, string portId)
      {
          bool isNew = !State.visitedPorts.Contains(portId);
          if (isNew)
          {
              State.visitedPorts.Add(portId);
              var portSO = Array.Find(ports, p => p.id == portId);
              string portName = portSO != null ? portSO.displayName : portId;
              InfoSystem.OnNewPortArrival(State, portId, portName, resources);
              DailyGoalSystem.UpdateProgress(State, "explore");
              QuestSystem.UpdateProgress(State, "explore");
              AddLog($"{portName} 첫 방문!");
          }
          ship.isDocked = true;
          ship.dockedPortId = portId;
          NotifyChanged();
      }

      public void HandleEventResult(EventSystem.EventResult result, ShipData ship)
      {
          AddLog(result.message);
          OnEvent?.Invoke(result);
          NotifyChanged();
      }

      public void NotifyChanged() => OnStateChanged?.Invoke(State);

      public void AddLog(string msg)
      {
          Debug.Log($"[Pioneer] {msg}");
          OnLog?.Invoke(msg);
      }

      void OnApplicationPause(bool paused)
      {
          if (paused && State != null) SaveSystem.Save(State);
      }

      void OnApplicationQuit()
      {
          if (State != null) SaveSystem.Save(State);
      }
  }
  ```

- [ ] **Step 2: In Unity Editor, create an empty GameObject named "GameManager" in Main.unity**

  Attach the `GameManager` script. Assign all ShipTypeSO, PortSO, ResourceSO assets to the inspector arrays.

- [ ] **Step 3: Verify — Enter Play mode, check Console for no errors**

  Expected: No exceptions. `[Pioneer]` logs should not appear until game systems trigger.

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "feat(unity): GameManager singleton — owns GameState, ticks all systems, save on pause/quit"
  ```

---

## Self-Review

**Spec coverage check:**
- [x] Unity 2022.3 LTS, URP — Task 1
- [x] Newtonsoft.Json — Task 1
- [x] ShipTypeSO, PortSO, ResourceSO — Task 2
- [x] All runtime data types — Task 3
- [x] GameConstants (all magic numbers) — Task 4
- [x] Economy: price tick, buy/sell, fee rate — Task 5
- [x] Tax: exponential, pay + ship purchase — Task 6
- [x] Crew: generate, hire, fire, speed multiplier — Task 7
- [x] Quest: generate, accept, progress, reward — Task 8
- [x] Info: rumor on new port (20%), buy predictions, tick — Task 9
- [x] Events: storm/pirate/current/whale/wreck/treasure, weights 35/30/25/20/8/5 — Task 10
- [x] DailyGoals: midnight reset, 4 goals — Task 11
- [x] SaveSystem: PlayerPrefs JSON — Task 12
- [x] GameManager singleton — Task 13

**Type consistency check:**
- `ShipData.crewIds` → `List<string>` used consistently in CrewSystem, GameManager ✓
- `GameState.prices` → `List<PortPriceData>` used in EconomySystem, InfoSystem ✓
- `EventSystem.EventResult` returned from `TryTriggerEvent` → handled in `GameManager.HandleEventResult` ✓
- `DailyGoalSystem.UpdateProgress(gs, "explore")` matches goal type strings in `DailyGoalData.type` ✓
