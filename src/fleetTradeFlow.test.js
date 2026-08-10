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
  assert.match(flow.summary, /화물 없음/);
});

test('blocks depart when route is unavailable or risky enough to require review', () => {
  const flow = getFleetTradeFlow({
    ship: { id: 5, name: 'Risk Runner', cargoUsed: 6, cargoCapacity: 10 },
    atPort: true,
    marketOpen: false,
    routeMode: true,
    routeSummary: { canDepart: false, expectedProfit: -120, riskLevel: 'blocked', blockers: ['승무원 필요'] },
  });

  assert.equal(flow.steps.find((step) => step.id === 'depart').state, 'blocked');
  assert.equal(flow.primaryAction.id, 'review-route');
  assert.match(flow.summary, /승무원 필요/);
});

test('explains why empty cargo cannot produce a trade result', () => {
  const flow = getFleetTradeFlow({
    ship: { id: 3, name: 'Scout', cargoUsed: 0, cargoCapacity: 18 },
    atPort: true,
    marketOpen: false,
    routeMode: false,
  });

  assert.equal(flow.resultCue.cause, '항구에 정박 중이지만 판매할 화물이 없습니다.');
  assert.equal(flow.resultCue.delta, '화물 0/18');
  assert.equal(flow.resultCue.nextAction, '시장을 열어 수익성 있는 화물을 적재하세요.');
});

test('explains the blocker, delta, and next action for a blocked route', () => {
  const flow = getFleetTradeFlow({
    ship: { id: 5, name: 'Risk Runner', cargoUsed: 6, cargoCapacity: 10 },
    atPort: true,
    marketOpen: false,
    routeMode: true,
    routeSummary: { canDepart: false, expectedProfit: -120, riskLevel: 'blocked', blockers: ['승무원 필요'] },
  });

  assert.equal(flow.resultCue.cause, '승무원 필요');
  assert.equal(flow.resultCue.delta, '예상 수익 -120g 차단됨');
  assert.equal(flow.resultCue.nextAction, '출항 전에 장애 요인을 해결하세요.');
});

test('explains high-risk profitable routes before confirmation', () => {
  const flow = getFleetTradeFlow({
    ship: { id: 9, name: 'Storm Trader', cargoUsed: 14, cargoCapacity: 16 },
    atPort: true,
    marketOpen: false,
    routeMode: true,
    routeSummary: { canDepart: true, expectedProfit: 760, riskLevel: 'high', travelTime: 9, blockers: [] },
  });

  assert.equal(flow.resultCue.cause, '항로에 위협 요소가 많습니다.');
  assert.equal(flow.resultCue.delta, '760g 수익 가능 · 항해 9일');
  assert.equal(flow.resultCue.nextAction, '출항 전 위협을 검토하고 승무원을 준비하세요.');
});

test('shows sailing status when ship is moving', () => {
  const flow = getFleetTradeFlow({
    ship: { id: 2, name: 'Voyager', cargoUsed: 8, cargoCapacity: 20, isMoving: true },
    atPort: false,
    marketOpen: false,
    routeMode: false,
  });

  assert.equal(flow.resultCue.cause, '항해 중입니다.');
  assert.match(flow.resultCue.delta, /화물 8\/20/);
  assert.match(flow.resultCue.nextAction, /도착 후/);
});
