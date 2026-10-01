import test from 'node:test';
import assert from 'node:assert/strict';
import { getNextUnlockProgress } from './unlockProgress.js';

const ports = {
  lisbon: { name: 'Lisbon' },
  genoa: { name: 'Genoa' },
  alexandria: { name: 'Alexandria' },
};

const requirements = {
  lisbon: 0,
  genoa: 1500,
  alexandria: 8000,
};

const accessFor = (portKey, totalEarned) => ({
  unlocked: requirements[portKey] <= totalEarned,
  required: requirements[portKey],
});

test('returns the nearest locked port with progress toward its unlock requirement', () => {
  assert.deepEqual(
    getNextUnlockProgress({ ports, totalEarned: 900, getPortAccessState: accessFor }),
    {
      key: 'genoa',
      port: ports.genoa,
      required: 1500,
      totalEarned: 900,
      remaining: 600,
      pct: 60,
    },
  );
});

test('clamps progress between zero and one hundred percent', () => {
  const lockedAt1500 = () => ({ unlocked: false, required: 1500 });
  assert.equal(
    getNextUnlockProgress({ ports, totalEarned: -200, getPortAccessState: accessFor }).pct,
    0,
  );
  assert.equal(
    getNextUnlockProgress({ ports: { genoa: ports.genoa }, totalEarned: 14999, getPortAccessState: lockedAt1500 }).pct,
    100,
  );
});

test('returns null when every port is unlocked', () => {
  assert.equal(
    getNextUnlockProgress({ ports, totalEarned: 8000, getPortAccessState: accessFor }),
    null,
  );
});
