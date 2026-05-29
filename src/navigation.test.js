import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeaRoute, createDepartureState } from './navigation.js';

test('departing ship starts outside the source port visual center', () => {
  const ship = { x: 43.2, y: 43.5, isMoving: false, targetX: null, targetY: null, startX: null, startY: null, booster: true };
  const sourcePort = { x: 43.2, y: 43.5, harborX: 40.0, harborY: 43.8 };
  const destinationPort = { x: 47.0, y: 32.0, harborX: 46.0, harborY: 33.4 };

  const next = createDepartureState(ship, destinationPort, sourcePort);

  assert.equal(next.isMoving, true);
  assert.equal(next.x, sourcePort.harborX);
  assert.equal(next.y, sourcePort.harborY);
  assert.equal(next.destinationX, destinationPort.harborX);
  assert.equal(next.destinationY, destinationPort.harborY);
  assert.equal(next.booster, false);
  assert.ok(next.route.length >= 2);
  assert.ok(Math.hypot(next.x - sourcePort.x, next.y - sourcePort.y) >= 3);
  assert.deepEqual({ x: next.startX, y: next.startY }, { x: next.x, y: next.y });
});

test('arriving ship targets the destination harbor instead of land-side port center', () => {
  const ship = { x: 40.0, y: 43.8, isMoving: false, targetX: null, targetY: null, startX: null, startY: null, booster: false };
  const sourcePort = { x: 43.2, y: 43.5, harborX: 40.0, harborY: 43.8 };
  const destinationPort = { x: 84.6, y: 52.3, harborX: 83.1, harborY: 54.5 };

  const next = createDepartureState(ship, destinationPort, sourcePort);

  assert.deepEqual(next.route[0], { x: sourcePort.harborX, y: sourcePort.harborY });
  assert.deepEqual(next.route[next.route.length - 1], { x: destinationPort.harborX, y: destinationPort.harborY });
  assert.deepEqual({ x: next.destinationX, y: next.destinationY }, { x: destinationPort.harborX, y: destinationPort.harborY });
});

test('long sea routes use ocean corridor waypoints', () => {
  const route = buildSeaRoute({ x: 43.2, y: 43.5 }, { x: 87.0, y: 44.0 });

  assert.ok(route.length > 2);
  assert.deepEqual(route[0], { x: 43.2, y: 43.5 });
  assert.deepEqual(route[route.length - 1], { x: 87.0, y: 44.0 });
  assert.ok(route.some(p => p.y >= 48));
});
