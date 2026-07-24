import test from 'node:test';
import assert from 'node:assert/strict';
import { getFleetTradeFlow } from './fleetTradeFlow.js';

test('keeps selected fleet, cargo, route, and depart as one ordered flow', () => {
  const flow = getFleetTradeFlow({
    ship: { id: 7, name: 'Long Korean Named Fleet', cargoUsed: 12, cargoCapacity: 20 },
    atPort: true,
    marketOpen: true,
    routeMode: true,
    routeSummary: { canDepart: true, expectedProfit: 420, riskLevel: 'low' },
  });

  assert.deepEqual(flow.steps.map((step) => step.id), ['fleet', 'cargo', 'market', 'route', 'depart']);
  assert.equal(flow.selectedShipId, 7);
  assert.equal(flow.primaryAction.id, 'confirm-route');
  assert.equal(flow.backAction.id, 'back-to-market');
});

test('makes empty cargo and market entry explicit before route confirmation', () => {
  const flow = getFleetTradeFlow({
    ship: { id: 3, name: 'Scout', cargoUsed: 0, cargoCapacity: 18 },
    atPort: true,
    marketOpen: false,
    routeMode: false,
  });

  assert.equal(flow.steps.find((step) => step.id === 'cargo').state, 'needs-attention');
  assert.equal(flow.primaryAction.id, 'open-market');
  assert.match(flow.summary, /cargo empty/i);
});

test('blocks depart when route is unavailable or risky enough to require review', () => {
  const flow = getFleetTradeFlow({
    ship: { id: 5, name: 'Risk Runner', cargoUsed: 6, cargoCapacity: 10 },
    atPort: true,
    marketOpen: false,
    routeMode: true,
    routeSummary: { canDepart: false, expectedProfit: -120, riskLevel: 'blocked', blockers: ['crew required'] },
  });

  assert.equal(flow.steps.find((step) => step.id === 'depart').state, 'blocked');
  assert.equal(flow.primaryAction.id, 'review-route');
  assert.match(flow.summary, /crew required/i);
});

test('explains why empty cargo cannot produce a trade result', () => {
  const flow = getFleetTradeFlow({
    ship: { id: 3, name: 'Scout', cargoUsed: 0, cargoCapacity: 18 },
    atPort: true,
    marketOpen: false,
    routeMode: false,
  });

  assert.equal(flow.resultCue.cause, 'The fleet is docked without sellable cargo.');
  assert.equal(flow.resultCue.delta, 'Cargo remains 0/18.');
  assert.equal(flow.resultCue.nextAction, 'Open market and load a profitable cargo.');
});

test('explains the blocker, delta, and next action for a blocked route', () => {
  const flow = getFleetTradeFlow({
    ship: { id: 5, name: 'Risk Runner', cargoUsed: 6, cargoCapacity: 10 },
    atPort: true,
    marketOpen: false,
    routeMode: true,
    routeSummary: { canDepart: false, expectedProfit: -120, riskLevel: 'blocked', blockers: ['crew required'] },
  });

  assert.equal(flow.resultCue.cause, 'crew required');
  assert.equal(flow.resultCue.delta, '-120g expected profit is blocked.');
  assert.equal(flow.resultCue.nextAction, 'Resolve the blocker before departure.');
});

test('explains high-risk profitable routes before confirmation', () => {
  const flow = getFleetTradeFlow({
    ship: { id: 9, name: 'Storm Trader', cargoUsed: 14, cargoCapacity: 16 },
    atPort: true,
    marketOpen: false,
    routeMode: true,
    routeSummary: { canDepart: true, expectedProfit: 760, riskLevel: 'high', travelTime: 9, blockers: [] },
  });

  assert.equal(flow.resultCue.cause, 'The route has high threat pressure.');
  assert.equal(flow.resultCue.delta, '760g profit is possible with 9 days at sea.');
  assert.equal(flow.resultCue.nextAction, 'Review threats and prepare crew before confirming.');
});
