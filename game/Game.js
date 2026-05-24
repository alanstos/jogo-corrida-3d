import * as THREE from 'three';
import PhysicsWorld from './PhysicsWorld.js';
import Car from './Car.js';
import Controls from './Controls.js';

export default class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this._rafHandle = null;
    this._lastTime = 0;
    this._paused = false;
    this._frameCount = 0;

    // Mobile detection — same pattern as STACK.md
    const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

    // --- Renderer ---
    // PERF-01: antialias off on mobile (single biggest perf win)
    // PERF-02: pixelRatio capped at 2 (ratio 3.0 = 9x more fragments)
    // PERF-04: shadowMap unconditionally off
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !isMobile,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = false;

    // --- Scene ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a0033);

    // --- Camera --- (static top-behind view for walking skeleton)
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Position: behind and above — static camera for this plan (chase cam in 01-02)
    this.camera.position.set(0, 5, 12);
    this.camera.lookAt(0, 0, 0);

    // --- Lights --- max 1 DirectionalLight + 1 AmbientLight (CLAUDE.md constraint)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambLight);

    // --- Physics, Car, Controls ---
    this.physicsWorld = new PhysicsWorld();
    this.car = new Car(this.scene, this.physicsWorld);
    this.controls = new Controls();

    // --- Event: visibilitychange --- PITFALLS #5 + #13
    // Pause loop on tab hide — prevents delta explosion on restore
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._paused = true;
      } else {
        this._paused = false;
        // Reset lastTime so first tick after restore gets delta=0, not 500ms+ spike
        this._lastTime = performance.now();
      }
    });

    // --- Event: resize ---
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  start() {
    this._lastTime = performance.now();
    this._rafHandle = requestAnimationFrame((ts) => this._tick(ts));
  }

  /**
   * Main game loop — MANDATORY ORDER (ARCHITECTURE.md §4, PITFALLS #3, #6)
   *
   * Step 1: Schedule next frame
   * Step 2: Compute safe delta (cap 0.05s — PITFALLS #5)
   * Step 3: Pause guard
   * Step 4: Read input
   * Step 5: Apply forces BEFORE step (PITFALLS #3)
   * Step 6: Step physics
   * Step 7: Sync mesh AFTER step (PITFALLS #6)
   * Step 8: Render LAST
   */
  _tick(timestamp) {
    // Step 1: schedule next frame at top so any early return doesn't kill the loop
    this._rafHandle = requestAnimationFrame((ts) => this._tick(ts));

    // Step 2: safe delta — cap at 0.05s prevents spiral-of-death and NaN on tab restore
    const rawDelta = (timestamp - this._lastTime) / 1000;
    this._lastTime = timestamp;
    const safeDt = Math.min(rawDelta, 0.05); // PITFALLS #5

    // Step 3: pause guard — skip physics but let RAF keep running so we can unpause
    if (this._paused) return;

    // Step 4: read input
    const intent = this.controls.getIntent();

    // Step 5: apply forces BEFORE world.step — MANDATORY ORDER
    this.car.applyInput(intent);

    // Step 6: step physics
    this.physicsWorld.step(safeDt);

    // Step 7: sync mesh AFTER step — PITFALLS #6
    this.car.syncMesh();

    // Step 8: render LAST
    this.renderer.render(this.scene, this.camera);

    // Diagnostic: log position every 60 frames so developer can see y stabilize above 0
    this._frameCount++;
    if (this._frameCount % 60 === 0) {
      const p = this.car.body.position;
      console.log(`[frame ${this._frameCount}] body.position:`, { x: p.x.toFixed(3), y: p.y.toFixed(3), z: p.z.toFixed(3) });
    }
  }

  stop() {
    // PITFALLS #16: always cancel RAF on teardown to prevent double-loop
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
    this.controls.destroy();
  }
}
