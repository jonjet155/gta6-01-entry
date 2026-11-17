// Keyboard + mouse: WASD/arrows to move and drive, E to enter a car or work a
// mission marker, F or click to shove, H to honk, M to mute, Enter/Space to
// confirm, P or Escape to pause.
//
// Edge presses are tracked per key, and each reader only consumes the keys it
// owns: takeActions() eats Enter/Space/P/Escape and leaves E, F and H alone,
// so a tap on E still reaches the world after the title screen has had its say.
export const ACTION_NONE = 0;
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const CONFIRM_CODES = ['Enter', 'Space'];
const PAUSE_CODES = ['KeyP', 'Escape'];
const MUTE_CODES = ['KeyM'];

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouse = { x: 0, y: 0 };
  let clicked = false;

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) clicked = true;
    const rect = canvas.getBoundingClientRect();
    mouse = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });

  function has(...codes) {
    return codes.some((c) => keys.has(c));
  }

  function wasPressed(...codes) {
    return codes.some((c) => pressed.has(c));
  }

  /** Forget only the given codes, so other readers still see their own keys. */
  function consume(...codes) {
    for (const code of codes) pressed.delete(code);
  }

  return {
    /** Held movement: { x, y } in screen space, normalised. */
    direction() {
      const x = (has('KeyD', 'ArrowRight') ? 1 : 0) - (has('KeyA', 'ArrowLeft') ? 1 : 0);
      const y = (has('KeyS', 'ArrowDown') ? 1 : 0) - (has('KeyW', 'ArrowUp') ? 1 : 0);
      const len = Math.hypot(x, y);
      return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: 0 };
    },

    /** The held driving keys plus this frame's edge actions. */
    read() {
      const dir = this.direction();
      const state = {
        up: has('KeyW', 'ArrowUp'),
        down: has('KeyS', 'ArrowDown'),
        left: has('KeyA', 'ArrowLeft'),
        right: has('KeyD', 'ArrowRight'),
        enter: wasPressed('KeyE'),
        punch: wasPressed('KeyF') || clicked,
        honk: wasPressed('KeyH'),
        dirX: dir.x,
        dirY: dir.y,
        mouseX: mouse.x,
        mouseY: mouse.y,
      };
      consume('KeyE', 'KeyF', 'KeyH');
      clicked = false;
      return state;
    },

    /** One-shot screen actions (confirm / pause / mute), consumed on read. */
    takeActions() {
      let actions = ACTION_NONE;
      if (wasPressed(...CONFIRM_CODES)) actions |= ACTION_CONFIRM;
      if (wasPressed(...PAUSE_CODES)) actions |= ACTION_PAUSE;
      if (wasPressed(...MUTE_CODES)) actions |= ACTION_MUTE;
      consume(...CONFIRM_CODES, ...PAUSE_CODES, ...MUTE_CODES);
      return actions;
    },

    mouse() {
      return { ...mouse };
    },
  };
}
