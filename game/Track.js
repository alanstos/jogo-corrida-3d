import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Pool constants — never change these after init (pool discipline)
const SEGMENT_COUNT = 12;
const SEGMENT_LENGTH = 20;
const TRACK_WIDTH = 10;
const OBSTACLE_COUNT = 8;

export default class Track {
  /**
   * @param {THREE.Scene} scene
   * @param {import('./PhysicsWorld.js').default} physicsWorld
   */
  constructor(scene, physicsWorld) {
    this._scene = scene;
    this._physicsWorld = physicsWorld;

    this._elapsedTime = 0;
    this._scrollSpeed = 20; // units/sec — ramps in update()
    this._spawnTimer = 0;
    this._distanceTraveled = 0;

    this._segments = [];
    this._obstacles = [];

    this._buildRoadSegments();
    this._buildLateralEdges();
    this._buildObstaclePool();
    this._buildLateralWalls();
  }

  // ---------------------------------------------------------------
  // Construction (one-time — pool built here, NEVER in update)
  // ---------------------------------------------------------------

  _buildRoadSegments() {
    const geo = new THREE.BoxGeometry(TRACK_WIDTH, 0.1, SEGMENT_LENGTH);
    const mat = new THREE.MeshLambertMaterial({ color: 0x2a0055 });

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      // Position segments in a contiguous line down the -Z axis
      mesh.position.set(0, 0, -i * SEGMENT_LENGTH);
      this._scene.add(mesh);
      this._segments.push(mesh);
    }
  }

  _buildLateralEdges() {
    // Neon cyan edge lines — purely visual, static (TRACK-03)
    const totalLength = SEGMENT_COUNT * SEGMENT_LENGTH;
    const edgeGeo = new THREE.BoxGeometry(0.3, 0.5, totalLength);
    const edgeMat = new THREE.MeshLambertMaterial({
      color: 0x00ffff,
      emissive: new THREE.Color(0x00ffff),
      emissiveIntensity: 0.4,
    });

    const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
    leftEdge.position.set(-5, 0.25, -totalLength / 2);
    this._scene.add(leftEdge);

    const rightEdge = new THREE.Mesh(edgeGeo, edgeMat);
    rightEdge.position.set(5, 0.25, -totalLength / 2);
    this._scene.add(rightEdge);
  }

  _buildObstaclePool() {
    const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffee00 });

    for (let i = 0; i < OBSTACLE_COUNT; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this._scene.add(mesh);

      const body = new CANNON.Body({
        mass: 0, // static — manually repositioned each tick
        shape: new CANNON.Box(new CANNON.Vec3(0.75, 0.75, 0.75)),
      });
      // Tag for collision identification in Game.js
      body.userData = { tag: 'obstacle' };
      // Start off-screen below ground
      body.position.set(0, -100, 0);
      this._physicsWorld.addBody(body);

      this._obstacles.push({ mesh, body, active: false });
    }
  }

  _buildLateralWalls() {
    // Invisible CANNON walls — keep car on road (PHYS constraint)
    // Wall half-extents: 0.5 wide, 2 tall, 1000 deep (covers entire track length)
    const wallShape = new CANNON.Box(new CANNON.Vec3(0.5, 2, 1000));

    const leftWall = new CANNON.Body({ mass: 0 });
    leftWall.addShape(wallShape);
    leftWall.position.set(-5.5, 1, 0);
    this._physicsWorld.addBody(leftWall);

    const rightWall = new CANNON.Body({ mass: 0 });
    rightWall.addShape(wallShape);
    rightWall.position.set(5.5, 1, 0);
    this._physicsWorld.addBody(rightWall);
  }

  // ---------------------------------------------------------------
  // Per-frame update — MUST be called BEFORE physicsWorld.step()
  // ---------------------------------------------------------------

  /**
   * @param {number} deltaTime      - seconds since last frame
   * @param {number} speedMultiplier - 1.0 default; hook for difficulty selector (Phase 2)
   * @param {number} carZ           - car's current world Z position for position-relative recycling
   */
  update(deltaTime, speedMultiplier = 1.0, carZ = 0) {
    // Progressive speed ramp (TRACK-04): starts at 20, ramps at 0.5/s, capped at +40 = 60 max
    this._elapsedTime += deltaTime;
    this._scrollSpeed = (20 + Math.min(this._elapsedTime * 0.5, 40)) * speedMultiplier;

    const scrollDelta = this._scrollSpeed * deltaTime;
    this._distanceTraveled += scrollDelta;

    // --- Scroll road segments --- (TRACK-01 — pooled recycling, no allocation)
    for (let i = 0; i < this._segments.length; i++) {
      this._segments[i].position.z += scrollDelta;
      // Recycle relative to car — segment has passed behind the car
      if (this._segments[i].position.z > carZ + SEGMENT_LENGTH) {
        this._segments[i].position.z -= SEGMENT_COUNT * SEGMENT_LENGTH;
      }
    }

    // --- Scroll active obstacles ---
    for (let i = 0; i < this._obstacles.length; i++) {
      const obs = this._obstacles[i];
      if (!obs.active) continue;

      obs.body.position.z += scrollDelta;
      obs.mesh.position.copy(obs.body.position);

      // Deactivate relative to car — obstacle has passed behind the car
      if (obs.body.position.z > carZ + SEGMENT_LENGTH) {
        this._deactivateObstacle(obs);
      }
    }

    // --- Spawn logic (TRACK-02 — random obstacles) ---
    const spawnInterval = 1.5 / speedMultiplier;
    this._spawnTimer += deltaTime;
    if (this._spawnTimer >= spawnInterval) {
      this._spawnTimer = 0;
      this._trySpawnObstacle(carZ);
    }
  }

  _trySpawnObstacle(carZ = 0) {
    // Find an inactive obstacle from the pool
    const obs = this._obstacles.find((o) => !o.active);
    if (!obs) return; // pool exhausted — skip this spawn

    // Three lanes: -3, 0, +3 on X axis
    const lanes = [-3, 0, 3];
    const laneX = lanes[Math.floor(Math.random() * lanes.length)];

    // Spawn at far end of track ahead of the car
    const spawnZ = carZ - (SEGMENT_COUNT * SEGMENT_LENGTH) + 10;

    obs.body.position.set(laneX, 0.75, spawnZ);
    obs.body.velocity.set(0, 0, 0);
    obs.body.angularVelocity.set(0, 0, 0);
    obs.mesh.position.set(laneX, 0.75, spawnZ);
    obs.mesh.visible = true;
    obs.active = true;
  }

  _deactivateObstacle(obs) {
    obs.active = false;
    obs.body.position.set(0, -100, 0);
    obs.mesh.visible = false;
  }

  // ---------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------

  /**
   * Full reset — called by Game.reset() on Retry.
   */
  reset() {
    this._elapsedTime = 0;
    this._scrollSpeed = 20;
    this._spawnTimer = 0;
    this._distanceTraveled = 0;

    // Reset segment positions to initial layout
    for (let i = 0; i < this._segments.length; i++) {
      this._segments[i].position.z = -i * SEGMENT_LENGTH;
    }

    // Deactivate all obstacles
    for (let i = 0; i < this._obstacles.length; i++) {
      this._deactivateObstacle(this._obstacles[i]);
    }
  }

  /**
   * Returns current scroll speed as integer (used by HUD).
   * @returns {number}
   */
  getSpeed() { return Math.floor(this._scrollSpeed); }

  /**
   * Returns cumulative distance traveled (used for score calculation in Game).
   * @returns {number}
   */
  getDistanceTraveled() {
    return this._distanceTraveled;
  }
}
