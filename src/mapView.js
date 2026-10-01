export const clampMapView = ({ x, y, zoom, width, height, padRatio = 0.25 }) => {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const safeZoom = Math.max(0.5, Math.min(24, Number(zoom) || 1));
  const pad = Math.min(safeWidth, safeHeight) * padRatio;
  const minX = safeWidth * (1 - safeZoom) - pad;
  const minY = safeHeight * (1 - safeZoom) - pad;
  return {
    x: Math.min(pad, Math.max(minX, Number(x) || 0)),
    y: Math.min(pad, Math.max(minY, Number(y) || 0)),
  };
};

export const zoomMapViewAt = ({ view, factor, centerX, centerY, width, height }) => {
  const current = view || { x: 0, y: 0, zoom: 1 };
  const nextZoom = Math.max(0.5, Math.min(24, current.zoom * factor));
  const nextX = centerX - (centerX - current.x) * nextZoom / current.zoom;
  const nextY = centerY - (centerY - current.y) * nextZoom / current.zoom;
  const { x, y } = clampMapView({ x: nextX, y: nextY, zoom: nextZoom, width, height });
  return { zoom: nextZoom, x, y };
};

export const relaxVisibleMapPoints = ({ items, width, height, minDist = 52, margin = 80, passes = 6 }) => {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  const points = (items || []).map(item => ({ ...item }));
  const visible = points.filter(item =>
    item.sx >= -margin && item.sx <= safeWidth + margin &&
    item.sy >= -margin && item.sy <= safeHeight + margin
  );

  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const a = visible[i], b = visible[j];
        let dx = b.sx - a.sx, dy = b.sy - a.sy;
        let d = Math.hypot(dx, dy);
        if (d === 0) { dx = 1; dy = 0; d = 1; }
        if (d < minDist) {
          const push = (minDist - d) / 2;
          const ux = dx / d, uy = dy / d;
          a.sx -= ux * push; a.sy -= uy * push;
          b.sx += ux * push; b.sy += uy * push;
        }
      }
    }
  }

  const out = {};
  points.forEach(item => {
    out[item.k] = { sx: Math.round(item.sx), sy: Math.round(item.sy) };
  });
  return out;
};

export const getDockedShipScreenOffset = ({ shipId, dockGroups, spacing = 22 }) => {
  const groups = dockGroups || {};
  for (const ids of Object.values(groups)) {
    const idx = ids.indexOf(shipId);
    if (idx === -1) continue;
    const n = ids.length;
    if (n <= 1) return { ox: 0, oy: 0 };

    const angle = (-Math.PI / 2) + (idx / n) * Math.PI * 2;
    const radius = spacing + Math.floor(idx / 6) * 8;
    return {
      ox: Math.round(Math.cos(angle) * radius),
      oy: Math.round(Math.sin(angle) * radius),
    };
  }
  return { ox: 0, oy: 0 };
};
