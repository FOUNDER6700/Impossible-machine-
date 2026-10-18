import { Game } from './game/Game.js';

function checkWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

function updateLoadingProgress(percent, label) {
  const bar = document.getElementById('loading-bar-fill');
  const status = document.getElementById('loading-status');
  if (bar) {
    bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  }
  if (status && label) {
    status.textContent = `${label} (${Math.round(percent)}%)`;
  }
}

function showStartupError(title, description, errorObj) {
  if (typeof window.__showFatalBootError === 'function') {
    const details =
      errorObj instanceof Error
        ? `${errorObj.name}: ${errorObj.message}\n${errorObj.stack || ''}`
        : String(errorObj || '');
    window.__showFatalBootError(title, description, details);
    return;
  }

  const loadingScreen = document.getElementById('loading-screen');
  const errorScreen = document.getElementById('webgl-error');
  if (loadingScreen) loadingScreen.classList.add('hidden');
  if (errorScreen) errorScreen.classList.remove('hidden');
}

function bootGame() {
  // Signal to the index.html watchdog that the module graph loaded and started
  window.__IMPOSSIBLE_MACHINE_BOOTED__ = true;

  // Prevent accidental context menu on long touch
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  updateLoadingProgress(10, 'CHECKING WEBGL SUPPORT');

  if (!checkWebGLAvailable()) {
    showStartupError(
      'WEBGL UNAVAILABLE',
      'Your mobile browser or device could not create a WebGL 3D context. Please ensure hardware acceleration is enabled in Chrome or Firefox.',
      'WebGLRenderingContext check returned false.'
    );
    return;
  }

  try {
    updateLoadingProgress(20, 'INITIALIZING RENDERER');
    const game = new Game({
      onProgress: updateLoadingProgress
    });
    game.init();
  } catch (err) {
    console.error('Fatal initialization error:', err);
    showStartupError(
      'INITIALIZATION ERROR',
      'An error occurred while constructing the 3D scene or renderer.',
      err
    );
  }
}

// Handle both cases: whether DOMContentLoaded hasn't fired yet or already fired
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootGame, { once: true });
} else {
  bootGame();
}
