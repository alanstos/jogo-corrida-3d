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
      angularDamping: 0.4,
      allowSleep: false,
    });

    // Spawn above ground so it drops cleanly onto the ground plane
    body.position.set(0, 1.0, 0);

    return body;
  }

  _buildMesh() {
    const group = new THREE.Group();

    // Chassi (corpo principal)
    group.add(new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.8, 4.0),
      new THREE.MeshLambertMaterial({ color: 0x00ffff })
    ));

    // Cabine (teto) — deslocada levemente para a frente (-Z)
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.5, 2.0),
      new THREE.MeshLambertMaterial({ color: 0x0099aa })
    );
    cabin.position.set(0, 0.65, -0.3);
    group.add(cabin);

    // Rodas (4×) — CylinderGeometry eixo-Y, rotacionado para eixo-X via rotation.z = π/2
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222233 });
    for (const [x, y, z] of [
      [-1.05, -0.25, -1.5], [1.05, -0.25, -1.5],
      [-1.05, -0.25,  1.5], [1.05, -0.25,  1.5],
    ]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, y, z);
      group.add(w);
    }

    // Faróis frontais (frente = -Z)
    const hlGeo = new THREE.BoxGeometry(0.35, 0.18, 0.08);
    const hlMat = new THREE.MeshLambertMaterial({ color: 0xffee00, emissive: 0xffee00, emissiveIntensity: 0.7 });
    for (const x of [-0.55, 0.55]) {
      const hl = new THREE.Mesh(hlGeo, hlMat);
      hl.position.set(x, 0.05, -2.02);
      group.add(hl);
    }

    // Lanternas traseiras (traseira = +Z)
    const tlGeo = new THREE.BoxGeometry(0.5, 0.12, 0.08);
    const tlMat = new THREE.MeshLambertMaterial({ color: 0xff2255, emissive: 0xff2255, emissiveIntensity: 0.5 });
    for (const x of [-0.55, 0.55]) {
      const tl = new THREE.Mesh(tlGeo, tlMat);
      tl.position.set(x, 0.05, 2.02);
      group.add(tl);
    }

    return group;
  }

  /**
   * Apply input forces to the physics body.
   * MUST be called BEFORE physicsWorld.step() in the game loop.
   * @param {{ forward: boolean, left: boolean, right: boolean }} intent
   */
  applyInput(intent, turboActive = false) {
    // PITFALLS #1: defensive wakeUp() guard — body may have been manually put to sleep
    this.body.wakeUp();

    // PHYS-01: auto-advance — car always moves forward, boost applied when forward key held
    // -Z is forward in local space (Three.js / Cannon-es convention)
    // PITFALLS #2: applyLocalForce keeps direction correct after any rotation.
    const forceMultiplier = turboActive ? 2.5 : 1.0;
    const baseForce = 2500;
    const boost = intent.forward ? 800 : 0;
    this.body.applyLocalForce(
      new CANNON.Vec3(0, 0, -(baseForce + boost) * forceMultiplier),
      new CANNON.Vec3(0, 0, 0) // center of mass
    );

    // Steering via torque on Y axis
    if (intent.left)  this.body.torque.y += 600;
    if (intent.right) this.body.torque.y -= 600;
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
