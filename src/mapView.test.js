import test from 'node:test';
import assert from 'node:assert/strict';
import { clampMapView, getDockedShipScreenOffset, relaxVisibleMapPoints, zoomMapViewAt } from './mapView.js';

test('allows dragging the map at the default zoom level', () => {
  assert.deepEqual(
    clampMapView({ x: 120, y: -80, zoom: 1, width: 800, height: 500 }),
    { x: 120, y: -80 },
  );
});

test('zooms around the requested viewport point', () => {
  assert.deepEqual(
    zoomMapViewAt({
      view: { x: 0, y: 0, zoom: 1 },
      factor: 2,
      centerX: 400,
      centerY: 250,
      width: 800,
      height: 500,
    }),
    { zoom: 2, x: -400, y: -250 },
  );
});

test('keeps offscreen map markers offscreen instead of pinning them to the viewport edge', () => {
  const layout = relaxVisibleMapPoints({
    width: 800,
    height: 500,
    items: [
      { k: 'offscreen', sx: -240, sy: 200 },
      { k: 'visible', sx: 120, sy: 210 },
    ],
  });

  assert.equal(layout.offscreen.sx, -240);
  assert.equal(layout.offscreen.sy, 200);
});

test('separates visible close markers without clamping them to screen bounds', () => {
  const layout = relaxVisibleMapPoints({
    width: 800,
    height: 500,
    minDist: 52,
    items: [
      { k: 'a', sx: 100, sy: 100 },
      { k: 'b', sx: 110, sy: 100 },
    ],
  });

  assert.ok(Math.hypot(layout.a.sx - layout.b.sx, layout.a.sy - layout.b.sy) >= 51);
});

test('does not push a single docked ship away from its harbor anchor', () => {
  assert.deepEqual(
    getDockedShipScreenOffset({ shipId: 1, dockGroups: { lisbon: [1] } }),
    { ox: 0, oy: 0 },
  );
});

test('spreads multiple docked ships around the harbor without a fixed right-side bias', () => {
  const first = getDockedShipScreenOffset({ shipId: 1, dockGroups: { lisbon: [1, 2, 3] } });
  const second = getDockedShipScreenOffset({ shipId: 2, dockGroups: { lisbon: [1, 2, 3] } });

  assert.notDeepEqual(first, { ox: 0, oy: 0 });
  assert.notDeepEqual(second, first);
  assert.ok(Math.abs(first.ox) <= 30);
});
