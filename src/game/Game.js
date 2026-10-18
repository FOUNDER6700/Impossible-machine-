import * as THREE from 'three';
import { SaveSystem } from './SaveSystem.js';
import { World } from './World.js';
import { Player } from './Player.js';
import { Controls } from './Controls.js';
import { Interactions } from './Interactions.js';
import { Effects } from './Effects.js';
import { HUD } from '../ui/HUD.js';

export class Game {
  constructor({ onProgress }) {
    this.onProgress = onProgress || (() => {});
    this.container = document.getElementById('canvas-container');

    this.isRunning = false;
    this.isPaused = false;
    this.inIntro = true;
    this.inSequence = false;
    this.sequenceTimer = 0;

    this.lastFrameTime = 0;
  }

  createRendererWithFallback() {
    if (!this.container) {
      throw new Error('Missing #canvas-container element in index.html');
    }

    let renderer = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (firstErr) {
      console.warn('High-performance antialiased WebGL context failed, retrying with basic context:', firstErr);
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: 'default'
      });
    }

    const cappedDPR = Math.min(window.devicePixelRatio || 1, 1.35);
    renderer.setPixelRatio(cappedDPR);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Clear any stale canvas elements before appending
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.container.appendChild(renderer.domElement);

    return renderer;
  }

  init() {
    // Step 1: Persistence & State
    this.onProgress(30, 'RESTORING ANOMALY STATE');
    this.saveSystem = new SaveSystem();
    const savedState = this.saveSystem.getState();

    // Step 2: Three.js Renderer, Scene, Camera
    this.onProgress(50, 'CONFIGURING MOBILE GRAPHICS PIPELINE');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      68,
      Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight),
      0.1,
      135
    );

    this.renderer = this.createRendererWithFallback();

    // Step 3: Procedural World Generation
    this.onProgress(75, 'GENERATING CONTAINMENT BASIN');
    this.world = new World(this.scene);
    this.world.build();

    // Step 4: Player, Controls, Effects, HUD, Interactions
    this.onProgress(90, 'CALIBRATING CONTROLS & HUD');
    this.player = new Player(this.camera, this.world);
    this.effects = new Effects(this.scene);

    this.hud = new HUD({
      onStart: () => this.startExploration(),
      onPause: () => this.pauseGame(),
      onResume: () => this.resumeGame(),
      onRestart: () => this.restartExperience(),
      onContinue: () => this.continueExploring(),
      onSensitivityChange: (val) => {
        this.saveSystem.setSensitivity(val);
        this.controls.setSensitivity(val);
      }
    });

    this.controls = new Controls({
      onInteract: () => {
        if (!this.inSequence && !this.isPaused && !this.inIntro) {
          this.interactions.triggerInteract();
        }
      },
      onPause: () => this.pauseGame()
    });

    this.interactions = new Interactions({
      world: this.world,
      player: this.player,
      saveSystem: this.saveSystem,
      hud: this.hud,
      effects: this.effects,
      onPortalEnter: () => this.beginPortalTransformation()
    });

    // Apply saved state to World & HUD
    this.restoreSavedWorldState(savedState);

    // Bind resize & visibility events
    this.handleResize = () => this.onWindowResize();
    this.handleVisibility = () => this.onVisibilityChange();
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibility);

    // Render one initial frame immediately so the 3D scene is visible behind the Intro modal
    this.renderer.render(this.scene, this.camera);

    // Step 5: Complete loading & reveal Intro Screen
    this.onProgress(100, 'READY');
    this.hud.showIntro();

    // Explicitly guarantee loading-screen is hidden even if DOM classes were cached
    const loadingEl = document.getElementById('loading-screen');
    if (loadingEl) {
      loadingEl.classList.add('hidden');
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  restoreSavedWorldState(savedState) {
    this.controls.setSensitivity(savedState.lookSensitivity);
    this.hud.setSensitivityUI(savedState.lookSensitivity);

    savedState.collectedIds.forEach((id) => {
      this.world.markFragmentCollected(id);
    });

    if (savedState.portalActivated) {
      this.world.setPortalActiveState(true);
    }

    if (savedState.completed) {
      this.world.setWorldTransformedState(true);
    }

    this.hud.updateProgress(
      savedState.collectedIds.length,
      savedState.portalActivated
    );
  }

  startExploration() {
    this.inIntro = false;
    this.isPaused = false;
    this.hud.showGameplay();
    this.controls.setEnabled(true);

    const saved = this.saveSystem.getState();
    if (saved.collectedIds.length > 0) {
      this.hud.showNotification(
        `PROGRESS RESTORED (${saved.collectedIds.length} / 3 FRAGMENTS)`,
        2800
      );
    } else {
      this.hud.showNotification(
        'EXPLORE THE BASIN — RECOVER 3 ENERGY FRAGMENTS',
        3200
      );
    }
  }

  pauseGame() {
    if (this.inIntro || this.isPaused) return;
    this.isPaused = true;
    this.controls.setEnabled(false);
    this.hud.showPause();
  }

  resumeGame() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.hud.showGameplay();
    this.controls.setEnabled(true);
    this.lastFrameTime = performance.now();
  }

  beginPortalTransformation() {
    this.inSequence = true;
    this.sequenceTimer = 0;
    this.controls.setEnabled(false);

    this.saveSystem.setCompleted(true);
    this.world.setWorldTransformedState(true);

    const portalPos = this.world.getPortalInteractionPosition();
    this.effects.triggerBurst(portalPos, 0x00ffff);
    this.hud.setInteractionHint(null, false);
    this.hud.showNotification(
      'HARMONIZING CENTRAL ANOMALY — REALITY MATRIX STABILIZED',
      3000
    );
  }

  continueExploring() {
    this.inSequence = false;
    this.isPaused = false;
    this.hud.showGameplay();
    this.controls.setEnabled(true);
    this.lastFrameTime = performance.now();
  }

  restartExperience() {
    const freshState = this.saveSystem.reset();
    this.world.resetVisuals();
    this.player.reset();
    this.hud.updateProgress(0, false);
    this.hud.setInteractionHint(null, false);

    this.inSequence = false;
    this.isPaused = false;
    this.inIntro = false;

    this.hud.showGameplay();
    this.controls.setSensitivity(freshState.lookSensitivity);
    this.controls.setEnabled(true);
    this.hud.showNotification('EXPERIENCE RESET — ALL ANOMALIES RESTORED', 2800);
    this.lastFrameTime = performance.now();
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight);
    this.camera.updateProjectionMatrix();
    const cappedDPR = Math.min(window.devicePixelRatio || 1, 1.35);
    this.renderer.setPixelRatio(cappedDPR);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  onVisibilityChange() {
    if (document.hidden) {
      if (!this.inIntro && !this.isPaused && !this.inSequence) {
        this.pauseGame();
      }
    } else {
      this.lastFrameTime = performance.now();
    }
  }

  animate(now) {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);

    if (document.hidden) return;

    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    if (!this.isPaused) {
      this.world.update(dt);
      this.effects.update(dt);

      if (!this.inIntro && !this.inSequence) {
        this.player.update(dt, this.controls);
        this.interactions.update();
      } else if (this.inSequence) {
        this.sequenceTimer += dt;
        this.camera.rotation.x += (0.18 - this.camera.rotation.x) * dt * 2.0;
        if (this.sequenceTimer >= 2.4) {
          this.inSequence = false;
          this.isPaused = true;
          const state = this.saveSystem.getState();
          this.hud.showCompletion(state.collectedIds.length);
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.isRunning = false;
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    this.controls.dispose();
    this.world.dispose();
    this.effects.dispose();
    this.renderer.dispose();
  }
        }
    
