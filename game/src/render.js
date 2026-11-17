// SOLMAR HEAT — the renderer: one canvas, top-down. The city, the cars, the people,
// the HUD with its minimap, and the title / pause / busted / finished screens.
import { CAR_LENGTH, CAR_WIDTH, MISSIONS, PALETTE, ROAD_AXES_H, ROAD_AXES_V, ROAD_WIDTH, WATER_Y, WORLD } from './config.js';
import { isOnRoad } from './city.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WIN = 'win';

const TITLE_FONT = '"Arial Black", "Segoe UI", sans-serif';
const BODY_FONT = '"Segoe UI", Arial, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let viewW = 1280;
  let viewH = 720;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    viewW = Math.max(320, rect.width || window.innerWidth);
    viewH = Math.max(240, rect.height || window.innerHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function cameraFor(player) {
    const x = Math.max(0, Math.min(WORLD.width - viewW, player.x - viewW / 2));
    const y = Math.max(0, Math.min(WORLD.height - viewH, player.y - viewH / 2));
    return { x, y };
  }

  function drawCity(state, cam) {
    const city = state.city;
    // Ground.
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(cam.x, cam.y, viewW, viewH);
    // Harbour water along the south edge.
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(cam.x, Math.max(WATER_Y, cam.y), viewW, Math.max(0, cam.y + viewH - WATER_Y));
    ctx.fillStyle = PALETTE.waterDeep;
    for (let x = Math.floor(cam.x / 90) * 90; x < cam.x + viewW; x += 90) {
      ctx.fillRect(x + 20, WATER_Y + 40, 46, 4);
      ctx.fillRect(x + 50, WATER_Y + 110, 30, 4);
    }
    // The pier.
    ctx.fillStyle = PALETTE.pier;
    ctx.fillRect(city.pier.x0, city.pier.y - 14, city.pier.x1 - city.pier.x0, 26);
    ctx.fillStyle = '#6d543a';
    for (let x = city.pier.x0 + 10; x < city.pier.x1; x += 60) ctx.fillRect(x, city.pier.y - 14, 4, 26);

    // Park.
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(city.park.x, city.park.y, city.park.w, city.park.h);

    // Roads: asphalt, then sidewalks at the edges, then lane dashes. The avenues
    // end at the harbour water — they do not keep going into the sea.
    ctx.fillStyle = PALETTE.sidewalk;
    const sw = ROAD_WIDTH / 2 + 10;
    const roadBottom = Math.max(cam.y, Math.min(cam.y + viewH, WATER_Y));
    for (const axis of ROAD_AXES_V) ctx.fillRect(axis - sw, cam.y, sw * 2, Math.max(0, roadBottom - cam.y));
    for (const axis of ROAD_AXES_H) ctx.fillRect(cam.x, axis - sw, viewW, sw * 2);
    ctx.fillStyle = PALETTE.road;
    for (const axis of ROAD_AXES_V) ctx.fillRect(axis - ROAD_WIDTH / 2, cam.y, ROAD_WIDTH, Math.max(0, roadBottom - cam.y));
    for (const axis of ROAD_AXES_H) ctx.fillRect(cam.x, axis - ROAD_WIDTH / 2, viewW, ROAD_WIDTH);
    ctx.fillStyle = PALETTE.lane;
    for (const axis of ROAD_AXES_V) {
      for (let y = Math.floor(cam.y / 48) * 48; y < roadBottom; y += 48) ctx.fillRect(axis - 2, y, 4, 24);
    }
    for (const axis of ROAD_AXES_H) {
      for (let x = Math.floor(cam.x / 48) * 48; x < cam.x + viewW; x += 48) ctx.fillRect(x, axis - 2, 24, 4);
    }

    // Trees.
    for (const tree of city.trees) {
      if (tree.x < cam.x - 30 || tree.x > cam.x + viewW + 30 || tree.y < cam.y - 30 || tree.y > cam.y + viewH + 30) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.arc(tree.x + 3, tree.y + 4, tree.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.tree;
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.treeLight;
      ctx.beginPath();
      ctx.arc(tree.x - 3, tree.y - 3, tree.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // Buildings: shadow, roof, windows; the hotel carries its neon name.
    for (const b of city.buildings) {
      if (b.x + b.w < cam.x || b.x > cam.x + viewW || b.y + b.h < cam.y || b.y > cam.y + viewH) continue;
      ctx.fillStyle = PALETTE.buildingSide;
      ctx.fillRect(b.x + 7, b.y + 9, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      const cols = Math.max(1, Math.floor(b.w / 26));
      const rows = Math.max(1, Math.min(b.floors, Math.floor(b.h / 24)));
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          ctx.fillRect(b.x + 8 + c * ((b.w - 16) / cols), b.y + 8 + r * ((b.h - 16) / rows), 8, 6);
        }
      }
      if (b.hotel) {
        ctx.fillStyle = '#fff3c4';
        ctx.font = `bold 15px ${BODY_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('NEON PALMS', b.x + b.w / 2, b.y + b.h / 2 - 2);
        ctx.fillStyle = '#ff5f8f';
        ctx.font = `bold 10px ${BODY_FONT}`;
        ctx.fillText('HOTEL', b.x + b.w / 2, b.y + b.h / 2 + 14);
      }
    }
  }

  function drawCar(car, isPlayer) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, -CAR_LENGTH / 2 + 3, -CAR_WIDTH / 2 + 4, CAR_LENGTH, CAR_WIDTH, 7);
    ctx.fill();
    ctx.fillStyle = car.color;
    roundRect(ctx, -CAR_LENGTH / 2, -CAR_WIDTH / 2, CAR_LENGTH, CAR_WIDTH, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,30,45,0.85)';
    roundRect(ctx, -6, -CAR_WIDTH / 2 + 3, 14, CAR_WIDTH - 6, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(CAR_LENGTH / 2 - 3, -CAR_WIDTH / 2 + 4, 3, 5);
    ctx.fillRect(CAR_LENGTH / 2 - 3, CAR_WIDTH / 2 - 9, 3, 5);
    if (car.kind === 'police') {
      const flash = Math.sin(car.siren) > 0 ? '#ff2d2d' : '#2d6bff';
      ctx.fillStyle = flash;
      ctx.fillRect(-4, -CAR_WIDTH / 2 + 2, 8, 6);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PD', 0, 3);
    }
    if (isPlayer) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      roundRect(ctx, -CAR_LENGTH / 2 - 2, -CAR_WIDTH / 2 - 2, CAR_LENGTH + 4, CAR_WIDTH + 4, 9);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPed(ped) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    if (ped.down) {
      ctx.rotate(0.5);
      ctx.fillStyle = ped.color;
      ctx.fillRect(-9, -4, 18, 8);
      ctx.fillStyle = '#d8b48f';
      ctx.beginPath();
      ctx.arc(11, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 5, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8b48f';
    ctx.beginPath();
    ctx.arc(0, -2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(state) {
    const p = state.player;
    if (!p.onFoot) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.playerJacket;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(Math.cos(p.angle) * 4, Math.sin(p.angle) * 4 - 1, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawMissionMarker(state) {
    const mission = MISSIONS[state.missionIndex];
    if (!mission || state.completed) return;
    const pulse = 1 + Math.sin(state.time * 4) * 0.15;
    const { x, y } = mission.target;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd23e';
    ctx.fillRect(-11, -11, 22, 22);
    ctx.strokeStyle = '#7a5b00';
    ctx.lineWidth = 2;
    ctx.strokeRect(-11, -11, 22, 22);
    ctx.restore();
    ctx.fillStyle = '#ffd23e';
    ctx.font = `bold 13px ${BODY_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(mission.target.label, x, y - 26);
    // A beam so the marker reads from far away.
    ctx.fillStyle = 'rgba(255,210,62,0.18)';
    ctx.fillRect(x - 3, y - 120, 6, 120);
  }

  // Screen space: the arrow sits at the screen edge, pointing at the off-screen marker.
  function drawEdgeArrow(state, cam) {
    const mission = MISSIONS[state.missionIndex];
    if (!mission || state.completed) return;
    const p = state.player;
    const tx = mission.target.x - cam.x;
    const ty = mission.target.y - cam.y;
    if (tx > 0 && tx < viewW && ty > 0 && ty < viewH) return;
    const cx = Math.max(60, Math.min(viewW - 60, tx));
    let cy = Math.max(60, Math.min(viewH - 60, ty));
    // Keep the arrow out of the minimap's corner (top right).
    if (cx > viewW - 250 && cy < 200) cy = 200;
    const angle = Math.atan2(ty - (p.y - cam.y), tx - (p.x - cam.x));
    const d = Math.round(Math.hypot(mission.target.x - p.x, mission.target.y - p.y));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, -11);
    ctx.lineTo(-10, 11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffd23e';
    ctx.font = `bold 12px ${BODY_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${mission.target.label} · ${d}m`, cx, cy + 28);
    ctx.textAlign = 'left';
  }

  function drawMinimap(state) {
    const mw = 208;
    const mh = 156;
    const mx = viewW - mw - 14;
    const my = 14;
    const sx = mw / WORLD.width;
    const sy = mh / WORLD.height;
    ctx.save();
    ctx.fillStyle = 'rgba(12,16,24,0.82)';
    roundRect(ctx, mx - 6, my - 6, mw + 12, mh + 12, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - 6, my - 6, mw + 12, mh + 12);
    ctx.beginPath();
    ctx.rect(mx, my, mw, mh);
    ctx.clip();
    ctx.fillStyle = '#5d6b7a';
    ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = '#2b7d9c';
    ctx.fillRect(mx, my + WATER_Y * sy, mw, mh - WATER_Y * sy);
    ctx.fillStyle = '#69a25e';
    ctx.fillRect(mx + state.city.park.x * sx, my + state.city.park.y * sy, state.city.park.w * sx, state.city.park.h * sy);
    ctx.strokeStyle = '#9aa4b0';
    ctx.lineWidth = 2;
    for (const axis of ROAD_AXES_V) {
      ctx.beginPath();
      ctx.moveTo(mx + axis * sx, my);
      ctx.lineTo(mx + axis * sx, my + mh);
      ctx.stroke();
    }
    for (const axis of ROAD_AXES_H) {
      ctx.beginPath();
      ctx.moveTo(mx, my + axis * sy);
      ctx.lineTo(mx + mw, my + axis * sy);
      ctx.stroke();
    }
    const mission = MISSIONS[state.missionIndex];
    if (mission && !state.completed) {
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.arc(mx + mission.target.x * sx, my + mission.target.y * sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const cop of state.police) {
      ctx.fillStyle = '#ff2d2d';
      ctx.beginPath();
      ctx.arc(mx + cop.x * sx, my + cop.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx + state.player.x * sx, my + state.player.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mx + state.player.x * sx, my + state.player.y * sy, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 11px ${BODY_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('SOLMAR', mx, my + mh + 20);
  }

  function drawHud(state, screen, cam) {
    // Wanted stars, top left.
    ctx.textAlign = 'left';
    ctx.font = `bold 26px ${BODY_FONT}`;
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i < state.wanted ? '#ffd23e' : 'rgba(255,255,255,0.25)';
      ctx.fillText('★', 16 + i * 30, 40);
    }
    ctx.font = `bold 20px ${BODY_FONT}`;
    ctx.fillStyle = '#7dff8a';
    ctx.fillText(`$${state.cash}`, 16, 68);

    // Mission panel under the stars.
    const mission = MISSIONS[state.missionIndex];
    ctx.fillStyle = 'rgba(12,16,24,0.72)';
    roundRect(ctx, 12, 78, 330, state.completed ? 56 : 74, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.font = `bold 14px ${BODY_FONT}`;
    ctx.fillText(state.completed ? 'JOB DONE' : mission.title, 24, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = `13px ${BODY_FONT}`;
    const text = state.completed ? 'All three jobs finished. Solmar is yours — keep driving.' : mission.text;
    wrapText(text, 24, 118, 306, 16);
    if (state.nearTarget && !state.completed) {
      ctx.fillStyle = '#ffd23e';
      ctx.font = `bold 14px ${BODY_FONT}`;
      ctx.fillText('Press E', 24, 100 + 34);
    }

    // Speed, bottom right, while driving.
    const p = state.player;
    if (!p.onFoot) {
      const kmh = Math.round(Math.abs(p.speed) * 0.55);
      ctx.fillStyle = 'rgba(12,16,24,0.72)';
      roundRect(ctx, viewW - 150, viewH - 64, 136, 50, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 26px ${BODY_FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(`${kmh}`, viewW - 52, viewH - 28);
      ctx.font = `12px ${BODY_FONT}`;
      ctx.fillStyle = '#c8ccd4';
      ctx.fillText('km/h', viewW - 24, viewH - 28);
      ctx.textAlign = 'left';
    }

    // Controls hint, bottom left.
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `12px ${BODY_FONT}`;
    ctx.fillText(p.onFoot ? 'WASD walk · E enter car · F shove · P pause' : 'WASD drive · E get out · P pause', 16, viewH - 16);

    // Toast message, top centre.
    if (state.message && state.messageTimer > 0) {
      ctx.font = `bold 16px ${BODY_FONT}`;
      const w = ctx.measureText(state.message).width + 28;
      ctx.fillStyle = 'rgba(12,16,24,0.8)';
      roundRect(ctx, (viewW - w) / 2, 14, w, 34, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(state.message, viewW / 2, 37);
      ctx.textAlign = 'left';
    }

    drawMinimap(state);
    if (screen === SCREEN_PLAY) drawEdgeArrow(state, cam);
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let cy = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, cy);
        line = word;
        cy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, cy);
  }

  function drawTitle(state, save) {
    const grad = ctx.createLinearGradient(0, 0, 0, viewH);
    grad.addColorStop(0, 'rgba(20,10,40,0.55)');
    grad.addColorStop(0.55, 'rgba(120,40,70,0.45)');
    grad.addColorStop(1, 'rgba(20,10,40,0.75)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewW, viewH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23e';
    ctx.font = `bold 20px ${BODY_FONT}`;
    ctx.fillText('WELCOME TO', viewW / 2, viewH * 0.22);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(viewH * 0.11)}px ${TITLE_FONT}`;
    ctx.fillText('SOLMAR HEAT', viewW / 2, viewH * 0.36);
    ctx.fillStyle = '#ffb3c8';
    ctx.font = `italic 17px ${BODY_FONT}`;
    ctx.fillText('An open-world crime story — a city, a crew, and one long hot night.', viewW / 2, viewH * 0.42);

    ctx.fillStyle = 'rgba(12,16,24,0.72)';
    const panelW = 560;
    roundRect(ctx, (viewW - panelW) / 2, viewH * 0.48, panelW, 132, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `15px ${BODY_FONT}`;
    ctx.fillText('Dario Cruz owes the Solmar crew three jobs before sunrise:', viewW / 2, viewH * 0.48 + 30);
    ctx.fillStyle = '#ffd23e';
    ctx.font = `bold 15px ${BODY_FONT}`;
    ctx.fillText('1 · Pick up the package at the docks', viewW / 2, viewH * 0.48 + 58);
    ctx.fillText('2 · Deliver it to the Neon Palms hotel', viewW / 2, viewH * 0.48 + 82);
    ctx.fillText('3 · Lose the cops and reach the safehouse', viewW / 2, viewH * 0.48 + 106);

    ctx.fillStyle = '#e8ecf2';
    ctx.font = `14px ${BODY_FONT}`;
    ctx.fillText('WASD move / drive · E enter a car or work a marker · F shove · P pause', viewW / 2, viewH * 0.48 + 158);
    if (save && (save.cash > 0 || save.missionIndex > 0)) {
      ctx.fillStyle = '#7dff8a';
      ctx.font = `bold 15px ${BODY_FONT}`;
      ctx.fillText(`Saved job found: $${save.cash}, mission ${save.missionIndex + 1} of 3 — press ENTER to continue it.`, viewW / 2, viewH * 0.48 + 184);
    }
    const blink = Math.sin(state.time * 3) > -0.9;
    if (blink) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 20px ${BODY_FONT}`;
      ctx.fillText('PRESS ENTER TO START', viewW / 2, viewH * 0.86);
    }
  }

  function drawEndOverlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(8,10,16,0.72)';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `bold ${Math.round(viewH * 0.09)}px ${TITLE_FONT}`;
    ctx.fillText(title, viewW / 2, viewH * 0.4);
    ctx.fillStyle = '#ffffff';
    ctx.font = `17px ${BODY_FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, viewW / 2, viewH * 0.48 + i * 26));
    const blink = Math.sin(Date.now() / 300) > -0.2;
    if (blink) {
      ctx.font = `bold 18px ${BODY_FONT}`;
      ctx.fillText('PRESS ENTER', viewW / 2, viewH * 0.62);
    }
    ctx.textAlign = 'left';
  }

  function draw(state, screen, extra = {}) {
    const cam = cameraFor(state.player);
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    drawCity(state, cam);
    drawMissionMarker(state);
    for (const car of state.cars) drawCar(car, false);
    for (const cop of state.police) drawCar(cop, false);
    for (const ped of state.peds) drawPed(ped);
    const playerCar = state.player.car;
    if (playerCar) drawCar(playerCar, true);
    drawPlayer(state);
    ctx.restore();

    if (screen === SCREEN_TITLE) {
      drawTitle(state, extra.save ?? null);
      return;
    }
    drawHud(state, screen, cam);
    if (screen === SCREEN_PAUSED) {
      drawEndOverlay('PAUSED', ['The city waits. Take a breath.'], '#ffffff');
    } else if (screen === SCREEN_BUSTED) {
      drawEndOverlay('BUSTED', [`The Solmar PD got Dario. Cash kept: $${state.cash}.`, 'The crew is not done with you yet.'], '#ff5f5f');
    } else if (screen === SCREEN_WIN) {
      drawEndOverlay('JOB DONE', [`All three jobs finished. $${state.cash} in the bag.`, 'Solmar is yours — keep driving, or start over.'], '#7dff8a');
    }
  }

  return { draw, resize, cameraFor };
}
