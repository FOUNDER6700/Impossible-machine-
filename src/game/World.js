import * as THREE from 'three';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.fragments = [];
    this.floatingStones = [];
    this.resources = [];
    this.elapsedTime = 0;

    this.machineSpeedMultiplier = 1.0;
    this.targetMachineSpeed = 1.0;
    this.isTransformed = false;

    this.machineGroup = new THREE.Group();
    this.portalGroup = new THREE.Group();
  }

  trackResource(res) {
    if (res && !this.resources.includes(res)) {
      this.resources.push(res);
    }
    return res;
  }

  smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }

  getTerrainHeight(x, z) {
    const dist = Math.hypot(x, z);
    // Multi-octave procedural terrain variation for realistic rocky alien basins
    const baseWave =
      Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.75 +
      Math.sin((x + z) * 0.04) * 0.45;
    const crag = Math.cos(x * 0.25) * Math.sin(z * 0.25) * 0.22;
    const centerFlatten = this.smoothstep(7, 22, dist);
    const rimRise = Math.max(0, (dist - 36) * 0.18);

    return (baseWave + crag) * centerFlatten + rimRise;
  }

  build(graphicsQuality = 'MEDIUM') {
    this.setupLighting();
    this.buildSkyAndFog();
    this.buildTerrain(graphicsQuality);
    this.buildBoundaryMonoliths();
    this.buildCentralMachine();
    this.buildPortal();
    this.buildRuinsAndLandmarks();
    this.buildFragments();
  }

  setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(0x1a2942, 0x05070e, 1.25);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0x5ca9ff, 0.95);
    this.dirLight.position.set(30, 50, 25);
    this.scene.add(this.dirLight);

    this.machineLight = new THREE.PointLight(0x00e5ff, 3.8, 48, 1.4);
    this.machineLight.position.set(0, 8.5, 0);
    this.scene.add(this.machineLight);

    this.portalLight = new THREE.PointLight(0x9d4edd, 1.8, 32, 1.5);
    this.portalLight.position.set(0, 5.0, -39);
    this.scene.add(this.portalLight);
  }

  buildSkyAndFog() {
    this.scene.background = new THREE.Color(0x040710);
    this.scene.fog = new THREE.FogExp2(0x040710, 0.016);
  }

  buildTerrain(quality) {
    const segments = quality === 'LOW' ? 44 : quality === 'HIGH' ? 88 : 64;
    const geo = this.trackResource(new THREE.PlaneGeometry(112, 112, segments, segments));
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);

    const cLow = new THREE.Color(0x060b16);
    const cHigh = new THREE.Color(0x12223c);
    const cPath = new THREE.Color(0x18345c);
    const tempColor = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = this.getTerrainHeight(vx, vz);
      posAttr.setY(i, vy);

      const norm = Math.min(1, Math.max(0, (vy + 1.0) / 3.0));
      tempColor.lerpColors(cLow, cHigh, norm);
      if (Math.abs(vx) < 3.2 && vz > -42 && vz < 38) {
        tempColor.lerp(cPath, 0.5);
      }

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = this.trackResource(
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.22,
        flatShading: true
      })
    );

    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.terrainMesh);
  }

  buildBoundaryMonoliths() {
    const wallCount = 40;
    const radius = 48.0;
    const geo = this.trackResource(new THREE.BoxGeometry(7.5, 18, 3.2));
    const mat = this.trackResource(
      new THREE.MeshStandardMaterial({
        color: 0x080f1e,
        roughness: 0.65,
        metalness: 0.5
      })
    );
    const trimGeo = this.trackResource(new THREE.BoxGeometry(0.4, 14, 3.4));
    const trimMat = this.trackResource(new THREE.MeshBasicMaterial({ color: 0x0099cc }));

    const group = new THREE.Group();
    for (let i = 0; i < wallCount; i++) {
      const angle = (i / wallCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.getTerrainHeight(x, z);

      const monolith = new THREE.Mesh(geo, mat);
      monolith.position.set(x, y + 6.5 + (i % 3) * 1.5, z);
      monolith.lookAt(0, monolith.position.y, 0);
      group.add(monolith);

      if (i % 2 === 0) {
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.copy(monolith.position);
        trim.quaternion.copy(monolith.quaternion);
        group.add(trim);
      }
    }
    this.scene.add(group);
  }

  buildCentralMachine() {
    this.machineGroup.position.set(0, 0, 0);

    // Tiered Heavy Metal Base Dais
    const baseMat = this.trackResource(
      new THREE.MeshStandardMaterial({
        color: 0x0e1726,
        roughness: 0.3,
        metalness: 0.85
      })
    );
    const dais1 = new THREE.Mesh(this.trackResource(new THREE.CylinderGeometry(6.4, 7.2, 1.2, 16)), baseMat);
    dais1.position.y = 0.6;
    const dais2 = new THREE.Mesh(this.trackResource(new THREE.CylinderGeometry(5.2, 5.8, 0.8, 16)), baseMat);
    dais2.position.y = 1.3;
    this.machineGroup.add(dais1, dais2);

    // Glowing Floor Conduits
    const ringGeo = this.trackResource(new THREE.RingGeometry(5.4, 5.9, 48));
    ringGeo.rotateX(-Math.PI / 2);
    this.machineFloorMat = this.trackResource(
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide })
    );
    const floorRing = new THREE.Mesh(ringGeo, this.machineFloorMat);
    floorRing.position.y = 0.18;
    this.machineGroup.add(floorRing);

    // Sophisticated Interlocking Segmented Rings (Using Dodecahedron/Torus combos)
    const ringMat = this.trackResource(
      new THREE.MeshStandardMaterial({
        color: 0x1a2b48,
        emissive: 0x004466,
        emissiveIntensity: 0.7,
        roughness: 0.2,
        metalness: 0.92
      })
    );
    this.machineRingMat = ringMat;

    // Outer Gyro Ring (Segmented Appearance)
    const outerTorus = new THREE.Mesh(
      this.trackResource(new THREE.TorusGeometry(5.6, 0.28, 16, 64)),
      ringMat
    );
    outerTorus.position.y = 8.0;
    outerTorus.rotation.x = Math.PI / 6;

    // Middle Gyro Ring
    const midTorus = new THREE.Mesh(
      this.trackResource(new THREE.TorusGeometry(4.3, 0.24, 16, 56)),
      ringMat
    );
    midTorus.position.y = 8.0;
    midTorus.rotation.y = Math.PI / 4;

    // Inner Gyro Ring
    const innerTorus = new THREE.Mesh(
      this.trackResource(new THREE.TorusGeometry(3.0, 0.2, 14, 48)),
      ringMat
    );
    innerTorus.position.y = 8.0;
    innerTorus.rotation.z = Math.PI / 3;

    this.ring1 = outerTorus;
    this.ring2 = midTorus;
    this.ring3 = innerTorus;
    this.machineGroup.add(outerTorus, midTorus, innerTorus);

    // Multi-layered Central Energy Core
    const coreGroup = new THREE.Group();
    coreGroup.position.y = 8.0;

    const coreGeo = this.trackResource(new THREE.OctahedronGeometry(1.6, 2));
    this.coreMat = this.trackResource(
      new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00e5ff,
        emissiveIntensity: 2.0,
        roughness: 0.08,
        metalness: 0.25
      })
    );
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    coreGroup.add(this.coreMesh);

    // Outer Energy Cage
    const cageMat = this.trackResource(
      new THREE.MeshBasicMaterial({ color: 0x9d4edd, wireframe: true })
    );
    this.coreCage = new THREE.Mesh(this.trackResource(new THREE.IcosahedronGeometry(2.1, 1)), cageMat);
    coreGroup.add(this.coreCage);

    this.machineGroup.add(coreGroup);

    // Orbiting Mechanical Satellites
    this.satellitesGroup = new THREE.Group();
    this.satellitesGroup.position.y = 8.0;
    const satGeo = this.trackResource(new THREE.DodecahedronGeometry(0.38, 0));
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const sat = new THREE.Mesh(satGeo, this.coreMat);
      sat.position.set(Math.cos(angle) * 4.8, Math.sin(angle * 2) * 1.5, Math.sin(angle) * 4.8);
      this.satellitesGroup.add(sat);
    }
    this.machineGroup.add(this.satellitesGroup);

    this.scene.add(this.machineGroup);
    this.colliders.push({ x: 0, z: 0, radius: 6.5 });
  }

  buildPortal() {
    const portalZ = -39;
    const groundY = this.getTerrainHeight(0, portalZ);
    this.portalGroup.position.set(0, groundY, portalZ);

    const frameMat = this.trackResource(
      new THREE.MeshStandardMaterial({ color: 0x0f182c, roughness: 0.4, metalness: 0.85 })
    );

    const dais = new THREE.Mesh(this.trackResource(new THREE.BoxGeometry(10.2, 0.9, 5.8)), frameMat);
    dais.position.y = 0.45;
    this.portalGroup.add(dais);

    const pGeo = this.trackResource(new THREE.BoxGeometry(1.3, 9.2, 1.5));
    const leftP = new THREE.Mesh(pGeo, frameMat);
    leftP.position.set(-3.9, 4.8, 0);
    const rightP = new THREE.Mesh(pGeo, frameMat);
    rightP.position.set(3.9, 4.8, 0);
    this.portalGroup.add(leftP, rightP);

    const header = new THREE.Mesh(this.trackResource(new THREE.BoxGeometry(9.4, 1.4, 1.8)), frameMat);
    header.position.set(0, 9.2, 0);
    this.portalGroup.add(header);

    this.portalRingMat = this.trackResource(
      new THREE.MeshStandardMaterial({
        color: 0x1e2f4f,
        emissive: 0x3c096c,
        emissiveIntensity: 0.8,
        roughness: 0.25,
        metalness: 0.9
      })
    );
    this.portalRing = new THREE.Mesh(
      this.trackResource(new THREE.TorusGeometry(3.3, 0.25, 16, 56)),
      this.portalRingMat
    );
    this.portalRing.position.set(0, 4.8, 0);
    this.portalGroup.add(this.portalRing);

    this.portalDiscMat = this.trackResource(
      new THREE.MeshBasicMaterial({ color: 0x240046, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    this.portalDisc = new THREE.Mesh(
      this.trackResource(new THREE.CircleGeometry(3.1, 48)),
      this.portalDiscMat
    );
    this.portalDisc.position.set(0, 4.8, 0);
    this.portalGroup.add(this.portalDisc);

    this.portalLatticeMat = this.trackResource(
      new THREE.MeshBasicMaterial({ color: 0x7b2cbf, wireframe: true, transparent: true, opacity: 0.4 })
    );
    this.portalLattice = new THREE.Mesh(
      this.trackResource(new THREE.RingGeometry(1.6, 2.9, 8)),
      this.portalLatticeMat
    );
    this.portalLattice.position.set(0, 4.8, 0.08);
    this.portalGroup.add(this.portalLattice);

    this.scene.add(this.portalGroup);
    this.colliders.push({ x: -3.9, z: portalZ, radius: 1.2 });
    this.colliders.push({ x: 3.9, z: portalZ, radius: 1.2 });
  }

  buildRuinsAndLandmarks() {
    const pillarGeo = this.trackResource(new THREE.CylinderGeometry(0.9, 1.15, 7.2, 8));
    const brokenPillarGeo = this.trackResource(new THREE.CylinderGeometry(0.95, 1.2, 3.8, 8));
    const rockGeo = this.trackResource(new THREE.DodecahedronGeometry(1.8, 0));
    const ruinMat = this.trackResource(
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.35, flatShading: true })
    );

    const coords = [
      { x: -6, z: 28, broken: false }, { x: 6, z: 28, broken: true },
      { x: -6, z: 18, broken: true }, { x: 6, z: 18, broken: false },
      { x: -18, z: -14, broken: false }, { x: 18, z: -14, broken: false },
      { x: -14, z: -28, broken: true }, { x: 14, z: -28, broken: true },
      { x: -26, z: -6, broken: false }, { x: -33, z: -13, broken: true },
      { x: 26, z: -4, broken: false }, { x: 33, z: -11, broken: true },
      { x: 16, z: 24, broken: false }, { x: 24, z: 20, broken: true }
    ];

    coords.forEach((p, idx) => {
      const y = this.getTerrainHeight(p.x, p.z);
      const mesh = new THREE.Mesh(p.broken ? brokenPillarGeo : pillarGeo, ruinMat);
      mesh.position.set(p.x, y + (p.broken ? 1.7 : 3.6), p.z);
      mesh.rotation.y = idx * 0.6;
      this.scene.add(mesh);
      this.colliders.push({ x: p.x, z: p.z, radius: 1.35 });
    });

    // Floating Architectural Shards
    const floatCoords = [
      { x: -12, y: 9.5, z: 7, s: 1.0 }, { x: 13, y: 11.2, z: 5, s: 1.2 },
      { x: -16, y: 10.0, z: -15, s: 1.1 }, { x: 15, y: 12.5, z: -18, s: 1.35 },
      { x: -7, y: 13.0, z: -30, s: 0.95 }, { x: 8, y: 12.0, z: -29, s: 1.05 }
    ];

    floatCoords.forEach((f, idx) => {
      const stone = new THREE.Mesh(rockGeo, ruinMat);
      stone.scale.setScalar(f.s);
      stone.position.set(f.x, f.y, f.z);
      stone.rotation.set(idx * 0.5, idx * 0.8, 0);
      this.scene.add(stone);
      this.floatingStones.push({ mesh: stone, baseY: f.y, phase: idx * 1.4 });
    });
  }

  buildFragments() {
    const locs = [
      { id: 'frag_west', name: 'WESTERN MONOLITH FRAGMENT', x: -28, z: -8 },
      { id: 'frag_east', name: 'EASTERN CONDUIT FRAGMENT', x: 28, z: -6 },
      { id: 'frag_south', name: 'SOUTHERN OVERLOOK FRAGMENT', x: 18, z: 20 }
    ];

    const pedestalMat = this.trackResource(
      new THREE.MeshStandardMaterial({ color: 0x112238, roughness: 0.35, metalness: 0.8 })
    );

    locs.forEach((loc, index) => {
      const groundY = this.getTerrainHeight(loc.x, loc.z);
      const group = new THREE.Group();
      group.position.set(loc.x, groundY, loc.z);

      // Detailed Altar Pedestal
      const pedestal = new THREE.Mesh(this.trackResource(new THREE.CylinderGeometry(1.1, 1.5, 1.4, 8)), pedestalMat);
      pedestal.position.y = 0.7;
      group.add(pedestal);

      // Sophisticated Artifact Silhouette (Outer Shell + Inner Crystal + Orbiting Ring)
      const shellMat = this.trackResource(
        new THREE.MeshStandardMaterial({ color: 0x1b2d4f, wireframe: true, roughness: 0.2 })
      );
      const outerShell = new THREE.Mesh(this.trackResource(new THREE.IcosahedronGeometry(0.95, 0)), shellMat);
      outerShell.position.y = 2.5;
      group.add(outerShell);

      const crystalMat = this.trackResource(
        new THREE.MeshStandardMaterial({
          color: 0x00ffff,
          emissive: 0x00e5ff,
          emissiveIntensity: 1.6,
          roughness: 0.1,
          metalness: 0.3
        })
      );
      const crystal = new THREE.Mesh(this.trackResource(new THREE.OctahedronGeometry(0.55, 0)), crystalMat);
      crystal.position.y = 2.5;
      group.add(crystal);

      const haloRing = new THREE.Mesh(
        this.trackResource(new THREE.TorusGeometry(1.25, 0.05, 8, 32)),
        this.trackResource(new THREE.MeshBasicMaterial({ color: 0x9d4edd }))
      );
      haloRing.position.y = 2.5;
      group.add(haloRing);

      const beacon = new THREE.Mesh(
        this.trackResource(new THREE.CylinderGeometry(0.05, 0.05, 20, 8)),
        this.trackResource(new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.25 }))
      );
      beacon.position.y = 11.0;
      group.add(beacon);

      this.scene.add(group);
      this.colliders.push({ x: loc.x, z: loc.z, radius: 1.25 });

      this.fragments.push({
        id: loc.id,
        name: loc.name,
        collected: false,
        group,
        crystal,
        outerShell,
        haloRing,
        beacon,
        crystalMat,
        phase: index * 2.1,
        worldPosition: new THREE.Vector3(loc.x, groundY + 2.2, loc.z)
      });
    });
  }

  markFragmentCollected(id) {
    const frag = this.fragments.find((f) => f.id === id);
    if (!frag || frag.collected) return null;
    frag.collected = true;
    frag.crystal.scale.set(0.3, 0.3, 0.3);
    frag.crystalMat.color.setHex(0x1e293b);
    frag.crystalMat.emissive.setHex(0x001122);
    frag.crystalMat.emissiveIntensity = 0.2;
    frag.outerShell.visible = false;
    frag.haloRing.visible = false;
    frag.beacon.visible = false;
    return frag.worldPosition.clone();
  }

  setPortalActiveState(active) {
    if (active) {
      this.portalRingMat.color.setHex(0x00e5ff);
      this.portalRingMat.emissive.setHex(0x00b4d8);
      this.portalRingMat.emissiveIntensity = 1.6;
      this.portalDiscMat.color.setHex(0x00e5ff);
      this.portalDiscMat.opacity = 0.85;
      this.portalLatticeMat.color.setHex(0xffffff);
      this.portalLatticeMat.opacity = 0.9;
      this.portalLight.color.setHex(0x00e5ff);
      this.portalLight.intensity = 4.2;
      this.targetMachineSpeed = 2.2;
    } else {
      this.portalRingMat.color.setHex(0x1e2f4f);
      this.portalRingMat.emissive.setHex(0x3c096c);
      this.portalRingMat.emissiveIntensity = 0.8;
      this.portalDiscMat.color.setHex(0x240046);
      this.portalDiscMat.opacity = 0.5;
      this.portalLatticeMat.color.setHex(0x7b2cbf);
      this.portalLatticeMat.opacity = 0.4;
      this.portalLight.color.setHex(0x9d4edd);
      this.portalLight.intensity = 1.8;
      this.targetMachineSpeed = 1.0;
    }
  }

  setWorldTransformedState(transformed) {
    this.isTransformed = transformed;
    if (transformed) {
      this.targetMachineSpeed = 4.5;
      this.hemiLight.color.setHex(0x4a1e80);
      this.hemiLight.groundColor.setHex(0x051b2a);
      this.machineLight.color.setHex(0xdf73ff);
      this.machineLight.intensity = 5.0;
      this.coreMat.emissive.setHex(0xff73ff);
      this.machineRingMat.emissive.setHex(0x00ffff);
      this.machineRingMat.emissiveIntensity = 1.5;
    } else {
      this.hemiLight.color.setHex(0x1a2942);
      this.hemiLight.groundColor.setHex(0x05070e);
      this.machineLight.color.setHex(0x00e5ff);
      this.machineLight.intensity = 3.8;
      this.coreMat.emissive.setHex(0x00e5ff);
      this.machineRingMat.emissive.setHex(0x004466);
      this.machineRingMat.emissiveIntensity = 0.7;
    }
  }

  resetVisuals() {
    this.fragments.forEach((frag) => {
      frag.collected = false;
      frag.crystal.scale.set(1, 1, 1);
      frag.crystalMat.color.setHex(0x00ffff);
      frag.crystalMat.emissive.setHex(0x00e5ff);
      frag.crystalMat.emissiveIntensity = 1.6;
      frag.outerShell.visible = true;
      frag.haloRing.visible = true;
      frag.beacon.visible = true;
    });
    this.setPortalActiveState(false);
    this.setWorldTransformedState(false);
    this.machineSpeedMultiplier = 1.0;
  }

  getPortalInteractionPosition() {
    return new THREE.Vector3(this.portalGroup.position.x, this.portalGroup.position.y + 2.2, this.portalGroup.position.z);
  }

  getColliders() {
    return this.colliders;
  }

  update(dt) {
    this.elapsedTime += dt;
    this.machineSpeedMultiplier += (this.targetMachineSpeed - this.machineSpeedMultiplier) * Math.min(1, dt * 2.5);
    const speed = this.machineSpeedMultiplier;

    // Complex multi-axis ring rotation with offset velocities
    this.ring1.rotation.x += dt * 0.45 * speed;
    this.ring1.rotation.y += dt * 0.3 * speed;
    this.ring2.rotation.y -= dt * 0.6 * speed;
    this.ring2.rotation.z += dt * 0.4 * speed;
    this.ring3.rotation.x -= dt * 0.75 * speed;
    this.ring3.rotation.z -= dt * 0.5 * speed;

    this.coreMesh.rotation.y += dt * 1.1 * speed;
    this.coreMesh.rotation.x += dt * 0.5 * speed;
    const pulse = 1 + Math.sin(this.elapsedTime * 3.5 * speed) * 0.09;
    this.coreMesh.scale.setScalar(pulse);

    this.coreCage.rotation.y -= dt * 0.7 * speed;
    this.satellitesGroup.rotation.y += dt * 0.45 * speed;
    this.satellitesGroup.rotation.z = Math.sin(this.elapsedTime * 0.8) * 0.2;

    for (let i = 0; i < this.fragments.length; i++) {
      const frag = this.fragments[i];
      if (!frag.collected) {
        frag.crystal.position.y = 2.5 + Math.sin(this.elapsedTime * 2.6 + frag.phase) * 0.25;
        frag.crystal.rotation.y += dt * 1.5;
        frag.outerShell.rotation.x -= dt * 0.8;
        frag.outerShell.rotation.y += dt * 1.2;
        frag.haloRing.rotation.x = Math.sin(this.elapsedTime * 1.8 + frag.phase) * 0.8;
        frag.haloRing.rotation.y -= dt * 1.2;
      } else {
        frag.crystal.rotation.y += dt * 0.4;
      }
    }

    const portalSpin = this
