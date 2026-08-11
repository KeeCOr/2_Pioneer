using System.Collections.Generic;
using Pioneer.Core;
using UnityEngine;

namespace Pioneer.Map
{
    public class MapSpawner : MonoBehaviour
    {
        [SerializeField] MapController mapController;
        [SerializeField] Transform     portMarkersParent;
        [SerializeField] Transform     shipMarkersParent;
        [SerializeField] GameObject    portMarkerPrefab;
        [SerializeField] GameObject    shipMarkerPrefab;

        private readonly Dictionary<string, PortMarker> _portMarkers = new();
        private readonly Dictionary<int,    ShipMarker> _shipMarkers = new();

        void Start()
        {
            SpawnPortMarkers();
            if (GameManager.Instance != null)
            {
                SpawnShipMarkers(GameManager.Instance.State);
                GameManager.Instance.OnShipArrived += (ship, _) => RefreshShipMarker(ship);
            }
        }

        void SpawnPortMarkers()
        {
            long earned = GameManager.Instance?.State.TotalEarned ?? 0;
            foreach (var kvp in GameConstants.Ports)
            {
                var go = Instantiate(portMarkerPrefab, portMarkersParent);
                var m  = go.GetComponent<PortMarker>();
                m.Init(kvp.Key, mapController);
                m.SetUnlocked(GameConstants.IsPortUnlocked(kvp.Key, earned));
                _portMarkers[kvp.Key] = m;
            }
        }

        void SpawnShipMarkers(GameState state)
        {
            foreach (var ship in state.Ships)
            {
                var go = Instantiate(shipMarkerPrefab, shipMarkersParent);
                var m  = go.GetComponent<ShipMarker>();
                m.Init(ship, mapController);
                _shipMarkers[ship.Id] = m;
            }
        }

        void RefreshShipMarker(ShipState ship)
        {
            if (_shipMarkers.TryGetValue(ship.Id, out var m))
                m.Refresh(ship);
        }

        // 새 선박 추가 시 호출
        public void AddShipMarker(ShipState ship)
        {
            if (_shipMarkers.ContainsKey(ship.Id)) return;
            var go = Instantiate(shipMarkerPrefab, shipMarkersParent);
            var m  = go.GetComponent<ShipMarker>();
            m.Init(ship, mapController);
            _shipMarkers[ship.Id] = m;
        }

        // 항구 해금 상태 갱신
        public void RefreshPortUnlocks(long totalEarned)
        {
            foreach (var kvp in _portMarkers)
                kvp.Value.SetUnlocked(GameConstants.IsPortUnlocked(kvp.Key, totalEarned));
        }
    }
}
