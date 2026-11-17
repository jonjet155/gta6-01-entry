// SOLMAR HEAT — boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves between
// title, play, paused, busted and job-done screens, and saves the job to localStorage.
//
// ?seed=N fixes the city. ?shot=start|drive|foot (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_COMPLETE, EVENT_CRIME, EVENT_THUD } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed), seed);
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (typeof save.cash !== 'number' || typeof save.missionIndex !== 'number') return null;
    return save;
  } catch {
    return null;
  }
}

function writeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(world.toSave()));
  } catch {
    // Storage can be off (private windows): the job then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { save: readSave() });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let save = readSave();
  if (save) world.applySave(save);

  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.start();
    if (save && !world.state.completed && (save.cash > 0 || save.missionIndex > 0)) {
      // Continue the saved job where it left off.
      world.applySave(save);
    } else {
      world.reset();
      save = null;
    }
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing Solmar Heat. Three jobs before sunrise.');
  }

  function endBusted() {
    screen = SCREEN_BUSTED;
    writeSave();
    announce(`Busted. The Solmar PD got you. Cash kept: $${world.state.cash}.`);
  }

  function endWin() {
    screen = SCREEN_WIN;
    writeSave();
    announce(`Job done. $${world.state.cash} in the bag.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      audio.start();
      if (screen === SCREEN_TITLE) startGame();
      else if (screen === SCREEN_BUSTED) { world.reset(); world.state.cash = save?.cash ?? 0; screen = SCREEN_PLAY; announce('Playing.'); }
      else if (screen === SCREEN_WIN) { world.reset(); save = null; screen = SCREEN_PLAY; announce('Playing. A new night in Solmar.'); }
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        world.step(STEP, {}, true);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        const events = world.step(STEP, input.read(), false);
        accumulator -= STEP;
        if (events & EVENT_THUD) audio.thud();
        if (events & EVENT_CRIME) audio.crime();
        if (events & EVENT_BUSTED) { endBusted(); break; }
        if (events & EVENT_COMPLETE) { endWin(); break; }
      }
      const player = world.state.player;
      audio.update(player.onFoot ? 0 : Math.abs(player.speed) / 430, world.state.wanted);
      if (world.state.missionIndex > 0 || world.state.cash > 0) writeSave();
    }
    const saveForTitle = screen === SCREEN_TITLE ? save : null;
    renderer.draw(world.state, screen, { save: saveForTitle });
  }

  // Leaving the tab pauses a running game rather than letting the cops close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Solmar Heat. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
