using Pioneer.Core;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace Pioneer.Map
{
    public class ShipMarker : MonoBehaviour
    {
        [SerializeField] Image           shipIcon;
        [SerializeField] TextMeshProUGUI shipName;

        private ShipState     _ship;
        private MapController _map;
        private RectTransform _rt;

        public void Init(ShipState ship, MapController map)
        {
            _ship = ship;
            _map  = map;
            _rt   = GetComponent<RectTransform>();
            if (shipName != null) shipName.text = ship.Name;
        }

        void LateUpdate()
        {
            if (_ship == null || _map == null) return;
            _rt.anchoredPosition = _map.GetPortAnchoredPos(_ship.X, _ship.Y);
        }

        public void Refresh(ShipState ship) => _ship = ship;
    }
}
