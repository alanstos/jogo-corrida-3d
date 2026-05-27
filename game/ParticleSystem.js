import * as THREE from 'three';

const MAX_PARTICLES = 20;       // hard ceiling — FEEL-02 requirement
const BURST_COUNT = 8;          // particles activated per burst (leaves headroom for overlapping bursts)
const PARTICLE_LIFETIME = 0.6;  // seconds before a particle expires
const PARTICLE_SPEED = 8;       // initial speed in world units per second
const PARTICLE_COLOR = 0xff8800; // orange — contrasts with cyan car and purple road

export default class ParticleSystem {
  constructor(scene) {
    this._scene = scene;

    // Pre-allocate reusable THREE objects so burst() and update() never call `new`
    this._dummy = new THREE.Object3D();
    this._zeroScale = new THREE.Matrix4().makeScale(0, 0, 0);
    this._tmpPos = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpScale = new THREE.Vector3();

    // Single geometry + MeshBasicMaterial — no PBR, no lighting cost (CLAUDE.md)
    const geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const material = new THREE.MeshBasicMaterial({ color: PARTICLE_COLOR });

    // One InstancedMesh = one draw call for all 20 particles
    this._mesh = new THREE.InstancedMesh(geometry, material, MAX_PARTICLES);
    this._mesh.frustumCulled = false; // particles may travel near camera edge

    // Pre-allocate particle state objects — each entry has a pre-allocated velocity Vector3
    this._particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this._mesh.setMatrixAt(i, this._zeroScale);
      this._particles.push({
        velocity: new THREE.Vector3(),
        lifetime: 0,
        active: false,
      });
    }

    // Flush initial hidden state to GPU
    this._mesh.instanceMatrix.needsUpdate = true;

    scene.add(this._mesh);
  }

  /**
   * Activate up to BURST_COUNT inactive particles at the given world-space position.
   * @param {THREE.Vector3} position — world-space impact point
   */
  burst(position) {
    let activated = 0;

    for (let i = 0; i < MAX_PARTICLES && activated < BURST_COUNT; i++) {
      const p = this._particles[i];
      if (p.active) continue;

      p.active = true;
      p.lifetime = PARTICLE_LIFETIME;

      // Randomize direction in-place — Vector3.randomDirection mutates; no allocation
      p.velocity.randomDirection().multiplyScalar(PARTICLE_SPEED);

      // Position at impact, scale 1
      this._dummy.position.copy(position);
      this._dummy.scale.set(1, 1, 1);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.updateMatrix();
      this._mesh.setMatrixAt(i, this._dummy.matrix);

      activated++;
    }

    // Flush once after the loop — not per particle
    this._mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Advance all active particles by deltaTime.
   * Deactivates expired particles by setting their matrix to zero scale.
   * Only sets instanceMatrix.needsUpdate when at least one particle changed.
   * @param {number} deltaTime — seconds since last tick
   */
  update(deltaTime) {
    let anyChanged = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this._particles[i];
      if (!p.active) continue;

      p.lifetime -= deltaTime;

      if (p.lifetime <= 0) {
        p.active = false;
        this._mesh.setMatrixAt(i, this._zeroScale);
        anyChanged = true;
        continue;
      }

      // Read current matrix back and decompose into pre-allocated scratch objects
      this._mesh.getMatrixAt(i, this._dummy.matrix);
      this._dummy.matrix.decompose(this._tmpPos, this._tmpQuat, this._tmpScale);

      // Advance position by velocity
      this._tmpPos.addScaledVector(p.velocity, deltaTime);

      // Soft gravity — 0.3 factor gives arcade feel without heavy drop
      p.velocity.y -= 9.8 * deltaTime * 0.3;

      // Shrink scale proportional to remaining lifetime
      const s = p.lifetime / PARTICLE_LIFETIME;
      this._tmpScale.set(s, s, s);

      // Recompose and write back
      this._dummy.matrix.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      this._mesh.setMatrixAt(i, this._dummy.matrix);

      anyChanged = true;
    }

    // Only upload to GPU when something actually changed
    if (anyChanged) {
      this._mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /**
   * Deactivate all particles and hide them.
   * Call on game restart so no leftover particles persist into a new run.
   */
  reset() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this._particles[i].active = false;
      this._particles[i].lifetime = 0;
      this._particles[i].velocity.set(0, 0, 0);
      this._mesh.setMatrixAt(i, this._zeroScale);
    }
    this._mesh.instanceMatrix.needsUpdate = true;
  }
}
