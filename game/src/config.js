// SOLMAR HEAT — configuration: every number the game tunes by lives here, so the
// world, the renderer and the screenshots all agree on one city.
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-heat-save-v1';

export const WORLD = { width: 2560, height: 1920 };
export const ROAD_WIDTH = 96;
export const ROAD_AXES_V = [160, 480, 800, 1120, 1440, 1760, 2080, 2400];
export const ROAD_AXES_H = [160, 480, 800, 1120, 1440];
export const WATER_Y = 1680;
export const DOCKS_Y = 1600;

export const PLAYER_WALK_SPEED = 175;
export const PLAYER_CAR_ACCEL = 260;
export const PLAYER_CAR_BRAKE = 420;
export const PLAYER_CAR_MAX = 430;
export const PLAYER_CAR_REVERSE_MAX = 140;
export const TRAFFIC_SPEED_MIN = 110;
export const TRAFFIC_SPEED_MAX = 165;
export const POLICE_SPEED = 395;
export const PED_SPEED_MIN = 28;
export const PED_SPEED_MAX = 52;

export const CAR_LENGTH = 46;
export const CAR_WIDTH = 22;
export const WANTED_MAX = 5;
export const WANTED_DECAY_SECONDS = 18;

// How many cars and walkers the city starts with (world.js reads these).
export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 24;
// Police appear this far from the player, on a road, when the heat rises.
export const POLICE_SPAWN_DISTANCE = 420;
// Inside this range a patrol car keeps the wanted clock from cooling off.
export const WANTED_SIGHT_RANGE = 260;
// The speedometer's units: world speed (px/s) times this is km/h.
export const SPEED_KMH = 0.55;
// The car's condition, the night clock and the two late jobs (world.js reads these).
export const CAR_HP_MAX = 100;
export const CAR_SMOKE_DAMAGE = 50;
// A horn blast makes nearby pedestrians run for this many seconds.
export const HONK_FLEE_SECONDS = 1.2;
// Traffic lights swap every TRAFFIC_LIGHT_CYCLE seconds: green one way, red
// the other, so the cross traffic takes turns at every intersection.
export const TRAFFIC_LIGHT_CYCLE = 8;
// One full night — dusk (21:00) to dawn (05:00) — lasts this many real seconds.
// The clock starts just after sunset and the city darkens toward midnight.
export const CLOCK_DAY_SECONDS = 240;
export const CLOCK_START = 0.06;
// The vault takes this long to crack while Dario stays at the bank door; the
// alarm adds this many wanted stars the moment the drill starts.
export const VAULT_CRACK_SECONDS = 4;
export const VAULT_ALARM_WANTED = 2;
// The last run: the boat at the pier leaves after this many seconds. Too slow
// and the crew gives Dario one more shot, from the top of the timer.
export const LAST_RUN_SECONDS = 75;
// The radio: three pirate stations, all WebAudio synth, switched with R.
export const STATIONS = [
  { name: 'SOLMAR FM 88.5', blurb: 'SUNSET SYNTH' },
  { name: 'PALM 101.2', blurb: 'LO-FI NIGHTS' },
  { name: 'TROPICANA 94.7', blurb: 'SALSA CALIENTE' },
];

// Named neighbourhoods, for the HUD's "you are here" line and the minimap.
// Each rectangle is { x, y, w, h } in world units.
export const DISTRICTS = [
  { name: 'CORAL ROW', x: 0, y: 0, w: 560, h: 560 },
  { name: 'NEON PALMS', x: 560, y: 0, w: 1120, h: 560 },
  { name: 'PALM COURT', x: 1680, y: 0, w: 880, h: 560 },
  { name: 'OLD TOWN', x: 0, y: 560, w: 1120, h: 560 },
  { name: 'THE PARK', x: 1120, y: 560, w: 560, h: 560 },
  { name: 'MARINA HEIGHTS', x: 1680, y: 560, w: 880, h: 560 },
  { name: 'THE DOCKS', x: 0, y: 1120, w: 2560, h: 800 },
];

export const MISSIONS = [
  {
    id: 'pickup',
    title: 'THE PICKUP',
    text: 'Pick up the package at the Solmar docks. Press E at the marker.',
    target: { x: 1280, y: 1620, label: 'DOCKS' },
    reward: 250,
  },
  {
    id: 'delivery',
    title: 'THE DELIVERY',
    text: 'Deliver the package to the Neon Palms hotel. Stay out of trouble.',
    target: { x: 1150, y: 480, label: 'NEON PALMS' },
    reward: 500,
  },
  {
    id: 'getaway',
    title: 'THE GETAWAY',
    text: 'Lose the cops first — then reach the safehouse on Coral Row.',
    target: { x: 240, y: 240, label: 'SAFEHOUSE' },
    reward: 1000,
  },
  {
    id: 'vault',
    title: 'THE VAULT',
    text: 'Crack the Solmar Bank vault. The alarm will bring every cop in town.',
    target: { x: 1920, y: 800, label: 'SOLMAR BANK' },
    reward: 1500,
  },
  {
    id: 'lastrun',
    title: 'THE LAST RUN',
    text: 'The boat leaves the pier in 75 seconds. Get there — with the money.',
    target: { x: 1280, y: 1620, label: 'THE PIER' },
    reward: 2000,
  },
];

// Sun-soaked coastal palette: sand, terracotta, teal, coral — the city's own look.
export const PALETTE = {
  ground: '#cdb98d',
  sidewalk: '#b3a37e',
  road: '#3b4048',
  roadEdge: '#2c3038',
  lane: '#e8c85a',
  water: '#2b7d9c',
  waterDeep: '#1f6179',
  pier: '#8a6b4a',
  park: '#69a25e',
  parkDark: '#4f8148',
  tree: '#2f6b2f',
  treeLight: '#57a047',
  roofTerracotta: '#c96f4a',
  roofTeal: '#3f8f8a',
  roofCream: '#e3d3a7',
  roofCoral: '#d95f5f',
  roofSlate: '#5d6b7a',
  roofGold: '#d9a441',
  buildingSide: 'rgba(0,0,0,0.22)',
  player: '#f2f2f2',
  playerJacket: '#22304a',
  // Headlight cones, plaza stone, crate wood, harbour foam.
  headlight: 'rgba(255,233,168,0.16)',
  plaza: '#c4b28a',
  plazaDark: '#a8946c',
  fountain: '#4fa8c9',
  crate: '#a97e4f',
  crateDark: '#7d5a35',
  foam: 'rgba(255,255,255,0.35)',
  lamp: '#ffd98a',
  smoke: 'rgba(90,90,90,0.45)',
  // The night: a deep blue wash laid over the city after midnight, lit
  // windows, the bank's gold, and the vault alarm's red.
  night: '10,14,40',
  windowLit: '#ffd98a',
  bankGold: '#d9a441',
  alarm: '#ff2d2d',
  route: '#ffd23e',
  lightGreen: '#37d67a',
  lightRed: '#ff2d2d',
};

export const CAR_COLORS = ['#d94f3d', '#e8a13a', '#3f7fd9', '#4fae62', '#e5e5e5', '#7a4fd0', '#222831', '#e06ba8'];
export const PED_COLORS = ['#e8e3d5', '#7fb3d5', '#e8a13a', '#c96f4a', '#8a7fd0', '#4fae62'];
