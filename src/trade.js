export const clampTradeQuantity = (requested, limit) => {
  const max = Math.max(0, Math.floor(Number(limit) || 0));
  if (max < 1) return 0;
  const qty = Math.floor(Number(requested) || 1);
  return Math.min(max, Math.max(1, qty));
};
