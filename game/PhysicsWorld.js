import * as CANNON from 'cannon-es';

export default class PhysicsWorld {
  constructor() {
    // ARCHITECTURE.md §1 World Setup — gravity 2x real-world for arcade snap
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -20, 0),
    });

    // O(n log n) broadphase vs naive O(n²)
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);

    // Global sleep OK — overridden per-body for the car (car uses allowSleep: false)
    this.world.allowSleep = true;

    // Friction=0 on default contact so applyLocalForce actually moves the car.
    // High default friction (0.3) creates a ~3000N resistive force that cancels
    // the 2500N drive force entirely — car stays visually stationary.
    this.world.defaultContactMaterial.friction = 0;
    this.world.defaultContactMaterial.restitution = 0.0;

    this._addGroundPlane();
  }

  _addGroundPlane() {
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(new CANNON.Plane());
    // MANDATORY: rotate so normal faces +Y (upward) — PITFALLS #18
    // Without this CANNON.Plane faces +Z and car falls through
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);
  }

  addBody(body) {
    this.world.addBody(body);
  }

  removeBody(body) {
    this.world.removeBody(body);
  }

  step(deltaTime) {
    const fixedStep = 1 / 60;
    const maxSubSteps = 3;
    // COMMON BUG: passing fixedStep as both args -> simulation never catches up
    // Second arg is actual elapsed time — Cannon-es computes substep count internally
    this.world.step(fixedStep, deltaTime, maxSubSteps);
  }
}
