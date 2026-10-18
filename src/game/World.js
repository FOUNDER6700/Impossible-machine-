import * as THREE from 'three';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.fragments = [];
    this.floatingStones = [];
    this.resources = [];
    this.elapsedTime = 0;

    // Machine state
    this.machineSpeedMultiplier = 1.0;
    this.targetMachineSpeed = 1.0;
    this.isTransformed = false;

    this.machineGroup = new THREE.Group();
    this.portalGroup = new THREE.Group();
  }

  trackResource(resource) {
    if (resource && !this.resources.includes(resource)) {
      this.resources.push(resource);
    }
    return resource;
  }

  /**
   * Procedural terrain elevation at world coordinates (x, z).
   * Keeps the central machine plaza and starting path flat enough for smooth navigation
   * while adding subtle sci-fi basin contours across the 100x100 arena.
   */
  getTerrainHeight(x, z) {
    const distFromCenter = Math.hypot(x, z);
    const wave =
      Math.sin(x * 0.09) * Math.cos(z * 0.09) * 0.55 +
      Math.sin((x + z) * 0.05) * 0.3;

    // Flatten immediate center beneath the machine pedestals
    const centerFlatten = Math.smoothstep
      ? this.smoothstep(8, 18, distFromCenter)
      : Math.min(1, Math.max(0, (distFromCenter - 8) / 10));

    // Gently rise near the outer perimeter wall (radius 44..50)
    const rimRise = Math.max(0, (distFromCenter - 38) * 0.14);

    return wave * centerFlatten + rimRise;
  }

  smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }

  build() {
    this.setupLighting();
    this.buildSkyAndFog();
    this.buildTerrain();
    this.buildBoundaryMonoliths();
    this.buildCentralMachine();
    this.buildPortal();
    this.buildRuinsAndLandmarks();
    this.buildFragments();
  }

  setupLighting() {
    // 1. Hemisphere Light for atmospheric sci-fi fill
    this.hemiLight = new THREE.HemisphereLight(0x1e3866, 0x05070e, 1.15);
    this.scene.add(this.hemiLight);

    // 2. Directional Moonlight / Rim Light
    this.dirLight = new THREE.DirectionalLight(0x68b5ff, 0.85);
    this.dirLight.position.set(25, 45, 20);
    this.scene.add(this.dirLight);

    // 3. Central Machine Core PointLight
    this.machineLight = new THREE.PointLight(0x00e5ff, 3.2, 42, 1.5);
    this.machineLight.position.set(0, 7.5, 0);
    this.scene.add(this.machineLight);

    // 4. Far Portal PointLight
    this.portalLight = new THREE.PointLight(0x7b2cbf, 1.2, 28, 1.6);
    this.portalLight.position.set(0, 4.5, -39);
    this.scene.add(this.portalLight);
  }

  buildSkyAndFog() {
    this.scene.background = new THREE.Color(0x050811);
    this.scene.fog = new THREE.FogExp2(0x050811, 0.0175);
  }

  buildTerrain() {
    const size = 112;
    const segments = 68;
    const geo = this.trackResource(
      new THREE.PlaneGeometry(size, size, segments, segments)
    );
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);

    const colorLow = new THREE.Color(0x070d19);
    const colorHigh = new THREE.Color(0x11203a);
    const colorPath = new THREE.Color(0x152c4a);
    const tempColor = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = this.getTerrainHeight(vx, vz);
      posAttr.setY(i, vy);

      const heightNorm = Math.min(1, Math.max(0, (vy + 0.8) / 2.6));
      tempColor.lerpColors(colorLow, colorHigh, heightNorm);

      // Subtle luminous pathway along Z axis from spawn (z=34) to machine (z=0) to portal (z=-39)
      if (Math.abs(vx) < 2.8 && vz > -40 && vz < 38) {
        tempColor.lerp(colorPath, 0.45);
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
        roughness: 0.88,
        metalness: 0.18,
        flatShading: true
      })
    );

    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.terrainMesh);
  }

  buildBoundaryMonoliths() {
    const wallCount = 36;
    const arenaRadius = 48.5;

    const monolithGeo = this.trackResource(new THREE.BoxGeometry(8.8, 15, 2.5));
    const monolithMat = this.trackResource(
      new THREE.MeshStandardMaterial({
        color: 0x09101f,
        roughness: 0.7,
        metalness: 0.45
      })
    );

    const trimGeo = this.trackResource(new THREE.BoxGeometry(0.35, 11, 2.65));
    const trimMat = this.trackResource(
      new THREE.MeshBasicMaterial({ color: 0x005f73 })
    );

    const boundaryGroup = new THREE.Group();

    for (let i = 0; i < wallCount; i++) {
      const angle = (i / wallCount) * Math.PI * 2;
      const x = Math.cos(angle) * arenaRadius;
      const z = Math.sin(angle) * arenaRadius;
      const y = this.getTerrainHeight(x, z);

      const wall = new THREE.Mesh(monolithGeo, monolithMat);
      wall.position.set(x, y + 5.5 + (i % 3) * 1.2, z);
      wall.lookAt(0, wall.position.y, 0);
      boundaryGroup.add(wall);

      if (i % 3 === 0) {
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.copy(wall.position);
        trim.quaternion.copy(wall.quaternion);
        boundaryGroup.add(trim);
      }
    }

    this.scene.add(boundaryGroup);
  }

  buildCentralMachine() {
    this.machineGroup.position.set(0, 0, 0);

    // Base Dais
    const baseGeo = this.trackResource(new THREE.CylinderGeometry(5.2, 6.4, 1.4, 12));
    const darkMetalMat = this.trackResource(
      new THREE.MeshStandardMaterial({
        color: 0x101a2e,
        roughness: 0.35,
        metalness: 0.8
      })
    );
    const baseMesh = new THREE.Mesh(baseGeo, darkMetalMat);
    baseMesh.position.y = 0.6;
    this.machineGroup.add(baseMesh);

    // Glowing floor ring under the machine
    const floorRingGeo = this.trackResource(new THREE.RingGeometry(5.8, 6.25, 48));
    floorRingGeo.rotateX(-Math.PI / 2);
    this.machineFloorMat = this.trackResource(
      new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        side: THREE.DoubleSide
      })
    );
    const floorRing = new THREE.Mesh(floorRingGeo, this.machineFloorMat);
    floorRing.position.y = 0.12;
    this.machineGroup.add(floorRing);

    // Gimbal Rings
    const ringMat = this.trackResource(
      new THREE.MeshStandardMaterial({
        color: 0x1b2d48,
        emissive: 0x004466,
        emissiveIntensity: 0.6,
        roughness: 0.25,
        metalness: 0.88
      })
    );
    this.machineRingMat = ringMat;

    const ring1Geo = this.trackResource(new THREE.TorusGeometry(5.2, 0.24, 12, 64));
    const ring2Geo = this.trackResource(new THREE.TorusGeometry(4.0, 0.2, 12, 56));
    const ring3Geo = this.trackResource(new THREE.TorusGeometry(2.8, 0.16, 10, 48));

    this.ring1 = new THREE.Mesh(ring1Geo, ringMat);
    this.ring2 = new THREE.Mesh(ring2Geo, ringMat);
    this.ring3 = new THREE.Mesh(ring3Geo, ringMat);

    this.ring1.position.y = 7.5;
    this.ring2.position.y = 7.5;
    this.ring3.position.y = 7.5;

    this.machineGroup.add(this.ring1, this.ring2, this.ring3);

    // Central Luminous Core
    const coreGeo = this.trackResource(new THREE.OctahedronGeometry(1.45, 1));
    this.coreMat = this.trackResource(
      new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00e5ff,
        emissiveIntensity: 1.5,
        roughness: 0.1,
        metalness: 0.2,
        wireframe: false
      })
    );
    this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
    this.coreMesh.position.y = 7.5;
    this.machineGroup.add(this.coreMesh);

    // Wireframe Cage around Core
    const cageGeo = this.trackResource(new THREE.IcosahedronGeometry(1.9, 0));
    const cageMat = this.trackResource(
      new THREE.MeshBasicMaterial({
        color: 0x9d4edd,
        wireframe: true
      })
    );
    this.coreCage = new THREE.Mesh(cageGeo, cageMat);
    this.coreCage.position.y = 7.5;
    this.machineGroup.add(this.coreCage);

    // Orbiting Geometric Satellites
    this.satellitesGroup = new THREE.Group();
    this.satellitesGroup.position.y = 7.5;
    const satGeo = this.trackResource(new THREE.OctahedronGeometry(0.45, 0));
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const sat = new THREE.Mesh(satGeo, this.coreMat);
      sat.position.set(Math.cos(angle) * 6.5, Math.sin(angle * 2) * 1.2, Math.sin(angle) * 6.5);
      this.satellitesGroup.add(sat);
    }
    this.machineGroup.add(this.satellitesGroup);

    this.scene.add(this.machineGroup);

    // Add circular collider for the central machine base
    this.colliders.push({ x: 0, z: 0, radius: 6.2 });
  }

  buildPortal() {
    const portalZ = -39;
    const groundY = this.getTerrainHeight(0, portalZ);
    this.portalGroup.position.set(0, groundY, portalZ);

    const frameMat = this.trackResource(
      new THREE.MeshStandardMaterial({
        color: 0x121d33,
        roughness: 0.4,
        metalness: 0.8
      })
    );

    // Portal Pedestal
    const stepGeo = this.trackResource(new THREE.BoxGeometry(9.5, 0.8, 5.2));
    const stepMesh = new THREE.Mesh(stepGeo, frameMat);
    stepMesh.position.y = 0.4;
    this.portalGroup.add(stepMesh);

    // Left & Right Pillars of the Portal Arch
    const pillarGeo = this.trackResource(new THREE.BoxGeometry(1.2, 8.2, 1.4));
    const leftPillar = new THREE.Mesh(pillarGeo, frameMat);
    leftPillar.position.set(-3.6, 4.2, 0);
    const rightPillar = new THREE.Mesh(pillarGeo, frameMat);
    rightPillar.position.set(3.6, 4.2, 0);
    this.portalGroup.add(leftPillar, rightPillar);

    // Arch Header
    const headerGeo = this.trackResource(new THREE.BoxGeometry(9.2, 1.3, 1.6));
    const headerMesh = new THREE.Mesh(headerGeo, frameMat);
    headerMesh.position.set(0, 8.2, 0);
    this.portalGroup.add(headerMesh);

    // Outer Portal Ring
    const ringGeo = this.trackResource(new THREE.TorusGeometry(3.1, 0.22, 12, 48));
    this.portalRingMat = this.trackResource(
      new THREE.MeshStandardMaterial({
        color: 0x223355,
        emissive: 0x240046,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.8
      })
    );
    this.portalRing = new THREE.Mesh(ringGeo, this.portalRingMat);
    this.portalRing.position.set(0, 4.3, 0);
    this.portalGroup.add(this.portalRing);

    // Inner Energy Horizon Disc
    const discGeo = this.trackResource(new THREE.CircleGeometry(2.9, 40));
    this.portalDiscMat = this.trackResource(
      new THREE.MeshBasicMaterial({
        color: 0x191233,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide
      })
    );
    this.portalDisc = new THREE.Mesh(discGeo, this.portalDiscMat);
    this.portalDisc.position.set(0, 4.3, 0);
    this.portalGroup.add(this.portalDisc);

    // Inner Rotating Lattice
    const latticeGeo = this.trackResource(new THREE.RingGeometry(1.5, 2.7, 6));
    this.portalLatticeMat = this.trackResource(
      new THREE.MeshBasicMaterial({
        color: 0x5a189a,
        wireframe: true,
        transparent: true,
        opacity: 0.35
      })
    );
    this.portalLattice = new THREE.Mesh(latticeGeo, this.portalLatticeMat);
    this.portalLattice.position.set(0, 4.3, 0.06);
    this.portalGroup.add(this.portalLattice);

    this.scene.add(this.portalGroup);

    // Colliders for the portal side pillars (leaving center open to approach)
    this.colliders.push({ x: -3.6, z: portalZ, radius: 1.1 });
    this.colliders.push({ x: 3.6, z: portalZ, radius: 1.1 });
  }

  buildRuinsAndLandmarks() {
    const pillarGeo = this.trackResource(new THREE.CylinderGeometry(0.85, 1.05, 6.5, 8));
    const brokenPillarGeo = this.trackResource(new THREE.CylinderGeometry(0.9, 1.1, 3.4, 8));
    const rockGeo = this.trackResource(new THREE.DodecahedronGeometry(1.5, 0));

    const ruinMat = this.trackResource(
      new THREE.MeshStandardMaterial({
        color: 0x121d30,
        roughness: 0.78,
        metalness: 0.3,
        flatShading: true
      })
    );

    const crystalGeo = this.trackResource(new THREE.OctahedronGeometry(0.45, 0));
    const crystalMat = this.trackResource(
      new THREE.MeshBasicMaterial({
        color: 0x00b4d8
      })
    );

    // Landmark Pillars flanking the starting avenue and fragment shrines
    const pillarCoords = [
      { x: -5.5, z: 26, broken: false },
      { x: 5.5, z: 26, broken: true },
      { x: -5.5, z: 16, broken: true },
      { x: 5.5, z: 16, broken: false },
      { x: -16, z: -12, broken: false },
      { x: 16, z: -12, broken: false },
      { x: -12, z: -26, broken: true },
      { x: 12, z: -26, broken: true },
      // West Shrine Pillars
      { x: -24, z: -4, broken: false },
      { x: -31, z: -11, broken: true },
      // East Shrine Pillars
      { x: 24, z: -2, broken: false },
      { x: 31, z: -9, broken: true },
      // South-East Overlook Pillars
      { x: 14, z: 22, broken: false },
      { x: 22, z: 18, broken: true }
    ];

    pillarCoords.forEach((p, idx) => {
      const y = this.getTerrainHeight(p.x, p.z);
      const mesh = new THREE.Mesh(p.broken ? brokenPillarGeo : pillarGeo, ruinMat);
      const heightOffset = p.broken ? 1.5 : 3.0;
      mesh.position.set(p.x, y + heightOffset, p.z);
      mesh.rotation.y = idx * 0.7;
      this.scene.add(mesh);

      // Glowing orientation crystal atop intact pillars
      if (!p.broken) {
        const cap = new THREE.Mesh(crystalGeo, crystalMat);
        cap.position.set(p.x, y + 6.7, p.z);
        this.scene.add(cap);
      }

      this.colliders.push({ x: p.x, z: p.z, radius: 1.25 });
    });

    // Scattered Ruined Rocks
    const rockCoords = [
      { x: -14, z: 12, s: 1.2 },
      { x: -22, z: 19, s: 1.5 },
      { x: 19, z: 8, s: 1.1 },
      { x: -19, z: -20, s: 1.4 },
      { x: 23, z: -19, s: 1.3 },
      { x: -8, z: 32, s: 0.9 }
    ];

    rockCoords.forEach((r, i) => {
      const y = this.getTerrainHeight(r.x, r.z);
      const rock = new THREE.Mesh(rockGeo, ruinMat);
      rock.scale.setScalar(r.s);
      rock.position.set(r.x, y + r.s * 0.55, r.z);
      rock.rotation.set(i * 0.4, i * 1.1, 0);
      this.scene.add(rock);
      this.colliders.push({ x: r.x, z: r.z, radius: r.s * 1.15 });
    });

    // Suspended Floating Stones & Mechanical Debris (Defying Gravity)
    const floatCoords = [
      { x: -11, y: 8.5, z: 6, s: 0.9 },
      { x: 12, y: 10.2, z: 4, s: 1.1 },
      { x: -15, y: 9.0, z: -14, s: 1.0 },
      { x: 14, y: 11.5, z: -16, s: 1.25 },
      { x: -6, y: 12.0, z: -28, s: 0.85 },
      { x: 7, y: 11.0, z: -27, s: 0.95 },
      { x: -25, y: 7.5, z: -2, s: 0.8 },
      { x: 25, y: 8.2, z: -1, s: 0.85 }
    ];

    floatCoords.forEach((f, idx) => {
      const stone = new THREE.Mesh(rockGeo, ruinMat);
      stone.scale.setScalar(f.s);
      stone.position.set(f.x, f.y, f.z);
      stone.rotation.set(idx, idx * 0.5, 0);
      this.scene.add(stone);
      this.floatingStones.push({
        mesh: stone,
        baseY: f.y,
        phase: idx * 1.3
      });
    });
  }

  buildFragments() {
    const fragmentLocations = [
      {
        id: 'frag_west',
        name: 'WESTERN MONOLITH FRAGMENT',
        x: -28,
        z: -8
      },
      {
        id: 'frag_east',
        name: 'EASTERN CONDUIT FRAGMENT',
        x: 28,
        z: -6
      },
      {
        id: 'frag_south',
        name: 'SOUTHERN OVERLOOK FRAGMENT',
        x: 18,
        z: 20
      }
    ];

    const pedestalGeo = this.trackResource(new THREE.CylinderGeometry(0.9, 1.3, 1.2, 6));
    const pedestalMat = this.trackResource(
      new THREE.MeshStandardMaterial({
        color: 0x122238,
        roughness: 0.4,
        metalness: 0.75
      })
    );

    const crystalGeo = this.trackResource(new THREE.OctahedronGeometry(0.65, 0));
    const ringGeo = this.trackResource(new THREE.TorusGeometry(1.05, 0.06, 8, 32));
    const beaconGeo = this.trackResource(new THREE.CylinderGeometry(0.06, 0.06, 18, 8));

    fragmentLocations.forEach((loc, index) => {
      const groundY = this.getTerrainHeight(loc.x, loc.z);
      const group = new THREE.Group();
      group.position.set(loc.x, groundY, loc.z);

      // Altar Pedestal
      const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestal.position.y = 0.6;
      group.add(pedestal);

      // Unique Materials per fragment so collection transforms only that fragment
      const crystalMat = this.trackResource(
        new THREE.MeshStandardMaterial({
          color: 0x00ffff,
          emissive: 0x00e5ff,
          emissiveIntensity: 1.4,
          roughness: 0.15,
          metalness: 0.3
        })
      );

      const ringMat = this.trackResource(
        new THREE.MeshBasicMaterial({
          color: 0x9d4edd
        })
      );

      const beaconMat = this.trackResource(
        new THREE.MeshBasicMaterial({
          color: 0x00e5ff,
          transparent: true,
          opacity: 0.22
        })
      );

      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.y = 2.3;
      crystal.scale.set(1, 1.45, 1);
      group.add(crystal);

      const haloRing = new THREE.Mesh(ringGeo, ringMat);
      haloRing.position.y = 2.3;
      group.add(haloRing);

      // Subtle vertical light filament so player can spot fragments across the basin
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 10.5;
      group.add(beacon);

      this.scene.add(group);
      this.colliders.push({ x: loc.x, z: loc.z, radius: 1.15 });

      this.fragments.push({
        id: loc.id,
        name: loc.name,
        collected: false,
        group,
        crystal,
        haloRing,
        beacon,
        crystalMat,
        phase: index * 2.1,
        worldPosition: new THREE.Vector3(loc.x, groundY + 2.0, loc.z)
      });
    });
  }

  markFragmentCollected(id) {
    const frag = this.fragments.find((f) => f.id === id);
    if (!frag || frag.collected) return null;

    frag.collected = true;
    // Visibly transform collected shrine into a dormant harmonic node
    frag.crystal.scale.set(0.35, 0.5, 0.35);
    frag.crystalMat.color.setHex(0x2a3b5c);
    frag.crystalMat.emissive.setHex(0x002233);
    frag.crystalMat.emissiveIntensity = 0.3;
    frag.haloRing.visible = false;
    frag.beacon.visible = false;

    return frag.worldPosition.clone();
  }

  setPortalActiveState(active) {
    if (active) {
      this.portalRingMat.color.setHex(0x00e5ff);
      this.portalRingMat.emissive.setHex(0x00b4d8);
      this.portalRingMat.emissiveIntensity = 1.4;

      this.portalDiscMat.color.setHex(0x00e5ff);
      this.portalDiscMat.opacity = 0.78;

      this.portalLatticeMat.color.setHex(0xffffff);
      this.portalLatticeMat.opacity = 0.85;

      this.portalLight.color.setHex(0x00e5ff);
      this.portalLight.intensity = 3.6;

      this.targetMachineSpeed = 2.0;
    } else {
      this.portalRingMat.color.setHex(0x223355);
      this.portalRingMat.emissive.setHex(0x240046);
      this.portalRingMat.emissiveIntensity = 0.5;

      this.portalDiscMat.color.setHex(0x191233);
      this.portalDiscMat.opacity = 0.42;

      this.portalLatticeMat.color.setHex(0x5a189a);
      this.portalLatticeMat.opacity = 0.35;

      this.portalLight.color.setHex(0x7b2cbf);
      this.portalLight.intensity = 1.2;

      this.targetMachineSpeed = 1.0;
    }
  }

  setWorldTransformedState(transformed) {
    this.isTransformed = transformed;
    if (transformed) {
      this.targetMachineSpeed = 4.2;
      this.hemiLight.color.setHex(0x3c1e70);
      this.hemiLight.groundColor.setHex(0x081826);
      this.machineLight.color.setHex(0x9d4edd);
      this.machineLight.intensity = 4.5;
      this.coreMat.emissive.setHex(0xdf73ff);
      this.machineRingMat.emissive.setHex(0x00b4d8);
      this.machi
