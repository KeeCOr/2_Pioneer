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
                {"lisbon", new(){{"양털",100f},{"와인",150f}}},
                {"london", new(){{"양털",120f},{"와인",130f}}},
            };
        }

        [Test]
        public void ApplySmallDrift_PositiveSeed_IncreasesPrice()
        {
            var prices   = MakePrices();
            float before = prices["lisbon"]["양털"];
            // randomFn=1.0f → drift=(1-0.5)*2*0.025=+0.025
            MarketSystem.ApplySmallDrift(prices, () => 1.0f);
            Assert.Greater(prices["lisbon"]["양털"], before);
        }

        [Test]
        public void ApplySmallDrift_NegativeSeed_DecreasesPrice()
        {
            var prices   = MakePrices();
            float before = prices["lisbon"]["양털"];
            // randomFn=0.0f → drift=-0.025
            MarketSystem.ApplySmallDrift(prices, () => 0.0f);
            Assert.Less(prices["lisbon"]["양털"], before);
        }

        [Test]
        public void ApplySmallDrift_NeverBelowMinPrice()
        {
            var prices = new Dictionary<string, Dictionary<string, float>>
                { {"lisbon", new(){{"양털", 21f}}} };
            MarketSystem.ApplySmallDrift(prices, () => 0f);
            Assert.GreaterOrEqual(prices["lisbon"]["양털"], GameConstants.MinPrice);
        }

        [Test]
        public void ApplyPlayerTradeImpact_SellLowersPrice()
        {
            var prices = MakePrices();
            float before = prices["lisbon"]["양털"];
            MarketSystem.ApplyPlayerTradeImpact(prices, "lisbon", "양털", 10, isSell: true);
            Assert.Less(prices["lisbon"]["양털"], before);
        }

        [Test]
        public void ApplyPlayerTradeImpact_BuyRaisesPrice()
        {
            var prices = MakePrices();
            float before = prices["lisbon"]["양털"];
            MarketSystem.ApplyPlayerTradeImpact(prices, "lisbon", "양털", 10, isSell: false);
            Assert.Greater(prices["lisbon"]["양털"], before);
        }

        [Test]
        public void ApplyPlayerTradeImpact_ZeroQty_NoChange()
        {
            var prices = MakePrices();
            float before = prices["lisbon"]["양털"];
            MarketSystem.ApplyPlayerTradeImpact(prices, "lisbon", "양털", 0, isSell: true);
            Assert.AreEqual(before, prices["lisbon"]["양털"], 0.001f);
        }

        [Test]
        public void ApplyMajorEvent_ReturnsAtLeastOneImpact()
        {
            var prices  = MakePrices();
            var impacts = MarketSystem.ApplyMajorEvent(prices, eventIndex: 0, randomFn: () => 0.5f);
            Assert.GreaterOrEqual(impacts.Count, 1);
        }

        [Test]
        public void InitPrices_AllPortsHaveAllResources()
        {
            var ports  = new[]{"lisbon","london"};
            var res    = new[]{"양털","와인"};
            var prices = MarketSystem.InitPrices(ports, res);
            Assert.AreEqual(2, prices.Count);
            foreach (var pk in ports)
                foreach (var r in res)
                    Assert.IsTrue(prices[pk].ContainsKey(r), $"{pk}에 {r} 없음");
        }

        [Test]
        public void InitPrices_AllPricesAboveMinPrice()
        {
            var prices = MarketSystem.InitPrices(
                GameConstants.Ports.Keys,
                GameConstants.Resources.Keys);
            foreach (var port in prices)
                foreach (var res in port.Value)
                    Assert.GreaterOrEqual(res.Value, GameConstants.MinPrice,
                        $"{port.Key}.{res.Key} = {res.Value}");
        }

        [Test]
        public void AppendPriceSnapshot_LimitsHistoryLength()
        {
            var history = new Dictionary<string, Dictionary<string, List<float>>>();
            var prices  = new Dictionary<string, Dictionary<string, float>>
                { {"lisbon", new(){{"양털",100f}}} };
            for (int i = 0; i < 25; i++)
                MarketSystem.AppendPriceSnapshot(history, prices, limit: 20);
            Assert.LessOrEqual(history["lisbon"]["양털"].Count, 20);
        }
    }
}
