import { Game } from './game/Game.js';

function checkWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

function updateLoadingProgress(percent, label) {
  const bar = document.getElementById('loading-bar-fill');
  const status = document.getElementById('loading-status');
  if (bar) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  if (status && label) status.textContent = `${label} (${Math.round(percent)}%)`;
}

function bootGame() {
  window.__IMPOSSIBLE_MACHINE_BOOTED__ = true;
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  updateLoadingProgress(10, 'CHECKING WEBGL SUPPORT');

  if (!checkWebGLAvailable()) {
    const loadingScreen = document.getElementById('loading-screen');
    const errorScreen = document.getElementById('webgl-error');
    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (errorScreen) errorScreen.classList.remove('hidden');
    return;
  }

  try {
    updateLoadingProgress(20, 'INITIALIZING RENDERER');
    const game = new Game({ onProgress: updateLoadingProgress });
    game.init();
  } catch (err) {
    console.error('Fatal initialization error:', err);
    const loadingScreen = document.getElementById('loading-screen');
    const errorScreen = document.getElementById('webgl-error');
    const details = document.getElementById('error-details');
    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (errorScreen) errorScreen.classList.remove('hidden');
    if (details) details.textContent = err.stack || err.message || String(err);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootGame, { once: true });
} else {
  bootGame();
}
