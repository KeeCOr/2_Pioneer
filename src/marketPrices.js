export const SMALL_PRICE_INTERVAL_SECONDS = 180;
export const MARKET_EVENT_INTERVAL_SECONDS = 3600;
export const PRICE_HISTORY_LIMIT = 20;

const MIN_PRICE = 20;
const SMALL_DRIFT_RATE = 0.025;
const PLAYER_IMPACT_RATE = 0.012;
const PLAYER_IMPACT_CAP = 0.18;
const MAJOR_EVENT_RATE_MIN = 0.16;
const MAJOR_EVENT_RATE_MAX = 0.38;

const clampPrice = (value) => Math.max(MIN_PRICE, Math.floor(value));

export const applySmallMarketDrift = (prices, { random = Math.random } = {}) => {
  const nextPrices = {};

  Object.entries(prices || {}).forEach(([portKey, resources]) => {
    nextPrices[portKey] = {};
    Object.entries(resources || {}).forEach(([resource, value]) => {
      const driftRate = (random() - 0.5) * 2 * SMALL_DRIFT_RATE;
      nextPrices[portKey][resource] = clampPrice(value * (1 + driftRate));
    });
  });

  return { prices: nextPrices };
};

export const applyPlayerTradeImpact = (prices, portKey, resource, quantity, side) => {
  if (!prices?.[portKey]?.[resource] || quantity <= 0) return { ...(prices || {}) };
  const direction = side === 'sell' ? -1 : 1;
  const impactRate = Math.max(-PLAYER_IMPACT_CAP, Math.min(PLAYER_IMPACT_CAP, quantity * PLAYER_IMPACT_RATE)) * direction;
  return {
    ...prices,
    [portKey]: {
      ...prices[portKey],
      [resource]: clampPrice(prices[portKey][resource] * (1 + impactRate)),
    },
  };
};

export const applyMajorMarketEvent = (prices, { random = Math.random, eventIndex = Date.now() } = {}) => {
  const nextPrices = {};
  const impacts = [];
  const portKeys = Object.keys(prices || {});
  const sampleResources = portKeys.length > 0 ? Object.keys(prices[portKeys[0]] || {}) : [];
  if (portKeys.length === 0 || sampleResources.length === 0) {
    return { prices: { ...(prices || {}) }, impacts };
  }

  const resource = sampleResources[Math.floor(random() * sampleResources.length) % sampleResources.length];
  const direction = random() >= 0.5 ? 1 : -1;
  const magnitude = MAJOR_EVENT_RATE_MIN + random() * (MAJOR_EVENT_RATE_MAX - MAJOR_EVENT_RATE_MIN);
  const affectedCount = Math.max(1, Math.min(portKeys.length, 2 + (eventIndex % 3)));
  const start = Math.floor(random() * portKeys.length) % portKeys.length;
  const affectedPorts = Array.from({ length: affectedCount }, (_, i) => portKeys[(start + i) % portKeys.length]);

  Object.entries(prices || {}).forEach(([portKey, resources]) => {
    nextPrices[portKey] = { ...resources };
    if (affectedPorts.includes(portKey) && resources?.[resource] != null) {
      const before = resources[resource];
      const after = clampPrice(before * (1 + direction * magnitude));
      nextPrices[portKey][resource] = after;
      impacts.push({ portKey, resource, before, after, direction, magnitude });
    }
  });

  return { prices: nextPrices, impacts };
};

export const appendPriceHistorySnapshot = (history, prices, limit = PRICE_HISTORY_LIMIT) => {
  const nextHistory = {};
  Object.entries(prices || {}).forEach(([portKey, resources]) => {
    nextHistory[portKey] = { ...(history?.[portKey] || {}) };
    Object.entries(resources || {}).forEach(([resource, value]) => {
      const previous = nextHistory[portKey][resource] || [];
      nextHistory[portKey][resource] = [...previous, value].slice(-limit);
    });
  });
  return nextHistory;
};
