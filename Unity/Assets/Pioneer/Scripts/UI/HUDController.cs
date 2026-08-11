using Pioneer.Core;
using TMPro;
using UnityEngine;

namespace Pioneer.UI
{
    public class HUDController : MonoBehaviour
    {
        [SerializeField] TextMeshProUGUI goldLabel;
        [SerializeField] TextMeshProUGUI dayLabel;
        [SerializeField] TextMeshProUGUI fleetLabel;
        [SerializeField] TextMeshProUGUI taxLevelLabel;

        void OnEnable()
        {
            if (GameManager.Instance == null) return;
            GameManager.Instance.OnGoldChanged += RefreshGold;
            GameManager.Instance.OnNewDay      += RefreshDay;
        }

        void OnDisable()
        {
            if (GameManager.Instance == null) return;
            GameManager.Instance.OnGoldChanged -= RefreshGold;
            GameManager.Instance.OnNewDay      -= RefreshDay;
        }

        void Update()
        {
            var s = GameManager.Instance?.State;
            if (s == null) return;
            if (fleetLabel   != null) fleetLabel.text   = $"함대 {s.Ships.Count}척";
            if (taxLevelLabel!= null) taxLevelLabel.text = $"세금 Lv.{s.TaxLevel}";
        }

        private void RefreshGold(long gold)
        {
            if (goldLabel != null) goldLabel.text = $"{gold:N0} 금";
        }

        private void RefreshDay(int day)
        {
            if (dayLabel != null) dayLabel.text = $"Day {day}";
        }
    }
}
