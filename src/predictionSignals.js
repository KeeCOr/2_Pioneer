export function getPredictionConflict(prediction, predictions = []) {
  if (!prediction || prediction.applied) {
    return { hasConflict: false, opposingCount: 0 };
  }

  const opposing = predictions.filter(candidate => (
    candidate
    && candidate.id !== prediction.id
    && !candidate.applied
    && candidate.targetPort === prediction.targetPort
    && candidate.resource === prediction.resource
    && candidate.direction !== prediction.direction
  ));

  return {
    hasConflict: opposing.length > 0,
    opposingCount: opposing.length,
  };
}

export function orderPredictionsForDecision(predictions = []) {
  return [...predictions].sort((a, b) => {
    const aConflict = getPredictionConflict(a, predictions).hasConflict ? 1 : 0;
    const bConflict = getPredictionConflict(b, predictions).hasConflict ? 1 : 0;
    if (aConflict !== bConflict) return bConflict - aConflict;

    const aPending = a.applied ? 0 : 1;
    const bPending = b.applied ? 0 : 1;
    if (aPending !== bPending) return bPending - aPending;

    const aTurns = a.turnsRemaining ?? Number.MAX_SAFE_INTEGER;
    const bTurns = b.turnsRemaining ?? Number.MAX_SAFE_INTEGER;
    if (aTurns !== bTurns) return aTurns - bTurns;

    return (b.id ?? 0) - (a.id ?? 0);
  });
}
