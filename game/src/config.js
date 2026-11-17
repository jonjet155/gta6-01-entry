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
  buildingSide: 'rgba(0,0,0,0.22)',
  player: '#f2f2f2',
  playerJacket: '#22304a',
};

export const CAR_COLORS = ['#d94f3d', '#e8a13a', '#3f7fd9', '#4fae62', '#e5e5e5', '#7a4fd0', '#222831', '#e06ba8'];
export const PED_COLORS = ['#e8e3d5', '#7fb3d5', '#e8a13a', '#c96f4a', '#8a7fd0', '#4fae62'];
