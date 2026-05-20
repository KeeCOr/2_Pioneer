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
