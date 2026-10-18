export class Interactions {
  constructor({ world, player, saveSystem, hud, effects, onPortalEnter }) {
    this.world = world;
    this.player = player;
    this.saveSystem = saveSystem;
    this.hud = hud;
    this.effects = effects;
    this.onPortalEnter = onPortalEnter;

    this.fragmentInteractRadiusSq = 4.3 * 4.3;
    this.portalInteractRadiusSq = 5.4 * 5.4;

    this.activeTarget = null;
  }

  update() {
    const playerPos = this.player.getPosition();
    let closestTarget = null;
    let minDistanceSq = Infinity;

    // Check uncollected Energy Fragments
    for (let i = 0; i < this.world.fragments.length; i++) {
      const frag = this.world.fragments[i];
      if (frag.collected) continue;

      const dx = playerPos.x - frag.worldPosition.x;
      const dz = playerPos.z - frag.worldPosition.z;
      const distSq = dx * dx + dz * dz;

      if (distSq <= this.fragmentInteractRadiusSq && distSq < minDistanceSq) {
        minDistanceSq = distSq;
        closestTarget = {
          type: 'fragment',
          id: frag.id,
          name: frag.name,
          prompt: 'PRESS INTERACT — COLLECT ENERGY FRAGMENT',
          ready: true
        };
      }
    }

    // Check Far Portal if no fragment is closer
    if (!closestTarget) {
      const portalPos = this.world.getPortalInteractionPosition();
      const dx = playerPos.x - portalPos.x;
      const dz = playerPos.z - portalPos.z;
      const distSq = dx * dx + dz * dz;

      if (distSq <= this.portalInteractRadiusSq) {
        const state = this.saveSystem.getState();
        if (state.portalActivated) {
          closestTarget = {
            type: 'portal_active',
            prompt: 'PRESS INTERACT — HARMONIZE WITH PORTAL',
            ready: true
          };
        } else {
          const remaining = 3 - state.collectedIds.length;
          closestTarget = {
            type: 'portal_dormant',
            prompt: `PORTAL DORMANT (${ remaining } MORE FRAGMENT${ remaining === 1 ? '' : 'S' } REQUIRED)`,
            ready: false
          };
        }
      }
    }

    this.activeTarget = closestTarget;

    if (closestTarget) {
      this.hud.setInteractionHint(closestTarget.prompt, closestTarget.ready);
    } else {
      this.hud.setInteractionHint(null, false);
    }
  }

  triggerInteract() {
    if (!this.activeTarget) {
      this.hud.showNotification('NO RESONANT OBJECT IN RANGE', 1800);
      return;
    }

    if (this.activeTarget.type === 'fragment') {
      const fragId = this.activeTarget.id;
      const burstPos = this.world.markFragmentCollected(fragId);
      if (!burstPos) return;

      const updatedState = this.saveSystem.recordFragment(fragId);
      const count = updatedState.collectedIds.length;

      this.effects.triggerBurst(burstPos, 0x00e5ff);
      this.hud.updateProgress(count, updatedState.portalActivated);

      if (count >= 3) {
        this.world.setPortalActiveState(true);
        const portalPos = this.world.getPortalInteractionPosition();
        this.effects.triggerBurst(portalPos, 0x9d4edd);
        this.hud.showNotification(
          'ALL FRAGMENTS RECOVERED — THE IMPOSSIBLE MACHINE & PORTAL ARE ACTIVE',
          4200
        );
      } else {
        this.hud.showNotification(
          `ENERGY FRAGMENT COLLECTED (${ count } / 3)`,
          2600
        );
      }

      this.update();
      return;
    }

    if (this.activeTarget.type === 'portal_dormant') {
      const state = this.saveSystem.getState();
      const needed = 3 - state.collectedIds.length;
      this.hud.showNotification(
        `PORTAL LOCKED — COLLECT ${ needed } MORE ENERGY FRAGMENT${ needed === 1 ? '' : 'S' }`,
        2600
      );
      return;
    }

    if (this.activeTarget.type === 'portal_active') {
      if (this.onPortalEnter) {
        this.onPortalEnter();
      }
    }
  }
        }
        
