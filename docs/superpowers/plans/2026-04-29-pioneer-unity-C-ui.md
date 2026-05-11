# Pioneer Unity — Plan C: UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all game UI panels as uGUI Canvas overlays — Header (gold/gems/day), Fleet panel, Ship Detail + Upgrade, Port Price panel with chart, Market popup, Crew hire panel, Quest panel, Daily Goals widget, Info/Prediction purchase panel, and Event log.

**Architecture:** One `UIManager` MonoBehaviour subscribes to `GameManager.OnStateChanged` and refreshes all panels. Each panel is a separate uGUI panel (child of the Canvas) with its own script. Panels show/hide via `SetActive`. No world-space UI — all panels are Screen Space Overlay.

**Tech Stack:** Unity 2022.3 LTS, uGUI (Canvas, Panel, Button, Text, Slider, ScrollRect), C#

**Prerequisite:** Plans A and B must be complete.

---

## File Structure

```
Assets/
  Scripts/
    UI/
      UIManager.cs           — central hub; subscribes to state changes, routes to panels
      HeaderUI.cs            — top bar: gold, gems, day, tax level indicator
      FleetPanel.cs          — ship list sidebar; select active ship
      ShipDetailPanel.cs     — ship stats + upgrades tab
      PortPricePanel.cs      — commodity list + large price chart (SVG-style line graph)
      MarketPanel.cs         — buy/sell per commodity with quantity slider
      CrewPanel.cs           — available crew pool with stat bars + hire button
      QuestPanel.cs          — available + active quests
      DailyGoalPanel.cs      — 4 daily goals with progress bars
      InfoPanel.cs           — prediction list + buy tier buttons
      EventLogPanel.cs       — scrollable log of game events
      PriceChartDrawer.cs    — draws a price history line graph on a RawImage using Texture2D
  Prefabs/
    UI/
      Canvas.prefab
```

---

### Task 1: UIManager + Canvas Setup

**Files:**
- Create: `Assets/Scripts/UI/UIManager.cs`

- [ ] **Step 1: In Unity Editor — create the Canvas**

  GameObject → UI → Canvas.
  Canvas: Render Mode = Screen Space - Overlay.
  Canvas Scaler: UI Scale Mode = Scale With Screen Size. Reference 1920×1080. Match = 0.5.

  Add a `CanvasGroup` to the Canvas root for global fade if needed.

- [ ] **Step 2: Create panel GameObjects as children of Canvas**

  Create these empty panel GameObjects (UI → Panel) as children of Canvas:
  - `Header` — anchored top, height 60px
  - `FleetPanel` — anchored left, width 200px
  - `ShipDetailPanel` — anchored bottom-right, 340×420px, hidden
  - `PortPricePanel` — centered, 600×440px, hidden
  - `MarketPanel` — centered, 460×500px, hidden
  - `CrewPanel` — centered, 560×480px, hidden
  - `QuestPanel` — anchored right, 280×500px, hidden
  - `DailyGoalPanel` — anchored bottom-left, 240×200px
  - `InfoPanel` — centered, 500×440px, hidden
  - `EventLogPanel` — anchored bottom, 100% width×120px

- [ ] **Step 3: Create UIManager.cs**

  ```csharp
  // Assets/Scripts/UI/UIManager.cs
  using UnityEngine;

  public class UIManager : MonoBehaviour
  {
      public static UIManager Instance { get; private set; }

      [Header("Panel References")]
      public HeaderUI headerUI;
      public FleetPanel fleetPanel;
      public ShipDetailPanel shipDetailPanel;
      public PortPricePanel portPricePanel;
      public MarketPanel marketPanel;
      public CrewPanel crewPanel;
      public QuestPanel questPanel;
      public DailyGoalPanel dailyGoalPanel;
      public InfoPanel infoPanel;
      public EventLogPanel eventLogPanel;

      private string _openPanelId;   // one exclusive panel open at a time

      void Awake()
      {
          if (Instance != null && Instance != this) { Destroy(gameObject); return; }
          Instance = this;
      }

      void Start()
      {
          var gm = GameManager.Instance;
          if (gm == null) return;

          gm.OnStateChanged += OnStateChanged;
          gm.OnLog += eventLogPanel.AddEntry;

          // Wire world input events
          WorldInputHandler.OnShipSelected += OnShipSelected;
          WorldInputHandler.OnPortSelected += OnPortSelected;

          // Initial refresh
          OnStateChanged(gm.State);

          // Hide all exclusive panels
          CloseAll();
      }

      private void OnStateChanged(GameState state)
      {
          headerUI.Refresh(state);
          fleetPanel.Refresh(state);
          dailyGoalPanel.Refresh(state);
          eventLogPanel.Refresh();

          // Refresh the currently open exclusive panel
          switch (_openPanelId)
          {
              case "shipDetail": shipDetailPanel.Refresh(state); break;
              case "port":       portPricePanel.Refresh(state);  break;
              case "market":     marketPanel.Refresh(state);     break;
              case "crew":       crewPanel.Refresh(state);       break;
              case "quest":      questPanel.Refresh(state);      break;
              case "info":       infoPanel.Refresh(state);       break;
          }
      }

      private void OnShipSelected(string shipId)
      {
          Open("shipDetail");
          shipDetailPanel.SetShip(shipId);
          shipDetailPanel.Refresh(GameManager.Instance.State);
      }

      private void OnPortSelected(string portId)
      {
          Open("port");
          portPricePanel.SetPort(portId);
          portPricePanel.Refresh(GameManager.Instance.State);
      }

      public void Open(string panelId)
      {
          CloseAll();
          _openPanelId = panelId;
          switch (panelId)
          {
              case "shipDetail": shipDetailPanel.gameObject.SetActive(true); break;
              case "port":       portPricePanel.gameObject.SetActive(true);  break;
              case "market":     marketPanel.gameObject.SetActive(true);     break;
              case "crew":       crewPanel.gameObject.SetActive(true);       break;
              case "quest":      questPanel.gameObject.SetActive(true);      break;
              case "info":       infoPanel.gameObject.SetActive(true);       break;
          }
      }

      public void Close(string panelId)
      {
          if (_openPanelId != panelId) return;
          CloseAll();
      }

      public void CloseAll()
      {
          _openPanelId = null;
          shipDetailPanel.gameObject.SetActive(false);
          portPricePanel.gameObject.SetActive(false);
          marketPanel.gameObject.SetActive(false);
          crewPanel.gameObject.SetActive(false);
          questPanel.gameObject.SetActive(false);
          infoPanel.gameObject.SetActive(false);
      }

      void OnDestroy()
      {
          if (GameManager.Instance != null)
          {
              GameManager.Instance.OnStateChanged -= OnStateChanged;
              GameManager.Instance.OnLog -= eventLogPanel.AddEntry;
          }
          WorldInputHandler.OnShipSelected -= OnShipSelected;
          WorldInputHandler.OnPortSelected -= OnPortSelected;
      }
  }
  ```

- [ ] **Step 4: Attach `UIManager` to the Canvas root. Assign all panel references in inspector.**

- [ ] **Step 5: Verify — Unity compiles (stubs for other panel scripts needed first, see below)**

  Create stub scripts for each panel before wiring inspector. Each stub needs at minimum:
  ```csharp
  using UnityEngine;
  public class HeaderUI : MonoBehaviour { public void Refresh(GameState s) {} }
  // repeat pattern for each panel
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add -A
  git commit -m "feat(unity): UIManager + Canvas setup, panel hierarchy, stub scripts"
  ```

---

### Task 2: HeaderUI

**Files:**
- Modify: `Assets/Scripts/UI/HeaderUI.cs` (replace stub)

- [ ] **Step 1: In Unity Editor — build Header panel layout**

  In the Header panel, add:
  - TextMeshPro text "GoldText" (left anchor)
  - TextMeshPro text "GemsText"
  - TextMeshPro text "DayText"
  - TextMeshPro text "TaxText"
  - Button "QuestBtn" → opens QuestPanel
  - Button "CrewBtn" → opens CrewPanel
  - Button "InfoBtn" → opens InfoPanel

  Use horizontal Layout Group on the Header.

- [ ] **Step 2: Replace stub HeaderUI.cs**

  ```csharp
  // Assets/Scripts/UI/HeaderUI.cs
  using UnityEngine;
  using TMPro;
  using UnityEngine.UI;

  public class HeaderUI : MonoBehaviour
  {
      [SerializeField] private TMP_Text goldText;
      [SerializeField] private TMP_Text gemsText;
      [SerializeField] private TMP_Text dayText;
      [SerializeField] private TMP_Text taxText;
      [SerializeField] private Button questBtn;
      [SerializeField] private Button crewBtn;
      [SerializeField] private Button infoBtn;

      void Start()
      {
          questBtn.onClick.AddListener(() => UIManager.Instance.Open("quest"));
          crewBtn.onClick.AddListener(() => UIManager.Instance.Open("crew"));
          infoBtn.onClick.AddListener(() => UIManager.Instance.Open("info"));
      }

      public void Refresh(GameState state)
      {
          goldText.text = $"金 {state.gold:N0}";
          gemsText.text = $"💎 {state.gems}";
          dayText.text  = $"Day {state.day}";
          int taxDue = TaxSystem.CalcTax(state);
          taxText.text  = $"세금 {taxDue} (Lv{state.taxLevel})";
      }
  }
  ```

- [ ] **Step 3: Assign TMP_Text and Button references in inspector.**

- [ ] **Step 4: Enter Play mode — verify header shows gold/day.**

- [ ] **Step 5: Commit**

  ```bash
  git add Assets/Scripts/UI/HeaderUI.cs
  git commit -m "feat(unity): HeaderUI — gold, gems, day, tax level display + nav buttons"
  ```

---

### Task 3: FleetPanel

**Files:**
- Modify: `Assets/Scripts/UI/FleetPanel.cs`

- [ ] **Step 1: In Unity Editor — build FleetPanel layout**

  FleetPanel (left sidebar, 200×full height):
  - Title text "함대"
  - ScrollRect with Vertical Layout Group for ship cards
  - Button template "ShipCard" (duplicate per ship)
  - Button "BuyShipBtn" at bottom

- [ ] **Step 2: Replace stub FleetPanel.cs**

  ```csharp
  // Assets/Scripts/UI/FleetPanel.cs
  using System.Collections.Generic;
  using UnityEngine;
  using UnityEngine.UI;
  using TMPro;

  public class FleetPanel : MonoBehaviour
  {
      [SerializeField] private Transform cardContainer;
      [SerializeField] private GameObject cardPrefab;   // a Button with child TMP_Text
      [SerializeField] private Button buyShipBtn;
      [SerializeField] private TMP_Text buyShipBtnText;

      private readonly List<GameObject> _cards = new();

      void Start()
      {
          buyShipBtn.onClick.AddListener(OnBuyShipClicked);
      }

      public void Refresh(GameState state)
      {
          // Clear old cards
          foreach (var c in _cards) Destroy(c);
          _cards.Clear();

          foreach (var ship in state.ships)
          {
              var go = Instantiate(cardPrefab, cardContainer);
              var label = go.GetComponentInChildren<TMP_Text>();
              string docked = ship.isDocked ? $"[{ship.dockedPortId}]" : "항해 중";
              label.text = $"{ship.name}\n{docked}\n⛽{ship.fuel:F0} 🛡{ship.hull}";

              var btn = go.GetComponent<Button>();
              string shipId = ship.id;
              btn.onClick.AddListener(() =>
              {
                  GameManager.Instance.State.activeShipId = shipId;
                  UIManager.Instance.Open("shipDetail");
                  UIManager.Instance.shipDetailPanel.SetShip(shipId);
                  UIManager.Instance.shipDetailPanel.Refresh(GameManager.Instance.State);
              });

              // Highlight active ship
              bool isActive = ship.id == state.activeShipId;
              go.GetComponent<Image>().color = isActive ? new Color(0.3f, 0.5f, 0.8f) : new Color(0.2f, 0.2f, 0.2f);
              _cards.Add(go);
          }

          // Show buy button only if player can afford brigantine or galleon
          buyShipBtnText.text = "새 배 구입";
          buyShipBtn.gameObject.SetActive(state.gold >= 3000);
      }

      private void OnBuyShipClicked()
      {
          // Simple: buy cheapest available ship
          var gm = GameManager.Instance;
          string typeId = gm.State.gold >= 8000 ? "galleon" : "brigantine";
          bool bought = gm.BuyShip(typeId);
          if (!bought) Debug.Log("[FleetPanel] Not enough gold");
      }
  }
  ```

- [ ] **Step 3: Create a ShipCard prefab: Button + child TMP_Text. Assign to `cardPrefab`. Assign `cardContainer` to the ScrollRect content.**

- [ ] **Step 4: Enter Play mode — verify one sloop card appears.**

- [ ] **Step 5: Commit**

  ```bash
  git add Assets/Scripts/UI/FleetPanel.cs
  git commit -m "feat(unity): FleetPanel — ship cards with fuel/hull, select active ship, buy ship button"
  ```

---

### Task 4: PriceChartDrawer

**Files:**
- Create: `Assets/Scripts/UI/PriceChartDrawer.cs`

- [ ] **Step 1: Create PriceChartDrawer.cs**

  ```csharp
  // Assets/Scripts/UI/PriceChartDrawer.cs
  using System.Collections.Generic;
  using UnityEngine;
  using UnityEngine.UI;

  /// Draws a price history line chart into a RawImage using a Texture2D.
  public class PriceChartDrawer : MonoBehaviour
  {
      [SerializeField] private RawImage target;
      [SerializeField] private int texWidth  = 300;
      [SerializeField] private int texHeight = 120;

      private Texture2D _tex;

      void Awake()
      {
          _tex = new Texture2D(texWidth, texHeight, TextureFormat.RGBA32, false);
          target.texture = _tex;
      }

      public void Draw(List<int> history, Color lineColor)
      {
          if (history == null || history.Count < 2) return;

          // Clear to dark background
          Color bg = new Color(0.1f, 0.12f, 0.15f, 1f);
          Color[] pixels = new Color[texWidth * texHeight];
          for (int i = 0; i < pixels.Length; i++) pixels[i] = bg;

          int min = int.MaxValue, max = int.MinValue;
          foreach (var v in history) { if (v < min) min = v; if (v > max) max = v; }
          if (max == min) max = min + 1;

          // Draw polyline
          int count = history.Count;
          for (int i = 0; i < count - 1; i++)
          {
              float x0 = (float)i / (count - 1) * (texWidth - 1);
              float y0 = (float)(history[i] - min) / (max - min) * (texHeight - 8) + 4;
              float x1 = (float)(i + 1) / (count - 1) * (texWidth - 1);
              float y1 = (float)(history[i + 1] - min) / (max - min) * (texHeight - 8) + 4;

              DrawLine(pixels, (int)x0, (int)y0, (int)x1, (int)y1, lineColor);
          }

          // Last point dot
          float lx = texWidth - 1;
          float ly = (float)(history[count - 1] - min) / (max - min) * (texHeight - 8) + 4;
          DrawDot(pixels, (int)lx, (int)ly, Color.white, 3);

          _tex.SetPixels(pixels);
          _tex.Apply();
      }

      private void DrawLine(Color[] pixels, int x0, int y0, int x1, int y1, Color c)
      {
          int dx = Mathf.Abs(x1 - x0), dy = Mathf.Abs(y1 - y0);
          int sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
          int err = dx - dy;
          while (true)
          {
              SetPixelSafe(pixels, x0, y0, c);
              if (x0 == x1 && y0 == y1) break;
              int e2 = err * 2;
              if (e2 > -dy) { err -= dy; x0 += sx; }
              if (e2 < dx)  { err += dx; y0 += sy; }
          }
      }

      private void DrawDot(Color[] pixels, int cx, int cy, Color c, int radius)
      {
          for (int dx = -radius; dx <= radius; dx++)
          for (int dy = -radius; dy <= radius; dy++)
              if (dx*dx + dy*dy <= radius*radius)
                  SetPixelSafe(pixels, cx + dx, cy + dy, c);
      }

      private void SetPixelSafe(Color[] pixels, int x, int y, Color c)
      {
          if (x < 0 || x >= texWidth || y < 0 || y >= texHeight) return;
          pixels[y * texWidth + x] = c;
      }

      void OnDestroy()
      {
          if (_tex != null) Destroy(_tex);
      }
  }
  ```

- [ ] **Step 2: Verify — Unity compiles**

- [ ] **Step 3: Commit**

  ```bash
  git add Assets/Scripts/UI/PriceChartDrawer.cs
  git commit -m "feat(unity): PriceChartDrawer — Bresenham line on Texture2D into RawImage"
  ```

---

### Task 5: PortPricePanel

**Files:**
- Modify: `Assets/Scripts/UI/PortPricePanel.cs`

- [ ] **Step 1: In Unity Editor — build PortPricePanel layout (600×440)**

  Layout: horizontal split.
  Left (160px): ScrollRect with vertical list of commodity rows.
    - Each row: icon TMP_Text + name TMP_Text + price TMP_Text + change badge TMP_Text.
  Right (440px):
    - Large chart RawImage (300×120px) with PriceChartDrawer.
    - TMP_Text currentPriceText (large, 28pt).
    - TMP_Text changePctText.
    - Row of 3: highText, lowText, rangeText.
    - Button "MarketBtn" → opens MarketPanel.
    - Button "CloseBtn" → closes panel.

  Add PriceChartDrawer component to the RawImage GameObject.

- [ ] **Step 2: Replace stub PortPricePanel.cs**

  ```csharp
  // Assets/Scripts/UI/PortPricePanel.cs
  using System.Collections.Generic;
  using UnityEngine;
  using UnityEngine.UI;
  using TMPro;

  public class PortPricePanel : MonoBehaviour
  {
      [SerializeField] private TMP_Text portNameText;
      [SerializeField] private Transform listContainer;
      [SerializeField] private GameObject rowPrefab;      // TMP_Text x4 in horizontal group

      [Header("Detail (right side)")]
      [SerializeField] private PriceChartDrawer chartDrawer;
      [SerializeField] private TMP_Text currentPriceText;
      [SerializeField] private TMP_Text changePctText;
      [SerializeField] private TMP_Text highText;
      [SerializeField] private TMP_Text lowText;
      [SerializeField] private TMP_Text rangeText;
      [SerializeField] private Button marketBtn;
      [SerializeField] private Button closeBtn;

      private string _portId;
      private string _selectedResourceId;
      private readonly List<GameObject> _rows = new();

      void Start()
      {
          closeBtn.onClick.AddListener(() => UIManager.Instance.Close("port"));
          marketBtn.onClick.AddListener(() =>
          {
              UIManager.Instance.Open("market");
              UIManager.Instance.marketPanel.SetPort(_portId);
              UIManager.Instance.marketPanel.Refresh(GameManager.Instance.State);
          });
      }

      public void SetPort(string portId)
      {
          _portId = portId;
          _selectedResourceId = null;
      }

      public void Refresh(GameState state)
      {
          var gm = GameManager.Instance;
          var portSO = System.Array.Find(gm.ports, p => p.id == _portId);
          portNameText.text = portSO != null ? portSO.displayName : _portId;

          // Rebuild commodity list
          foreach (var r in _rows) Destroy(r);
          _rows.Clear();

          bool firstSet = false;
          foreach (var res in gm.resources)
          {
              var pd = EconomySystem.GetPrice(state, _portId, res.id);
              if (pd == null) continue;

              // Auto-select first
              if (_selectedResourceId == null && !firstSet)
              {
                  _selectedResourceId = res.id;
                  firstSet = true;
              }

              var go = Instantiate(rowPrefab, listContainer);
              var texts = go.GetComponentsInChildren<TMP_Text>();
              // texts[0]=icon, texts[1]=name, texts[2]=price, texts[3]=change
              if (texts.Length >= 4)
              {
                  texts[0].text = res.icon;
                  texts[1].text = res.displayName;
                  texts[2].text = $"{pd.currentPrice}G";
                  float pctChange = pd.priceHistory.Count >= 2
                      ? (float)(pd.currentPrice - pd.priceHistory[0]) / pd.priceHistory[0] * 100f
                      : 0f;
                  texts[3].text = $"{(pctChange >= 0 ? "+" : "")}{pctChange:F1}%";
                  texts[3].color = pctChange >= 0 ? Color.green : Color.red;
              }

              // Click row to select resource
              var btn = go.GetComponent<Button>();
              if (btn == null) btn = go.AddComponent<Button>();
              string resId = res.id;
              btn.onClick.AddListener(() =>
              {
                  _selectedResourceId = resId;
                  RefreshDetail(state);
              });

              _rows.Add(go);
          }

          RefreshDetail(state);
      }

      private void RefreshDetail(GameState state)
      {
          if (string.IsNullOrEmpty(_selectedResourceId)) return;
          var pd = EconomySystem.GetPrice(state, _portId, _selectedResourceId);
          if (pd == null) return;

          currentPriceText.text = $"{pd.currentPrice}G";

          float pctChange = pd.priceHistory.Count >= 2
              ? (float)(pd.currentPrice - pd.priceHistory[0]) / pd.priceHistory[0] * 100f
              : 0f;
          changePctText.text = $"{(pctChange >= 0 ? "+" : "")}{pctChange:F1}%";
          changePctText.color = pctChange >= 0 ? Color.green : Color.red;

          int high = 0, low = int.MaxValue;
          foreach (var v in pd.priceHistory) { if (v > high) high = v; if (v < low) low = v; }
          if (low == int.MaxValue) low = pd.currentPrice;

          highText.text  = $"고: {high}G";
          lowText.text   = $"저: {low}G";
          rangeText.text = $"폭: {high - low}G";

          Color lineColor = pctChange >= 0 ? new Color(0.3f, 0.9f, 0.4f) : new Color(0.9f, 0.3f, 0.3f);
          chartDrawer.Draw(pd.priceHistory, lineColor);
      }
  }
  ```

- [ ] **Step 3: Create RowPrefab: empty HorizontalLayoutGroup with 4 child TMP_Text objects. Assign to `rowPrefab`.**

- [ ] **Step 4: Assign all inspector references. Enter Play mode, click a port.**

  Expected: price panel opens, shows resource list on left, chart on right.

- [ ] **Step 5: Commit**

  ```bash
  git add Assets/Scripts/UI/PortPricePanel.cs
  git commit -m "feat(unity): PortPricePanel — commodity list + large chart, auto-select first resource"
  ```

---

### Task 6: MarketPanel

**Files:**
- Modify: `Assets/Scripts/UI/MarketPanel.cs`

- [ ] **Step 1: In Unity Editor — build MarketPanel layout (460×500)**

  - Header: portName + gold display.
  - Cargo bar: filled rectangle showing used/max cargo.
  - ScrollRect: commodity rows, each with name, price, quantity Slider (1-20), Buy button, Sell button.
  - Fuel row: current fuel, buy fuel button.
  - Repair row: current hull, repair button.
  - Close button.

- [ ] **Step 2: Replace stub MarketPanel.cs**

  ```csharp
  // Assets/Scripts/UI/MarketPanel.cs
  using System.Collections.Generic;
  using UnityEngine;
  using UnityEngine.UI;
  using TMPro;

  public class MarketPanel : MonoBehaviour
  {
      [SerializeField] private TMP_Text headerText;
      [SerializeField] private Slider cargoBar;
      [SerializeField] private TMP_Text cargoText;
      [SerializeField] private Transform rowContainer;
      [SerializeField] private GameObject commodityRowPrefab;
      [SerializeField] private Button fuelBtn;
      [SerializeField] private TMP_Text fuelText;
      [SerializeField] private Button repairBtn;
      [SerializeField] private TMP_Text repairText;
      [SerializeField] private Button closeBtn;

      private string _portId;
      private readonly List<GameObject> _rows = new();

      void Start()
      {
          closeBtn.onClick.AddListener(() => UIManager.Instance.Close("market"));
          fuelBtn.onClick.AddListener(BuyFuel);
          repairBtn.onClick.AddListener(RepairHull);
      }

      public void SetPort(string portId) => _portId = portId;

      public void Refresh(GameState state)
      {
          var gm = GameManager.Instance;
          var portSO = System.Array.Find(gm.ports, p => p.id == _portId);

          var ship = state.ships.Find(s => s.id == state.activeShipId);
          if (ship == null) return;

          int usedCargo = EconomySystem.GetTotalCargo(ship);
          int maxCargo  = EconomySystem.GetCapacity(ship);

          headerText.text = $"{(portSO != null ? portSO.displayName : _portId)} — 보유 금화 {state.gold:N0}G";
          cargoBar.value = maxCargo > 0 ? (float)usedCargo / maxCargo : 0f;
          cargoText.text = $"화물 {usedCargo}/{maxCargo}";

          foreach (var r in _rows) Destroy(r);
          _rows.Clear();

          foreach (var res in gm.resources)
          {
              var pd = EconomySystem.GetPrice(state, _portId, res.id);
              if (pd == null) continue;

              var go = Instantiate(commodityRowPrefab, rowContainer);
              var labels = go.GetComponentsInChildren<TMP_Text>();
              var btns   = go.GetComponentsInChildren<Button>();
              var slider = go.GetComponentInChildren<Slider>();

              // Layout: labels[0]=name+price, btns[0]=buy, btns[1]=sell
              if (labels.Length > 0) labels[0].text = $"{res.icon} {res.displayName}  {pd.currentPrice}G";
              if (slider != null) { slider.minValue = 1; slider.maxValue = 20; slider.value = 1; }

              int qty() => slider != null ? Mathf.RoundToInt(slider.value) : 1;

              if (btns.Length > 0) btns[0].onClick.AddListener(() =>
              {
                  int cost = EconomySystem.BuyCargo(state, ship, res.id, qty(), pd.currentPrice);
                  if (cost < 0) Debug.Log("[Market] Buy failed (gold/cargo)");
                  else { QuestSystem.UpdateProgress(state, "trade"); DailyGoalSystem.UpdateProgress(state, "trade"); gm.NotifyChanged(); }
              });

              if (btns.Length > 1) btns[1].onClick.AddListener(() =>
              {
                  int earned = EconomySystem.SellCargo(state, ship, res.id, qty(), pd.currentPrice);
                  if (earned > 0) { QuestSystem.UpdateProgress(state, "profit", earned); DailyGoalSystem.UpdateProgress(state, "profit", earned); gm.NotifyChanged(); }
              });

              _rows.Add(go);
          }

          // Fuel/repair
          int maxFuel = ship.typeId switch { "brigantine" => 150, "galleon" => 200, _ => 100 };
          int maxHull = ship.typeId switch { "brigantine" => 150, "galleon" => 200, _ => 100 };
          fuelText.text   = $"연료 {ship.fuel:F0}/{maxFuel}  (200G)";
          repairText.text = $"선체 {ship.hull}/{maxHull}  (300G)";
      }

      private void BuyFuel()
      {
          var state = GameManager.Instance.State;
          var ship = state.ships.Find(s => s.id == state.activeShipId);
          if (ship == null || state.gold < 200) return;
          int maxFuel = ship.typeId switch { "brigantine" => 150, "galleon" => 200, _ => 100 };
          state.gold -= 200;
          ship.fuel = maxFuel;
          GameManager.Instance.NotifyChanged();
      }

      private void RepairHull()
      {
          var state = GameManager.Instance.State;
          var ship = state.ships.Find(s => s.id == state.activeShipId);
          if (ship == null || state.gold < 300) return;
          int maxHull = ship.typeId switch { "brigantine" => 150, "galleon" => 200, _ => 100 };
          state.gold -= 300;
          ship.hull = maxHull;
          GameManager.Instance.NotifyChanged();
      }
  }
  ```

- [ ] **Step 3: Create `commodityRowPrefab`: HorizontalLayoutGroup with TMP_Text, Slider, Buy Button, Sell Button children.**

- [ ] **Step 4: Assign all inspector references. Enter Play mode → click port → click "시장" button.**

  Expected: market panel opens with commodity list, buy/sell buttons functional.

- [ ] **Step 5: Commit**

  ```bash
  git add Assets/Scripts/UI/MarketPanel.cs
  git commit -m "feat(unity): MarketPanel — buy/sell with quantity slider, fuel, repair"
  ```

---

### Task 7: CrewPanel

**Files:**
- Modify: `Assets/Scripts/UI/CrewPanel.cs`

- [ ] **Step 1: In Unity Editor — build CrewPanel layout (560×480)**

  - Title + active ship name.
  - Crew capacity bar (current/max).
  - ScrollRect: crew pool cards.
  - Each card: name, rarity badge, specialty, 4 stat bars (nav/trade/stamina/repair), weekly wage, hire button.
  - Speed preview text ("+X% 항속" after hiring).
  - Refresh pool button (costs 200G).
  - Close button.

- [ ] **Step 2: Replace stub CrewPanel.cs**

  ```csharp
  // Assets/Scripts/UI/CrewPanel.cs
  using System.Collections.Generic;
  using UnityEngine;
  using UnityEngine.UI;
  using TMPro;

  public class CrewPanel : MonoBehaviour
  {
      [SerializeField] private TMP_Text titleText;
      [SerializeField] private Slider crewCapacityBar;
      [SerializeField] private TMP_Text crewCapacityText;
      [SerializeField] private Transform cardContainer;
      [SerializeField] private GameObject crewCardPrefab;
      [SerializeField] private Button refreshBtn;
      [SerializeField] private TMP_Text refreshCostText;
      [SerializeField] private Button closeBtn;

      private readonly List<GameObject> _cards = new();

      void Start()
      {
          closeBtn.onClick.AddListener(() => UIManager.Instance.Close("crew"));
          refreshBtn.onClick.AddListener(RefreshPool);
      }

      public void Refresh(GameState state)
      {
          var gm = GameManager.Instance;
          var ship = state.ships.Find(s => s.id == state.activeShipId);
          if (ship == null) { titleText.text = "활성 배 없음"; return; }

          int maxCrew = ship.typeId switch { "brigantine" => 8, "galleon" => 14, _ => 4 };
          maxCrew += ship.upgrades.crew;
          int curCrew = ship.crewIds.Count;

          titleText.text = $"{ship.name} — 선원";
          crewCapacityBar.value = maxCrew > 0 ? (float)curCrew / maxCrew : 0f;
          crewCapacityText.text = $"{curCrew}/{maxCrew}";

          refreshCostText.text = $"인력소 갱신 200G (보유: {state.gold}G)";
          refreshBtn.interactable = state.gold >= GameConstants.CREW_REFRESH_COST;

          foreach (var c in _cards) Destroy(c);
          _cards.Clear();

          float curSpd = GetCurrentSpeed(state, ship);

          foreach (var member in state.availableCrew)
          {
              var go = Instantiate(crewCardPrefab, cardContainer);
              BuildCrewCard(go, member, state, ship, curSpd);
              _cards.Add(go);
          }
      }

      private void BuildCrewCard(GameObject go, CrewMember member, GameState state, ShipData ship, float curSpd)
      {
          var texts  = go.GetComponentsInChildren<TMP_Text>();
          var sliders = go.GetComponentsInChildren<Slider>();
          var hireBtn = go.GetComponentInChildren<Button>();

          // texts[0]=name+rarity, texts[1]=specialty, texts[2]=nav label, texts[3]=nav val,
          //          texts[4]=trade label ... texts[5]=trade val ... texts[6]=stam ... texts[7]=stam val
          //          texts[8]=repair val, texts[9]=wage, texts[10]=speedPreview
          // sliders[0]=nav, [1]=trade, [2]=stam, [3]=repair

          string rarityColor = member.rarity switch
          {
              "uncommon"  => "#4af",
              "rare"      => "#a4f",
              "legendary" => "#fa4",
              _           => "#888"
          };
          if (texts.Length > 0) texts[0].text = $"<color={rarityColor}>[{member.rarity}]</color> {member.name}";
          if (texts.Length > 1) texts[1].text = string.IsNullOrEmpty(member.specialty) ? "" : $"✦ {member.specialty}";

          // Stat bars
          int navDisplay = member.navigation + member.navBonus;
          int[] statValues = { navDisplay, member.trading + member.tradingBonus, member.stamina, member.repair };
          for (int i = 0; i < sliders.Length && i < 4; i++)
          {
              sliders[i].minValue = 0;
              sliders[i].maxValue = 100;
              sliders[i].value = statValues[i];
              sliders[i].interactable = false;
          }

          if (texts.Length > 9) texts[9].text = $"고용비 {member.hiringFee}G  주급 {member.weeklyWage}G";

          // Speed preview
          if (texts.Length > 10)
          {
              var tempCrewIds = new List<string>(ship.crewIds) { member.id };
              var tempCrew    = new List<CrewMember>(state.crew) { member };
              float totalNav  = 0f;
              foreach (var id in tempCrewIds)
              {
                  var m = tempCrew.Find(c => c.id == id);
                  if (m != null) totalNav += m.navigation + m.navBonus;
              }
              float avgNav  = tempCrewIds.Count > 0 ? totalNav / tempCrewIds.Count : 0f;
              float newSpd  = 1f + avgNav * GameConstants.NAV_SPEED_BONUS_PER_POINT;
              float diff    = (newSpd - curSpd) / Mathf.Max(curSpd, 0.0001f) * 100f;
              texts[10].text = diff >= 0 ? $"<color=#4f4>항속 +{diff:F1}%</color>" : $"<color=#f44>항속 {diff:F1}%</color>";
          }

          // Hire button
          bool canHire = state.gold >= member.hiringFee && ship.crewIds.Count < GetMaxCrew(ship);
          hireBtn.interactable = canHire;
          string memberId = member.id;
          string shipId   = ship.id;
          hireBtn.onClick.AddListener(() =>
          {
              bool ok = CrewSystem.HireCrew(GameManager.Instance.State, memberId, shipId);
              if (ok)
              {
                  DailyGoalSystem.UpdateProgress(GameManager.Instance.State, "crew");
                  GameManager.Instance.NotifyChanged();
              }
          });
      }

      private float GetCurrentSpeed(GameState state, ShipData ship)
          => CrewSystem.GetSpeedMultiplier(state, ship);

      private int GetMaxCrew(ShipData ship)
      {
          int baseMax = ship.typeId switch { "brigantine" => 8, "galleon" => 14, _ => 4 };
          return baseMax + ship.upgrades.crew;
      }

      private void RefreshPool()
      {
          var state = GameManager.Instance.State;
          if (state.gold < GameConstants.CREW_REFRESH_COST) return;
          state.gold -= GameConstants.CREW_REFRESH_COST;
          CrewSystem.RefreshAvailableCrew(state);
          GameManager.Instance.NotifyChanged();
      }
  }
  ```

- [ ] **Step 3: Create `crewCardPrefab`**

  Vertical Layout Group with:
  - TMP_Text (name+rarity), TMP_Text (specialty)
  - 4× horizontal row: TMP_Text label + Slider + TMP_Text value  (nav/trade/stam/repair)
  - TMP_Text (wage), TMP_Text (speed preview)
  - Button "고용"

  Total TMP_Text children accessible via `GetComponentsInChildren<TMP_Text>`: index 0-10 in order.

- [ ] **Step 4: Assign all inspector references. Enter Play mode → open Crew panel.**

  Expected: available crew pool shows 6 cards with stat bars and speed preview.

- [ ] **Step 5: Commit**

  ```bash
  git add Assets/Scripts/UI/CrewPanel.cs
  git commit -m "feat(unity): CrewPanel — stat bars, speed preview, hire button, pool refresh"
  ```

---

### Task 8: QuestPanel

**Files:**
- Modify: `Assets/Scripts/UI/QuestPanel.cs`

- [ ] **Step 1: Replace stub QuestPanel.cs**

  ```csharp
  // Assets/Scripts/UI/QuestPanel.cs
  using System.Collections.Generic;
  using UnityEngine;
  using UnityEngine.UI;
  using TMPro;

  public class QuestPanel : MonoBehaviour
  {
      [SerializeField] private Transform availableContainer;
      [SerializeField] private Transform activeContainer;
      [SerializeField] private GameObject questRowPrefab;  // TMP_Text + Button
      [SerializeField] private Button closeBtn;

      private readonly List<GameObject> _rows = new();

      void Start() => closeBtn.onClick.AddListener(() => UIManager.Instance.Close("quest"));

      public void Refresh(GameState state)
      {
          foreach (var r in _rows) Destroy(r);
          _rows.Clear();

          foreach (var q in state.availableQuests)
          {
              var go = Instantiate(questRowPrefab, availableContainer);
              var txt = go.GetComponentInChildren<TMP_Text>();
              var btn = go.GetComponentInChildren<Button>();
              if (txt) txt.text = $"{q.description}\n보상: {q.rewardGold}G";
              string qid = q.id;
              btn.GetComponentInChildren<TMP_Text>().text = "수락";
              btn.onClick.AddListener(() =>
              {
                  QuestSystem.AcceptQuest(GameManager.Instance.State, qid);
                  GameManager.Instance.NotifyChanged();
              });
              _rows.Add(go);
          }

          foreach (var q in state.activeQuests)
          {
              var go = Instantiate(questRowPrefab, activeContainer);
              var txt = go.GetComponentInChildren<TMP_Text>();
              var btn = go.GetComponentInChildren<Button>();
              float pct = q.targetAmount > 0 ? (float)q.progress / q.targetAmount : 0f;
              if (txt) txt.text = $"{q.description}\n진행: {q.progress}/{q.targetAmount}  ({pct*100:F0}%)";
              if (q.completed && !q.claimed)
              {
                  btn.GetComponentInChildren<TMP_Text>().text = "보상 수령";
                  string qid = q.id;
                  btn.onClick.AddListener(() =>
                  {
                      QuestSystem.ClaimReward(GameManager.Instance.State, qid);
                      GameManager.Instance.NotifyChanged();
                  });
              }
              else
              {
                  btn.interactable = false;
                  btn.GetComponentInChildren<TMP_Text>().text = q.claimed ? "완료" : "진행 중";
              }
              _rows.Add(go);
          }
      }
  }
  ```

- [ ] **Step 2: Create `questRowPrefab`: TMP_Text (description) + Button (action) in horizontal group.**

- [ ] **Step 3: Enter Play mode → open Quest panel. Verify quest rows visible and Accept button works.**

- [ ] **Step 4: Commit**

  ```bash
  git add Assets/Scripts/UI/QuestPanel.cs
  git commit -m "feat(unity): QuestPanel — available quests + accept, active quests + claim reward"
  ```

---

### Task 9: DailyGoalPanel

**Files:**
- Modify: `Assets/Scripts/UI/DailyGoalPanel.cs`

- [ ] **Step 1: Replace stub DailyGoalPanel.cs**

  ```csharp
  // Assets/Scripts/UI/DailyGoalPanel.cs
  using System.Collections.Generic;
  using UnityEngine;
  using UnityEngine.UI;
  using TMPro;

  public class DailyGoalPanel : MonoBehaviour
  {
      [SerializeField] private Transform goalContainer;
      [SerializeField] private GameObject goalRowPrefab;   // TMP_Text + Slider + Button

      private readonly List<GameObject> _rows = new();

      public void Refresh(GameState state)
      {
          DailyGoalSystem.CheckAndReset(state);

          foreach (var r in _rows) Destroy(r);
          _rows.Clear();

          foreach (var goal in state.dailyGoals)
          {
              var go = Instantiate(goalRowPrefab, goalContainer);
              var texts   = go.GetComponentsInChildren<TMP_Text>();
              var slider  = go.GetComponentInChildren<Slider>();
              var btn     = go.GetComponentInChildren<Button>();

              float pct = goal.target > 0 ? (float)goal.progress / goal.target : 0f;
              if (texts.Length > 0) texts[0].text = goal.description;
              if (texts.Length > 1) texts[1].text = $"{goal.progress}/{goal.target}";
              if (slider != null)  { slider.value = pct; slider.interactable = false; }

              if (goal.completed && !goal.claimed)
              {
                  btn.interactable = true;
                  btn.GetComponentInChildren<TMP_Text>().text = $"+{goal.rewardGold}G";
                  string gid = goal.id;
                  btn.onClick.AddListener(() =>
                  {
                      DailyGoalSystem.ClaimReward(GameManager.Instance.State, gid);
                      GameManager.Instance.NotifyChanged();
                  });
              }
              else
              {
                  btn.interactable = false;
                  btn.GetComponentInChildren<TMP_Text>().text = goal.claimed ? "✓" : "진행";
              }
              _rows.Add(go);
          }
      }
  }
  ```

- [ ] **Step 2: Create `goalRowPrefab`: TMP_Text + Slider + Button + TMP_Text (reward).**

- [ ] **Step 3: Enter Play mode. Verify 4 daily goal rows appear at bottom-left.**

- [ ] **Step 4: Commit**

  ```bash
  git add Assets/Scripts/UI/DailyGoalPanel.cs
  git commit -m "feat(unity): DailyGoalPanel — 4 goals with progress bars, claim reward"
  ```

---

### Task 10: InfoPanel

**Files:**
- Modify: `Assets/Scripts/UI/InfoPanel.cs`

- [ ] **Step 1: Replace stub InfoPanel.cs**

  ```csharp
  // Assets/Scripts/UI/InfoPanel.cs
  using System.Collections.Generic;
  using UnityEngine;
  using UnityEngine.UI;
  using TMPro;

  public class InfoPanel : MonoBehaviour
  {
      [SerializeField] private Transform predictionContainer;
      [SerializeField] private GameObject predRowPrefab;
      [SerializeField] private TMP_Text portPromptText;
      [SerializeField] private Button buyHintBtn;
      [SerializeField] private Button buyInfoBtn;
      [SerializeField] private Button buyReportBtn;
      [SerializeField] private Button closeBtn;

      private readonly List<GameObject> _rows = new();

      void Start()
      {
          closeBtn.onClick.AddListener(() => UIManager.Instance.Close("info"));
          buyHintBtn.onClick.AddListener(() => BuyTier("hint", 150));
          buyInfoBtn.onClick.AddListener(() => BuyTier("info", 400));
          buyReportBtn.onClick.AddListener(() => BuyTier("report", 800));
      }

      public void Refresh(GameState state)
      {
          foreach (var r in _rows) Destroy(r);
          _rows.Clear();

          // Show active predictions
          var active = state.predictions.FindAll(p => !p.applied);
          if (active.Count == 0)
          {
              var go = Instantiate(predRowPrefab, predictionContainer);
              go.GetComponentInChildren<TMP_Text>().text = "보유 정보 없음";
              _rows.Add(go);
          }
          else
          {
              foreach (var p in active)
              {
                  var go = Instantiate(predRowPrefab, predictionContainer);
                  var txt = go.GetComponentInChildren<TMP_Text>();
                  string dir = p.direction == "up" ? "📈 상승" : "📉 하락";
                  txt.text = $"[{p.tier}] {p.portName}  {dir}  정확도 {p.accuracy}%  {p.turnsRemaining}턴 후";
                  _rows.Add(go);
              }
          }

          // Buy buttons label with cost
          var activeShip = state.ships.Find(s => s.id == state.activeShipId);
          string portHint = activeShip != null && activeShip.isDocked
              ? $"{activeShip.dockedPortId} 정보 구매" : "정박 후 구매 가능";
          portPromptText.text = portHint;

          bool docked = activeShip != null && activeShip.isDocked;
          buyHintBtn.interactable   = docked && state.gold >= 150;
          buyInfoBtn.interactable   = docked && state.gold >= 400;
          buyReportBtn.interactable = docked && state.gold >= 800;
      }

      private void BuyTier(string tier, int cost)
      {
          var state = GameManager.Instance.State;
          var ship  = state.ships.Find(s => s.id == state.activeShipId);
          if (ship == null || !ship.isDocked) return;

          bool ok = InfoSystem.BuyPrediction(state, tier, ship.dockedPortId, ship.dockedPortId, GameManager.Instance.resources);
          if (ok) GameManager.Instance.NotifyChanged();
      }
  }
  ```

- [ ] **Step 2: Create `predRowPrefab`: single TMP_Text in a panel.**

- [ ] **Step 3: Enter Play mode → open Info panel. Verify predictions list shows and buy buttons light up when docked.**

- [ ] **Step 4: Commit**

  ```bash
  git add Assets/Scripts/UI/InfoPanel.cs
  git commit -m "feat(unity): InfoPanel — prediction list, buy hint/info/report when docked"
  ```

---

### Task 11: ShipDetailPanel

**Files:**
- Modify: `Assets/Scripts/UI/ShipDetailPanel.cs`

- [ ] **Step 1: Replace stub ShipDetailPanel.cs**

  ```csharp
  // Assets/Scripts/UI/ShipDetailPanel.cs
  using UnityEngine;
  using UnityEngine.UI;
  using TMPro;

  public class ShipDetailPanel : MonoBehaviour
  {
      [SerializeField] private TMP_Text shipNameText;
      [SerializeField] private TMP_Text statsText;
      [SerializeField] private TMP_Text upgradeSpeedText;
      [SerializeField] private TMP_Text upgradeCargoText;
      [SerializeField] private TMP_Text upgradeCrewText;
      [SerializeField] private Button upgradeSpeedBtn;
      [SerializeField] private Button upgradeCargoBtn;
      [SerializeField] private Button upgradeCrewBtn;
      [SerializeField] private Button closeBtn;

      private string _shipId;

      void Start()
      {
          closeBtn.onClick.AddListener(() => UIManager.Instance.Close("shipDetail"));
          upgradeSpeedBtn.onClick.AddListener(() => UpgradeShip("speed"));
          upgradeCargoBtn.onClick.AddListener(() => UpgradeShip("cargo"));
          upgradeCrewBtn.onClick.AddListener(() => UpgradeShip("crew"));
      }

      public void SetShip(string shipId) => _shipId = shipId;

      public void Refresh(GameState state)
      {
          var ship = state.ships.Find(s => s.id == _shipId);
          if (ship == null) return;

          shipNameText.text = ship.name;

          float speedMult  = CrewSystem.GetSpeedMultiplier(state, ship);
          float baseSpeed  = ship.typeId switch { "brigantine" => 0.9f, "galleon" => 0.75f, _ => 1.0f };
          float upgradeMult = 1f + ship.upgrades.speed * 0.15f;
          float totalSpeed = GameConstants.BASE_SHIP_SPEED * baseSpeed * speedMult * upgradeMult;
          int usedCargo    = EconomySystem.GetTotalCargo(ship);
          int maxCargo     = EconomySystem.GetCapacity(ship);

          statsText.text = $"연료 {ship.fuel:F0}  선체 {ship.hull}\n" +
                           $"화물 {usedCargo}/{maxCargo}  항속 {totalSpeed:F3}\n" +
                           $"선원 {ship.crewIds.Count}명";

          // Upgrade buttons
          int sLv = ship.upgrades.speed;
          int cLv = ship.upgrades.cargo;
          int rLv = ship.upgrades.crew;

          if (sLv < 3)
          {
              int cost = GameConstants.SPEED_UPGRADE_COST[sLv];
              upgradeSpeedText.text = $"항속 +15%  ({cost}G)  현재 +{sLv*15}% → +{(sLv+1)*15}%";
              upgradeSpeedBtn.interactable = state.gold >= cost;
          }
          else { upgradeSpeedText.text = "항속 MAX"; upgradeSpeedBtn.interactable = false; }

          if (cLv < 3)
          {
              int cost = GameConstants.CARGO_UPGRADE_COST[cLv];
              upgradeCargoText.text = $"적재 +25개  ({cost}G)  현재 {maxCargo}개 → {maxCargo+25}개";
              upgradeCargoBtn.interactable = state.gold >= cost;
          }
          else { upgradeCargoText.text = "적재 MAX"; upgradeCargoBtn.interactable = false; }

          int maxCrewBase = ship.typeId switch { "brigantine" => 8, "galleon" => 14, _ => 4 };
          int curMax = maxCrewBase + rLv;
          int hardMax = maxCrewBase + 3;
          if (rLv < 3)
          {
              int cost = GameConstants.CREW_UPGRADE_COST[rLv];
              upgradeCrewText.text = $"선원 최대 +1  ({cost}G)  현재 {curMax}명 → {Mathf.Min(hardMax, curMax+1)}명";
              upgradeCrewBtn.interactable = state.gold >= cost;
          }
          else { upgradeCrewText.text = "선원 MAX"; upgradeCrewBtn.interactable = false; }
      }

      private void UpgradeShip(string upgradeType)
      {
          var state = GameManager.Instance.State;
          var ship  = state.ships.Find(s => s.id == _shipId);
          if (ship == null) return;

          int cost;
          switch (upgradeType)
          {
              case "speed":
                  if (ship.upgrades.speed >= 3) return;
                  cost = GameConstants.SPEED_UPGRADE_COST[ship.upgrades.speed];
                  if (state.gold < cost) return;
                  state.gold -= cost;
                  ship.upgrades.speed++;
                  break;
              case "cargo":
                  if (ship.upgrades.cargo >= 3) return;
                  cost = GameConstants.CARGO_UPGRADE_COST[ship.upgrades.cargo];
                  if (state.gold < cost) return;
                  state.gold -= cost;
                  ship.upgrades.cargo++;
                  break;
              case "crew":
                  if (ship.upgrades.crew >= 3) return;
                  cost = GameConstants.CREW_UPGRADE_COST[ship.upgrades.crew];
                  if (state.gold < cost) return;
                  state.gold -= cost;
                  ship.upgrades.crew++;
                  break;
          }
          GameManager.Instance.NotifyChanged();
      }
  }
  ```

- [ ] **Step 2: Build ShipDetailPanel layout in editor with all referenced fields.**

- [ ] **Step 3: Enter Play mode → click ship → verify stats and upgrade buttons appear.**

- [ ] **Step 4: Commit**

  ```bash
  git add Assets/Scripts/UI/ShipDetailPanel.cs
  git commit -m "feat(unity): ShipDetailPanel — ship stats, upgrade buttons with before/after preview"
  ```

---

### Task 12: EventLogPanel

**Files:**
- Modify: `Assets/Scripts/UI/EventLogPanel.cs`

- [ ] **Step 1: Replace stub EventLogPanel.cs**

  ```csharp
  // Assets/Scripts/UI/EventLogPanel.cs
  using System.Collections.Generic;
  using UnityEngine;
  using UnityEngine.UI;
  using TMPro;

  public class EventLogPanel : MonoBehaviour
  {
      [SerializeField] private Transform logContainer;
      [SerializeField] private GameObject logEntryPrefab;   // single TMP_Text
      [SerializeField] private ScrollRect scrollRect;

      private const int MAX_ENTRIES = 40;
      private readonly Queue<string> _entries = new();

      public void AddEntry(string msg)
      {
          _entries.Enqueue(msg);
          while (_entries.Count > MAX_ENTRIES) _entries.Dequeue();
          Refresh();
      }

      public void Refresh()
      {
          // Clear and rebuild (simple approach for short log)
          foreach (Transform child in logContainer)
              Destroy(child.gameObject);

          foreach (var entry in _entries)
          {
              var go = Instantiate(logEntryPrefab, logContainer);
              go.GetComponent<TMP_Text>().text = entry;
          }

          // Scroll to bottom
          Canvas.ForceUpdateCanvases();
          scrollRect.verticalNormalizedPosition = 0f;
      }
  }
  ```

- [ ] **Step 2: Create `logEntryPrefab`: TMP_Text with small font (12pt), no wrapping.**

- [ ] **Step 3: Assign references. Enter Play mode. Trigger an event (wait or debug-force). Verify log entry appears.**

- [ ] **Step 4: Commit**

  ```bash
  git add Assets/Scripts/UI/EventLogPanel.cs
  git commit -m "feat(unity): EventLogPanel — scrollable game log, max 40 entries"
  ```

---

## Self-Review

**Spec coverage check:**
- [x] Header (gold, gems, day, tax) — Task 2
- [x] Fleet sidebar with ship cards — Task 3
- [x] Port price panel: commodity list + large chart — Task 5
- [x] Price chart drawn from history — Task 4 (PriceChartDrawer)
- [x] Market popup: buy/sell with quantity, fuel, repair — Task 6
- [x] Crew panel: stat bars, speed preview, hire, refresh pool — Task 7
- [x] Quest panel: available + accept, active + claim — Task 8
- [x] Daily goals: 4 goals, progress bars, midnight reset — Task 9
- [x] Info panel: prediction list, buy tier buttons, docked check — Task 10
- [x] Ship detail + upgrades with before/after preview — Task 11
- [x] Event log — Task 12
- [x] UIManager: one exclusive panel at a time — Task 1

**Type consistency:**
- `EconomySystem.GetCapacity(ship)` used in `MarketPanel.Refresh` and `ShipDetailPanel.Refresh` ✓
- `EconomySystem.GetTotalCargo(ship)` same ✓
- `CrewSystem.GetSpeedMultiplier(state, ship)` used in `CrewPanel.BuildCrewCard` and `ShipDetailPanel.Refresh` ✓
- `DailyGoalSystem.UpdateProgress(state, "trade")` called in `MarketPanel` buy/sell ✓
- `QuestSystem.UpdateProgress(state, "profit", earned)` called in `MarketPanel` sell ✓
- `InfoSystem.BuyPrediction(state, tier, portId, portName, resources)` — 5 params match definition in Plan A Task 9 ✓
- `UIManager.Instance.marketPanel.SetPort(_portId)` — `MarketPanel.SetPort(string)` exists ✓
- `UIManager.Instance.shipDetailPanel.SetShip(shipId)` — `ShipDetailPanel.SetShip(string)` exists ✓
