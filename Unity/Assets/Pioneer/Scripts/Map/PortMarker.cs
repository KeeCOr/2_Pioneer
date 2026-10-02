using Pioneer.Core;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace Pioneer.Map
{
    public class PortMarker : MonoBehaviour
    {
        [SerializeField] Button            button;
        [SerializeField] Image             dotImage;
        [SerializeField] TextMeshProUGUI   nameLabel;

        private string        _portKey;
        private MapController _map;
        private RectTransform _rt;

        private static readonly System.Collections.Generic.Dictionary<string, Color> RegionColors = new()
        {
            {"europe",        new Color(0.38f, 0.65f, 0.98f)},
            {"mediterranean", new Color(0.65f, 0.55f, 0.98f)},
            {"arabian",       new Color(0.98f, 0.57f, 0.19f)},
            {"south_asia",    new Color(0.20f, 0.83f, 0.60f)},
            {"east_asia",     new Color(0.97f, 0.45f, 0.45f)},
            {"americas",      new Color(0.22f, 0.74f, 0.96f)},
        };

        public void Init(string portKey, MapController map)
        {
            _portKey = portKey;
            _map     = map;
            _rt      = GetComponent<RectTransform>();

            if (GameConstants.Ports.TryGetValue(portKey, out var p))
            {
                if (nameLabel != null) nameLabel.text = p.Name;
                if (dotImage  != null && RegionColors.TryGetValue(p.Region, out var col))
                    dotImage.color = col;
            }

            if (button != null) button.onClick.AddListener(OnClick);
        }

        void LateUpdate()
        {
            if (_map == null || !GameConstants.Ports.ContainsKey(_portKey)) return;
            var p = GameConstants.Ports[_portKey];
            _rt.anchoredPosition = _map.GetPortAnchoredPos(p.HarborX, p.HarborY);
        }

        public void SetUnlocked(bool unlocked)
        {
            if (dotImage == null) return;
            dotImage.color = unlocked
                ? (GameConstants.Ports.TryGetValue(_portKey, out var p) && RegionColors.TryGetValue(p.Region, out var col) ? col : Color.white)
                : new Color(0.4f, 0.4f, 0.4f);
        }

        private void OnClick() => _map?.NotifyPortClicked(_portKey);
    }
}
