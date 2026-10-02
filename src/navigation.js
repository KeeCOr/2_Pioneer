const PORT_DOCK_RADIUS = 3.5;
const DEPARTURE_CLEARANCE = 3.2;
const ARRIVAL_BUFFER = 1.05;

const SEA_CORRIDOR = [
  { x: 8, y: 38 },
  { x: 20, y: 42 },
  { x: 36, y: 48 },
  { x: 52, y: 54 },
  { x: 68, y: 58 },
  { x: 84, y: 62 },
  { x: 95, y: 48 },
];

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const harborOf = (port) => ({
  x: port.harborX ?? port.x,
  y: port.harborY ?? port.y,
});

const dedupeRoute = (points) => {
  const out = [];
  points.forEach((pt) => {
    const last = out[out.length - 1];
    if (!last || distance(last, pt) > 1.5) out.push(pt);
  });
  return out;
};

export const buildSeaRoute = (start, destination) => {
  if (!start || !destination) return [];
  const direct = distance(start, destination);
  if (direct < 18) return dedupeRoute([start, destination]);

  const minX = Math.min(start.x, destination.x);
  const maxX = Math.max(start.x, destination.x);
  const corridor = SEA_CORRIDOR.filter((pt) => pt.x > minX + 2 && pt.x < maxX - 2);
  const ordered = start.x <= destination.x ? corridor : [...corridor].reverse();

  const needsSouthernRoute = direct >= 24 || (start.y < 35 && destination.y < 35 && Math.abs(start.x - destination.x) > 14);
  if (!needsSouthernRoute) return dedupeRoute([start, destination]);

  return dedupeRoute([start, ...ordered, destination]);
};

export const findPortForShip = (ship, ports) => {
  const entry = Object.entries(ports).find(([, port]) =>
    Math.hypot(ship.x - port.x, ship.y - port.y) < PORT_DOCK_RADIUS ||
    Math.hypot(ship.x - (port.harborX ?? port.x), ship.y - (port.harborY ?? port.y)) < PORT_DOCK_RADIUS
  );
  return entry ? entry[1] : null;
};

export const createDepartureState = (ship, destinationPort, sourcePort = null) => {
  let x = ship.x;
  let y = ship.y;
  const destinationHarbor = harborOf(destinationPort);

  if (sourcePort && Math.hypot(ship.x - sourcePort.x, ship.y - sourcePort.y) < PORT_DOCK_RADIUS) {
    const sourceHarbor = harborOf(sourcePort);
    x = sourceHarbor.x;
    y = sourceHarbor.y;
  } else if (sourcePort && Math.hypot(ship.x - (sourcePort.harborX ?? sourcePort.x), ship.y - (sourcePort.harborY ?? sourcePort.y)) < PORT_DOCK_RADIUS) {
    const sourceHarbor = harborOf(sourcePort);
    x = sourceHarbor.x;
    y = sourceHarbor.y;
  } else if (sourcePort) {
    const dx = destinationHarbor.x - sourcePort.x;
    const dy = destinationHarbor.y - sourcePort.y;
    const portDistance = Math.hypot(dx, dy);
    if (portDistance > ARRIVAL_BUFFER) {
      const clearance = Math.min(DEPARTURE_CLEARANCE, portDistance - ARRIVAL_BUFFER);
      x = sourcePort.x + (dx / portDistance) * clearance;
      y = sourcePort.y + (dy / portDistance) * clearance;
    }
  }

  const route = buildSeaRoute({ x, y }, destinationHarbor);
  const firstTarget = route[1] || destinationPort;

  return {
    ...ship,
    x,
    y,
    isMoving: true,
    targetX: firstTarget.x,
    targetY: firstTarget.y,
    destinationX: destinationHarbor.x,
    destinationY: destinationHarbor.y,
    route,
    routeIndex: route.length > 1 ? 1 : 0,
    startX: x,
    startY: y,
    booster: false,
  };
};
