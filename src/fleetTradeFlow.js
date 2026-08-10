const STEP_LABELS = {
  fleet: '함대 선택',
  cargo: '화물 확인',
  market: '시장 거래',
  route: '항로 검토',
  depart: '출항',
};

const getCargoState = (ship) => {
  if (!ship) return 'blocked';
  if ((ship.cargoUsed || 0) <= 0) return 'needs-attention';
  if (ship.cargoCapacity > 0 && ship.cargoUsed >= ship.cargoCapacity) return 'ready';
  return 'ready';
};

const getResultExplanationCue = ({
  ship,
  atPort,
  marketOpen,
  routeMode,
  routeSummary,
  cargoUsed,
  cargoCapacity,
}) => {
  if (!ship) {
    return {
      cause: '함대가 선택되지 않았습니다.',
      delta: '화물·시장·항로 결과를 아직 확인할 수 없습니다.',
      nextAction: '함대를 선택해 거래를 시작하세요.',
    };
  }

  if (ship.isMoving) {
    return {
      cause: '항해 중입니다.',
      delta: cargoUsed > 0 ? `화물 ${cargoUsed}/${cargoCapacity || cargoUsed} 적재` : '화물 없음',
      nextAction: cargoUsed > 0 ? '도착 후 항구 시장에서 화물을 판매하세요.' : '도착 후 시장에서 화물을 적재하세요.',
    };
  }

  if (cargoUsed <= 0) {
    return {
      cause: atPort ? '항구에 정박 중이지만 판매할 화물이 없습니다.' : '시장 접근이 불가능한 위치입니다.',
      delta: `화물 ${cargoUsed}/${cargoCapacity || 0}`,
      nextAction: atPort ? '시장을 열어 수익성 있는 화물을 적재하세요.' : '거래 계획 전에 항구로 귀환하세요.',
    };
  }

  if (routeSummary?.blockers?.length) {
    return {
      cause: routeSummary.blockers[0],
      delta: `예상 수익 ${routeSummary.expectedProfit ?? 0}g 차단됨`,
      nextAction: '출항 전에 장애 요인을 해결하세요.',
    };
  }

  if (routeSummary && routeSummary.expectedProfit <= 0) {
    return {
      cause: '목적지 가격이 매입 원가를 넘지 않습니다.',
      delta: `예상 거래 결과 ${routeSummary.expectedProfit}g`,
      nextAction: '다른 목적지를 선택하거나 화물을 바꾸세요.',
    };
  }

  if (routeSummary?.riskLevel === 'high') {
    return {
      cause: '항로에 위협 요소가 많습니다.',
      delta: `${routeSummary.expectedProfit ?? 0}g 수익 가능 · 항해 ${routeSummary.travelTime ?? '?'}일`,
      nextAction: '출항 전 위협을 검토하고 승무원을 준비하세요.',
    };
  }

  if (routeMode && routeSummary?.canDepart) {
    return {
      cause: '화물·항로·승무원이 모두 준비됐습니다.',
      delta: `${routeSummary.expectedProfit ?? 0}g 예상 수익 · 위험도 ${routeSummary.riskLevel || '불명'}`,
      nextAction: '준비가 완료되면 출항을 확정하세요.',
    };
  }

  if (marketOpen) {
    return {
      cause: '화물 적재 완료 · 시장 열림',
      delta: `화물 ${cargoUsed}/${cargoCapacity || cargoUsed} 항로 계획 대기 중`,
      nextAction: '항로를 선택해 목적지 시세를 비교하세요.',
    };
  }

  return {
    cause: '화물은 적재됐지만 항로가 선택되지 않았습니다.',
    delta: `화물 ${cargoUsed}/${cargoCapacity || cargoUsed} 대기 중`,
    nextAction: '목적지 항로를 선택하세요.',
  };
};

export const getFleetTradeFlow = ({
  ship = null,
  atPort = false,
  marketOpen = false,
  routeMode = false,
  routeSummary = null,
} = {}) => {
  const cargoUsed = Math.max(0, Math.floor(Number(ship?.cargoUsed) || 0));
  const cargoCapacity = Math.max(0, Math.floor(Number(ship?.cargoCapacity) || 0));
  const blockers = routeSummary?.blockers || [];
  const routeBlocked = routeMode && routeSummary && !routeSummary.canDepart;
  const routeReady = routeMode && routeSummary?.canDepart;

  const steps = [
    { id: 'fleet', label: STEP_LABELS.fleet, state: ship ? 'ready' : 'blocked' },
    { id: 'cargo', label: STEP_LABELS.cargo, state: getCargoState(ship) },
    { id: 'market', label: STEP_LABELS.market, state: marketOpen ? 'active' : atPort ? 'available' : 'blocked' },
    { id: 'route', label: STEP_LABELS.route, state: routeBlocked ? 'blocked' : routeReady ? 'ready' : routeMode ? 'active' : 'available' },
    { id: 'depart', label: STEP_LABELS.depart, state: routeBlocked ? 'blocked' : routeReady ? 'ready' : 'available' },
  ];

  let primaryAction = { id: 'select-fleet', label: '함대 선택' };
  if (ship && atPort && cargoUsed <= 0) primaryAction = { id: 'open-market', label: '시장 열기' };
  else if (routeBlocked) primaryAction = { id: 'review-route', label: '항로 검토' };
  else if (routeReady) primaryAction = { id: 'confirm-route', label: '출항 확정' };
  else if (ship) primaryAction = { id: 'choose-route', label: '항로 선택' };

  const backAction = routeMode
    ? { id: 'back-to-market', label: '시장으로' }
    : marketOpen
      ? { id: 'back-to-fleet', label: '함대로' }
      : { id: 'keep-selection', label: '선택 유지' };

  const summaryParts = [];
  if (!ship) summaryParts.push('함대 미선택');
  if (ship && cargoUsed <= 0) summaryParts.push('화물 없음');
  if (cargoCapacity > 0) summaryParts.push(`화물 ${cargoUsed}/${cargoCapacity}`);
  if (routeSummary) {
    summaryParts.push(`${routeSummary.expectedProfit ?? 0}g 수익`);
    summaryParts.push(`위험도 ${routeSummary.riskLevel || '불명'}`);
  }
  if (blockers.length) summaryParts.push(blockers[0]);

  const resultCue = getResultExplanationCue({
    ship,
    atPort,
    marketOpen,
    routeMode,
    routeSummary,
    cargoUsed,
    cargoCapacity,
  });

  return {
    selectedShipId: ship?.id ?? null,
    steps,
    primaryAction,
    backAction,
    summary: summaryParts.join(' · '),
    resultCue,
  };
};
