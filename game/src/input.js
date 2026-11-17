// Keyboard + mouse: WASD/arrows to move and drive, E to enter a car or work a
// mission marker, F or click to shove, Enter/Space to confirm, P or Escape to pause.
export const ACTION_NONE = 0;
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouse = { x: 0, y: 0 };
  let clicked = false;

  function codeOf(event) {
    return event.code;
  }

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
        dirX: dir.x,
        dirY: dir.y,
        mouseX: mouse.x,
        mouseY: mouse.y,
      };
      pressed.clear();
      clicked = false;
      return state;
    },

    /** One-shot screen actions (confirm / pause), consumed on read. */
    takeActions() {
      let actions = ACTION_NONE;
      if (wasPressed('Enter', 'Space')) actions |= ACTION_CONFIRM;
      if (wasPressed('KeyP', 'Escape')) actions |= ACTION_PAUSE;
      pressed.clear();
      clicked = false;
      return actions;
    },

    mouse() {
      return { ...mouse };
    },
  };
}
