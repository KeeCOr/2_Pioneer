# Pioneer Unity — Plan B: World (Map, Ships, Ports, Camera)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the isometric 3D world — ocean plane, port objects at correct map positions, ship objects that navigate between ports, animated sea, and a camera that pans/zooms/pinches.

**Architecture:** Game coordinate space is 0-100 on XZ plane. `IsometricCamera` sits at a fixed angle (Euler 45°,45°,0°) and follows the active ship or allows free pan. Each port and ship is a GameObject instantiated from prefabs by `WorldBuilder` on startup. `ShipController` reads `ShipData` from `GameManager.State` each frame and moves/animates accordingly. `OceanAnimator` tiles a low-poly mesh and scrolls UV or vertex offsets.

**Tech Stack:** Unity 2022.3 LTS, URP, C#, Physics.Raycast for click detection

**Prerequisite:** Plan A must be complete (GameManager, GameState, all data types).

---

## File Structure

```
Assets/
  Scripts/
    World/
      WorldBuilder.cs       — instantiates port + ship GameObjects from state
      PortObject.cs         — MonoBehaviour on each port prefab
      ShipController.cs     — MonoBehaviour on each ship prefab; moves ship, fires events
      OceanAnimator.cs      — scrolls ocean UV each frame
    Camera/
      IsometricCamera.cs    — pan, zoom, pinch, follow-ship
  Prefabs/
    Ships/                  — sloop.prefab, brigantine.prefab, galleon.prefab (assign in editor)
    Ports/                  — port.prefab (assign in editor)
    World/
      Ocean.prefab          — tiled low-poly mesh
  Materials/
    Ocean.mat               — URP Lit or custom shader
```

---

### Task 1: Ocean Plane

**Files:**
- Create: `Assets/Scripts/World/OceanAnimator.cs`

- [ ] **Step 1: In Unity Editor — create the ocean mesh**

  GameObject → 3D Object → Plane. Scale to (10, 1, 10) so it covers 0-100 in XZ.
  Position: (50, 0, 50). Name it "Ocean".

  Create `Assets/Materials/Ocean.mat`. Assign a blue URP Lit material.
  Assign to Ocean plane renderer.

  Save as prefab: drag to `Assets/Prefabs/World/Ocean.prefab`.

- [ ] **Step 2: Create OceanAnimator.cs**

  ```csharp
  // Assets/Scripts/World/OceanAnimator.cs
  using UnityEngine;

  public class OceanAnimator : MonoBehaviour
  {
      [SerializeField] private float scrollSpeedX = 0.005f;
      [SerializeField] private float scrollSpeedZ = 0.003f;

      private Renderer _renderer;
      private Material _mat;

      void Start()
      {
          _renderer = GetComponent<Renderer>();
          _mat = _renderer.material;   // instance copy
      }

      void Update()
      {
          float x = Time.time * scrollSpeedX;
          float z = Time.time * scrollSpeedZ;
          _mat.mainTextureOffset = new Vector2(x % 1f, z % 1f);
      }
  }
  ```

- [ ] **Step 3: Attach OceanAnimator to the Ocean plane. Enter Play mode.**

  Expected: ocean texture slowly scrolls.

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "feat(unity): ocean plane with URP material + scrolling UV animator"
  ```

---

### Task 2: PortObject

**Files:**
- Create: `Assets/Scripts/World/PortObject.cs`

- [ ] **Step 1: Create a port prefab in the editor**

  GameObject → 3D Object → Cylinder. Scale (2, 0.5, 2). Add a child Cube scaled (1, 2, 0.5) as a "building".
  Name root "Port". Save to `Assets/Prefabs/Ports/Port.prefab`.

  Assign a distinct material (e.g., brown).

- [ ] **Step 2: Create PortObject.cs**

  ```csharp
  // Assets/Scripts/World/PortObject.cs
  using UnityEngine;

  public class PortObject : MonoBehaviour
  {
      public string portId;
      public string portName;

      private static readonly int BaseColor = Shader.PropertyToID("_BaseColor");

      [SerializeField] private Color normalColor = new Color(0.6f, 0.4f, 0.2f);
      [SerializeField] private Color hoverColor  = new Color(1f, 0.8f, 0.3f);

      private Renderer[] _renderers;

      void Awake()
      {
          _renderers = GetComponentsInChildren<Renderer>();
      }

      public void SetHighlight(bool on)
      {
          Color c = on ? hoverColor : normalColor;
          foreach (var r in _renderers)
              r.material.SetColor(BaseColor, c);
      }

      // Called by WorldBuilder to position this port
      public void Init(string id, string name, Vector2 mapPos)
      {
          portId = id;
          portName = name;
          transform.position = new Vector3(mapPos.x, 0f, mapPos.y);
          gameObject.name = $"Port_{id}";
      }
  }
  ```

- [ ] **Step 3: Verify — Unity compiles**

- [ ] **Step 4: Commit**

  ```bash
  git add Assets/Scripts/World/PortObject.cs
  git commit -m "feat(unity): PortObject — init position from mapPos, highlight on hover"
  ```

---

### Task 3: ShipController

**Files:**
- Create: `Assets/Scripts/World/ShipController.cs`

- [ ] **Step 1: Create a ship prefab in the editor**

  GameObject → 3D Object → Capsule. Scale (1, 0.5, 2). Add a child Cube scaled (0.3, 1.2, 0.3) as "mast".
  Name root "Ship". Save to `Assets/Prefabs/Ships/Sloop.prefab`.

- [ ] **Step 2: Create ShipController.cs**

  ```csharp
  // Assets/Scripts/World/ShipController.cs
  using UnityEngine;

  public class ShipController : MonoBehaviour
  {
      public string shipId;

      [SerializeField] private float eventCheckInterval = 5f;

      private float _eventTimer;
      private bool _wasAtSea;

      void Update()
      {
          var gm = GameManager.Instance;
          if (gm == null) return;

          var ship = gm.State.ships.Find(s => s.id == shipId);
          if (ship == null) return;

          MoveShip(gm, ship);
          CheckEvents(gm, ship);
      }

      private void MoveShip(GameManager gm, ShipData ship)
      {
          if (ship.isDocked) return;
          if (ship.fuel <= 0f) return;

          Vector3 target = new Vector3(ship.targetX, 0f, ship.targetY);
          Vector3 current = transform.position;

          float baseSpeed = ship.typeId switch { "brigantine" => 0.9f, "galleon" => 0.75f, _ => 1.0f };
          float speedMult = CrewSystem.GetSpeedMultiplier(gm.State, ship);
          float upgradeMult = 1f + ship.upgrades.speed * 0.15f;
          float speed = GameConstants.BASE_SHIP_SPEED * baseSpeed * speedMult * upgradeMult;

          Vector3 dir = (target - current);
          float dist = dir.magnitude;

          if (dist < 0.1f)
          {
              // Arrived at target
              transform.position = target;
              ship.x = ship.targetX;
              ship.y = ship.targetY;

              if (!string.IsNullOrEmpty(ship.targetPortId))
              {
                  gm.OnShipArrivedAtPort(ship, ship.targetPortId);
                  ship.targetPortId = null;
              }
              return;
          }

          // Burn fuel
          float fuelBurn = speed * Time.deltaTime * GameConstants.FUEL_BURN_PER_UNIT;
          ship.fuel = Mathf.Max(0f, ship.fuel - fuelBurn);

          Vector3 move = dir.normalized * speed * Time.deltaTime;
          transform.position = current + move;
          ship.x = transform.position.x;
          ship.y = transform.position.z;

          // Rotate toward movement direction
          if (dir.magnitude > 0.01f)
              transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(dir.normalized), Time.deltaTime * 5f);
      }

      private void CheckEvents(GameManager gm, ShipData ship)
      {
          if (ship.isDocked) return;

          _eventTimer += Time.deltaTime;
          if (_eventTimer < eventCheckInterval) return;
          _eventTimer = 0f;

          var result = EventSystem.TryTriggerEvent(gm.State, ship);
          if (result != null)
              gm.HandleEventResult(result, ship);
      }

      // Called by WorldBuilder to initialize this controller
      public void Init(string id)
      {
          shipId = id;
          gameObject.name = $"Ship_{id}";
      }

      // Called by UI when player sets a destination
      public void SetDestination(float x, float y, string portId = null)
      {
          var gm = GameManager.Instance;
          if (gm == null) return;
          var ship = gm.State.ships.Find(s => s.id == shipId);
          if (ship == null) return;

          ship.targetX = x;
          ship.targetY = y;
          ship.targetPortId = portId;
          ship.isDocked = false;
          ship.dockedPortId = null;
      }
  }
  ```

- [ ] **Step 3: Verify — Unity compiles**

- [ ] **Step 4: Commit**

  ```bash
  git add Assets/Scripts/World/ShipController.cs
  git commit -m "feat(unity): ShipController — moves ship, burns fuel, fires events every 5s"
  ```

---

### Task 4: WorldBuilder

**Files:**
- Create: `Assets/Scripts/World/WorldBuilder.cs`

- [ ] **Step 1: Create WorldBuilder.cs**

  ```csharp
  // Assets/Scripts/World/WorldBuilder.cs
  using System.Collections.Generic;
  using UnityEngine;

  public class WorldBuilder : MonoBehaviour
  {
      [SerializeField] private GameObject portPrefab;
      [SerializeField] private GameObject sloopPrefab;
      [SerializeField] private GameObject brigantinePrefab;
      [SerializeField] private GameObject galleonPrefab;

      private readonly Dictionary<string, PortObject> _portObjects = new();
      private readonly Dictionary<string, ShipController> _shipObjects = new();

      void Start()
      {
          var gm = GameManager.Instance;
          if (gm == null) { Debug.LogError("[WorldBuilder] GameManager not found"); return; }

          BuildPorts(gm);
          BuildShips(gm);

          gm.OnStateChanged += OnStateChanged;
      }

      private void BuildPorts(GameManager gm)
      {
          foreach (var portSO in gm.ports)
          {
              var go = Instantiate(portPrefab, Vector3.zero, Quaternion.identity, transform);
              var po = go.GetComponent<PortObject>();
              if (po == null) po = go.AddComponent<PortObject>();
              po.Init(portSO.id, portSO.displayName, portSO.mapPosition);
              _portObjects[portSO.id] = po;
          }
      }

      private void BuildShips(GameManager gm)
      {
          foreach (var ship in gm.State.ships)
              SpawnShip(ship);
      }

      private void SpawnShip(ShipData ship)
      {
          GameObject prefab = ship.typeId switch
          {
              "brigantine" => brigantinePrefab,
              "galleon"    => galleonPrefab,
              _            => sloopPrefab
          };
          if (prefab == null) { Debug.LogWarning($"[WorldBuilder] No prefab for {ship.typeId}"); return; }

          var go = Instantiate(prefab, new Vector3(ship.x, 0f, ship.y), Quaternion.identity, transform);
          var sc = go.GetComponent<ShipController>();
          if (sc == null) sc = go.AddComponent<ShipController>();
          sc.Init(ship.id);
          _shipObjects[ship.id] = sc;
      }

      private void OnStateChanged(GameState state)
      {
          // Spawn new ships that aren't tracked yet
          foreach (var ship in state.ships)
          {
              if (!_shipObjects.ContainsKey(ship.id))
                  SpawnShip(ship);
          }
      }

      public ShipController GetShipController(string shipId)
          => _shipObjects.TryGetValue(shipId, out var sc) ? sc : null;

      public PortObject GetPortObject(string portId)
          => _portObjects.TryGetValue(portId, out var po) ? po : null;

      void OnDestroy()
      {
          if (GameManager.Instance != null)
              GameManager.Instance.OnStateChanged -= OnStateChanged;
      }
  }
  ```

- [ ] **Step 2: In Unity Editor**

  Create empty GameObject "WorldBuilder" in Main.unity. Attach `WorldBuilder` script.
  Assign `portPrefab`, `sloopPrefab` (and brigantine/galleon if available) in inspector.

- [ ] **Step 3: Enter Play mode**

  Expected: 8 port cylinders appear at map positions. 1 sloop spawns at Lisbon coordinates (~10, 0, 45).

- [ ] **Step 4: Commit**

  ```bash
  git add -A
  git commit -m "feat(unity): WorldBuilder — spawns ports + ships from GameState at startup"
  ```

---

### Task 5: IsometricCamera

**Files:**
- Create: `Assets/Scripts/Camera/IsometricCamera.cs`

- [ ] **Step 1: Create IsometricCamera.cs**

  ```csharp
  // Assets/Scripts/Camera/IsometricCamera.cs
  using UnityEngine;

  public class IsometricCamera : MonoBehaviour
  {
      [Header("Isometric Setup")]
      [SerializeField] private float orthoSizeDefault = 30f;
      [SerializeField] private float orthoSizeMin     = 10f;
      [SerializeField] private float orthoSizeMax     = 60f;

      [Header("Pan")]
      [SerializeField] private float panSpeed   = 0.3f;

      [Header("Zoom")]
      [SerializeField] private float zoomSpeed  = 5f;
      [SerializeField] private float pinchSpeed = 0.05f;

      [Header("Follow")]
      [SerializeField] private float followSmoothing = 5f;

      private Camera _cam;
      private Vector3 _dragOrigin;
      private bool _isDragging;
      private string _followShipId;

      // Touch state
      private float _prevPinchDist;

      void Awake()
      {
          _cam = GetComponent<Camera>();
          _cam.orthographic = true;
          _cam.orthographicSize = orthoSizeDefault;

          // Isometric angle: 45° tilt, 45° yaw
          transform.rotation = Quaternion.Euler(45f, 45f, 0f);
          transform.position = new Vector3(50f, 60f, 20f); // looking at map center
      }

      void Update()
      {
          HandleFollow();
          HandleMouseInput();
          HandleTouchInput();
          ClampPosition();
      }

      private void HandleFollow()
      {
          if (string.IsNullOrEmpty(_followShipId)) return;
          var gm = GameManager.Instance;
          if (gm == null) return;
          var ship = gm.State.ships.Find(s => s.id == _followShipId);
          if (ship == null) { _followShipId = null; return; }

          Vector3 worldPos = new Vector3(ship.x, 0f, ship.y);
          // Move camera pivot while keeping height + angle
          Vector3 targetPos = worldPos + transform.rotation * new Vector3(0f, 0f, -60f);
          targetPos.y = 60f;
          transform.position = Vector3.Lerp(transform.position, targetPos, Time.deltaTime * followSmoothing);
      }

      private void HandleMouseInput()
      {
          // Zoom with scroll wheel
          float scroll = Input.GetAxis("Mouse ScrollWheel");
          if (Mathf.Abs(scroll) > 0.001f)
          {
              _cam.orthographicSize = Mathf.Clamp(_cam.orthographicSize - scroll * zoomSpeed, orthoSizeMin, orthoSizeMax);
          }

          // Pan with right mouse button or middle mouse button
          if (Input.GetMouseButtonDown(1) || Input.GetMouseButtonDown(2))
          {
              _dragOrigin = Input.mousePosition;
              _isDragging = true;
              _followShipId = null; // cancel follow on manual pan
          }
          if (Input.GetMouseButtonUp(1) || Input.GetMouseButtonUp(2))
              _isDragging = false;

          if (_isDragging)
          {
              Vector3 delta = Input.mousePosition - _dragOrigin;
              _dragOrigin = Input.mousePosition;
              // Pan in camera-local XZ plane
              Vector3 right = transform.right;
              Vector3 fwd = Vector3.Cross(right, Vector3.up);
              transform.position -= (right * delta.x + fwd * delta.y) * panSpeed * (_cam.orthographicSize / orthoSizeDefault);
          }
      }

      private void HandleTouchInput()
      {
          if (Input.touchCount == 1)
          {
              var touch = Input.GetTouch(0);
              if (touch.phase == TouchPhase.Began)
              {
                  _dragOrigin = touch.position;
                  _isDragging = true;
                  _followShipId = null;
              }
              if (touch.phase == TouchPhase.Ended || touch.phase == TouchPhase.Canceled)
                  _isDragging = false;
              if (_isDragging && touch.phase == TouchPhase.Moved)
              {
                  Vector3 delta = (Vector3)touch.deltaPosition;
                  Vector3 right = transform.right;
                  Vector3 fwd = Vector3.Cross(right, Vector3.up);
                  transform.position -= (right * delta.x + fwd * delta.y) * panSpeed * 0.5f * (_cam.orthographicSize / orthoSizeDefault);
              }
          }
          else if (Input.touchCount == 2)
          {
              _isDragging = false;
              var t0 = Input.GetTouch(0);
              var t1 = Input.GetTouch(1);
              float dist = Vector2.Distance(t0.position, t1.position);
              if (t0.phase == TouchPhase.Began || t1.phase == TouchPhase.Began)
              {
                  _prevPinchDist = dist;
                  return;
              }
              float delta = _prevPinchDist - dist;
              _cam.orthographicSize = Mathf.Clamp(_cam.orthographicSize + delta * pinchSpeed, orthoSizeMin, orthoSizeMax);
              _prevPinchDist = dist;
          }
      }

      private void ClampPosition()
      {
          // Keep camera looking over the 0-100 map
          Vector3 p = transform.position;
          p.x = Mathf.Clamp(p.x, -20f, 120f);
          p.z = Mathf.Clamp(p.z, -40f, 100f);
          transform.position = p;
      }

      public void FollowShip(string shipId)
      {
          _followShipId = shipId;
      }

      public void CenterOn(float x, float z)
      {
          _followShipId = null;
          Vector3 worldPos = new Vector3(x, 0f, z);
          Vector3 targetPos = worldPos + transform.rotation * new Vector3(0f, 0f, -60f);
          targetPos.y = 60f;
          transform.position = targetPos;
      }

      // World position from a screen click (on XZ plane y=0)
      public bool ScreenToWorld(Vector2 screenPos, out Vector3 worldPos)
      {
          Ray ray = _cam.ScreenPointToRay(screenPos);
          var plane = new Plane(Vector3.up, Vector3.zero);
          if (plane.Raycast(ray, out float enter))
          {
              worldPos = ray.GetPoint(enter);
              return true;
          }
          worldPos = Vector3.zero;
          return false;
      }
  }
  ```

- [ ] **Step 2: In Unity Editor**

  Select Main Camera. Attach `IsometricCamera` script.
  Remove or disable the default `CinemachineBrain` if present.
  Set Camera component: Projection = Orthographic. Clear Flags = Solid Color (dark blue).

- [ ] **Step 3: Enter Play mode**

  Expected: camera shows map from isometric angle. Right-click drag pans. Scroll wheel zooms.

- [ ] **Step 4: Commit**

  ```bash
  git add Assets/Scripts/Camera/IsometricCamera.cs
  git commit -m "feat(unity): IsometricCamera — ortho, 45/45 angle, pan/zoom/pinch, ship follow"
  ```

---

### Task 6: Click Detection (Port + Ship Selection)

**Files:**
- Create: `Assets/Scripts/World/WorldInputHandler.cs`

- [ ] **Step 1: Create WorldInputHandler.cs**

  ```csharp
  // Assets/Scripts/World/WorldInputHandler.cs
  using UnityEngine;

  /// Handles left-click selection: ships take priority over ports.
  public class WorldInputHandler : MonoBehaviour
  {
      [SerializeField] private LayerMask shipLayer;
      [SerializeField] private LayerMask portLayer;

      private Camera _cam;
      private WorldBuilder _worldBuilder;
      private IsometricCamera _isoCamera;

      // Events consumed by UIManager
      public static event System.Action<string> OnShipSelected;   // shipId
      public static event System.Action<string> OnPortSelected;   // portId

      void Start()
      {
          _cam = Camera.main;
          _worldBuilder = FindObjectOfType<WorldBuilder>();
          _isoCamera = FindObjectOfType<IsometricCamera>();
      }

      void Update()
      {
          if (!Input.GetMouseButtonDown(0)) return;

          // Raycast ships first (higher priority)
          Ray ray = _cam.ScreenPointToRay(Input.mousePosition);
          if (Physics.Raycast(ray, out RaycastHit hit, 500f, shipLayer))
          {
              var sc = hit.collider.GetComponentInParent<ShipController>();
              if (sc != null)
              {
                  OnShipSelected?.Invoke(sc.shipId);
                  _isoCamera.FollowShip(sc.shipId);
                  return;
              }
          }

          // Then ports
          if (Physics.Raycast(ray, out hit, 500f, portLayer))
          {
              var po = hit.collider.GetComponentInParent<PortObject>();
              if (po != null)
              {
                  OnPortSelected?.Invoke(po.portId);
                  _isoCamera.CenterOn(po.transform.position.x, po.transform.position.z);
                  return;
              }
          }
      }
  }
  ```

- [ ] **Step 2: In Unity Editor — set up layers**

  Edit → Project Settings → Tags and Layers.
  Add layers: "Ship" (layer 6), "Port" (layer 7).

  Select all ship prefabs → Inspector → Layer → "Ship".
  Select all port prefabs → Inspector → Layer → "Port".
  Make sure colliders exist on the GameObjects (Capsule/Cylinder automatically have them).

- [ ] **Step 3: In Unity Editor — create WorldInputHandler GameObject**

  Create empty GameObject "WorldInputHandler" in scene.
  Attach `WorldInputHandler` script.
  Set Ship Layer mask = Ship, Port Layer mask = Port.

- [ ] **Step 4: Enter Play mode. Click on ocean (no selection), click on port cylinder.**

  Expected: port click fires `OnPortSelected` (verify with Debug.Log temporarily added).

- [ ] **Step 5: Commit**

  ```bash
  git add Assets/Scripts/World/WorldInputHandler.cs
  git commit -m "feat(unity): WorldInputHandler — click ship (priority) or port, fire selection events"
  ```

---

### Task 7: Route Mode (Set Ship Destination by Clicking Port)

**Files:**
- Modify: `Assets/Scripts/World/WorldInputHandler.cs`

- [ ] **Step 1: Add route mode to WorldInputHandler.cs**

  Replace the full file with:

  ```csharp
  // Assets/Scripts/World/WorldInputHandler.cs
  using UnityEngine;

  /// Left-click: select ship → enter route mode → click port → ship sails there.
  /// Ships have higher click priority than ports.
  public class WorldInputHandler : MonoBehaviour
  {
      [SerializeField] private LayerMask shipLayer;
      [SerializeField] private LayerMask portLayer;

      private Camera _cam;
      private IsometricCamera _isoCamera;

      private string _selectedShipId;   // currently selected ship
      private bool _routeMode;          // waiting for destination click

      public static event System.Action<string> OnShipSelected;
      public static event System.Action<string> OnPortSelected;
      public static event System.Action<string, string> OnRouteSet;  // (shipId, portId)

      void Start()
      {
          _cam = Camera.main;
          _isoCamera = FindObjectOfType<IsometricCamera>();
      }

      void Update()
      {
          if (!Input.GetMouseButtonDown(0)) return;

          Ray ray = _cam.ScreenPointToRay(Input.mousePosition);

          // Always check ships first
          if (Physics.Raycast(ray, out RaycastHit hitShip, 500f, shipLayer))
          {
              var sc = hitShip.collider.GetComponentInParent<ShipController>();
              if (sc != null)
              {
                  SelectShip(sc.shipId);
                  return;
              }
          }

          // In route mode, a port click = set destination
          if (_routeMode && Physics.Raycast(ray, out RaycastHit hitPort, 500f, portLayer))
          {
              var po = hitPort.collider.GetComponentInParent<PortObject>();
              if (po != null)
              {
                  SetRoute(_selectedShipId, po);
                  return;
              }
          }

          // Not in route mode: port click = open price panel
          if (!_routeMode && Physics.Raycast(ray, out RaycastHit hitPort2, 500f, portLayer))
          {
              var po = hitPort2.collider.GetComponentInParent<PortObject>();
              if (po != null)
              {
                  OnPortSelected?.Invoke(po.portId);
                  _isoCamera.CenterOn(po.transform.position.x, po.transform.position.z);
                  return;
              }
          }

          // Click on empty ocean cancels route mode
          if (_routeMode)
          {
              _routeMode = false;
              Debug.Log("[WorldInput] Route mode cancelled");
          }
      }

      private void SelectShip(string shipId)
      {
          if (_selectedShipId == shipId && !_routeMode)
          {
              // Second click on same ship = enter route mode
              _routeMode = true;
              Debug.Log($"[WorldInput] Route mode: pick destination for {shipId}");
          }
          else
          {
              _selectedShipId = shipId;
              _routeMode = false;
              _isoCamera.FollowShip(shipId);
              OnShipSelected?.Invoke(shipId);
          }
      }

      private void SetRoute(string shipId, PortObject port)
      {
          _routeMode = false;
          var sc = FindShipController(shipId);
          if (sc == null) return;
          sc.SetDestination(port.transform.position.x, port.transform.position.z, port.portId);
          OnRouteSet?.Invoke(shipId, port.portId);
          Debug.Log($"[WorldInput] {shipId} → {port.portId}");
      }

      private ShipController FindShipController(string shipId)
      {
          var controllers = FindObjectsOfType<ShipController>();
          foreach (var sc in controllers)
              if (sc.shipId == shipId) return sc;
          return null;
      }

      public bool IsInRouteMode => _routeMode;
      public string SelectedShipId => _selectedShipId;
  }
  ```

- [ ] **Step 2: Enter Play mode. Click ship once (selects), click ship again (route mode), click a port.**

  Expected: Console shows "Route mode: pick destination" then "shipId → portId". Ship starts moving toward port.

- [ ] **Step 3: Commit**

  ```bash
  git add Assets/Scripts/World/WorldInputHandler.cs
  git commit -m "feat(unity): route mode — click ship twice, then click port to sail there"
  ```

---

## Self-Review

**Spec coverage check:**
- [x] Isometric camera — Task 5 (Euler 45°,45°,0° ortho, pan/zoom/pinch)
- [x] Low-poly ocean — Task 1 (plane with scrolling UV)
- [x] Port GameObjects at correct map positions — Tasks 2, 4
- [x] Ship movement between ports — Task 3 (ShipController)
- [x] Fuel burn during travel — Task 3 (ShipController.MoveShip)
- [x] Event trigger every 5s at sea — Task 3 (CheckEvents)
- [x] Ship priority over port on click — Task 6, 7
- [x] Route mode: click ship → click port → sail — Task 7
- [x] Camera follows active ship — Task 5 (FollowShip)
- [x] PC mouse + mobile touch input — Task 5 (both handled)

**Type consistency:**
- `ShipController.SetDestination(float x, float y, string portId)` called in `WorldInputHandler.SetRoute` — port.transform.position.x/.z passed correctly ✓
- `IsometricCamera.FollowShip(string shipId)` matches signature used in `WorldInputHandler.SelectShip` ✓
- `EventSystem.TryTriggerEvent(GameState, ShipData)` returns `EventResult` handled by `GameManager.HandleEventResult` ✓
- `GameManager.OnShipArrivedAtPort(ShipData, string)` called in `ShipController.MoveShip` on arrival ✓
