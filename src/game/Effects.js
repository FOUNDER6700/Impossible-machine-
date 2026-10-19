import * as THREE from 'three';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.resources = [];

    this.ambientCount = 200;
    this.burstCount = 45;
    this.burstActive = false;
    this.burstElapsed = 0;
    this.burstDuration = 1.25;

    this.initAmbientParticles();
    this.initBurstParticles();
  }

  trackResource(res) {
    if (res && !this.resources.includes(res)) this.resources.push(res);
    return res;
  }

  initAmbientParticles() {
    const geo = this.trackResource(new THREE.BufferGeometry());
    const positions = new Float32Array(this.ambientCount * 3);

    for (let i = 0; i < this.ambientCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 92;
      positions[i * 3 + 1] = 1.0 + Math.random() * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 92;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = this.trackResource(
      new THREE.PointsMaterial({
        color: 0x00e5ff,
        size: 0.25,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
      })
    );

    this.ambientPoints = new THREE.Points(geo, mat);
    this.scene.add(this.ambientPoints);
  }

  initBurstParticles() {
    const geo = this.trackResource(new THREE.BufferGeometry());
    const positions = new Float32Array(this.burstCount * 3);
    this.burstVelocities = [];

    for (let i = 0; i < this.burstCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 3.0 + Math.random() * 5.5;

      this.burstVelocities.push(
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.abs(Math.cos(phi)) * speed + 1.5,
          Math.sin(phi) * Math.sin(theta) * speed
        )
      );
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.burstMat = this.trackResource(
      new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 0.42,
        transparent: true,
        opacity: 0,
        depthWrite: false
      })
    );

    this.burstPoints = new THREE.Points(geo, this.burstMat);
    this.burstPoints.visible = false;
    this.scene.add(this.burstPoints);
  }

  triggerBurst(origin, hexColor = 0x00e5ff) {
    const posAttr = this.burstPoints.geometry.attributes.position;
    for (let i = 0; i < this.burstCount; i++) {
      posAttr.setXYZ(i, origin.x, origin.y, origin.z);
    }
    posAttr.needsUpdate = true;

    this.burstMat.color.setHex(hexColor);
    this.burstMat.opacity = 1.0;
    this.burstPoints.visible = true;
    this.burstActive = true;
    this.burstElapsed = 0;
  }

  update(dt) {
    const ambAttr = this.ambientPoints.geometry.attributes.position;
    for (let i = 0; i < this.ambientCount; i++) {
      let y = ambAttr.getY(i) + dt * 0.5;
      if (y > 18) y = 1.0;
      ambAttr.setY(i, y);
    }
    ambAttr.needsUpdate = true;

    if (this.burstActive) {
      this.burstElapsed += dt;
      const progress = this.burstElapsed / this.burstDuration;

      if (progress >= 1) {
        this.burstActive = false;
        this.burstPoints.visible = false;
      } else {
        const posAttr = this.burstPoints.geometry.attributes.position;
        for (let i = 0; i < this.burstCount; i++) {
          const vel = this.burstVelocities[i];
          posAttr.setXYZ(
            i,
            posAttr.getX(i) + vel.x * dt,
            posAttr.getY(i) + vel.y * dt,
            posAttr.getZ(i) + vel.z * dt
          );
        }
        posAttr.needsUpdate = true;
        this.burstMat.opacity = Math.max(0, 1 - progress);
      }
    }
  }

  dispose() {
    this.resources.forEach((res) => {
      if (res && typeof res.dispose === 'function') res.dispose();
    });
    this.resources = [];
  }
}
