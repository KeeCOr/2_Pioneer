const PORT_DOCK_RADIUS = 3.5;
const DEPARTURE_CLEARANCE = 3.2;
const ARRIVAL_BUFFER = 1.05;

export const findPortForShip = (ship, ports) => {
  const entry = Object.entries(ports).find(([, port]) =>
    Math.hypot(ship.x - port.x, ship.y - port.y) < PORT_DOCK_RADIUS
  );
  return entry ? entry[1] : null;
};

export const createDepartureState = (ship, destinationPort, sourcePort = null) => {
  let x = ship.x;
  let y = ship.y;

  if (sourcePort && Math.hypot(ship.x - sourcePort.x, ship.y - sourcePort.y) < PORT_DOCK_RADIUS) {
    const dx = destinationPort.x - sourcePort.x;
    const dy = destinationPort.y - sourcePort.y;
    const distance = Math.hypot(dx, dy);

    if (distance > ARRIVAL_BUFFER) {
      const clearance = Math.min(DEPARTURE_CLEARANCE, distance - ARRIVAL_BUFFER);
      x = sourcePort.x + (dx / distance) * clearance;
      y = sourcePort.y + (dy / distance) * clearance;
    }
  }

  return {
    ...ship,
    x,
    y,
    isMoving: true,
    targetX: destinationPort.x,
    targetY: destinationPort.y,
    startX: x,
    startY: y,
    booster: false,
  };
};
