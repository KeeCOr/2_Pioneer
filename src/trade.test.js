import test from 'node:test';
import assert from 'node:assert/strict';
import { clampTradeQuantity, getBuyTotal, getSellTotal, getTradePreview } from './trade.js';

test('clamps trade quantity to the available limit', () => {
  assert.equal(clampTradeQuantity(8, 20), 8);
  assert.equal(clampTradeQuantity(99, 20), 20);
  assert.equal(clampTradeQuantity(-3, 20), 1);
});

test('returns zero when no trade is available', () => {
  assert.equal(clampTradeQuantity(5, 0), 0);
  assert.equal(clampTradeQuantity(5, -2), 0);
});

test('previews buy and sell results', () => {
  assert.deepEqual(
    getTradePreview({ mode: 'buy', unitPrice: 50, quantity: 3, gold: 500, cargo: 10, capacity: 20 }),
    { total: 150, nextGold: 350, nextCargo: 13, remainingCargo: 7 },
  );
  assert.deepEqual(
    getTradePreview({ mode: 'sell', unitPrice: 40, quantity: 2, gold: 500, cargo: 10, capacity: 20 }),
    { total: 80, nextGold: 580, nextCargo: 8, remainingCargo: 12 },
  );
});

test('applies trade fee only when selling', () => {
  assert.equal(getBuyTotal(50, 3), 150);
  assert.equal(getSellTotal(50, 3, 10), 135);
});
