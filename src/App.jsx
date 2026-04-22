import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  london:    { name: '런던',         region: 'europe',        country: '🇬🇧', x: 8,  y: 5  },
  bristol:   { name: '브리스톨',     region: 'europe',        country: '🇬🇧', x: 3,  y: 12 },
  lisbon:    { name: '리스본',       region: 'europe',        country: '🇵🇹', x: 3,  y: 24 },
  hamburg:   { name: '함부르크',     region: 'europe',        country: '🇩🇪', x: 18, y: 2  },
  antwerp:   { name: '앤트워프',     region: 'europe',        country: '🇧🇪', x: 21, y: 5  },
  marseille: { name: '마르세유',     region: 'mediterranean', country: '🇫🇷', x: 22, y: 30 },
  genoa:     { name: '제노바',       region: 'mediterranean', country: '🇮🇹', x: 26, y: 23 },
  venice:    { name: '베니스',       region: 'mediterranean', country: '🇮🇹', x: 36, y: 12 },
  tripoli:   { name: '트리폴리',     region: 'mediterranean', country: '🇱🇾', x: 38, y: 40 },
  istanbul:  { name: '이스탄불',     region: 'mediterranean', country: '🇹🇷', x: 47, y: 18 },
  alexandria:{ name: '알렉산드리아', region: 'arabian',       country: '🇪🇬', x: 43, y: 33 },
  aden:      { name: '아덴',         region: 'arabian',       country: '🇾🇪', x: 52, y: 45 },
  dubai:     { name: '두바이',       region: 'arabian',       country: '🇦🇪', x: 61, y: 33 },
  mumbai:    { name: '뭄바이',       region: 'south_asia',    country: '🇮🇳', x: 49, y: 53 },
  goa:       { name: '고아',         region: 'south_asia',    country: '🇮🇳', x: 52, y: 58 },
  calicut:   { name: '칼리컷',       region: 'south_asia',    country: '🇮🇳', x: 57, y: 65 },
  colombo:   { name: '콜롬보',       region: 'south_asia',    country: '🇱🇰', x: 66, y: 74 },
  malacca:   { name: '말라카',       region: 'east_asia',     country: '🇲🇾', x: 68, y: 59 },
  singapore: { name: '싱가포르',     region: 'east_asia',     country: '🇸🇬', x: 76, y: 63 },
  bangkok:   { name: '방콕',         region: 'east_asia',     country: '🇹🇭', x: 71, y: 50 },
  guangzhou: { name: '광저우',       region: 'east_asia',     country: '🇨🇳', x: 82, y: 36 },
  shanghai:  { name: '상하이',       region: 'east_asia',     country: '🇨🇳', x: 86, y: 26 },
  yokohama:  { name: '요코하마',     region: 'east_asia',     country: '🇯🇵', x: 94, y: 15 },
};

const RESOURCES = {
  '향신료': { icon: '🌶️' }, '도자기': { icon: '🏺' }, '비단':   { icon: '🧣' },
  '와인':   { icon: '🍷' }, '다이아몬드': { icon: '💎' }, '해산물': { icon: '🦐' },
  '면직물': { icon: '📦' }, '양털':   { icon: '🧶' }, '계피':   { icon: '🌰' }, '쌀':  { icon: '🍚' },
};

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
};

const RESOURCE_REGIONS = {
  '양털':      { cheap: ['europe'],                    expensive: ['east_asia', 'arabian']           },
  '와인':      { cheap: ['europe', 'mediterranean'],   expensive: ['east_asia', 'south_asia']        },
  '다이아몬드':{ cheap: ['mediterranean'],             expensive: ['east_asia', 'south_asia']        },
  '향신료':    { cheap: ['south_asia', 'east_asia'],   expensive: ['europe', 'mediterranean']        },
  '도자기':    { cheap: ['east_asia'],                 expensive: ['europe', 'mediterranean']        },
  '비단':      { cheap: ['east_asia'],                 expensive: ['europe', 'arabian']              },
  '해산물':    { cheap: ['mediterranean', 'europe'],   expensive: ['east_asia', 'arabian']           },
  '면직물':    { cheap: ['south_asia'],                expensive: ['europe', 'east_asia']            },
  '계피':      { cheap: ['south_asia'],                expensive: ['europe', 'arabian', 'mediterranean'] },
  '쌀':        { cheap: ['east_asia', 'south_asia'],   expensive: ['europe', 'arabian']              },
};

const calcBuyPrice  = (base, tradePct) => Math.max(1, Math.floor(base * 1.4 * Math.max(0.75, 1 - tradePct / 100)));
const calcSellPrice = (base, tradePct) => Math.max(1, Math.floor(base * 0.8 * Math.min(1.25, 1 + tradePct / 100)));

// 세금: 초반 거의 없다가 중반부터 급증 (지수 성장)
const calcTax = (shipCount, taxLevel) => {
  const base = 50 * Math.pow(1.3, Math.max(0, taxLevel - 1));
  const shipBonus = shipCount * Math.max(20, Math.floor(20 * Math.pow(1.1, taxLevel - 1)));
  return Math.floor(base + shipBonus);
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
    body:'때는 대항해시대.\n유럽의 작은 무역항, 리스본.\n\n당신은 낡은 상인선 한 척과\n양털 20개를 물려받은 초보 상인입니다.\n\n동쪽 멀리 실크로드 끝엔 황금이 넘치고\n향신료의 향기가 바람에 실려 옵니다.\n\n자, 어디로 떠나볼까요?' },
];

// ── 모듈 레벨 헬퍼 ──
const portOf = (s) => {
  const e = Object.entries(PORTS).find(([, p]) => Math.abs(s.x - p.x) < 1.5 && Math.abs(s.y - p.y) < 1.5);
  return e ? e[0] : null;
};
const routeRegionOf = (s) => {
  if (s.targetX !== null && s.targetY !== null) {
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
  let navSum = 0, trSum = 0;
  crewOnShip.forEach(c => {
    let nav = c.navigation, tr = c.trading;
    if (c.specialty && (c.specialty === 'any' || c.specialty === region)) {
      nav = Math.min(100, c.navigation + (c.navBonus  || 0));
      tr  = Math.min(100, c.trading   + (c.tradeBonus || 0));
    }
    navSum += nav; trSum += tr;
  });
  const n  = crewOnShip.length ? navSum / crewOnShip.length : 50;
  const tr = crewOnShip.length ? trSum  / crewOnShip.length : 50;
  const fuel = s.fuel ?? 100, hull = s.hull ?? 100;
  const fuelMult = fuel < 30 ? 0.5 : fuel < 60 ? 0.75 : 1.0;
  const hullMult = hull < 30 ? 0.6 : hull < 60 ? 0.8 : 1.0;
  const totalRepair = crewOnShip.reduce((a, c) => a + (c.repair || 0), 0);
  return {
    speed:      Math.max(0.0005, t.baseSpeed * (1 + (n-50)/200 + s.upgrades.speed*0.15) * fuelMult),
    capacity:   t.baseCapacity + s.upgrades.cargo * 25,
    maxCrew:    Math.min(14, t.maxCrew + s.upgrades.crew),
    tradePct:   Math.round((tr - 50) / 2 * hullMult),
    crewCnt:    crewOnShip.length,
    fuelMult, hullMult, totalRepair,
  };
};

let _predId = 1;
const makePrediction = (infoId, tier, portKey, portName, accuracy, magMin, magMax) => {
  const resources = Object.keys(RESOURCES);
  const portKeys  = Object.keys(PORTS);
  const resource  = resources[Math.floor(Math.random() * resources.length)];
  const targetPort= portKeys[Math.floor(Math.random() * portKeys.length)];
  const direction = Math.random() < 0.5 ? 'up' : 'down';
  const mag = Math.floor(magMin + Math.random() * (magMax - magMin));
  return { id: _predId++, infoId, tier, resource, targetPort,
    targetPortName: PORTS[targetPort].name, direction, accuracy, mag,
    applied: false, hit: null, boughtAt: portName };
};

const CREW_NAMES = ['김해룡','이바람','박정현','최강석','정승호','장민우','오선장','신무적','한파도','윤청해','임항해','서무역','조상인','강탐험','백용사','류대항','문원양','권북해','노선비','채항도'];
let _crewSeed = 100;
const makeCrew = () => {
  const id = _crewSeed++;
  const roll = Math.random();
  let special = null;
  if (roll < 0.03)       special = SPECIAL_CREW_POOL.filter(c => c.rarity === 'legendary')[Math.floor(Math.random() * 2)];
  else if (roll < 0.12)  special = SPECIAL_CREW_POOL.filter(c => c.rarity === 'rare')[Math.floor(Math.random() * 2)];
  else if (roll < 0.35)  special = SPECIAL_CREW_POOL.filter(c => c.rarity === 'uncommon')[Math.floor(Math.random() * 5)];
  return {
    id, name: special ? special.name : CREW_NAMES[id % CREW_NAMES.length],
    navigation: Math.floor(30 + Math.random() * 70),
    trading:    Math.floor(30 + Math.random() * 70),
    stamina:    Math.floor(30 + Math.random() * 70),
    repair:     Math.floor(Math.random() * 60),
    hireCost:   special ? Math.floor(1500 + Math.random() * 5000) : Math.floor(500 + Math.random() * 1500),
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
    { id: _questId++, type: 'deliver', title: `${RESOURCES[res].icon} ${res} 배달`,
      desc: `${res} ${amt}개를 ${PORTS[tPort].name}에 납품`, resource: res, targetPort: tPort,
      targetPortName: PORTS[tPort].name, target: amt, progress: 0,
      rewardGold: amt * 70 + 300 + Math.floor(Math.random() * 800), rewardGems: 0, completed: false },
    { id: _questId++, type: 'visit', title: '📍 항구 탐험',
      desc: `새로운 항구 ${visitAmt}곳 방문`, target: visitAmt, progress: 0, visitedPorts: [],
      rewardGold: visitAmt * 400 + Math.floor(Math.random() * 500), rewardGems: 1, completed: false },
    { id: _questId++, type: 'trade', title: '💰 무역 목표',
      desc: `총 ${tradeAmt.toLocaleString()}금 판매`, target: tradeAmt, progress: 0,
      rewardGold: Math.floor(tradeAmt * 0.25) + 300, rewardGems: 0, completed: false },
  ];
};

// ==================== 튜토리얼 단계 ====================
const TUTORIAL_STEPS = {
  select:  { step: 1, total: 5, icon: '👆', title: '배 선택',    text: '왼쪽 함대 목록 또는 지도의 배 아이콘을 클릭해 배를 선택하세요.' },
  depart:  { step: 2, total: 5, icon: '🧭', title: '항구 선택',  text: '배가 선택됐어요! 이제 지도에서 목적지 항구를 클릭하세요.\n💡 양털은 유럽 항구(런던·함부르크·앤트워프)에서 비싸게 팔립니다.' },
  sailing: { step: 3, total: 5, icon: '⛵', title: '항해 중',    text: '배가 출발했어요! 📍 추적 버튼을 눌러 5배 줌으로 배를 가까이 따라가 보세요.\n배 근처 이벤트 아이콘을 클릭하면 보상을 얻을 수 있어요.' },
  sell:    { step: 4, total: 5, icon: '💰', title: '도착! 판매', text: '항구에 도착했어요! 지도 우측 상단 🏪 시장 버튼을 클릭해 화물을 판매하세요.' },
  buy:     { step: 5, total: 5, icon: '🛍️', title: '화물 매입', text: '화물을 다 팔았어요! 이 항구에서 싼 물건을 사서 비싼 곳에 파는 게 핵심입니다.\n🏪 시장 → [매입] 탭을 이용하세요.' },
};

// ==================== 컴포넌트 ====================
const OceanTycoon = () => {
  const gsRef = useRef(null);
  const [gs, setGsRaw] = useState(() => {
    const firstCrew = { ...makeCrew(), shipId: 1, specialty: null, navBonus: 0, tradeBonus: 0, rarity: 'common', label: null, repair: 10 };
    const v = {
      gold: 0, gems: 3,
      ships: [{ id: 1, type: 'merchant', name: '황금 수호자호',
        x: 3, y: 24, targetX: null, targetY: null, startX: null, startY: null,
        isMoving: false, booster: false, stormUntil: null,
        cargo: { '양털': 20 }, fuel: 100, hull: 100,
        upgrades: { speed: 0, cargo: 0, crew: 0 }, morale: 100 }],
      crew: [firstCrew],
      availableCrew: Array.from({ length: 5 }, makeCrew),
      purchasedInfo: {}, predictions: [],
      infoBuyCounts: { rumor: 0, hint: 0, analysis: 0, route: 0 },
      taxLevel: 1,
      availableQuests: [], activeQuests: [],
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
  const [priceHistory,  setPriceHistory]  = useState({});
  const [showPortPrice, setShowPortPrice] = useState(null);
  const [paused,        setPaused]        = useState(false);
  const [gameSpeed,     setGameSpeedRaw]  = useState(1);
  const gameSpeedRef = useRef(1);
  const setGameSpeed = (s) => { gameSpeedRef.current = s; setGameSpeedRaw(s); };
  const [lastPrice,     setLastPrice]     = useState(Date.now());
  const [nextUpd,       setNextUpd]       = useState(3600);
  const [lastTax,       setLastTax]       = useState(Date.now());
  const [nextTax,       setNextTax]       = useState(600);
  const [showMarket,    setShowMarket]    = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showInfo,      setShowInfo]      = useState(false);
  const [showAllCrew,   setShowAllCrew]   = useState(false);
  const [showQuests,    setShowQuests]    = useState(false);
  const [mapEvents,     setMapEvents]     = useState([]);
  const [saveExists,    setSaveExists]    = useState(() => !!localStorage.getItem('pioneer_save'));
  const [saveDecided,   setSaveDecided]   = useState(false);
  const [lastSaved,     setLastSaved]     = useState(null);

  const routeModeRef = useRef(false);
  const [routeMode, setRouteModeRaw] = useState(false);
  const selShipRef = useRef(1);
  const setRouteMode = useCallback((v) => { routeModeRef.current = v; setRouteModeRaw(v); }, []);
  const setSelShip   = useCallback((id) => { selShipRef.current = id; setSelShipRaw(id); }, []);

  const mapViewRef = useRef({ x: 0, y: 0, zoom: 1 });
  const [mapView, setMapViewRaw] = useState({ x: 0, y: 0, zoom: 1 });
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

  const clampXY = useCallback((x, y, zoom) => {
    const el = mapRef.current; if (!el) return { x, y };
    const W = el.clientWidth, H = el.clientHeight;
    const m = Math.max(W, H) * 0.5;
    const minX = zoom >= 1 ? W * (1 - zoom) - m : -m;
    const minY = zoom >= 1 ? H * (1 - zoom) - m : -m;
    return { x: Math.min(m, Math.max(minX, x)), y: Math.min(m, Math.max(minY, y)) };
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = mapRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.88 : 1.14;
    setMapView(prev => {
      const nz = Math.max(0.5, Math.min(24, prev.zoom * factor)); // 최대 24배
      const { x, y } = clampXY(cx - (cx - prev.x) * nz / prev.zoom, cy - (cy - prev.y) * nz / prev.zoom, nz);
      return { zoom: nz, x, y };
    });
  }, [clampXY, setMapView]);

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
      const nz = Math.max(0.5, Math.min(24, zoomDragRef.current.startZoom * Math.pow(1.012, dy)));
      const { cx, cy } = zoomDragRef.current;
      setMapView(prev => {
        const { x, y } = clampXY(cx - (cx - prev.x) * nz / prev.zoom, cy - (cy - prev.y) * nz / prev.zoom, nz);
        return { zoom: nz, x, y };
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
      setMapView(prev => {
        const nz = Math.max(0.5, Math.min(24, prev.zoom * ratio));
        const { x, y } = clampXY(cx - (cx - prev.x) * nz / prev.zoom, cy - (cy - prev.y) * nz / prev.zoom, nz);
        return { zoom: nz, x, y };
      });
    }
  }, [clampXY, setMapView]);

  const addLog = useCallback((m) => setLog(p => [m, ...p.slice(0, 29)]), []);

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
        const hits = curGs.ships.filter(s => Math.hypot(s.x - mx, s.y - my) < 4);
        if (hits.length > 0) {
          const curIdx = hits.findIndex(s => s.id === selShipRef.current);
          const hit = hits.length === 1 ? hits[0] : hits[(curIdx + 1) % hits.length];
          setSelShip(hit.id); setRouteMode(true);
          if (tutorialPhase === 'select') setTutorialPhase('depart');
          return;
        }
        const portEntry = Object.entries(PORTS).find(([, p]) => Math.hypot(p.x - mx, p.y - my) < 5);
        if (!routeModeRef.current && portEntry) {
          setShowPortPrice(p => p === portEntry[0] ? null : portEntry[0]);
          return;
        }
        if (routeModeRef.current) {
          if (portEntry) {
            const [pk] = portEntry;
            const sid = selShipRef.current;
            setGs(prev => {
              const s = prev.ships.find(x => x.id === sid); if (!s) return prev;
              if (prev.crew.filter(c => c.shipId === sid).length < 1) { addLog('❌ 출항하려면 승무원이 최소 1명 필요!'); return prev; }
              const p = PORTS[pk];
              if (Math.hypot(s.x - p.x, s.y - p.y) < 1) return prev;
              addLog(`${s.name}이(가) ${p.name}으로 항해 중...`);
              return { ...prev, ships: prev.ships.map(s2 => s2.id === sid
                ? { ...s2, isMoving: true, targetX: p.x, targetY: p.y, startX: s.x, startY: s.y, booster: false } : s2) };
            });
            setRouteMode(false);
            if (tutorialPhase === 'depart') setTutorialPhase('sailing');
          } else setRouteMode(false);
        }
      }
    }
  }, [setGs, setSelShip, setRouteMode, tutorialPhase, setTutorialPhase, addLog, setShowPortPrice]);

  // ── 저장/불러오기 ──
  const saveGame = useCallback(() => {
    const data = {
      saveVersion: '1.1',
      savedAt: new Date().toISOString(),
      gs: gsRef.current,
    };
    localStorage.setItem('pioneer_save', JSON.stringify(data));
    setLastSaved(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    addLog('💾 게임이 저장되었습니다.');
  }, [addLog]);

  const handleLoad = useCallback(() => {
    try {
      const raw = localStorage.getItem('pioneer_save');
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.saveVersion !== '1.1') { addLog('⚠️ 저장 버전 불일치. 새 게임을 시작합니다.'); setSaveDecided(true); return; }
      setGs(data.gs);
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
    const h = {};
    Object.entries(p).forEach(([k, r]) => { h[k] = {}; Object.keys(r).forEach(res => { h[k][res] = [p[k][res]]; }); });
    setPriceHistory(h);
    setGs(prev => ({ ...prev, availableQuests: generateQuests() }));
  }, []);

  // ── 이동 루프 ──
  useEffect(() => {
    if (paused || !Object.keys(prices).length) return;
    const id = setInterval(() => {
      setGs(prev => {
        const arrivedPorts = [];
        const ships = prev.ships.map(s => {
          const crewRepair = prev.crew.filter(c => c.shipId === s.id).reduce((a, c) => a + (c.repair || 0), 0);
          const hullRecovery = crewRepair * 0.0002;
          if (!s.isMoving || s.targetX === null) {
            return hullRecovery > 0 ? { ...s, hull: Math.min(100, (s.hull ?? 100) + hullRecovery) } : s;
          }
          const dx = s.targetX - s.x, dy = s.targetY - s.y;
          const d  = Math.hypot(dx, dy);
          if (d < 0.3) {
            addLog(`✅ ${s.name}이(가) 도착했습니다!`);
            const arrivedPk = Object.entries(PORTS).find(([, p]) => Math.abs(p.x - s.targetX) < 1.5 && Math.abs(p.y - s.targetY) < 1.5)?.[0];
            if (arrivedPk) arrivedPorts.push({ shipId: s.id, portKey: arrivedPk });
            return { ...s, x: s.targetX, y: s.targetY, isMoving: false, targetX: null, targetY: null,
              startX: null, startY: null, booster: false, stormUntil: null,
              hull: Math.min(100, (s.hull ?? 100) + hullRecovery) };
          }
          const isStormed = s.stormUntil && Date.now() < s.stormUntil;
          const effectiveBooster = s.booster && (s.fuel ?? 100) > 5;
          const sp = calcStats(s, prev.crew).speed * (effectiveBooster ? 1.43 : 1.0) * (isStormed ? 0.4 : 1.0);
          const fuelCost = effectiveBooster ? 0.030 : 0.015;
          const a  = Math.atan2(dy, dx);
          const newFuel = Math.max(0, (s.fuel ?? 100) - fuelCost);
          const newHull = Math.min(100, Math.max(0, (s.hull ?? 100) - 0.005 + hullRecovery));
          return { ...s, x: s.x + sp * Math.cos(a), y: s.y + sp * Math.sin(a),
            fuel: newFuel, hull: newHull, booster: effectiveBooster && newFuel > 5 };
        });

        // 방문 퀘스트 업데이트
        let goldBonus = 0, gemBonus = 0;
        let activeQuests = prev.activeQuests;
        if (arrivedPorts.length > 0) {
          activeQuests = prev.activeQuests.map(q => {
            if (q.type !== 'visit' || q.completed) return q;
            let updated = q;
            arrivedPorts.forEach(({ portKey: pk }) => {
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
        return { ...prev, ships, activeQuests, gold: prev.gold + goldBonus, gems: prev.gems + gemBonus };
      });
    }, Math.max(16, Math.round(300 / gameSpeedRef.current)));
    return () => clearInterval(id);
  }, [paused, prices, gameSpeed, addLog]);

  // ── 이벤트 생성 (5초 간격) ──
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const now = Date.now();
      setMapEvents(prev => prev.filter(e => now - e.createdAt < e.duration));
      const ships = gsRef.current.ships.filter(s => s.isMoving);
      ships.forEach(s => {
        if (Math.random() > 0.12) return; // 12% per 5s per ship
        const types  = ['wreck', 'storm', 'pirate', 'whale', 'treasure', 'current'];
        const icons  = ['🪵',    '⛈️',   '🏴‍☠️', '🐋',    '💰',       '🌊'    ];
        const labels = ['난파선 발견!', '폭풍우 접근!', '해적 출몰!', '고래 목격!', '보물 발견!', '순조로운 해류!'];
        const weights = [30, 25, 20, 15, 8, 12];
        const durations = [55000, 50000, 20000, 40000, 50000, 35000];
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
          setGs(prev => ({ ...prev, ships: prev.ships.map(x => x.id === s.id ? { ...x, stormUntil: now + 60000 } : x) }));
          addLog(`⛈️ ${s.name}에 폭풍우! 60초간 속도 60% 감소.`);
        } else if (type === 'pirate') {
          setGs(prev => {
            const ship = prev.ships.find(x => x.id === s.id);
            if (!ship || Object.keys(ship.cargo).length === 0) return prev;
            const newCargo = {};
            Object.entries(ship.cargo).forEach(([rr, n]) => {
              const lost = Math.ceil(n * (0.05 + Math.random() * 0.1));
              const remain = Math.max(0, n - lost);
              if (remain > 0) newCargo[rr] = remain;
            });
            return { ...prev, ships: prev.ships.map(x => x.id === s.id ? { ...x, cargo: newCargo } : x) };
          });
          addLog(`🏴‍☠️ ${s.name}이 해적에게 습격당했습니다! 일부 화물 약탈.`);
        } else if (type === 'whale') {
          addLog(`🐋 ${s.name} 근해에서 거대 고래 목격!`);
        } else if (type === 'current') {
          addLog(`🌊 ${s.name}에 순조로운 해류! 잠시 속도가 오릅니다.`);
        }
        setMapEvents(prev => [...prev, evt]);
      });
    }, 5000);
    return () => clearInterval(id);
  }, [paused, addLog]);

  // ── 시세 갱신 + 퀘스트 순환 ──
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const el = Math.floor((Date.now() - lastPrice) / 1000);
      if (el >= Math.ceil(3600 / gameSpeedRef.current)) {
        setPrices(p => {
          const n = { ...p };
          Object.entries(n).forEach(([k, r]) =>
            Object.entries(r).forEach(([res, v]) => { n[k][res] = Math.max(20, Math.floor(v + (Math.random() - 0.5) * 60)); })
          );
          setGs(prev => ({
            ...prev,
            availableQuests: generateQuests(), // 퀘스트 순환
            predictions: prev.predictions.map(pred => {
              if (pred.applied) return pred;
              const hit = Math.random() < pred.accuracy;
              if (hit) { const dir = pred.direction === 'up' ? 1 : -1; n[pred.targetPort][pred.resource] = Math.max(20, (n[pred.targetPort][pred.resource] || 100) + dir * pred.mag); }
              return { ...pred, applied: true, hit };
            }),
          }));
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
        addLog('📈 전세계 시세가 변동되었습니다!');
        saveGame(); // 자동 저장
      } else setNextUpd(Math.ceil(3600 / gameSpeedRef.current) - el);
    }, 1000);
    return () => clearInterval(id);
  }, [paused, lastPrice, addLog]);

  // ── 세금 (지수 성장 + 다이아몬드 대납) ──
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const el = Math.floor((Date.now() - lastTax) / 1000);
      if (el >= Math.ceil(600 / gameSpeedRef.current)) {
        setGs(prev => {
          const tax = calcTax(prev.ships.length, prev.taxLevel);
          if (prev.gold >= tax) {
            addLog(`🏛️ 세금 ${tax.toLocaleString()}금 납부 (Lv.${prev.taxLevel})`);
            return { ...prev, gold: prev.gold - tax, taxLevel: prev.taxLevel + 1 };
          } else if (prev.gems >= 1) {
            addLog(`💎 금 부족! 다이아몬드 1개로 세금 대납 (Lv.${prev.taxLevel})`);
            return { ...prev, gems: prev.gems - 1, taxLevel: prev.taxLevel + 1 };
          } else {
            addLog(`🚨 세금 납부 불가! 세무관이 찾아옵니다... (Lv.${prev.taxLevel})`);
            return { ...prev, taxLevel: prev.taxLevel + 1 };
          }
        });
        setLastTax(Date.now());
      } else setNextTax(Math.ceil(600 / gameSpeedRef.current) - el);
    }, 1000);
    return () => clearInterval(id);
  }, [paused, lastTax, addLog]);

  // 파생값
  const cur     = gs.ships.find(s => s.id === selShip) || null;
  const portKey = cur ? portOf(cur) : null;
  const atPort  = !!portKey;
  const st      = cur ? calcStats(cur, gs.crew) : null;
  const nextTaxAmount = calcTax(gs.ships.length, gs.taxLevel);
  const journeyProgress = (s) => {
    if (!s?.isMoving || s.startX == null) return 0;
    const total = Math.hypot(s.targetX - s.startX, s.targetY - s.startY);
    const done  = Math.hypot(s.x - s.startX, s.y - s.startY);
    return total > 0 ? Math.min(100, (done / total) * 100) : 0;
  };
  const eta = (s) => {
    if (!s?.isMoving || s.targetX === null) return null;
    const d = Math.hypot(s.targetX - s.x, s.targetY - s.y);
    const isStormed = s.stormUntil && Date.now() < s.stormUntil;
    const sp = calcStats(s, gs.crew).speed * (s.booster ? 1.43 : 1.0) * (isStormed ? 0.4 : 1.0);
    const secs = Math.round(d / (sp / 0.3));
    if (secs >= 3600) return `${Math.floor(secs/3600)}h ${String(Math.floor((secs%3600)/60)).padStart(2,'0')}m`;
    return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
  };
  const fmt = (s) => {
    if (s >= 3600) return `${Math.floor(s/3600)}h ${String(Math.floor((s%3600)/60)).padStart(2,'0')}m`;
    return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  };

  // 'sailing' → 'sell': 배 도착 시
  useEffect(() => {
    if (tutorialPhase === 'sailing' && atPort) setTutorialPhase('sell');
  }, [tutorialPhase, atPort]);
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
    if (atPort && !cur?.isMoving) setShowMarket(true);
    else { setShowMarket(false); setShowSellModal(false); }
  }, [atPort, cur?.isMoving]);

  // ── 거래 ──
  const getBuy  = (res) => calcBuyPrice(prices[portKey]?.[res] || 0, st?.tradePct || 0);
  const getSell = (res) => calcSellPrice(prices[portKey]?.[res] || 0, st?.tradePct || 0);
  const cargoN  = (s) => Object.values(s.cargo).reduce((a, v) => a + v, 0);
  const cargoSellTotal = (ship, pk) => {
    if (!pk || !prices[pk]) return 0;
    const tp = calcStats(ship, gs.crew).tradePct;
    return Object.entries(ship.cargo).reduce((sum, [r, n]) => sum + calcSellPrice(prices[pk][r] || 0, tp) * n, 0);
  };

  const doBuy = useCallback((res, n) => {
    if (!cur || !portKey || n < 1) return;
    const price = calcBuyPrice(prices[portKey]?.[res] || 0, calcStats(cur, gs.crew).tradePct);
    const total = price * n;
    if (gsRef.current.gold < total) { addLog(`❌ 금 부족! 필요: ${total.toLocaleString()}금`); return; }
    const cap = calcStats(cur, gs.crew).capacity;
    if (cargoN(cur) + n > cap) { addLog(`❌ 화물 공간 부족! 여유: ${cap - cargoN(cur)}개`); return; }
    setGs(prev => ({ ...prev, gold: prev.gold - total,
      ships: prev.ships.map(s => s.id === cur.id ? { ...s, cargo: { ...s.cargo, [res]: (s.cargo[res] || 0) + n } } : s) }));
    addLog(`✅ ${RESOURCES[res].icon} ${res} ×${n} 구매 -${total.toLocaleString()}금`);
  }, [cur, portKey, prices, setGs, gs.crew, addLog]);

  const doSell = useCallback((res, n) => {
    if (!cur || !portKey || n < 1) return;
    const have = cur.cargo[res] || 0;
    const qty = Math.min(n, have);
    if (qty < 1) { addLog('❌ 화물 없음!'); return; }
    const price = calcSellPrice(prices[portKey]?.[res] || 0, calcStats(cur, gs.crew).tradePct);
    const total = price * qty;
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
      return { ...prev, gold: prev.gold + total + goldBonus, gems: prev.gems + gemBonus,
        ships: prev.ships.map(s => s.id === cur.id ? { ...s, cargo } : s), activeQuests: updatedQuests };
    });
    addLog(`💰 ${RESOURCES[res].icon} ${res} ×${qty} 판매 +${total.toLocaleString()}금`);
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
    setGs(prev => ({ ...prev, gold: prev.gold - 500, availableCrew: Array.from({ length: 5 }, makeCrew) }));
    addLog('🔄 승무원 새로고침 -500금');
  };

  const buySh = (tk) => {
    const t = SHIP_TYPES[tk];
    if (gs.gold < t.cost) { addLog('❌ 금 부족!'); return; }
    const nid = Math.max(...gs.ships.map(s => s.id), 0) + 1;
    const ns = { id: nid, type: tk, name: `${t.name} ${nid}호`,
      x: PORTS[portKey].x, y: PORTS[portKey].y,
      targetX: null, targetY: null, startX: null, startY: null,
      isMoving: false, booster: false, stormUntil: null,
      cargo: {}, fuel: 100, hull: 100, upgrades: { speed: 0, cargo: 0, crew: 0 }, morale: 100 };
    setGs(prev => ({ ...prev, gold: prev.gold - t.cost, ships: [...prev.ships, ns] }));
    setSelShip(nid); setShowBuy(false);
    addLog(`⚓ ${t.icon} ${ns.name} 건조! 승무원 1명 배치 후 출항. -${t.cost}금`);
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
    const pred = makePrediction(info.id, info.tier, fromKey, PORTS[fromKey].name, info.accuracy, info.magMin, info.magMax);
    setGs(prev => ({
      ...prev, gold: prev.gold - cost,
      purchasedInfo: premKey ? { ...prev.purchasedInfo, [premKey]: true } : prev.purchasedInfo,
      predictions: [...prev.predictions, pred],
      infoBuyCounts: info.repeat ? { ...prev.infoBuyCounts, [info.id]: (prev.infoBuyCounts[info.id] || 0) + 1 } : prev.infoBuyCounts,
    }));
    addLog(`${info.tier==='premium'?'⭐':'💬'} ${pred.resource}이(가) ${pred.targetPortName}에서 ${pred.direction==='up'?'📈 상승':'📉 하락'} 예상 -${cost.toLocaleString()}금`);
  };
  const toggleBooster = useCallback((sid) => {
    const shipId = sid ?? cur?.id;
    setGs(prev => {
      const s = prev.ships.find(x => x.id === shipId); if (!s?.isMoving) return prev;
      if (!s.booster && (s.fuel ?? 100) < 20) { addLog('❌ 연료 부족! 부스터는 연료 20% 이상 필요.'); return prev; }
      const nb = !s.booster;
      addLog(nb ? '⚡ 부스터 가동! 연료 2배, 속도 +43%' : '⚡ 부스터 해제');
      return { ...prev, ships: prev.ships.map(x => x.id === shipId ? { ...x, booster: nb } : x) };
    });
  }, [cur, setGs, addLog]);
  const boost = (sid) => {
    const shipId = sid ?? cur?.id;
    const target = gsRef.current.ships.find(s => s.id === shipId);
    if (!target?.isMoving || gsRef.current.gems < 1) { addLog('❌ 보석 부족!'); return; }
    setGs(prev => ({ ...prev, gems: prev.gems - 1,
      ships: prev.ships.map(s => s.id === shipId
        ? { ...s, x: s.targetX, y: s.targetY, isMoving: false, targetX: null, targetY: null, startX: null, startY: null, booster: false } : s) }));
    addLog('💎 즉시 도착!');
  };

  // 퀘스트
  const acceptQuest = (qid) => {
    if (gs.activeQuests.length >= 3) { addLog('❌ 퀘스트 슬롯 가득! (최대 3개)'); return; }
    setGs(prev => {
      const q = prev.availableQuests.find(x => x.id === qid); if (!q) return prev;
      return { ...prev, availableQuests: prev.availableQuests.filter(x => x.id !== qid), activeQuests: [...prev.activeQuests, q] };
    });
    addLog('📋 퀘스트 수주!');
  };
  const dismissQuest = (qid) => setGs(prev => ({ ...prev, activeQuests: prev.activeQuests.filter(q => q.id !== qid) }));
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
                      <span className="text-sm font-bold text-gold">{SHIP_TYPES[s.type].icon} {s.name}</span>
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
                          {gs.ships.map(s => <button key={s.id} onClick={() => assign(c.id, s.id)} className="text-green-400 text-xs border border-green-800 rounded px-1">{SHIP_TYPES[s.type].icon}탑승</button>)}
                          <button onClick={() => dismiss(c.id)} className="text-red-400 text-xs border border-red-900 rounded px-1">해고</button>
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
              {gs.availableQuests.length === 0
                ? <div className="text-xs text-gray-500 text-center py-4">퀘스트 로딩 중...</div>
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

      {/* 항구 시세 패널 */}
      {showPortPrice && prices[showPortPrice] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowPortPrice(null)}>
          <div className="w-[480px] max-h-[85vh] bg-ocean-dark border border-gold rounded-2xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gold flex-shrink-0">
              <div>
                <span className="text-base font-bold text-gold">📊 {PORTS[showPortPrice].country} {PORTS[showPortPrice].name} — 시세</span>
                <span className="text-xs text-gray-400 ml-2">항구 클릭으로 닫기</span>
              </div>
              <button onClick={() => setShowPortPrice(null)} className="text-gray-400 hover:text-gold text-lg">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-3 py-2">
              <div className="grid grid-cols-1 gap-1.5">
                {Object.entries(RESOURCES).map(([res, { icon }]) => {
                  const hist = priceHistory[showPortPrice]?.[res] || [];
                  const cur2 = hist[hist.length - 1] ?? prices[showPortPrice][res];
                  const prev2 = hist[hist.length - 2] ?? cur2;
                  const delta = cur2 - prev2;
                  const buyP  = calcBuyPrice(cur2, 0);
                  const sellP = calcSellPrice(cur2, 0);
                  const minH = Math.min(...hist, cur2);
                  const maxH = Math.max(...hist, cur2);
                  const range = maxH - minH || 1;
                  const W = 80, H = 28;
                  const pts = hist.length > 1
                    ? hist.map((v, i) => `${(i / (hist.length - 1)) * W},${H - ((v - minH) / range) * H}`).join(' ')
                    : `0,${H/2} ${W},${H/2}`;
                  const trendColor = delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#9ca3af';
                  return (
                    <div key={res} className="flex items-center gap-3 bg-ocean-blue rounded-lg px-3 py-2">
                      <div className="w-24 flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-base">{icon}</span>
                        <span className="text-xs font-bold text-gray-200 truncate">{res}</span>
                      </div>
                      <div className="flex-shrink-0 w-20 h-7">
                        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible'}}>
                          <polyline points={pts} fill="none" stroke={trendColor} strokeWidth="1.5" strokeLinejoin="round"/>
                          {hist.length > 0 && <circle cx={(hist.length-1)/(hist.length-1||1)*W} cy={H-((hist[hist.length-1]-minH)/range)*H} r="2.5" fill={trendColor}/>}
                        </svg>
                      </div>
                      <div className="flex-1 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-gray-400">매입</span>
                          <span className="text-sm font-bold text-yellow-300">{buyP.toLocaleString()}</span>
                          <span className="text-xs text-gray-500">|</span>
                          <span className="text-xs text-gray-400">판매</span>
                          <span className="text-sm font-bold text-green-300">{sellP.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-xs" style={{color: trendColor}}>
                            {delta > 0 ? '▲' : delta < 0 ? '▼' : '─'} {Math.abs(delta)}
                          </span>
                          <span className="text-xs text-gray-600">({hist.length}회 기록)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="px-4 py-2 border-t border-gold border-opacity-30 flex-shrink-0 text-xs text-gray-500 text-center">
              항로 모드에서 항구 클릭 시 항로 설정 | 일반 모드에서 클릭 시 시세 보기
            </div>
          </div>
        </div>
      )}

      {/* 판매 모달 */}
      {showSellModal && atPort && cur && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={() => setShowSellModal(false)}>
          <div className="bg-gray-900 border-2 border-green-600 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-green-700">
              <div>
                <div className="text-lg font-bold text-green-400">💰 화물 판매</div>
                <div className="text-xs text-gray-400">{PORTS[portKey].country} {PORTS[portKey].name}{st?.tradePct !== 0 && <span className={`ml-2 ${st.tradePct>0?'text-green-400':'text-red-400'}`}>상술{st.tradePct>0?'+':''}{st.tradePct}%</span>}</div>
              </div>
              <button onClick={() => setShowSellModal(false)} className="text-gray-400 hover:text-white text-2xl leading-none">✕</button>
            </div>
            {/* 화물 목록 */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
              {Object.keys(cur.cargo).length === 0 ? (
                <div className="text-center text-gray-500 py-8">판매할 화물이 없습니다.</div>
              ) : Object.entries(cur.cargo).map(([r, n]) => {
                const sellP = getSell(r);
                const total = sellP * n;
                return (
                  <div key={r} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-4xl">{RESOURCES[r].icon}</span>
                      <div className="flex-1">
                        <div className="font-bold text-white text-base">{r}</div>
                        <div className="text-sm text-gray-400">보유 <span className="text-white font-bold">×{n}</span> · <span className="text-yellow-300">{sellP.toLocaleString()}금/개</span></div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold text-lg">{total.toLocaleString()}<span className="text-sm text-gray-400">금</span></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[1, 5, 10].map(k => (
                        <button key={k} onClick={() => doSell(r, k)} disabled={n < k}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors
                            ${n >= k ? 'bg-gray-700 hover:bg-green-800 border-gray-600 hover:border-green-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-700 cursor-not-allowed'}`}>
                          -{k}개
                        </button>
                      ))}
                      <button onClick={() => doSell(r, n)}
                        className="flex-1 py-2 rounded-lg text-sm font-bold bg-green-700 hover:bg-green-500 border border-green-500 text-white transition-colors">
                        전량
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* 하단 합계 + 전체 판매 */}
            {cargoN(cur) > 0 && (
              <div className="px-4 py-4 border-t border-green-800 flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-xs text-gray-400">전체 예상</div>
                  <div className="text-xl font-bold text-green-400">{cargoSellTotal(cur, portKey).toLocaleString()}<span className="text-sm text-gray-400 ml-1">금</span></div>
                </div>
                <button onClick={() => { Object.entries(cur.cargo).forEach(([r, n]) => doSell(r, n)); setShowSellModal(false); }}
                  className="px-6 py-3 rounded-xl text-base font-bold bg-green-600 hover:bg-green-400 text-white border border-green-400 transition-colors shadow-lg">
                  💰 전체 판매
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-gold border-opacity-30">
        <div>
          <h1 className="text-3xl font-bold text-gold">⛵ Pioneer</h1>
          <p className="text-xs text-ocean-light">항해와 정보의 시대</p>
        </div>
        <div className="bg-ocean-dark rounded p-2 border border-gold flex gap-3 items-center">
          <div className="text-right">
            <div className="text-xl font-bold text-gold">{gs.gold.toLocaleString()} 금</div>
            <div className="text-xs text-gray-400">시세: <span className="text-yellow-300">{fmt(nextUpd)}</span></div>
          </div>
          <div className="border-l border-gold pl-3">
            <div className={`text-sm font-bold ${gs.taxLevel >= 15 ? 'text-red-400' : gs.taxLevel >= 10 ? 'text-orange-300' : 'text-orange-300'}`}>
              🏛️ {nextTaxAmount.toLocaleString()}금
            </div>
            <div className="text-xs text-gray-500">Lv.{gs.taxLevel} — {fmt(nextTax)}</div>
          </div>
          <div className="border-l border-gold pl-3 text-center">
            <div className="text-lg font-bold text-blue-300">💎 {gs.gems}</div>
            <div className="text-xs text-gray-400">보석</div>
          </div>
          <button onClick={() => setShowAllCrew(true)} className="border-l border-gold pl-3 text-xs text-gray-300 hover:text-gold whitespace-nowrap">
            👥 승무원<br/><span className="text-gray-500">{gs.crew.length}명</span>
          </button>
          <button onClick={() => setShowQuests(true)} className="border-l border-gold pl-3 text-xs text-gray-300 hover:text-gold whitespace-nowrap relative">
            📋 퀘스트<br/><span className="text-gray-500">{gs.activeQuests.length}/3</span>
            {completedQuests > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"/>}
          </button>
          <button onClick={saveGame} className="border-l border-gold pl-3 text-xs text-gray-300 hover:text-gold whitespace-nowrap">
            💾 저장<br/><span className="text-gray-600">{lastSaved || '—'}</span>
          </button>
          <button onClick={() => setIntroSlide(0)} className="border-l border-gold pl-3 text-xs text-gray-400 hover:text-gold">❓</button>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex flex-1 min-h-0 gap-2 p-2">
        {/* 지도 */}
        <div className="flex-1 flex flex-col min-w-0">
          {tutorialPhase !== 'done' && TUTORIAL_STEPS[tutorialPhase] && (() => {
            const step = TUTORIAL_STEPS[tutorialPhase];
            const colorMap = {
              select:  'border-blue-400 bg-blue-950',
              depart:  'border-blue-400 bg-blue-950',
              sailing: 'border-indigo-400 bg-indigo-950',
              sell:    'border-green-500 bg-green-950',
              buy:     'border-yellow-500 bg-yellow-950',
            };
            return (
              <div className={`mb-1 rounded-lg border px-3 py-2 flex items-start gap-2 ${colorMap[tutorialPhase]}`}>
                <span className="text-xl flex-shrink-0 mt-0.5">{step.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white mb-0.5">
                    <span className="opacity-50 mr-1 font-normal">{step.step}/{step.total}</span>{step.title}
                  </div>
                  <div className="text-xs text-gray-200 whitespace-pre-line leading-relaxed">{step.text}</div>
                  {tutorialPhase === 'sailing' && (
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
                <button onClick={() => setTutorialPhase('done')} className="text-gray-400 hover:text-white flex-shrink-0 text-base leading-none mt-0.5">✕</button>
              </div>
            );
          })()}
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-bold text-gold">🗺️ 세계 항해도 <span className="text-xs text-gray-500 font-normal">({Object.keys(PORTS).length}개 항구 | {mapView.zoom.toFixed(1)}x)</span></span>
            <div className="flex gap-1 items-center">
              <button onClick={() => setMapView(p => { const nz=Math.min(24,p.zoom*1.5); const {x,y}=clampXY(p.x,p.y,nz); return {zoom:nz,x,y}; })} className="px-2 py-0.5 bg-ocean-dark border border-gold text-gold text-xs rounded">＋</button>
              <button onClick={() => setMapView(p => { const nz=Math.max(0.5,p.zoom/1.5); const {x,y}=clampXY(p.x,p.y,nz); return {zoom:nz,x,y}; })} className="px-2 py-0.5 bg-ocean-dark border border-gold text-gold text-xs rounded">－</button>
              <button onClick={() => setMapView({x:0,y:0,zoom:1})} className="px-2 py-0.5 bg-ocean-dark border border-gold text-gold text-xs rounded">⊡</button>
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
              {[1,2,5,10].map(s => (
                <button key={s} onClick={() => setGameSpeed(s)}
                  className={`px-1.5 py-0.5 rounded text-xs font-bold ml-0.5 transition-all
                    ${gameSpeed===s?'bg-gold text-ocean-dark':'bg-ocean-dark border border-gold border-opacity-40 text-gold opacity-50 hover:opacity-100'}`}>
                  {s}×
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 relative min-h-0">
            <div ref={mapRef} className="absolute inset-0 rounded border-2 border-gold overflow-hidden bg-gradient-to-b from-blue-950 to-black"
              style={{ cursor: grabbing?'grabbing':routeMode?'crosshair':'grab', touchAction:'none' }}
              onPointerDown={onPtrDown} onPointerMove={onPtrMove} onPointerUp={onPtrUp} onPointerLeave={onPtrUp}>
              {routeMode && <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-gold text-ocean-dark px-4 py-1 rounded-full text-xs font-bold animate-pulse pointer-events-none">🎯 목적지 항구를 클릭하세요</div>}

              {/* 지도 버튼 */}
              <div className="absolute top-2 right-2 z-30 flex flex-col gap-1">
                {atPort && !cur?.isMoving && <button onClick={() => setShowMarket(p => !p)} className={`px-3 py-1.5 font-bold text-xs rounded-lg shadow-lg ${showMarket?'bg-ocean-dark text-gold border border-gold':'bg-gold text-ocean-dark hover:bg-yellow-300'} ${(tutorialPhase==='sell'||tutorialPhase==='buy')&&!showMarket?'ring-2 ring-white animate-pulse':''}`}>{showMarket?'✕ 시장':'🏪 시장'}</button>}
                <button onClick={() => setShowInfo(p => !p)} className={`px-3 py-1.5 font-bold text-xs rounded-lg shadow-lg ${showInfo?'bg-ocean-dark text-blue-300 border border-blue-500':'bg-blue-800 text-blue-200 hover:bg-blue-700 border border-blue-600'}`}>{showInfo?'✕ 정보':'📰 정보'}</button>
              </div>

              {/* 시장 팝업 — 매입 전용 */}
              {atPort && showMarket && cur && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowMarket(false)}>
                <div className="w-80 max-h-[85vh] bg-ocean-dark border border-gold rounded-xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gold flex-shrink-0">
                    <div className="text-sm font-bold text-gold">🏪 {PORTS[portKey].name} — 매입</div>
                    <div className="flex items-center gap-2">
                      {st?.tradePct !== 0 && <span className={`text-xs ${st.tradePct>0?'text-green-400':'text-red-400'}`}>상술{st.tradePct>0?'+':''}{st.tradePct}%</span>}
                      <button onClick={() => setShowMarket(false)} className="text-gray-400 hover:text-gold">✕</button>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 border-b border-gold border-opacity-40 flex-shrink-0 flex items-center gap-2">
                    <span className="text-xs text-gray-400">화물</span>
                    <div className="flex-1 bg-ocean-blue rounded-full h-1.5"><div className="bg-gold rounded-full h-1.5" style={{width:`${Math.min(100,cargoN(cur)/(st?.capacity||1)*100)}%`}}/></div>
                    <span className="text-xs text-gold font-bold">{cargoN(cur)}/{st?.capacity}</span>
                    <span className="text-xs text-gray-500">{gs.gold.toLocaleString()}금</span>
                  </div>
                  <div className="overflow-y-auto flex-1 px-2 py-1">
                    <div className="text-xs text-gray-500 mb-1 px-1">※ 다른 항구에서 판매해야 이익</div>
                    {Object.entries(RESOURCES).map(([r, {icon}]) => {
                      const buyP = getBuy(r); const canAfford = gs.gold >= buyP; const spaceLeft = (st?.capacity||0)-cargoN(cur);
                      return (
                        <div key={r} className="flex items-center gap-1 py-1 border-b border-gray-800 last:border-0">
                          <div className="w-20 text-xs flex items-center gap-1 flex-shrink-0"><span>{icon}</span><span className="truncate">{r}</span></div>
                          <div className="flex-1 text-right"><span className={`text-xs font-bold ${canAfford?'text-yellow-300':'text-gray-600'}`}>{buyP.toLocaleString()}금</span></div>
                          <div className="flex gap-0.5 ml-1">
                            {[1,5,10].map(n => <button key={n} onClick={() => doBuy(r,n)} disabled={!canAfford||spaceLeft<1} className={`px-1.5 py-0.5 rounded text-xs font-bold border ${canAfford&&spaceLeft>=n?'border-gold text-gold hover:bg-gold hover:text-ocean-dark':'border-gray-700 text-gray-600 cursor-not-allowed'}`}>+{n}</button>)}
                            <button onClick={() => doBuy(r, Math.min(spaceLeft, Math.floor(gs.gold/buyP)))} disabled={!canAfford||spaceLeft<1} className={`px-1.5 py-0.5 rounded text-xs font-bold border ${canAfford&&spaceLeft>=1?'border-yellow-500 text-yellow-400 hover:bg-yellow-900':'border-gray-700 text-gray-600 cursor-not-allowed'}`}>최대</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-1 px-2 py-2 border-t border-gold border-opacity-40 flex-shrink-0">
                    <button onClick={refuel} className="flex-1 py-1 rounded text-xs bg-orange-900 hover:bg-orange-700 text-orange-200 border border-orange-700">⛽ 보충 ({Math.floor((100-(cur?.fuel??100))*2)}금)</button>
                    <button onClick={doRepair} className="flex-1 py-1 rounded text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600">🔧 수리 ({Math.floor((100-(cur?.hull??100))*5)}금)</button>
                  </div>
                </div>
                </div>
              )}

              {/* 화물 인벤토리 — 지도 우측 하단 */}
              {cur && (
                <div className="absolute bottom-3 right-3 z-20 w-64 bg-black bg-opacity-80 border border-gold border-opacity-60 rounded-xl shadow-2xl backdrop-blur-sm">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gold border-opacity-30">
                    <span className="text-xs font-bold text-gold">{SHIP_TYPES[cur.type].icon} {cur.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">{cargoN(cur)}<span className="text-gray-600">/{st?.capacity}</span></span>
                      <div className="w-16 bg-gray-800 rounded-full h-1.5"><div className="bg-gold rounded-full h-1.5" style={{width:`${Math.min(100,cargoN(cur)/(st?.capacity||1)*100)}%`}}/></div>
                    </div>
                  </div>
                  {Object.keys(cur.cargo).length === 0 ? (
                    <div className="px-3 py-4 text-center text-gray-600 text-xs">화물 없음</div>
                  ) : (
                    <div className="p-2 grid grid-cols-4 gap-1.5">
                      {Object.entries(cur.cargo).map(([r, n]) => {
                        const sellP = atPort ? getSell(r) : null;
                        return (
                          <div key={r} title={`${r} ×${n}${sellP?` — ${sellP.toLocaleString()}금/개`:''}`}
                            className="relative bg-gray-900 border border-gray-700 hover:border-gold rounded-lg p-1.5 flex flex-col items-center cursor-default transition-colors group">
                            <span className="text-2xl leading-none mb-0.5">{RESOURCES[r].icon}</span>
                            <span className="text-gold font-bold text-xs">×{n}</span>
                            {sellP && <span className="absolute -top-1 -right-1 text-green-400 font-bold leading-none bg-gray-900 rounded px-0.5" style={{fontSize:'0.5rem'}}>{(sellP*n/1000).toFixed(1)}k</span>}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-30 transition-opacity">{r} ×{n}{sellP?` = ${(sellP*n).toLocaleString()}금`:''}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {atPort && cargoN(cur) > 0 && (
                    <div className="px-2 pb-2 pt-1 border-t border-gold border-opacity-20">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs text-gray-400">합계</span>
                        <span className="text-xs font-bold text-green-400">{cargoSellTotal(cur,portKey).toLocaleString()}금</span>
                      </div>
                      <button onClick={() => setShowSellModal(true)}
                        className="w-full py-1.5 rounded-lg text-sm font-bold bg-green-700 hover:bg-green-500 text-white border border-green-500 transition-colors">
                        💰 판매하기
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 정보 팝업 */}
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
                        <div className="text-xs font-bold text-blue-300 mb-1.5">🔮 보유 예측</div>
                        {[...gs.predictions].reverse().map(pred => (
                          <div key={pred.id} className="bg-ocean-dark rounded px-2 py-1 mb-1 text-xs">
                            <div className="flex justify-between"><span>{RESOURCES[pred.resource]?.icon} {pred.resource}</span><span className={pred.hit===null?'text-gray-400':pred.hit?'text-green-400':'text-red-400'}>{pred.hit===null?'⏳':pred.hit?'✅':'❌'} {pred.targetPortName}</span></div>
                            <span className={pred.direction==='up'?'text-green-400':'text-red-400'}>{pred.direction==='up'?'📈':'📉'} ~{pred.mag}금</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                </div>
              )}

              {/* 배 — 줌 독립 고정 크기 + smooth transition */}
              {(() => {
                const mapW = mapRef.current?.clientWidth  || 600;
                const mapH = mapRef.current?.clientHeight || 400;
                const intervalMs = Math.max(16, Math.round(300 / gameSpeed));
                return gs.ships.map(s => {
                  const isSel     = s.id === selShip;
                  const isStormed = s.stormUntil && Date.now() < s.stormUntil;
                  const crewCnt   = gs.crew.filter(c => c.shipId === s.id).length;
                  const sx = mapView.x + (s.x / 100) * mapW * mapView.zoom;
                  const sy = mapView.y + (s.y / 100) * mapH * mapView.zoom;
                  return (
                    <div key={s.id} className="absolute select-none"
                      style={{left: sx, top: sy, transform:'translate(-50%,-50%)', zIndex:20,
                        transition: s.isMoving ? `left ${intervalMs}ms linear, top ${intervalMs}ms linear` : 'none'}}>
                      {isSel && <div className="absolute rounded-full border-4 border-gold animate-ping opacity-50 pointer-events-none" style={{width:44,height:44,top:-6,left:-6}}/>}
                      {isSel && <div className="absolute rounded-full border-2 border-yellow-300 pointer-events-none" style={{width:38,height:38,top:-3,left:-3,boxShadow:'0 0 12px #facc15'}}/>}
                      {crewCnt===0 && <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-red-400 text-xs font-bold pointer-events-none whitespace-nowrap">⚠️</div>}
                      {s.booster && <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-yellow-300 text-xs font-bold pointer-events-none animate-pulse">⚡</div>}
                      {isStormed && <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-purple-400 text-xs font-bold pointer-events-none">⛈️</div>}
                      <div className={`text-2xl ${isSel ? 'drop-shadow-[0_0_6px_#facc15]' : 'opacity-90'}`}>
                        {SHIP_TYPES[s.type].icon}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* ⚡ 부스터 버튼 */}
              {gs.ships.filter(s => s.isMoving).map(s => {
                const pos = getShipScreenPos(s); if (!pos) return null;
                const isSel = s.id === selShip;
                const mapW = mapRef.current?.clientWidth||600, mapH = mapRef.current?.clientHeight||400;
                const bx = Math.min(mapW-90, Math.max(0, pos.sx-40)), by = Math.min(mapH-30, Math.max(40, pos.sy-55));
                return (
                  <button key={s.id} onClick={(e) => { e.stopPropagation(); toggleBooster(s.id); }}
                    className={`absolute z-25 text-xs font-bold rounded-lg px-2 py-1 shadow-lg border transition-all pointer-events-auto
                      ${s.booster?'bg-yellow-500 text-gray-900 border-yellow-300 animate-pulse':isSel?'bg-blue-700 hover:bg-blue-500 text-blue-100 border-blue-400':'bg-blue-900 text-blue-300 border-blue-700 opacity-75 hover:opacity-100'}`}
                    style={{left:bx,top:by}}>
                    ⚡ {s.booster?'부스터 ON':'부스터'}
                  </button>
                );
              })}

              {/* 변환 레이어 */}
              <div style={{position:'absolute',inset:0,transform:`translate(${mapView.x}px,${mapView.y}px) scale(${mapView.zoom})`,transformOrigin:'0 0',willChange:'transform'}}>
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                  {Array.from({length:20}).map((_,i) => <div key={`h${i}`} className="absolute w-full h-px bg-gold" style={{top:`${i*5}%`}}/>)}
                  {Array.from({length:20}).map((_,i) => <div key={`v${i}`} className="absolute h-full w-px bg-gold" style={{left:`${i*5}%`}}/>)}
                </div>

                {/* 항해 이벤트 */}
                {mapEvents.filter(e => !e.claimed).map(evt => (
                  <div key={evt.id}
                    className={`absolute z-15 text-center transition-all ${evt.clickable?'cursor-pointer pointer-events-auto':'pointer-events-none'}`}
                    style={{left:`${evt.x}%`,top:`${evt.y}%`,transform:'translate(-50%,-50%)'}}
                    onClick={evt.clickable?(e)=>{e.stopPropagation();claimEvent(evt.id);}:undefined}>
                    <div style={{transform:`scale(${1/mapView.zoom})`,transformOrigin:'center center'}}>
                      <div className="text-2xl animate-bounce drop-shadow-lg">{evt.icon}</div>
                      <div className="text-white font-bold whitespace-nowrap bg-black bg-opacity-70 px-1.5 py-0.5 rounded mt-0.5"
                        style={{fontSize:'0.5rem',textShadow:'0 0 4px #000'}}>
                        {evt.label}{evt.clickable&&!evt.claimed&&evt.reward>0?' (클릭!)':''}
                      </div>
                    </div>
                  </div>
                ))}

                {/* 항구 */}
                {Object.entries(PORTS).map(([k, p]) => {
                  const rs = REGION_STYLE[p.region];
                  const isTutTarget = tutorialPhase==='depart'&&(k==='london'||k==='antwerp');
                  return (
                    <div key={k} className="absolute" style={{left:`${p.x}%`,top:`${p.y}%`,transform:'translate(-50%,-50%)',zIndex:10}}>
                      <div style={{transform:`scale(${1/mapView.zoom})`,transformOrigin:'center center'}}>
                        {isTutTarget && <div className="absolute rounded-full animate-ping pointer-events-none" style={{width:56,height:56,top:-10,left:-10,backgroundColor:rs.color+'33',border:`2px solid ${rs.color}`}}/>}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg border-2 select-none ${routeMode?'animate-bounce':''}  ${rs.border}`}
                          style={{backgroundColor:rs.color+'22',boxShadow:(routeMode||isTutTarget)?`0 0 12px ${rs.color}`:'none'}}>
                          {rs.icon}
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 pointer-events-none" style={{zIndex:100}}>
                          <div className="px-1 py-0.5 rounded whitespace-nowrap font-bold"
                            style={{color:rs.color,textShadow:'0 0 4px #000, 0 0 8px #000',fontSize:'0.55rem'}}>
                            {p.country} {p.name}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 배는 transform 레이어 밖에서 렌더링 (크기 고정) */}

                {/* 항로 선 — 완료(밝음) + 잔여(점선) */}
                {cur?.isMoving && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{zIndex:5}}>
                    <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="2.5" orient="auto"><polygon points="0 0,8 2.5,0 5" fill="#d4a574"/></marker></defs>
                    {cur.startX != null && <line x1={`${cur.startX}%`} y1={`${cur.startY}%`} x2={`${cur.x}%`} y2={`${cur.y}%`} stroke="#facc15" strokeWidth="2" opacity="0.5"/>}
                    <line x1={`${cur.x}%`} y1={`${cur.y}%`} x2={`${cur.targetX}%`} y2={`${cur.targetY}%`} stroke="#d4a574" strokeWidth="2" strokeDasharray="8,4" opacity="0.7" markerEnd="url(#arr)"/>
                  </svg>
                )}
                {routeMode&&cur&&(
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{zIndex:4}}>
                    {Object.entries(PORTS).map(([k,p])=>Math.hypot(p.x-cur.x,p.y-cur.y)<0.5?null:<line key={k} x1={`${cur.x}%`} y1={`${cur.y}%`} x2={`${p.x}%`} y2={`${p.y}%`} stroke="#d4a574" strokeWidth="0.8" opacity="0.2"/>)}
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* 로그 */}
          <div className="mt-1 bg-ocean-dark rounded border border-gold border-opacity-40 px-3 py-1.5 max-h-16 overflow-y-auto flex-shrink-0">
            {log.map((m, i) => <div key={i} className={`text-xs ${i===0?'text-gold font-bold':'text-gray-500'}`}>{m}</div>)}
          </div>
        </div>

        {/* 우측 패널 */}
        <div className="w-72 flex flex-col gap-2 overflow-y-auto flex-shrink-0">
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
                      <span className="font-bold">{SHIP_TYPES[s.type].icon} {s.name}</span>
                      <span className="text-xs opacity-75">{cargoN(s)}/{st2.capacity}</span>
                    </div>
                    <div className="flex justify-between opacity-80 mb-1">
                      <span>{s.isMoving?(s.booster?'⚡ 부스터':isStormed?'⛈️ 폭풍':'🔄 항해 중'):'⚓ 정박'}</span>
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
                    <div className="flex justify-between"><span className="font-bold text-gold">{t.icon} {t.name}</span><span className="text-yellow-300">{t.cost.toLocaleString()}금</span></div>
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
                <div className="text-sm font-bold text-gold">{SHIP_TYPES[cur.type].icon} {cur.name}</div>
                <button onClick={() => setRouteMode(!routeMode)} className={`px-2 py-0.5 rounded text-xs font-bold ${routeMode?'bg-gold text-ocean-dark animate-pulse':'bg-ocean-blue text-gray-300 hover:text-gold'}`}>{routeMode?'🎯 항로중':'🗺️ 항로'}</button>
              </div>
              <div className="flex gap-0.5 mb-2">
                {[['info','현황'],['crew','승무원'],['cargo','화물'],['upgrade','업그레이드']].map(([k,l]) => (
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
                          ⚡ {cur.booster?'부스터 ON — 클릭해서 해제':(cur.fuel??100)>=20?'부스터 OFF (연료2배, 시간-30%)':'부스터 불가 (연료 20% 필요)'}
                        </button>
                        <button onClick={() => boost()} className="w-full px-2 py-1 rounded text-xs font-bold bg-blue-900 hover:bg-blue-700 text-blue-200 border border-blue-500">💎 즉시 도착 ({gs.gems}개 보석)</button>
                      </div>
                    )}
                  </div>
                )}
                {tab==='crew'&&(!atPort?portGuard('승무원 관리'):(
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-bold text-gold mb-1">탑승 ({gs.crew.filter(c=>c.shipId===cur.id).length}/{st.maxCrew}) | 수리력: {st.totalRepair}</div>
                      {gs.crew.filter(c=>c.shipId===cur.id).length===0
                        ?<div className="text-xs text-red-400 text-center py-1 border border-red-800 rounded">⚠️ 승무원 없음 — 출항 불가</div>
                        :gs.crew.filter(c=>c.shipId===cur.id).map(c => (
                          <div key={c.id} className="flex items-center justify-between bg-ocean-dark rounded px-2 py-1 text-xs mb-1">
                            <div>
                              <span className={`font-bold ${rarityColor(c.rarity)}`}>{c.name}</span>
                              {c.label&&<span className={`ml-1 text-xs ${rarityColor(c.rarity)}`}>{c.label}</span>}
                              <div className="text-gray-300">항:{c.navigation} 상:{c.trading} <span className={c.repair>0?'text-green-400':'text-gray-600'}>수:{c.repair}</span></div>
                              {c.specialty&&<div className="text-blue-400 text-xs">{c.specialty==='any'?'전항로 특화':REGION_STYLE[c.specialty]?.label+' 특화'}</div>}
                            </div>
                            <button onClick={() => unassign(c.id)} className="text-red-400 hover:text-red-300 ml-1">↩</button>
                          </div>
                        ))}
                    </div>
                    {gs.crew.filter(c=>!c.shipId).length>0&&(
                      <div>
                        <div className="text-xs font-bold text-gold mb-1">미배치</div>
                        {gs.crew.filter(c=>!c.shipId).map(c => (
                          <div key={c.id} className="flex items-center justify-between bg-ocean-dark rounded px-2 py-1 text-xs mb-1">
                            <div><span className={`font-bold ${rarityColor(c.rarity)}`}>{c.name}</span>{c.label&&<span className={`ml-1 ${rarityColor(c.rarity)}`}>{c.label}</span>}<div className="text-gray-300">항:{c.navigation} 상:{c.trading} <span className={c.repair>0?'text-green-400':'text-gray-600'}>수:{c.repair}</span></div></div>
                            <div className="flex gap-1 ml-1"><button onClick={() => assign(c.id,cur.id)} className="text-green-400 text-xs">↑탑승</button><button onClick={() => dismiss(c.id)} className="text-red-400 text-xs ml-1">✕</button></div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <div className="flex justify-between items-center mb-1"><div className="text-xs font-bold text-gold">모집 가능</div><button onClick={refreshCrew} className="text-xs text-gray-400 hover:text-gold">🔄 500금</button></div>
                      {gs.availableCrew.map(c => (
                        <div key={c.id} className="flex items-center justify-between bg-ocean-dark border border-gray-700 rounded px-2 py-1 text-xs mb-1">
                          <div><span className={`font-bold ${rarityColor(c.rarity)}`}>{c.name}</span>{c.label&&<div className={rarityColor(c.rarity)}>{c.label}</div>}<div className="text-gray-400">항:{c.navigation} 상:{c.trading} <span className={c.repair>0?'text-green-400':'text-gray-600'}>수:{c.repair}</span></div></div>
                          <button onClick={() => hireCrew(c.id)} className="text-yellow-300 font-bold text-xs whitespace-nowrap ml-1">고용 {c.hireCost}금</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {tab==='cargo'&&(
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-gold">화물 ({cargoN(cur)}/{st.capacity})</span>
                      {atPort&&cargoN(cur)>0&&<span className="text-xs text-green-400 font-bold">예상 {cargoSellTotal(cur,portKey).toLocaleString()}금</span>}
                    </div>
                    {Object.keys(cur.cargo).length===0?<div className="text-xs text-gray-500 text-center py-2">화물 없음</div>
                      :Object.entries(cur.cargo).map(([r,n]) => {
                          const sellP = atPort?getSell(r):null;
                          return <div key={r} className="flex justify-between items-center text-xs bg-ocean-dark rounded px-2 py-1.5 mb-1">
                            <span className="flex items-center gap-1">{RESOURCES[r].icon} {r}</span>
                            <div className="text-right"><span className="text-gold font-bold">×{n}</span>{sellP&&<div className="text-green-400">{sellP.toLocaleString()}금/개 = {(sellP*n).toLocaleString()}금</div>}</div>
                          </div>;
                        })}
                    {atPort&&cargoN(cur)>0&&<button onClick={() => setShowSellModal(true)} className="w-full mt-2 py-1.5 rounded text-xs font-bold bg-green-900 hover:bg-green-700 text-green-200 border border-green-600">💰 판매하기</button>}
                  </div>
                )}
                {tab==='upgrade'&&(!atPort?portGuard('업그레이드'):(
                  <div className="space-y-2">
                    {[{k:'speed',l:'⛵ 돛',d:'속도 +15%/레벨',b:2000},{k:'cargo',l:'📦 화물칸',d:'적재량 +25/레벨',b:1500},{k:'crew',l:'🛏️ 선원숙소',d:'최대 승무원 +1/레벨',b:1000}].map(({k,l,d,b}) => {
                      const lv=cur.upgrades[k], cost=b*(lv+1);
                      return <div key={k} className="bg-ocean-dark rounded p-2">
                        <div className="flex justify-between items-center mb-0.5"><span className="text-xs font-bold text-gold">{l}</span><span className="text-xs text-gray-400">Lv.{lv}/5</span></div>
                        <div className="text-xs text-gray-500 mb-1">{d}</div>
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
