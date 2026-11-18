// Keyboard + mouse input. The game reads this one object every frame;
// nothing else listens for keys, so rebinding is a one-file change.
export const ACTION_ENTER_CAR = 'enterCar';
export const ACTION_PUNCH = 'punch';
export const ACTION_PAUSE = 'pause';
export const ACTION_MISSION = 'mission';

// Physical key code -> logical action. Movement keys are also the only
// ones whose default browser behaviour (page scroll) must be suppressed.
const KEY_BINDINGS = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  KeyE: ACTION_ENTER_CAR,
  KeyF: ACTION_PUNCH,
  KeyM: ACTION_MISSION,
  Escape: ACTION_PAUSE,
  KeyP: ACTION_PAUSE,
};

const MOVEMENT_ACTIONS = ['forward', 'back', 'left', 'right'];

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let mouseDX = 0;
  let mouseDY = 0;
  let pointerLocked = false;

  function onKeyDown(event) {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    if (MOVEMENT_ACTIONS.includes(action)) event.preventDefault();
    // Record the press only on the first keydown; key repeat must not
    // re-trigger one-shot actions like punch or enter-car.
    if (!held.has(action)) pressed.add(action);
    held.add(action);
  }

  function onKeyUp(event) {
    const action = KEY_BINDINGS[event.code];
    if (action) held.delete(action);
  }

  function onMouseMove(event) {
    if (!pointerLocked) return;
    mouseDX += event.movementX || 0;
    mouseDY += event.movementY || 0;
  }

  function onMouseDown(event) {
    if (event.button === 0) pressed.add(ACTION_PUNCH);
  }

  function onLockChange() {
    pointerLocked = document.pointerLockElement === canvas;
  }

  function requestLock() {
    if (pointerLocked || document.pointerLockElement === canvas) return;
    try {
      canvas.requestPointerLock();
    } catch {
      // Pointer lock is a nicety; mouse-look simply stays off without it.
    }
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseDown);
  document.addEventListener('pointerlockchange', onLockChange);
  canvas.addEventListener('click', requestLock);

  return {
    isHeld(action) {
      return held.has(action);
    },
    // True once, on the frame the key/button went down.
    wasPressed(action) {
      return pressed.has(action);
    },
    consumeMouse() {
      const dx = mouseDX;
      const dy = mouseDY;
      mouseDX = 0;
      mouseDY = 0;
      return { dx, dy };
    },
    endFrame() {
      pressed.clear();
    },
  };
}
