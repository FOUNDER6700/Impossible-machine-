import * as THREE from 'three';

export class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;

    this.eyeHeight = 1.75;
    this.moveSpeed = 8.4;
    this.playerRadius = 0.75;
    this.maxArenaRadius = 45.2;

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();

    this.yaw = 0;
    this.pitch = 0.05;
    this.maxPitch = 1.25; // ~71 degrees up/down

    this.forwardDir = new THREE.Vector3();
    this.rightDir = new THREE.Vector3();

    this.reset();
  }

  reset() {
    const startX = 0;
    const startZ = 34;
    const groundY = this.world.getTerrainHeight(startX, startZ);

    this.position.set(startX, groundY + this.eyeHeight, startZ);
    this.velocity.set(0, 0, 0);
    // Face north (-Z) toward the Central Machine and Portal
    this.yaw = 0;
    this.pitch = 0.06;

    this.syncCamera();
  }

  update(dt, controls) {
    // 1. Update Camera Rotation
    const look = controls.consumeLookDelta();
    this.yaw -= look.x;
    this.pitch -= look.y;
    this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));

    // 2. Compute Horizontal Movement Vector relative to Yaw
    const move = controls.getMovementVector();

    this.forwardDir.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    this.rightDir.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    const targetVx = (this.forwardDir.x * move.y + this.rightDir.x * move.x) * this.moveSpeed;
    const targetVz = (this.forwardDir.z * move.y + this.rightDir.z * move.x) * this.moveSpeed;

    // Frame-rate independent exponential smoothing
    const damping = 1 - Math.exp(-12 * dt);
    this.velocity.x += (targetVx - this.velocity.x) * damping;
    this.velocity.z += (targetVz - this.velocity.z) * damping;

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // 3. Resolve Collisions with World Obstacles & Arena Boundary
    this.resolveCollisions();

    // 4. Keep Player Grounded on Procedural Terrain
    const terrainY = this.world.getTerrainHeight(this.position.x, this.position.z);
    this.position.y = terrainY + this.eyeHeight;

    this.syncCamera();
  }

  resolveCollisions() {
    // Circular obstacle collisions
    const colliders = this.world.getColliders();
    for (let i = 0; i < colliders.length; i++) {
      const col = colliders[i];
      const dx = this.position.x - col.x;
      const dz = this.position.z - col.z;
      const minDist = col.radius + this.playerRadius;
      const distSq = dx * dx + dz * dz;

      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = minDist - dist;
        this.position.x += (dx / dist) * overlap;
        this.position.z += (dz / dist) * overlap;
      }
    }

    // Outer perimeter containment
    const distFromOrigin = Math.hypot(this.position.x, this.position.z);
    if (distFromOrigin > this.maxArenaRadius) {
      const scale = this.maxArenaRadius / distFromOrigin;
      this.position.x *= scale;
      this.position.z *= scale;
    }
  }

  syncCamera() {
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  getPosition() {
    return this.position;
  }
                                 }
        
