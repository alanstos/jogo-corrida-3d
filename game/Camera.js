import * as THREE from 'three';

const SHAKE_DURATION  = 0.3;   // seconds (informational — decay governs actual end)
const SHAKE_DECAY     = 15;    // exp decay rate — higher = faster fade
const SHAKE_INTENSITY = 0.35;  // world units at peak

export default class Camera {
  /**
   * Chase camera with exponential (frame-rate-independent) smoothing.
   * Replaces the static camera set up in 01-01.
   *
   * ARCHITECTURE.md "Chase Cam" pattern:
   *   alpha = 1 - Math.exp(-10 * deltaTime)
   *   position.lerp(target, alpha)
   *
   * PITFALLS #15: Never snap camera directly — motion sickness.
   *
   * @param {number} aspect - initial viewport aspect ratio (width / height)
   */
  constructor(aspect) {
    this.instance = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

    // Offset in car LOCAL space: 3 above, 8 behind (-Z is forward so 8 = behind)
    // inicio.md "Câmera": "altura ~3 unidades acima do carro"
    this._offset = new THREE.Vector3(0, 3, 8);

    // Shake state — pre-allocated to avoid per-frame allocation (PITFALL #3)
    this._shakeAmplitude = 0;
    this._shakeElapsed   = 0;
    this._shakeVec       = new THREE.Vector3();  // pre-allocated — NEVER allocate in follow()

    // Initial position matches the offset so the camera doesn't need to travel on frame 0
    this.instance.position.set(0, 3, 8);
  }

  /**
   * Smoothly follow the car mesh using exponential interpolation.
   * MUST be called AFTER car.syncMesh() so the mesh position is current.
   *
   * @param {THREE.Object3D} carMesh - the car's THREE.Group (mesh, not body)
   * @param {number} deltaTime - seconds since last frame (capped by game loop)
   */
  follow(carMesh, deltaTime) {
    // Compute target position in world space from the car's local offset.
    // .clone() is CRITICAL — localToWorld mutates the vector in place.
    const targetPos = carMesh.localToWorld(this._offset.clone());

    // Additive shake offset (FEEL-03) — inserts between targetPos and lerp
    // _shakeVec is pre-allocated in constructor — zero per-frame allocations (PITFALL #3)
    if (this._shakeAmplitude > 0.001) {
      this._shakeElapsed += deltaTime;
      const amp = this._shakeAmplitude * Math.exp(-SHAKE_DECAY * this._shakeElapsed);
      if (amp < 0.001) {
        this._shakeAmplitude = 0;  // shake ended — clean zero, no permanent drift
      } else {
        this._shakeVec.randomDirection().multiplyScalar(amp);  // reuse pre-alloc'd vec
        targetPos.add(this._shakeVec);
      }
    }

    // Frame-rate-independent exponential smoothing (ARCHITECTURE.md Chase Cam pattern)
    // Smoothing constant 10: recovers ~63% of distance each 0.1s — snappy but not instant
    const alpha = 1 - Math.exp(-10 * deltaTime);
    this.instance.position.lerp(targetPos, alpha);

    // Always look at the car center regardless of camera position
    this.instance.lookAt(carMesh.position);
  }

  /**
   * Activate camera shake on collision (FEEL-03).
   * Sets peak amplitude and resets elapsed time — decay is handled in follow().
   * Takes no arguments: SHAKE_INTENSITY constant drives the behavior.
   */
  startShake() {
    this._shakeAmplitude = SHAKE_INTENSITY;
    this._shakeElapsed   = 0;
  }

  /**
   * Update projection matrix on viewport resize.
   * @param {number} aspect - new aspect ratio
   */
  onResize(aspect) {
    this.instance.aspect = aspect;
    this.instance.updateProjectionMatrix();
  }
}
