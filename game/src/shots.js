// The screenshot scenes behind ?shot=start|drive|foot|getaway|vault. Each one plays
// the real rules forward from a fresh world for a fixed number of steps, so the frame
// is what a short game really looks like — and the same seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_BUSTED, EVENT_COMPLETE } from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const DRIVE_SECONDS = 5.5;
const FOOT_SECONDS = 5;
const GETAWAY_SECONDS = 2.5;

/** Steer toward a point, holding the gas — the car turns as it goes. */
function steerToward(player, tx, ty) {
  // Never brake into reverse: if the car is already rolling backwards, just drive
  // forward again instead of steering against it.
  if (player.speed < 0) return { up: true, down: false, left: false, right: false, enter: false, punch: false };
  const want = Math.atan2(ty - player.y, tx - player.x);
  let diff = want - player.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  // The car's angle decreases on a left turn (screen y points down), so a positive
  // diff — the target sits clockwise from the nose — means steer right. Brake into a
  // sharp turn, but only while there is speed to shed — below 40 the brake would
  // put the car in reverse.
  const braking = Math.abs(diff) > 0.6 && player.speed > 40;
  return {
    up: !braking,
    down: braking,
    left: diff < -0.12,
    right: diff > 0.12,
    enter: false,
    punch: false,
  };
}

/**
 * Drive the road grid to the mission marker: waypoints run along avenues and streets
 * (never through a block), so the car stays on the road and the frame shows a chase,
 * not a crash into a building.
 */
function driveAutopilot(world) {
  const player = world.state.player;
  const mission = world.currentMission();
  if (!mission) return { up: true, down: false, left: false, right: false, enter: false, punch: false };
  if (!world._driveWaypoints) {
    world._driveWaypoints = [
      { x: player.x, y: 480, slow: true },
      { x: 1120, y: 480 },
    ];
  }
  const waypoints = world._driveWaypoints;
  while (waypoints.length > 0 && Math.hypot(waypoints[0].x - player.x, waypoints[0].y - player.y) < 60) waypoints.shift();
  const target = waypoints.length > 0 ? waypoints[0] : mission.target;
  // Slow down for a turn waypoint: at full speed the turning circle is wider than
  // the road, and the car ends up in the building on the corner. Inside the zone the
  // car never floors it again — it brakes above 150 and coasts below it.
  const distToTarget = Math.hypot(target.x - player.x, target.y - player.y);
  if (waypoints.length > 0 && waypoints[0].slow && distToTarget < 260) {
    const input = steerToward(player, target.x, target.y);
    input.up = false;
    input.down = player.speed > 150;
    return input;
  }
  return steerToward(player, target.x, target.y);
}

/** Walk toward the nearest parked car and stop beside it — on foot, as the scene says. */
function footAutopilot(world) {
  const player = world.state.player;
  let best = null;
  let bestD = Infinity;
  for (const car of world.state.cars) {
    if (car.kind !== 'parked') continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  if (!best || bestD < 80) return { up: false, down: false, left: false, right: false, enter: false, punch: false };
  const want = Math.atan2(best.y - player.y, best.x - player.x);
  const dx = Math.cos(want);
  const dy = Math.sin(want);
  return {
    up: dy < -0.3, down: dy > 0.3, left: dx < -0.3, right: dx > 0.3,
    enter: false, punch: false,
  };
}

/**
 * Set `world` to the named scene (start, drive, foot, getaway or vault; any other
 * name is start) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'drive' && name !== 'foot' && name !== 'getaway' && name !== 'vault') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, {}, true);
    return { screen: SCREEN_TITLE };
  }
  if (name === 'vault') {
    // The fourth job: Dario on foot at the Solmar Bank door, the drill halfway
    // through the vault, the alarm wailing, two patrol cars closing in — the
    // heist at its hottest, under the midnight lamps.
    const state = world.state;
    state.missionIndex = 3;
    state.wanted = 2;
    state.clock = 0.5;
    state.player.x = 1900;
    state.player.y = 830;
    state.player.angle = -Math.PI / 2;
    state.player.onFoot = true;
    state.police.push(
      { kind: 'police', x: 1760, y: 1080, angle: -Math.PI / 2, speed: 180, color: '#1d2a44', siren: 0 },
      { kind: 'police', x: 2080, y: 1120, angle: -Math.PI / 2, speed: 160, color: '#1d2a44', siren: 2 },
    );
    for (let i = 0; i < 2.5 / STEP; i += 1) world.step(STEP, {}, true);
    // Set the crack after the ambient steps: stepping with the drill running
    // would finish the vault before the frame is taken.
    state.vaultCracking = true;
    state.vaultProgress = 0.55;
    state.alarmTimer = 3;
    state.nearTarget = true;
    state.message = 'Alarm! Stay at the vault door while the drill works.';
    state.messageTimer = 4;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'getaway') {
    // The third job: three stars, three patrol cars, Dario racing north up
    // Coral Row toward the safehouse — the chase at its hottest. The scene is
    // short on purpose: the patrol cars are faster than Dario, and a longer
    // run ends with him pinned against a wall at 0 km/h instead of racing.
    const state = world.state;
    const car = { kind: 'player', x: 1440, y: 1300, angle: -Math.PI / 2, speed: 280, color: '#d94f3d' };
    state.cars.push(car);
    state.player.car = car;
    state.player.onFoot = false;
    state.player.x = car.x;
    state.player.y = car.y;
    state.player.angle = car.angle;
    state.player.speed = 280;
    state.missionIndex = 2;
    state.wanted = 3;
    state.damage = 55;
    state.clock = 0.08;
    state.police.push(
      { kind: 'police', x: 1440, y: 1560, angle: -Math.PI / 2, speed: 220, color: '#1d2a44', siren: 0 },
      { kind: 'police', x: 1440, y: 1640, angle: -Math.PI / 2, speed: 200, color: '#1d2a44', siren: 2 },
      { kind: 'police', x: 1440, y: 1720, angle: -Math.PI / 2, speed: 190, color: '#1d2a44', siren: 4 },
    );
    world._driveWaypoints = [
      { x: 1440, y: 480, slow: true },
      { x: 480, y: 480 },
    ];
    let events = 0;
    for (let i = 0; i < GETAWAY_SECONDS / STEP; i += 1) {
      events = world.step(STEP, driveAutopilot(world), false);
      if (events & (EVENT_BUSTED | EVENT_COMPLETE)) break;
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'drive') {
    // Dario in a car heading north up Coral Row toward the Neon Palms job, wanted
    // level 2, two patrol cars on his tail, near midnight — headlights on, lamps
    // glowing, the gold route to the hotel dashed on the minimap and the street.
    const state = world.state;
    const car = { kind: 'player', x: 480, y: 1300, angle: -Math.PI / 2, speed: 260, color: '#f2f2f2' };
    state.cars.push(car);
    state.player.car = car;
    state.player.onFoot = false;
    state.player.x = car.x;
    state.player.y = car.y;
    state.player.angle = car.angle;
    state.player.speed = 260;
    state.missionIndex = 1;
    state.wanted = 2;
    state.clock = 0.45;
    state.police.push(
      { kind: 'police', x: 480, y: 1560, angle: -Math.PI / 2, speed: 200, color: '#1d2a44', siren: 0 },
      { kind: 'police', x: 480, y: 1640, angle: -Math.PI / 2, speed: 180, color: '#1d2a44', siren: 2 },
    );
    let events = 0;
    for (let i = 0; i < DRIVE_SECONDS / STEP; i += 1) {
      events = world.step(STEP, driveAutopilot(world), false);
      if (events & (EVENT_BUSTED | EVENT_COMPLETE)) break;
    }
    return { screen: SCREEN_PLAY };
  }
  // Foot: Dario on the sidewalk by the park, walking up to a parked car, pedestrians
  // about, the hotel job on the HUD — at dusk, the lamps just coming on.
  world.state.missionIndex = 1;
  world.state.clock = 0.12;
  let events = 0;
  for (let i = 0; i < FOOT_SECONDS / STEP; i += 1) {
    events = world.step(STEP, footAutopilot(world), false);
    if (events & (EVENT_BUSTED | EVENT_COMPLETE)) break;
  }
  return { screen: SCREEN_PLAY };
}
