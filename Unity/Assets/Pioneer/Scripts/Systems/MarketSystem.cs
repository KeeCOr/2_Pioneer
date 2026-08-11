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
        public int    Direction;
        public float  Magnitude;
    }

    public static class MarketSystem
    {
        // React applySmallMarketDrift 포팅
        // randomFn: 0~1 랜덤값 반환 함수. null이면 UnityEngine.Random.value 사용
        public static void ApplySmallDrift(
            Dictionary<string, Dictionary<string, float>> prices,
            Func<float> randomFn = null)
        {
            foreach (var port in prices)
            {
                var keys = new List<string>(port.Value.Keys);
                foreach (var res in keys)
                {
                    float r     = randomFn != null ? randomFn() : UnityEngine.Random.value;
                    float drift = (r - 0.5f) * 2f * GameConstants.SmallDriftRate;
                    port.Value[res] = ClampPrice(port.Value[res] * (1f + drift));
                }
            }
        }

        // React applyPlayerTradeImpact 포팅
        public static void ApplyPlayerTradeImpact(
            Dictionary<string, Dictionary<string, float>> prices,
            string portKey, string resource, int quantity, bool isSell)
        {
            if (!prices.TryGetValue(portKey, out var portPrices)) return;
            if (!portPrices.ContainsKey(resource) || quantity <= 0) return;

            float direction = isSell ? -1f : 1f;
            float impact    = Mathf.Clamp(
                quantity * GameConstants.PlayerImpactRate,
                -GameConstants.PlayerImpactCap,
                 GameConstants.PlayerImpactCap) * direction;
            portPrices[resource] = ClampPrice(portPrices[resource] * (1f + impact));
        }

        // React applyMajorMarketEvent 포팅
        public static List<MarketImpact> ApplyMajorEvent(
            Dictionary<string, Dictionary<string, float>> prices,
            int eventIndex = 0, Func<float> randomFn = null)
        {
            var impacts  = new List<MarketImpact>();
            var portKeys = new List<string>(prices.Keys);
            if (portKeys.Count == 0) return impacts;

            var resources = new List<string>(prices[portKeys[0]].Keys);
            if (resources.Count == 0) return impacts;

            float Rnd() => randomFn != null ? randomFn() : UnityEngine.Random.value;

            int   resIdx    = (int)(Rnd() * resources.Count) % resources.Count;
            string resource = resources[resIdx];
            int   direction = Rnd() >= 0.5f ? 1 : -1;
            float magnitude = GameConstants.MajorEventRateMin
                            + Rnd() * (GameConstants.MajorEventRateMax - GameConstants.MajorEventRateMin);
            int   count     = Mathf.Max(1, Mathf.Min(portKeys.Count, 2 + (eventIndex % 3)));
            int   start     = (int)(Rnd() * portKeys.Count) % portKeys.Count;

            var affected = new HashSet<string>();
            for (int i = 0; i < count; i++)
                affected.Add(portKeys[(start + i) % portKeys.Count]);

            foreach (var portKey in portKeys)
            {
                if (!affected.Contains(portKey)) continue;
                if (!prices[portKey].ContainsKey(resource)) continue;

                float before = prices[portKey][resource];
                float after  = ClampPrice(before * (1f + direction * magnitude));
                prices[portKey][resource] = after;
                impacts.Add(new MarketImpact
                {
                    PortKey=portKey, Resource=resource,
                    Before=before, After=after,
                    Direction=direction, Magnitude=magnitude
                });
            }
            return impacts;
        }

        // React appendPriceHistorySnapshot 포팅
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
                    while (history[port.Key][res.Key].Count > limit)
                        history[port.Key][res.Key].RemoveAt(0);
                }
            }
        }

        // 초기 가격 생성
        public static Dictionary<string, Dictionary<string, float>> InitPrices(
            IEnumerable<string> portKeys,
            IEnumerable<string> resourceNames)
        {
            var dict       = new Dictionary<string, Dictionary<string, float>>();
            var resList    = new List<string>(resourceNames);

            foreach (var pk in portKeys)
            {
                dict[pk] = new();
                if (!GameConstants.Ports.TryGetValue(pk, out var port)) continue;

                foreach (var res in resList)
                {
                    if (!GameConstants.Resources.TryGetValue(res, out var rd)) continue;
                    float basePrice = rd.Tier * 80f + 40f;

                    if (GameConstants.ResourceRegions.TryGetValue(res, out var rr))
                    {
                        if (Array.IndexOf(rr.Cheap, port.Region) >= 0)
                            basePrice *= 0.65f;
                        else if (Array.IndexOf(rr.Expensive, port.Region) >= 0)
                            basePrice *= 1.45f;
                    }

                    basePrice *= UnityEngine.Random.Range(0.88f, 1.12f);
                    dict[pk][res] = ClampPrice(basePrice);
                }
            }
            return dict;
        }

        private static float ClampPrice(float v)
            => Mathf.Max(GameConstants.MinPrice, Mathf.Floor(v));
    }
}
