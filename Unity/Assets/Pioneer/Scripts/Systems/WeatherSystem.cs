using Pioneer.Core;
using UnityEngine;

namespace Pioneer.Systems
{
    public static class WeatherSystem
    {
        public static string GetWeatherKey(ShipState ship)
        {
            float timeSeed  = Mathf.Floor(Time.time / GameConstants.WeatherChangeInterval);
            float routeY    = ship.Y;
            var   pool      = GameConstants.GetWeatherPool(routeY);
            float sinVal    = Mathf.Sin(ship.Id * 1.7f + timeSeed * 2.13f) * 10000f;
            int   hash      = Mathf.Abs(Mathf.RoundToInt(sinVal)) % pool.Length;
            return pool[hash];
        }
    }
}
