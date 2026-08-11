using System;
using Pioneer.Core;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Pioneer.Map
{
    [RequireComponent(typeof(RectTransform))]
    public class MapController : MonoBehaviour, IDragHandler, IScrollHandler, IPointerClickHandler
    {
        [Header("References")]
        [SerializeField] RectTransform mapImageRect;   // 세계지도 RawImage
        [SerializeField] RectTransform viewportRect;   // 보이는 영역 (Mask)

        [Header("Zoom")]
        [SerializeField] float minZoom   = 0.5f;
        [SerializeField] float maxZoom   = 4.0f;
        [SerializeField] float zoomSpeed = 0.1f;

        [Header("Initial View")]
        [SerializeField] float initialZoom = 1.35f;
        [SerializeField] Vector2 initialPan = new(-260f, 70f);

        private float   _zoom;
        private Vector2 _pan;

        public event Action<string> OnPortClicked;

        void Awake()
        {
            _zoom = initialZoom;
            _pan  = initialPan;
        }

        void Start() => ApplyTransform();

        // 맵 % 좌표(0~100) → PortMarkersContainer 기준 앵커드포지션
        public Vector2 GetPortAnchoredPos(float pctX, float pctY)
        {
            Vector2 mapSize = mapImageRect.rect.size;
            float px =  pctX / 100f * mapSize.x * _zoom + _pan.x;
            float py = -pctY / 100f * mapSize.y * _zoom + _pan.y;
            return new Vector2(px, py);
        }

        // 뷰포트 스크린 좌표 → 맵 % 좌표
        public Vector2 ScreenToMapPct(Vector2 screenPos)
        {
            Vector2 mapSize = mapImageRect.rect.size;
            float px = (screenPos.x - _pan.x) / (mapSize.x * _zoom) * 100f;
            float py = -(screenPos.y - _pan.y) / (mapSize.y * _zoom) * 100f;
            return new Vector2(px, py);
        }

        public void OnDrag(PointerEventData e)
        {
            _pan += e.delta;
            ClampPan();
            ApplyTransform();
        }

        public void OnScroll(PointerEventData e)
        {
            float newZoom = Mathf.Clamp(_zoom + e.scrollDelta.y * zoomSpeed, minZoom, maxZoom);
            // 마우스 위치 기준 줌
            RectTransformUtility.ScreenPointToLocalPointInRectangle(
                viewportRect, e.position, null, out Vector2 localPt);
            _pan = localPt - (localPt - _pan) * (newZoom / _zoom);
            _zoom = newZoom;
            ClampPan();
            ApplyTransform();
        }

        public void OnPointerClick(PointerEventData e) { /* 항구 마커가 이벤트 처리 */ }

        private void ClampPan()
        {
            Vector2 mapSize = mapImageRect.rect.size;
            float vpW = viewportRect.rect.width;
            float vpH = viewportRect.rect.height;
            float mapW = mapSize.x * _zoom;
            float mapH = mapSize.y * _zoom;
            _pan.x = Mathf.Clamp(_pan.x, vpW - mapW, 0f);
            _pan.y = Mathf.Clamp(_pan.y, vpH - mapH, 0f);
        }

        private void ApplyTransform()
        {
            if (mapImageRect == null) return;
            mapImageRect.localScale      = new Vector3(_zoom, _zoom, 1f);
            mapImageRect.anchoredPosition = _pan;
        }

        // PortMarker가 클릭 이벤트 전달
        internal void NotifyPortClicked(string portKey) => OnPortClicked?.Invoke(portKey);

        public float CurrentZoom => _zoom;
    }
}
