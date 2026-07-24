import test from 'node:test';
import assert from 'node:assert/strict';
import { getRouteSummary } from './routeSummary.js';

const cargo = [
  { res: 'wool', qty: 4, buyPrice: 80 },
  { res: 'wine', qty: 2, buyPrice: 120 },
];

test('summarizes a profitable low-risk route before departure', () => {
  const summary = getRouteSummary({
    access: { unlocked: true },
    crewCount: 3,
    samePort: false,
    distance: 18,
    cargo,
    destinationPrices: { wool: 140, wine: 150 },
    threatSources: [],
  });

  assert.equal(summary.canDepart, true);
  assert.equal(summary.expectedProfit, 300);
  assert.equal(summary.travelTime, 2);
  assert.equal(summary.riskLevel, 'low');
  assert.deepEqual(summary.threatSources, ['clear weather', 'standard patrol route']);
  assert.match(summary.recommendation, /good route/i);
});

test('keeps profitable high-risk routes visible with threat sources', () => {
  const summary = getRouteSummary({
    access: { unlocked: true },
    crewCount: 2,
    samePort: false,
    distance: 86,
    cargo,
    destinationPrices: { wool: 210, wine: 240 },
    threatSources: ['pirate waters', 'storm belt'],
  });

  assert.equal(summary.canDepart, true);
  assert.equal(summary.expectedProfit, 760);
  assert.equal(summary.travelTime, 9);
  assert.equal(summary.riskLevel, 'high');
  assert.deepEqual(summary.threatSources, ['pirate waters', 'storm belt']);
  assert.match(summary.recommendation, /profit is strong/i);
});

test('marks blocked or unprofitable routes as not recommended', () => {
  const summary = getRouteSummary({
    access: { unlocked: false, label: 'earn 500 more gold' },
    crewCount: 0,
    samePort: false,
    distance: 10,
    cargo,
    destinationPrices: { wool: 70, wine: 110 },
    threatSources: ['locked sea gate'],
  });

  assert.equal(summary.canDepart, false);
  assert.equal(summary.expectedProfit, -60);
  assert.equal(summary.riskLevel, 'blocked');
  assert.deepEqual(summary.blockers, ['earn 500 more gold', 'crew required']);
  assert.match(summary.recommendation, /do not depart/i);
});
