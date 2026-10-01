export function createDecisionEntry(text, predictions = [], now = new Date()) {
  const pending = predictions.filter(prediction => prediction && !prediction.applied);
  return {
    id: now.getTime(),
    text: String(text || '').trim(),
    createdAt: now.toLocaleString('ko-KR'),
    linkedPredictionIds: pending.map(prediction => prediction.id),
  };
}

export function reviewDecision(entry, predictions = []) {
  const ids = Array.isArray(entry?.linkedPredictionIds) ? entry.linkedPredictionIds : [];
  if (ids.length === 0) {
    return { total: 0, resolved: 0, hits: 0, misses: 0, pending: 0, state: 'unlinked', label: '연결된 예측 없음' };
  }

  const byId = new Map(predictions.filter(Boolean).map(prediction => [prediction.id, prediction]));
  const linked = ids.map(id => byId.get(id)).filter(Boolean);
  const resolved = linked.filter(prediction => prediction.applied);
  const hits = resolved.filter(prediction => prediction.hit).length;
  const misses = resolved.filter(prediction => prediction.hit === false).length;
  const pending = ids.length - resolved.length;
  if (pending > 0) {
    return { total: ids.length, resolved: resolved.length, hits, misses, pending, state: 'pending', label: `검증 대기 ${pending}건` };
  }
  if (hits > misses) {
    return { total: ids.length, resolved: resolved.length, hits, misses, pending: 0, state: 'hit', label: `근거 적중 ${hits}/${ids.length}` };
  }
  if (misses > 0) {
    return { total: ids.length, resolved: resolved.length, hits, misses, pending: 0, state: 'miss', label: `근거 재검토 ${misses}/${ids.length}` };
  }
  return { total: ids.length, resolved: resolved.length, hits, misses, pending: 0, state: 'neutral', label: '검증 결과 없음' };
}
