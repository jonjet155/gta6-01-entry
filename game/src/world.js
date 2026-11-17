// SOLMAR HEAT — the world: the player on foot or in a car, traffic, pedestrians,
// police, the wanted level, the night clock and the five-mission story. One fixed
// step at a time.
import {
  CAR_COLORS, CAR_HP_MAX, CAR_LENGTH, CAR_SMOKE_DAMAGE, CAR_WIDTH, CLOCK_DAY_SECONDS, CLOCK_START,
  DISTRICTS, HONK_FLEE_SECONDS, LAST_RUN_SECONDS, MISSIONS, PED_COLORS, PED_COUNT, PED_SPEED_MAX,
  PED_SPEED_MIN, PLAYER_CAR_ACCEL, PLAYER_CAR_BRAKE, PLAYER_CAR_MAX, PLAYER_CAR_REVERSE_MAX,
  PLAYER_WALK_SPEED, POLICE_SPAWN_DISTANCE, POLICE_SPEED, ROAD_AXES_H, ROAD_AXES_V, ROAD_WIDTH,
  STATIONS, TRAFFIC_COUNT, TRAFFIC_LIGHT_CYCLE, TRAFFIC_SPEED_MAX, TRAFFIC_SPEED_MIN, VAULT_ALARM_WANTED,
  VAULT_CRACK_SECONDS, WANTED_DECAY_SECONDS, WANTED_MAX, WANTED_SIGHT_RANGE, WORLD,
} from './config.js';
import { generateCity, hitsBuilding, inWater } from './city.js';
import { int, pick, range } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_DELIVERED = 2;
export const EVENT_BUSTED = 4;
export const EVENT_COMPLETE = 8;
export const EVENT_CRIME = 16;
export const EVENT_THUD = 32;
export const EVENT_HONK = 64;
export const EVENT_ALARM = 128;

const LANE = 22;
const SIDEWALK = ROAD_WIDTH / 2 + 12;

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function turnToward(angle, target, maxStep) {
  let diff = target - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return angle + Math.max(-maxStep, Math.min(maxStep, diff));
}

export function createWorld(rng, seed) {
  const city = generateCity(rng);
  const state = {
    seed,
    time: 0,
    city,
    player: { x: city.playerSpawn.x, y: city.playerSpawn.y, angle: -Math.PI / 2, speed: 0, onFoot: true, car: null },
    cars: [],
    peds: [],
    police: [],
    wanted: 0,
    quietTime: 0,
    missionIndex: 0,
    hasPackage: false,
    cash: 0,
    message: '',
    messageTimer: 0,
    nearTarget: false,
    busted: false,
    completed: false,
    lastThud: 0,
    // Car condition: 0 is showroom-fresh, CAR_HP_MAX is a smoking wreck.
    damage: 0,
    // Short-lived crash puffs and exhaust smoke, drawn by the renderer.
    particles: [],
    smokeTimer: 0,
    honkTimer: 0,
    district: 'CORAL ROW',
    // The night clock: 0 is dusk (21:00), 0.5 is the darkest hour (01:00),
    // 1 is dawn (05:00). A whole night lasts CLOCK_DAY_SECONDS of play.
    clock: CLOCK_START,
    // The vault job: cracking runs only while Dario stays at the bank door.
    vaultCracking: false,
    vaultProgress: 0,
    // The last run's countdown, in seconds; 0 means no timer is running.
    missionTimer: 0,
    // Seconds left on the vault alarm's flashing banner.
    alarmTimer: 0,
    // Which pirate radio station is playing (index into STATIONS).
    station: 0,
  };

  function say(text, seconds = 3) {
    state.message = text;
    state.messageTimer = seconds;
  }

  function addWanted(n) {
    const before = state.wanted;
    state.wanted = Math.min(WANTED_MAX, state.wanted + n);
    state.quietTime = 0;
    if (state.wanted > before) return EVENT_CRIME;
    return EVENT_NONE;
  }

  function spawnTrafficCar() {
    const vertical = rng() < 0.5;
    const axis = pick(rng, vertical ? ROAD_AXES_V : ROAD_AXES_H);
    const dir = rng() < 0.5 ? 1 : -1;
    const along = range(rng, 200, (vertical ? WORLD.height : WORLD.width) - 400);
    return {
      kind: 'traffic', x: 0, y: 0, angle: 0, speed: range(rng, TRAFFIC_SPEED_MIN, TRAFFIC_SPEED_MAX),
      color: pick(rng, CAR_COLORS), vertical, axis, along, dir, lane: LANE * dir,
    };
  }

  function placeTrafficCar(car) {
    if (car.vertical) {
      car.x = car.axis + car.lane;
      car.y = car.along;
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      car.x = car.along;
      car.y = car.axis + car.lane;
      car.angle = car.dir > 0 ? 0 : Math.PI;
    }
  }

  function spawnPed() {
    const vertical = rng() < 0.5;
    const axis = pick(rng, vertical ? ROAD_AXES_V : ROAD_AXES_H);
    const side = rng() < 0.5 ? 1 : -1;
    const along = range(rng, 120, (vertical ? WORLD.height : WORLD.width) - 200);
    return {
      x: vertical ? axis + SIDEWALK * side : along,
      y: vertical ? along : axis + SIDEWALK * side,
      vertical, axis, side, along, dir: rng() < 0.5 ? 1 : -1,
      speed: range(rng, PED_SPEED_MIN, PED_SPEED_MAX),
      color: pick(rng, PED_COLORS), down: 0, downTimer: 0,
    };
  }

  function spawnPolice() {
    const road = nearestRoadPoint(state.player.x, state.player.y, POLICE_SPAWN_DISTANCE);
    return {
      kind: 'police', x: road.x, y: road.y, angle: 0, speed: 0,
      color: '#1d2a44', siren: rng() * Math.PI * 2,
    };
  }

  /** A burst of smoke/spark puffs at (x, y) — crashes, rams and exhaust. */
  function burst(x, y, count, speed = 60) {
    for (let i = 0; i < count; i += 1) {
      const angle = rng() * Math.PI * 2;
      const v = range(rng, speed * 0.4, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - 20,
        life: range(rng, 0.4, 0.9), maxLife: 0.9,
      });
    }
    if (state.particles.length > 120) state.particles.splice(0, state.particles.length - 120);
  }

  /** The named neighbourhood the player is standing in. */
  function districtAt(x, y) {
    for (const d of DISTRICTS) {
      if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
    }
    return 'SOLMAR';
  }

  // A point on a road roughly `away` from (x, y), for police to appear on.
  function nearestRoadPoint(x, y, away) {
    const axes = [];
    for (const a of ROAD_AXES_V) axes.push({ vertical: true, axis: a });
    for (const a of ROAD_AXES_H) axes.push({ vertical: false, axis: a });
    let best = null;
    let bestScore = -1;
    for (const road of axes) {
      for (const dir of [1, -1]) {
        const along = (road.vertical ? y : x) + dir * away;
        const px = road.vertical ? road.axis : along;
        const py = road.vertical ? along : road.axis;
        if (px < 60 || py < 60 || px > WORLD.width - 60 || py > WORLD.height - 60) continue;
        const score = rng();
        if (score > bestScore) { bestScore = score; best = { x: px, y: py }; }
      }
    }
    return best ?? { x: 480, y: 480 };
  }

  function reset() {
    state.time = 0;
    state.player = { x: city.playerSpawn.x, y: city.playerSpawn.y, angle: -Math.PI / 2, speed: 0, onFoot: true, car: null };
    state.cars = [];
    for (const spot of city.parked) {
      state.cars.push({ kind: 'parked', x: spot.x, y: spot.y, angle: spot.angle, speed: 0, color: spot.color });
    }
    for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
      const car = spawnTrafficCar();
      placeTrafficCar(car);
      state.cars.push(car);
    }
    state.peds = [];
    for (let i = 0; i < PED_COUNT; i += 1) state.peds.push(spawnPed());
    state.police = [];
    state.wanted = 0;
    state.quietTime = 0;
    state.missionIndex = 0;
    state.hasPackage = false;
    state.cash = 0;
    state.message = '';
    state.messageTimer = 0;
    state.nearTarget = false;
    state.busted = false;
    state.completed = false;
    state.lastThud = 0;
    state.damage = 0;
    state.particles = [];
    state.smokeTimer = 0;
    state.honkTimer = 0;
    state.district = 'CORAL ROW';
    state.clock = CLOCK_START;
    state.vaultCracking = false;
    state.vaultProgress = 0;
    state.missionTimer = 0;
    state.alarmTimer = 0;
    state.station = 0;
  }

  function updateTraffic(dt) {
    for (const car of state.cars) {
      if (car.kind !== 'traffic') continue;
      const limit = (car.vertical ? WORLD.height : WORLD.width) - 120;
      car.along += car.dir * car.speed * dt;
      if (car.along < 100) { car.along = 100; car.dir = 1; }
      if (car.along > limit) { car.along = limit; car.dir = -1; }
      // At an intersection, sometimes turn onto the crossing road.
      const crossings = car.vertical ? ROAD_AXES_H : ROAD_AXES_V;
      for (const cross of crossings) {
        if (Math.abs(car.along - cross) < 4 && rng() < 0.06) {
          const wasVertical = car.vertical;
          car.vertical = !wasVertical;
          car.axis = cross;
          car.along = wasVertical ? car.x : car.y;
          car.dir = rng() < 0.5 ? 1 : -1;
          car.lane = LANE * car.dir;
          break;
        }
      }
      // Traffic lights: at an intersection the cross traffic gets the green
      // while this road waits. A car stops at the stop line when its light is
      // red — it never runs a red into the crossing. The light is green for
      // the north-south roads half the cycle, then for the east-west roads.
      // (Recomputed here: the turn above may have changed the car's road.)
      let redAhead = false;
      const crossAxes = car.vertical ? ROAD_AXES_H : ROAD_AXES_V;
      for (const cross of crossAxes) {
        const gap = (cross - car.along) * car.dir;
        if (gap > 0 && gap < 80) {
          const greenForVertical = Math.floor(state.time / TRAFFIC_LIGHT_CYCLE) % 2 === 0;
          const greenForMe = car.vertical ? greenForVertical : !greenForVertical;
          if (!greenForMe) redAhead = true;
          break;
        }
      }
      // Slow down for the car ahead in the same lane.
      let ahead = Infinity;
      for (const other of state.cars) {
        if (other === car || other.kind !== 'traffic' || other.vertical !== car.vertical || other.axis !== car.axis || other.dir !== car.dir) continue;
        const gap = (other.along - car.along) * car.dir;
        if (gap > 0 && gap < ahead) ahead = gap;
      }
      const targetSpeed = redAhead || ahead < 70 ? 0 : range(rng, TRAFFIC_SPEED_MIN, TRAFFIC_SPEED_MAX) * (ahead < 130 ? 0.5 : 1);
      car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 2);
      placeTrafficCar(car);
    }
  }

  function updatePeds(dt) {
    const player = state.player;
    let events = EVENT_NONE;
    for (const ped of state.peds) {
      if (ped.downTimer > 0) {
        ped.downTimer -= dt;
        if (ped.downTimer <= 0) ped.down = 0;
        continue;
      }
      // Flee a speeding car nearby — or a horn blast, which clears the road
      // ahead for a second and is the polite way to move a crowd.
      let fleeX = 0;
      let fleeY = 0;
      if (!player.onFoot && player.speed > 80 && dist(ped.x, ped.y, player.x, player.y) < 110) {
        fleeX = ped.x - player.x;
        fleeY = ped.y - player.y;
      } else if (state.honkTimer > 0 && dist(ped.x, ped.y, player.x, player.y) < 160) {
        fleeX = ped.x - player.x;
        fleeY = ped.y - player.y;
      }
      const limit = (ped.vertical ? WORLD.height : WORLD.width) - 120;
      if (fleeX !== 0 || fleeY !== 0) {
        const len = Math.hypot(fleeX, fleeY) || 1;
        ped.x += (fleeX / len) * ped.speed * 2.4 * dt;
        ped.y += (fleeY / len) * ped.speed * 2.4 * dt;
        // Keep `along` in step with the flee, or the pedestrian snaps back to
        // where it was when it stops running.
        ped.along = ped.vertical ? ped.y : ped.x;
      } else {
        ped.along += ped.dir * ped.speed * dt;
        if (ped.along < 100) { ped.along = 100; ped.dir = 1; }
        if (ped.along > limit) { ped.along = limit; ped.dir = -1; }
        if (ped.vertical) { ped.x = ped.axis + SIDEWALK * ped.side; ped.y = ped.along; }
        else { ped.x = ped.along; ped.y = ped.axis + SIDEWALK * ped.side; }
        // Sometimes turn at an intersection.
        const crossings = ped.vertical ? ROAD_AXES_H : ROAD_AXES_V;
        for (const cross of crossings) {
          if (Math.abs(ped.along - cross) < 3 && rng() < 0.03) {
            ped.vertical = !ped.vertical;
            ped.axis = cross;
            ped.along = ped.vertical ? ped.y : ped.x;
            ped.dir = rng() < 0.5 ? 1 : -1;
            ped.side = rng() < 0.5 ? 1 : -1;
            break;
          }
        }
      }
      // Run over by the player's car. (Accumulate: an earlier version returned
      // here and skipped every pedestrian after the first one that frame.)
      if (!player.onFoot && Math.abs(player.speed) > 60 && dist(ped.x, ped.y, player.x, player.y) < 30) {
        ped.down = 1;
        ped.downTimer = 3;
        state.lastThud = state.time;
        burst(ped.x, ped.y, 6, 50);
        events |= addWanted(1);
        say('Pedestrian hit! The cops saw that.');
        events |= EVENT_CRIME | EVENT_THUD;
      }
    }
    return events;
  }

  function updatePolice(dt) {
    const player = state.player;
    const want = Math.min(state.wanted, 3);
    while (state.police.length < want) state.police.push(spawnPolice());
    while (state.police.length > want) state.police.pop();
    for (const cop of state.police) {
      const targetAngle = angleTo(cop.x, cop.y, player.x, player.y);
      cop.angle = turnToward(cop.angle, targetAngle, 2.8 * dt);
      cop.speed = Math.min(POLICE_SPEED, cop.speed + 300 * dt);
      const nx = cop.x + Math.cos(cop.angle) * cop.speed * dt;
      const ny = cop.y + Math.sin(cop.angle) * cop.speed * dt;
      if (!hitsBuilding(city, nx, ny, 16)) { cop.x = nx; cop.y = ny; }
      else { cop.angle += Math.PI / 2; cop.speed *= 0.5; }
      cop.siren += dt * 6;
      const d = dist(cop.x, cop.y, player.x, player.y);
      if (player.onFoot && d < 34) {
        state.busted = true;
        return EVENT_BUSTED;
      }
      if (!player.onFoot && d < CAR_LENGTH) {
        // Shove the patrol car out of the overlap so it cannot sit glued to the
        // player, and only steal speed once per ram — otherwise every step would
        // halve the player's speed and the chase would glue them together.
        const push = CAR_LENGTH - d;
        const px = (cop.x - player.x) / (d || 1);
        const py = (cop.y - player.y) / (d || 1);
        cop.x += px * push;
        cop.y += py * push;
        if (state.time - (cop.lastRam || 0) > 0.7) {
          player.speed *= 0.55;
          cop.speed *= 0.4;
          cop.lastRam = state.time;
          state.lastThud = state.time;
          state.damage = Math.min(CAR_HP_MAX, state.damage + 15);
          burst(player.x, player.y, 8, 70);
          return EVENT_THUD;
        }
      }
    }
    return EVENT_NONE;
  }

  function currentMission() {
    return MISSIONS[state.missionIndex] ?? null;
  }

  function tryEnterCar() {
    const player = state.player;
    if (!player.onFoot) {
      // Get out: leave the car parked where it is.
      const car = player.car;
      const sideX = player.x + Math.cos(player.angle + Math.PI / 2) * 30;
      const sideY = player.y + Math.sin(player.angle + Math.PI / 2) * 30;
      player.x = hitsBuilding(city, sideX, sideY, 12) ? player.x - Math.cos(player.angle + Math.PI / 2) * 30 : sideX;
      player.y = hitsBuilding(city, sideX, sideY, 12) ? player.y - Math.sin(player.angle + Math.PI / 2) * 30 : sideY;
      player.onFoot = true;
      player.speed = 0;
      player.car = null;
      if (car) { car.kind = 'parked'; car.speed = 0; }
      say('On foot. Press E near a car to get in.');
      return EVENT_NONE;
    }
    let best = null;
    let bestDist = 58;
    for (const car of state.cars) {
      if (car.kind === 'police') continue;
      const d = dist(player.x, player.y, car.x, car.y);
      if (d < bestDist) { bestDist = d; best = car; }
    }
    if (!best) return EVENT_NONE;
    let events = EVENT_NONE;
    if (best.kind === 'traffic') {
      events |= addWanted(1);
      say('Car stolen! Wanted level up — lose the cops.');
    } else {
      say('You take the car.');
    }
    best.kind = 'player';
    player.car = best;
    player.onFoot = false;
    player.x = best.x;
    player.y = best.y;
    player.angle = best.angle;
    player.speed = 0;
    return events;
  }

  function tryPunch() {
    const player = state.player;
    if (!player.onFoot) return EVENT_NONE;
    let events = EVENT_NONE;
    for (const ped of state.peds) {
      if (ped.down) continue;
      const d = dist(player.x, player.y, ped.x, ped.y);
      if (d > 52) continue;
      const facing = Math.abs(((angleTo(player.x, player.y, ped.x, ped.y) - player.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (facing > Math.PI / 2.5) continue;
      ped.down = 1;
      ped.downTimer = 3;
      const copNear = state.police.some((cop) => dist(cop.x, cop.y, ped.x, ped.y) < 450);
      if (copNear || state.wanted > 0) {
        events |= addWanted(1);
        say('Assault! The cops are coming.');
      } else {
        say('You shoved a pedestrian. Careful — the cops patrol these streets.');
      }
      return events;
    }
    return EVENT_NONE;
  }

  /**
   * Pay out a finished mission and advance the story. Shared by the E action
   * and by the vault, which finishes itself once the crack hits 100%.
   */
  function finishMission(mission) {
    state.cash += mission.reward;
    // The crew patches the car up between jobs — a finished mission is worth
    // more than the cash when the car is already smoking.
    state.damage = Math.max(0, state.damage - 30);
    state.missionIndex += 1;
    if (state.missionIndex >= MISSIONS.length) {
      state.completed = true;
      say(`Job done. $${state.cash} in the bag — Solmar is yours.`, 5);
      return EVENT_COMPLETE;
    }
    const next = MISSIONS[state.missionIndex];
    if (next.id === 'lastrun') {
      // The boat leaves on a clock: the last run starts the moment the vault pays.
      state.missionTimer = LAST_RUN_SECONDS;
      say(`${mission.title} complete! +$${mission.reward}. The boat leaves in ${LAST_RUN_SECONDS}s — RUN!`, 4);
    } else {
      say(`${mission.title} complete! +$${mission.reward}. Next: ${next.title}`, 4);
    }
    return EVENT_PICKUP | EVENT_DELIVERED;
  }

  function tryMissionAction() {
    const mission = currentMission();
    if (!mission || state.completed) return EVENT_NONE;
    const player = state.player;
    const d = dist(player.x, player.y, mission.target.x, mission.target.y);
    if (d > 80) return EVENT_NONE;
    if (state.missionIndex === 2 && state.wanted > 0) {
      say('Lose the heat first — the safehouse is watched while you are wanted.');
      return EVENT_NONE;
    }
    if (mission.id === 'vault') {
      // E at the bank starts the drill. The alarm goes off at once — two more
      // stars, a flashing banner — and the crack only moves while Dario stays
      // at the door. Pressing E again while it runs does nothing.
      if (state.vaultCracking) return EVENT_NONE;
      state.vaultCracking = true;
      state.vaultProgress = 0;
      state.alarmTimer = 6;
      say('Alarm! Stay at the vault door while the drill works.', 4);
      return addWanted(VAULT_ALARM_WANTED) | EVENT_ALARM;
    }
    if (state.missionIndex === 0) state.hasPackage = true;
    return finishMission(mission);
  }

  /**
   * The vault drill, advanced once per step: it moves only while Dario is at
   * the bank door, and pays out the moment it reaches 100%.
   */
  function updateVault(dt) {
    if (!state.vaultCracking) return EVENT_NONE;
    const mission = currentMission();
    if (!mission || mission.id !== 'vault') {
      state.vaultCracking = false;
      state.vaultProgress = 0;
      return EVENT_NONE;
    }
    const player = state.player;
    const d = dist(player.x, player.y, mission.target.x, mission.target.y);
    if (d > 90) {
      // Out of range: the drill waits. The progress stays, so Dario can duck
      // away from a patrol car and come back to finish the job.
      return EVENT_NONE;
    }
    state.vaultProgress += dt / VAULT_CRACK_SECONDS;
    if (state.vaultProgress < 1) return EVENT_NONE;
    state.vaultCracking = false;
    state.vaultProgress = 0;
    return finishMission(mission);
  }

  /**
   * The last run's countdown: the boat leaves when it hits zero, and the crew
   * gives Dario one more shot from the top of the timer.
   */
  function updateMissionTimer(dt) {
    const mission = currentMission();
    if (!mission || mission.id !== 'lastrun' || state.completed) return;
    if (state.missionTimer <= 0) state.missionTimer = LAST_RUN_SECONDS;
    state.missionTimer -= dt;
    if (state.missionTimer <= 0) {
      state.missionTimer = LAST_RUN_SECONDS;
      say('Too slow — the boat left without you. One more shot — run!', 4);
    }
  }

  function step(dt, input, attract) {
    state.time += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.honkTimer > 0) state.honkTimer -= dt;
    if (state.alarmTimer > 0) state.alarmTimer -= dt;
    // The night rolls on: dusk deepens toward midnight, then pales to dawn.
    // It moves in attract mode too, so the title screen's city darkens as well.
    state.clock = (state.clock + dt / CLOCK_DAY_SECONDS) % 1;
    // Age the crash puffs and exhaust smoke, and drop the dead ones.
    for (const p of state.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    if (state.particles.length > 0) state.particles = state.particles.filter((p) => p.life > 0);
    updateTraffic(dt);
    let events = updatePeds(dt);
    if (attract) return events;
    if (state.busted || state.completed) {
      // The world idles behind the end screen.
      return events;
    }

    // R cycles the pirate radio, on foot or behind the wheel.
    if (input.radio) {
      state.station = (state.station + 1) % STATIONS.length;
      say(`Radio: ${STATIONS[state.station].name} — ${STATIONS[state.station].blurb}`);
    }

    const player = state.player;
    if (player.onFoot) {
      let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const len = Math.hypot(mx, my);
      if (len > 0) {
        mx /= len;
        my /= len;
        player.angle = Math.atan2(my, mx);
        const nx = player.x + mx * PLAYER_WALK_SPEED * dt;
        const ny = player.y + my * PLAYER_WALK_SPEED * dt;
        if (!hitsBuilding(city, nx, player.y, 12) && !inWater(city, nx, player.y)) player.x = nx;
        if (!hitsBuilding(city, player.x, ny, 12) && !inWater(city, player.x, ny)) player.y = ny;
      }
      if (input.enter) events |= tryEnterCar();
      if (input.punch) events |= tryPunch();
    } else {
      const car = player.car;
      // A horn blast: pedestrians scatter, traffic hears it too.
      if (input.honk) {
        state.honkTimer = HONK_FLEE_SECONDS;
        events |= EVENT_HONK;
      }
      // A wrecked car loses top speed: every 10 damage costs about 4% of it.
      const topSpeed = PLAYER_CAR_MAX * (1 - (state.damage / CAR_HP_MAX) * 0.4);
      if (input.up) player.speed = Math.min(topSpeed, player.speed + PLAYER_CAR_ACCEL * dt);
      else if (input.down) {
        player.speed = player.speed > 20
          ? Math.max(0, player.speed - PLAYER_CAR_BRAKE * dt)
          : Math.max(-PLAYER_CAR_REVERSE_MAX, player.speed - PLAYER_CAR_ACCEL * 0.5 * dt);
      } else {
        player.speed -= player.speed * 0.6 * dt;
      }
      const steer = ((input.left ? 1 : 0) - (input.right ? 1 : 0)) * (player.speed >= 0 ? 1 : -1);
      player.angle -= steer * 2.4 * Math.min(1, Math.abs(player.speed) / 140) * dt;
      const nx = player.x + Math.cos(player.angle) * player.speed * dt;
      const ny = player.y + Math.sin(player.angle) * player.speed * dt;
      if (hitsBuilding(city, nx, ny, 16)) {
        player.speed *= 0.35;
        state.lastThud = state.time;
        // Damage is once per scrape, not once per frame: without the gate a
        // single wall slide would wreck the car in a tenth of a second.
        if (state.time - (state.lastBuildingHit || 0) > 0.5) {
          state.damage = Math.min(CAR_HP_MAX, state.damage + 10);
          state.lastBuildingHit = state.time;
          burst(nx, ny, 6, 60);
        }
        events |= EVENT_THUD;
      } else {
        player.x = nx;
        player.y = ny;
      }
      // Bump traffic cars out of the way — shove them forward along their road, and
      // only steal speed once per bump so a long overlap cannot glue the cars.
      for (const other of state.cars) {
        if (other === car || other.kind === 'police') continue;
        if (dist(player.x, player.y, other.x, other.y) < CAR_LENGTH) {
          if (other.kind === 'traffic') {
            const overlap = CAR_LENGTH - dist(player.x, player.y, other.x, other.y);
            other.along += overlap * other.dir;
            if (state.time - (other.lastBump || 0) > 0.5) {
              other.speed = Math.max(0, other.speed - 60);
              player.speed *= 0.85;
              other.lastBump = state.time;
              state.lastThud = state.time;
              state.damage = Math.min(CAR_HP_MAX, state.damage + 5);
              burst(player.x, player.y, 5, 50);
              events |= EVENT_THUD;
            }
          }
        }
      }
      if (car) { car.x = player.x; car.y = player.y; car.angle = player.angle; car.speed = player.speed; }
      // A smoking car puffs from its tail as it drives.
      if (state.damage >= CAR_SMOKE_DAMAGE && Math.abs(player.speed) > 30) {
        state.smokeTimer -= dt;
        if (state.smokeTimer <= 0) {
          burst(player.x - Math.cos(player.angle) * 20, player.y - Math.sin(player.angle) * 20, 1, 25);
          state.smokeTimer = 0.12;
        }
      }
      if (input.enter) events |= tryEnterCar();
    }

    events |= updatePolice(dt);
    if (state.busted) return events | EVENT_BUSTED;

    // The vault drill and the last run's countdown tick with the world.
    events |= updateVault(dt);
    if (state.completed) return events | EVENT_COMPLETE;
    updateMissionTimer(dt);

    // Wanted level cools off when the player stays clean and out of sight.
    if (state.wanted > 0) {
      const copNear = state.police.some((cop) => dist(cop.x, cop.y, player.x, player.y) < WANTED_SIGHT_RANGE);
      if (!copNear) {
        state.quietTime += dt;
        if (state.quietTime >= WANTED_DECAY_SECONDS) {
          state.wanted -= 1;
          state.quietTime = 0;
          say(state.wanted === 0 ? 'Heat gone. You are clean — for now.' : 'The heat is cooling off…');
        }
      } else {
        state.quietTime = 0;
      }
    }

    // Mission marker proximity + the E action on it.
    const mission = currentMission();
    state.nearTarget = !!mission && dist(player.x, player.y, mission.target.x, mission.target.y) < 80;
    if (input.enter && state.nearTarget) events |= tryMissionAction();
    // The HUD's district line follows the player across the map.
    state.district = districtAt(player.x, player.y);

    return events;
  }

  function applySave(save) {
    if (!save) return;
    state.cash = save.cash || 0;
    state.missionIndex = Math.min(save.missionIndex || 0, MISSIONS.length - 1);
    if (save.completed) { state.completed = true; state.missionIndex = MISSIONS.length; }
    // A saved last run restarts its countdown from the top — the boat waits
    // for no one, but the save should not load into an expired timer.
    if (!state.completed && MISSIONS[state.missionIndex]?.id === 'lastrun') state.missionTimer = LAST_RUN_SECONDS;
    state.vaultCracking = false;
    state.vaultProgress = 0;
  }

  function toSave() {
    return { cash: state.cash, missionIndex: state.missionIndex, completed: state.completed };
  }

  reset();
  return { state, reset, step, say, currentMission, applySave, toSave };
}
