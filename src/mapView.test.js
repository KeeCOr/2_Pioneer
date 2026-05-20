import test from 'node:test';
import assert from 'node:assert/strict';
import { clampMapView, zoomMapViewAt } from './mapView.js';

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
