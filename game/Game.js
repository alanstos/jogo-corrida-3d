import * as THREE from 'three';
import PhysicsWorld from './PhysicsWorld.js';
import Car from './Car.js';
import Controls from './Controls.js';
import Track from './Track.js';
import Camera from './Camera.js';
import HUD from './HUD.js';
import ParticleSystem from './ParticleSystem.js';
import { vibrate } from './Haptic.js';
import { safeGet, safeSet } from './Storage.js';

const TURBO_DURATION = 2.0;  // seconds of boost
const TURBO_COOLDOWN = 5.0;  // seconds of cooldown before reactivation

export default class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this._rafHandle = null;
    this._lastTime = 0;
    this._paused = false;

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

    // --- Particle system --- must exist before collision handler is wired
    this.particleSystem = new ParticleSystem(this.scene);

    // --- Wire collision handler ---
    this.car.onCollide((event) => this._handleCarCollision(event));

    // --- Highscore ---
    this._highScore = safeGet('melhorPontuacao', 0);

    // --- Turbo state machine ---
    this._turboState = 'idle';   // 'idle' | 'boosting' | 'cooling'
    this._turboTimer = 0;

    // --- DOM refs ---
    this._gameOverEl = document.getElementById('gameOver');
    this._goScoreEl = document.getElementById('goScoreValue');
    this._goRecordBadgeEl = document.getElementById('goRecordBadge');
    this._goHighScoreEl = document.getElementById('goHighScoreValue');
    this._retryBtn = document.getElementById('retryButton');
    this._menuBtn = document.getElementById('menuButton');
    this._menuEl = document.getElementById('menu');
    this._hudEl = document.getElementById('hud');
    this._touchEl = document.getElementById('touchControls');
    this._menuRecordEl = document.getElementById('menuRecord');
    this._menuRecordValueEl = document.getElementById('menuRecordValue');
    this._contextLossEl = document.getElementById('contextLoss');

    // Both game-over buttons → return to menu (D-04)
    if (this._retryBtn) {
      this._retryBtn.addEventListener('pointerup', () => this.returnToMenu());
    }
    if (this._menuBtn) {
      this._menuBtn.addEventListener('pointerup', () => this.returnToMenu());
    }

    // --- WebGL context loss (D-08) ---
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault(); // MANDATORY first statement — enables context recovery
      this._paused = true;
      this._contextLossEl.classList.remove('hidden');
      this._contextLossEl.setAttribute('aria-hidden', 'false');
    }, false);

    this.canvas.addEventListener('webglcontextrestored', () => {
      try {
        if (typeof this.renderer.forceContextRestore === 'function') {
          this.renderer.forceContextRestore();
        }
        this.renderer.render(this.scene, this.camera.instance);
        this._contextLossEl.classList.add('hidden');
        this._contextLossEl.setAttribute('aria-hidden', 'true');
        this._paused = false;
        this._lastTime = performance.now();
      } catch (e) {
        console.error('[RetroRacer] WebGL context restore failed:', e);
      }
    }, false);

    this._contextLossEl.addEventListener('pointerup', () => {
      window.location.reload();
    });

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
      // Derive world-space impact position — extract contact values IMMEDIATELY
      // (event.contact is pooled and reused by cannon-es on the next collision)
      const ri = event.contact?.ri;
      const impactPos = new THREE.Vector3(
        this.car.body.position.x + (ri?.x ?? 0),
        this.car.body.position.y + (ri?.y ?? 0),
        this.car.body.position.z + (ri?.z ?? 0),
      );
      this.particleSystem.burst(impactPos);
      this.camera.startShake();
      vibrate([100]);

      this.state = 'GAME_OVER';

      const finalScore = Math.floor(this.score);
      const isNewRecord = finalScore > this._highScore;

      // Write to localStorage BEFORE showing overlay (research pitfall #9)
      if (isNewRecord) {
        this._highScore = finalScore;
        safeSet('melhorPontuacao', finalScore);
      }

      this._goScoreEl.textContent = String(finalScore);
      this._goHighScoreEl.textContent = String(this._highScore);
      this._goRecordBadgeEl.classList.toggle('hidden', !isNewRecord);

      this._gameOverEl.classList.remove('hidden');
      this._gameOverEl.setAttribute('aria-hidden', 'false');
    }
  }

  /**
   * Return to menu from any game state.
   * Cancels RAF, shows menu overlay with updated record, hides HUD/touch.
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

    // Update menu record display (D-06: show only when record exists)
    this._menuRecordValueEl.textContent = String(this._highScore);
    if (this._highScore > 0) {
      this._menuRecordEl.classList.remove('hidden');
    }

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
    this._turboState = 'idle';
    this._turboTimer = 0;
    this.particleSystem.reset();

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

    // Step 5.5 — Turbo state machine (MUST be after getIntent, before applyInput)
    if (intent.turbo && this._turboState === 'idle' && this.state === 'PLAYING') {
      this._turboState = 'boosting';
      this._turboTimer = TURBO_DURATION;
      vibrate([50]);
    }
    if (this._turboState === 'boosting') {
      this._turboTimer -= safeDt;
      if (this._turboTimer <= 0) { this._turboState = 'cooling'; this._turboTimer = TURBO_COOLDOWN; }
    }
    if (this._turboState === 'cooling') {
      this._turboTimer -= safeDt;
      if (this._turboTimer <= 0) { this._turboState = 'idle'; this._turboTimer = 0; }
    }
    const turboActive = this._turboState === 'boosting';

    // Step 6
    this.car.applyInput(intent, turboActive);

    // Step 7
    this.track.update(safeDt, this._speedMultiplier, this.car.body.position.z);

    // Step 8
    this.physicsWorld.step(safeDt);

    // Step 9
    this.car.syncMesh();

    // Step 9.5 — Particle update (AFTER syncMesh, before render)
    this.particleSystem.update(safeDt);

    // Score
    this.score = this.track.getDistanceTraveled() * 0.5;

    // Step 10
    this.camera.follow(this.car.mesh, safeDt);

    // HUD
    this.hud.update({
      score: this.score,
      speed: this.track.getSpeed(),
      turboState: this._turboState,
      turboCooldownRatio: this._turboState === 'cooling' ? this._turboTimer / TURBO_COOLDOWN : 0,
    });

    // Step 11
    this.renderer.render(this.scene, this.camera.instance);
  }

  stop() {
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
    this.controls.destroy();
  }
}
