export class Controls {
  constructor({ onInteract, onPause }) {
    this.onInteract = onInteract;
    this.onPause = onPause;

    this.enabled = false;
    this.sensitivity = 1.0;

    // Normalized movement vector: x (-1 left, +1 right), y (-1 back, +1 forward)
    this.moveInput = { x: 0, y: 0 };
    // Accumulated look delta for current frame
    this.lookDelta = { x: 0, y: 0 };

    // Multi-touch pointer tracking IDs
    this.movePointerId = null;
    this.moveOrigin = { x: 0, y: 0 };
    this.maxJoystickRadius = 42;

    this.lookPointerId = null;
    this.lastLookPos = { x: 0, y: 0 };

    // Keyboard state for optional desktop testing
    this.keys = {
      KeyW: false,
      KeyS: false,
      KeyA: false,
      KeyD: false,
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    };

    this.joystickZone = document.getElementById('joystick-zone');
    this.joystickKnob = document.getElementById('joystick-knob');
    this.lookZone = document.getElementById('look-zone');
    this.interactBtn = document.getElementById('btn-interact');

    this.bindHandlers();
  }

  bindHandlers() {
    // Joystick Pointer Handlers
    this.handleJoystickDown = (e) => {
      if (!this.enabled || this.movePointerId !== null) return;
      e.preventDefault();
      e.stopPropagation();
      this.movePointerId = e.pointerId;
      this.joystickZone.setPointerCapture(e.pointerId);

      const rect = this.joystickZone.getBoundingClientRect();
      this.moveOrigin.x = rect.left + rect.width / 2;
      this.moveOrigin.y = rect.top + rect.height / 2;
      this.updateJoystickByCoords(e.clientX, e.clientY);
    };

    this.handleJoystickMove = (e) => {
      if (!this.enabled || e.pointerId !== this.movePointerId) return;
      e.preventDefault();
      this.updateJoystickByCoords(e.clientX, e.clientY);
    };

    this.handleJoystickUp = (e) => {
      if (e.pointerId !== this.movePointerId) return;
      e.preventDefault();
      this.resetJoystick();
    };

    // Look Zone Pointer Handlers
    this.handleLookDown = (e) => {
      if (!this.enabled || this.lookPointerId !== null) return;
      e.preventDefault();
      this.lookPointerId = e.pointerId;
      this.lookZone.setPointerCapture(e.pointerId);
      this.lastLookPos.x = e.clientX;
      this.lastLookPos.y = e.clientY;
    };

    this.handleLookMove = (e) => {
      if (!this.enabled || e.pointerId !== this.lookPointerId) return;
      e.preventDefault();
      const dx = e.clientX - this.lastLookPos.x;
      const dy = e.clientY - this.lastLookPos.y;
      this.lastLookPos.x = e.clientX;
      this.lastLookPos.y = e.clientY;

      this.lookDelta.x += dx * 0.0045 * this.sensitivity;
      this.lookDelta.y += dy * 0.0045 * this.sensitivity;
    };

    this.handleLookUp = (e) => {
      if (e.pointerId !== this.lookPointerId) return;
      e.preventDefault();
      try {
        if (this.lookZone.hasPointerCapture(e.pointerId)) {
          this.lookZone.releasePointerCapture(e.pointerId);
        }
      } catch (_) {
        // Ignore release errors
      }
      this.lookPointerId = null;
    };

    // Interact Button Handler
    this.handleInteractDown = (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      e.stopPropagation();
      if (this.onInteract) this.onInteract();
    };

    // Keyboard & Optional Desktop Pointer Lock
    this.handleKeyDown = (e) => {
      if (e.code === 'Escape' && this.enabled) {
        if (this.onPause) this.onPause();
        return;
      }
      if (!this.enabled) return;

      if (e.code in this.keys) {
        this.keys[e.code] = true;
      } else if (e.code === 'KeyE' || e.code === 'Space') {
        e.preventDefault();
        if (this.onInteract) this.onInteract();
      }
    };

    this.handleKeyUp = (e) => {
      if (e.code in this.keys) {
        this.keys[e.code] = false;
      }
    };

    this.handleMouseMove = (e) => {
      if (!this.enabled) return;
      const canvas = document.querySelector('#canvas-container canvas');
      if (document.pointerLockElement === canvas) {
        this.lookDelta.x += e.movementX * 0.0022 * this.sensitivity;
        this.lookDelta.y += e.movementY * 0.0022 * this.sensitivity;
      }
    };

    // Attach listeners
    if (this.joystickZone) {
      this.joystickZone.addEventListener('pointerdown', this.handleJoystickDown);
      this.joystickZone.addEventListener('pointermove', this.handleJoystickMove);
      this.joystickZone.addEventListener('pointerup', this.handleJoystickUp);
      this.joystickZone.addEventListener('pointercancel', this.handleJoystickUp);
    }

    if (this.lookZone) {
      this.lookZone.addEventListener('pointerdown', this.handleLookDown);
      this.lookZone.addEventListener('pointermove', this.handleLookMove);
      this.lookZone.addEventListener('pointerup', this.handleLookUp);
      this.lookZone.addEventListener('pointercancel', this.handleLookUp);
    }

    if (this.interactBtn) {
      this.interactBtn.addEventListener('pointerdown', this.handleInteractDown);
    }

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
  }

  updateJoystickByCoords(clientX, clientY) {
    let dx = clientX - this.moveOrigin.x;
    let dy = clientY - this.moveOrigin.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.maxJoystickRadius) {
      const ratio = this.maxJoystickRadius / dist;
      dx *= ratio;
      dy *= ratio;
    }

    if (this.joystickKnob) {
      this.joystickKnob.style.transform = `translate3d(${ dx }px, ${ dy }px, 0px)`;
    }

    // Normalize to -1..1 (invert Y so pushing up is +1 forward)
    this.moveInput.x = dx / this.maxJoystickRadius;
    this.moveInput.y = -dy / this.maxJoystickRadius;
  }

  resetJoystick() {
    if (this.movePointerId !== null && this.joystickZone) {
      try {
        if (this.joystickZone.hasPointerCapture(this.movePointerId)) {
          this.joystickZone.releasePointerCapture(this.movePointerId);
        }
      } catch (_) {
        // Ignore release errors
      }
    }
    this.movePointerId = null;
    this.moveInput.x = 0;
    this.moveInput.y = 0;
    if (this.joystickKnob) {
      this.joystickKnob.style.transform = 'translate3d(0px, 0px, 0px)';
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (!this.enabled) {
      this.resetJoystick();
      this.lookPointerId = null;
      this.lookDelta.x = 0;
      this.lookDelta.y = 0;
      Object.keys(this.keys).forEach((k) => {
        this.keys[k] = false;
      });
      if (document.pointerLockElement) {
        try {
          document.exitPointerLock();
        } catch (_) {
          // Ignore pointer lock errors
        }
      }
    }
  }

  setSensitivity(value) {
    this.sensitivity = Number(value) || 1.0;
  }

  getMovementVector() {
    let mx = this.moveInput.x;
    let my = this.moveInput.y;

    // Combine with keyboard if used
    if (this.keys.KeyW || this.keys.ArrowUp) my += 1;
    if (this.keys.KeyS || this.keys.ArrowDown) my -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) mx += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) mx -= 1;

    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }

    return { x: mx, y: my };
  }

  consumeLookDelta() {
    const delta = { x: this.lookDelta.x, y: this.lookDelta.y };
    this.lookDelta.x = 0;
    this.lookDelta.y = 0;
    return delta;
  }

  dispose() {
    if (this.joystickZone) {
      this.joystickZone.removeEventListener('pointerdown', this.handleJoystickDown);
      this.joystickZone.removeEventListener('pointermove', this.handleJoystickMove);
      this.joystickZone.removeEventListener('pointerup', this.handleJoystickUp);
      this.joystickZone.removeEventListener('pointercancel', this.handleJoystickUp);
    }
    if (this.lookZone) {
      this.lookZone.removeEventListener('pointerdown', this.handleLookDown);
      this.lookZone.removeEventListener('pointermove', this.handleLookMove);
      this.lookZone.removeEventListener('pointerup', this.handleLookUp);
      this.lookZone.removeEventListener('pointercancel', this.handleLookUp);
    }
    if (this.interactBtn) {
      this.interactBtn.removeEventListener('pointerdown', this.handleInteractDown);
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
  }
                 }
                                         
