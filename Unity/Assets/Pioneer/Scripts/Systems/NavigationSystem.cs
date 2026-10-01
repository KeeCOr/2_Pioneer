using Pioneer.Core;
using UnityEngine;

namespace Pioneer.Systems
{
    public static class NavigationSystem
    {
        // 출항: 목적지 항구로 항해 시작
        public static void StartVoyage(ShipState ship, string destinationKey)
        {
            if (!GameConstants.Ports.TryGetValue(destinationKey, out var dest)) return;
            ship.StartX             = ship.X;
            ship.StartY             = ship.Y;
            ship.TargetX            = dest.HarborX;
            ship.TargetY            = dest.HarborY;
            ship.DestinationPortKey = destinationKey;
            ship.IsMoving           = true;
        }

        // 한 프레임(deltaTime=게임 내 초) 이동. 도착 시 true 반환
        public static bool TickMovement(ShipState ship, float deltaTime, float speedOverride = 0f)
        {
            if (!ship.IsMoving) return false;
            if (!GameConstants.ShipTypes.TryGetValue(ship.Type, out var st)) return false;

            float speed = speedOverride > 0f
                ? speedOverride
                : st.BaseSpeed * GameConstants.SailingPaceMult;

            float dx   = ship.TargetX - ship.X;
            float dy   = ship.TargetY - ship.Y;
            float dist = Mathf.Sqrt(dx * dx + dy * dy);
            float step = speed * deltaTime;

            if (step >= dist)
            {
                ship.TotalDistanceTraveled += dist;
                ship.X       = ship.TargetX;
                ship.Y       = ship.TargetY;
                ship.IsMoving = false;
                return true;
            }

            float ratio = step / dist;
            ship.X += dx * ratio;
            ship.Y += dy * ratio;
            ship.TotalDistanceTraveled += step;
            return false;
        }

        public static float Distance(float x1, float y1, float x2, float y2)
            => Mathf.Sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));

        // 선박이 정박 중인 항구 키 반환 (3.5% 이내)
        public static string FindDockedPort(ShipState ship)
        {
            foreach (var kvp in GameConstants.Ports)
            {
                var p = kvp.Value;
                if (Distance(ship.X, ship.Y, p.X,       p.Y)       < 3.5f ||
                    Distance(ship.X, ship.Y, p.HarborX,  p.HarborY) < 3.5f)
                    return kvp.Key;
            }
            return null;
        }

        // 항해 예상 시간 (게임 내 초)
        public static float EstimateVoyageSeconds(ShipState ship, string destKey)
        {
            if (!GameConstants.Ports.TryGetValue(destKey, out var dest)) return 0f;
            if (!GameConstants.ShipTypes.TryGetValue(ship.Type, out var st)) return 0f;
            float dist  = Distance(ship.X, ship.Y, dest.HarborX, dest.HarborY);
            float speed = st.BaseSpeed * GameConstants.SailingPaceMult;
            return speed > 0f ? dist / speed : 9999f;
        }

        // 날씨 보정 포함 실제 속도
        public static float GetEffectiveSpeed(ShipState ship, string weatherKey)
        {
            if (!GameConstants.ShipTypes.TryGetValue(ship.Type, out var st)) return 0.001f;
            float base_ = st.BaseSpeed * GameConstants.SailingPaceMult;
            if (GameConstants.WeatherTypes.TryGetValue(weatherKey, out var w))
                base_ *= w.SpeedMult;
            return base_;
        }

        // 도착 후 항구에 스냅
        public static void SnapToPort(ShipState ship, string portKey)
        {
            if (!GameConstants.Ports.TryGetValue(portKey, out var p)) return;
            ship.X                  = p.HarborX;
            ship.Y                  = p.HarborY;
            ship.IsMoving           = false;
            ship.DestinationPortKey = null;
        }
    }
}
