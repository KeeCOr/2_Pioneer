export const getNextUnlockProgress = ({ ports, totalEarned = 0, getPortAccessState }) => {
  const earned = Math.max(0, Number(totalEarned) || 0);
  const next = Object.entries(ports || {})
    .map(([key, port]) => ({ key, port, access: getPortAccessState(key, earned) }))
    .filter(({ access }) => !access.unlocked && access.required > 0)
    .sort((a, b) => a.access.required - b.access.required)[0];

  if (!next) return null;

  const required = Math.max(1, Number(next.access.required) || 1);
  const pct = Math.max(0, Math.min(100, Math.round((earned / required) * 100)));

  return {
    key: next.key,
    port: next.port,
    required,
    totalEarned: earned,
    remaining: Math.max(0, required - earned),
    pct,
  };
};
