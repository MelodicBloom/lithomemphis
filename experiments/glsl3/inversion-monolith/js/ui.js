import { CUTS } from './constants.js';
import { hint, isAligned, pendingCount } from './state.js';

export function keyToAction(code, state, { shift = false } = {}) {
  switch (code) {
    case 'ArrowLeft':
      return { type: 'phase', delta: -1 };
    case 'ArrowRight':
      return { type: 'phase', delta: 1 };
    case 'ArrowUp':
      return { type: 'camera', yaw: state.camYaw, pitch: state.camPitch + 1 };
    case 'ArrowDown':
      return { type: 'camera', yaw: state.camYaw, pitch: state.camPitch - 1 };
    case 'KeyA':
      return { type: 'camera', yaw: state.camYaw - 1, pitch: state.camPitch };
    case 'KeyD':
      return { type: 'camera', yaw: state.camYaw + 1, pitch: state.camPitch };
    case 'Digit1':
      return { type: 'cut', index: 0 };
    case 'Digit2':
      return { type: 'cut', index: 1 };
    case 'Digit3':
      return { type: 'cut', index: 2 };
    case 'KeyF':
      return { type: 'fog', value: state.fog ? 0 : 1 };
    case 'Space':
      return { type: 'pause' };
    case 'KeyZ':
      return shift ? { type: 'redo' } : { type: 'undo' };
    case 'KeyY':
      return { type: 'redo' };
    case 'KeyR':
      return { type: 'reset' };
    case 'BracketLeft':
      return { type: 'light', deg: state.lightDeg - 1 };
    case 'BracketRight':
      return { type: 'light', deg: state.lightDeg + 1 };
    case 'KeyP':
      return { type: 'mode', mode: state.mode === 'puzzle' ? 'free' : 'puzzle' };
    case 'KeyM':
      return { type: 'reduced', value: state.reduced ? 0 : 1 };
    default:
      return null;
  }
}

function fieldFocused(target) {
  if (!target || !target.tagName) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function bindControls(dom, getState, dispatch) {
  const click = (id, action) => {
    dom[id].addEventListener('click', () => dispatch(action()));
  };
  click('phaseDec', () => ({ type: 'phase', delta: -1 }));
  click('phaseInc', () => ({ type: 'phase', delta: 1 }));
  click('cut0', () => ({ type: 'cut', index: 0 }));
  click('cut1', () => ({ type: 'cut', index: 1 }));
  click('cut2', () => ({ type: 'cut', index: 2 }));
  click('undo', () => ({ type: 'undo' }));
  click('redo', () => ({ type: 'redo' }));
  click('reset', () => ({ type: 'reset' }));
  click('pause', () => ({ type: 'pause' }));
  click('fog', () => ({ type: 'fog', value: getState().fog ? 0 : 1 }));
  click('reduced', () => ({ type: 'reduced', value: getState().reduced ? 0 : 1 }));
  click('modeFree', () => ({ type: 'mode', mode: 'free' }));
  click('modePuzzle', () => ({ type: 'mode', mode: 'puzzle' }));
  click('presetMass', () => ({ type: 'preset', id: 'mass' }));
  click('presetVault', () => ({ type: 'preset', id: 'vault' }));
  click('presetAperture', () => ({ type: 'preset', id: 'aperture' }));
  click('presetPuzzle', () => ({ type: 'preset', id: 'puzzle', seed: readSeed(dom, getState()) }));

  dom.light.addEventListener('pointerdown', () => dispatch({ type: 'gesture', value: 1 }));
  dom.light.addEventListener('input', () => dispatch({ type: 'light', deg: Number(dom.light.value) }));
  dom.light.addEventListener('pointerup', () => dispatch({ type: 'gesture', value: 0 }));
  dom.light.addEventListener('change', () => dispatch({ type: 'light', deg: Number(dom.light.value) }));

  dom.scrub.addEventListener('pointerdown', () => dispatch({ type: 'gesture', value: 1 }));
  dom.scrub.addEventListener('input', () => dispatch({ type: 'seek', tick: Number(dom.scrub.value) }));
  dom.scrub.addEventListener('pointerup', () => dispatch({ type: 'gesture', value: 0 }));
  dom.scrub.addEventListener('change', () => dispatch({ type: 'seek', tick: Number(dom.scrub.value) }));

  let drag = null;
  dom.stage.addEventListener('pointerdown', (event) => {
    dom.stage.focus();
    const state = getState();
    if (state.mode !== 'free') {
      dispatch({ type: 'camera', yaw: state.camYaw, pitch: state.camPitch });
      return;
    }
    drag = { x: event.clientX, y: event.clientY, yaw: state.camYaw, pitch: state.camPitch };
    dispatch({ type: 'gesture', value: 1 });
    dom.stage.setPointerCapture(event.pointerId);
  });
  dom.stage.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const yaw = drag.yaw + Math.round((event.clientX - drag.x) / 10);
    const pitch = drag.pitch + Math.round((drag.y - event.clientY) / 10);
    dispatch({ type: 'camera', yaw, pitch });
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    dispatch({ type: 'gesture', value: 0 });
  };
  dom.stage.addEventListener('pointerup', endDrag);
  dom.stage.addEventListener('pointercancel', endDrag);

  window.addEventListener('keydown', (event) => {
    if (fieldFocused(event.target) && event.target !== dom.stage) return;
    if (event.code === 'Space' && event.target !== dom.stage && event.target !== document.body) return;
    const action = keyToAction(event.code, getState(), { shift: event.shiftKey });
    if (!action) return;
    event.preventDefault();
    dispatch(action);
  });
}

function readSeed(dom, getState) {
  const raw = Number(dom.seed.value);
  if (Number.isInteger(raw) && raw >= 0 && raw <= 0xffffffff) return raw;
  return getState().seed;
}

export function paintControls(dom, state, notice) {
  const [n, d] = CUTS[state.cut];
  const aligned = isAligned(state);
  const queue = pendingCount(state);
  dom.kicker.textContent = state.mode === 'puzzle' ? 'Puzzle' : 'Free explore';
  dom.detent.textContent = `Detent ${String(state.k).padStart(2, '0')}`;
  dom.angle.textContent = `${state.k * 15}°`;
  dom.section.textContent = `Section ${n}/${d}`;
  dom.queue.textContent = queue ? `Queue ${queue}` : aligned ? 'Aligned' : 'Seated';
  dom.light.value = String(state.lightDeg);
  dom.lightLabel.textContent = `Light ${state.lightDeg}°`;
  dom.fog.textContent = state.fog ? 'Fog on' : 'Fog off';
  dom.pause.textContent = state.paused ? 'Paused' : 'Live';
  dom.reduced.textContent = state.reduced ? 'Motion on' : 'Reduced motion';
  dom.scrub.value = String(Math.min(2400, state.tick));
  dom.tickLabel.textContent = `Tick ${state.tick}`;
  dom.seed.value = String(state.seed);
  dom.notice.textContent = notice;
  dom.hint.textContent = hint(state).text;
  dom.stage.setAttribute(
    'aria-label',
    `Inversion monolith, detent ${state.k}, section ${n}/${d}, light ${state.lightDeg} degrees${aligned ? ', aligned' : ''}`,
  );
  for (const [id, index] of [['cut0', 0], ['cut1', 1], ['cut2', 2]]) {
    dom[id].setAttribute('aria-pressed', state.cut === index ? 'true' : 'false');
  }
  dom.modeFree.setAttribute('aria-pressed', state.mode === 'free' ? 'true' : 'false');
  dom.modePuzzle.setAttribute('aria-pressed', state.mode === 'puzzle' ? 'true' : 'false');
}
