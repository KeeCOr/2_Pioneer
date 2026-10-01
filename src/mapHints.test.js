import test from 'node:test';
import assert from 'node:assert/strict';
import { getCargoSaleHints } from './mapHints.js';

const ports = {
  lisbon: { name: 'Lisbon' },
  london: { name: 'London' },
  genoa: { name: 'Genoa' },
  locked: { name: 'Locked' },
};

const prices = {
  lisbon: { wool: 100, spice: 300 },
  london: { wool: 180, spice: 280 },
  genoa: { wool: 150, spice: 500 },
  locked: { wool: 900, spice: 900 },
};

const accessFor = (portKey) => ({ unlocked: portKey !== 'locked', required: portKey === 'locked' ? 1500 : 0 });

test('ranks unlocked destination ports by the best sale value for current cargo', () => {
  assert.deepEqual(
    getCargoSaleHints({ ports, prices, cargo: { wool: 8 }, currentPortKey: 'lisbon', getPortAccessState: accessFor }),
    [
      {
        portKey: 'london',
        resource: 'wool',
        quantity: 8,
        unitPrice: 180,
        total: 1440,
        percentAboveCurrent: 80,
      },
      {
        portKey: 'genoa',
        resource: 'wool',
        quantity: 8,
        unitPrice: 150,
        total: 1200,
        percentAboveCurrent: 50,
      },
    ],
  );
});

test('ignores locked ports, current port, missing prices, and empty cargo', () => {
  assert.equal(getCargoSaleHints({ ports, prices, cargo: {}, currentPortKey: 'lisbon', getPortAccessState: accessFor }).length, 0);
  assert.equal(getCargoSaleHints({ ports, prices: {}, cargo: { wool: 8 }, currentPortKey: 'lisbon', getPortAccessState: accessFor }).length, 0);
  assert.ok(
    getCargoSaleHints({ ports, prices, cargo: { wool: 8 }, currentPortKey: 'lisbon', getPortAccessState: accessFor })
      .every((hint) => hint.portKey !== 'locked' && hint.portKey !== 'lisbon'),
  );
});

test('limits hints and chooses the highest-value cargo per port', () => {
  assert.deepEqual(
    getCargoSaleHints({ ports, prices, cargo: { wool: 1, spice: 2 }, currentPortKey: 'lisbon', getPortAccessState: accessFor, limit: 1 }),
    [
      {
        portKey: 'genoa',
        resource: 'spice',
        quantity: 2,
        unitPrice: 500,
        total: 1000,
        percentAboveCurrent: 67,
      },
    ],
  );
});

