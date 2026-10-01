import test from 'node:test';
import assert from 'node:assert/strict';
import { getPredictionConflict, orderPredictionsForDecision } from './predictionSignals.js';

const base = {
  applied: false,
  targetPort: 'lisbon',
  resource: '향신료',
  turnsRemaining: 2,
};

test('flags opposite pending predictions for the same port and commodity', () => {
  const predictions = [
    { ...base, id: 1, direction: 'up' },
    { ...base, id: 2, direction: 'down' },
  ];

  assert.deepEqual(getPredictionConflict(predictions[0], predictions), {
    hasConflict: true,
    opposingCount: 1,
  });
});

test('does not flag different markets, commodities, or resolved reports', () => {
  const prediction = { ...base, id: 1, direction: 'up' };
  const predictions = [
    prediction,
    { ...base, id: 2, targetPort: 'venice', direction: 'down' },
    { ...base, id: 3, resource: '비단', direction: 'down' },
    { ...base, id: 4, direction: 'down', applied: true },
  ];

  assert.equal(getPredictionConflict(prediction, predictions).hasConflict, false);
});

test('orders conflicts first, then urgent pending reports, then history', () => {
  const predictions = [
    { ...base, id: 1, direction: 'up', targetPort: 'venice', turnsRemaining: 4 },
    { ...base, id: 2, direction: 'up', turnsRemaining: 3 },
    { ...base, id: 3, direction: 'down', turnsRemaining: 1 },
    { ...base, id: 4, direction: 'up', targetPort: 'mumbai', applied: true },
  ];

  assert.deepEqual(orderPredictionsForDecision(predictions).map(item => item.id), [3, 2, 1, 4]);
});
