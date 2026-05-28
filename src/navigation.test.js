import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeaRoute, createDepartureState } from './navigation.js';

test('departing ship starts outside the source port visual center', () => {
  const ship = { x: 4, y: 30, isMoving: false, targetX: null, targetY: null, startX: null, startY: null, booster: true };
  const sourcePort = { x: 4, y: 30 };
  const destinationPort = { x: 10, y: 7 };

  const next = createDepartureState(ship, destinationPort, sourcePort);

  assert.equal(next.isMoving, true);
  assert.equal(next.destinationX, destinationPort.x);
  assert.equal(next.destinationY, destinationPort.y);
  assert.equal(next.booster, false);
  assert.ok(next.route.length >= 2);
  assert.ok(Math.hypot(next.x - sourcePort.x, next.y - sourcePort.y) >= 3);
  assert.deepEqual({ x: next.startX, y: next.startY }, { x: next.x, y: next.y });
});

test('long sea routes use ocean corridor waypoints', () => {
  const route = buildSeaRoute({ x: 4, y: 30 }, { x: 90, y: 30 });

  assert.ok(route.length > 2);
  assert.deepEqual(route[0], { x: 4, y: 30 });
  assert.deepEqual(route[route.length - 1], { x: 90, y: 30 });
  assert.ok(route.some(p => p.y >= 48));
});
