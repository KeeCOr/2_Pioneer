import test from 'node:test';
import assert from 'node:assert/strict';
import { createDepartureState } from './navigation.js';

test('departing ship starts outside the source port visual center', () => {
  const ship = { x: 4, y: 30, isMoving: false, targetX: null, targetY: null, startX: null, startY: null, booster: true };
  const sourcePort = { x: 4, y: 30 };
  const destinationPort = { x: 10, y: 7 };

  const next = createDepartureState(ship, destinationPort, sourcePort);

  assert.equal(next.isMoving, true);
  assert.equal(next.targetX, destinationPort.x);
  assert.equal(next.targetY, destinationPort.y);
  assert.equal(next.booster, false);
  assert.ok(Math.hypot(next.x - sourcePort.x, next.y - sourcePort.y) >= 3);
  assert.deepEqual({ x: next.startX, y: next.startY }, { x: next.x, y: next.y });
});
