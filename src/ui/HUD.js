export class HUD {
  constructor({ onStart, onPause, onResume, onRestart, onContinue, onSensitivityChange, onQualityChange }) {
    this.onStart = onStart;
    this.onPause = onPause;
    this.onResume = resumeGame => onResume(resumeGame);
    this.onRestart = onRestart;
    this.onContinue = onContinue;
    this.onSensitivityChange = onSensitivityChange;
    this.onQualityChange = onQualityChange;

    this.loadingScreen = document.getElementById('loading-screen');
    this.introScreen = document.getElementById('intro-screen');
    this.hudLayer = document.getElementById('hud-layer');
    this.pauseScreen = document.getElementById('pause-screen');
    this.completionScreen = document.getElementById('completion-screen');

    this.fragmentCountEl = document.getElementById('hud-fragment-count');
    this.portalBadgeEl = document.getElementById('hud-portal-badge');
    this.notificationEl = document.getElementById('notification-box');
    this.interactionHintEl = document.getElementById('interaction-hint');
    this.interactionHintTextEl = document.getElementById('interaction-hint-text');
    this.crosshairEl = document.getElementById('crosshair');
    this.interactBtnEl = document.getElementById('btn-interact');

    this.sensitivitySlider = document.getElementById('slider-sensitivity');
    this.sensitivityValueEl = document.getElementById('sensitivity-value');
    this.qualitySelect = document.getElementById('select-quality');
    this.resetConfirmHint = document.getElementById('reset-confirm-hint');
    this.completionStatEl = document.getElementById('completion-fragment-stat');

    this.notificationTimer = null;
    this.awaitingResetConfirm = false;

    this.bindEvents();
  }

  bindEvents() {
    const startBtn = document.getElementById('btn-start');
    const pauseBtn = document.getElementById('btn-pause');
    const resumeBtn = document.getElementById('btn-resume');
    const restartPauseBtn = document.getElementById('btn-restart-pause');
    const continueBtn = document.getElementById('btn-continue');
    const restartCompleteBtn = document.getElementById('btn-restart-complete');

    if (startBtn) startBtn.addEventListener('click', () => { if (this.onStart) this.onStart(); });
    if (pauseBtn) pauseBtn.addEventListener('click', () => {
      this.awaitingResetConfirm = false;
      if (this.resetConfirmHint) this.resetConfirmHint.classList.add('hidden');
      if (this.onPause) this.onPause();
    });
    if (resumeBtn) resumeBtn.addEventListener('click', () => { if (this.onResume) this.onResume(); });
    if (restartPauseBtn) restartPauseBtn.addEventListener('click', () => {
      if (!this.awaitingResetConfirm) {
        this.awaitingResetConfirm = true;
        if (this.resetConfirmHint) this.resetConfirmHint.classList.remove('hidden');
        return;
      }
      this.awaitingResetConfirm = false;
      if (this.resetConfirmHint) this.resetConfirmHint.classList.add('hidden');
      if (this.onRestart) this.onRestart();
    });
    if (continueBtn) continueBtn.addEventListener('click', () => { if (this.onContinue) this.onContinue(); });
    if (restartCompleteBtn) restartCompleteBtn.addEventListener('click', () => { if (this.onRestart) this.onRestart(); });

    if (this.sensitivitySlider) {
      this.sensitivitySlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (this.sensitivityValueEl) this.sensitivityValueEl.textContent = `${val.toFixed(1)}x`;
        if (this.onSensitivityChange) this.onSensitivityChange(val);
      });
    }

    if (this.qualitySelect) {
      this.qualitySelect.addEventListener('change', (e) => {
        if (this.onQualityChange) this.onQualityChange(e.target.value);
      });
    }
  }

  showIntro() {
    if (this.loadingScreen) this.loadingScreen.classList.add('hidden');
    if (this.introScreen) this.introScreen.classList.remove('hidden');
    if (this.hudLayer) this.hudLayer.classList.add('hidden');
    if (this.pauseScreen) this.pauseScreen.classList.add('hidden');
    if (this.completionScreen) this.completionScreen.classList.add('hidden');
  }

  showGameplay() {
    if (this.loadingScreen) this.loadingScreen.classList.add('hidden');
    if (this.introScreen) this.introScreen.classList.add('hidden');
    if (this.pauseScreen) this.pauseScreen.classList.add('hidden');
    if (this.completionScreen) this.completionScreen.classList.add('hidden');
    if (this.hudLayer) this.hudLayer.classList.remove('hidden');
  }

  showPause() {
    if (this.pauseScreen) this.pauseScreen.classList.remove('hidden');
  }

  showCompletion(fragmentCount) {
    if (this.completionStatEl) this.completionStatEl.textContent = `${fragmentCount} / 3`;
    if (this.completionScreen) this.completionScreen.classList.remove('hidden');
  }

  setSensitivityUI(value) {
    const val = Number(value) || 1.0;
    if (this.sensitivitySlider) this.sensitivitySlider.value = String(val);
    if (this.sensitivityValueEl) this.sensitivityValueEl.textContent = `${val.toFixed(1)}x`;
  }

  setQualityUI(quality) {
    if (this.qualitySelect) this.qualitySelect.value = quality;
  }

  updateProgress(count, portalActive) {
    if (this.fragmentCountEl) this.fragmentCountEl.textContent = `${count} / 3`;
    if (this.portalBadgeEl) {
      if (portalActive) {
        this.portalBadgeEl.textContent = 'PORTAL ACTIVE';
        this.portalBadgeEl.classList.add('active');
      } else {
        this.portalBadgeEl.textContent = 'PORTAL DORMANT';
        this.portalBadgeEl.classList.remove('active');
      }
    }
  }

  setInteractionHint(text, isReady) {
    if (!text) {
      if (this.interactionHintEl) this.interactionHintEl.classList.add('hidden');
      if (this.crosshairEl) this.crosshairEl.classList.remove('highlight');
      if (this.interactBtnEl) this.interactBtnEl.classList.remove('ready');
      return;
    }
    if (this.interactionHintTextEl) this.interactionHintTextEl.textContent = text;
    if (this.interactionHintEl) this.interactionHintEl.classList.remove('hidden');
    if (this.crosshairEl) this.crosshairEl.classList.toggle('highlight', Boolean(isReady));
    if (this.interactBtnEl) this.interactBtnEl.classList.toggle('ready', Boolean(isReady));
  }

  showNotification(message, durationMs = 2800) {
    if (!this.notificationEl) return;
    if (this.notificationTimer) clearTimeout(this.notificationTimer);
    this.notificationEl.textContent = message;
    this.notificationEl.classList.remove('hidden');
    this.notificationTimer = setTimeout(() => {
      this.notificationEl.classList.add('hidden');
    }, durationMs);
  }
                                                               }
    
