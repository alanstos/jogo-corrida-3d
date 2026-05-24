import * as THREE from 'three';
import PhysicsWorld from './PhysicsWorld.js';
import Car from './Car.js';
import Controls from './Controls.js';
import Track from './Track.js';
import Camera from './Camera.js';

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

    // State machine — Phase 1 uses 2-state subset: PLAYING / GAME_OVER
    this.state = 'PLAYING';
    this.score = 0;

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

    // --- Camera --- chase cam with exponential smoothing (Camera.js — T2 of this plan)
    this.camera = new Camera(window.innerWidth / window.innerHeight);

    // --- Lights --- max 1 DirectionalLight + 1 AmbientLight (CLAUDE.md constraint)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambLight);

    // --- Physics, Car, Controls, Track ---
    this.physicsWorld = new PhysicsWorld();
    this.car = new Car(this.scene, this.physicsWorld);
    this.controls = new Controls();
    this.track = new Track(this.scene, this.physicsWorld);

    // --- Wire collision handler ---
    this.car.onCollide((event) => this._handleCarCollision(event));

    // --- Game-Over overlay DOM ---
    this._gameOverEl = document.getElementById('gameOver');
    this._goScoreEl = document.getElementById('goScoreValue');
    this._retryBtn = document.getElementById('retryButton');

    // pointerup for sub-500ms responsiveness on mobile (not click)
    if (this._retryBtn) {
      this._retryBtn.addEventListener('pointerup', () => this.reset());
    }

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
      this.camera.onResize(window.innerWidth / window.innerHeight);
    });
  }

  /**
   * Handle car collision — only obstacle hits trigger GAME_OVER.
   * Wall hits (lateral limits, ground) must NOT trigger game over.
   * @param {object} event - Cannon-es collide event
   */
  _handleCarCollision(event) {
    if (
      event.body &&
      event.body.userData &&
      event.body.userData.tag === 'obstacle'
    ) {
      this.state = 'GAME_OVER';
      this._goScoreEl.textContent = String(Math.floor(this.score));
      this._gameOverEl.classList.remove('hidden');
      this._gameOverEl.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Reset all game state — triggered by Retry button.
   * Must complete under 500ms (GAME-04).
   */
  reset() {
    // 1. Hide overlay
    this._gameOverEl.classList.add('hidden');
    this._gameOverEl.setAttribute('aria-hidden', 'true');

    // 2. Reset car (zeros velocity, repositions, wakes up)
    this.car.reset();

    // 3. Reset track (resets segments, obstacles, elapsed time, scroll speed)
    this.track.reset();

    // 4. Reset score
    this.score = 0;

    // 5. Reset lastTime to avoid delta spike on resume
    this._lastTime = performance.now();

    // 6. Flip state LAST — re-enables physics path on next tick
    this.state = 'PLAYING';
  }

  start() {
    this._lastTime = performance.now();
    this._rafHandle = requestAnimationFrame((ts) => this._tick(ts));
  }

  /**
   * Main game loop — MANDATORY ORDER (ARCHITECTURE.md §4, PITFALLS #3, #6)
   *
   * Step 1:  Schedule next frame
   * Step 2:  Compute safe delta (cap 0.05s — PITFALLS #5)
   * Step 3:  Pause guard
   * Step 4:  State guard — GAME_OVER renders frozen frame then returns
   * Step 5:  Read input
   * Step 6:  Apply forces BEFORE step (PITFALLS #3)
   * Step 7:  Track update BEFORE step (obstacle bodies must be positioned before step)
   * Step 8:  Step physics
   * Step 9:  Sync mesh AFTER step (PITFALLS #6)
   * Step 10: Camera follow AFTER syncMesh (needs current mesh position)
   * Step 11: Render LAST
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

    // Step 4: state guard — GAME_OVER renders last frozen frame then skips all physics/logic
    if (this.state === 'GAME_OVER') {
      this.renderer.render(this.scene, this.camera.instance);
      return;
    }

    // Step 5: read input
    const intent = this.controls.getIntent();

    // Step 6: apply forces BEFORE world.step — MANDATORY ORDER
    this.car.applyInput(intent);

    // Step 7: track update BEFORE world.step — obstacle bodies must be positioned before step
    this.track.update(safeDt, 1.0);

    // Step 8: step physics
    this.physicsWorld.step(safeDt);

    // Step 9: sync mesh AFTER step — PITFALLS #6
    this.car.syncMesh();

    // Accumulate score from distance (GAME-02 — score scales with distance)
    this.score = this.track.getDistanceTraveled() * 0.5;

    // Step 10: camera follow AFTER syncMesh — needs current mesh world position
    this.camera.follow(this.car.mesh, safeDt);

    // Step 11: render LAST
    this.renderer.render(this.scene, this.camera.instance);

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
