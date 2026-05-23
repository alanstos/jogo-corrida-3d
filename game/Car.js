import * as THREE from 'three'
import * as CANNON from 'cannon-es'

const CAR_MAX_SPEED = 30
const STEER_FORCE = 18
const FORWARD_FORCE = 5000

export default class Car {
  constructor() {
    this._wheels = []
    this._steerAngle = 0
    this.speed = 0
    this.mesh = this._buildMesh()
    this.body = this._buildBody()
  }

  _buildMesh() {
    const group = new THREE.Group()

    // Carroceria principal (~120 tris)
    const bodyGeo = new THREE.BoxGeometry(1.6, 0.7, 3.2)
    const bodyMat = new THREE.MeshToonMaterial({ color: 0xff2255 })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 0.55
    group.add(body)

    // Cabine (teto)
    const cabineGeo = new THREE.BoxGeometry(1.2, 0.55, 1.8)
    const cabineMat = new THREE.MeshToonMaterial({ color: 0xcc1144 })
    const cabine = new THREE.Mesh(cabineGeo, cabineMat)
    cabine.position.set(0, 1.15, -0.1)
    group.add(cabine)

    // Rodas (4x ~80 tris = ~320 tris total)
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.35, 10)
    const wheelMat = new THREE.MeshToonMaterial({ color: 0x111111 })
    const wheelPositions = [
      [-0.92, 0.38, 1.1],
      [0.92, 0.38, 1.1],
      [-0.92, 0.38, -1.1],
      [0.92, 0.38, -1.1],
    ]
    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(x, y, z)
      group.add(wheel)
      this._wheels.push(wheel)
    })

    // Detalhe neon (para-choque ciano)
    const bumperGeo = new THREE.BoxGeometry(1.5, 0.12, 0.12)
    const bumperMat = new THREE.MeshToonMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.8 })
    const bumper = new THREE.Mesh(bumperGeo, bumperMat)
    bumper.position.set(0, 0.55, 1.65)
    group.add(bumper)

    return group
  }

  _buildBody() {
    const body = new CANNON.Body({
      mass: 500,
      shape: new CANNON.Box(new CANNON.Vec3(0.8, 0.5, 1.6)),
      linearDamping: 0.3,
      angularDamping: 0.9,
    })
    body.position.set(0, 0.9, 0)
    body.allowSleep = false // carro nunca dorme — evita freeze da física
    return body
  }

  addToWorld(world) {
    world.addBody(this.body)
  }

  steer(left, right, turbo, delta) {
    // Nota: this.speed é atualizado externamente em Game.update() APÓS o fixedStep,
    // para refletir a velocidade real após a integração física deste frame.
    const speed = this.speed

    if (turbo) {
      this.body.applyLocalForce(
        new CANNON.Vec3(0, 0, -FORWARD_FORCE),
        new CANNON.Vec3(0, 0, 0)
      )
    }

    // Steering (torque em Y) — força proporcional à velocidade
    const steerStrength = Math.min(speed / CAR_MAX_SPEED, 1) * STEER_FORCE
    if (left) this.body.angularVelocity.y = Math.min(this.body.angularVelocity.y + steerStrength * delta * 3, 1.5)
    if (right) this.body.angularVelocity.y = Math.max(this.body.angularVelocity.y - steerStrength * delta * 3, -1.5)

    // Limitar velocidade máxima
    if (speed > CAR_MAX_SPEED) {
      const ratio = CAR_MAX_SPEED / speed
      this.body.velocity.x *= ratio
      this.body.velocity.z *= ratio
    }

    // Animação das rodas
    const wheelRot = speed * delta * 0.8
    this._wheels.forEach(w => { w.rotation.x += wheelRot })
  }

  syncMesh() {
    this.mesh.position.copy(this.body.position)
    this.mesh.quaternion.copy(this.body.quaternion)
  }

  getMesh() {
    return this.mesh
  }

  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z)
    this.body.position.set(x, y, z)
    this.body.velocity.set(0, 0, 0)
    this.body.angularVelocity.set(0, 0, 0)
    this.speed = 0
    this.body.wakeUp() // garantir que o corpo está ativo após reposicionamento
  }

  getPosition() {
    return this.mesh.position
  }
}
