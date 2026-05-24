import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export default class Car {
  /**
   * @param {THREE.Scene} scene
   * @param {import('./PhysicsWorld.js').default} physicsWorld
   */
  constructor(scene, physicsWorld) {
    this._scene = scene;
    this._physicsWorld = physicsWorld;
    this._onCollide = null; // set via onCollide()

    this.body = this._buildBody();
    this.mesh = this._buildMesh();

    // Add physics body to world
    physicsWorld.addBody(this.body);

    // Add mesh to scene
    scene.add(this.mesh);

    // Wire collision listener — delegates to external handler (Game) so Car doesn't import Game
    this.body.addEventListener('collide', (event) => {
      if (this._onCollide) this._onCollide(event);
    });

    // Diagnostic — verify mass, type, allowSleep before any input is wired
    // PITFALLS #4: mass=0 -> static, type=2. Expected: mass=150, type=1 (DYNAMIC), allowSleep=false
    console.log('Car init:', {
      mass: this.body.mass,
      type: this.body.type,
      allowSleep: this.body.allowSleep,
    });
  }

  /**
   * Register a collision callback. Game wires its handler here to avoid circular imports.
   * @param {function} callback
   */
  onCollide(callback) {
    this._onCollide = callback;
  }

  /**
   * Reset car to spawn position with zeroed velocity.
   * Called by Game.reset() on Retry. Defensive wakeUp() ensures next applyInput works.
   * PITFALLS #1: wakeUp() required — body near zero-velocity may be sleeping on next frame.
   */
  reset() {
    // Re-position to spawn
    this.body.position.set(0, 1.0, 0);

    // Zero all motion
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.force.set(0, 0, 0);
    this.body.torque.set(0, 0, 0);

    // Reset rotation to identity (upright)
    this.body.quaternion.set(0, 0, 0, 1);

    // Defensive wake-up — PITFALLS #1
    this.body.wakeUp();

    // Sync mesh immediately so it appears at spawn before next tick
    this.syncMesh();
  }

  _buildBody() {
    // PITFALLS #4: mass MUST be > 0. mass:0 = static body, forces have no effect.
    // PITFALLS #1: allowSleep MUST be false — sleeping bodies ignore applyLocalForce silently.
    const body = new CANNON.Body({
      mass: 150,
      shape: new CANNON.Box(new CANNON.Vec3(0.9, 0.4, 2.0)),
      linearDamping: 0.3,
      angularDamping: 0.9,
      allowSleep: false,
    });

    // Spawn above ground so it drops cleanly onto the ground plane
    body.position.set(0, 1.0, 0);

    return body;
  }

  _buildMesh() {
    // Cyan neon car mesh — MeshLambertMaterial (no PBR, PERF-03)
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(1.8, 0.8, 4.0);
    const mat = new THREE.MeshLambertMaterial({ color: 0x00ffff });
    const bodyMesh = new THREE.Mesh(geo, mat);
    group.add(bodyMesh);
    return group;
  }

  /**
   * Apply input forces to the physics body.
   * MUST be called BEFORE physicsWorld.step() in the game loop.
   * @param {{ forward: boolean, left: boolean, right: boolean }} intent
   */
  applyInput(intent) {
    // PITFALLS #1: defensive wakeUp() guard — body may have been manually put to sleep
    this.body.wakeUp();

    if (intent.forward) {
      // PITFALLS #2: applyLocalForce keeps direction correct after any rotation.
      // applyForce (world space) would break propulsion after rotation.
      // -Z is forward in local space (Three.js / Cannon-es convention)
      this.body.applyLocalForce(
        new CANNON.Vec3(0, 0, -2500),
        new CANNON.Vec3(0, 0, 0) // center of mass
      );
    }

    // Steering via torque on Y axis
    if (intent.left)  this.body.torque.y += 400;
    if (intent.right) this.body.torque.y -= 400;
  }

  /**
   * Copy physics body transform to Three.js mesh.
   * MUST be called AFTER physicsWorld.step() in the game loop — PITFALLS #6.
   */
  syncMesh() {
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
  }
}
