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
            var ship = MakeShip(43.2f, 43.5f);
            NavigationSystem.StartVoyage(ship, "london");
            Assert.IsTrue(ship.IsMoving);
        }

        [Test]
        public void StartVoyage_SetsTargetToHarborCoords()
        {
            var ship = MakeShip(43.2f, 43.5f);
            NavigationSystem.StartVoyage(ship, "london");
            Assert.AreEqual(GameConstants.Ports["london"].HarborX, ship.TargetX, 0.001f);
            Assert.AreEqual(GameConstants.Ports["london"].HarborY, ship.TargetY, 0.001f);
        }

        [Test]
        public void StartVoyage_SetsDestinationPortKey()
        {
            var ship = MakeShip(43.2f, 43.5f);
            NavigationSystem.StartVoyage(ship, "london");
            Assert.AreEqual("london", ship.DestinationPortKey);
        }

        [Test]
        public void TickMovement_MovesShipTowardTarget()
        {
            var ship = MakeShip(0f, 0f);
            ship.TargetX  = 10f;
            ship.TargetY  = 0f;
            ship.IsMoving = true;
            NavigationSystem.TickMovement(ship, 1f, speedOverride: 2f);
            Assert.Greater(ship.X, 0f);
            Assert.Less(ship.X, 10f);
        }

        [Test]
        public void TickMovement_StopsWhenArrived()
        {
            var ship = MakeShip(0f, 0f);
            ship.TargetX  = 1f;
            ship.TargetY  = 0f;
            ship.IsMoving = true;
            bool arrived = NavigationSystem.TickMovement(ship, 1f, speedOverride: 100f);
            Assert.IsTrue(arrived);
            Assert.IsFalse(ship.IsMoving);
            Assert.AreEqual(1f, ship.X, 0.001f);
        }

        [Test]
        public void TickMovement_AccumulatesTotalDistance()
        {
            var ship = MakeShip(0f, 0f);
            ship.TargetX  = 3f;
            ship.TargetY  = 4f;
            ship.IsMoving = true;
            NavigationSystem.TickMovement(ship, 1f, speedOverride: 100f); // 도착
            Assert.AreEqual(5f, ship.TotalDistanceTraveled, 0.01f);
        }

        [Test]
        public void Distance_CalculatesCorrectly()
        {
            Assert.AreEqual(5f, NavigationSystem.Distance(0f, 0f, 3f, 4f), 0.001f);
        }

        [Test]
        public void FindDockedPort_ReturnsPortKeyWhenNear()
        {
            var lisbon = GameConstants.Ports["lisbon"];
            var ship   = MakeShip(lisbon.X, lisbon.Y);
            Assert.AreEqual("lisbon", NavigationSystem.FindDockedPort(ship));
        }

        [Test]
        public void FindDockedPort_ReturnsNullWhenAtSea()
        {
            var ship = MakeShip(0f, 0f);
            Assert.IsNull(NavigationSystem.FindDockedPort(ship));
        }

        [Test]
        public void EstimateVoyageSeconds_PositiveForValidDest()
        {
            var ship = MakeShip(43.2f, 43.5f);
            float secs = NavigationSystem.EstimateVoyageSeconds(ship, "london");
            Assert.Greater(secs, 0f);
        }

        [Test]
        public void GetEffectiveSpeed_AppliesWeatherMult()
        {
            var ship   = MakeShip(0f, 0f, "sloop");
            float base_ = NavigationSystem.GetEffectiveSpeed(ship, "sunny");   // SpeedMult=1.05
            float slow  = NavigationSystem.GetEffectiveSpeed(ship, "blizzard"); // SpeedMult=0.58
            Assert.Greater(base_, slow);
        }
    }
}
