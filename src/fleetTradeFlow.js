const STEP_LABELS = {
  fleet: 'Fleet selected',
  cargo: 'Cargo check',
  market: 'Market action',
  route: 'Route review',
  depart: 'Depart',
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
      cause: 'No fleet is selected.',
      delta: 'No cargo, market, or route result can be evaluated yet.',
      nextAction: 'Select a fleet to begin the trade chain.',
    };
  }

  if (cargoUsed <= 0) {
    return {
      cause: atPort ? 'The fleet is docked without sellable cargo.' : 'The fleet is away from market access.',
      delta: `Cargo remains ${cargoUsed}/${cargoCapacity || 0}.`,
      nextAction: atPort ? 'Open market and load a profitable cargo.' : 'Return to a port before planning trade.',
    };
  }

  if (routeSummary?.blockers?.length) {
    return {
      cause: routeSummary.blockers[0],
      delta: `${routeSummary.expectedProfit ?? 0}g expected profit is blocked.`,
      nextAction: 'Resolve the blocker before departure.',
    };
  }

  if (routeSummary && routeSummary.expectedProfit <= 0) {
    return {
      cause: 'Destination prices do not beat the buy cost.',
      delta: `${routeSummary.expectedProfit}g expected trade result.`,
      nextAction: 'Pick a different destination or change cargo.',
    };
  }

  if (routeSummary?.riskLevel === 'high') {
    return {
      cause: 'The route has high threat pressure.',
      delta: `${routeSummary.expectedProfit ?? 0}g profit is possible with ${routeSummary.travelTime ?? '?'} days at sea.`,
      nextAction: 'Review threats and prepare crew before confirming.',
    };
  }

  if (routeMode && routeSummary?.canDepart) {
    return {
      cause: 'Cargo, route, and crew are aligned.',
      delta: `${routeSummary.expectedProfit ?? 0}g expected profit at ${routeSummary.riskLevel || 'unknown'} risk.`,
      nextAction: 'Confirm departure when ready.',
    };
  }

  if (marketOpen) {
    return {
      cause: 'Cargo is loaded and market is open.',
      delta: `${cargoUsed}/${cargoCapacity || cargoUsed} cargo ready for route planning.`,
      nextAction: 'Choose a route and compare destination prices.',
    };
  }

  return {
    cause: 'Cargo is loaded but no route is selected.',
    delta: `${cargoUsed}/${cargoCapacity || cargoUsed} cargo is waiting.`,
    nextAction: 'Choose a destination route.',
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

  let primaryAction = { id: 'select-fleet', label: 'Select fleet' };
  if (ship && atPort && cargoUsed <= 0) primaryAction = { id: 'open-market', label: 'Open market' };
  else if (routeBlocked) primaryAction = { id: 'review-route', label: 'Review route' };
  else if (routeReady) primaryAction = { id: 'confirm-route', label: 'Confirm route' };
  else if (ship) primaryAction = { id: 'choose-route', label: 'Choose route' };

  const backAction = routeMode
    ? { id: 'back-to-market', label: 'Back to market' }
    : marketOpen
      ? { id: 'back-to-fleet', label: 'Back to fleet' }
      : { id: 'keep-selection', label: 'Keep selection' };

  const summaryParts = [];
  if (!ship) summaryParts.push('no fleet selected');
  if (ship && cargoUsed <= 0) summaryParts.push('cargo empty');
  if (cargoCapacity > 0) summaryParts.push(`${cargoUsed}/${cargoCapacity} cargo`);
  if (routeSummary) {
    summaryParts.push(`${routeSummary.expectedProfit ?? 0}g profit`);
    summaryParts.push(`${routeSummary.riskLevel || 'unknown'} risk`);
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
    summary: summaryParts.join(' | '),
    resultCue,
  };
};
