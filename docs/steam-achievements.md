# Pioneer — Steam Achievements

---

## Stats

| API Name | Type | Description |
|----------|------|-------------|
| `STAT_TRADES_COMPLETED` | INT | Total trade transactions completed |
| `STAT_PORTS_VISITED` | INT | Distinct ports visited |
| `STAT_TOTAL_PROFIT` | INT | Total coins earned (all runs) |
| `STAT_FLEET_SIZE_MAX` | INT | Maximum fleet size reached |
| `STAT_MARKET_EVENTS_SURVIVED` | INT | Major market events survived |
| `STAT_ROUTES_SAILED` | INT | Total trade routes completed |
| `STAT_CREW_HIRED` | INT | Total crew members hired |

---

## Achievements

| API Name | EN Name | KO Name | How to Unlock |
|----------|---------|---------|---------------|
| `ACH_FIRST_TRADE` | First Voyage | 첫 항해 | Complete your first trade |
| `ACH_FIRST_PORT` | Port of Call | 기항지 | Visit your first new port |
| `ACH_PORTS_10` | Explorer | 탐험가 | Visit 10 distinct ports |
| `ACH_PORTS_ALL` | Chart the World | 세계 항법 | Visit all 29 ports |
| `ACH_FIRST_SHIP` | Growing Fleet | 함대 성장 | Expand to 2 ships |
| `ACH_FLEET_5` | Admiral's Fleet | 제독의 함대 | Command a fleet of 5 ships |
| `ACH_PROFIT_1000` | Profitable Merchant | 이익을 내는 상인 | Earn 1,000 coins in a single session |
| `ACH_PROFIT_10000` | Trade Baron | 무역 남작 | Earn 10,000 coins total |
| `ACH_MARKET_EVENT` | Market Survivor | 시장 생존자 | Survive a major market event without going into debt |
| `ACH_PRICE_READER` | Price Intelligence | 가격 정보 | Check price history on 5 different commodities in one session |
| `ACH_COMMODITIES_ALL` | Full Cargo | 전 화물 | Trade all 8 commodity types in a single session |
| `ACH_CREW_10` | Full Crew | 만원 선원 | Hire 10 crew members total |
| `ACH_ROUTE_MASTER` | Route Optimizer | 항로 최적화 | Complete 50 trade routes |
| `ACH_COMEBACK` | Merchant's Resilience | 상인의 끈기 | Recover from debt back to 1,000 coins profit |
| `ACH_GRAND_MERCHANT` | Grand Merchant | 대상인 | Earn 50,000 coins total across all sessions |

---

## Implementation Notes

- Steam API: `ISteamUserStats`
- `ACH_PORTS_ALL` requires tracking a visited-ports set (persist across sessions)
- `ACH_MARKET_EVENT` requires detecting when a major event fires and checking debt status at event end
- `STAT_TOTAL_PROFIT` is cumulative — never reset between sessions
- `ACH_PRICE_READER` fires when the price history UI is accessed for 5 distinct commodities
- All achievements unlockable in offline single-player
- Replace App ID 480 with real Steamworks App ID before submission
