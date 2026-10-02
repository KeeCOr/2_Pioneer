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
        public void GameConstants_PortsCount_Is30()
        {
            Assert.AreEqual(30, GameConstants.Ports.Count);
        }

        [Test]
        public void GameConstants_ShipTypesContainsSloop()
        {
            Assert.IsTrue(GameConstants.ShipTypes.ContainsKey("sloop"));
            Assert.AreEqual(55, GameConstants.ShipTypes["sloop"].BaseCapacity);
        }

        [Test]
        public void GameConstants_ResourcesCount_Is10()
        {
            Assert.AreEqual(10, GameConstants.Resources.Count);
        }

        [Test]
        public void GameConstants_IsPortUnlocked_StartPortsAtZero()
        {
            Assert.IsTrue(GameConstants.IsPortUnlocked("lisbon", 0));
            Assert.IsTrue(GameConstants.IsPortUnlocked("london", 0));
            Assert.IsTrue(GameConstants.IsPortUnlocked("hamburg", 0));
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

        [Test]
        public void GameConstants_CalcTax_OverMaxClampsToLast()
        {
            Assert.AreEqual(750000, GameConstants.CalcTax(100));
        }

        [Test]
        public void GameState_GetInfoBuyCount_Returns0WhenNotBought()
        {
            var state = new GameState();
            Assert.AreEqual(0, state.GetInfoBuyCount("rumor"));
        }

        [Test]
        public void GameState_IncrementInfoBuyCount_IncrementsCorrectly()
        {
            var state = new GameState();
            state.IncrementInfoBuyCount("rumor");
            state.IncrementInfoBuyCount("rumor");
            Assert.AreEqual(2, state.GetInfoBuyCount("rumor"));
        }
    }
}
