import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARKET_EVENT_INTERVAL_SECONDS,
  SMALL_PRICE_INTERVAL_SECONDS,
  applyMajorMarketEvent,
  applyPlayerTradeImpact,
  applySmallMarketDrift,
} from './marketPrices.js';

const basePrices = {
  lisbon: { wool: 100, spice: 200 },
  london: { wool: 120, spice: 180 },
};

test('market cadence uses 3 minute small drift and 1 hour major events', () => {
  assert.equal(SMALL_PRICE_INTERVAL_SECONDS, 180);
  assert.equal(MARKET_EVENT_INTERVAL_SECONDS, 3600);
});

test('small drift is intentionally modest and independent from player trades', () => {
  const result = applySmallMarketDrift(basePrices, {
    random: () => 0.5,
  });

  assert.equal(result.prices.lisbon.wool, 100);
  assert.equal(result.prices.lisbon.spice, 200);
  assert.notEqual(result.prices, basePrices);
  assert.notEqual(result.prices.lisbon, basePrices.lisbon);
});

test('player buy and sell impact market prices immediately', () => {
  const afterBuy = applyPlayerTradeImpact(basePrices, 'lisbon', 'wool', 5, 'buy');
  const afterSell = applyPlayerTradeImpact(basePrices, 'lisbon', 'spice', 4, 'sell');

  assert.ok(afterBuy.lisbon.wool > basePrices.lisbon.wool);
  assert.equal(afterBuy.london.wool, basePrices.london.wool);
  assert.ok(afterSell.lisbon.spice < basePrices.lisbon.spice);
  assert.equal(afterSell.london.spice, basePrices.london.spice);
});

test('major events ignore player trade context and only apply external shocks', () => {
  const withoutPlayerContext = applyMajorMarketEvent(basePrices, {
    random: () => 0.5,
    eventIndex: 1,
  });
  const withPlayerContext = applyMajorMarketEvent(basePrices, {
    random: () => 0.5,
    eventIndex: 1,
    playerTradeContext: { portKey: 'lisbon', resource: 'wool', quantity: 999, side: 'buy' },
  });

  assert.deepEqual(withPlayerContext.prices, withoutPlayerContext.prices);
  assert.deepEqual(withPlayerContext.impacts, withoutPlayerContext.impacts);
});

