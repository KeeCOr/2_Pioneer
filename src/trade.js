export const clampTradeQuantity = (requested, limit) => {
  const max = Math.max(0, Math.floor(Number(limit) || 0));
  if (max < 1) return 0;
  const qty = Math.floor(Number(requested) || 1);
  return Math.min(max, Math.max(1, qty));
};

export const TRADE_FEE_PCT = 10;

export const getBuyTotal = (unitPrice, quantity) => {
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  return Math.max(0, Math.ceil((Number(unitPrice) || 0) * qty));
};

export const getSellTotal = (unitPrice, quantity, feePct = TRADE_FEE_PCT) => {
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  const feeRate = Math.max(0, Number(feePct) || 0);
  return Math.max(0, Math.floor((Number(unitPrice) || 0) * qty * (1 - feeRate / 100)));
};

export const getTradePreview = ({ mode, unitPrice, quantity, gold, cargo, capacity }) => {
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  const total = Math.max(0, Math.floor((Number(unitPrice) || 0) * qty));
  const currentGold = Math.max(0, Math.floor(Number(gold) || 0));
  const currentCargo = Math.max(0, Math.floor(Number(cargo) || 0));
  const maxCargo = Math.max(0, Math.floor(Number(capacity) || 0));
  const nextGold = mode === 'sell' ? currentGold + total : Math.max(0, currentGold - total);
  const nextCargo = mode === 'sell' ? Math.max(0, currentCargo - qty) : Math.min(maxCargo, currentCargo + qty);
  return {
    total,
    nextGold,
    nextCargo,
    remainingCargo: Math.max(0, maxCargo - nextCargo),
  };
};
