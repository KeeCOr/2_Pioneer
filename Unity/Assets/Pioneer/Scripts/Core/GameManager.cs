using System;
using System.Collections;
using Pioneer.Systems;
using UnityEngine;

namespace Pioneer.Core
{
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Game Config")]
        [SerializeField] float gameSpeedMult = 1f;
        [SerializeField] bool  demoMode      = false;

        public GameState State { get; private set; }

        public event Action<ShipState, string> OnShipArrived;
        public event Action<long>              OnGoldChanged;
        public event Action                    OnPricesUpdated;
        public event Action<string>            OnLogMessage;
        public event Action<int>               OnNewDay;

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        void Start()
        {
            if (demoMode) gameSpeedMult = 10f;
            if (SaveSystem.HasSave())
            {
                var loaded = SaveSystem.Load();
                if (loaded != null) { State = loaded; RebuildRuntimeDicts(); }
                else NewGame();
            }
            else NewGame();
            StartCoroutine(GameLoop());
        }

        public void NewGame()
        {
            State = new GameState();
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
            State.Ships[0].Cargo.Add(new CargoItem { Resource="양털", Quantity=8 });
            State.VisitedPorts.AddRange(GameConstants.StartUnlockedPorts);
            State.Prices = MarketSystem.InitPrices(
                GameConstants.Ports.Keys,
                GameConstants.Resources.Keys);
            MarketSystem.AppendPriceSnapshot(State.PriceHistory, State.Prices);
        }

        // 저장된 State에서 런타임 Dictionary 재구성
        private void RebuildRuntimeDicts()
        {
            State.Prices       = new();
            State.PriceHistory = new();
            foreach (var pp in State.PriceStore)
            {
                State.Prices[pp.PortKey] = new();
                foreach (var rp in pp.Prices)
                    State.Prices[pp.PortKey][rp.Resource] = rp.Price;
            }
            foreach (var ph in State.HistoryStore)
            {
                State.PriceHistory[ph.PortKey] = new();
                foreach (var rh in ph.History)
                    State.PriceHistory[ph.PortKey][rh.Resource] = new(rh.Prices);
            }
            if (State.Prices.Count == 0)
                State.Prices = MarketSystem.InitPrices(
                    GameConstants.Ports.Keys, GameConstants.Resources.Keys);
        }

        // 저장 전 런타임 Dictionary → 직렬화 가능 리스트로 변환
        private void FlattenRuntimeDicts()
        {
            State.PriceStore = new();
            foreach (var pp in State.Prices)
            {
                var entry = new PortPrices { PortKey=pp.Key };
                foreach (var rp in pp.Value)
                    entry.Prices.Add(new ResourcePrice { Resource=rp.Key, Price=rp.Value });
                State.PriceStore.Add(entry);
            }
            State.HistoryStore = new();
            foreach (var ph in State.PriceHistory)
            {
                var entry = new PortPriceHistory { PortKey=ph.Key };
                foreach (var rh in ph.Value)
                    entry.History.Add(new ResourceHistory { Resource=rh.Key, Prices=new(rh.Value) });
                State.HistoryStore.Add(entry);
            }
        }

        public void Save()
        {
            FlattenRuntimeDicts();
            SaveSystem.Save(State);
        }

        // 게임 루프: 실제 시간 (1/gameSpeedMult)초마다 게임 내 1초 경과
        private IEnumerator GameLoop()
        {
            while (true)
            {
                yield return new WaitForSeconds(1f / gameSpeedMult);
                const float gameDelta = 1f;

                State.GameTimeSec     += gameDelta;
                State.SmallPriceTimer += gameDelta;
                State.MarketEventTimer+= gameDelta;
                State.TaxTimer        += gameDelta;

                // 선박 이동
                foreach (var ship in State.Ships)
                {
                    if (!ship.IsMoving) continue;
                    string wKey = WeatherSystem.GetWeatherKey(ship);
                    float  speed= NavigationSystem.GetEffectiveSpeed(ship, wKey);
                    bool arrived= NavigationSystem.TickMovement(ship, gameDelta, speed);
                    if (arrived)
                    {
                        string pk = NavigationSystem.FindDockedPort(ship);
                        if (pk == null) pk = ship.DestinationPortKey;
                        if (pk != null)
                        {
                            NavigationSystem.SnapToPort(ship, pk);
                            if (!State.VisitedPorts.Contains(pk))
                                State.VisitedPorts.Add(pk);
                            OnShipArrived?.Invoke(ship, pk);
                            Log($"{ship.Name}이(가) {GameConstants.Ports[pk].Name}에 입항!");
                        }
                    }
                }

                // 소규모 가격 드리프트
                if (State.SmallPriceTimer >= GameConstants.SmallPriceIntervalSeconds)
                {
                    State.SmallPriceTimer = 0f;
                    MarketSystem.ApplySmallDrift(State.Prices);
                    MarketSystem.AppendPriceSnapshot(State.PriceHistory, State.Prices);
                    OnPricesUpdated?.Invoke();
                }

                // 대형 시장 이벤트
                if (State.MarketEventTimer >= GameConstants.MarketEventIntervalSeconds)
                {
                    State.MarketEventTimer = 0f;
                    var impacts = MarketSystem.ApplyMajorEvent(State.Prices);
                    if (impacts.Count > 0)
                    {
                        var imp = impacts[0];
                        Log($"시장 이벤트: {imp.Resource} {(imp.Direction>0?"↑":"↓")} ({GameConstants.Ports[imp.PortKey].Name})");
                    }
                    OnPricesUpdated?.Invoke();
                }

                // 세금
                if (State.TaxTimer >= GameConstants.TaxIntervalSeconds)
                {
                    State.TaxTimer = 0f;
                    State.GameDay++;
                    int tax = GameConstants.CalcTax(State.TaxLevel);
                    State.Gold -= tax;
                    OnGoldChanged?.Invoke(State.Gold);
                    OnNewDay?.Invoke(State.GameDay);
                    Log($"Day {State.GameDay} — 세금 {tax:N0}금 납부 (레벨 {State.TaxLevel})");
                }

                CheckMilestones();
            }
        }

        private void CheckMilestones()
        {
            while (State.MilestoneIdx < GameConstants.EarnMilestones.Length &&
                   State.TotalEarned  >= GameConstants.EarnMilestones[State.MilestoneIdx])
            {
                State.TaxLevel++;
                State.MilestoneIdx++;
                Log($"마일스톤 달성! 세금 레벨 {State.TaxLevel}로 상승");
            }

            // 선박 추가 구매 시 세금 레벨 +1 (외부에서 호출)
        }

        public bool Buy(ShipState ship, string portKey, string resource, int qty)
        {
            if (!State.Prices.TryGetValue(portKey, out var pp)) return false;
            if (!pp.TryGetValue(resource, out var price)) return false;
            long total = (long)(price * qty);
            if (State.Gold < total) return false;

            State.Gold      -= total;
            State.TotalSpent += total;
            AddCargo(ship, resource, qty);
            MarketSystem.ApplyPlayerTradeImpact(State.Prices, portKey, resource, qty, false);
            OnGoldChanged?.Invoke(State.Gold);
            return true;
        }

        public bool Sell(ShipState ship, string portKey, string resource, int qty)
        {
            if (!RemoveCargo(ship, resource, qty)) return false;
            if (!State.Prices.TryGetValue(portKey, out var pp)) return false;
            if (!pp.TryGetValue(resource, out var price)) return false;

            long gross = (long)(price * qty);
            long fee   = (long)(gross * GameConstants.TradeFeePercent / 100f);
            long net   = gross - fee;
            State.Gold          += net;
            State.TotalEarned   += net;
            State.TotalTradesDone++;
            MarketSystem.ApplyPlayerTradeImpact(State.Prices, portKey, resource, qty, true);
            OnGoldChanged?.Invoke(State.Gold);
            CheckMilestones();
            return true;
        }

        public void Depart(ShipState ship, string destPortKey)
        {
            if (ship.IsMoving) return;
            NavigationSystem.StartVoyage(ship, destPortKey);
            Log($"{ship.Name}이(가) {GameConstants.Ports[destPortKey].Name}으로 출항!");
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

        void OnApplicationQuit() => Save();

        private void Log(string msg)
        {
            Debug.Log($"[Pioneer] {msg}");
            OnLogMessage?.Invoke(msg);
        }
    }
}
