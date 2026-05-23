import * as THREE from 'three'
import * as CANNON from 'cannon-es'

const TRACK_WIDTH = 12
const TRACK_LENGTH = 80

export default class Track {
  constructor() {
    this.meshes = []
    this.bodies = []
    this._build()
  }

  _build() {
    // ---- Chão visual ----
    const groundGeo = new THREE.PlaneGeometry(200, 200)
    const groundMat = new THREE.MeshToonMaterial({ color: 0x0d0020 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    this.meshes.push(ground)

    // ---- Superfície da pista ----
    const trackGeo = new THREE.PlaneGeometry(TRACK_WIDTH, TRACK_LENGTH)
    const trackMat = new THREE.MeshToonMaterial({ color: 0x220044 })
    const track = new THREE.Mesh(trackGeo, trackMat)
    track.rotation.x = -Math.PI / 2
    track.position.y = 0.01
    this.meshes.push(track)

    // ---- Linhas laterais ciano ----
    const lineGeo = new THREE.BoxGeometry(0.2, 0.05, TRACK_LENGTH)
    const lineMat = new THREE.MeshToonMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.6 })
    const lineLeft = new THREE.Mesh(lineGeo, lineMat)
    lineLeft.position.set(-TRACK_WIDTH / 2, 0.03, 0)
    this.meshes.push(lineLeft)

    const lineRight = lineLeft.clone()
    lineRight.position.set(TRACK_WIDTH / 2, 0.03, 0)
    this.meshes.push(lineRight)

    // ---- Linhas tracejadas centrais ----
    for (let z = -TRACK_LENGTH / 2; z < TRACK_LENGTH / 2; z += 5) {
      const dashGeo = new THREE.BoxGeometry(0.15, 0.04, 2.5)
      const dashMat = new THREE.MeshToonMaterial({ color: 0xffee00, emissive: 0xffee00, emissiveIntensity: 0.3 })
      const dash = new THREE.Mesh(dashGeo, dashMat)
      dash.position.set(0, 0.03, z)
      this.meshes.push(dash)
    }

    // ---- Muros laterais (visual) ----
    const wallGeo = new THREE.BoxGeometry(0.5, 2.0, TRACK_LENGTH)
    const wallMat = new THREE.MeshToonMaterial({ color: 0x440088 })

    const wallLeft = new THREE.Mesh(wallGeo, wallMat)
    wallLeft.position.set(-TRACK_WIDTH / 2 - 0.25, 1.0, 0)
    this.meshes.push(wallLeft)

    const wallRight = wallLeft.clone()
    wallRight.position.set(TRACK_WIDTH / 2 + 0.25, 1.0, 0)
    this.meshes.push(wallRight)

    // ---- Linha de chegada ----
    const finishGeo = new THREE.PlaneGeometry(TRACK_WIDTH, 1.5)
    const finishMat = new THREE.MeshToonMaterial({ color: 0xffffff })
    const finish = new THREE.Mesh(finishGeo, finishMat)
    finish.rotation.x = -Math.PI / 2
    finish.position.set(0, 0.02, -TRACK_LENGTH / 2 + 4)
    this.meshes.push(finish)

    // ---- Corpos físicos ----
    // Chão
    const groundBody = new CANNON.Body({ mass: 0 })
    groundBody.addShape(new CANNON.Plane())
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this.bodies.push(groundBody)

    // Muro esquerdo
    const wallHalfExtents = new CANNON.Vec3(0.25, 1.0, TRACK_LENGTH / 2)
    const wallBodyLeft = new CANNON.Body({ mass: 0 })
    wallBodyLeft.addShape(new CANNON.Box(wallHalfExtents))
    wallBodyLeft.position.set(-TRACK_WIDTH / 2 - 0.25, 1.0, 0)
    this.bodies.push(wallBodyLeft)

    // Muro direito
    const wallBodyRight = new CANNON.Body({ mass: 0 })
    wallBodyRight.addShape(new CANNON.Box(wallHalfExtents))
    wallBodyRight.position.set(TRACK_WIDTH / 2 + 0.25, 1.0, 0)
    this.bodies.push(wallBodyRight)

    // Muros de fundo (fecham as extremidades)
    const endHalfExtents = new CANNON.Vec3(TRACK_WIDTH / 2 + 1, 2, 0.25)

    const wallBack = new CANNON.Body({ mass: 0 })
    wallBack.addShape(new CANNON.Box(endHalfExtents))
    wallBack.position.set(0, 1.0, -TRACK_LENGTH / 2)
    this.bodies.push(wallBack)

    const wallFront = new CANNON.Body({ mass: 0 })
    wallFront.addShape(new CANNON.Box(endHalfExtents))
    wallFront.position.set(0, 1.0, TRACK_LENGTH / 2)
    this.bodies.push(wallFront)
  }

  addToWorld(world) {
    this.bodies.forEach(b => world.addBody(b))
  }

  getMeshes() {
    return this.meshes
  }

  getStartPosition() {
    return new THREE.Vector3(0, 0.9, TRACK_LENGTH / 2 - 8)
  }
}
