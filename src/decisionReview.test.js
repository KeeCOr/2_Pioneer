import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecisionEntry, reviewDecision } from './decisionReview.js';

test('저장 시점의 대기 예측만 투자 이유에 연결한다', () => {
  const now = new Date('2026-09-23T00:00:00Z');
  const entry = createDecisionEntry('향신료 상승을 예상', [
    { id: 1, applied: false },
    { id: 2, applied: true, hit: true },
  ], now);
  assert.equal(entry.text, '향신료 상승을 예상');
  assert.deepEqual(entry.linkedPredictionIds, [1]);
});

test('일부 예측이 남으면 검증 대기 상태를 보여준다', () => {
  const review = reviewDecision({ linkedPredictionIds: [1, 2] }, [
    { id: 1, applied: true, hit: true },
    { id: 2, applied: false, hit: null },
  ]);
  assert.equal(review.state, 'pending');
  assert.equal(review.pending, 1);
});

test('적중이 우세하면 투자 근거 적중으로 요약한다', () => {
  const review = reviewDecision({ linkedPredictionIds: [1, 2, 3] }, [
    { id: 1, applied: true, hit: true },
    { id: 2, applied: true, hit: true },
    { id: 3, applied: true, hit: false },
  ]);
  assert.equal(review.state, 'hit');
  assert.equal(review.label, '근거 적중 2/3');
});

test('실패가 있으면 다음 거래 전에 근거 재검토를 요구한다', () => {
  const review = reviewDecision({ linkedPredictionIds: [1] }, [{ id: 1, applied: true, hit: false }]);
  assert.equal(review.state, 'miss');
  assert.match(review.label, /재검토/);
});

test('구버전 기록은 결과를 지어내지 않는다', () => {
  const review = reviewDecision({ text: '기존 기록' }, []);
  assert.equal(review.state, 'unlinked');
});
