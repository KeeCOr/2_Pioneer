const DEFAULT_THREATS = ['clear weather', 'standard patrol route'];

const normalizeCargo = (cargo = []) => cargo
  .map((item) => ({
    res: item.res,
    qty: Math.max(0, Math.floor(Number(item.qty ?? item.quantity) || 0)),
    buyPrice: Math.max(0, Number(item.buyPrice ?? item.price ?? item.unitPrice) || 0),
  }))
  .filter((item) => item.res && item.qty > 0);

export const getRouteSummary = ({
  access = { unlocked: true },
  crewCount = 0,
  samePort = false,
  distance = 0,
  cargo = [],
  destinationPrices = {},
  threatSources = [],
} = {}) => {
  const blockers = [];
  if (!access.unlocked) blockers.push(access.label || 'route locked');
  if (crewCount < 1) blockers.push('crew required');
  if (samePort) blockers.push('already at this port');

  const expectedProfit = normalizeCargo(cargo).reduce((sum, item) => {
    const salePrice = Math.max(0, Number(destinationPrices[item.res]) || 0);
    return sum + Math.floor((salePrice - item.buyPrice) * item.qty);
  }, 0);

  const travelTime = Math.max(1, Math.ceil((Number(distance) || 0) / 10));
  const listedThreats = threatSources.length ? threatSources.slice(0, 3) : DEFAULT_THREATS;
  const riskScore = blockers.length
    ? 99
    : Math.min(99, Math.round(travelTime * 8 + threatSources.length * 22));
  const riskLevel = blockers.length ? 'blocked' : riskScore >= 70 ? 'high' : riskScore >= 38 ? 'medium' : 'low';

  let recommendation = 'Good route: profit is positive and risk is manageable.';
  if (blockers.length || expectedProfit <= 0) {
    recommendation = 'Do not depart: resolve blockers or choose a better market.';
  } else if (riskLevel === 'high') {
    recommendation = 'Profit is strong, but prepare for the listed threats.';
  } else if (riskLevel === 'medium') {
    recommendation = 'Acceptable route: check supplies before departure.';
  }

  return {
    canDepart: blockers.length === 0,
    expectedProfit,
    travelTime,
    riskLevel,
    riskScore,
    threatSources: listedThreats,
    blockers,
    recommendation,
  };
};
