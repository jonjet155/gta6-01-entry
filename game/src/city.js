// The city of Solmar: a road grid, blocks of buildings, a park, the harbour docks and
// the parking lots. Everything is placed from the seed, so the same seed is the same city.
import { ROAD_AXES_H, ROAD_AXES_V, ROAD_WIDTH, WORLD, WATER_Y, DOCKS_Y, PALETTE, CAR_COLORS } from './config.js';
import { int, pick, range } from './random.js';

const ROOFS = [PALETTE.roofTerracotta, PALETTE.roofTeal, PALETTE.roofCream, PALETTE.roofCoral, PALETTE.roofSlate];

/** True when the point sits on a road (or in the harbour strip). */
export function isOnRoad(city, x, y) {
  const half = ROAD_WIDTH / 2;
  for (const axis of ROAD_AXES_V) if (Math.abs(x - axis) <= half) return true;
  for (const axis of ROAD_AXES_H) if (Math.abs(y - axis) <= half) return true;
  return false;
}

/** The nearest road axis to a point, as { vertical: boolean, axis: number, along: number }. */
export function nearestRoad(x, y) {
  let bestV = ROAD_AXES_V[0];
  for (const axis of ROAD_AXES_V) if (Math.abs(x - axis) < Math.abs(x - bestV)) bestV = axis;
  let bestH = ROAD_AXES_H[0];
  for (const axis of ROAD_AXES_H) if (Math.abs(y - axis) < Math.abs(y - bestH)) bestH = axis;
  return Math.abs(x - bestV) <= Math.abs(y - bestH)
    ? { vertical: true, axis: bestV, along: y }
    : { vertical: false, axis: bestH, along: x };
}

/** True when a circle of radius `r` at (x, y) overlaps a building or leaves the world. */
export function hitsBuilding(city, x, y, r) {
  if (x < r || y < r || x > WORLD.width - r || y > WORLD.height - r) return true;
  if (y > WATER_Y - 4 && !(x > 560 && x < 2000 && y < DOCKS_Y + 40)) return true;
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return false;
}

/** True when a circle of radius `r` at (x, y) is in the water (not on the pier). */
export function inWater(city, x, y) {
  return y > WATER_Y;
}

export function generateCity(rng) {
  const buildings = [];
  const trees = [];
  const parked = [];
  const half = ROAD_WIDTH / 2;
  const pad = 14;

  // One park block, one parking-lot block, one plaza block, the rest built up.
  const parkCol = 1;
  const parkRow = 2;
  const lotCol = 5;
  const lotRow = 0;
  const plazaCol = 6;
  const plazaRow = 2;

  for (let col = 0; col < ROAD_AXES_V.length - 1; col += 1) {
    for (let row = 0; row < ROAD_AXES_H.length - 1; row += 1) {
      const x0 = ROAD_AXES_V[col] + half + pad;
      const x1 = ROAD_AXES_V[col + 1] - half - pad;
      const y0 = ROAD_AXES_H[row] + half + pad;
      const y1 = ROAD_AXES_H[row + 1] - half - pad;
      if (col === parkCol && row === parkRow) {
        for (let i = 0; i < 26; i += 1) {
          trees.push({ x: range(rng, x0 + 10, x1 - 10), y: range(rng, y0 + 10, y1 - 10), r: range(rng, 9, 16) });
        }
        continue;
      }
      if (col === lotCol && row === lotRow) {
        for (let i = 0; i < 8; i += 1) {
          parked.push({
            x: x0 + 24 + (i % 4) * 52,
            y: y0 + 30 + Math.floor(i / 4) * 60,
            angle: Math.PI / 2,
            color: pick(rng, CAR_COLORS),
          });
        }
        continue;
      }
      // Palm Court plaza: open stone, a fountain in the middle, trees at the
      // corners — the only block with nowhere to hide a car.
      if (col === plazaCol && row === plazaRow) {
        for (let i = 0; i < 10; i += 1) {
          trees.push({ x: range(rng, x0 + 10, x1 - 10), y: range(rng, y0 + 10, y1 - 10), r: range(rng, 8, 13) });
        }
        continue;
      }
      // The Neon Palms hotel owns its whole block: the tallest building in Solmar.
      if (col === 3 && row === 1) {
        buildings.push({
          x: (x0 + x1) / 2 - 65, y: (y0 + y1) / 2 - 65, w: 130, h: 130,
          color: PALETTE.roofTeal, floors: 9, hotel: true,
        });
        continue;
      }
      const count = int(rng, 1, 3);
      if (count === 1) {
        buildings.push({
          x: x0 + 8, y: y0 + 8, w: x1 - x0 - 16, h: y1 - y0 - 16,
          color: pick(rng, ROOFS), floors: int(rng, 2, 6),
        });
      } else {
        const splitVertical = (x1 - x0) > (y1 - y0);
        for (let i = 0; i < count; i += 1) {
          if (splitVertical) {
            const w = (x1 - x0) / count;
            buildings.push({ x: x0 + i * w + 4, y: y0 + 8, w: w - 8, h: y1 - y0 - 16, color: pick(rng, ROOFS), floors: int(rng, 1, 5) });
          } else {
            const h = (y1 - y0) / count;
            buildings.push({ x: x0 + 8, y: y0 + i * h + 4, w: x1 - x0 - 16, h: h - 8, color: pick(rng, ROOFS), floors: int(rng, 1, 5) });
          }
        }
      }
      // A couple of street trees on the block corners.
      trees.push({ x: x0 + 4, y: y0 + 4, r: 8 });
      trees.push({ x: x1 - 4, y: y1 - 4, r: 8 });
    }
  }

  const hotel = buildings.find((b) => b.hotel) ?? { x: 1215, y: 255, w: 130, h: 130, color: PALETTE.roofTeal, floors: 9, hotel: true };

  // Parked cars along a few curbs, for the player to steal.
  const curbSpots = [
    { x: 480 + 30, y: 300, angle: Math.PI / 2 },
    { x: 800 - 30, y: 620, angle: -Math.PI / 2 },
    { x: 1440 + 30, y: 980, angle: Math.PI / 2 },
    { x: 1120 - 30, y: 1300, angle: -Math.PI / 2 },
    { x: 2080 + 30, y: 420, angle: Math.PI / 2 },
    { x: 2400 - 30, y: 1120, angle: -Math.PI / 2 },
  ];
  for (const spot of curbSpots) parked.push({ ...spot, color: pick(rng, CAR_COLORS) });

  // Crates stacked along the pier, street lamps on the avenue corners, and the
  // named places the renderer labels on the map.
  const crates = [];
  for (let i = 0; i < 12; i += 1) {
    crates.push({
      x: 620 + (i % 6) * 210 + range(rng, -20, 20),
      y: DOCKS_Y - 42 + Math.floor(i / 6) * 26,
      s: range(rng, 16, 24),
    });
  }
  const lamps = [];
  for (const axis of ROAD_AXES_V) {
    for (const cross of ROAD_AXES_H) {
      if (cross >= WATER_Y) continue;
      lamps.push({ x: axis + ROAD_WIDTH / 2 + 6, y: cross - ROAD_WIDTH / 2 - 6 });
    }
  }
  const landmarks = [
    { name: 'NEON PALMS', x: 1150, y: 420 },
    { name: 'DOCKS', x: 1280, y: 1600 },
    { name: 'SAFEHOUSE', x: 240, y: 240 },
    { name: 'PALM COURT', x: 2080, y: 800 },
    { name: 'THE PARK', x: 640, y: 1120 },
  ];

  return {
    buildings,
    trees,
    parked,
    crates,
    lamps,
    landmarks,
    plaza: { x: ROAD_AXES_V[plazaCol] + half + pad, y: ROAD_AXES_H[plazaRow] + half + pad, w: 320 - ROAD_WIDTH - pad * 2, h: 320 - ROAD_WIDTH - pad * 2 },
    park: { x: ROAD_AXES_V[parkCol] + half + pad, y: ROAD_AXES_H[parkRow] + half + pad, w: 320 - ROAD_WIDTH - pad * 2, h: 320 - ROAD_WIDTH - pad * 2 },
    hotel,
    playerSpawn: { x: 480, y: 560 },
    pier: { x0: 560, x1: 2000, y: DOCKS_Y },
  };
}
