import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createDepartureState, findPortForShip } from './navigation.js';
import { clampMapView, getDockedShipScreenOffset, relaxVisibleMapPoints, zoomMapViewAt } from './mapView.js';
import { clampTradeQuantity, getBuyTotal, getSellTotal, getTradePreview } from './trade.js';
import worldLandmassesUrl from './assets/map/world-landmasses.png';

const RESOURCE_ICON_FILES = import.meta.glob('./assets/icons/resources/*.png', { eager: true, query: '?url', import: 'default' });
const SHIP_ICON_FILES = import.meta.glob('./assets/icons/ships/*.png', { eager: true, query: '?url', import: 'default' });
const UI_ICON_FILES = import.meta.glob('./assets/icons/ui/*.png', { eager: true, query: '?url', import: 'default' });

const RESOURCE_ICON_KEY = {
  '향신료': 'spice',
  '도자기': 'ceramics',
  '비단': 'silk',
  '와인': 'wine',
  '다이아몬드': 'diamond',
  '해산물': 'seafood',
  '면직물': 'cotton',
  '양털': 'wool',
  '계피': 'cinnamon',
  '쌀': 'rice',
};
const assetUrl = (files, folder, key) => files[`./assets/icons/${folder}/${key}.png`];
const resourceIconUrl = (res) => assetUrl(RESOURCE_ICON_FILES, 'resources', RESOURCE_ICON_KEY[res]);
const shipIconUrl = (type) => assetUrl(SHIP_ICON_FILES, 'ships', type);
const uiIconUrl = (name) => assetUrl(UI_ICON_FILES, 'ui', name);

const AssetIcon = ({ src, fallback, alt = '', className = '', imgClassName = '', fallbackClassName = '' }) => (
  src
    ? <img src={src} alt={alt} draggable="false" className={`asset-icon ${className} ${imgClassName}`} />
    : <span className={`${className} ${fallbackClassName}`}>{fallback}</span>
);
const ResourceIcon = ({ res, className = 'w-6 h-6', fallbackClassName = '' }) => (
  <AssetIcon src={resourceIconUrl(res)} fallback={RESOURCES[res]?.icon || '□'} alt={res} className={className} imgClassName="resource-asset-icon" fallbackClassName={fallbackClassName} />
);
const ShipIcon = ({ type, className = 'w-7 h-7', fallbackClassName = '' }) => (
  <AssetIcon src={shipIconUrl(type)} fallback={SHIP_TYPES[type]?.icon || '⛵'} alt={SHIP_TYPES[type]?.name || type} className={className} imgClassName="ship-asset-icon" fallbackClassName={fallbackClassName} />
);
const UiIcon = ({ name, className = 'w-5 h-5', alt = '' }) => (
  <AssetIcon src={uiIconUrl(name)} fallback="" alt={alt || name} className={className} imgClassName="ui-asset-icon" />
);

const scaleCanvas = (canvas, width, height) => {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  canvas.style.width = '100%';
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
};

const drawCanvasPath = (ctx, points) => {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
};

const PriceChartCanvas = ({ values, min, max, lineColor, fillColor, glowColor, width, height, showDot = true }) => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = scaleCanvas(canvas, width, height);
    ctx.clearRect(0, 0, width, height);
    const range = (max - min) || 1;
    const pts = values.length > 1 ? values : [values[0] ?? min, values[0] ?? min];
    const toPoint = (v, i) => ({
      x: (i / (pts.length - 1 || 1)) * width,
      y: height - ((v - min) / range) * (height - 8) - 4,
    });
    const points = pts.map(toPoint);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, fillColor);
    gradient.addColorStop(1, 'rgba(0,0,0,0.02)');
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (const point of points) ctx.lineTo(point.x, point.y);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    drawCanvasPath(ctx, points);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    if (showDot) {
      const last = points[points.length - 1];
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lineColor;
      ctx.strokeStyle = '#0b1623';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }, [values, min, max, lineColor, fillColor, glowColor, width, height, showDot]);
  return <canvas ref={ref} className="block" aria-hidden="true" />;
};

const MapSeaCanvas = ({ width, height, zoom, vx, vy, ws, imageUrl, currents, seaLanes }) => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let alive = true;
    const render = (img) => {
      if (!alive) return;
      const ctx = scaleCanvas(canvas, width, height);
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#197db3');
      bg.addColorStop(0.42, '#0b5f99');
      bg.addColorStop(1, '#032543');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      for (const [x, y, r, color] of [
        [width * 0.18, height * 0.18, width * 0.28, 'rgba(121,230,255,0.24)'],
        [width * 0.78, height * 0.52, width * 0.32, 'rgba(55,213,238,0.20)'],
        [width * 0.48, height * 0.76, width * 0.36, 'rgba(2,105,174,0.20)'],
      ]) {
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, color);
        grd.addColorStop(1, 'rgba(2,7,18,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = '#e0faff';
      ctx.lineWidth = 1.2;
      for (let y = 15; y < height; y += 28) {
        ctx.beginPath();
        for (let x = -20; x < width + 30; x += 12) {
          const yy = y + Math.sin((x + y) / 22) * 4;
          if (x === -20) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 0.62;
      if (img) ctx.drawImage(img, vx, vy, width * zoom, height * zoom);
      ctx.globalAlpha = 1;
      for (const pts of seaLanes) {
        const screen = pts.map(([x, y]) => {
          const p = ws(x, y);
          return { x: p.sx, y: p.sy };
        });
        drawCanvasPath(ctx, screen);
        ctx.setLineDash([3, 8]);
        ctx.strokeStyle = 'rgba(255,247,214,0.16)';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.setLineDash([]);
      currents.forEach((pts, idx) => {
        const screen = pts.map(([x, y]) => {
          const p = ws(x, y);
          return { x: p.sx, y: p.sy };
        });
        drawCanvasPath(ctx, screen);
        ctx.setLineDash([18, 14]);
        ctx.strokeStyle = idx % 2 ? 'rgba(155,234,254,0.28)' : 'rgba(248,217,137,0.22)';
        ctx.lineWidth = idx < 2 ? 3 : 2;
        ctx.lineCap = 'round';
        ctx.stroke();
      });
      ctx.setLineDash([]);
    };
    const img = new Image();
    img.onload = () => render(img);
    img.onerror = () => render(null);
    img.src = imageUrl;
    render(null);
    return () => { alive = false; };
  }, [width, height, zoom, vx, vy, ws, imageUrl, currents, seaLanes]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} aria-hidden="true" />;
};

const MapGridCanvas = ({ width, height, ws }) => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = scaleCanvas(canvas, width, height);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(212,165,116,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 20; i += 1) {
      const pct = i * 5;
      const { sx: lx } = ws(pct, 0);
      const { sy: ly } = ws(0, pct);
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, height);
      ctx.moveTo(0, ly);
      ctx.lineTo(width, ly);
      ctx.stroke();
    }
  }, [width, height, ws]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }} aria-hidden="true" />;
};

const MapRouteCanvas = ({ width, height, ws, cur, routeMode, gs, ports, getPortAccessState, portOf, portHarbor }) => {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = scaleCanvas(canvas, width, height);
    ctx.clearRect(0, 0, width, height);
    const routeToPoints = (route) => route.map((p) => {
      const s = ws(p.x, p.y);
      return { x: s.sx, y: s.sy };
    });
    const strokeRoute = (points, color, lineWidth, alpha = 1, dash = []) => {
      if (points.length < 2) return;
      ctx.globalAlpha = alpha;
      drawCanvasPath(ctx, points);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash(dash);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    };
    if (cur?.isMoving && cur.startX != null) {
      const route = cur.route?.length ? cur.route : [{ x: cur.startX, y: cur.startY }, { x: cur.targetX, y: cur.targetY }];
      const currentIndex = Math.max(1, cur.routeIndex || 1);
      const traveled = [...route.slice(0, currentIndex), { x: cur.x, y: cur.y }];
      const traveledPoints = routeToPoints(traveled);
      strokeRoute(traveledPoints, '#f8fdff', 11, 0.24, [10, 12]);
      strokeRoute(traveledPoints, '#e0faff', 5, 0.55, [10, 12]);
      strokeRoute(traveledPoints, '#f8d989', 1.8, 0.54);
    }
    if (cur?.isMoving) {
      const route = cur.route?.length ? cur.route : [{ x: cur.x, y: cur.y }, { x: cur.targetX, y: cur.targetY }];
      const currentIndex = Math.max(1, cur.routeIndex || 1);
      const future = [{ x: cur.x, y: cur.y }, ...route.slice(currentIndex)];
      const futurePoints = routeToPoints(future);
      strokeRoute(futurePoints, '#ffe08a', 3, 0.88, [10, 6]);
      if (futurePoints.length > 1) {
        const a = futurePoints[futurePoints.length - 2];
        const b = futurePoints[futurePoints.length - 1];
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.fillStyle = '#d4a574';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - Math.cos(angle - 0.45) * 12, b.y - Math.sin(angle - 0.45) * 12);
        ctx.lineTo(b.x - Math.cos(angle + 0.45) * 12, b.y - Math.sin(angle + 0.45) * 12);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (routeMode && cur) {
      const candidates = Object.entries(ports)
        .map(([k, p]) => ({ k, p, access: getPortAccessState(k, gs.totalEarned), dist: Math.hypot(p.x - cur.x, p.y - cur.y) }))
        .filter((item) => item.dist >= 0.5 && item.access.unlocked)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 10);
      const curAnchorKey = !cur.isMoving ? portOf(cur) : null;
      const curAnchor = curAnchorKey ? portHarbor(curAnchorKey) : cur;
      const a = ws(curAnchor.x, curAnchor.y);
      candidates.forEach(({ k }, idx) => {
        const h = portHarbor(k);
        const b = ws(h.x, h.y);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.strokeStyle = idx < 4 ? 'rgba(255,224,138,0.38)' : 'rgba(255,224,138,0.2)';
        ctx.lineWidth = idx < 4 ? 1.8 : 1.2;
        ctx.stroke();
      });
    }
  }, [width, height, ws, cur, routeMode, gs, ports, getPortAccessState, portOf, portHarbor]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }} aria-hidden="true" />;
};

// ==================== 모듈 레벨 상수 ====================
const SHIP_TYPES = {
  rowboat:    { name: '통통배',   icon: '🚤',   desc: '초소형 쾌속선. 단거리 전용.',       baseSpeed: 0.014, baseCapacity: 25,  maxCrew: 2,  cost: 1000  },
  sloop:      { name: '슬루프',   icon: '⛵',    desc: '경쾌한 소형 쾌속선.',               baseSpeed: 0.010, baseCapacity: 55,  maxCrew: 4,  cost: 3000  },
  caravel:    { name: '카라벨',   icon: '🛥️',  desc: '탐험용 중형 쾌속선.',               baseSpeed: 0.009, baseCapacity: 80,  maxCrew: 6,  cost: 8000  },
  brigantine: { name: '브리간틴', icon: '⛴️',  desc: '쾌속 중형 상인선.',                 baseSpeed: 0.008, baseCapacity: 100, maxCrew: 7,  cost: 12000 },
  galley:     { name: '갤리',     icon: '🚣',   desc: '지중해 특화. 노+돛 복합.',           baseSpeed: 0.006, baseCapacity: 90,  maxCrew: 12, cost: 14000 },
  dhow:       { name: '다우',     icon: '🛶',   desc: '인도양·아라비아해 최적 범선.',       baseSpeed: 0.009, baseCapacity: 85,  maxCrew: 6,  cost: 16000 },
  merchant:   { name: '상인선',   icon: '🚢',   desc: '균형 잡힌 표준 대형 상인선.',       baseSpeed: 0.006, baseCapacity: 140, maxCrew: 9,  cost: 20000 },
  fluyt:      { name: '플루트',   icon: '🛳️',  desc: '화물 특화 네덜란드 대형선.',        baseSpeed: 0.004, baseCapacity: 200, maxCrew: 8,  cost: 28000 },
  junk:       { name: '정크선',   icon: '🏮',   desc: '동아시아 대형 화물선.',              baseSpeed: 0.005, baseCapacity: 220, maxCrew: 10, cost: 32000 },
  galleon:    { name: '갤리온',   icon: '⚓',   desc: '대양 항해 서양 대형 범선. 장거리.',  baseSpeed: 0.002, baseCapacity: 280, maxCrew: 12, cost: 45000 },
  frigate:    { name: '프리깃',   icon: '🏴‍☠️', desc: '최고급 전투 쾌속함.',             baseSpeed: 0.013, baseCapacity: 120, maxCrew: 12, cost: 65000 },
};

const PORTS = {
  london:    { name: '런던',         region: 'europe',        country: '🇬🇧', x: 47.0, y: 32.0 },
  bristol:   { name: '브리스톨',     region: 'europe',        country: '🇬🇧', x: 46.0, y: 34.0 },
  lisbon:    { name: '리스본',       region: 'europe',        country: '🇵🇹', x: 43.2, y: 43.5 },
  hamburg:   { name: '함부르크',     region: 'europe',        country: '🇩🇪', x: 50.7, y: 32.2 },
  antwerp:   { name: '앤트워프',     region: 'europe',        country: '🇧🇪', x: 48.5, y: 34.2 },
  marseille: { name: '마르세유',     region: 'mediterranean', country: '🇫🇷', x: 49.0, y: 41.0 },
  genoa:     { name: '제노바',       region: 'mediterranean', country: '🇮🇹', x: 50.8, y: 40.4 },
  venice:    { name: '베니스',       region: 'mediterranean', country: '🇮🇹', x: 52.1, y: 39.3 },
  tripoli:   { name: '트리폴리',     region: 'mediterranean', country: '🇱🇾', x: 51.0, y: 51.5 },
  istanbul:  { name: '이스탄불',     region: 'mediterranean', country: '🇹🇷', x: 56.8, y: 40.6 },
  alexandria:{ name: '알렉산드리아', region: 'arabian',       country: '🇪🇬', x: 55.0, y: 49.0 },
  aden:      { name: '아덴',         region: 'arabian',       country: '🇾🇪', x: 62.7, y: 60.0 },
  dubai:     { name: '두바이',       region: 'arabian',       country: '🇦🇪', x: 65.5, y: 52.4 },
  mumbai:    { name: '뭄바이',       region: 'south_asia',    country: '🇮🇳', x: 69.8, y: 58.4 },
  goa:       { name: '고아',         region: 'south_asia',    country: '🇮🇳', x: 69.8, y: 62.0 },
  calicut:   { name: '칼리컷',       region: 'south_asia',    country: '🇮🇳', x: 70.6, y: 65.0 },
  colombo:   { name: '콜롬보',       region: 'south_asia',    country: '🇱🇰', x: 72.3, y: 70.8 },
  malacca:   { name: '말라카',       region: 'east_asia',     country: '🇲🇾', x: 81.5, y: 68.5 },
  singapore: { name: '싱가포르',     region: 'east_asia',     country: '🇸🇬', x: 82.4, y: 70.8 },
  bangkok:   { name: '방콕',         region: 'east_asia',     country: '🇹🇭', x: 80.0, y: 62.0 },
  guangzhou: { name: '광저우',       region: 'east_asia',     country: '🇨🇳', x: 84.6, y: 52.3 },
  shanghai:  { name: '상하이',       region: 'east_asia',     country: '🇨🇳', x: 87.0, y: 44.0 },
  yokohama:  { name: '요코하마',     region: 'east_asia',     country: '🇯🇵', x: 92.0, y: 42.0 },
  busan:     { name: '부산',         region: 'east_asia',     country: '🇰🇷', x: 89.6, y: 43.5 },
  incheon:   { name: '인천',         region: 'east_asia',     country: '🇰🇷', x: 88.8, y: 42.4 },
  boston:    { name: '보스턴',       region: 'americas',      country: '🇺🇸', x: 26.0, y: 39.2 },
  newyork:   { name: '뉴욕',         region: 'americas',      country: '🇺🇸', x: 24.5, y: 41.8 },
  neworleans:{ name: '뉴올리언스',   region: 'americas',      country: '🇺🇸', x: 22.0, y: 52.5 },
  havana:    { name: '하바나',       region: 'americas',      country: '🇨🇺', x: 24.8, y: 56.2 },
};

const START_UNLOCKED_PORTS = ['lisbon', 'bristol', 'london', 'hamburg', 'antwerp', 'marseille'];
const PORT_HARBORS = {
  london: { x: 46.5, y: 34.8 }, bristol: { x: 43.8, y: 35.7 }, lisbon: { x: 40.6, y: 42.1 },
  hamburg: { x: 52.8, y: 30.3 }, antwerp: { x: 47.5, y: 31.6 }, marseille: { x: 48.8, y: 44.0 },
  genoa: { x: 48.27, y: 41.66 }, venice: { x: 54.5, y: 40.8 }, tripoli: { x: 50.2, y: 48.8 },
  istanbul: { x: 59.6, y: 41.1 }, alexandria: { x: 52.2, y: 48.5 }, aden: { x: 65.3, y: 59.0 },
  dubai: { x: 64.11, y: 54.84 }, mumbai: { x: 69.8, y: 61.2 }, goa: { x: 69.1, y: 64.7 },
  calicut: { x: 70.5, y: 62.2 }, colombo: { x: 70.0, y: 72.4 }, malacca: { x: 83.3, y: 66.3 },
  singapore: { x: 79.7, y: 71.4 }, bangkok: { x: 80.7, y: 59.3 }, guangzhou: { x: 81.8, y: 52.0 },
  shanghai: { x: 84.7, y: 45.6 }, yokohama: { x: 91.7, y: 39.2 }, busan: { x: 86.8, y: 44.0 },
  incheon: { x: 86.3, y: 41.1 }, boston: { x: 28.5, y: 37.9 }, newyork: { x: 27.3, y: 42.4 },
  neworleans: { x: 19.2, y: 52.6 }, havana: { x: 23.9, y: 53.6 },
};
const portHarbor = (portKey) => PORT_HARBORS[portKey] || PORTS[portKey];
const portWithHarbor = (portKey) => {
  const port = PORTS[portKey];
  const harbor = portHarbor(portKey);
  return { ...port, harborX: harbor.x, harborY: harbor.y };
};
const REGION_PORT_UNLOCK_GOLD_REQ = {
  europe: 0,
  mediterranean: 1500,
  arabian: 8000,
  americas: 12000,
  south_asia: 20000,
  east_asia: 45000,
};
const getInitialVisitedPorts = () => [...START_UNLOCKED_PORTS];
const getPortUnlockReq = (portKey) => {
  if (START_UNLOCKED_PORTS.includes(portKey)) return 0;
  return REGION_PORT_UNLOCK_GOLD_REQ[PORTS[portKey]?.region] ?? 0;
};
const getPortAccessState = (portKey, totalEarned = 0) => {
  const required = getPortUnlockReq(portKey);
  const unlocked = required <= (totalEarned || 0);
  const shortReq = required >= 1000 ? `${Math.round(required / 1000)}k금 필요` : `${required}금 필요`;
  return {
    unlocked,
    required,
    shortLabel: unlocked ? '항해 가능' : shortReq,
    label: unlocked ? '항해 가능' : `누적 판매 ${required.toLocaleString()}금`,
  };
};

const RESOURCES = {
  '향신료': { icon: '🌶️' }, '도자기': { icon: '🏺' }, '비단':   { icon: '🧣' },
  '와인':   { icon: '🍷' }, '다이아몬드': { icon: '💎' }, '해산물': { icon: '🦐' },
  '면직물': { icon: '📦' }, '양털':   { icon: '🧶' }, '계피':   { icon: '🌰' }, '쌀':  { icon: '🍚' },
};
// 자원 해금 티어 (1=기본, 2=초급, 3=중급, 4=고급)
const RESOURCE_TIER = {
  '양털': 1, '쌀': 1,
  '와인': 2, '면직물': 2, '해산물': 2,
  '향신료': 3, '도자기': 3, '비단': 3, '계피': 3,
  '다이아몬드': 4,
};
const TIER_GOLD_REQ = { 1: 0, 2: 1000, 3: 8000, 4: 30000 };
const TIER_LABEL    = { 2: '1,000금', 3: '8,000금', 4: '30,000금' };
// 지역별 기본 자원 — 항상 해금 상태
const REGION_NATIVE_RES = {
  europe: '양털', mediterranean: '와인', arabian: '계피',
  south_asia: '면직물', east_asia: '쌀', americas: '해산물',
};

// ==================== 날씨 시스템 ====================
const WEATHER_TYPES = {
  sunny:     { icon: '☀️',  name: '맑음',      desc: '항해하기 좋은 날씨',            speedMult: 1.05,  fuelMult: 1.00, hullDmg: 0.000 },
  cloudy:    { icon: '🌤️', name: '흐림',      desc: '무난한 날씨',                   speedMult: 1.00,  fuelMult: 1.00, hullDmg: 0.000 },
  rainy:     { icon: '🌧️', name: '비',        desc: '속도↓ 연료소모↑',              speedMult: 0.90,  fuelMult: 1.10, hullDmg: 0.001 },
  windy:     { icon: '💨',  name: '강풍',      desc: '속도↑ 내구도 소모',             speedMult: 1.12,  fuelMult: 0.90, hullDmg: 0.002 },
  foggy:     { icon: '🌫️', name: '안개',      desc: '시야 불량, 속도↓↓',            speedMult: 0.78,  fuelMult: 1.00, hullDmg: 0.000 },
  fairwind:  { icon: '🌈',  name: '순풍',      desc: '최적 항해 조건, 연료 절감',     speedMult: 1.22,  fuelMult: 0.82, hullDmg: 0.000 },
  roughsea:  { icon: '🌊',  name: '거친 바다', desc: '파도 심함, 속도↓ 내구도↓↓',   speedMult: 0.73,  fuelMult: 1.22, hullDmg: 0.004 },
  blizzard:  { icon: '❄️',  name: '눈보라',    desc: '극한 악천후, 모든 능력↓↓',     speedMult: 0.58,  fuelMult: 1.32, hullDmg: 0.005 },
  tradewind: { icon: '🌴',  name: '무역풍',    desc: '열대 순풍, 연료↓↓ 속도↑',      speedMult: 1.18,  fuelMult: 0.78, hullDmg: 0.000 },
  heatwave:  { icon: '🌵',  name: '열파',      desc: '고온 건조, 연료 과소모',        speedMult: 0.85,  fuelMult: 1.28, hullDmg: 0.002 },
};
// 위도(Y좌표)별 날씨 풀 — Y가 낮을수록 북쪽(한랭), 높을수록 적도(열대)
const WEATHER_POOL = (y) => {
  if (y < 15) return ['blizzard','blizzard','foggy','cloudy','rainy','windy'];
  if (y < 30) return ['cloudy','rainy','windy','sunny','foggy','cloudy'];
  if (y < 50) return ['sunny','windy','fairwind','cloudy','rainy','sunny'];
  if (y < 65) return ['sunny','tradewind','roughsea','rainy','heatwave','fairwind'];
  return ['tradewind','tradewind','rainy','roughsea','sunny','heatwave'];
};
const WEATHER_CHANGE_INTERVAL = 15 * 60 * 1000; // 15분 단위로만 날씨가 바뀐다.
// 배 위치 + 느린 주기 시드로 날씨 결정. 항해 중에는 항로 중간 위도를 사용해 이동 중 잦은 흔들림을 줄인다.
const getShipWeather = (ship) => {
  const timeSeed = Math.floor(Date.now() / WEATHER_CHANGE_INTERVAL);
  const routeY = ship.isMoving && ship.destinationY != null
    ? (((ship.startY ?? ship.y) + ship.destinationY) / 2)
    : ship.isMoving && ship.targetY != null
    ? (((ship.startY ?? ship.y) + ship.targetY) / 2)
    : ship.y;
  const weatherBand = Math.floor(routeY / 15);
  const pool = WEATHER_POOL(routeY);
  const hash = Math.abs(Math.round(Math.sin(ship.id * 1.7 + weatherBand * 2.91 + timeSeed * 2.13) * 10000)) % pool.length;
  return pool[hash];
};

const EVENT_SPAWN_INTERVAL = 45 * 1000;
const EVENT_SPAWN_CHANCE = 0.1;
const EVENT_SHIP_COOLDOWN = 180 * 1000;
const MAX_ACTIVE_MAP_EVENTS = 2;
const SAILING_PACE_MULT = 0.55;
const BOOSTER_SPEED_MULT = 1.2;
const BOOSTER_FUEL_COST_MULT = 1.5;
const PRICE_INTERVAL_BASE = 3600;
const PRICE_INTERVAL_MIN = 1200;
const DEFAULT_MAP_VIEW = { x: -260, y: -70, zoom: 1.35 };
const PORT_SHIPS = {
  london:['sloop','brigantine','merchant','galleon'], bristol:['rowboat','sloop'],
  lisbon:['sloop','caravel','merchant','galleon'], hamburg:['rowboat','sloop','brigantine'],
  antwerp:['sloop','brigantine','fluyt'], marseille:['rowboat','sloop','galley'],
  genoa:['sloop','galley','merchant'], venice:['galley','merchant','fluyt'],
  tripoli:['galley','dhow'], istanbul:['galley','merchant','brigantine'],
  alexandria:['galley','dhow','merchant'], aden:['dhow','merchant'],
  dubai:['dhow','merchant','galleon'], mumbai:['dhow','merchant','galleon'],
  goa:['dhow','merchant'], calicut:['dhow','junk'], colombo:['dhow','merchant'],
  malacca:['dhow','junk','merchant'], singapore:['junk','merchant','galleon'],
  bangkok:['junk','merchant'], guangzhou:['junk','galleon','merchant'],
  shanghai:['junk','galleon','frigate'], yokohama:['junk','galleon','frigate'],
};

const REGION_STYLE = {
  europe:       { icon: '🏰', color: '#60a5fa', border: 'border-blue-400',   label: '유럽'    },
  mediterranean:{ icon: '⛪', color: '#a78bfa', border: 'border-purple-400', label: '지중해'  },
  arabian:      { icon: '🕌', color: '#fb923c', border: 'border-orange-400', label: '아라비아' },
  south_asia:   { icon: '🛕', color: '#34d399', border: 'border-green-400',  label: '남아시아' },
  east_asia:    { icon: '🏯', color: '#f87171', border: 'border-red-400',    label: '동아시아' },
  americas:     { icon: '🗽', color: '#38bdf8', border: 'border-sky-400',    label: '아메리카' },
};

const RESOURCE_REGIONS = {
  '양털':      { cheap: ['europe'],                    expensive: ['east_asia', 'arabian']           },
  '와인':      { cheap: ['europe', 'mediterranean'],   expensive: ['east_asia', 'south_asia']        },
  '다이아몬드':{ cheap: ['mediterranean'],             expensive: ['east_asia', 'south_asia']        },
  '향신료':    { cheap: ['south_asia', 'east_asia'],   expensive: ['europe', 'mediterranean']        },
  '도자기':    { cheap: ['east_asia'],                 expensive: ['europe', 'mediterranean']        },
  '비단':      { cheap: ['east_asia'],                 expensive: ['europe', 'arabian']              },
  '해산물':    { cheap: ['mediterranean', 'europe'],   expensive: ['east_asia', 'arabian']           },
  '면직물':    { cheap: ['south_asia', 'americas'],    expensive: ['europe', 'east_asia']            },
  '계피':      { cheap: ['south_asia'],                expensive: ['europe', 'arabian', 'mediterranean'] },
  '쌀':        { cheap: ['east_asia', 'south_asia'],   expensive: ['europe', 'arabian', 'americas']  },
};

const TRADE_FEE_PCT = 10; // 판매 수수료 10% (구매 수수료 없음)
const calcPrice     = (base) => Math.max(1, base); // 매입=판매=기준가
const calcBuyPrice  = (base, tradePct) => calcPrice(base);
const calcSellPrice = (base, tradePct) => calcPrice(base);
const getFeeRate    = () => TRADE_FEE_PCT;

// 세금: 하루에 한 번 징수, 구간 돌파 시 급격한 상승
// 레벨 상승 조건: 배 추가 구매(+1) / 누적 거래금액 마일스톤 돌파(+1)
const TAX_INTERVAL = 24 * 60 * 60; // 86400초 = 1일
const EARN_MILESTONES = [10000, 50000, 200000, 800000, 3000000]; // 누적 판매금 마일스톤
const TAX_TABLE = [200, 600, 1000, 3000, 7000, 20000, 50000, 120000, 300000, 750000];
const calcTax = (_shipCount, taxLevel) => {
  return TAX_TABLE[Math.min(taxLevel - 1, TAX_TABLE.length - 1)];
};

const PORT_INFO = [
  { id: 'rumor',    tier: 'basic',   baseCost: 300,  name: '거리 소문',        desc: '귀동냥 시세 동향.',            accuracy: 0.30, magMin: 15,  magMax: 45,  repeat: true  },
  { id: 'hint',     tier: 'basic',   baseCost: 700,  name: '상인 귀띔',        desc: '상인에게 들은 시세 동향.',      accuracy: 0.40, magMin: 25,  magMax: 65,  repeat: true  },
  { id: 'analysis', tier: 'premium', baseCost: 3000, name: '상업 분석 보고서', desc: '전문 분석가 예측. (1회)',       accuracy: 0.58, magMin: 60,  magMax: 130, repeat: false },
  { id: 'route',    tier: 'premium', baseCost: 8000, name: '내부 정보',        desc: '항구 관리인 내부 정보. (1회)', accuracy: 0.72, magMin: 100, magMax: 200, repeat: false },
];
const infoCurrentCost = (info, bc, taxLevel = 1) =>
  Math.floor(info.baseCost * Math.pow(1.12, Math.max(0, taxLevel - 1)) * Math.pow(1.5, bc[info.id] || 0));

const SPECIAL_CREW_POOL = [
  { name: '이순신',       specialty: 'east_asia',     navBonus: 55, tradeBonus: 25, rarity: 'legendary', label: '🌟전설의 장군'     },
  { name: '정화 제독',    specialty: 'any',           navBonus: 45, tradeBonus: 45, rarity: 'legendary', label: '🌟대항해 제독'     },
  { name: '바스코',       specialty: 'south_asia',    navBonus: 50, tradeBonus: 20, rarity: 'rare',      label: '💜인도항로 개척자' },
  { name: '마르코',       specialty: 'any',           navBonus: 20, tradeBonus: 55, rarity: 'rare',      label: '💜실크로드 상인'   },
  { name: '지중해 뱃사람',specialty: 'mediterranean', navBonus: 40, tradeBonus: 15, rarity: 'uncommon',  label: '💙지중해 전문가'   },
  { name: '아라비아 상인',specialty: 'arabian',       navBonus: 15, tradeBonus: 45, rarity: 'uncommon',  label: '💙아라비아 상인'   },
  { name: '동아시아 항법',specialty: 'east_asia',     navBonus: 45, tradeBonus: 10, rarity: 'uncommon',  label: '💙동아시아 항법사' },
  { name: '인도 중개인',  specialty: 'south_asia',    navBonus: 10, tradeBonus: 45, rarity: 'uncommon',  label: '💙인도 중개인'     },
  { name: '유럽 선장',    specialty: 'europe',        navBonus: 35, tradeBonus: 35, rarity: 'uncommon',  label: '💙유럽 선장'       },
];

const INTRO_SLIDES = [
  { title:'⛵ Pioneer', subtitle:'항해와 정보의 시대', img:'🌍',
    body:'때는 대항해시대.\n유럽의 작은 무역항, 리스본.\n\n당신은 작은 통통배 한 척과\n양털 8개를 물려받은 초보 상인입니다.\n\n동쪽 멀리 실크로드 끝엔 황금이 넘치고\n향신료의 향기가 바람에 실려 옵니다.\n\n자, 어디로 떠나볼까요?' },
];

// ── 모듈 레벨 헬퍼 ──
const portOf = (s) => {
  const e = Object.entries(PORTS).find(([key, p]) => {
    const h = portHarbor(key);
    return Math.hypot(s.x - p.x, s.y - p.y) < 3.5 || Math.hypot(s.x - h.x, s.y - h.y) < 3.5;
  });
  return e ? e[0] : null;
};
const routeRegionOf = (s) => {
  if (s.targetX !== null && s.targetY !== null) {
    if (s.destinationX != null && s.destinationY != null) {
      const best = Object.entries(PORTS).reduce((b, [, p]) => {
        const d = Math.hypot(s.destinationX - p.x, s.destinationY - p.y);
        return d < b.d ? { d, region: p.region } : b;
      }, { d: Infinity, region: null });
      if (best.region) return best.region;
    }
    const best = Object.entries(PORTS).reduce((b, [, p]) => {
      const d = Math.hypot(s.targetX - p.x, s.targetY - p.y);
      return d < b.d ? { d, region: p.region } : b;
    }, { d: Infinity, region: null });
    if (best.region) return best.region;
  }
  const pk = portOf(s);
  return pk ? PORTS[pk]?.region : null;
};
const calcStats = (s, crew) => {
  const t = SHIP_TYPES[s.type];
  const crewOnShip = crew.filter(c => c.shipId === s.id);
  const region = routeRegionOf(s);
  // 날씨 — 배 위치 기반, 선원 선호 날씨 매칭 시 +40% 보너스
  const weatherId  = getShipWeather(s);
  const weather    = WEATHER_TYPES[weatherId];
  const wm = (c) => (c.favoriteWeather && c.favoriteWeather === weatherId) ? 1.4 : 1.0;
  let navSum = 0, trSum = 0;
  crewOnShip.forEach(c => {
    const w = wm(c);
    let nav = c.navigation, tr = c.trading;
    if (c.specialty && (c.specialty === 'any' || c.specialty === region)) {
      nav = Math.min(100, c.navigation + (c.navBonus  || 0));
      tr  = Math.min(100, c.trading   + (c.tradeBonus || 0));
    }
    navSum += Math.min(100, nav * w); trSum += Math.min(100, tr * w);
  });
  const n  = crewOnShip.length ? navSum / crewOnShip.length : 50;
  const tr = crewOnShip.length ? trSum  / crewOnShip.length : 50;
  const fuel = s.fuel ?? 100, hull = s.hull ?? 100;
  const fuelMult = fuel < 30 ? 0.5 : fuel < 60 ? 0.75 : 1.0;
  const hullMult = hull < 30 ? 0.6 : hull < 60 ? 0.8 : 1.0;
  const totalRepair  = crewOnShip.reduce((a, c) => a + (c.repair || 0) * wm(c), 0);
  const avgMorale    = crewOnShip.length ? crewOnShip.reduce((a, c) => a + Math.min(100, (c.morale    || 50) * wm(c)), 0) / crewOnShip.length : 50;
  const avgCombat    = crewOnShip.length ? crewOnShip.reduce((a, c) => a + Math.min(100, (c.combat    || 30) * wm(c)), 0) / crewOnShip.length : 30;
  const avgFuelEff   = crewOnShip.length ? crewOnShip.reduce((a, c) => a + Math.min(100, (c.fuelEff   || 30) * wm(c)), 0) / crewOnShip.length : 30;
  const avgHullEff   = crewOnShip.length ? crewOnShip.reduce((a, c) => a + Math.min(100, (c.hullEff   || 30) * wm(c)), 0) / crewOnShip.length : 30;
  const avgLogistics = crewOnShip.length ? crewOnShip.reduce((a, c) => a + Math.min(100, (c.logistics || 30) * wm(c)), 0) / crewOnShip.length : 30;
  const fuelEffMult  = 1 - avgFuelEff * 0.002;
  const hullEffBonus = avgHullEff * 0.003;
  const hullDmgMult  = 1 - avgHullEff * 0.002;
  const extraCargo   = Math.floor(avgLogistics * 0.2);
  return {
    speed:        Math.max(0.0005, t.baseSpeed * SAILING_PACE_MULT * (1 + (n-50)/200 + s.upgrades.speed*0.15) * fuelMult),
    capacity:     t.baseCapacity + s.upgrades.cargo * 25 + extraCargo,
    maxCrew:      Math.min(14, t.maxCrew + s.upgrades.crew),
    tradePct:     Math.round((tr - 50) / 2 * hullMult),
    crewCnt:      crewOnShip.length,
    fuelMult, hullMult, totalRepair,
    avgMorale:    Math.round(avgMorale),
    avgCombat:    Math.round(avgCombat),
    fuelEffMult, hullEffBonus, hullDmgMult,
    avgFuelEff:   Math.round(avgFuelEff),
    avgHullEff:   Math.round(avgHullEff),
    avgLogistics: Math.round(avgLogistics),
    extraCargo,
    weatherId, weather,
  };
};

let _predId = 1;
const makePrediction = (infoId, tier, portKey, portName, accuracy, magMin, magMax, turnsUntil = 1) => {
  const resources = Object.keys(RESOURCES);
  const portKeys  = Object.keys(PORTS);
  const resource  = resources[Math.floor(Math.random() * resources.length)];
  const targetPort= portKeys[Math.floor(Math.random() * portKeys.length)];
  const direction = Math.random() < 0.5 ? 'up' : 'down';
  const mag = Math.floor(magMin + Math.random() * (magMax - magMin));
  return { id: _predId++, infoId, tier, resource, targetPort,
    targetPortName: PORTS[targetPort].name, direction, accuracy, mag,
    turnsUntil, turnsRemaining: turnsUntil,
    applied: false, hit: null, boughtAt: portName };
};

const CREW_NAMES = ['김해룡','이바람','박정현','최강석','정승호','장민우','오선장','신무적','한파도','윤청해','임항해','서무역','조상인','강탐험','백용사','류대항','문원양','권북해','노선비','채항도'];
// 지역별 승무원 스탯 보정
const REGION_CREW_BIAS = {
  europe:        { navigation: 5,  trading: 10, stamina: 5,  repair: 0,  morale: 5,  combat: 0,  fuelEff: 0,  hullEff: 5,  logistics: 10 },
  mediterranean: { navigation: 0,  trading: 5,  stamina: 5,  repair: 5,  morale: 15, combat: 5,  fuelEff: 5,  hullEff: 10, logistics: 0  },
  arabian:       { navigation: -5, trading: 15, stamina: 10, repair: 0,  morale: 5,  combat: 10, fuelEff: 15, hullEff: 0,  logistics: 5  },
  south_asia:    { navigation: 5,  trading: 5,  stamina: 15, repair: 15, morale: 5,  combat: 0,  fuelEff: 5,  hullEff: 10, logistics: 5  },
  east_asia:     { navigation: 15, trading: 5,  stamina: 5,  repair: 5,  morale: 0,  combat: 10, fuelEff: 10, hullEff: 0,  logistics: 10 },
  americas:      { navigation: 10, trading: 10, stamina: 10, repair: 5,  morale: 10, combat: 5,  fuelEff: 5,  hullEff: 5,  logistics: 5  },
};
const MAJOR_PORTS = new Set(['london','lisbon','venice','istanbul','alexandria','dubai','mumbai','guangzhou','shanghai','singapore']);
let _crewSeed = 100;
const makeCrew = (region = null) => {
  const id = _crewSeed++;
  const roll = Math.random();
  let special = null;
  if (roll < 0.03)       special = SPECIAL_CREW_POOL.filter(c => c.rarity === 'legendary')[Math.floor(Math.random() * 2)];
  else if (roll < 0.12)  special = SPECIAL_CREW_POOL.filter(c => c.rarity === 'rare')[Math.floor(Math.random() * 2)];
  else if (roll < 0.35)  special = SPECIAL_CREW_POOL.filter(c => c.rarity === 'uncommon')[Math.floor(Math.random() * 5)];
  const bias = REGION_CREW_BIAS[region] || { navigation: 0, trading: 0, stamina: 0, repair: 0, morale: 0, combat: 0 };
  const clamp = (v) => Math.min(100, Math.max(0, v));
  return {
    id, name: special ? special.name : CREW_NAMES[id % CREW_NAMES.length],
    navigation: clamp(Math.floor(30 + Math.random() * 70) + bias.navigation),
    trading:    clamp(Math.floor(30 + Math.random() * 70) + bias.trading),
    stamina:    clamp(Math.floor(20 + Math.random() * 60) + bias.stamina),
    repair:     clamp(Math.floor(10 + Math.random() * 60) + bias.repair),
    morale:     clamp(Math.floor(20 + Math.random() * 60) + bias.morale),
    combat:     clamp(Math.floor(10 + Math.random() * 60) + bias.combat),
    fuelEff:    clamp(Math.floor(10 + Math.random() * 60) + (bias.fuelEff  || 0)),
    hullEff:    clamp(Math.floor(10 + Math.random() * 60) + (bias.hullEff  || 0)),
    logistics:  clamp(Math.floor(10 + Math.random() * 60) + (bias.logistics|| 0)),
    hireCost:        special ? Math.floor(1500 + Math.random() * 5000) : Math.floor(500 + Math.random() * 1500),
    favoriteWeather: Object.keys(WEATHER_TYPES)[Math.floor(Math.random() * Object.keys(WEATHER_TYPES).length)],
    shipId: null,
    specialty: special?.specialty || null, navBonus: special?.navBonus || 0,
    tradeBonus: special?.tradeBonus || 0, rarity: special?.rarity || 'common', label: special?.label || null,
  };
};

let _questId = 1, _evtId = 1;
const generateQuests = () => {
  const portKeys = Object.keys(PORTS), resKeys = Object.keys(RESOURCES);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const res = pick(resKeys);
  const tPort = pick(portKeys);
  const amt = 5 + Math.floor(Math.random() * 25);
  const visitAmt = 2 + Math.floor(Math.random() * 4);
  const tradeAmt = 1000 + Math.floor(Math.random() * 5000);
  return [
    { id: _questId++, type: 'deliver', title: `${RESOURCES[res].icon} ${res} 운송`,
      desc: `${res} ${amt}개를 구매한 뒤 📍 ${PORTS[tPort].name}에서 판매하세요.`, resource: res, targetPort: tPort,
      targetPortName: PORTS[tPort].name, target: amt, progress: 0,
      rewardGold: amt * 70 + 300 + Math.floor(Math.random() * 800), rewardGems: 0, completed: false },
    { id: _questId++, type: 'visit', title: '📍 항구 탐험',
      desc: `미개척 항구 ${visitAmt}곳을 새로 방문하세요. (지도에서 🔒 자물쇠 항구로 이동)`, target: visitAmt, progress: 0, visitedPorts: [],
      rewardGold: visitAmt * 400 + Math.floor(Math.random() * 500), rewardGems: 1, completed: false },
    { id: _questId++, type: 'trade', title: '💰 무역 목표',
      desc: `어느 항구에서든 총 ${tradeAmt.toLocaleString()}금 어치 화물을 판매하세요.`, target: tradeAmt, progress: 0,
      rewardGold: Math.floor(tradeAmt * 0.25) + 300, rewardGems: 0, completed: false },
  ];
};

// ── 일일 목표 생성 ──
const DAILY_RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24시간
const generateDailyGoals = (taxLevel = 1) => {
  const portKeys = Object.keys(PORTS), resKeys = Object.keys(RESOURCES);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const scale = Math.max(1, 1 + (taxLevel - 1) * 0.4);
  const res = pick(resKeys);
  const tPort = pick(portKeys);
  const deliverAmt = Math.floor((8 + Math.floor(Math.random() * 15)) * scale);
  const visitAmt  = Math.min(8, 2 + Math.floor(taxLevel / 3));
  const goldAmt   = Math.floor((2000 + Math.floor(Math.random() * 3000)) * scale);
  const tradesCnt = Math.min(10, 3 + Math.floor(taxLevel / 4));
  return [
    { id: 'dg_deliver', type: 'dg_deliver', title: `${RESOURCES[res].icon} ${res} 일일 운송`,
      desc: `📍 ${PORTS[tPort].name}에서 ${res} ${deliverAmt}개를 오늘 안에 판매하세요.`,
      resource: res, targetPort: tPort, targetPortName: PORTS[tPort].name,
      target: deliverAmt, progress: 0,
      rewardGold: Math.floor(deliverAmt * 80 * scale), rewardGems: 1, completed: false },
    { id: 'dg_visit', type: 'dg_visit', title: '🧭 일일 항구 순례',
      desc: `오늘 새 항구 ${visitAmt}곳을 발견하세요. (지도 🔒 자물쇠 항구 진입)`,
      target: visitAmt, progress: 0, visitedToday: [],
      rewardGold: Math.floor(600 * scale), rewardGems: 1, completed: false },
    { id: 'dg_gold', type: 'dg_gold', title: '💰 일일 매출 목표',
      desc: `오늘 화물 판매로 총 ${goldAmt.toLocaleString()}금 달성하세요.`,
      target: goldAmt, progress: 0,
      rewardGold: Math.floor(goldAmt * 0.3), rewardGems: 0, completed: false },
    { id: 'dg_trades', type: 'dg_trades', title: '🔄 일일 거래 횟수',
      desc: `오늘 판매 거래를 ${tradesCnt}회 완료하세요. (종류·수량 무관)`,
      target: tradesCnt, progress: 0,
      rewardGold: Math.floor(400 * scale), rewardGems: 0, completed: false },
  ];
};

// ── 배달 의뢰 시스템 ──
const NPC_NAMES = {
  europe:        ['토마스 그레이', '마르셀 뒤퐁', '한스 바우어', '윌리엄 드레이크', '피에르 모로'],
  mediterranean: ['조반니 파올로', '카를로스 메디나', '알렉소스 파파스', '마르코 비스콘티'],
  arabian:       ['아흐메드 알카심', '유수프 이브라힘', '파루크 알라시드', '오마르 하산'],
  south_asia:    ['라제시 굽타', '아누프 싱', '비말 차우다리', '크리쉬나 무르티'],
  east_asia:     ['왕광명', '다나카 켄지', '리우 웨이', '박명수', '야마모토 히로'],
  americas:      ['존 스미스', '토마스 제퍼슨', '제임스 무어', '헨리 클레이', '윌리엄 애덤스'],
};
let _deliveryId = 1;
const generatePortDeliveries = (portKey) => {
  const port = PORTS[portKey];
  const region = port.region;
  const names = NPC_NAMES[region] || NPC_NAMES.europe;
  const portKeys = Object.keys(PORTS).filter(k => k !== portKey);
  const resKeys = Object.keys(RESOURCES);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const count = MAJOR_PORTS.has(portKey) ? 3 : 2;
  return Array.from({ length: count }, () => {
    const toPort = pick(portKeys);
    const res = pick(resKeys);
    const qty = 5 + Math.floor(Math.random() * 20);
    const dist = Math.hypot(port.x - PORTS[toPort].x, port.y - PORTS[toPort].y);
    const reward = Math.floor(qty * 60 * (1 + dist / 30) + Math.random() * 500);
    return { id: _deliveryId++, npc: pick(names), resource: res, qty,
      fromPort: portKey, fromPortName: port.name, toPort, toPortName: PORTS[toPort].name,
      reward, progress: 0, completed: false };
  });
};

// ==================== 튜토리얼 단계 ====================
const TUTORIAL_STEPS = {
  select:  { step: 1, total: 6, icon: '👆', title: '첫 배 고르기', goal: '배를 선택해 항해 준비를 시작하세요.', text: '지도의 배나 오른쪽 함대 카드가 출발점입니다. 선택하면 목적지 후보가 보입니다.' },
  depart:  { step: 2, total: 6, icon: '🧭', title: '시세 보고 목적지 고르기', goal: '가까운 항구의 시세를 확인하세요.', text: '런던이나 앤트워프를 눌러 양털 가격을 비교한 뒤, 좋은 항구라면 시세창의 [목적지 확정]을 누르세요.' },
  confirm: { step: 3, total: 6, icon: '📈', title: '항구 정보 읽기', goal: '시세창에서 목적지 확정 버튼을 누르세요.', text: '가격 추이, 보유 화물의 예상 판매가, 해금 조건을 확인하세요. 출항은 항구 클릭이 아니라 [목적지 확정]으로 결정됩니다.' },
  sailing: { step: 4, total: 6, icon: '⛵', title: '항해 관찰하기', goal: '배가 이동하는 동안 항로와 이벤트를 지켜보세요.', text: '추적 버튼을 켜면 배를 가까이 따라갑니다. 항해 중에는 다음 항구 시세를 천천히 살펴보세요.' },
  sell:    { step: 5, total: 6, icon: '💰', title: '도착 후 판매하기', goal: '시장 창에서 보유 화물을 판매하세요.', text: '정박 항구의 시장에서 보유 화물을 팔아 첫 수익을 만드세요. 판매할 때만 수수료가 붙습니다.' },
  buy:     { step: 6, total: 6, icon: '📦', title: '다음 항해 준비하기', goal: '싼 상품을 조금 매입하고 다시 출항하세요.', text: '화물칸을 비워두지 말고 가격이 낮은 상품을 조금 싣고 다음 항구를 골라보세요. 다시 배를 선택해 출항하면 튜토리얼이 끝납니다.' },
  done:    { step: 6, total: 6, icon: '🧭', title: '자유 항해', goal: '시세와 항로를 보고 스스로 무역 루프를 이어가세요.', text: '이제 배 선택, 시세 확인, 출항, 판매, 매입 흐름을 반복하면 됩니다.' },
};

const CurrencyPill = ({ type = 'gold', value, label, compact = false, className = '' }) => {
  const isGem = type === 'gem';
  const formatted = typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <span className={`currency-pill ${isGem ? 'currency-pill-gem' : ''} ${compact ? 'min-h-0 px-2 py-1 text-xs' : ''} ${className}`}>
      <UiIcon name={isGem ? 'gem-blue' : 'gold-coin'} className="currency-mark" alt={isGem ? '보석' : '금'} />
      <span>
        <span className={`currency-value ${isGem ? 'text-sky-200' : 'text-gold'}`}>{formatted}</span>
        {label && <span className="ml-1 text-[10px] font-bold text-gray-400">{label}</span>}
      </span>
    </span>
  );
};

// ==================== 컴포넌트 ====================
const OceanTycoon = () => {
  const gsRef = useRef(null);
  const [gs, setGsRaw] = useState(() => {
    const firstCrew = { ...makeCrew(), shipId: 1, specialty: null, navBonus: 0, tradeBonus: 0, rarity: 'common', label: null, repair: 10 };
    const v = {
      gold: 0, gems: 3,
      ships: [{ id: 1, type: 'rowboat', name: '황금 수호자호',
        x: portHarbor('lisbon').x, y: portHarbor('lisbon').y, targetX: null, targetY: null, destinationX: null, destinationY: null, route: null, routeIndex: 0, startX: null, startY: null,
        isMoving: false, booster: false, stormUntil: null,
        cargo: { '양털': 8 }, fuel: 100, hull: 100,
        upgrades: { speed: 0, cargo: 0, crew: 0 }, morale: 100 }],
      crew: [firstCrew],
      availableCrew: Array.from({ length: 6 }, () => makeCrew('europe')),
      purchasedInfo: {}, predictions: [],
      infoBuyCounts: { rumor: 0, hint: 0, analysis: 0, route: 0 },
      taxLevel: 1,
      totalEarned: 0,
      availableQuests: generateQuests(), activeQuests: [],
      visitedPorts: getInitialVisitedPorts(),
      portDeliveries: { lisbon: generatePortDeliveries('lisbon') },
      activeDeliveries: [],
      taxExemptNext: false,
      taxExemptCount: 0,
    };
    gsRef.current = v;
    return v;
  });
  const setGs = useCallback((updater) => {
    setGsRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      gsRef.current = next;
      return next;
    });
  }, []);

  const [introSlide,    setIntroSlide]    = useState(0);
  // 'depart' → 'sailing' → 'sell' → 'buy' → 'done'
  const [tutorialPhase, setTutorialPhase] = useState('select');
  const [selShip,       setSelShipRaw]    = useState(1);
  const [tab,           setTab]           = useState('info');
  const [showBuy,       setShowBuy]       = useState(false);
  const [log,           setLog]           = useState(['⚓ 리스본 항구. 양털 20개가 적재되어 있습니다.']);
  const [prices,        setPrices]        = useState({});
  const [pricesReady,   setPricesReady]   = useState(false);
  const [priceHistory,  setPriceHistory]  = useState({});
  const [showPortPrice, setShowPortPrice] = useState(null);
  const [selectedPortRes, setSelectedPortRes] = useState(null);
  const [paused,        setPaused]        = useState(false);
  const [lastPrice,     setLastPrice]     = useState(Date.now());
  const [nextUpd,       setNextUpd]       = useState(3600);
  const [lastTax,       setLastTax]       = useState(Date.now());
  const [nextTax,       setNextTax]       = useState(TAX_INTERVAL);
  const [showMarket,    setShowMarket]    = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [tradeQty,      setTradeQty]      = useState(1);
  const [showInfo,      setShowInfo]      = useState(false);
  const [showAllCrew,   setShowAllCrew]   = useState(false);
  const [showQuests,    setShowQuests]    = useState(false);
  const [dailyGoals,    setDailyGoals]    = useState([]);
  const [dailyResetAt,  setDailyResetAt]  = useState(0);
  const [dailyCountdown,setDailyCountdown]= useState('');
  const [showDailyGoals,setShowDailyGoals]= useState(false);
  const [taxCrisisInfo, setTaxCrisisInfo] = useState(null); // { tax, exemptCost } | null
  const [missionSubTab, setMissionSubTab] = useState('daily');
  const [mapEvents,     setMapEvents]     = useState([]);
  const [saveExists,    setSaveExists]    = useState(() => !!localStorage.getItem('pioneer_save'));
  const [saveDecided,   setSaveDecided]   = useState(false);
  const [lastSaved,     setLastSaved]     = useState(null);
  const [tradeDone,     setTradeDone]     = useState(null); // { type: 'buy'|'sell', ts: number } — 0.8s 완료 피드백
  const [bigTradePopup, setBigTradePopup] = useState(null); // { amount: number, id: number } — 큰 거래 보상 연출

  const routeModeRef = useRef(false);
  const [routeMode, setRouteModeRaw] = useState(false);
  const selShipRef = useRef(1);
  const setRouteMode = useCallback((v) => { routeModeRef.current = v; setRouteModeRaw(v); }, []);
  const setSelShip   = useCallback((id) => { selShipRef.current = id; setSelShipRaw(id); }, []);

  const mapViewRef = useRef(DEFAULT_MAP_VIEW);
  const [mapView, setMapViewRaw] = useState(DEFAULT_MAP_VIEW);
  const setMapView = useCallback((v) => {
    const next = typeof v === 'function' ? v(mapViewRef.current) : v;
    mapViewRef.current = next;
    setMapViewRaw(next);
  }, []);

  const [grabbing, setGrabbing] = useState(false);
  const [followShip, setFollowShip] = useState(false);
  const mapRef   = useRef(null);
  const dragRef  = useRef({ active: false, sx: 0, sy: 0, px: 0, py: 0, moved: false });
  const ptrsRef    = useRef({});
  const pinchRef   = useRef({ dist: 0 });
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const zoomDragRef= useRef({ active: false, startY: 0, startZoom: 1, cx: 0, cy: 0 });
  const shipEventCooldownRef = useRef({});

  const clampXY = useCallback((x, y, zoom) => {
    const el = mapRef.current; if (!el) return { x, y };
    return clampMapView({ x, y, zoom, width: el.clientWidth, height: el.clientHeight });
  }, []);

  const zoomAt = useCallback((factor, centerX = null, centerY = null) => {
    const el = mapRef.current; if (!el) return;
    const cx = centerX ?? el.clientWidth / 2;
    const cy = centerY ?? el.clientHeight / 2;
    setMapView(prev => zoomMapViewAt({
      view: prev,
      factor,
      centerX: cx,
      centerY: cy,
      width: el.clientWidth,
      height: el.clientHeight,
    }));
  }, [setMapView]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = mapRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.88 : 1.14;
    zoomAt(factor, cx, cy);
  }, [zoomAt]);

  useEffect(() => {
    const el = mapRef.current; if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel, introSlide]); // introSlide 변경 시 재등록 (인트로 종료 후 지도가 DOM에 마운트됨)

  // 배 추적: followShip ON일 때 선택된 배에 5배 줌으로 카메라 따라가기
  useEffect(() => {
    if (!followShip) return;
    const ship = gs.ships.find(s => s.id === selShip);
    if (!ship?.isMoving || !mapRef.current) return;
    const el = mapRef.current;
    const W = el.clientWidth, H = el.clientHeight;
    const zoom = 5;
    const { x, y } = clampXY(W / 2 - (ship.x / 100) * W * zoom, H / 2 - (ship.y / 100) * H * zoom, zoom);
    setMapView({ zoom, x, y });
  }, [gs.ships, followShip, selShip, clampXY, setMapView]);

  // 배가 정박하면 추적 모드 자동 해제
  useEffect(() => {
    if (!followShip) return;
    const ship = gs.ships.find(s => s.id === selShip);
    if (!ship?.isMoving) setFollowShip(false);
  }, [followShip, gs.ships, selShip]);

  const onPtrDown = useCallback((e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    ptrsRef.current[e.pointerId] = { x: e.clientX, y: e.clientY };
    const n = Object.keys(ptrsRef.current).length;
    if (n === 1) {
      const now = Date.now();
      const dt  = now - lastTapRef.current.time;
      const dd  = Math.hypot(e.clientX - lastTapRef.current.x, e.clientY - lastTapRef.current.y);
      const isDoubleTap = e.pointerType !== 'mouse' && dt < 300 && dd < 50;
      lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
      if (isDoubleTap) {
        // 더블탭: 즉시 zoomDrag 모드 — 위로 드래그=줌인, 아래=줌아웃
        const rect = mapRef.current.getBoundingClientRect();
        zoomDragRef.current = {
          active: true,
          startY: e.clientY,
          startZoom: mapViewRef.current.zoom,
          cx: e.clientX - rect.left,
          cy: e.clientY - rect.top,
        };
        dragRef.current.active = false;
        lastTapRef.current.time = 0; // 다음 탭이 다시 더블탭 트리거하지 않도록 리셋
      } else {
        zoomDragRef.current.active = false;
        dragRef.current = { active: true, sx: e.clientX, sy: e.clientY, px: mapViewRef.current.x, py: mapViewRef.current.y, moved: false };
      }
      setGrabbing(true);
      setFollowShip(false);
    } else if (n === 2) {
      zoomDragRef.current.active = false;
      dragRef.current.active = false;
      const ids = Object.keys(ptrsRef.current);
      pinchRef.current.dist = Math.hypot(ptrsRef.current[ids[1]].x - ptrsRef.current[ids[0]].x, ptrsRef.current[ids[1]].y - ptrsRef.current[ids[0]].y);
    }
  }, [setFollowShip]);

  const onPtrMove = useCallback((e) => {
    if (!ptrsRef.current[e.pointerId]) return;
    ptrsRef.current[e.pointerId] = { x: e.clientX, y: e.clientY };
    const n = Object.keys(ptrsRef.current).length;
    if (n === 1 && zoomDragRef.current.active) {
      // 더블탭 드래그 줌: 위=줌인, 아래=줌아웃
      const dy = zoomDragRef.current.startY - e.clientY;
      const factor = Math.pow(1.012, dy);
      const { cx, cy } = zoomDragRef.current;
      setMapView(prev => {
        const el = mapRef.current;
        if (!el) return prev;
        return zoomMapViewAt({
          view: { ...prev, zoom: zoomDragRef.current.startZoom },
          factor,
          centerX: cx,
          centerY: cy,
          width: el.clientWidth,
          height: el.clientHeight,
        });
      });
      dragRef.current.moved = true;
    } else if (n === 1 && dragRef.current.active) {
      const dx = e.clientX - dragRef.current.sx, dy = e.clientY - dragRef.current.sy;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragRef.current.moved = true;
      setMapView(prev => { const { x, y } = clampXY(dragRef.current.px + dx, dragRef.current.py + dy, prev.zoom); return { ...prev, x, y }; });
    } else if (n === 2) {
      const ids = Object.keys(ptrsRef.current);
      const nd = Math.hypot(ptrsRef.current[ids[1]].x - ptrsRef.current[ids[0]].x, ptrsRef.current[ids[1]].y - ptrsRef.current[ids[0]].y);
      const ratio = nd / (pinchRef.current.dist || nd);
      pinchRef.current.dist = nd;
      const rect = mapRef.current.getBoundingClientRect();
      const cx = (ptrsRef.current[ids[0]].x + ptrsRef.current[ids[1]].x) / 2 - rect.left;
      const cy = (ptrsRef.current[ids[0]].y + ptrsRef.current[ids[1]].y) / 2 - rect.top;
      setMapView(prev => zoomMapViewAt({
        view: prev,
        factor: ratio,
        centerX: cx,
        centerY: cy,
        width: rect.width,
        height: rect.height,
      }));
    }
  }, [clampXY, setMapView]);

  const addLog = useCallback((m) => setLog(p => [m, ...p.slice(0, 29)]), []);

  const chooseDestinationPort = useCallback((pk) => {
    const sid = selShipRef.current;
    const p = PORTS[pk];
    if (!p) return;
    setShowPortPrice(null);
    setSelectedPortRes(null);
    setGs(prev => {
      const s = prev.ships.find(x => x.id === sid); if (!s) return prev;
      if (prev.crew.filter(c => c.shipId === sid).length < 1) { addLog('🚫 출항하려면 승무원이 최소 1명 필요!'); return prev; }
      const access = getPortAccessState(pk, prev.totalEarned);
      if (!access.unlocked) { addLog(`🔒 ${p.name} 항로는 잠겨 있습니다. 해금 조건: ${access.label}`); return prev; }
      if (portOf(s) === pk) return prev;
      addLog(`${s.name}이(가) ${p.name}으로 ${s.isMoving ? '항로 변경' : '항해 중'}...`);
      const sourcePortKey = portOf(s);
      const sourcePort = sourcePortKey ? portWithHarbor(sourcePortKey) : findPortForShip(s, PORTS);
      const destinationWithHarbor = portWithHarbor(pk);
      return { ...prev, ships: prev.ships.map(s2 => s2.id === sid
        ? createDepartureState(s2, destinationWithHarbor, sourcePort) : s2) };
    });
    setRouteMode(false);
    if (tutorialPhase === 'depart' || tutorialPhase === 'confirm') setTutorialPhase('sailing');
  }, [addLog, setGs, setRouteMode, tutorialPhase, setTutorialPhase]);

  const onPtrUp = useCallback((e) => {
    const wasMoved = dragRef.current.moved || zoomDragRef.current.active;
    delete ptrsRef.current[e.pointerId];
    if (Object.keys(ptrsRef.current).length === 0) {
      dragRef.current.active = false; dragRef.current.moved = false;
      zoomDragRef.current.active = false;
      setGrabbing(false);
      if (!wasMoved) {
        const rect = mapRef.current.getBoundingClientRect();
        const { x: vx, y: vy, zoom } = mapViewRef.current;
        const mx = (e.clientX - rect.left - vx) / (rect.width  * zoom) * 100;
        const my = (e.clientY - rect.top  - vy) / (rect.height * zoom) * 100;
        const curGs = gsRef.current;
        const portEntry = Object.entries(PORTS).find(([, p]) => Math.hypot(p.x - mx, p.y - my) < 5);

        // 배 클릭 감지: 정박 배는 화면에 그려진 오프셋 위치 기준으로 판정
        const dockGroups = {};
        curGs.ships.forEach(s => {
          if (s.isMoving) return;
          const pk = portOf(s);
          if (!pk) return;
          if (!dockGroups[pk]) dockGroups[pk] = [];
          dockGroups[pk].push(s.id);
        });
        const dockOffsetWorld = (shipId) => {
          const { ox, oy } = getDockedShipScreenOffset({ shipId, dockGroups });
          return {
            x: ox / (rect.width * zoom) * 100,
            y: oy / (rect.height * zoom) * 100,
          };
        };
        const dockedHits  = curGs.ships.filter(s => {
          if (s.isMoving) return false;
          const o = dockOffsetWorld(s.id);
          const pk = portOf(s);
          const anchor = pk ? portHarbor(pk) : s;
          return Math.hypot((anchor.x + o.x) - mx, (anchor.y + o.y) - my) < 2.5;
        });
        const movingHits  = curGs.ships.filter(s =>  s.isMoving && Math.hypot(s.x - mx, s.y - my) < 2.5 && !portEntry);
        const hits = [...dockedHits, ...movingHits];

        // 1순위: 항구 정보 (항로 모드 아닐 때, 배 아이콘 직접 클릭이 아닐 때)
        if (!routeModeRef.current && portEntry && dockedHits.length === 0) {
          const [pk] = portEntry;
          const selected = curGs.ships.find(s => s.id === selShipRef.current);
          if (selected && !selected.isMoving && portOf(selected) === pk) {
            setShowPortPrice(null);
            setSelectedPortRes(null);
            setShowMarket(true);
            return;
          }
          setShowMarket(false);
          setSelectedPortRes(null);
          setShowPortPrice(pk);
          return;
        }

        // 2순위: 정박 배 아이콘 직접 클릭
        if (!routeModeRef.current && dockedHits.length > 0) {
          const curIdx = dockedHits.findIndex(s => s.id === selShipRef.current);
          const hit = dockedHits.length === 1 ? dockedHits[0] : dockedHits[(curIdx + 1) % dockedHits.length];
          if (hit.id === selShipRef.current && routeModeRef.current) { setRouteMode(false); return; }
          setSelShip(hit.id); setRouteMode(true);
          if (tutorialPhase === 'select') setTutorialPhase('depart');
          return;
        }

        // 3순위: 이동 중인 배 (항구 근처가 아닐 때)
        if (!routeModeRef.current && movingHits.length > 0) {
          const curIdx = movingHits.findIndex(s => s.id === selShipRef.current);
          const hit = movingHits.length === 1 ? movingHits[0] : movingHits[(curIdx + 1) % movingHits.length];
          setSelShip(hit.id); setRouteMode(true);
          if (tutorialPhase === 'select') setTutorialPhase('depart');
          return;
        }

        // 항로 모드: 항구 클릭 → 시세 확인 / 빈 곳 클릭 → 취소
        if (routeModeRef.current) {
          if (portEntry) {
            const [pk] = portEntry;
            setShowMarket(false);
            setSelectedPortRes(null);
            setShowPortPrice(pk);
            return;
          } else {
            setRouteMode(false); // 빈 곳 클릭 → 항로 모드 취소
          }
          return;
        }

        // 항로 모드가 아닐 때 빈 곳 클릭 → 항해 중인 배면 선택 해제
        const movingSelected = curGs.ships.find(s => s.id === selShipRef.current && s.isMoving);
        if (movingSelected && !portEntry && hits.length === 0) {
          setRouteMode(false);
        }
      }
    }
  }, [setGs, setSelShip, setRouteMode, tutorialPhase, setTutorialPhase, addLog, setShowPortPrice, setShowMarket, chooseDestinationPort]);

  // ── 저장/불러오기 ──
  const saveGame = useCallback(() => {
    const data = {
      saveVersion: '1.2',
      savedAt: new Date().toISOString(),
      gs: gsRef.current,
      dailyGoals: dailyGoals,
      dailyResetAt: dailyResetAt,
      lastTaxAt: lastTax,
    };
    localStorage.setItem('pioneer_save', JSON.stringify(data));
    setLastSaved(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    addLog('💾 게임이 저장되었습니다.');
  }, [addLog, dailyGoals, dailyResetAt]);

  const handleLoad = useCallback(() => {
    try {
      const raw = localStorage.getItem('pioneer_save');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!['1.1','1.2'].includes(data.saveVersion)) { addLog('⚠️ 저장 버전 불일치. 새 게임을 시작합니다.'); setSaveDecided(true); return; }
      const loadedGs = { visitedPorts: getInitialVisitedPorts(), ...data.gs };
      loadedGs.visitedPorts = [...new Set([...getInitialVisitedPorts(), ...(loadedGs.visitedPorts || [])])];
      setGs(loadedGs);
      if (data.dailyGoals && data.dailyResetAt) {
        const now = Date.now();
        if (now < data.dailyResetAt) {
          setDailyGoals(data.dailyGoals);
          setDailyResetAt(data.dailyResetAt);
        } else {
          setDailyGoals(generateDailyGoals(data.gs?.taxLevel || 1));
          setDailyResetAt(now + DAILY_RESET_INTERVAL);
        }
      }
      if (data.lastTaxAt) setLastTax(data.lastTaxAt);
      const t = new Date(data.savedAt).toLocaleString('ko-KR');
      addLog(`📂 저장된 게임을 불러왔습니다. (${t})`);
    } catch { addLog('⚠️ 저장 파일 손상. 새 게임을 시작합니다.'); }
    setSaveDecided(true);
  }, [addLog, setGs]);

  const handleNew = useCallback(() => {
    localStorage.removeItem('pioneer_save');
    setSaveExists(false);
    setSaveDecided(true);
    addLog('🆕 새 게임을 시작합니다.');
  }, [addLog]);

  // 초기화 — 가격 + 퀘스트 생성
  useEffect(() => {
    const p = {};
    Object.entries(PORTS).forEach(([k, port]) => {
      p[k] = {};
      Object.keys(RESOURCES).forEach(r => {
        const base = 80 + Math.random() * 120;
        const rr = RESOURCE_REGIONS[r];
        let mult = 0.95 + Math.random() * 0.1;
        if (rr?.cheap.includes(port.region))     mult = 0.4 + Math.random() * 0.2;
        if (rr?.expensive.includes(port.region)) mult = 1.8 + Math.random() * 0.6;
        p[k][r] = Math.max(20, Math.floor(base * mult));
      });
    });
    setPrices(p);
    setPricesReady(true);
    const h = {};
    Object.entries(p).forEach(([k, r]) => { h[k] = {}; Object.keys(r).forEach(res => { h[k][res] = [p[k][res]]; }); });
    setPriceHistory(h);
    setGs(prev => ({ ...prev, availableQuests: generateQuests() }));
    // 일일 목표 초기화 (로드 시 덮어씌워짐)
    setDailyGoals(generateDailyGoals(1));
    const nextMidnight = new Date(); nextMidnight.setHours(24, 0, 0, 0);
    setDailyResetAt(nextMidnight.getTime());
  }, []);

  // ── 일일 목표 카운트다운 & 자동 리셋 ──
  useEffect(() => {
    if (!dailyResetAt) return;
    const id = setInterval(() => {
      const now = Date.now();
      if (now >= dailyResetAt) {
        const goals = generateDailyGoals(gsRef.current?.taxLevel || 1);
        setDailyGoals(goals);
        const next = now + DAILY_RESET_INTERVAL;
        setDailyResetAt(next);
        addLog('🌅 일일 목표가 초기화되었습니다!');
        return;
      }
      const rem = dailyResetAt - now;
      const h = Math.floor(rem / 3600000);
      const m = Math.floor((rem % 3600000) / 60000);
      const s = Math.floor((rem % 60000) / 1000);
      setDailyCountdown(`${h}시간 ${m}분 ${s}초`);
    }, 1000);
    return () => clearInterval(id);
  }, [dailyResetAt, addLog]);

  // ── 이동 루프 ──
  useEffect(() => {
    if (paused || !pricesReady) return;
    const id = setInterval(() => {
      let arrivedPorts = []; // scope outside setGs so we can read it after
      setGs(prev => {
        const ap = [];
        const ships = prev.ships.map(s => {
          const st = calcStats(s, prev.crew);
          const hullRepairBase = st.totalRepair * 0.0002 * (1 + st.hullEffBonus);
          if (!s.isMoving || s.targetX === null) {
            return hullRepairBase > 0 ? { ...s, hull: Math.min(100, (s.hull ?? 100) + hullRepairBase) } : s;
          }
          const dx = s.targetX - s.x, dy = s.targetY - s.y;
          const d  = Math.hypot(dx, dy);
          if (d < 1.0) {
            const route = s.route || [];
            const nextRouteIndex = (s.routeIndex || 0) + 1;
            if (route.length > nextRouteIndex) {
              const nextPoint = route[nextRouteIndex];
              return { ...s, x: s.targetX, y: s.targetY, targetX: nextPoint.x, targetY: nextPoint.y, routeIndex: nextRouteIndex,
                hull: Math.min(100, (s.hull ?? 100) + hullRepairBase) };
            }
            addLog(`✅ ${s.name}이(가) 도착했습니다!`);
            const finalX = s.destinationX ?? s.targetX;
            const finalY = s.destinationY ?? s.targetY;
            const arrivedPk = Object.entries(PORTS).find(([key, p]) => {
              const h = portHarbor(key);
              return Math.hypot(p.x - finalX, p.y - finalY) < 3.5 || Math.hypot(h.x - finalX, h.y - finalY) < 3.5;
            })?.[0];
            if (arrivedPk) ap.push({ shipId: s.id, portKey: arrivedPk });
            return { ...s, x: finalX, y: finalY, isMoving: false, targetX: null, targetY: null,
              destinationX: null, destinationY: null, route: null, routeIndex: 0,
              startX: null, startY: null, booster: false, stormUntil: null,
              hull: Math.min(100, (s.hull ?? 100) + hullRepairBase) };
          }
          const isStormed = s.stormUntil && Date.now() < s.stormUntil;
          const effectiveBooster = s.booster && (s.fuel ?? 100) > 5;
          const sp = st.speed * (effectiveBooster ? BOOSTER_SPEED_MULT : 1.0) * (isStormed ? 0.4 : 1.0) * st.weather.speedMult;
          const baseFuel = effectiveBooster ? 0.015 * BOOSTER_FUEL_COST_MULT : 0.015;
          const fuelCost = baseFuel * st.fuelEffMult * st.weather.fuelMult;
          const a  = Math.atan2(dy, dx);
          const newFuel = Math.max(0, (s.fuel ?? 100) - fuelCost);
          const hullDmg = 0.005 * st.hullDmgMult + st.weather.hullDmg;
          const newHull = Math.min(100, Math.max(0, (s.hull ?? 100) - hullDmg + hullRepairBase));
          return { ...s, x: s.x + sp * Math.cos(a), y: s.y + sp * Math.sin(a),
            fuel: newFuel, hull: newHull, booster: effectiveBooster && newFuel > 5 };
        });

        arrivedPorts = ap; // expose to outer scope for daily goal tracking
        // 방문 퀘스트 + visitedPorts 업데이트
        let goldBonus = 0, gemBonus = 0;
        let activeQuests = prev.activeQuests;
        let visitedPorts = prev.visitedPorts || getInitialVisitedPorts();
        if (ap.length > 0) {
          visitedPorts = [...new Set([...visitedPorts, ...ap.map(a => a.portKey)])];
          activeQuests = prev.activeQuests.map(q => {
            if (q.type !== 'visit' || q.completed) return q;
            let updated = q;
            ap.forEach(({ portKey: pk }) => {
              if (!(updated.visitedPorts || []).includes(pk)) {
                const newVisited = [...(updated.visitedPorts || []), pk];
                const newProg = newVisited.length;
                const done = newProg >= updated.target;
                if (done) { goldBonus += updated.rewardGold; gemBonus += updated.rewardGems || 0; addLog(`✅ 퀘스트 완료: ${updated.title} +${updated.rewardGold.toLocaleString()}금!`); }
                updated = { ...updated, progress: newProg, visitedPorts: newVisited, completed: done };
              }
            });
            return updated;
          });
        }
        // 새 항구 도착 시 20% 확률로 시장 소문 1개 입수
        let newRumors = [];
        if (ap.length > 0) {
          ap.forEach(({ portKey: pk }) => {
            const isNew = !(prev.visitedPorts || getInitialVisitedPorts()).includes(pk);
            if (isNew && Math.random() < 0.2) {
              const ri = PORT_INFO[0];
              newRumors.push(makePrediction('rumor', 'basic', pk, PORTS[pk].name, ri.accuracy, ri.magMin, ri.magMax, 1 + Math.floor(Math.random() * 3)));
              addLog(`📰 ${PORTS[pk].name}에서 시장 소문을 입수했습니다!`);
            }
          });
        }
        // 항구 도착 시: 승무원 풀 갱신 + 배달 의뢰 생성
        let newAvailableCrew = prev.availableCrew;
        let newPortDeliveries = { ...(prev.portDeliveries || {}) };
        if (ap.length > 0) {
          const lastPort = ap[ap.length - 1].portKey;
          const region = PORTS[lastPort].region;
          const poolSize = MAJOR_PORTS.has(lastPort) ? 6 : 4;
          newAvailableCrew = Array.from({ length: poolSize }, () => makeCrew(region));
          if (!newPortDeliveries[lastPort]) {
            newPortDeliveries[lastPort] = generatePortDeliveries(lastPort);
          }
        }
        return { ...prev, ships, activeQuests, visitedPorts, gold: prev.gold + goldBonus, gems: prev.gems + gemBonus,
          availableCrew: newAvailableCrew, portDeliveries: newPortDeliveries,
          ...(newRumors.length > 0 && { predictions: [...prev.predictions, ...newRumors].slice(-30) }) };
      });
      // 일일 방문 목표 추적 (setGs 밖에서 처리 — arrivedPorts는 위에서 할당됨)
      if (arrivedPorts.length > 0) {
        setDailyGoals(goals => goals.map(g => {
          if (g.type !== 'dg_visit' || g.completed) return g;
          let updated = g;
          arrivedPorts.forEach(({ portKey: pk }) => {
            if (!(updated.visitedToday || []).includes(pk)) {
              const newVisited = [...(updated.visitedToday || []), pk];
              const np = newVisited.length;
              const done = np >= updated.target;
              if (done && !updated.completed) {
                addLog(`🌟 일일 목표 완료: ${updated.title} +${updated.rewardGold.toLocaleString()}금 +${updated.rewardGems}💎`);
                setGsRaw(prev => ({ ...prev, gold: prev.gold + updated.rewardGold, gems: prev.gems + updated.rewardGems }));
              }
              updated = { ...updated, progress: np, visitedToday: newVisited, completed: done };
            }
          });
          return updated;
        }));
      }
    }, 300);
    return () => clearInterval(id);
  }, [paused, pricesReady, addLog]);

  // ── 이벤트 생성 (느린 간격 + 선박별 쿨다운) ──
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const now = Date.now();
      let activeEventCount = 0;
      setMapEvents(prev => {
        const alive = prev.filter(e => now - e.createdAt < e.duration);
        activeEventCount = alive.filter(e => !e.claimed).length;
        return alive;
      });
      const ships = gsRef.current.ships.filter(s => s.isMoving);
      ships.forEach(s => {
        if (activeEventCount >= MAX_ACTIVE_MAP_EVENTS) return;
        const lastAt = shipEventCooldownRef.current[s.id] || 0;
        if (now - lastAt < EVENT_SHIP_COOLDOWN) return;
        if (Math.random() > EVENT_SPAWN_CHANCE) return;
        const types  = ['wreck', 'storm', 'pirate', 'whale', 'treasure', 'current'];
        const icons  = ['🪵',    '⛈️',   '🏴‍☠️', '🐋',    '💰',       '🌊'    ];
        const labels = ['난파선 발견!', '폭풍우 접근!', '해적 출몰!', '고래 출몰!', '보물 발견!', '순조로운 해류!'];
        const weights   = [22, 4, 3, 8, 14, 20];
        const durations = [70000, 42000, 22000, 50000, 70000, 50000];
        const clickable = [true, false, false, false, true, false];
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total, idx = 0;
        for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) { idx = i; break; } }
        const type = types[idx];
        const angle = Math.random() * Math.PI * 2, dist = 1.5 + Math.random() * 3;
        const ex = Math.max(2, Math.min(97, s.x + Math.cos(angle) * dist));
        const ey = Math.max(2, Math.min(97, s.y + Math.sin(angle) * dist));
        const reward = type === 'wreck' ? 100 + Math.floor(Math.random() * 500)
                     : type === 'treasure' ? 300 + Math.floor(Math.random() * 800) : 0;
        const evt = { id: _evtId++, type, icon: icons[idx], label: labels[idx], x: ex, y: ey,
          shipId: s.id, createdAt: now, duration: durations[idx], clickable: clickable[idx],
          claimed: false, reward };
        // 즉각 효과
        if (type === 'storm') {
          const stormDur = 30000 + Math.floor(Math.random() * 30000); // 30~60초 랜덤
          setGs(prev => ({ ...prev, ships: prev.ships.map(x => x.id === s.id ? { ...x, stormUntil: now + stormDur } : x) }));
          addLog(`⛈️ ${s.name}에 폭풍우! ${Math.round(stormDur/1000)}초간 속도 60% 감소.`);
        } else if (type === 'pirate') {
          setGs(prev => {
            const ship = prev.ships.find(x => x.id === s.id);
            if (!ship || Object.keys(ship.cargo).length === 0) return prev;
            const newCargo = {};
            Object.entries(ship.cargo).forEach(([rr, n]) => {
              const lost = Math.ceil(n * (0.03 + Math.random() * 0.05)); // 3~8% 약탈
              const remain = Math.max(0, n - lost);
              if (remain > 0) newCargo[rr] = remain;
            });
            return { ...prev, ships: prev.ships.map(x => x.id === s.id ? { ...x, cargo: newCargo } : x) };
          });
          addLog(`🏴‍☠️ ${s.name}이 해적에게 습격! 화물 일부 약탈.`);
        } else if (type === 'whale') {
          // 고래: 작은 금화 보상 (고래유 판매)
          const whaleGold = 80 + Math.floor(Math.random() * 120);
          setGs(prev => ({ ...prev, gold: prev.gold + whaleGold }));
          addLog(`🐋 ${s.name} 고래 포획! +${whaleGold}금`);
        } else if (type === 'current') {
          // 해류: 연료 회복
          const fuelGain = 8 + Math.floor(Math.random() * 10);
          setGs(prev => ({ ...prev, ships: prev.ships.map(x => x.id === s.id ? { ...x, fuel: Math.min(100, (x.fuel ?? 100) + fuelGain) } : x) }));
          addLog(`🌊 ${s.name}에 순조로운 해류! 연료 +${fuelGain}% 회복.`);
        }
        shipEventCooldownRef.current[s.id] = now;
        activeEventCount += 1;
        setMapEvents(prev => [...prev, evt].slice(-MAX_ACTIVE_MAP_EVENTS));
      });
    }, EVENT_SPAWN_INTERVAL);
    return () => clearInterval(id);
  }, [paused, addLog]);

  // ── 시세 갱신 + 퀘스트 순환 ──
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const el = Math.floor((Date.now() - lastPrice) / 1000);
      const priceInterval = Math.max(PRICE_INTERVAL_MIN, PRICE_INTERVAL_BASE - (gsRef.current.taxLevel - 1) * 240); // Lv.1=1h, 후반에도 최소 20분
      if (el >= priceInterval) {
        setPrices(p => {
          const n = { ...p };
          Object.entries(n).forEach(([k, r]) =>
            Object.entries(r).forEach(([res, v]) => { n[k][res] = Math.max(20, Math.floor(v + (Math.random() - 0.5) * 60)); })
          );
          setGs(prev => {
            const applied = prev.predictions.map(pred => {
              if (pred.applied) return pred;
              const remaining = (pred.turnsRemaining ?? 1) - 1;
              if (remaining > 0) return { ...pred, turnsRemaining: remaining };
              const hit = Math.random() < pred.accuracy;
              if (hit) { const dir = pred.direction === 'up' ? 1 : -1; n[pred.targetPort][pred.resource] = Math.max(20, (n[pred.targetPort][pred.resource] || 100) + dir * pred.mag); }
              return { ...pred, turnsRemaining: 0, applied: true, hit };
            });
            return {
              ...prev,
              availableQuests: generateQuests(),
              predictions: applied.slice(-30),
            };
          });
          return n;
        });
        setPriceHistory(h => {
          const nh = {};
          Object.entries(n).forEach(([k, r]) => {
            nh[k] = { ...(h[k] || {}) };
            Object.entries(r).forEach(([res, v]) => {
              const arr = nh[k][res] || [];
              nh[k][res] = [...arr, v].slice(-20);
            });
          });
          return nh;
        });
        setLastPrice(Date.now());
        addLog('📈 전세계 시세 변동!');
        saveGame(); // 자동 저장
      } else setNextUpd(priceInterval - el);
    }, 1000);
    return () => clearInterval(id);
  }, [paused, lastPrice, addLog]);

  // ── 세금 (하루 1회 징수, 급격한 지수 성장) ──
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const el = Math.floor((Date.now() - lastTax) / 1000);
      if (el >= TAX_INTERVAL) {
        setGs(prev => {
          if (prev.taxExemptNext) {
            addLog(`🛡️ 세금 면제 적용! 이번 세금 ${calcTax(prev.ships.length, prev.taxLevel).toLocaleString()}금 면제.`);
            return { ...prev, taxExemptNext: false, taxExemptCount: (prev.taxExemptCount || 0) + 1 };
          }
          const tax = calcTax(prev.ships.length, prev.taxLevel);
          if (prev.gold >= tax) {
            addLog(`🏛️ 일일 세금 ${tax.toLocaleString()}금 납부 (Lv.${prev.taxLevel})`);
            return { ...prev, gold: prev.gold - tax };
          } else if (prev.gems >= 1) {
            addLog(`💎 금 부족! 다이아몬드 1개로 세금 대납 (Lv.${prev.taxLevel})`);
            return { ...prev, gems: prev.gems - 1 };
          } else {
            addLog(`🚨 세금 납부 불가! 세무관이 찾아옵니다... (Lv.${prev.taxLevel})`);
            const exemptCost = 2 + (prev.taxExemptCount || 0);
            setTaxCrisisInfo({ tax, exemptCost, canExempt: prev.gems >= exemptCost });
            return prev;
          }
        });
        setLastTax(Date.now());
      } else setNextTax(TAX_INTERVAL - el);
    }, 1000);
    return () => clearInterval(id);
  }, [paused, lastTax, addLog]);

  // 파생값
  const cur     = gs.ships.find(s => s.id === selShip) || null;
  const portKey = cur ? portOf(cur) : null;
  const atPort  = !!portKey;
  const st      = cur ? calcStats(cur, gs.crew) : null;
  const nextTaxAmount = calcTax(gs.ships.length, gs.taxLevel);
  const cargoN  = (s) => Object.values(s?.cargo || {}).reduce((a, v) => a + v, 0);
  const journeyProgress = (s) => {
    if (!s?.isMoving || s.startX == null) return 0;
    const route = s.route?.length ? s.route : [{ x: s.startX, y: s.startY }, { x: s.targetX, y: s.targetY }];
    const total = route.slice(1).reduce((sum, pt, i) => sum + Math.hypot(pt.x - route[i].x, pt.y - route[i].y), 0);
    const currentIndex = Math.max(1, s.routeIndex || 1);
    const doneBefore = route.slice(1, currentIndex).reduce((sum, pt, i) => sum + Math.hypot(pt.x - route[i].x, pt.y - route[i].y), 0);
    const legStart = route[currentIndex - 1] || { x: s.startX, y: s.startY };
    const done = doneBefore + Math.hypot(s.x - legStart.x, s.y - legStart.y);
    return total > 0 ? Math.min(100, (done / total) * 100) : 0;
  };
  const eta = (s) => {
    if (!s?.isMoving || s.targetX === null) return null;
    const route = s.route?.length ? s.route : [{ x: s.x, y: s.y }, { x: s.targetX, y: s.targetY }];
    const currentIndex = Math.max(1, s.routeIndex || 1);
    const legRemaining = Math.max(0, Math.hypot(s.targetX - s.x, s.targetY - s.y) - 1.0);
    const laterRemaining = route.slice(currentIndex + 1).reduce((sum, pt, i) => {
      const prev = route[currentIndex + i];
      return sum + Math.hypot(pt.x - prev.x, pt.y - prev.y);
    }, 0);
    const remaining = legRemaining + laterRemaining;
    const isStormed = s.stormUntil && Date.now() < s.stormUntil;
    const sp = calcStats(s, gs.crew).speed * (s.booster ? BOOSTER_SPEED_MULT : 1.0) * (isStormed ? 0.4 : 1.0);
    const secs = Math.round(remaining / (sp / 0.3));
    if (secs >= 3600) return `${Math.floor(secs/3600)}h ${String(Math.floor((secs%3600)/60)).padStart(2,'0')}m`;
    return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
  };
  const fmt = (s) => {
    if (s >= 3600) return `${Math.floor(s/3600)}h ${String(Math.floor((s%3600)/60)).padStart(2,'0')}m`;
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  };
  const advisor = (() => {
    const cargoCount = cur ? cargoN(cur) : 0;
    const nextUnlock = Object.entries(PORTS)
      .map(([key, port]) => ({ key, port, access: getPortAccessState(key, gs.totalEarned) }))
      .filter(x => !x.access.unlocked)
      .sort((a, b) => a.access.required - b.access.required)[0];
    if (!cur) return { icon: '👆', title: '배를 선택하세요', text: '왼쪽 함대 목록이나 지도 위 배를 누르면 항로와 상태를 관리할 수 있습니다.', tone: 'blue' };
    if (tutorialPhase !== 'done' && TUTORIAL_STEPS[tutorialPhase]) {
      const step = TUTORIAL_STEPS[tutorialPhase];
      return { icon: step.icon, title: `${step.step}/${step.total} ${step.title}`, text: step.text, goal: step.goal, step: step.step, total: step.total, tone: tutorialPhase };
    }
    if (routeMode) return { icon: '🧭', title: '목적지 선택 중', text: '항구를 눌러 시세를 확인한 뒤 시세창의 [목적지 확정]으로 출항하세요. 잠긴 항구는 해금 조건이 표시됩니다.', goal: '시세를 먼저 보고 목적지를 확정하세요.', tone: 'depart' };
    if (cur.isMoving) return { icon: '⛵', title: '항해 관찰 중', text: `도착 예정 ${eta(cur) || '--:--'} · 항로와 날씨를 지켜보며 다음 항구의 시세를 천천히 비교해보세요.`, goal: '항해 중에는 다음 매매 후보를 살펴보세요.', tone: 'sailing' };
    if (atPort && cargoCount > 0) return { icon: '💰', title: '시세 확인', text: `${PORTS[portKey].name}에 정박 중입니다. 보유 화물을 바로 팔기보다 주변 항구 흐름과 비교해도 좋습니다.`, tone: 'sell' };
    if (atPort && cargoCount === 0) return { icon: '📦', title: '화물 적재', text: '화물칸이 비었습니다. 거래소에서 가격이 낮은 상품을 고르고, 목적지 후보의 시세를 확인해보세요.', tone: 'buy' };
    if (nextUnlock) return { icon: '🔓', title: '다음 항로 해금', text: `${nextUnlock.port.name} 항로는 ${nextUnlock.access.label} 달성 후 열립니다.`, tone: 'unlock' };
    return { icon: '🧭', title: '자유 항해', text: '바다를 지켜보며 가격 흐름이 좋은 항구를 기다리고, 여유 있을 때 선박과 승무원을 정비하세요.', tone: 'done' };
  })();

  // 'sailing' → 'sell': 배 도착 시
  useEffect(() => {
    if (tutorialPhase === 'sailing' && atPort) setTutorialPhase('sell');
  }, [tutorialPhase, atPort]);
  useEffect(() => {
    if (tutorialPhase === 'depart' && routeMode && showPortPrice) setTutorialPhase('confirm');
  }, [tutorialPhase, routeMode, showPortPrice]);
  // 'sell' → 'buy': 화물 전부 팔았을 때
  useEffect(() => {
    if (tutorialPhase === 'sell' && atPort && cur && Object.keys(cur.cargo).length === 0) {
      setTutorialPhase('buy'); addLog('💰 잘했어요! 이제 여기서 싸게 사서 다른 항구에서 파세요.');
    }
  }, [tutorialPhase, atPort, cur, addLog]);
  // 'buy' → 'done': 구매 후 다시 출발하면 완료
  useEffect(() => {
    if (tutorialPhase === 'buy' && cur?.isMoving) {
      setTutorialPhase('done'); addLog('🎉 무역의 기본을 익혔습니다! 자유롭게 항해하세요!');
    }
  }, [tutorialPhase, cur?.isMoving, addLog]);
  useEffect(() => {
    if (atPort && !cur?.isMoving) {
      setShowPortPrice(null);
      setSelectedPortRes(null);
      setShowMarket(true);
    }
    else { setShowMarket(false); setShowSellModal(false); }
  }, [atPort, cur?.isMoving]);

  // ── 거래 ──
  const getBuy  = (res) => calcBuyPrice(prices[portKey]?.[res] || 0, st?.tradePct || 0);
  const getSell = (res) => calcSellPrice(prices[portKey]?.[res] || 0, st?.tradePct || 0);
  const cargoSellTotal = (ship, pk) => {
    if (!pk || !prices[pk]) return 0;
    const tp = calcStats(ship, gs.crew).tradePct;
    const fr = getFeeRate(tp);
    return Object.entries(ship.cargo).reduce((sum, [r, n]) => sum + Math.floor(calcSellPrice(prices[pk][r] || 0, tp) * n * (1 - fr / 100)), 0);
  };
  const renderCargoInventory = (ship, capacity, { compact = false } = {}) => {
    const entries = Object.entries(ship.cargo);
    const used = cargoN(ship);
    const visibleSlots = Math.max(compact ? 8 : 12, Math.min(compact ? 8 : 16, entries.length + Math.min(6, Math.max(0, capacity - used))));
    const cells = [
      ...entries.map(([res, qty]) => ({ type: 'item', res, qty })),
      ...Array.from({ length: Math.max(0, visibleSlots - entries.length) }, () => ({ type: 'empty' })),
    ];
    return (
      <div className={`grid ${compact ? 'grid-cols-4 gap-1.5' : 'grid-cols-5 gap-1.5'}`}>
        {cells.map((cell, idx) => {
          if (cell.type === 'empty') {
            return <div key={`empty-${idx}`} className={`${compact ? 'h-12' : 'h-14'} inventory-slot-frame rounded-lg border border-dashed border-slate-700 bg-slate-950/45 opacity-70`} />;
          }
          const sellP = atPort ? getSellTotal(getSell(cell.res), 1, getFeeRate(st?.tradePct)) : null;
          return (
            <div key={cell.res} title={`${cell.res} ×${cell.qty}${sellP ? ` - ${(sellP * cell.qty).toLocaleString()}금` : ''}`}
              className={`${compact ? 'h-12' : 'h-14'} inventory-slot-frame relative rounded-lg border border-gold/35 bg-gradient-to-b from-slate-800 to-slate-950 p-1.5 flex flex-col items-center justify-center shadow-inner group`}>
              <ResourceIcon res={cell.res} className={compact ? 'w-7 h-7' : 'w-8 h-8'} />
              <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] font-black text-gold">×{cell.qty}</span>
              {sellP && <span className="absolute -top-1 -right-1 rounded bg-emerald-900 px-1 text-[9px] font-bold text-emerald-100">{(sellP * cell.qty / 1000).toFixed(1)}k</span>}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-30 transition-opacity">
                {cell.res} ×{cell.qty}{sellP ? ` = ${(sellP * cell.qty).toLocaleString()}금` : ''}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const doBuy = useCallback((res, n) => {
    if (!cur || !portKey || n < 1 || cur.isMoving) return;
    const tradePct = calcStats(cur, gs.crew).tradePct;
    const price = calcBuyPrice(prices[portKey]?.[res] || 0, tradePct);
    const total = getBuyTotal(price, n);
    if (gsRef.current.gold < total) { addLog(`❌ 금 부족! 필요: ${total.toLocaleString()}금`); return; }
    const cap = calcStats(cur, gs.crew).capacity;
    if (cargoN(cur) + n > cap) { addLog(`❌ 화물 공간 부족! 여유: ${cap - cargoN(cur)}개`); return; }
    setGs(prev => ({ ...prev, gold: prev.gold - total,
      ships: prev.ships.map(s => s.id === cur.id ? { ...s, cargo: { ...s.cargo, [res]: (s.cargo[res] || 0) + n } } : s) }));
    addLog(`✅ ${RESOURCES[res].icon} ${res} ×${n} 구매 -${total.toLocaleString()}금 (구매 수수료 없음)`);
    setTradeDone({ type: 'buy', ts: Date.now() });
    setTimeout(() => setTradeDone(null), 800);
  }, [cur, portKey, prices, setGs, gs.crew, addLog]);

  const doSell = useCallback((res, n) => {
    if (!cur || !portKey || n < 1 || cur.isMoving) return;
    const have = cur.cargo[res] || 0;
    const qty = Math.min(n, have);
    if (qty < 1) { addLog('❌ 화물 없음!'); return; }
    const tradePct = calcStats(cur, gs.crew).tradePct;
    const price = calcSellPrice(prices[portKey]?.[res] || 0, tradePct);
    const feeRate = getFeeRate(tradePct);
    const total = getSellTotal(price, qty, feeRate);
    const prevEarned = gsRef.current?.totalEarned || 0;
    const newEarned = prevEarned + total;
    const milestoneCrossed = EARN_MILESTONES.filter(m => m > prevEarned && m <= newEarned).length;
    setGs(prev => {
      const cargo = { ...prev.ships.find(s => s.id === cur.id).cargo };
      cargo[res] = (cargo[res] || 0) - qty;
      if (cargo[res] <= 0) delete cargo[res];
      let goldBonus = 0, gemBonus = 0;
      const updatedQuests = prev.activeQuests.map(q => {
        if (q.completed) return q;
        if (q.type === 'deliver' && q.resource === res && portKey === q.targetPort) {
          const np = Math.min(q.target, q.progress + qty);
          const done = np >= q.target;
          if (done) { goldBonus += q.rewardGold; addLog(`✅ 퀘스트 완료: ${q.title} +${q.rewardGold.toLocaleString()}금!`); }
          return { ...q, progress: np, completed: done };
        }
        if (q.type === 'trade') {
          const np = q.progress + total;
          const done = np >= q.target;
          if (done && !q.completed) { goldBonus += q.rewardGold; gemBonus += q.rewardGems || 0; addLog(`✅ 퀘스트 완료: ${q.title} +${q.rewardGold.toLocaleString()}금!`); }
          return { ...q, progress: np, completed: done };
        }
        return q;
      });
      // 배달 의뢰 완료 체크
      const updatedDeliveries = (prev.activeDeliveries || []).map(d => {
        if (d.completed || d.resource !== res || d.toPort !== portKey) return d;
        const np = Math.min(d.qty, (d.progress || 0) + qty);
        const done = np >= d.qty;
        if (done) { goldBonus += d.reward; addLog(`📦 배달 완료! ${d.npc}: ${RESOURCES[res].icon} ${res} → ${d.toPortName} +${d.reward.toLocaleString()}금!`); }
        return { ...d, progress: np, completed: done };
      });
      return { ...prev, gold: prev.gold + total + goldBonus, gems: prev.gems + gemBonus,
        totalEarned: (prev.totalEarned || 0) + total,
        taxLevel: prev.taxLevel + milestoneCrossed,
        ships: prev.ships.map(s => s.id === cur.id ? { ...s, cargo } : s),
        activeQuests: updatedQuests, activeDeliveries: updatedDeliveries };
    });
    addLog(`💰 ${RESOURCES[res].icon} ${res} ×${qty} 판매 +${total.toLocaleString()}금 (수수료 ${feeRate}%)`);
    if (milestoneCrossed > 0) addLog(`📊 무역 규모 성장! 세금 레벨 상승 (${EARN_MILESTONES.find(m => m > prevEarned && m <= newEarned)?.toLocaleString()}금 돌파)`);
    setTradeDone({ type: 'sell', ts: Date.now() });
    setTimeout(() => setTradeDone(null), 800);
    if (total >= 1000) {
      const popupId = Date.now();
      setBigTradePopup({ amount: total, id: popupId });
      setTimeout(() => setBigTradePopup(prev => prev?.id === popupId ? null : prev), 1600);
    }
    // 일일 목표 진행 추적
    setDailyGoals(goals => {
      let bonusGold = 0, bonusGems = 0;
      const next = goals.map(g => {
        if (g.completed) return g;
        let np = g.progress, done = false;
        if (g.type === 'dg_gold') { np = g.progress + total; done = np >= g.target; }
        else if (g.type === 'dg_trades') { np = g.progress + 1; done = np >= g.target; }
        else if (g.type === 'dg_deliver' && g.resource === res && portKey === g.targetPort) { np = Math.min(g.target, g.progress + qty); done = np >= g.target; }
        else return g;
        if (done && !g.completed) {
          bonusGold += g.rewardGold; bonusGems += g.rewardGems || 0;
          addLog(`🌟 일일 목표 완료: ${g.title} +${g.rewardGold.toLocaleString()}금${g.rewardGems ? ` +${g.rewardGems}💎` : ''}`);
        }
        return { ...g, progress: np, completed: done };
      });
      if (bonusGold > 0 || bonusGems > 0) setGsRaw(prev => ({ ...prev, gold: prev.gold + bonusGold, gems: prev.gems + bonusGems }));
      return next;
    });
  }, [cur, portKey, prices, setGs, gs.crew, addLog]);

  const refuel = () => {
    if (!cur || !portKey) return;
    const need = 100 - (cur.fuel ?? 100);
    if (need < 1) { addLog('⛽ 연료가 이미 가득합니다!'); return; }
    const cost = Math.floor(need * 2);
    if (gs.gold < cost) { addLog(`❌ 금 부족! 보충 비용: ${cost}금`); return; }
    setGs(prev => ({ ...prev, gold: prev.gold - cost, ships: prev.ships.map(s => s.id === cur.id ? { ...s, fuel: 100 } : s) }));
    addLog(`⛽ 연료 완전 보충 -${cost}금`);
  };
  const doRepair = () => {
    if (!cur || !portKey) return;
    const need = 100 - (cur.hull ?? 100);
    if (need < 1) { addLog('🔧 내구도가 이미 최대입니다!'); return; }
    const cost = Math.floor(need * 5);
    if (gs.gold < cost) { addLog(`❌ 금 부족! 수리 비용: ${cost}금`); return; }
    setGs(prev => ({ ...prev, gold: prev.gold - cost, ships: prev.ships.map(s => s.id === cur.id ? { ...s, hull: 100 } : s) }));
    addLog(`🔧 선체 수리 완료 -${cost}금`);
  };

  const hireCrew  = (cid) => {
    const c = gs.availableCrew.find(x => x.id === cid); if (!c) return;
    if (gs.gold < c.hireCost) { addLog('❌ 금 부족!'); return; }
    setGs(prev => ({ ...prev, gold: prev.gold - c.hireCost, crew: [...prev.crew, c], availableCrew: prev.availableCrew.filter(x => x.id !== cid) }));
    addLog(`✅ ${c.name} 고용${c.label ? ` [${c.label}]` : ''}! -${c.hireCost}금`);
  };
  const assign    = (cid, sid) => {
    const s = gs.ships.find(x => x.id === sid); if (!s) return;
    if (gs.crew.filter(c => c.shipId === sid).length >= calcStats(s, gs.crew).maxCrew) { addLog('❌ 최대 승무원 초과!'); return; }
    setGs(prev => ({ ...prev, crew: prev.crew.map(x => x.id === cid ? { ...x, shipId: sid } : x) }));
  };
  const unassign  = (cid) => setGs(prev => ({ ...prev, crew: prev.crew.map(x => x.id === cid ? { ...x, shipId: null } : x) }));
  const dismiss   = (cid) => setGs(prev => ({ ...prev, crew: prev.crew.filter(x => x.id !== cid) }));
  const refreshCrew = () => {
    if (gs.gold < 500) { addLog('❌ 금 부족!'); return; }
    const region = portKey ? PORTS[portKey]?.region : null;
    const poolSize = portKey && MAJOR_PORTS.has(portKey) ? 6 : 4;
    setGs(prev => ({ ...prev, gold: prev.gold - 500, availableCrew: Array.from({ length: poolSize }, () => makeCrew(region)) }));
    addLog('🔄 승무원 새로고침 -500금');
  };

  const buySh = (tk) => {
    const t = SHIP_TYPES[tk];
    if (gs.gold < t.cost) { addLog('❌ 금 부족!'); return; }
    const nid = Math.max(...gs.ships.map(s => s.id), 0) + 1;
    const ns = { id: nid, type: tk, name: `${t.name} ${nid}호`,
      x: portHarbor(portKey).x, y: portHarbor(portKey).y,
      targetX: null, targetY: null, destinationX: null, destinationY: null, route: null, routeIndex: 0, startX: null, startY: null,
      isMoving: false, booster: false, stormUntil: null,
      cargo: {}, fuel: 100, hull: 100, upgrades: { speed: 0, cargo: 0, crew: 0 }, morale: 100 };
    setGs(prev => ({ ...prev, gold: prev.gold - t.cost, ships: [...prev.ships, ns], taxLevel: prev.taxLevel + 1 }));
    setSelShip(nid); setShowBuy(false);
    addLog(`⚓ ${t.icon} ${ns.name} 건조! 세금 레벨 상승. -${t.cost}금`);
  };
  const upgrade = (sid, key) => {
    const s = gs.ships.find(x => x.id === sid); if (!s) return;
    const lv = s.upgrades[key]; if (lv >= 5) { addLog('❌ 최대 레벨!'); return; }
    const cost = { speed: 2000, cargo: 1500, crew: 1000 }[key] * (lv + 1);
    if (gs.gold < cost) { addLog('❌ 금 부족!'); return; }
    setGs(prev => ({ ...prev, gold: prev.gold - cost, ships: prev.ships.map(s2 => s2.id === sid ? { ...s2, upgrades: { ...s2.upgrades, [key]: lv + 1 } } : s2) }));
    addLog(`🔧 ${{ speed:'돛', cargo:'화물칸', crew:'선원숙소' }[key]} Lv.${lv+1} -${cost}금`);
  };
  const buyInfo = (info) => {
    const cost = infoCurrentCost(info, gs.infoBuyCounts, gs.taxLevel);
    if (gs.gold < cost) { addLog(`❌ 금 부족! 필요: ${cost.toLocaleString()}금`); return; }
    const premKey = !info.repeat ? info.id : null;
    if (premKey && gs.purchasedInfo[premKey]) { addLog('❌ 이미 구매한 정보!'); return; }
    const portKeys = Object.keys(PORTS);
    const fromKey  = portKey || portKeys[Math.floor(Math.random() * portKeys.length)];
    const turnsUntil = info.id === 'rumor' ? 1 + Math.floor(Math.random() * 3)
                     : info.id === 'hint'   ? 1 + Math.floor(Math.random() * 2)
                     : 1;
    const pred = makePrediction(info.id, info.tier, fromKey, PORTS[fromKey].name, info.accuracy, info.magMin, info.magMax, turnsUntil);
    setGs(prev => ({
      ...prev, gold: prev.gold - cost,
      purchasedInfo: premKey ? { ...prev.purchasedInfo, [premKey]: true } : prev.purchasedInfo,
      predictions: [...prev.predictions, pred],
      infoBuyCounts: info.repeat ? { ...prev.infoBuyCounts, [info.id]: (prev.infoBuyCounts[info.id] || 0) + 1 } : prev.infoBuyCounts,
    }));
    addLog(`${info.tier==='premium'?'⭐':'💬'} [${pred.turnsUntil}턴 후] ${pred.resource} ${pred.targetPortName} ${pred.direction==='up'?'📈 상승':'📉 하락'} 예상 -${cost.toLocaleString()}금`);
  };
  const toggleBooster = useCallback((sid) => {
    const shipId = sid ?? cur?.id;
    setGs(prev => {
      const s = prev.ships.find(x => x.id === shipId); if (!s?.isMoving) return prev;
    if (!s.booster && (s.fuel ?? 100) < 20) { addLog('❌ 연료 부족! 순항 보조는 연료 20% 이상 필요.'); return prev; }
      const nb = !s.booster;
      addLog(nb ? '⚡ 순항 보조 가동. 연료 소모 +50%, 속도 +20%' : '⚡ 순항 보조 해제');
      return { ...prev, ships: prev.ships.map(x => x.id === shipId ? { ...x, booster: nb } : x) };
    });
  }, [cur, setGs, addLog]);
  // 퀘스트
  const acceptQuest = (qid) => {
    if (gs.activeQuests.length >= 3) { addLog('❌ 퀘스트 슬롯 가득! (최대 3개)'); return; }
    setGs(prev => {
      const q = prev.availableQuests.find(x => x.id === qid); if (!q) return prev;
      const remaining = prev.availableQuests.filter(x => x.id !== qid);
      return { ...prev,
        availableQuests: remaining.length > 0 ? remaining : generateQuests(),
        activeQuests: [...prev.activeQuests, q],
      };
    });
    addLog('📋 퀘스트 수주!');
  };
  const dismissQuest = (qid) => setGs(prev => ({ ...prev, activeQuests: prev.activeQuests.filter(q => q.id !== qid) }));

  const exemptTax = () => {
    if (gsRef.current.taxExemptNext) { addLog('🛡️ 이미 세금 면제가 예약되어 있습니다!'); return; }
    const cost = 2 + (gsRef.current.taxExemptCount || 0);
    if (gsRef.current.gems < cost) { addLog(`❌ 보석 부족! (💎${cost} 필요)`); return; }
    setGs(prev => ({ ...prev, gems: prev.gems - cost, taxExemptNext: true }));
    addLog(`🛡️ 다음 세금 1회 면제 예약! (💎${cost} 소비)`);
  };

  const RARITY_ORDER = ['common', 'uncommon', 'rare', 'legendary'];
  const UPGRADE_GEM_COST = { common: 1, uncommon: 2, rare: 3 };
  const upgradeCrew = (crewId) => {
    const c = gsRef.current.crew.find(x => x.id === crewId);
    if (!c) return;
    const idx = RARITY_ORDER.indexOf(c.rarity);
    if (idx < 0 || idx >= RARITY_ORDER.length - 1) { addLog('❌ 이미 최고 등급입니다!'); return; }
    const cost = UPGRADE_GEM_COST[c.rarity] || 1;
    if (gsRef.current.gems < cost) { addLog(`❌ 보석 부족! (💎${cost} 필요)`); return; }
    const nextRarity = RARITY_ORDER[idx + 1];
    const clamp = v => Math.min(100, v + 10);
    setGs(prev => ({
      ...prev, gems: prev.gems - cost,
      crew: prev.crew.map(x => x.id === crewId ? {
        ...x, rarity: nextRarity,
        navigation: clamp(x.navigation), trading: clamp(x.trading),
        stamina: clamp(x.stamina), repair: clamp(x.repair),
        morale: clamp(x.morale), combat: clamp(x.combat),
        fuelEff: clamp(x.fuelEff||0), hullEff: clamp(x.hullEff||0), logistics: clamp(x.logistics||0),
      } : x),
    }));
    addLog(`💎 ${c.name} 등급 업그레이드! ${c.rarity} → ${nextRarity} (+전 스탯 10)`);
  };

  const acceptDelivery = (delivId, dPortKey) => {
    const delivery = gsRef.current.portDeliveries?.[dPortKey]?.find(d => d.id === delivId);
    if (!delivery) return;
    const ship = gsRef.current.ships.find(s => s.id === selShip);
    if (!ship) return;
    const st = calcStats(ship, gsRef.current.crew);
    const used = Object.values(ship.cargo).reduce((a, n) => a + n, 0);
    if (used + delivery.qty > st.capacity) { addLog(`❌ 화물 공간 부족! (배달 화물 ${delivery.qty}개 필요)`); return; }
    setGs(prev => {
      const ship2 = prev.ships.find(s => s.id === selShip);
      if (!ship2) return prev;
      const newCargo = { ...ship2.cargo, [delivery.resource]: (ship2.cargo[delivery.resource] || 0) + delivery.qty };
      const newPortDel = { ...prev.portDeliveries };
      newPortDel[dPortKey] = (newPortDel[dPortKey] || []).filter(d => d.id !== delivId);
      return { ...prev,
        ships: prev.ships.map(s => s.id === selShip ? { ...s, cargo: newCargo } : s),
        portDeliveries: newPortDel,
        activeDeliveries: [...(prev.activeDeliveries || []), { ...delivery, progress: 0, completed: false }],
      };
    });
    addLog(`📦 배달 수락! ${delivery.npc}: ${RESOURCES[delivery.resource].icon} ${delivery.resource} ×${delivery.qty} → ${delivery.toPortName}`);
  };
  const claimEvent = useCallback((evtId) => {
    const evt = mapEvents.find(e => e.id === evtId); if (!evt || evt.claimed || evt.reward <= 0) return;
    setGs(prev => ({ ...prev, gold: prev.gold + evt.reward }));
    setMapEvents(prev => prev.map(e => e.id === evtId ? { ...e, claimed: true } : e));
    addLog(`${evt.icon} ${evt.label.replace('!', '')} — ${evt.reward.toLocaleString()}금 획득!`);
  }, [mapEvents, setGs, addLog]);

  const portGuard   = (l) => <div className="text-center py-4 text-gray-500 text-sm">⚓ 항구에 정박해야<br/>{l}을 이용할 수 있습니다.</div>;
  const gaugeColor  = (v) => v > 60 ? 'bg-green-500' : v > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const gaugeText   = (v) => v > 60 ? 'text-green-400' : v > 30 ? 'text-yellow-400' : 'text-red-400';
  const rarityColor = (r) => ({ legendary:'text-yellow-300', rare:'text-purple-400', uncommon:'text-blue-400' })[r] || 'text-gray-400';
  const getShipScreenPos = (ship) => {
    if (!mapRef.current) return null;
    const { x: vx, y: vy, zoom } = mapView;
    const rect = mapRef.current.getBoundingClientRect();
    return { sx: vx + (ship.x / 100) * rect.width * zoom, sy: vy + (ship.y / 100) * rect.height * zoom };
  };

  // ==================== UI ====================
  if (introSlide < INTRO_SLIDES.length) {
    const slide = INTRO_SLIDES[introSlide];
    const isLast = introSlide === INTRO_SLIDES.length - 1;
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-950 via-black to-blue-900 flex items-center justify-center z-50 p-4">
        <div className="max-w-lg w-full">
          <div className="flex justify-center gap-2 mb-6">
            {INTRO_SLIDES.map((_, i) => <div key={i} className={`h-2 rounded-full transition-all ${i===introSlide?'w-6 bg-yellow-400':i<introSlide?'w-2 bg-yellow-600':'w-2 bg-gray-600'}`}/>)}
          </div>
          <div className="bg-gray-900 border-2 border-yellow-600 rounded-2xl p-8 shadow-2xl text-center">
            <div className="text-6xl mb-4">{slide.img}</div>
            <h1 className="text-2xl font-bold text-yellow-400 mb-1">{slide.title}</h1>
            <p className="text-sm text-blue-300 mb-5">{slide.subtitle}</p>
            <div className="text-sm text-gray-200 whitespace-pre-line leading-relaxed text-left bg-blue-950 rounded-xl p-4 mb-6">{slide.body}</div>
            <div className="flex gap-3">
              {introSlide > 0 && <button onClick={() => setIntroSlide(i => i-1)} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-400 hover:text-yellow-400 text-sm">← 이전</button>}
              <button onClick={() => setIntroSlide(i => i+1)} className="flex-1 py-3 rounded-lg bg-yellow-500 text-gray-900 font-bold text-sm hover:bg-yellow-300 transition-all">
                {isLast ? '🚢 항해 시작!' : '다음 →'}
              </button>
            </div>
            {introSlide === 0 && <button onClick={() => setIntroSlide(INTRO_SLIDES.length)} className="mt-3 text-xs text-gray-600 hover:text-gray-400">건너뛰기</button>}
          </div>
        </div>
      </div>
    );
  }

  const completedQuests = gs.activeQuests.filter(q => q.completed).length;
  const loadDialogSavedAt = (() => { try { return new Date(JSON.parse(localStorage.getItem('pioneer_save'))?.savedAt).toLocaleString('ko-KR'); } catch { return ''; } })();
  return (
    <div className="bg-gradient-to-br from-ocean-dark via-ocean-blue to-ocean-dark h-screen text-gold-light font-sans flex flex-col overflow-hidden" style={{ userSelect:'none' }}>
      {/* 불러오기 다이얼로그 */}
      {saveExists && !saveDecided && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border-2 border-yellow-500 rounded-2xl p-8 text-center max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-4xl mb-3">⚓</div>
            <h2 className="text-xl font-bold text-yellow-400 mb-1">저장된 항해 기록</h2>
            <p className="text-xs text-gray-400 mb-5">{loadDialogSavedAt}</p>
            <div className="flex gap-3">
              <button onClick={handleNew} className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 text-sm transition-colors">🆕 새 게임</button>
              <button onClick={handleLoad} className="flex-1 py-2 rounded-lg bg-yellow-500 text-gray-900 font-bold text-sm hover:bg-yellow-300 transition-colors">📂 계속하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 전체 승무원 모달 */}
      {showAllCrew && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-40 flex items-center justify-center p-4">
          <div className="bg-ocean-dark border-2 border-gold rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gold">
              <span className="text-lg font-bold text-gold">👥 전체 승무원 현황</span>
              <button onClick={() => setShowAllCrew(false)} className="text-gray-400 hover:text-gold text-xl">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-3">
              {gs.ships.map(s => {
                const onBoard = gs.crew.filter(c => c.shipId === s.id);
                const st2 = calcStats(s, gs.crew);
                return (
                  <div key={s.id} className="bg-ocean-blue rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-gold inline-flex items-center gap-1.5"><ShipIcon type={s.type} className="w-6 h-6" /> {s.name}</span>
                      <span className="text-xs text-gray-400">{onBoard.length}/{st2.maxCrew}명 | 수리력 {st2.totalRepair}</span>
                    </div>
                    {onBoard.length === 0 ? <div className="text-xs text-red-400">⚠️ 승무원 없음</div>
                      : <div className="grid grid-cols-2 gap-1">
                          {onBoard.map(c => (
                            <div key={c.id} className="bg-ocean-dark rounded px-2 py-1 text-xs flex justify-between items-center">
                              <div>
                                <span className={`font-bold ${rarityColor(c.rarity)}`}>{c.name}</span>
                                {c.label && <div className={`text-xs ${rarityColor(c.rarity)}`}>{c.label}</div>}
                                <div className="text-gray-400">항:{c.navigation} 상:{c.trading} 수:{c.repair}</div>
                              </div>
                              <button onClick={() => unassign(c.id)} className="text-red-400 text-xs ml-2">↩</button>
                            </div>
                          ))}
                        </div>}
                  </div>
                );
              })}
              {gs.crew.filter(c => !c.shipId).length > 0 && (
                <div className="bg-ocean-blue rounded-lg p-3">
                  <div className="text-sm font-bold text-yellow-400 mb-2">⚠️ 미배치 승무원</div>
                  <div className="grid grid-cols-2 gap-1">
                    {gs.crew.filter(c => !c.shipId).map(c => (
                      <div key={c.id} className="bg-ocean-dark rounded px-2 py-1 text-xs">
                        <span className={`font-bold ${rarityColor(c.rarity)}`}>{c.name}</span>
                        {c.label && <div className={rarityColor(c.rarity)}>{c.label}</div>}
                        <div className="text-gray-400">항:{c.navigation} 상:{c.trading} 수:{c.repair}</div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {gs.ships.map(s => <button key={s.id} onClick={() => assign(c.id, s.id)} className="text-green-400 text-xs border border-green-800 rounded px-1 inline-flex items-center gap-1"><ShipIcon type={s.type} className="w-4 h-4" />탑승</button>)}
                          <button onClick={() => dismiss(c.id)} className="text-red-400 text-xs border border-red-900 rounded px-1">해고</button>
                        </div>
                        <div className="mt-2 rounded-lg border border-blue-700/60 bg-blue-950/40 px-3 py-2 text-xs text-blue-100">
                          {actionHint}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 세금 위기 팝업 */}
      {taxCrisisInfo && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="bg-ocean-dark border-2 border-red-500 rounded-2xl w-full max-w-sm shadow-lg shadow-red-900/50">
            <div className="px-5 py-4 border-b border-red-700 flex items-center gap-2">
              <span className="text-2xl">🚨</span>
              <span className="text-lg font-bold text-red-400">세금 납부 불가!</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-300">
                세금 <span className="text-red-300 font-bold">{taxCrisisInfo.tax.toLocaleString()}금</span>을 낼 금화가 부족합니다.<br/>
                세무관이 조만간 화물을 압류할 수 있습니다!
              </p>
              {taxCrisisInfo.canExempt ? (
                <button
                  onClick={() => { exemptTax(); setTaxCrisisInfo(null); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-blue-700 hover:bg-blue-500 text-white border border-blue-400">
                  🛡️ 💎{taxCrisisInfo.exemptCost}로 다음 세금 면제 예약
                </button>
              ) : (
                <div className="text-xs text-gray-500 text-center border border-gray-700 rounded-lg py-2">
                  보석도 부족합니다 (필요: 💎{taxCrisisInfo.exemptCost}). 빠르게 무역하세요!
                </div>
              )}
              <button
                onClick={() => setTaxCrisisInfo(null)}
                className="w-full py-2 rounded-xl text-sm text-gray-400 hover:text-gray-200 border border-gray-700">
                닫기 (위험 감수)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일일 목표 모달 */}
      {showDailyGoals && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4" onClick={() => setShowDailyGoals(false)}>
          <div className="bg-ocean-dark border-2 border-yellow-500 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 py-4 border-b border-yellow-600">
              <div>
                <span className="text-lg font-bold text-yellow-400">🌅 일일 목표</span>
                <span className="text-xs text-gray-400 ml-3">리셋까지: {dailyCountdown}</span>
              </div>
              <button onClick={() => setShowDailyGoals(false)} className="text-gray-400 hover:text-gold text-xl">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {dailyGoals.map(g => {
                const pct = Math.min(100, (g.progress / g.target) * 100);
                const progressText = g.type === 'dg_gold'
                  ? `${Math.floor(g.progress).toLocaleString()} / ${g.target.toLocaleString()}금`
                  : `${g.progress} / ${g.target}`;
                return (
                  <div key={g.id} className={`rounded-xl p-4 border ${g.completed ? 'border-green-500 bg-green-950' : 'border-gray-600 bg-ocean-blue'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`font-bold text-sm ${g.completed ? 'text-green-400' : 'text-yellow-300'}`}>{g.completed ? '✅ ' : ''}{g.title}</span>
                      <span className="text-xs text-yellow-200 whitespace-nowrap ml-2">+{g.rewardGold.toLocaleString()}금{g.rewardGems ? ` +${g.rewardGems}💎` : ''}</span>
                    </div>
                    <div className="text-xs text-gray-400 mb-3">{g.desc}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-ocean-dark rounded-full h-2">
                        <div className={`${g.completed ? 'bg-green-400' : 'bg-yellow-400'} rounded-full h-2 transition-all`} style={{width:`${pct}%`}}/>
                      </div>
                      <span className="text-xs text-yellow-300 whitespace-nowrap font-bold">{progressText}</span>
                    </div>
                    {g.completed && <div className="text-xs text-green-400 mt-2 font-bold">🎉 완료! 보상이 자동 지급되었습니다.</div>}
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-yellow-600/40 text-xs text-gray-500 text-center">
              매일 자정에 새로운 목표가 생성됩니다
            </div>
          </div>
        </div>
      )}

      {/* 퀘스트 모달 */}
      {showQuests && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-40 flex items-center justify-center p-4">
          <div className="bg-ocean-dark border-2 border-gold rounded-xl w-full max-w-xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gold">
              <span className="text-lg font-bold text-gold">📋 퀘스트 수주소</span>
              <button onClick={() => setShowQuests(false)} className="text-gray-400 hover:text-gold text-xl">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              {/* 수주 가능 */}
              <div className="text-xs font-bold text-gold mb-2 flex items-center gap-2">
                <span>수주 가능 <span className="text-gray-400 font-normal">(매 시세 갱신마다 순환)</span></span>
              </div>
              {!pricesReady
                ? <div className="text-xs text-gray-400 text-center py-4 flex items-center justify-center gap-2"><span className="animate-spin inline-block">⏳</span> 정보를 가져오는 중...</div>
                : gs.availableQuests.length === 0
                ? <div className="text-center py-6 px-3">
                    <div className="text-2xl mb-2">📋</div>
                    <div className="text-xs text-gray-400 leading-relaxed">현재 사용 가능한 퀘스트가 없습니다.<br/>항구에 정박하면 새 퀘스트를 얻을 수 있습니다.</div>
                  </div>
                : gs.availableQuests.map(q => (
                  <div key={q.id} className="bg-ocean-blue rounded-lg p-3 mb-2 border border-gray-700">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-gold text-sm">{q.title}</span>
                      <span className="text-yellow-300 text-xs whitespace-nowrap ml-2">+{q.rewardGold.toLocaleString()}금{q.rewardGems ? ` +${q.rewardGems}💎` : ''}</span>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">{q.desc}</div>
                    <button onClick={() => acceptQuest(q.id)}
                      disabled={gs.activeQuests.length >= 3}
                      className="px-3 py-1 rounded text-xs font-bold bg-gold text-ocean-dark hover:bg-yellow-300 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed">
                      {gs.activeQuests.length >= 3 ? '슬롯 가득 (최대 3개)' : '수주'}
                    </button>
                  </div>
                ))}

              {/* 진행 중 */}
              {gs.activeQuests.length > 0 && (
                <>
                  <div className="text-xs font-bold text-gold mb-2 mt-4">진행 중 ({gs.activeQuests.length}/3)</div>
                  {gs.activeQuests.map(q => (
                    <div key={q.id} className={`rounded-lg p-3 mb-2 border ${q.completed ? 'border-green-500 bg-green-950' : 'border-gray-600 bg-ocean-blue'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-gold text-sm">{q.title}</span>
                        <span className="text-yellow-300 text-xs whitespace-nowrap ml-2">+{q.rewardGold.toLocaleString()}금{q.rewardGems ? ` +${q.rewardGems}💎` : ''}</span>
                      </div>
                      {(q.type==='deliver'||q.type==='dg_deliver') && q.targetPortName && (
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs bg-blue-900 border border-blue-600 text-blue-300 px-1.5 py-0.5 rounded font-bold">📍 목적지: {q.targetPortName}</span>
                          <span className="text-xs text-gray-600">| {q.resource} {q.progress}/{q.target}개</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mb-2">{q.desc}</div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-ocean-dark rounded-full h-1.5">
                          <div className={`${q.completed ? 'bg-green-400' : 'bg-gold'} rounded-full h-1.5 transition-all`} style={{width:`${Math.min(100,(q.progress/q.target)*100)}%`}}/>
                        </div>
                        <span className="text-xs text-gold whitespace-nowrap">
                          {q.type === 'trade' ? `${Math.floor(q.progress).toLocaleString()}/${q.target.toLocaleString()}금` : `${q.progress}/${q.target}`}
                        </span>
                      </div>
                      {q.completed
                        ? <button onClick={() => dismissQuest(q.id)} className="w-full py-1 rounded text-xs font-bold bg-green-700 hover:bg-green-500 text-white border border-green-400">✅ 완료! (보상 자동 지급됨) — 닫기</button>
                        : <button onClick={() => dismissQuest(q.id)} className="text-xs text-gray-500 hover:text-red-400">포기</button>}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 항구 시세 패널 — 좌: 상품 목록 / 우: 선택 상품 대형 차트 */}
      {showPortPrice && prices[showPortPrice] && (() => {
        const port = PORTS[showPortPrice];
        const rs = REGION_STYLE[port.region];
        const allRes = Object.entries(RESOURCES).map(([res, { icon }]) => {
          const hist = priceHistory[showPortPrice]?.[res] || [];
          const cur2 = hist[hist.length - 1] ?? prices[showPortPrice][res];
          const prev2 = hist[hist.length - 2] ?? cur2;
          const delta = cur2 - prev2;
          const pct = prev2 > 0 ? (delta / prev2 * 100) : 0;
          return { res, icon, hist, cur2, prev2, delta, pct,
            minH: Math.min(...(hist.length ? hist : [cur2])),
            maxH: Math.max(...(hist.length ? hist : [cur2])) };
        });
        const risers  = allRes.filter(r => r.delta > 0).length;
        const fallers = allRes.filter(r => r.delta < 0).length;
        const selRes  = selectedPortRes ?? allRes[0]?.res;
        const detail  = allRes.find(r => r.res === selRes) ?? allRes[0];
        const portAccess = getPortAccessState(showPortPrice, gs.totalEarned);
        const visitedPort = (gs.visitedPorts || getInitialVisitedPorts()).includes(showPortPrice);
        const routeCandidate = routeMode && cur;
        const routeAccess = portAccess;
        const routeCrewCount = cur ? gs.crew.filter(c => c.shipId === cur.id).length : 0;
        const routeSamePort = cur ? Math.hypot(cur.x - port.x, cur.y - port.y) < 1 : false;
        const canConfirmRoute = !!routeCandidate && routeAccess.unlocked && routeCrewCount > 0 && !routeSamePort;

        const renderChart = (d, W, H) => {
          if (!d) return null;
          const { hist, cur2, delta, minH, maxH } = d;
          const isUp = delta > 0, isDown = delta < 0;
          const lineColor = isUp ? '#22c55e' : isDown ? '#ef4444' : '#64748b';
          const glowColor = isUp ? '#22c55e33' : isDown ? '#ef444433' : '#64748b22';
          const range = (maxH - minH) || 1;
          const pts = hist.length > 1 ? hist : [cur2, cur2];
          const toY = v => H - ((v - minH) / range) * (H - 6) - 3;
          return (
            <PriceChartCanvas
              values={pts}
              min={minH}
              max={maxH}
              lineColor={lineColor}
              fillColor={lineColor}
              glowColor={glowColor}
              width={W}
              height={H}
            />
          );
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => { setShowPortPrice(null); setSelectedPortRes(null); }} onPointerDown={e => e.stopPropagation()}>
            <div className="w-[700px] max-h-[90vh] game-modal-frame flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-700"
              style={{backgroundColor:'#0b1623'}} onClick={e => e.stopPropagation()}>

              {/* ── 헤더 ── */}
              <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0" style={{background:'#0f1e30', borderBottom:'1px solid #1e3a5f'}}>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-lg font-bold text-white">{port.country} {port.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:rs.color+'22', color:rs.color, border:`1px solid ${rs.color}55`}}>{rs.icon} {rs.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">● 거래소 개장</span>
                    {!portAccess.unlocked && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-600 font-bold">항로 잠김</span>}
                    {portAccess.unlocked && !visitedPort && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold">미방문</span>}
                    {routeCandidate && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-950 text-yellow-300 border border-yellow-700 font-bold">목적지 후보</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>상품 {allRes.length}종</span>
                    <span className="text-emerald-500">▲ {risers}종 상승</span>
                    <span className="text-red-500">▼ {fallers}종 하락</span>
                    <span className="text-slate-600">{allRes.length - risers - fallers}종 보합</span>
                    {!portAccess.unlocked && <span className="text-yellow-400">해금: {portAccess.label}</span>}
                  </div>
                </div>
                <button onClick={() => { setShowPortPrice(null); setSelectedPortRes(null); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition-colors text-lg">✕</button>
              </div>

              {/* ── 본문: 좌측 목록 + 우측 차트 ── */}
              <div className="flex flex-1 min-h-0">
                {/* 좌: 상품 목록 */}
                <div className="w-44 flex-shrink-0 overflow-y-auto" style={{background:'#0a1520', borderRight:'1px solid #1e3a5f'}}>
                  {allRes.map(({ res, icon, cur2, delta, pct }) => {
                    const isUp = delta > 0, isDown = delta < 0;
                    const isSel = res === selRes;
                    return (
                      <button key={res}
                        onClick={() => setSelectedPortRes(res)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors"
                        style={{
                          background: isSel ? '#132233' : 'transparent',
                          borderLeft: isSel ? '3px solid #3b82f6' : '3px solid transparent',
                          borderBottom: '1px solid #1e3a5f22'
                        }}>
                        <span className="text-lg leading-none">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate">{res}</div>
                          <div className="text-xs text-slate-400">{cur2.toLocaleString()}</div>
                        </div>
                        <div className={`text-xs font-bold shrink-0 ${isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-slate-500'}`}>
                          {isUp ? '▲' : isDown ? '▼' : '─'}{Math.abs(pct).toFixed(1)}%
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 우: 선택 상품 상세 */}
                <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
                  {detail ? (() => {
                    const { res, icon, cur2, delta, pct, minH, maxH } = detail;
                    const isUp = delta > 0, isDown = delta < 0;
                    return (
                      <>
                        {/* 상품명 + 현재가 */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">{icon}</span>
                            <div>
                              <div className="text-lg font-bold text-white">{res}</div>
                              <div className="text-xs text-slate-500">{port.name} 현재 시세</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-white">{cur2.toLocaleString()}</div>
                            <div className={`text-sm font-bold ${isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-slate-500'}`}>
                              {isUp ? '▲ +' : isDown ? '▼ ' : ''}{delta} ({isUp ? '+' : ''}{pct.toFixed(1)}%)
                            </div>
                          </div>
                        </div>

                        {/* 대형 차트 */}
                        <div className="w-full rounded-xl overflow-hidden" style={{height:160, background:'#060e18', border:'1px solid #1e3a5f'}}>
                          {renderChart(detail, 500, 160)}
                        </div>

                        {/* 고/저/변동 */}
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label:'최고가', val: maxH.toLocaleString(), color:'text-emerald-400' },
                            { label:'최저가', val: minH.toLocaleString(), color:'text-red-400' },
                            { label:'변동폭', val: (maxH - minH).toLocaleString(), color:'text-slate-300' },
                          ].map(({ label, val, color }) => (
                            <div key={label} className="rounded-lg px-3 py-2.5 text-center" style={{background:'#0f1e30', border:'1px solid #1e3a5f'}}>
                              <div className="text-xs text-slate-500 mb-1">{label}</div>
                              <div className={`text-base font-bold ${color}`}>{val}</div>
                            </div>
                          ))}
                        </div>

                        {/* 거래 안내 */}
                        <div className="rounded-lg px-4 py-3 flex items-center justify-between" style={{background:'#0f1e30', border:'1px solid #1e3a5f'}}>
                          <span className="text-xs text-slate-400">판매 수수료 {TRADE_FEE_PCT}% · 구매 수수료 없음</span>
                          <div className="flex gap-4 text-sm font-bold">
                            <span className="text-yellow-400">매입 {getBuyTotal(cur2, 1).toLocaleString()}</span>
                            <span className="text-emerald-400">판매 {getSellTotal(cur2, 1, TRADE_FEE_PCT).toLocaleString()}</span>
                          </div>
                        </div>

                        {routeCandidate && (
                          <div className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-3" style={{background:'#132233', border:'1px solid #d4a57466'}}>
                            <div className="flex-1 min-w-[220px]">
                              <div className="text-sm font-bold text-gold">목적지 확인</div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {cur.name} → {port.country} {port.name}
                                {!routeAccess.unlocked && ` · ${routeAccess.label}`}
                                {routeCrewCount < 1 && ' · 승무원 필요'}
                                {routeSamePort && ' · 현재 위치'}
                              </div>
                            </div>
                            <button
                              onClick={() => chooseDestinationPort(showPortPrice)}
                              disabled={!canConfirmRoute}
                              className={`h-11 px-5 game-button-gold-frame rounded-lg font-black text-sm bg-gold text-ocean-dark hover:bg-yellow-300 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 border border-yellow-300 inline-flex items-center gap-2 ${tutorialPhase === 'confirm' ? 'animate-pulse ring-2 ring-yellow-100' : ''}`}>
                              <UiIcon name="compass" className="w-5 h-5" /> 목적지 확정
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })() : (
                    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">좌측에서 상품을 선택하세요</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 시장 팝업 — 매입+판매 통합 (루트 레벨, 맵 이벤트 간섭 없음) */}
      {atPort && showMarket && cur && prices[portKey] && (() => {
        const port = PORTS[portKey];
        const rs = REGION_STYLE[port.region];
        const nativeRes = REGION_NATIVE_RES[port.region];
        const feeR = getFeeRate(st?.tradePct);
        const spaceLeft = (st?.capacity || 0) - cargoN(cur);
        const resources = Object.entries(RESOURCES).map(([res, { icon }]) => {
          const tier = RESOURCE_TIER[res] || 1;
          const unlocked = res === nativeRes || tier === 1 || (gs.totalEarned || 0) >= (TIER_GOLD_REQ[tier] || 0);
          const hist = priceHistory[portKey]?.[res] || [];
          const curPrice = hist[hist.length - 1] ?? prices[portKey]?.[res] ?? 0;
          const prevPrice = hist[hist.length - 2] ?? curPrice;
          const delta = curPrice - prevPrice;
          const pct = prevPrice > 0 ? (delta / prevPrice) * 100 : 0;
          const buyP = getBuyTotal(getBuy(res), 1);
          const sellP = getSellTotal(getSell(res), 1, feeR);
          const owned = cur.cargo[res] || 0;
          const canBuy = unlocked && spaceLeft > 0 && gs.gold >= buyP;
          const canSell = owned > 0;
          return { res, icon, tier, unlocked, hist, curPrice, prevPrice, delta, pct, buyP, sellP, owned,
            canBuy, canSell, tradeable: canBuy || canSell,
            minH: Math.min(...(hist.length ? hist : [curPrice])),
            maxH: Math.max(...(hist.length ? hist : [curPrice])) };
        });
        const sortedResources = [...resources].sort((a, b) => Number(b.tradeable) - Number(a.tradeable));
        const firstUnlocked = resources.find(r => r.unlocked)?.res || resources[0]?.res;
        const selRes = resources.some(r => r.res === selectedPortRes && r.unlocked) ? selectedPortRes : firstUnlocked;
        const detail = resources.find(r => r.res === selRes) || resources[0];
        const maxBuyQty = detail ? Math.max(0, Math.min(spaceLeft, Math.floor(gs.gold / detail.buyP))) : 0;
        const maxSellQty = detail?.owned || 0;
        const buyQty = clampTradeQuantity(tradeQty, maxBuyQty);
        const sellQty = clampTradeQuantity(tradeQty, maxSellQty);
        const buyPreview = detail ? getTradePreview({ mode: 'buy', unitPrice: detail.buyP, quantity: buyQty, gold: gs.gold, cargo: cargoN(cur), capacity: st?.capacity || 0 }) : null;
        const sellPreview = detail ? getTradePreview({ mode: 'sell', unitPrice: detail.sellP, quantity: sellQty, gold: gs.gold, cargo: cargoN(cur), capacity: st?.capacity || 0 }) : null;
        const actionHint = detail?.owned > 0 && detail.delta >= 0
          ? '보유 중이고 가격이 버티고 있어 판매 후보입니다.'
          : detail?.delta < 0 && maxBuyQty > 0
            ? '가격이 내려가 매입을 검토하기 좋은 구간입니다.'
            : maxBuyQty > 0
              ? '화물 여유가 있으면 소량 매입해 다음 항구를 노려볼 수 있습니다.'
              : '화물칸이나 금화를 확보한 뒤 거래할 수 있습니다.';
        const bestSell = resources.filter(r => r.owned > 0).sort((a, b) => b.sellP - a.sellP)[0];
        const risers = resources.filter(r => r.delta > 0).length;
        const fallers = resources.filter(r => r.delta < 0).length;
        const renderMarketChart = (d, W, H) => {
          if (!d) return null;
          const isUp = d.delta > 0, isDown = d.delta < 0;
          const lineColor = isUp ? '#22c55e' : isDown ? '#ef4444' : '#64748b';
          const range = (d.maxH - d.minH) || 1;
          const pts = d.hist.length > 1 ? d.hist : [d.curPrice, d.curPrice];
          const toY = v => H - ((v - d.minH) / range) * (H - 8) - 4;
          return (
            <PriceChartCanvas
              values={pts}
              min={d.minH}
              max={d.maxH}
              lineColor={lineColor}
              fillColor={isUp ? 'rgba(34,197,94,0.18)' : isDown ? 'rgba(239,68,68,0.16)' : 'rgba(100,116,139,0.10)'}
              glowColor="rgba(100,116,139,0)"
              width={W}
              height={H}
              showDot={false}
            />
          );
        };
        return (
          <div key="market-modal" className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 backdrop-blur-[1px] p-4" onClick={() => setShowMarket(false)}>
            <div className="w-[860px] max-w-[96vw] max-h-[92vh] game-modal-frame market-command-panel bg-ocean-dark border border-gold rounded-xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gold/25 flex-shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg font-bold text-gold truncate inline-flex items-center gap-2"><UiIcon name="market-stall" className="w-6 h-6" /> {port.country} {port.name} 거래소</span>
                    <span className="text-xs px-2 py-1 rounded-full font-bold" style={{background:rs.color+'22', color:rs.color, border:`1px solid ${rs.color}55`}}>{rs.icon} {rs.label}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    보유 {gs.gold.toLocaleString()}금 · 화물 {cargoN(cur)}/{st?.capacity} · 상승 {risers}종 · 하락 {fallers}종
                  </div>
                </div>
                <button onClick={() => setShowMarket(false)} className="w-10 h-10 rounded-full text-gray-400 hover:text-white hover:bg-white/10 text-xl">✕</button>
              </div>

              <div className="market-summary-strip">
                <div className="market-summary-chip"><span>보유 금화</span><b>{gs.gold.toLocaleString()}금</b></div>
                <div className="market-summary-chip"><span>화물칸</span><b>{cargoN(cur)}/{st?.capacity}</b></div>
                <div className="market-summary-chip"><span>상승 / 하락</span><b className="text-green-300">{risers} / <span className="text-red-300">{fallers}</span></b></div>
                <div className="market-summary-chip"><span>판매 수수료</span><b>{feeR}%</b></div>
              </div>

              {bestSell && (
                <button onClick={() => setSelectedPortRes(bestSell.res)}
                  className="mx-4 mt-3 px-3 py-2 rounded-lg border border-green-700/55 bg-green-950/40 text-left text-xs flex items-center gap-2">
                  <span className="text-gray-400">추천 판매</span>
                  <ResourceIcon res={bestSell.res} className="w-7 h-7" />
                  <span className="font-bold text-white">{bestSell.res}</span>
                  <span className="text-green-400 font-bold ml-auto">{bestSell.sellP.toLocaleString()}금/개 × {bestSell.owned}</span>
                </button>
              )}

              <div className="flex flex-row-reverse flex-1 min-h-0 p-4 gap-4 overflow-hidden">
                <div className="w-72 max-w-[34vw] min-w-[240px] flex-shrink-0 rounded-lg overflow-hidden border border-gold/20 bg-slate-950/60 shadow-inner">
                  <div className="px-3 py-2 text-xs font-bold text-gold border-b border-gold/20 bg-ocean-blue/45 flex items-center justify-between">
                    <span>물품 목록</span>
                    <span className="text-[10px] text-emerald-200">거래 가능 우선</span>
                  </div>
                  <div className="overflow-y-auto max-h-[54vh]">
                    {sortedResources.map(item => {
                      const isSel = item.res === detail?.res;
                      const trend = item.delta > 0 ? '▲' : item.delta < 0 ? '▼' : '━';
                      if (!item.unlocked) {
                        return (
                          <div key={item.res} className="px-3 py-2.5 border-b border-white/5 opacity-45 flex items-center gap-2">
                            <span className="icon-chip w-8 h-8 rounded bg-slate-900/80"><ResourceIcon res={item.res} className="w-6 h-6" /></span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold truncate">{item.res}</div>
                              <div className="text-[11px] text-gray-500">누적 {TIER_LABEL[item.tier]} 해금</div>
                            </div>
                            <span className="text-gray-500">🔒</span>
                          </div>
                        );
                      }
                      return (
                        <button key={item.res} onClick={() => setSelectedPortRes(item.res)}
                          className={`w-full px-3 py-2.5 border-b text-left flex items-center gap-2 transition-colors ${isSel?'bg-gold text-ocean-dark border-gold shadow-[inset_0_0_0_1px_rgba(255,255,255,.35)]':item.canSell?'bg-emerald-950/55 border-emerald-700/70 text-emerald-50 hover:bg-emerald-900/65':item.canBuy?'bg-yellow-950/45 border-yellow-700/60 text-yellow-50 hover:bg-yellow-900/55':'border-white/10 bg-slate-900/40 hover:bg-ocean-blue/70 text-gray-200'}`}>
                          <span className={`icon-chip w-9 h-9 rounded-lg ${isSel?'bg-ocean-dark/15':'bg-black/35 ring-1 ring-white/10'}`}><ResourceIcon res={item.res} className="w-7 h-7" /></span>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate">{item.res}{item.res === nativeRes && <span className="ml-1 text-[10px] text-emerald-400">지역</span>}</div>
                            <div className={`text-[11px] ${isSel?'text-ocean-dark/70':'text-gray-300'}`}>보유 {item.owned} · 매입 {item.buyP.toLocaleString()}금 · 판매 {item.sellP.toLocaleString()}금</div>
                            <div className="mt-1 flex gap-1">
                              {item.canSell && <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${isSel?'bg-emerald-900/20 text-emerald-900':'bg-emerald-800/80 text-emerald-50'}`}>판매 가능</span>}
                              {item.canBuy && <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${isSel?'bg-yellow-900/20 text-yellow-900':'bg-yellow-700/80 text-yellow-50'}`}>구매 가능</span>}
                            </div>
                          </div>
                          <div className={`text-xs font-bold ${item.delta > 0 ? (isSel?'text-green-900':'text-green-400') : item.delta < 0 ? 'text-red-400' : (isSel?'text-ocean-dark/70':'text-gray-500')}`}>
                            {trend} {Math.abs(item.pct).toFixed(1)}%
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-y-auto">
                  {detail && (
                    <>
                      <div className="rounded-lg border border-gold/15 bg-black/20 p-3">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-3">
                            <span className="icon-chip w-14 h-14 rounded-xl bg-slate-950/70 border border-gold/15"><ResourceIcon res={detail.res} className="w-11 h-11" /></span>
                            <div>
                              <div className="text-xl font-bold text-white">{detail.res}</div>
                              <div className="text-xs text-gray-400">{port.name} 현재 시세</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-white">{detail.curPrice.toLocaleString()}</div>
                            <div className={`text-sm font-bold ${detail.delta > 0 ? 'text-green-400' : detail.delta < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                              {detail.delta > 0 ? '+' : ''}{detail.delta} ({detail.delta > 0 ? '+' : ''}{detail.pct.toFixed(1)}%)
                            </div>
                          </div>
                        </div>
                        <div className="h-16 rounded-lg overflow-hidden bg-slate-950 border border-slate-700">
                          {renderMarketChart(detail, 520, 64)}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                          <div className="rounded bg-ocean-blue/50 px-3 py-2"><div className="text-[11px] text-gray-400">최고가</div><div className="text-sm font-bold text-green-300">{detail.maxH.toLocaleString()}</div></div>
                          <div className="rounded bg-ocean-blue/50 px-3 py-2"><div className="text-[11px] text-gray-400">최저가</div><div className="text-sm font-bold text-red-300">{detail.minH.toLocaleString()}</div></div>
                          <div className="rounded bg-ocean-blue/50 px-3 py-2"><div className="text-[11px] text-gray-400">판매 수수료</div><div className="text-sm font-bold text-gold">{feeR}%</div></div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gold/15 bg-black/20 p-3">
                        <div className="hidden">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-bold text-yellow-300">매입</span>
                              <span className="text-xs text-gray-400">{detail.buyP.toLocaleString()}금/개</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {[1,5,10].map(n => (
                                <button key={n} onClick={() => doBuy(detail.res,n)} disabled={gs.gold < detail.buyP * n || spaceLeft < n}
                                  className="h-10 rounded border border-yellow-700 text-yellow-200 bg-yellow-950 hover:bg-yellow-800 disabled:bg-gray-800 disabled:text-gray-600 disabled:border-gray-700">+{n}</button>
                              ))}
                              <button onClick={() => doBuy(detail.res, Math.min(spaceLeft, Math.floor(gs.gold/detail.buyP)))} disabled={gs.gold < detail.buyP || spaceLeft < 1}
                                className="h-10 rounded border border-yellow-600 text-yellow-100 bg-yellow-900 hover:bg-yellow-700 disabled:bg-gray-800 disabled:text-gray-600 disabled:border-gray-700">최대</button>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-bold text-green-300">판매</span>
                              <span className="text-xs text-gray-400">보유 {detail.owned}개 · {detail.sellP.toLocaleString()}금/개</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {[1,5,10].map(n => (
                                <button key={n} onClick={() => doSell(detail.res,n)} disabled={detail.owned < n}
                                  className="h-10 rounded border border-green-800 text-green-200 bg-green-950 hover:bg-green-800 disabled:bg-gray-800 disabled:text-gray-600 disabled:border-gray-700">-{n}</button>
                              ))}
                              <button onClick={() => doSell(detail.res, detail.owned)} disabled={detail.owned < 1}
                                className="h-10 rounded border border-green-600 text-green-100 bg-green-900 hover:bg-green-700 disabled:bg-gray-800 disabled:text-gray-600 disabled:border-gray-700">전량</button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(208px,240px)] gap-3 items-stretch">
                          <div className="rounded-lg border border-slate-700/70 bg-slate-950/50 p-3">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-bold text-white">거래 수량</span>
                              <span className="text-xs text-gray-400">적재 {spaceLeft} · 보유 {detail.owned}</span>
                            </div>
                            <div className="grid grid-cols-[44px_1fr_44px] gap-2 mb-3">
                              <button onClick={() => setTradeQty(q => clampTradeQuantity(q - 1, Math.max(maxBuyQty, maxSellQty)))}
                                className="h-11 rounded-lg border border-slate-600 bg-slate-800 text-xl text-white hover:bg-slate-700">-</button>
                              <div className="h-11 rounded-lg border border-gold/25 bg-ocean-blue flex items-center justify-center text-xl font-bold text-gold">
                                {clampTradeQuantity(tradeQty, Math.max(maxBuyQty, maxSellQty))}
                              </div>
                              <button onClick={() => setTradeQty(q => clampTradeQuantity(q + 1, Math.max(maxBuyQty, maxSellQty)))}
                                className="h-11 rounded-lg border border-slate-600 bg-slate-800 text-xl text-white hover:bg-slate-700">+</button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {[1,5,10].map(n => (
                                <button key={n} onClick={() => setTradeQty(clampTradeQuantity(n, Math.max(maxBuyQty, maxSellQty)))}
                                  className="h-9 rounded border border-slate-600 text-gray-200 bg-slate-800 hover:bg-slate-700">{n}</button>
                              ))}
                              <button onClick={() => setTradeQty(Math.max(maxBuyQty, maxSellQty))}
                                className="h-9 rounded border border-gold/60 text-gold bg-yellow-950/50 hover:bg-yellow-900">최대</button>
                            </div>
                          </div>
                          <div className="min-w-0 grid grid-rows-2 gap-3">
                            <button onClick={() => doBuy(detail.res, buyQty)} disabled={buyQty < 1}
                              className="game-button-gold-frame rounded-lg border border-yellow-500 bg-yellow-600 text-ocean-dark hover:bg-yellow-400 disabled:bg-gray-800 disabled:text-gray-600 disabled:border-gray-700 p-3 text-left relative overflow-hidden">
                              {tradeDone?.type === 'buy' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-yellow-400 text-ocean-dark font-black text-base rounded-lg z-10">✓ 완료!</div>
                              )}
                              {buyPreview && <div className="mb-1 text-[11px] font-bold opacity-80">거래 후 {buyPreview.nextGold.toLocaleString()}금 · 화물 {buyPreview.nextCargo}/{st?.capacity}</div>}
                              <div className="text-xs font-bold opacity-80">매입 {buyQty}개</div>
                              <div className="text-lg font-black">{(detail.buyP * buyQty).toLocaleString()}금</div>
                              <div className="text-[11px] opacity-80">단가 {detail.buyP.toLocaleString()}금</div>
                            </button>
                            <button onClick={() => doSell(detail.res, sellQty)} disabled={sellQty < 1}
                              className="game-button-ocean-frame rounded-lg border border-green-500 bg-green-700 text-white hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:border-gray-700 p-3 text-left relative overflow-hidden">
                              {tradeDone?.type === 'sell' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-green-400 text-ocean-dark font-black text-base rounded-lg z-10">✓ 완료!</div>
                              )}
                              {sellPreview && <div className="mb-1 text-[11px] font-bold opacity-80">거래 후 {sellPreview.nextGold.toLocaleString()}금 · 화물 {sellPreview.nextCargo}/{st?.capacity}</div>}
                              <div className="text-xs font-bold opacity-80">판매 {sellQty}개</div>
                              <div className="text-lg font-black">{(detail.sellP * sellQty).toLocaleString()}금</div>
                              <div className="text-[11px] opacity-80">단가 {detail.sellP.toLocaleString()}금</div>
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 border-t border-gold/20 flex-shrink-0 flex flex-wrap gap-2 bg-black/10">
                {cargoN(cur) > 0 && (
                  <button onClick={() => Object.entries(cur.cargo).forEach(([r,n]) => doSell(r,n))}
                    className="h-10 px-4 rounded font-bold bg-green-800 hover:bg-green-600 text-green-100 border border-green-600">
                    전체 판매 ({cargoSellTotal(cur, portKey).toLocaleString()}금)
                  </button>
                )}
                <button onClick={refuel} className="h-10 px-4 rounded bg-orange-900 hover:bg-orange-700 text-orange-100 border border-orange-700 inline-flex items-center gap-2"><UiIcon name="fuel-barrel" className="w-5 h-5" /> 보충 ({Math.floor((100-(cur?.fuel??100))*2)}금)</button>
                <button onClick={doRepair} className="h-10 px-4 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 inline-flex items-center gap-2"><UiIcon name="repair-hammer" className="w-5 h-5" /> 수리 ({Math.floor((100-(cur?.hull??100))*5)}금)</button>
              </div>
            </div>
          </div>
        );
      })()}

      {false && atPort && showMarket && cur && (() => {
        const portRegion = PORTS[portKey]?.region;
        const nativeRes  = REGION_NATIVE_RES[portRegion];
        const feeR       = getFeeRate(st?.tradePct);
        const spaceLeft  = (st?.capacity || 0) - cargoN(cur);
        return (
        <div key="market-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowMarket(false)}>
        <div className="w-[360px] max-h-[88vh] bg-ocean-dark border border-gold rounded-xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
          {/* 헤더 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gold flex-shrink-0">
            <div className="text-sm font-bold text-gold">🏪 {PORTS[portKey]?.name} 시장</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{gs.gold.toLocaleString()}금</span>
              <button onClick={() => setShowMarket(false)} className="text-gray-400 hover:text-gold">✕</button>
            </div>
          </div>
          {/* 추천 시세 — 보유 화물 중 판매가 가장 높은 품목 */}
          {(() => {
            const best = Object.entries(cur.cargo)
              .map(([r, n]) => ({ r, n, p: getSell(r) }))
              .filter(x => x.n > 0 && x.p > 0)
              .sort((a, b) => b.p - a.p)[0];
            if (!best) return null;
            return (
              <div className="px-3 py-1.5 border-b border-gold/20 flex-shrink-0 flex items-center gap-2 bg-green-950/40">
                <span className="text-[10px] text-gray-500">추천 판매</span>
                <span className="text-sm">{RESOURCES[best.r]?.icon}</span>
                <span className="text-xs font-bold text-white">{best.r}</span>
                <span className="text-xs text-green-400 font-bold ml-auto">{best.p.toLocaleString()}금/개</span>
                <span className="text-[10px] text-green-600">× {best.n} = {(best.p * best.n).toLocaleString()}금</span>
              </div>
            );
          })()}
          {/* 화물 바 */}
          <div className="px-3 py-1.5 border-b border-gold/30 flex-shrink-0 flex items-center gap-2">
            <span className="text-xs text-gray-400">화물</span>
            <div className="flex-1 bg-ocean-blue rounded-full h-1.5"><div className="bg-gold rounded-full h-1.5" style={{width:`${Math.min(100,cargoN(cur)/(st?.capacity||1)*100)}%`}}/></div>
            <span className="text-xs text-gold font-bold">{cargoN(cur)}/{st?.capacity}</span>
          </div>
          {/* 컬럼 헤더 */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-1 px-2 py-1 text-[10px] text-gray-500 border-b border-gray-800 flex-shrink-0">
            <span>자원</span><span className="text-yellow-600 text-right">매입</span><span className="text-green-700 text-right">판매 (보유)</span>
          </div>
          {/* 자원 목록 */}
          <div className="overflow-y-auto flex-1 px-2 py-1">
            {Object.entries(RESOURCES).map(([r, {icon}]) => {
              const tier = RESOURCE_TIER[r] || 1;
              const isNative = r === nativeRes;
              const unlocked = isNative || tier === 1 || (gs.totalEarned || 0) >= (TIER_GOLD_REQ[tier] || 0);
              const baseP = getBuy(r);
              const buyP = getBuyTotal(baseP, 1);
              const sellP = getSellTotal(baseP, 1, feeR);
              const owned = cur.cargo[r] || 0;
              const canAfford = gs.gold >= buyP;
              if (!unlocked) {
                return (
                  <div key={r} className="flex items-center gap-1 py-1 border-b border-gray-800 last:border-0 opacity-50 cursor-pointer group"
                    title={`누적 ${TIER_LABEL[tier]} 판매 시 해금`}>
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="text-sm">{icon}</span>
                      <span className="text-xs text-gray-500 truncate">{r}</span>
                      <span className="text-xs text-gray-600">🔒</span>
                    </div>
                    <span className="text-[10px] text-gray-600 flex-shrink-0">누적 {TIER_LABEL[tier]} 해금</span>
                  </div>
                );
              }
              return (
                <div key={r} className="py-1 border-b border-gray-800 last:border-0">
                  {/* 자원 이름 + 가격 */}
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-sm">{icon}</span>
                    <span className="text-xs font-bold text-gray-200 flex-1">{r}{isNative && <span className="text-[9px] text-emerald-500 ml-1">★지역</span>}</span>
                    <span className="text-[10px] text-yellow-400">매입 {buyP.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-500 mx-1">·</span>
                    <span className="text-[10px] text-green-400">판매 {sellP.toLocaleString()}</span>
                  </div>
                  {/* 매입 버튼 */}
                  <div className="flex gap-0.5">
                    <span className="text-[10px] text-yellow-600 w-7 flex-shrink-0 self-center">매입</span>
                    {[1,5,10].map(n => <button key={n} onClick={() => doBuy(r,n)} disabled={!canAfford||spaceLeft<n}
                      className={`flex-1 py-0.5 rounded text-[10px] font-bold border ${canAfford&&spaceLeft>=n?'border-gold/60 text-yellow-400 hover:bg-gold hover:text-ocean-dark':'border-gray-700 text-gray-600 cursor-not-allowed'}`}>+{n}</button>)}
                    <button onClick={() => doBuy(r, Math.min(spaceLeft, Math.floor(gs.gold/buyP)))} disabled={!canAfford||spaceLeft<1}
                      className={`flex-1 py-0.5 rounded text-[10px] font-bold border ${canAfford&&spaceLeft>=1?'border-yellow-600 text-yellow-500 hover:bg-yellow-900':'border-gray-700 text-gray-600 cursor-not-allowed'}`}>최대</button>
                  </div>
                  {/* 판매 버튼 */}
                  <div className="flex gap-0.5 mt-0.5">
                    <span className="text-[10px] text-green-700 w-7 flex-shrink-0 self-center">판매<span className="text-gray-500">×{owned}</span></span>
                    {[1,5,10].map(n => <button key={n} onClick={() => doSell(r,n)} disabled={owned<n}
                      className={`flex-1 py-0.5 rounded text-[10px] font-bold border ${owned>=n?'border-green-800 text-green-400 hover:bg-green-900':'border-gray-700 text-gray-600 cursor-not-allowed'}`}>-{n}</button>)}
                    <button onClick={() => doSell(r, owned)} disabled={owned<1}
                      className={`flex-1 py-0.5 rounded text-[10px] font-bold border ${owned>=1?'border-green-600 text-green-300 hover:bg-green-800':'border-gray-700 text-gray-600 cursor-not-allowed'}`}>전량</button>
                  </div>
                </div>
              );
            })}
          </div>
          {/* 전체 판매 + 정비 버튼 */}
          <div className="px-2 py-1.5 border-t border-gold/30 flex-shrink-0 space-y-1">
            {cargoN(cur) > 0 && (
              <button onClick={() => Object.entries(cur.cargo).forEach(([r,n]) => doSell(r,n))}
                className="w-full py-1 rounded text-xs font-bold bg-green-800 hover:bg-green-600 text-green-200 border border-green-600">
                💰 전체 판매 ({cargoSellTotal(cur, portKey).toLocaleString()}금)
              </button>
            )}
            <div className="flex gap-1">
              <button onClick={refuel} className="flex-1 py-1 rounded text-xs bg-orange-900 hover:bg-orange-700 text-orange-200 border border-orange-700">⛽ 보충 ({Math.floor((100-(cur?.fuel??100))*2)}금)</button>
              <button onClick={doRepair} className="flex-1 py-1 rounded text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600">🔧 수리 ({Math.floor((100-(cur?.hull??100))*5)}금)</button>
            </div>
          </div>
        </div>
        </div>
        );
      })()}

      {/* 큰 거래 보상 연출 (Peak-End Rule) */}
      {bigTradePopup && (
        <div
          key={bigTradePopup.id}
          className="animate-gold-float fixed top-20 left-1/2 z-[200] -translate-x-1/2 px-6 py-3 rounded-xl border border-yellow-400 bg-yellow-950/80 text-yellow-300 text-2xl font-black shadow-xl shadow-yellow-900/40 select-none"
          style={{ textShadow: '0 0 16px #fbbf24' }}
        >
          +{bigTradePopup.amount.toLocaleString()}금
        </div>
      )}

      {/* 정보 팝업 (루트 레벨) */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowInfo(false)}>
        <div className="w-80 max-h-[85vh] bg-ocean-dark border border-blue-500 rounded-xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-blue-500 flex-shrink-0">
            <div>
              <span className="text-sm font-bold text-blue-300">📰 국제 정보 시장</span>
              {gs.taxLevel > 1 && <span className="text-xs text-orange-400 ml-2">시대 Lv.{gs.taxLevel} 가격 적용</span>}
            </div>
            <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gold">✕</button>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {PORT_INFO.map(info => {
              const cost = infoCurrentCost(info, gs.infoBuyCounts, gs.taxLevel);
              const cnt  = gs.infoBuyCounts[info.id] || 0;
              const premKey = !info.repeat ? info.id : null;
              const bought  = premKey && gs.purchasedInfo[premKey];
              return (
                <div key={info.id} className="bg-ocean-blue rounded-lg p-2.5 mb-2 text-xs border border-gray-700">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`font-bold ${info.tier==='premium'?'text-yellow-300':'text-gray-200'}`}>{info.tier==='premium'?'⭐':'💬'} {info.name}</span>
                    <div className="text-right text-gray-500"><div>적중률 {Math.round(info.accuracy*100)}%</div>{info.repeat&&cnt>0&&<div className="text-orange-400">×{cnt}회</div>}</div>
                  </div>
                  <div className="text-gray-400 mb-1.5">{info.desc}</div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-bold text-sm ${bought?'text-gray-500':'text-yellow-300'}`}>{bought?'완료':cost.toLocaleString()+'금'}</span>
                    {info.repeat&&cnt>0&&<span className="text-xs text-orange-400">+{Math.round((Math.pow(1.5,cnt)-1)*100)}%</span>}
                  </div>
                  <button onClick={() => buyInfo(info)} disabled={!!bought} className={`w-full py-1 rounded text-xs font-bold ${bought?'bg-gray-700 text-gray-500 cursor-not-allowed':'bg-blue-900 hover:bg-blue-700 text-blue-200 border border-blue-600'}`}>{bought?'구매 완료':'구매'}</button>
                </div>
              );
            })}
            {gs.predictions.length > 0 && (
              <div className="mt-2 border-t border-gray-700 pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-blue-300">🔮 보유 예측</span>
                  <span className="text-xs text-gray-500">{gs.predictions.filter(p => !p.applied).length}개 대기</span>
                </div>
                {[...gs.predictions].reverse().map(pred => {
                  const isPending = !pred.applied;
                  const turns = pred.turnsRemaining ?? 0;
                  return (
                  <div key={pred.id} className={`rounded px-2 py-1.5 mb-1 text-xs ${isPending ? 'bg-gray-900 border border-gray-700' : 'bg-ocean-dark opacity-70'}`}>
                    <div className="flex justify-between items-start mb-0.5">
                      <span className="flex items-center gap-1 font-bold">
                        {RESOURCES[pred.resource]?.icon}
                        <span className="text-white">{pred.resource}</span>
                        {pred.infoId==='rumor'&&isPending&&<span className="text-gray-600 font-normal">무료</span>}
                      </span>
                      <span className={pred.hit===null?'text-gray-400':pred.hit?'text-green-400':'text-red-400'}>
                        {pred.hit===null?'⏳':pred.hit?'✅':'❌'} {pred.targetPortName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={pred.direction==='up'?'text-green-400':'text-red-400'}>
                        {pred.direction==='up'?'📈 상승':'📉 하락'} ~{pred.mag}금
                      </span>
                      {isPending
                        ? <span className={`font-bold px-1.5 py-0.5 rounded ${turns===1?'bg-red-950 text-red-400':'bg-gray-800 text-gray-400'}`}>{turns}턴 후 적용</span>
                        : <span className="text-gray-600">{pred.hit?'적중':'빗나감'}</span>
                      }
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* 판매 모달 — 시장으로 통합됨 */}

      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gold border-opacity-30 flex-shrink-0">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold text-gold">⛵ Pioneer</h1>
          <p className="text-xs text-ocean-light">항해와 정보의 시대</p>
        </div>
        <div className="ml-auto nautical-hud bg-ocean-dark rounded-lg p-2 border border-gold flex flex-wrap justify-end gap-2 items-center min-w-0 max-w-[calc(100vw-230px)]">
          <div className="text-right">
            <CurrencyPill type="gold" value={gs.gold} label="금" />
            <div className="text-xs text-gray-400 mt-1">시세: <span className="text-yellow-300">{fmt(nextUpd)}</span></div>
          </div>
          <div className="border-l border-gold pl-3">
            <div className={`text-sm font-bold ${gs.taxLevel >= 15 ? 'text-red-400' : 'text-orange-300'}`}>
              {gs.taxExemptNext ? '🛡️ 면제 예약' : `🏛️ ${nextTaxAmount.toLocaleString()}금`}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span>Lv.{gs.taxLevel} — {fmt(nextTax)}</span>
              {!gs.taxExemptNext && <button onClick={exemptTax} className="inline-flex items-center hover:brightness-125" title="보석으로 다음 세금 1회 면제"><CurrencyPill type="gem" value={2+(gs.taxExemptCount||0)} compact /></button>}
            </div>
          </div>
          <div className="border-l border-gold pl-3 text-center">
            <CurrencyPill type="gem" value={gs.gems} label="보석" />
          </div>
          <button onClick={() => setShowAllCrew(true)} className="border-l border-gold pl-2 text-xs text-gray-300 hover:text-gold whitespace-nowrap">
            👥 승무원<br/><span className="text-gray-500">{gs.crew.length}명</span>
          </button>
          <button onClick={() => setShowDailyGoals(true)} className="border-l border-gold pl-2 text-xs text-gray-300 hover:text-yellow-400 whitespace-nowrap relative">
            🌅 일일목표<br/>
            <span className="text-gray-500">{dailyGoals.filter(g=>g.completed).length}/{dailyGoals.length}완료</span>
            {dailyGoals.some(g=>g.completed) && <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"/>}
          </button>
          <button onClick={() => setShowQuests(true)} className="border-l border-gold pl-2 text-xs text-gray-300 hover:text-gold whitespace-nowrap relative">
            📋 퀘스트<br/><span className="text-gray-500">{gs.activeQuests.length}/3</span>
            {completedQuests > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"/>}
          </button>
          <button onClick={saveGame} className="border-l border-gold pl-2 text-xs text-gray-300 hover:text-gold whitespace-nowrap">
            💾 저장<br/><span className="text-gray-600">{lastSaved || '—'}</span>
          </button>
          <button onClick={() => setIntroSlide(0)} className="border-l border-gold pl-2 text-xs text-gray-400 hover:text-gold">❓</button>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex flex-1 min-h-0 gap-2 p-2 overflow-hidden">
        {/* 지도 */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {(() => {
            const colorMap = {
              select:  'border-blue-400 bg-blue-950',
              depart:  'border-blue-400 bg-blue-950',
              confirm: 'border-yellow-400 bg-slate-950',
              sailing: 'border-indigo-400 bg-indigo-950',
              sell:    'border-green-500 bg-green-950',
              buy:     'border-yellow-500 bg-yellow-950',
              unlock:  'border-cyan-500 bg-cyan-950',
              done:    'border-gold/60 bg-ocean-dark',
              blue:    'border-blue-400 bg-blue-950',
            };
            return (
              <div className={`mb-1 rounded-lg border px-3 py-2 flex items-start gap-2 min-h-[76px] max-h-28 overflow-y-auto ${colorMap[advisor.tone] || colorMap.done}`}>
                <span className="text-xl flex-shrink-0 mt-0.5">{advisor.icon}</span>
                <div className="flex-1 min-w-0">
                   <div className="text-xs font-bold text-white mb-0.5">
                    {advisor.title}
                  </div>
                   <div className="text-xs text-gray-200 whitespace-pre-line leading-snug pr-1">{advisor.text}</div>
                  {advisor.goal && (
                    <div className="mt-1 flex items-center gap-2 min-w-0">
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-black text-yellow-100 flex-shrink-0">학습 목표</span>
                      <span className="truncate text-[11px] font-semibold text-blue-100">{advisor.goal}</span>
                    </div>
                  )}
                  {tutorialPhase !== 'done' && advisor.total && (
                    <div className="mt-1.5 h-1.5 rounded-full bg-black/35 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gold transition-all"
                        style={{ width: `${Math.min(100, (advisor.step / advisor.total) * 100)}%` }}
                      />
                    </div>
                  )}
                  {cur?.isMoving && (
                    <button
                      onClick={() => {
                        const turning = !followShip;
                        setFollowShip(turning);
                        if (turning && cur?.isMoving && mapRef.current) {
                          const el = mapRef.current;
                          const W = el.clientWidth, H = el.clientHeight, zoom = 5;
                          const { x, y } = clampXY(W / 2 - (cur.x / 100) * W * zoom, H / 2 - (cur.y / 100) * H * zoom, zoom);
                          setMapView({ zoom, x, y });
                        }
                      }}
                      className={`mt-1.5 px-3 py-1 rounded text-xs font-bold border transition-all
                        ${followShip
                          ? 'bg-yellow-500 text-gray-900 border-yellow-300 animate-pulse'
                          : 'bg-indigo-700 text-indigo-100 border-indigo-400 hover:bg-indigo-600'}`}
                    >
                      📍 {followShip ? '추적 중 — 클릭해서 해제' : '배 추적 켜기 (5배 줌)'}
                    </button>
                  )}
                </div>
                {tutorialPhase !== 'done' && (
                   <button onClick={() => setTutorialPhase('done')} className="text-gray-400 hover:text-white flex-shrink-0 text-xs leading-none mt-1 whitespace-nowrap">튜토리얼 숨김</button>
                )}
              </div>
            );
          })()}
          <div className="flex justify-between items-center gap-2 mb-1 min-w-0">
            <span className="text-sm font-bold text-gold">🗺️ 세계 항해도 <span className="text-xs text-gray-500 font-normal">({Object.keys(PORTS).length}개 항구 | {mapView.zoom.toFixed(1)}x)</span></span>
            <div className="flex gap-1 items-center flex-shrink-0">
              <button onClick={() => zoomAt(1.5)} className="px-2 py-0.5 bg-ocean-dark border border-gold text-gold text-xs rounded">＋</button>
              <button onClick={() => zoomAt(1 / 1.5)} className="px-2 py-0.5 bg-ocean-dark border border-gold text-gold text-xs rounded">－</button>
              <button onClick={() => setMapView(DEFAULT_MAP_VIEW)} className="px-2 py-0.5 bg-ocean-dark border border-gold text-gold text-xs rounded">⊡</button>
              <button
                onClick={() => {
                  const turning = !followShip;
                  setFollowShip(turning);
                  if (turning && cur?.isMoving && mapRef.current) {
                    const el = mapRef.current;
                    const W = el.clientWidth, H = el.clientHeight, zoom = 5;
                    const { x, y } = clampXY(W / 2 - (cur.x / 100) * W * zoom, H / 2 - (cur.y / 100) * H * zoom, zoom);
                    setMapView({ zoom, x, y });
                  }
                }}
                disabled={!cur?.isMoving}
                title={followShip ? '추적 해제' : '배 추적 (5배 줌인)'}
                className={`px-2 py-0.5 rounded text-xs font-bold border ml-1 transition-all
                  ${followShip
                    ? 'bg-yellow-500 text-gray-900 border-yellow-300 animate-pulse'
                    : cur?.isMoving
                      ? 'bg-ocean-dark border-blue-400 text-blue-300 hover:bg-blue-900'
                      : 'bg-ocean-dark border-gray-700 text-gray-600 opacity-50 cursor-not-allowed'}`}
              >
                📍 {followShip ? '추적 중' : '추적'}
              </button>
              <button onClick={() => setPaused(p => !p)} className={`px-2 py-0.5 rounded text-xs font-bold ml-1 ${paused?'bg-gold text-ocean-dark':'bg-ocean-light text-gold'}`}>{paused?'▶':'⏸'}</button>
            </div>
          </div>

          {cur && (
            <div className="mb-1 game-panel-frame rounded-lg border border-gold/40 px-3 py-2 flex items-center gap-3 flex-shrink-0 overflow-hidden">
              <div className="min-w-[132px] flex items-center gap-2">
                <ShipIcon type={cur.type} className="w-7 h-7" />
                <div className="min-w-0">
                  <div className="text-xs font-black text-gold truncate">{cur.name}</div>
                  <div className="text-[11px] text-gray-400">{cur.isMoving ? `항해 ${Math.round(journeyProgress(cur))}%` : atPort ? `${PORTS[portKey]?.name || '정박'} 정박` : '대기 중'}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                {Object.entries(cur.cargo).length === 0 ? (
                  <span className="text-xs text-gray-500">화물 없음</span>
                ) : (
                  Object.entries(cur.cargo).slice(0, 6).map(([res, qty]) => (
                    <span key={res} className="inventory-slot-frame h-9 min-w-12 rounded-lg border border-gold/30 px-1.5 inline-flex items-center justify-center gap-1 text-xs font-bold text-gold">
                      <ResourceIcon res={res} className="w-6 h-6" />
                      <span>×{qty}</span>
                    </span>
                  ))
                )}
                {Object.entries(cur.cargo).length > 6 && <span className="text-xs text-gray-500">+{Object.entries(cur.cargo).length - 6}</span>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-300 font-bold whitespace-nowrap">화물 {cargoN(cur)}<span className="text-gray-600">/{st?.capacity}</span></span>
                <div className="w-20 bg-gray-800 rounded-full h-1.5 hidden sm:block"><div className="bg-gold rounded-full h-1.5" style={{width:`${Math.min(100,cargoN(cur)/(st?.capacity||1)*100)}%`}}/></div>
                {atPort && !cur.isMoving && (
                  <button onClick={() => { setShowPortPrice(null); setSelectedPortRes(null); setShowMarket(true); }}
                    className="h-9 px-3 rounded-lg text-xs font-black bg-green-700 hover:bg-green-500 text-white border border-green-500 inline-flex items-center gap-1.5">
                    <UiIcon name="market-stall" className="w-4 h-4" /> 시장
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 relative min-h-0">
            {/* 지도 버튼 — overflow-hidden 바깥에 배치해 모달 위에 표시 */}
            <div className="absolute top-2 right-2 z-[60] flex flex-col gap-1 pointer-events-auto max-w-[112px]">
              {atPort && !cur?.isMoving && <button onClick={() => { setShowPortPrice(null); setSelectedPortRes(null); setShowMarket(p => !p); }} className={`px-3 py-1.5 font-bold text-xs rounded-lg shadow-lg inline-flex items-center gap-1.5 ${showMarket?'bg-ocean-dark text-gold border border-gold':'bg-gold text-ocean-dark hover:bg-yellow-300'} ${(tutorialPhase==='sell'||tutorialPhase==='buy')&&!showMarket?'ring-2 ring-white animate-pulse':''}`}>{showMarket?'✕ 시장':<><UiIcon name="market-stall" className="w-4 h-4" /> 시장</>}</button>}
              <button onClick={() => setShowInfo(p => !p)} className={`px-3 py-1.5 font-bold text-xs rounded-lg shadow-lg ${showInfo?'bg-ocean-dark text-blue-300 border border-blue-500':'bg-blue-800 text-blue-200 hover:bg-blue-700 border border-blue-600'}`}>{showInfo?'✕ 정보':'📰 정보'}</button>
            </div>
            <div ref={mapRef} className={`absolute inset-0 rounded border-2 border-gold overflow-hidden ocean-map ${st?.weatherId === 'rainy' || st?.weatherId === 'roughsea' ? 'brightness-90' : st?.weatherId === 'sunny' || st?.weatherId === 'fairwind' ? 'brightness-110' : ''}`}
              style={{ cursor: grabbing?'grabbing':routeMode?'crosshair':'grab', touchAction:'none' }}
              onPointerDown={onPtrDown} onPointerMove={onPtrMove} onPointerUp={onPtrUp}
              onPointerLeave={(e) => { if (e.buttons === 0 && e.pointerType === 'mouse') onPtrUp(e); }}>
              {routeMode && <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-gold text-ocean-dark px-4 py-1 rounded-full text-xs font-bold animate-pulse pointer-events-none whitespace-nowrap shadow-lg">🎯 항구 시세 확인 후 목적지 확정</div>}

              {/* ── 맵 레이어 시스템 (모든 오브젝트를 스크린 좌표로 직접 배치) ──
                  카메라: mapView = { x, y, zoom }
                  월드→스크린: sx = x + (wx/100)*W*zoom, sy = y + (wy/100)*H*zoom
                  CSS scale() 미사용 → 줌 화질 저하 없음, 드래그 시 오브젝트 흔들림 없음 */}
              {(() => {
                const W = mapRef.current?.clientWidth  || 600;
                const H = mapRef.current?.clientHeight || 400;
                const { x: vx, y: vy, zoom } = mapView;
                const ws = (wx, wy) => ({ sx: Math.round(vx + (wx/100)*W*zoom), sy: Math.round(vy + (wy/100)*H*zoom) });
                const routeD = (points) => points.map((pt, idx) => {
                  const { sx, sy } = ws(pt.x, pt.y);
                  return `${idx === 0 ? 'M' : 'L'}${sx},${sy}`;
                }).join(' ');
                const layoutPorts = relaxVisibleMapPoints({
                  width: W,
                  height: H,
                  minDist: 52,
                  margin: 80,
                  items: Object.entries(PORTS).map(([k, p]) => ({ k, ...ws(p.x, p.y) })),
                });
                const currents = [
                  [[3, 22], [18, 18], [34, 24], [48, 18], [64, 25], [84, 20]],
                  [[8, 70], [24, 62], [42, 66], [59, 58], [78, 64], [96, 55]],
                  [[24, 42], [38, 48], [54, 44], [68, 50], [83, 45]],
                  [[12, 86], [32, 82], [48, 88], [68, 80], [91, 84]],
                  [[16, 36], [27, 31], [42, 36], [58, 33], [72, 39], [89, 35]],
                  [[36, 58], [48, 54], [61, 60], [74, 57], [90, 62]],
                ];
                const seaLanes = [
                  [[42, 43], [48, 35], [56, 40], [66, 53], [72, 58]],
                  [[56, 49], [62, 60], [70, 66], [82, 70]],
                  [[82, 70], [84, 58], [87, 44], [92, 42]],
                  [[43, 43], [32, 42], [25, 56], [22, 53]],
                ];
                const currentPath = (pts) => pts.map(([wx, wy], idx) => {
                  const { sx, sy } = ws(wx, wy);
                  return `${idx === 0 ? 'M' : 'L'}${sx},${sy}`;
                }).join(' ');

                return (
                  <>
                    <MapSeaCanvas
                      width={W}
                      height={H}
                      zoom={zoom}
                      vx={vx}
                      vy={vy}
                      ws={ws}
                      imageUrl={worldLandmassesUrl}
                      currents={currents}
                      seaLanes={seaLanes}
                    />

                    <MapGridCanvas width={W} height={H} ws={ws} />

                    <MapRouteCanvas
                      width={W}
                      height={H}
                      ws={ws}
                      cur={cur}
                      routeMode={routeMode}
                      gs={gs}
                      ports={PORTS}
                      getPortAccessState={getPortAccessState}
                      portOf={portOf}
                      portHarbor={portHarbor}
                    />

                    {Object.entries(PORTS).map(([k, p]) => {
                      const { sx, sy } = layoutPorts[k] || ws(p.x, p.y);
                      if (sx < -80 || sx > W+80 || sy < -80 || sy > H+80) return null;
                      const rs = REGION_STYLE[p.region];
                      const isTutTarget = (tutorialPhase==='depart'||tutorialPhase==='confirm')&&(k==='london'||k==='antwerp'||k==='hamburg');
                      const access = getPortAccessState(k, gs.totalEarned);
                      const visited = (gs.visitedPorts||getInitialVisitedPorts()).includes(k);
                      const compactPort = zoom < 1.22 && !routeMode && !isTutTarget && portKey !== k;
                      const showLabel = routeMode || zoom >= 1.25 || portKey === k || isTutTarget || visited;
                      return (
                        <div key={k} className="absolute" style={{left:sx, top:sy, transform:'translate(-50%,-50%)', zIndex:10}}
                          onPointerDown={e => e.stopPropagation()}
                          onClick={e => {
                            if (routeMode) {
                              e.stopPropagation();
                              setShowMarket(false);
                              setSelectedPortRes(null);
                              setShowPortPrice(k);
                              return;
                            }
                            e.stopPropagation();
                            if (portKey === k) {
                              setShowPortPrice(null);
                              setSelectedPortRes(null);
                              setShowMarket(prev => !prev);
                              return;
                            }
                            if (visited) {
                              setShowMarket(false);
                              setShowPortPrice(k);
                            }
                            else {
                              setShowMarket(false);
                              setSelectedPortRes(null);
                              setShowPortPrice(k);
                              if (!access.unlocked) addLog(`🔒 ${p.name} 항로는 잠겨 있지만 시세는 확인할 수 있습니다. 해금 조건: ${access.label}`);
                              else addLog(`🧭 ${p.name}은 항해 가능한 미개척 항구입니다. 시세를 확인한 뒤 배를 선택해 목적지로 지정하세요.`);
                            }
                          }}>
                          {isTutTarget && <div className="absolute rounded-full animate-ping pointer-events-none" style={{width:72,height:72,top:-36,left:-36,backgroundColor:rs.color+'33',border:`2px solid ${rs.color}`}}/>}
                          <div className={`${compactPort ? 'w-9 h-9 text-lg' : 'w-12 h-12 text-2xl'} rounded-full flex items-center justify-center border-2 select-none cursor-pointer hover:scale-110 transition-transform ${routeMode?'animate-bounce':''} ${rs.border}`}
                            style={{
                              backgroundColor: visited ? rs.color+'22' : access.unlocked ? rs.color+'14' : '#1a1a2e',
                              boxShadow:(routeMode||isTutTarget)?`0 0 16px ${rs.color}`:'none',
                              opacity: visited ? 1 : access.unlocked ? 0.78 : 0.45,
                            }}>
                            {visited || access.unlocked ? rs.icon : '🔒'}
                          </div>
                          {showLabel && <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 pointer-events-none whitespace-nowrap font-bold rounded port-nameplate px-1.5 py-0.5 border border-black/40"
                            style={{color: visited || access.unlocked ? rs.color : '#9ca3af', textShadow:'0 0 4px #000, 0 0 8px #000', fontSize:'0.62rem'}}>
                            {visited || access.unlocked ? `${p.country} ${p.name}` : access.shortLabel}
                          </div>}
                        </div>
                      );
                    })}

                    {/* ④ 항해 이벤트 — 스크린 좌표, 고정 크기 */}
                    {mapEvents.filter(e => !e.claimed).map(evt => {
                      const { sx, sy } = ws(evt.x, evt.y);
                      if (sx < -50 || sx > W+50 || sy < -50 || sy > H+50) return null;
                      return (
                        <div key={evt.id}
                          className={`absolute text-center ${evt.clickable?'cursor-pointer pointer-events-auto':'pointer-events-none'}`}
                          style={{left:sx, top:sy, transform:'translate(-50%,-50%)', zIndex:12}}
                          onClick={evt.clickable?(e)=>{e.stopPropagation();claimEvent(evt.id);}:undefined}>
                          <div className="text-xl animate-bounce drop-shadow-lg">{evt.icon}</div>
                          {zoom >= 1.45 && <div className="text-white font-bold whitespace-nowrap bg-black/70 px-1 py-0.5 rounded mt-0.5"
                            style={{fontSize:'0.45rem',textShadow:'0 0 4px #000'}}>
                            {evt.label}{evt.clickable&&!evt.claimed&&evt.reward>0?' (클릭!)':''}
                          </div>}
                        </div>
                      );
                    })}

                    {/* ⑤ 배 — 스크린 좌표, 고정 크기, CSS transition 없음 (드래그 시 흔들림 방지) */}
                    {(() => {
                      // 같은 항구에 정박한 배들을 원형으로 배치
                      const dockGroups = {};
                      gs.ships.forEach(s => {
                        if (s.isMoving) return;
                        const pk = portOf(s);
                        if (!pk) return;
                        if (!dockGroups[pk]) dockGroups[pk] = [];
                        dockGroups[pk].push(s.id);
                      });
                      const getDockOffset = (shipId) => getDockedShipScreenOffset({ shipId, dockGroups });
                      return gs.ships.map(s => {
                        const dockedPortKey = !s.isMoving ? portOf(s) : null;
                        const anchor = dockedPortKey ? portHarbor(dockedPortKey) : s;
                        const { sx, sy } = ws(anchor.x, anchor.y);
                        const { ox, oy } = getDockOffset(s.id);
                        const isSel     = s.id === selShip;
                        const isStormed = s.stormUntil && Date.now() < s.stormUntil;
                        const crewCnt   = gs.crew.filter(c => c.shipId === s.id).length;
                        return (
                          <button key={s.id} type="button" className={`absolute select-none pointer-events-auto cursor-pointer ship-map-button ${s.isMoving ? 'is-moving' : 'is-docked'}`}
                            style={{left: sx + ox, top: sy + oy, transform:'translate(-50%,-50%)', zIndex:20}}
                            title={`${s.name} 목적지 선택`}
                            onPointerDown={e => e.stopPropagation()}
                            onClick={e => {
                              e.stopPropagation();
                              setSelShip(s.id);
                              setRouteMode(true);
                              if (tutorialPhase === 'select') setTutorialPhase('depart');
                            }}>
                            {isSel && <div className="absolute rounded-full border-4 border-gold animate-ping opacity-50 pointer-events-none" style={{width:44,height:44,top:-6,left:-6}}/>}
                            {isSel && <div className="absolute rounded-full border-2 border-yellow-300 pointer-events-none" style={{width:38,height:38,top:-3,left:-3,boxShadow:'0 0 12px #facc15'}}/>}
                            {crewCnt===0 && <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-red-400 text-xs font-bold pointer-events-none whitespace-nowrap">⚠️</div>}
                            {s.booster && <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-yellow-300 text-xs font-bold pointer-events-none animate-pulse">⚡</div>}
                            {isStormed && <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-purple-400 text-xs font-bold pointer-events-none">⛈️</div>}
                            {s.isMoving && (
                              <div className="fleet-sails">
                                <span className="fleet-sail" />
                                <span className="fleet-sail" />
                                <span className="fleet-sail" />
                              </div>
                            )}
                            <div className={`${s.isMoving ? 'ship-at-sea scale-110' : ''} ${isSel ? 'drop-shadow-[0_0_8px_#facc15]' : 'opacity-95'}`}>
                              <ShipIcon type={s.type} className={s.isMoving ? 'w-11 h-11' : 'w-9 h-9'} />
                            </div>
                            {(s.isMoving || isSel || zoom >= 1.55) && <div className="ship-map-label">{s.isMoving ? `${Math.round(journeyProgress(s))}%` : s.name}</div>}
                          </button>
                        );
                      });
                    })()}

                    {/* ⑥ 순항 보조 버튼 — 스크린 좌표 */}
                    {gs.ships.filter(s => s.isMoving && (s.id === selShip || zoom >= 1.55)).map(s => {
                      const { sx, sy } = ws(s.x, s.y);
                      const isSel = s.id === selShip;
                      const bx = Math.min(W-90, Math.max(0, sx-40));
                      const by = Math.min(H-30, Math.max(40, sy-55));
                      return (
                        <button key={s.id} onPointerDown={e => e.stopPropagation()} onClick={(e)=>{e.stopPropagation();toggleBooster(s.id);}}
                          className={`absolute text-xs font-bold rounded-lg px-2 py-1 shadow-lg border transition-colors pointer-events-auto
                            ${s.booster?'bg-yellow-500 text-gray-900 border-yellow-300 animate-pulse':isSel?'bg-blue-700 hover:bg-blue-500 text-blue-100 border-blue-400':'bg-blue-900 text-blue-300 border-blue-700 opacity-75 hover:opacity-100'}`}
                          style={{left:bx, top:by, zIndex:25}}>
                          ⚡ {s.booster?'순항 ON':'순항'}
                        </button>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>

          {/* 일일 목표 미니 위젯 */}
          {dailyGoals.length > 0 && (
            <div className="mt-1 bg-ocean-dark rounded border border-yellow-600 border-opacity-60 px-3 py-1.5 flex-shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-yellow-400">🌅 일일 목표</span>
                <span className="text-xs text-gray-500">{dailyCountdown && `리셋: ${dailyCountdown}`}</span>
                <button onClick={() => setShowDailyGoals(true)} className="ml-auto text-xs text-gray-400 hover:text-yellow-400">상세 보기 →</button>
              </div>
              <div className="flex gap-2">
                {dailyGoals.map(g => {
                  const pct = Math.min(100, (g.progress / g.target) * 100);
                  return (
                    <div key={g.id} className="flex-1 min-w-0">
                      <div className="text-xs text-gray-400 truncate mb-0.5">{g.title}</div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div className={`${g.completed ? 'bg-green-400' : 'bg-yellow-400'} rounded-full h-1.5 transition-all`} style={{width:`${pct}%`}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 로그 */}
          <div className="mt-1 bg-ocean-dark rounded border border-gold border-opacity-40 px-3 py-1.5 max-h-16 overflow-y-auto flex-shrink-0">
            {log.map((m, i) => <div key={i} className={`text-xs ${i===0?'text-gold font-bold':'text-gray-500'}`}>{m}</div>)}
          </div>
        </div>

        {/* 우측 패널 */}
        <div className="w-72 max-w-[31vw] min-w-[272px] flex flex-col gap-2 overflow-y-auto flex-shrink-0">
          {/* 함대 */}
          <div className="card">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-bold text-gold">🚢 함대 ({gs.ships.length}척)</span>
              <button onClick={() => { if(!atPort){addLog('❌ 항구에서만 구매 가능!');return;} setShowBuy(v=>!v); }} className="px-2 py-0.5 rounded text-xs bg-gold text-ocean-dark font-bold">{showBuy?'✕':'+ 구매'}</button>
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {gs.ships.map(s => {
                const st2=calcStats(s,gs.crew), isSel=s.id===selShip;
                const crewCnt=gs.crew.filter(c=>c.shipId===s.id).length;
                const fuel=Math.floor(s.fuel??100), hull=Math.floor(s.hull??100);
                const isStormed = s.stormUntil && Date.now() < s.stormUntil;
                const prog = journeyProgress(s);
                return (
                  <button key={s.id} onClick={() => {setSelShip(s.id);setRouteMode(true); if(tutorialPhase==='select') setTutorialPhase('depart');}}
                    className={`w-full p-2 rounded text-xs text-left border transition-all ${isSel?'bg-gold text-ocean-dark font-bold border-yellow-300':'bg-ocean-blue hover:bg-ocean-light border-transparent'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold inline-flex items-center gap-1.5"><ShipIcon type={s.type} className="w-5 h-5" /> {s.name}</span>
                      <span className="text-xs opacity-75">{cargoN(s)}/{st2.capacity}</span>
                    </div>
                    <div className="flex justify-between opacity-80 mb-1">
                      <span>{s.isMoving?(s.booster?'⚡ 순항 보조':isStormed?'⛈️ 폭풍':'🔄 항해 중'):'⚓ 정박'}</span>
                      <span className={crewCnt===0?(isSel?'text-red-700 font-bold':'text-red-400 font-bold'):''}>
                        {crewCnt===0?'⚠️ 무승원':`👥 ${crewCnt}/${st2.maxCrew}`}
                      </span>
                    </div>
                    {s.isMoving && <div className="mb-1">
                      <div className="flex justify-between text-xs opacity-70 mb-0.5"><span>항해 {Math.round(prog)}%</span><span>{eta(s)}</span></div>
                      <div className="w-full bg-black bg-opacity-30 rounded-full h-1"><div className={`${s.booster?'bg-yellow-400':isStormed?'bg-purple-400':'bg-blue-400'} rounded-full h-1`} style={{width:`${prog}%`}}/></div>
                    </div>}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1"><span className="text-xs opacity-60 w-4">⛽</span><div className="flex-1 bg-black bg-opacity-30 rounded-full h-1.5"><div className={`${gaugeColor(fuel)} rounded-full h-1.5`} style={{width:`${fuel}%`}}/></div><span className={`text-xs ${gaugeText(fuel)} w-6 text-right`}>{fuel}%</span></div>
                      <div className="flex items-center gap-1"><span className="text-xs opacity-60 w-4">🔧</span><div className="flex-1 bg-black bg-opacity-30 rounded-full h-1.5"><div className={`${gaugeColor(hull)} rounded-full h-1.5`} style={{width:`${hull}%`}}/></div><span className={`text-xs ${gaugeText(hull)} w-6 text-right`}>{hull}%</span></div>
                    </div>
                  </button>
                );
              })}
            </div>
            {showBuy&&atPort&&(
              <div className="mt-2 border-t border-gold pt-2 space-y-1.5 max-h-56 overflow-y-auto">
                <div className="text-xs text-gold font-bold">{PORTS[portKey].name}에서 판매</div>
                {(PORT_SHIPS[portKey]||[]).map(tk => {
                  const t=SHIP_TYPES[tk];
                  return <button key={tk} onClick={() => buySh(tk)} className="w-full text-left p-2 rounded bg-ocean-dark border border-gold hover:bg-ocean-blue text-xs">
                    <div className="flex justify-between gap-2"><span className="font-bold text-gold inline-flex items-center gap-1.5"><ShipIcon type={tk} className="w-6 h-6" /> {t.name}</span><span className="text-yellow-300">{t.cost.toLocaleString()}금</span></div>
                    <div className="text-gray-400">{t.desc}</div>
                    <div className="text-gray-500 mt-0.5">적재 {t.baseCapacity} | 최대 승원 {t.maxCrew}</div>
                  </button>;
                })}
              </div>
            )}
          </div>

          {/* 선택 배 상세 */}
          {cur && (
            <div className="card flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-sm font-bold text-gold inline-flex items-center gap-1.5"><ShipIcon type={cur.type} className="w-6 h-6" /> {cur.name}</div>
                <button onClick={() => setRouteMode(!routeMode)} className={`px-2 py-0.5 rounded text-xs font-bold inline-flex items-center gap-1 ${routeMode?'bg-gold text-ocean-dark animate-pulse':'bg-ocean-blue text-gray-300 hover:text-gold'}`}>{routeMode?'🎯 목적지 선택중':<><UiIcon name="compass" className="w-4 h-4" /> 목적지</>}</button>
              </div>
              <div className="ship-status-hero mb-2">
                <div className="flex items-center gap-3">
                  <div className="ship-status-emblem flex-shrink-0">
                    <ShipIcon type={cur.type} className="w-12 h-12" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-sky-200 font-bold truncate">{SHIP_TYPES[cur.type].name}</div>
                    <div className="text-[11px] text-gray-400 truncate">{atPort ? `${PORTS[portKey]?.name || '항구'} 정박` : cur.isMoving ? `항해 ${Math.round(journeyProgress(cur))}%` : '대기 중'}</div>
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      <div className="ship-stat-chip"><span>연료</span><b>{Math.floor(cur.fuel ?? 100)}%</b></div>
                      <div className="ship-stat-chip"><span>내구</span><b>{Math.floor(cur.hull ?? 100)}%</b></div>
                      <div className="ship-stat-chip"><span>화물</span><b>{cargoN(cur)}/{st.capacity}</b></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-0.5 mb-2">
                {[['info','현황'],['crew','승무원'],['cargo','화물'],['upgrade','강화'],['mission','임무']].map(([k,l]) => (
                  <button key={k} onClick={() => setTab(k)} className={`flex-1 py-0.5 rounded text-xs font-bold ${tab===k?'bg-gold text-ocean-dark':'bg-ocean-blue hover:bg-ocean-light'}`}>{l}</button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto">
                {tab==='info' && (
                  <div className="space-y-2">
                    <div className="bg-ocean-dark rounded p-2.5 text-xs space-y-1.5">
                      <div className="flex justify-between"><span>함선</span><span className="text-gold font-bold">{SHIP_TYPES[cur.type].name}</span></div>
                      <div className="flex justify-between"><span>위치</span><span className="text-gold font-bold">{atPort?`${PORTS[portKey].country} ${PORTS[portKey].name}`:'항해 중'}</span></div>
                      {cur.isMoving&&<>
                        <div className="flex justify-between"><span>도착 예정</span><span className={`font-bold ${cur.booster?'text-yellow-300':'text-blue-300'}`}>{cur.booster?'⚡':'⏳'} {eta(cur)}</span></div>
                        <div>
                          <div className="flex justify-between mb-0.5"><span>진행도</span><span className="text-blue-300">{Math.round(journeyProgress(cur))}%</span></div>
                          <div className="w-full bg-ocean-blue rounded-full h-2"><div className={`${cur.booster?'bg-yellow-400':'bg-blue-400'} rounded-full h-2 transition-all`} style={{width:`${journeyProgress(cur)}%`}}/></div>
                        </div>
                        {cur.stormUntil&&Date.now()<cur.stormUntil&&<div className="text-purple-400 font-bold">⛈️ 폭풍우 영향 중! 속도 60% 감소</div>}
                      </>}
                      {(() => {
                          const w = st.weather;
                          const wCrew = gs.crew.filter(c => c.shipId===cur.id && c.favoriteWeather===st.weatherId);
                          const effPct = Math.round((w.speedMult-1)*100);
                          const fuelPct = Math.round((w.fuelMult-1)*100);
                          return (
                            <div className={`rounded px-1 py-0.5 ${wCrew.length>0?'bg-yellow-900/40 border border-yellow-600/40':''}`}>
                              <div className="flex justify-between items-center">
                                <span>날씨</span>
                                <span className="font-bold">{w.icon} {w.name}</span>
                              </div>
                              <div className="text-xs text-gray-400 text-right">{effPct>=0?`+${effPct}`:effPct}% 속도{fuelPct!==0?` / 연료${fuelPct>0?'+':''}${fuelPct}%`:''}{w.hullDmg>0?' / 내구↓':''}</div>
                              {wCrew.length>0&&<div className="text-xs text-yellow-300 font-bold">★ {wCrew.map(c=>c.name).join(', ')} 날씨 보너스 +40%</div>}
                            </div>
                          );
                        })()}
                      <div className="flex justify-between"><span>승무원</span><span className={st.crewCnt===0?'text-red-400 font-bold':'text-gold'}>{st.crewCnt===0?'⚠️ 없음 (출항 불가)':`${st.crewCnt}/${st.maxCrew}명`}</span></div>
                      <div className="flex justify-between"><span>화물</span><span className="text-gold">{cargoN(cur)}/{st.capacity}</span></div>
                      <div>
                        <div className="flex justify-between mb-0.5"><span>⛽ 연료</span><span className={gaugeText(cur.fuel??100)}>{Math.floor(cur.fuel??100)}%</span></div>
                        <div className="w-full bg-ocean-blue rounded-full h-1.5"><div className={`${gaugeColor(cur.fuel??100)} rounded-full h-1.5`} style={{width:`${cur.fuel??100}%`}}/></div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-0.5"><span>🔧 내구도</span><span className={gaugeText(cur.hull??100)}>{Math.floor(cur.hull??100)}%{st.totalRepair>0&&<span className="text-green-400 ml-1">(🛠️자동수리)</span>}</span></div>
                        <div className="w-full bg-ocean-blue rounded-full h-1.5"><div className={`${gaugeColor(cur.hull??100)} rounded-full h-1.5`} style={{width:`${cur.hull??100}%`}}/></div>
                      </div>
                    </div>
                    {cur.isMoving&&(
                      <div className="bg-ocean-dark rounded p-2 space-y-1.5">
                        <button onClick={() => toggleBooster()} disabled={(cur.fuel??100)<20&&!cur.booster}
                          className={`w-full px-2 py-1.5 rounded text-xs font-bold border transition-all ${cur.booster?'bg-yellow-500 text-gray-900 border-yellow-300 animate-pulse':(cur.fuel??100)>=20?'bg-orange-900 hover:bg-orange-700 text-orange-200 border border-orange-700':'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'}`}>
                          ⚡ {cur.booster?'순항 보조 ON — 클릭해서 해제':(cur.fuel??100)>=20?'순항 보조 (연료+50%, 속도+20%)':'순항 보조 불가 (연료 20% 필요)'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {tab==='crew'&&(!atPort?portGuard('승무원 관리'):(
                  <div className="space-y-3">
                    {/* 탑승 승무원 */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-gold">탑승 ({gs.crew.filter(c=>c.shipId===cur.id).length}/{st.maxCrew})</span>
                        <span className="text-xs text-green-400">🛠️ 수리력 {st.totalRepair}</span>
                      </div>
                      {gs.crew.filter(c=>c.shipId===cur.id).length===0
                        ?<div className="text-xs text-red-400 text-center py-2 border border-red-800 rounded">⚠️ 승무원 없음 — 출항 불가</div>
                        :gs.crew.filter(c=>c.shipId===cur.id).map(c => (
                          <div key={c.id} className="bg-ocean-dark border border-gray-700 rounded-lg p-2 mb-1.5">
                            <div className="flex items-start justify-between mb-1.5">
                              <div>
                                <span className={`font-bold text-sm ${rarityColor(c.rarity)}`}>{c.name}</span>
                                {c.label&&<div className={`text-xs ${rarityColor(c.rarity)} opacity-80`}>{c.label}</div>}
                                {c.specialty&&<div className="text-blue-400 text-xs">{c.specialty==='any'?'🌐 전항로 특화':`${REGION_STYLE[c.specialty]?.icon||''} ${REGION_STYLE[c.specialty]?.label} 특화`}</div>}
                                {c.favoriteWeather&&(()=>{const fw=WEATHER_TYPES[c.favoriteWeather];const active=st.weatherId===c.favoriteWeather;return<div className={`text-xs font-bold ${active?'text-yellow-300':'text-gray-500'}`}>{fw.icon} {fw.name} 특화{active?' ★+40%':''}</div>;})()}
                              </div>
                              <div className="flex flex-col gap-1 ml-2 flex-shrink-0">
                                {RARITY_ORDER.indexOf(c.rarity) < 3 && (
                                  <button onClick={() => upgradeCrew(c.id)} className="text-blue-300 text-xs px-1.5 py-0.5 border border-blue-800 rounded whitespace-nowrap" title={`${UPGRADE_GEM_COST[c.rarity]} 보석으로 등급 업`}>
                                    <CurrencyPill type="gem" value={UPGRADE_GEM_COST[c.rarity]} compact /> ↑
                                  </button>
                                )}
                                <button onClick={() => unassign(c.id)} className="text-red-400 hover:text-red-300 text-xs px-1.5 py-0.5 border border-red-900 rounded">하선</button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {[['항법',c.navigation,'bg-blue-500'],['거래',c.trading,'bg-yellow-500'],['스태미나',c.stamina,'bg-green-500'],['수리',c.repair,'bg-orange-500'],['사기',c.morale||0,'bg-pink-500'],['전투',c.combat||0,'bg-red-500'],['연료',c.fuelEff||0,'bg-cyan-500'],['내구',c.hullEff||0,'bg-lime-500'],['선적',c.logistics||0,'bg-violet-500']].map(([label,val,color])=>(
                                <div key={label} className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500 w-9 flex-shrink-0">{label}</span>
                                  <div className="flex-1 bg-gray-800 rounded-full h-1.5"><div className={`${color} rounded-full h-1.5`} style={{width:`${val}%`}}/></div>
                                  <span className="text-xs text-gray-400 w-5 text-right">{val}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                    {/* 미배치 승무원 */}
                    {gs.crew.filter(c=>!c.shipId).length>0&&(
                      <div>
                        <div className="text-xs font-bold text-yellow-400 mb-1.5">⚠️ 미배치</div>
                        {gs.crew.filter(c=>!c.shipId).map(c => (
                          <div key={c.id} className="bg-ocean-dark border border-yellow-900 rounded-lg p-2 mb-1.5">
                            <div className="flex items-start justify-between mb-1.5">
                              <div>
                                <span className={`font-bold text-sm ${rarityColor(c.rarity)}`}>{c.name}</span>
                                {c.label&&<div className={`text-xs ${rarityColor(c.rarity)} opacity-80`}>{c.label}</div>}
                                {c.specialty&&<div className="text-blue-400 text-xs">{c.specialty==='any'?'🌐 전항로 특화':`${REGION_STYLE[c.specialty]?.icon||''} ${REGION_STYLE[c.specialty]?.label} 특화`}</div>}
                                {c.favoriteWeather&&(()=>{const fw=WEATHER_TYPES[c.favoriteWeather];const active=getShipWeather(cur)===c.favoriteWeather;return<div className={`text-xs font-bold ${active?'text-yellow-300':'text-gray-500'}`}>{fw.icon} {fw.name} 특화{active?' ★+40%':''}</div>;})()}
                              </div>
                              <div className="flex flex-col gap-1 ml-2 flex-shrink-0">
                                <div className="flex gap-1">
                                  <button onClick={() => assign(c.id,cur.id)} className="text-green-400 text-xs px-1.5 py-0.5 border border-green-800 rounded">탑승</button>
                                  <button onClick={() => dismiss(c.id)} className="text-red-400 text-xs px-1.5 py-0.5 border border-red-900 rounded">해고</button>
                                </div>
                                {RARITY_ORDER.indexOf(c.rarity) < 3 && (
                                  <button onClick={() => upgradeCrew(c.id)} className="text-blue-300 text-xs px-1.5 py-0.5 border border-blue-800 rounded whitespace-nowrap">
                                    <CurrencyPill type="gem" value={UPGRADE_GEM_COST[c.rarity]} compact /> 등급 ↑
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {[['항법',c.navigation,'bg-blue-500'],['거래',c.trading,'bg-yellow-500'],['스태미나',c.stamina,'bg-green-500'],['수리',c.repair,'bg-orange-500'],['사기',c.morale||0,'bg-pink-500'],['전투',c.combat||0,'bg-red-500'],['연료',c.fuelEff||0,'bg-cyan-500'],['내구',c.hullEff||0,'bg-lime-500'],['선적',c.logistics||0,'bg-violet-500']].map(([label,val,color])=>(
                                <div key={label} className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500 w-9 flex-shrink-0">{label}</span>
                                  <div className="flex-1 bg-gray-800 rounded-full h-1.5"><div className={`${color} rounded-full h-1.5`} style={{width:`${val}%`}}/></div>
                                  <span className="text-xs text-gray-400 w-5 text-right">{val}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* 모집 가능 */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-gold">모집 가능</span>
                        <button onClick={refreshCrew} className="text-xs text-gray-400 hover:text-gold border border-gray-700 rounded px-1.5 py-0.5">🔄 500금</button>
                      </div>
                      {gs.availableCrew.map(c => {
                        // 이 배에 배치 시 속도 변화 미리보기
                        const onBoard = gs.crew.filter(cc=>cc.shipId===cur.id);
                        const curNavSum = onBoard.reduce((a,cc)=>a+cc.navigation,0);
                        const newNavAvg = (curNavSum + c.navigation) / (onBoard.length + 1);
                        const curNavAvg = onBoard.length ? curNavSum / onBoard.length : 50;
                        const t2 = SHIP_TYPES[cur.type];
                        const fm = (cur.fuel??100)<30?0.5:(cur.fuel??100)<60?0.75:1.0;
                        const curSpd = t2.baseSpeed*SAILING_PACE_MULT*(1+(curNavAvg-50)/200+cur.upgrades.speed*0.15)*fm;
                        const newSpd = t2.baseSpeed*SAILING_PACE_MULT*(1+(newNavAvg-50)/200+cur.upgrades.speed*0.15)*fm;
                        const spdDiff = ((newSpd-curSpd)/Math.max(curSpd,0.0001)*100);
                        const canAfford = gs.gold >= c.hireCost;
                        return (
                          <div key={c.id} className="bg-ocean-dark border border-gray-700 rounded-lg p-2 mb-1.5">
                            <div className="flex items-start justify-between mb-1.5">
                              <div>
                                <span className={`font-bold text-sm ${rarityColor(c.rarity)}`}>{c.name}</span>
                                {c.label&&<div className={`text-xs ${rarityColor(c.rarity)} opacity-80`}>{c.label}</div>}
                                {c.specialty&&<div className="text-blue-400 text-xs">{c.specialty==='any'?'🌐 전항로 특화':`${REGION_STYLE[c.specialty]?.icon||''} ${REGION_STYLE[c.specialty]?.label} 특화`}</div>}
                                {c.favoriteWeather&&(()=>{const fw=WEATHER_TYPES[c.favoriteWeather];const active=getShipWeather(cur)===c.favoriteWeather;return<div className={`text-xs font-bold ${active?'text-yellow-300':'text-gray-500'}`}>{fw.icon} {fw.name} 특화{active?' ★+40%':''}</div>;})()}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-1.5">
                              {[['항법',c.navigation+(c.navBonus||0),'bg-blue-500'],['거래',c.trading+(c.tradeBonus||0),'bg-yellow-500'],['스태미나',c.stamina,'bg-green-500'],['수리',c.repair,'bg-orange-500'],['사기',c.morale||0,'bg-pink-500'],['전투',c.combat||0,'bg-red-500'],['연료',c.fuelEff||0,'bg-cyan-500'],['내구',c.hullEff||0,'bg-lime-500'],['선적',c.logistics||0,'bg-violet-500']].map(([label,val,color])=>(
                                <div key={label} className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500 w-9 flex-shrink-0">{label}</span>
                                  <div className="flex-1 bg-gray-800 rounded-full h-1.5"><div className={`${color} rounded-full h-1.5`} style={{width:`${Math.min(100,val)}%`}}/></div>
                                  <span className="text-xs text-gray-400 w-5 text-right">{Math.min(100,val)}</span>
                                </div>
                              ))}
                            </div>
                            {Math.abs(spdDiff) >= 0.5 && (
                              <div className={`text-xs mb-1.5 ${spdDiff>0?'text-green-400':'text-red-400'}`}>
                                배치 시 속도 {spdDiff>0?'▲ +':'▼ '}{Math.abs(spdDiff).toFixed(1)}%
                              </div>
                            )}
                            <button onClick={() => hireCrew(c.id)}
                              className={`w-full py-1 rounded text-xs font-bold border transition-colors ${canAfford?'bg-yellow-900 hover:bg-yellow-700 text-yellow-200 border-yellow-700':'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed'}`}>
                              {canAfford?`⚓ 고용 ${c.hireCost.toLocaleString()}금`:`❌ 금 부족 (${c.hireCost.toLocaleString()}금)`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {tab==='cargo'&&(
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-gold">화물 인벤토리</span>
                      {atPort&&cargoN(cur)>0&&<span className="text-xs text-green-400 font-bold">예상 {cargoSellTotal(cur,portKey).toLocaleString()}금</span>}
                    </div>
                    <div className="rounded-lg border border-gold/25 bg-black/25 p-2">
                      <div className="mb-2 flex items-center justify-between text-[11px] text-gray-400">
                        <span>슬롯형 보관함</span>
                        <span><b className="text-gold">{cargoN(cur)}</b> / {st.capacity}</span>
                      </div>
                      {renderCargoInventory(cur, st.capacity)}
                    </div>
                    {atPort&&cargoN(cur)>0&&<button onClick={() => { setShowPortPrice(null); setSelectedPortRes(null); setShowMarket(true); }} className="w-full mt-2 py-1.5 rounded text-xs font-bold bg-green-900 hover:bg-green-700 text-green-200 border border-green-600">🏪 시장 (판매/매입)</button>}
                  </div>
                )}
                {tab==='mission'&&(
                  <div className="space-y-2">
                    <div className="flex gap-0.5">
                      {[['daily','일일목표'],['quest','퀘스트'],['delivery','배달']].map(([k,l])=>(
                        <button key={k} onClick={()=>setMissionSubTab(k)}
                          className={`flex-1 py-0.5 rounded text-xs font-bold ${missionSubTab===k?'bg-gold text-ocean-dark':'bg-ocean-blue hover:bg-ocean-light'}`}>{l}</button>
                      ))}
                    </div>
                    {missionSubTab==='daily'&&(
                      <div className="space-y-1.5">
                        <div className="text-xs text-gray-500 text-right">리셋: {dailyCountdown}</div>
                        {dailyGoals.map(g => {
                          const pct = Math.min(100,(g.progress/g.target)*100);
                          const pt = g.type==='dg_gold'?`${Math.floor(g.progress).toLocaleString()}/${g.target.toLocaleString()}금`:`${g.progress}/${g.target}`;
                          return (
                            <div key={g.id} className={`rounded-lg p-2.5 border ${g.completed?'border-green-600 bg-green-950':'border-gray-700 bg-ocean-dark'}`}>
                              <div className="flex justify-between items-start mb-1">
                                <span className={`font-bold text-xs ${g.completed?'text-green-400':'text-yellow-300'}`}>{g.completed?'✅ ':''}{g.title}</span>
                                <span className="text-xs text-yellow-200 ml-2 whitespace-nowrap">+{g.rewardGold.toLocaleString()}금{g.rewardGems?` +${g.rewardGems}💎`:''}</span>
                              </div>
                              <div className="text-xs text-gray-400 mb-1.5">{g.desc}</div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-ocean-blue rounded-full h-1.5"><div className={`${g.completed?'bg-green-400':'bg-yellow-400'} rounded-full h-1.5`} style={{width:`${pct}%`}}/></div>
                                <span className="text-xs text-yellow-300 font-bold whitespace-nowrap">{pt}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {missionSubTab==='quest'&&(
                      <div className="space-y-1.5">
                        {gs.activeQuests.length>0&&(
                          <div>
                            <div className="text-xs font-bold text-gold mb-1">진행 중 ({gs.activeQuests.length}/3)</div>
                            {gs.activeQuests.map(q=>{
                              const pct=q.type==='trade'||q.type==='deliver'?Math.min(100,(q.progress/q.target)*100):q.visitedPorts?Math.min(100,(q.visitedPorts.length/q.target)*100):0;
                              return (
                                <div key={q.id} className={`rounded-lg p-2.5 border mb-1 ${q.completed?'border-green-600 bg-green-950':'border-yellow-900 bg-ocean-dark'}`}>
                                  <div className="flex justify-between items-start mb-1">
                                    <span className={`font-bold text-xs ${q.completed?'text-green-400':'text-gold'}`}>{q.completed?'✅ ':''}{q.title}</span>
                                    <span className="text-xs text-yellow-200 ml-2">+{q.rewardGold.toLocaleString()}금</span>
                                  </div>
                                  <div className="text-xs text-gray-400 mb-1.5">{q.desc}</div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-ocean-blue rounded-full h-1.5"><div className={`${q.completed?'bg-green-400':'bg-gold'} rounded-full h-1.5`} style={{width:`${pct}%`}}/></div>
                                    <button onClick={()=>dismissQuest(q.id)} className="text-red-500 text-xs hover:text-red-300">✕</button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="text-xs font-bold text-gold mb-1">수주 가능</div>
                        {!pricesReady
                          ? <div className="text-xs text-gray-400 text-center py-2 flex items-center justify-center gap-1"><span className="animate-spin inline-block">⏳</span> 로딩 중...</div>
                          : gs.availableQuests.length===0
                          ? <div className="text-center py-4 px-2">
                              <div className="text-xl mb-1">📋</div>
                              <div className="text-xs text-gray-400 leading-relaxed">현재 퀘스트 없음.<br/>항구 정박 시 갱신됩니다.</div>
                            </div>
                          : gs.availableQuests.map(q=>(
                            <div key={q.id} className="rounded-lg p-2.5 border border-gray-700 bg-ocean-dark mb-1.5">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-xs text-gold">{q.title}</span>
                                <span className="text-xs text-yellow-200 ml-2">+{q.rewardGold.toLocaleString()}금{q.rewardGems?` +${q.rewardGems}💎`:''}</span>
                              </div>
                              <div className="text-xs text-gray-400 mb-1.5">{q.desc}</div>
                              <button onClick={()=>acceptQuest(q.id)} disabled={gs.activeQuests.length>=3}
                                className="px-2 py-0.5 rounded text-xs font-bold bg-gold text-ocean-dark hover:bg-yellow-300 disabled:bg-gray-700 disabled:text-gray-500">
                                {gs.activeQuests.length>=3?'슬롯 가득':'수주'}
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                    {missionSubTab==='delivery'&&(
                      <div className="space-y-1.5">
                        {(gs.activeDeliveries||[]).filter(d=>!d.completed).length>0&&(
                          <div>
                            <div className="text-xs font-bold text-blue-400 mb-1">🚚 진행 중</div>
                            {(gs.activeDeliveries||[]).filter(d=>!d.completed).map(d=>(
                              <div key={d.id} className="rounded-lg p-2.5 border border-blue-800 bg-blue-950 mb-1.5">
                                <div className="flex justify-between items-start mb-0.5">
                                  <span className="font-bold text-xs text-blue-300 inline-flex items-center gap-1"><ResourceIcon res={d.resource} className="w-5 h-5" /> {d.resource} ×{d.qty}</span>
                                  <span className="text-xs text-yellow-200">+{d.reward.toLocaleString()}금</span>
                                </div>
                                <div className="text-xs text-gray-400">{d.npc} | {d.fromPortName} → {d.toPortName}</div>
                                <div className="text-xs text-blue-400 mt-1">📍 {d.toPortName}에서 판매 시 완료</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {!atPort
                          ?<div className="text-xs text-gray-500 text-center py-4">⚓ 항구에 정박해야 의뢰를 볼 수 있습니다.</div>
                          :(gs.portDeliveries?.[portKey]||[]).length===0
                          ?<div className="text-xs text-gray-500 text-center py-4">이 항구에 배달 의뢰가 없습니다.</div>
                          :(
                            <div>
                              <div className="text-xs font-bold text-gold mb-1">📋 {PORTS[portKey].name} 의뢰</div>
                              {(gs.portDeliveries[portKey]||[]).map(d=>(
                                <div key={d.id} className="rounded-lg p-2.5 border border-gray-700 bg-ocean-dark mb-1.5">
                                  <div className="flex justify-between items-start mb-0.5">
                                    <span className="font-bold text-xs text-gold inline-flex items-center gap-1"><ResourceIcon res={d.resource} className="w-5 h-5" /> {d.resource} ×{d.qty}</span>
                                    <span className="text-xs text-yellow-200">+{d.reward.toLocaleString()}금</span>
                                  </div>
                                  <div className="text-xs text-gray-400 mb-0.5">의뢰인: {d.npc}</div>
                                  <div className="text-xs text-gray-400 mb-1.5">목적지: 📍 {d.toPortName}</div>
                                  <button onClick={()=>acceptDelivery(d.id,portKey)}
                                    className="px-2 py-0.5 rounded text-xs font-bold bg-blue-700 hover:bg-blue-500 text-white border border-blue-500">
                                    📦 수락 (+{d.qty}개 적재)
                                  </button>
                                </div>
                              ))}
                            </div>
                          )
                        }
                      </div>
                    )}
                  </div>
                )}
                {tab==='upgrade'&&(!atPort?portGuard('업그레이드'):(
                  <div className="space-y-2">
                    {[{k:'speed',l:'⛵ 돛',b:2000},{k:'cargo',l:'📦 화물칸',b:1500},{k:'crew',l:'🛏️ 선원숙소',b:1000}].map(({k,l,b}) => {
                      const lv=cur.upgrades[k], cost=b*(lv+1);
                      const preview = k==='speed'
                        ? { cur:`항속 +${lv*15}%`, next:`+${(lv+1)*15}%` }
                        : k==='cargo'
                        ? { cur:`적재 ${st.capacity}개`, next:`${st.capacity+25}개` }
                        : { cur:`승무원 최대 ${st.maxCrew}명`, next:`${Math.min(14,st.maxCrew+1)}명` };
                      return <div key={k} className="bg-ocean-dark rounded p-2">
                        <div className="flex justify-between items-center mb-0.5"><span className="text-xs font-bold text-gold">{l}</span><span className="text-xs text-gray-400">Lv.{lv}/5</span></div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs text-gray-500">{preview.cur}</span>
                          {lv<5&&<><span className="text-xs text-gray-600">→</span><span className="text-xs text-emerald-400 font-bold">{preview.next}</span></>}
                        </div>
                        <div className="flex gap-0.5 mb-1.5">{[0,1,2,3,4].map(i=><div key={i} className={`flex-1 h-1.5 rounded ${i<lv?'bg-gold':'bg-ocean-blue'}`}/>)}</div>
                        {lv<5?<button onClick={()=>upgrade(cur.id,k)} className="w-full button-gold text-xs py-0.5">업그레이드 ({cost.toLocaleString()}금)</button>:<div className="text-xs text-center text-gold">✨ 최대</div>}
                      </div>;
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OceanTycoon;
