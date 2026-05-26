import * as THREE from 'three';
import PhysicsWorld from './PhysicsWorld.js';
import Car from './Car.js';
import Controls from './Controls.js';
import Track from './Track.js';
import Camera from './Camera.js';
import HUD from './HUD.js';

export default class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this._rafHandle = null;
    this._lastTime = 0;
    this._paused = false;
    this._frameCount = 0;

    // State machine: MENU / PLAYING / GAME_OVER
    this.state = 'MENU';
    this.score = 0;
    this._speedMultiplier = 1.0;

    // Mobile detection
    const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

    // --- Renderer ---
    // PERF-01: antialias off on mobile
    // PERF-02: pixelRatio capped at 2
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

    // --- Camera ---
    this.camera = new Camera(window.innerWidth / window.innerHeight);

    // --- Lights --- max 1 DirectionalLight + 1 AmbientLight (CLAUDE.md)
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

    // --- HUD ---
    this.hud = new HUD();

    // --- Wire collision handler ---
    this.car.onCollide((event) => this._handleCarCollision(event));

    // --- DOM refs ---
    this._gameOverEl = document.getElementById('gameOver');
    this._goScoreEl = document.getElementById('goScoreValue');
    this._retryBtn = document.getElementById('retryButton');
    this._menuEl = document.getElementById('menu');
    this._hudEl = document.getElementById('hud');
    this._touchEl = document.getElementById('touchControls');

    // Retry/Menu button → return to menu (D-04)
    if (this._retryBtn) {
      this._retryBtn.addEventListener('pointerup', () => this.returnToMenu());
    }

    // --- Event: visibilitychange --- PITFALLS #5 + #13
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._paused = true;
      } else {
        this._paused = false;
        this._lastTime = performance.now();
      }
    });

    // --- Event: resize ---
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.onResize(window.innerWidth / window.innerHeight);
    });

    // Render one frame so the scene background is visible behind the menu
    this.renderer.render(this.scene, this.camera.instance);
  }

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
   * Return to menu from any game state.
   * Cancels RAF (no loop while on menu), shows menu overlay, hides HUD/touch.
   * Does NOT reset car/track — reset happens at next start().
   */
  returnToMenu() {
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
    this.state = 'MENU';

    // Hide game-over if visible
    this._gameOverEl.classList.add('hidden');
    this._gameOverEl.setAttribute('aria-hidden', 'true');

    // Show menu, hide HUD and touch controls
    this._menuEl.classList.remove('hidden');
    this._menuEl.setAttribute('aria-hidden', 'false');
    this._hudEl.classList.add('hidden');
    this._touchEl.classList.add('hidden');
  }

  /**
   * Start (or restart) gameplay with a given difficulty.
   * @param {{ speedMultiplier?: number, obstacleCount?: number }} difficulty
   */
  start({ speedMultiplier = 1.0, obstacleCount = 8 } = {}) {
    this._speedMultiplier = speedMultiplier;

    // Apply difficulty before reset so pool cap is set before obstacles are cleared
    this.track.setDifficulty(obstacleCount);

    // Reset car, track, score for a fresh run
    this.car.reset();
    this.track.reset();
    this.score = 0;

    this._lastTime = performance.now();
    this.state = 'PLAYING';
    this._rafHandle = requestAnimationFrame((ts) => this._tick(ts));
  }

  /**
   * Main game loop — MANDATORY ORDER (ARCHITECTURE.md §4, PITFALLS #3, #6)
   *
   * Step 1:  Schedule next frame
   * Step 2:  Compute safe delta (cap 0.05s)
   * Step 3:  Pause guard
   * Step 4:  State guard — MENU/GAME_OVER render frozen frame then return
   * Step 5:  Read input
   * Step 6:  Apply forces BEFORE step
   * Step 7:  Track update BEFORE step
   * Step 8:  Step physics
   * Step 9:  Sync mesh AFTER step
   * Step 10: Camera follow AFTER syncMesh
   * Step 11: Render LAST
   */
  _tick(timestamp) {
    // Step 1
    this._rafHandle = requestAnimationFrame((ts) => this._tick(ts));

    // Step 2
    const rawDelta = (timestamp - this._lastTime) / 1000;
    this._lastTime = timestamp;
    const safeDt = Math.min(rawDelta, 0.05);

    // Step 3: pause guard
    if (this._paused) return;

    // Step 4: state guard
    if (this.state === 'MENU' || this.state === 'GAME_OVER') {
      this.renderer.render(this.scene, this.camera.instance);
      return;
    }

    // Step 5
    const intent = this.controls.getIntent();

    // Step 6
    this.car.applyInput(intent);

    // Step 7
    this.track.update(safeDt, this._speedMultiplier, this.car.body.position.z);

    // Step 8
    this.physicsWorld.step(safeDt);

    // Step 9
    this.car.syncMesh();

    // Score
    this.score = this.track.getDistanceTraveled() * 0.5;

    // Step 10
    this.camera.follow(this.car.mesh, safeDt);

    // HUD
    this.hud.update({ score: this.score, speed: this.track.getSpeed() });

    // Step 11
    this.renderer.render(this.scene, this.camera.instance);

    this._frameCount++;
    if (this._frameCount % 60 === 0) {
      const p = this.car.body.position;
      console.log(`[frame ${this._frameCount}] body.position:`, { x: p.x.toFixed(3), y: p.y.toFixed(3), z: p.z.toFixed(3) });
    }
  }

  stop() {
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
    this.controls.destroy();
  }
}
