import test from 'node:test';
import assert from 'node:assert/strict';
import { clampTradeQuantity } from './trade.js';

test('clamps trade quantity to the available limit', () => {
  assert.equal(clampTradeQuantity(8, 20), 8);
  assert.equal(clampTradeQuantity(99, 20), 20);
  assert.equal(clampTradeQuantity(-3, 20), 1);
});

test('returns zero when no trade is available', () => {
  assert.equal(clampTradeQuantity(5, 0), 0);
  assert.equal(clampTradeQuantity(5, -2), 0);
});
