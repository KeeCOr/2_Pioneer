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
        public List<CargoItem>  Cargo    = new();
        public ShipUpgrades     Upgrades = new();
        public bool   BoosterActive;
        public float  TotalDistanceTraveled;
    }

    [Serializable]
    public class CrewMember
    {
        public int    Id;
        public string Name;
        public int    ShipId = -1;
        public string Specialty;
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
        public string Rarity;
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
        public string Direction;
        public float  Accuracy;
        public int    Magnitude;
        public int    TurnsUntil;
        public int    TurnsRemaining;
        public bool   Applied;
        public int    HitValue;  // -1=미확인, 0=빗나감, 1=적중
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
        public string Type;
        public int    Target;
        public int    Progress;
        public bool   IsComplete;
    }

    // prices와 priceHistory는 JsonUtility로 직렬화가 안 되므로
    // 별도 래퍼 클래스를 사용
    [Serializable]
    public class ResourcePrice
    {
        public string Resource;
        public float  Price;
    }

    [Serializable]
    public class PortPrices
    {
        public string              PortKey;
        public List<ResourcePrice> Prices = new();
    }

    [Serializable]
    public class ResourceHistory
    {
        public string       Resource;
        public List<float>  Prices = new();
    }

    [Serializable]
    public class PortPriceHistory
    {
        public string                 PortKey;
        public List<ResourceHistory>  History = new();
    }

    [Serializable]
    public class InfoBuyEntry
    {
        public string InfoId;
        public int    Count;
    }

    [Serializable]
    public class GameState
    {
        public long  Gold          = 500;
        public int   Gems          = 0;
        public long  TotalEarned   = 0;
        public long  TotalSpent    = 0;
        public int   TotalTradesDone = 0;

        public int   TaxLevel     = 1;
        public float TaxTimer     = 0f;
        public int   MilestoneIdx = 0;

        public int   GameDay      = 1;
        public float GameTimeSec  = 0f;

        // 직렬화 가능 가격 저장소
        public List<PortPrices>       PriceStore   = new();
        public List<PortPriceHistory> HistoryStore = new();

        public List<ShipState>    Ships  = new();
        public List<CrewMember>   Crew   = new();
        public int                NextShipId = 2;
        public int                NextCrewId = 1;

        public List<string>       VisitedPorts = new();
        public List<InfoBuyEntry> InfoBuyCount = new();

        public List<Prediction>    Predictions    = new();
        public List<DeliveryQuest> DeliveryQuests = new();
        public List<DailyGoal>     DailyGoals     = new();

        public float SmallPriceTimer  = 0f;
        public float MarketEventTimer = 0f;

        // 런타임 전용 — 저장 안 함, GameManager에서 재구성
        [NonSerialized] public Dictionary<string, Dictionary<string, float>> Prices    = new();
        [NonSerialized] public Dictionary<string, Dictionary<string, List<float>>> PriceHistory = new();
        [NonSerialized] public Dictionary<string, int> InfoBuyCountDict = new();

        public int GetInfoBuyCount(string infoId)
        {
            var entry = InfoBuyCount.Find(e => e.InfoId == infoId);
            return entry?.Count ?? 0;
        }

        public void IncrementInfoBuyCount(string infoId)
        {
            var entry = InfoBuyCount.Find(e => e.InfoId == infoId);
            if (entry != null) entry.Count++;
            else InfoBuyCount.Add(new InfoBuyEntry { InfoId=infoId, Count=1 });
        }
    }
}
