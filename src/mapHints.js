export const getCargoSaleHints = ({
  ports,
  prices,
  cargo,
  currentPortKey = null,
  totalEarned = 0,
  getPortAccessState,
  limit = 3,
}) => {
  const cargoEntries = Object.entries(cargo || {}).filter(([, qty]) => qty > 0);
  if (!cargoEntries.length || !ports || !prices || !getPortAccessState) return [];

  const eligiblePortKeys = Object.keys(ports).filter((portKey) => {
    if (portKey === currentPortKey || !prices[portKey]) return false;
    return getPortAccessState(portKey, totalEarned).unlocked;
  });
  if (!eligiblePortKeys.length) return [];



  return eligiblePortKeys
    .map((portKey) => {
      const best = cargoEntries
        .map(([resource, quantity]) => {
          const unitPrice = Number(prices[portKey]?.[resource]) || 0;
          const currentPrice = Number(prices[currentPortKey]?.[resource]) || unitPrice || 1;
          return {
            portKey,
            resource,
            quantity,
            unitPrice,
            total: unitPrice * quantity,
            percentAboveCurrent: Math.round(((unitPrice - currentPrice) / currentPrice) * 100),
          };
        })
        .filter((hint) => hint.unitPrice > 0)
        .sort((a, b) => b.total - a.total || b.percentAboveCurrent - a.percentAboveCurrent)[0];
      return best;
    })
    .filter((hint) => hint && hint.percentAboveCurrent > 0)
    .sort((a, b) => b.total - a.total || b.percentAboveCurrent - a.percentAboveCurrent)
    .slice(0, Math.max(0, limit));
};

