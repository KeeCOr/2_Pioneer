using System.Collections.Generic;
using UnityEngine;

namespace Pioneer.Core
{
    public class PortData
    {
        public string Key;
        public string Name;
        public string Region;
        public string Country;
        public float  X;
        public float  Y;
        public float  HarborX;
        public float  HarborY;
    }

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

    public class ResourceData
    {
        public string Name;
        public string Icon;
        public int    Tier;
        public int    TierGoldReq;
    }

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

    public class ResourceRegion
    {
        public string[] Cheap;
        public string[] Expensive;
    }

    public static class GameConstants
    {
        public const float TradeFeePercent          = 10f;
        public const float SailingPaceMult          = 0.55f;
        public const float BoosterSpeedMult         = 1.2f;
        public const float BoosterFuelCostMult      = 1.5f;
        public const int   TaxIntervalSeconds       = 86400;
        public const float WeatherChangeInterval    = 900f;   // 15분
        public const int   SmallPriceIntervalSeconds  = 180;
        public const int   MarketEventIntervalSeconds = 3600;
        public const float MinPrice             = 20f;
        public const float SmallDriftRate       = 0.025f;
        public const float PlayerImpactRate     = 0.012f;
        public const float PlayerImpactCap      = 0.18f;
        public const float MajorEventRateMin    = 0.16f;
        public const float MajorEventRateMax    = 0.38f;

        public static readonly int[] EarnMilestones    = { 10000, 50000, 200000, 800000, 3000000 };
        public static readonly int[] TaxTable          = { 200, 600, 1000, 3000, 7000, 20000, 50000, 120000, 300000, 750000 };
        public static readonly string[] StartUnlockedPorts =
            { "lisbon","bristol","london","hamburg","antwerp","marseille" };

        public static readonly Dictionary<string, int> RegionUnlockGold = new()
        {
            {"europe",0},{"mediterranean",1500},{"arabian",8000},
            {"americas",12000},{"south_asia",20000},{"east_asia",45000}
        };

        public static readonly Dictionary<int,int> TierGoldReq = new()
        {
            {1,0},{2,1000},{3,8000},{4,30000}
        };

        public static readonly Dictionary<string, PortData> Ports = new()
        {
            {"london",     new(){Key="london",     Name="런던",         Region="europe",        Country="GB", X=47.0f, Y=32.0f, HarborX=46.5f, HarborY=34.8f}},
            {"bristol",    new(){Key="bristol",    Name="브리스톨",     Region="europe",        Country="GB", X=46.0f, Y=34.0f, HarborX=43.8f, HarborY=35.7f}},
            {"lisbon",     new(){Key="lisbon",     Name="리스본",       Region="europe",        Country="PT", X=43.2f, Y=43.5f, HarborX=40.6f, HarborY=42.1f}},
            {"hamburg",    new(){Key="hamburg",    Name="함부르크",     Region="europe",        Country="DE", X=50.7f, Y=32.2f, HarborX=52.8f, HarborY=30.3f}},
            {"antwerp",    new(){Key="antwerp",    Name="앤트워프",     Region="europe",        Country="BE", X=48.5f, Y=34.2f, HarborX=47.5f, HarborY=31.6f}},
            {"marseille",  new(){Key="marseille",  Name="마르세유",     Region="mediterranean", Country="FR", X=49.0f, Y=41.0f, HarborX=48.8f, HarborY=44.0f}},
            {"genoa",      new(){Key="genoa",      Name="제노바",       Region="mediterranean", Country="IT", X=50.8f, Y=40.4f, HarborX=48.27f,HarborY=41.66f}},
            {"venice",     new(){Key="venice",     Name="베니스",       Region="mediterranean", Country="IT", X=52.1f, Y=39.3f, HarborX=54.5f, HarborY=40.8f}},
            {"tripoli",    new(){Key="tripoli",    Name="트리폴리",     Region="mediterranean", Country="LY", X=51.0f, Y=51.5f, HarborX=50.2f, HarborY=48.8f}},
            {"istanbul",   new(){Key="istanbul",   Name="이스탄불",     Region="mediterranean", Country="TR", X=56.8f, Y=40.6f, HarborX=59.6f, HarborY=41.1f}},
            {"alexandria", new(){Key="alexandria", Name="알렉산드리아", Region="arabian",       Country="EG", X=55.0f, Y=49.0f, HarborX=52.2f, HarborY=48.5f}},
            {"aden",       new(){Key="aden",       Name="아덴",         Region="arabian",       Country="YE", X=62.7f, Y=60.0f, HarborX=65.3f, HarborY=59.0f}},
            {"dubai",      new(){Key="dubai",      Name="두바이",       Region="arabian",       Country="AE", X=65.5f, Y=52.4f, HarborX=64.11f,HarborY=54.84f}},
            {"mumbai",     new(){Key="mumbai",     Name="뭄바이",       Region="south_asia",    Country="IN", X=69.8f, Y=58.4f, HarborX=69.8f, HarborY=61.2f}},
            {"goa",        new(){Key="goa",        Name="고아",         Region="south_asia",    Country="IN", X=69.8f, Y=62.0f, HarborX=69.1f, HarborY=64.7f}},
            {"calicut",    new(){Key="calicut",    Name="칼리컷",       Region="south_asia",    Country="IN", X=70.6f, Y=65.0f, HarborX=70.5f, HarborY=62.2f}},
            {"colombo",    new(){Key="colombo",    Name="콜롬보",       Region="south_asia",    Country="LK", X=72.3f, Y=70.8f, HarborX=70.0f, HarborY=72.4f}},
            {"malacca",    new(){Key="malacca",    Name="말라카",       Region="east_asia",     Country="MY", X=81.5f, Y=68.5f, HarborX=83.3f, HarborY=66.3f}},
            {"singapore",  new(){Key="singapore",  Name="싱가포르",     Region="east_asia",     Country="SG", X=82.4f, Y=70.8f, HarborX=79.7f, HarborY=71.4f}},
            {"bangkok",    new(){Key="bangkok",    Name="방콕",         Region="east_asia",     Country="TH", X=80.0f, Y=62.0f, HarborX=80.7f, HarborY=59.3f}},
            {"guangzhou",  new(){Key="guangzhou",  Name="광저우",       Region="east_asia",     Country="CN", X=84.6f, Y=52.3f, HarborX=81.8f, HarborY=52.0f}},
            {"shanghai",   new(){Key="shanghai",   Name="상하이",       Region="east_asia",     Country="CN", X=87.0f, Y=44.0f, HarborX=84.7f, HarborY=45.6f}},
            {"yokohama",   new(){Key="yokohama",   Name="요코하마",     Region="east_asia",     Country="JP", X=92.0f, Y=42.0f, HarborX=91.7f, HarborY=39.2f}},
            {"busan",      new(){Key="busan",      Name="부산",         Region="east_asia",     Country="KR", X=89.6f, Y=43.5f, HarborX=86.8f, HarborY=44.0f}},
            {"incheon",    new(){Key="incheon",    Name="인천",         Region="east_asia",     Country="KR", X=88.8f, Y=42.4f, HarborX=86.3f, HarborY=41.1f}},
            {"boston",     new(){Key="boston",     Name="보스턴",       Region="americas",      Country="US", X=26.0f, Y=39.2f, HarborX=28.5f, HarborY=37.9f}},
            {"newyork",    new(){Key="newyork",    Name="뉴욕",         Region="americas",      Country="US", X=24.5f, Y=41.8f, HarborX=27.3f, HarborY=42.4f}},
            {"neworleans", new(){Key="neworleans", Name="뉴올리언스",   Region="americas",      Country="US", X=22.0f, Y=52.5f, HarborX=19.2f, HarborY=52.6f}},
            {"havana",     new(){Key="havana",     Name="하바나",       Region="americas",      Country="CU", X=24.8f, Y=56.2f, HarborX=23.9f, HarborY=53.6f}},
        };

        public static readonly Dictionary<string, ShipTypeData> ShipTypes = new()
        {
            {"rowboat",    new(){Key="rowboat",    Name="통통배",   Icon="boat",   BaseSpeed=0.014f, BaseCapacity=25,  MaxCrew=2,  Cost=1000  }},
            {"sloop",      new(){Key="sloop",      Name="슬루프",   Icon="sloop",  BaseSpeed=0.010f, BaseCapacity=55,  MaxCrew=4,  Cost=3000  }},
            {"caravel",    new(){Key="caravel",    Name="카라벨",   Icon="caravel",BaseSpeed=0.009f, BaseCapacity=80,  MaxCrew=6,  Cost=8000  }},
            {"brigantine", new(){Key="brigantine", Name="브리간틴", Icon="brig",   BaseSpeed=0.008f, BaseCapacity=100, MaxCrew=7,  Cost=12000 }},
            {"galley",     new(){Key="galley",     Name="갤리",     Icon="galley", BaseSpeed=0.006f, BaseCapacity=90,  MaxCrew=12, Cost=14000 }},
            {"dhow",       new(){Key="dhow",       Name="다우",     Icon="dhow",   BaseSpeed=0.009f, BaseCapacity=85,  MaxCrew=6,  Cost=16000 }},
            {"merchant",   new(){Key="merchant",   Name="상인선",   Icon="merch",  BaseSpeed=0.006f, BaseCapacity=140, MaxCrew=9,  Cost=20000 }},
            {"fluyt",      new(){Key="fluyt",      Name="플루트",   Icon="fluyt",  BaseSpeed=0.004f, BaseCapacity=200, MaxCrew=8,  Cost=28000 }},
            {"junk",       new(){Key="junk",       Name="정크선",   Icon="junk",   BaseSpeed=0.005f, BaseCapacity=220, MaxCrew=10, Cost=32000 }},
            {"galleon",    new(){Key="galleon",    Name="갤리온",   Icon="galleon",BaseSpeed=0.002f, BaseCapacity=280, MaxCrew=12, Cost=45000 }},
            {"frigate",    new(){Key="frigate",    Name="프리깃",   Icon="frigate",BaseSpeed=0.013f, BaseCapacity=120, MaxCrew=12, Cost=65000 }},
        };

        public static readonly Dictionary<string, ResourceData> Resources = new()
        {
            {"향신료",    new(){Name="향신료",    Icon="spice",    Tier=3, TierGoldReq=8000  }},
            {"도자기",    new(){Name="도자기",    Icon="ceramics", Tier=3, TierGoldReq=8000  }},
            {"비단",      new(){Name="비단",      Icon="silk",     Tier=3, TierGoldReq=8000  }},
            {"와인",      new(){Name="와인",      Icon="wine",     Tier=2, TierGoldReq=1000  }},
            {"다이아몬드",new(){Name="다이아몬드",Icon="diamond",  Tier=4, TierGoldReq=30000 }},
            {"해산물",    new(){Name="해산물",    Icon="seafood",  Tier=2, TierGoldReq=1000  }},
            {"면직물",    new(){Name="면직물",    Icon="cotton",   Tier=2, TierGoldReq=1000  }},
            {"양털",      new(){Name="양털",      Icon="wool",     Tier=1, TierGoldReq=0     }},
            {"계피",      new(){Name="계피",      Icon="cinnamon", Tier=3, TierGoldReq=8000  }},
            {"쌀",        new(){Name="쌀",        Icon="rice",     Tier=1, TierGoldReq=0     }},
        };

        public static readonly Dictionary<string, string> RegionNativeRes = new()
        {
            {"europe","양털"},{"mediterranean","와인"},{"arabian","계피"},
            {"south_asia","면직물"},{"east_asia","쌀"},{"americas","해산물"}
        };

        public static readonly Dictionary<string, ResourceRegion> ResourceRegions = new()
        {
            {"양털",      new(){Cheap=new[]{"europe"},                   Expensive=new[]{"east_asia","arabian"}}},
            {"와인",      new(){Cheap=new[]{"europe","mediterranean"},   Expensive=new[]{"east_asia","south_asia"}}},
            {"다이아몬드",new(){Cheap=new[]{"mediterranean"},            Expensive=new[]{"east_asia","south_asia"}}},
            {"향신료",    new(){Cheap=new[]{"south_asia","east_asia"},   Expensive=new[]{"europe","mediterranean"}}},
            {"도자기",    new(){Cheap=new[]{"east_asia"},                Expensive=new[]{"europe","mediterranean"}}},
            {"비단",      new(){Cheap=new[]{"east_asia"},                Expensive=new[]{"europe","arabian"}}},
            {"해산물",    new(){Cheap=new[]{"mediterranean","europe"},   Expensive=new[]{"east_asia","arabian"}}},
            {"면직물",    new(){Cheap=new[]{"south_asia","americas"},    Expensive=new[]{"europe","east_asia"}}},
            {"계피",      new(){Cheap=new[]{"south_asia"},               Expensive=new[]{"europe","arabian","mediterranean"}}},
            {"쌀",        new(){Cheap=new[]{"east_asia","south_asia"},   Expensive=new[]{"europe","arabian","americas"}}},
        };

        public static readonly Dictionary<string, WeatherData> WeatherTypes = new()
        {
            {"sunny",     new(){Key="sunny",     Icon="sun",       Name="맑음",      SpeedMult=1.05f, FuelMult=1.00f, HullDmg=0.000f}},
            {"cloudy",    new(){Key="cloudy",    Icon="cloud",     Name="흐림",      SpeedMult=1.00f, FuelMult=1.00f, HullDmg=0.000f}},
            {"rainy",     new(){Key="rainy",     Icon="rain",      Name="비",        SpeedMult=0.90f, FuelMult=1.10f, HullDmg=0.001f}},
            {"windy",     new(){Key="windy",     Icon="wind",      Name="강풍",      SpeedMult=1.12f, FuelMult=0.90f, HullDmg=0.002f}},
            {"foggy",     new(){Key="foggy",     Icon="fog",       Name="안개",      SpeedMult=0.78f, FuelMult=1.00f, HullDmg=0.000f}},
            {"fairwind",  new(){Key="fairwind",  Icon="rainbow",   Name="순풍",      SpeedMult=1.22f, FuelMult=0.82f, HullDmg=0.000f}},
            {"roughsea",  new(){Key="roughsea",  Icon="wave",      Name="거친 바다", SpeedMult=0.73f, FuelMult=1.22f, HullDmg=0.004f}},
            {"blizzard",  new(){Key="blizzard",  Icon="snow",      Name="눈보라",    SpeedMult=0.58f, FuelMult=1.32f, HullDmg=0.005f}},
            {"tradewind", new(){Key="tradewind", Icon="tradewind", Name="무역풍",    SpeedMult=1.18f, FuelMult=0.78f, HullDmg=0.000f}},
            {"heatwave",  new(){Key="heatwave",  Icon="heat",      Name="열파",      SpeedMult=0.85f, FuelMult=1.28f, HullDmg=0.002f}},
        };

        public static readonly PortInfoData[] PortInfoItems =
        {
            new(){Id="rumor",    Tier="basic",   BaseCost=300,  Name="거리 소문",        Accuracy=0.30f, MagMin=15,  MagMax=45,  Repeat=true },
            new(){Id="hint",     Tier="basic",   BaseCost=700,  Name="상인 귀띔",        Accuracy=0.40f, MagMin=25,  MagMax=65,  Repeat=true },
            new(){Id="analysis", Tier="premium", BaseCost=3000, Name="상업 분석 보고서", Accuracy=0.58f, MagMin=60,  MagMax=130, Repeat=false},
            new(){Id="route",    Tier="premium", BaseCost=8000, Name="내부 정보",        Accuracy=0.72f, MagMin=100, MagMax=200, Repeat=false},
        };

        public static int GetPortUnlockReq(string portKey)
        {
            if (System.Array.IndexOf(StartUnlockedPorts, portKey) >= 0) return 0;
            return Ports.TryGetValue(portKey, out var p) && RegionUnlockGold.TryGetValue(p.Region, out var g) ? g : 0;
        }

        public static bool IsPortUnlocked(string portKey, long totalEarned)
            => totalEarned >= GetPortUnlockReq(portKey);

        public static bool IsResourceUnlocked(string resource, long totalEarned)
            => Resources.TryGetValue(resource, out var r) && totalEarned >= r.TierGoldReq;

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
                                         * Mathf.Pow(1.5f,  buyCount));
    }
}
