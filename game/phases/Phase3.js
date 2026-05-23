import * as THREE from 'three'
import * as CANNON from 'cannon-es'

const TRACK_WIDTH = 10
const SEGMENT_LENGTH = 25
const NUM_SEGMENTS = 12
const INITIAL_SPEED = 18
const SPEED_INCREMENT = 0.4
const SPEED_INTERVAL = 5000 // ms

export default class Phase3 {
  constructor(scene, world) {
    this.scene = scene
    this.world = world
    this.disposables = []

    this.score = 0
    this.startTime = null
    this.elapsedMs = 0
    this.currentSpeed = INITIAL_SPEED
    this._lastSpeedUp = 0

    this._segments = []
    this._enemyCars = []
    this._stars = null
    this._running = false

    this._build()
  }

  _build() {
    // Fundo espacial
    this.scene.background = new THREE.Color(0x000011)
    this.scene.fog = new THREE.Fog(0x000011, 60, 130)

    // ---- Campo de estrelas ----
    const starGeo = new THREE.BufferGeometry()
    const starPositions = new Float32Array(600 * 3)
    for (let i = 0; i < 600 * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 300
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.4 })
    this._stars = new THREE.Points(starGeo, starMat)
    this.scene.add(this._stars)
    this.disposables.push({ geo: starGeo, mat: starMat, mesh: this._stars })

    // Chão físico global
    const groundBody = new CANNON.Body({ mass: 0 })
    groundBody.addShape(new CANNON.Plane())
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this._addBody(groundBody)

    // ---- Pool de segmentos de pista ----
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const z = -i * SEGMENT_LENGTH
      const seg = this._createSegment(z)
      this._segments.push(seg)
    }

    // ---- Pool de carros inimigos ----
    for (let i = 0; i < 5; i++) {
      const enemy = this._createEnemy()
      enemy.mesh.position.set(
        (Math.random() - 0.5) * TRACK_WIDTH * 0.7,
        0.9,
        -(i + 3) * SEGMENT_LENGTH * 0.4
      )
      enemy.body.position.copy(enemy.mesh.position)
      this._enemyCars.push(enemy)
    }
  }

  _createSegment(z) {
    const geo = new THREE.BoxGeometry(TRACK_WIDTH, 0.1, SEGMENT_LENGTH)
    const mat = new THREE.MeshToonMaterial({ color: 0x110022 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(0, 0, z)
    this.scene.add(mesh)

    // Linhas laterais
    const lineGeo = new THREE.BoxGeometry(0.2, 0.08, SEGMENT_LENGTH)
    const lineMat = new THREE.MeshToonMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.6 })
    const lineL = new THREE.Mesh(lineGeo, lineMat)
    lineL.position.set(-TRACK_WIDTH / 2, 0.06, z)
    this.scene.add(lineL)
    const lineR = lineL.clone()
    lineR.position.set(TRACK_WIDTH / 2, 0.06, z)
    this.scene.add(lineR)

    // Corpo físico
    const body = new CANNON.Body({ mass: 0 })
    body.addShape(new CANNON.Box(new CANNON.Vec3(TRACK_WIDTH / 2, 0.05, SEGMENT_LENGTH / 2)))
    body.position.set(0, 0, z)
    this.world.addBody(body)

    const item = { mesh, lineL, lineR, body, geo, mat, lineGeo, lineMat }
    this.disposables.push({ geo, mat, mesh })
    this.disposables.push({ geo: lineGeo, mat: lineMat, mesh: lineL })
    this.disposables.push({ geo: lineGeo, mat: lineMat, mesh: lineR })
    this.disposables.push({ body })
    return item
  }

  _createEnemy() {
    const colors = [0x00aa44, 0x0044ff, 0xaa4400, 0x4400aa]
    const color = colors[Math.floor(Math.random() * colors.length)]
    const geo = new THREE.BoxGeometry(1.4, 0.7, 3.0)
    const mat = new THREE.MeshToonMaterial({ color })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(0, 0.9, -30)
    this.scene.add(mesh)

    const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC })
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.7, 0.35, 1.5)))
    body.position.set(0, 0.9, -30)
    this.world.addBody(body)

    this.disposables.push({ geo, mat, mesh, body })
    return { mesh, body, lane: 0 }
  }

  _addBody(body) {
    this.world.addBody(body)
    this.disposables.push({ body })
  }

  start() {
    this.startTime = Date.now()
    this.score = 0
    this.elapsedMs = 0
    this.currentSpeed = INITIAL_SPEED
    this._lastSpeedUp = 0
    this._running = true
  }

  update(carPosition, carSpeed, delta) {
    if (!this.startTime || !this._running) return null

    this.elapsedMs = Date.now() - this.startTime
    this.score += this.currentSpeed * delta * 3

    // Aumentar velocidade periodicamente
    if (this.elapsedMs - this._lastSpeedUp > SPEED_INTERVAL) {
      this.currentSpeed += SPEED_INCREMENT
      this._lastSpeedUp = this.elapsedMs
    }

    // Mover tudo para frente (ilusão de movimento)
    const moveZ = this.currentSpeed * delta

    // Reciclar segmentos de pista
    this._segments.forEach(seg => {
      seg.mesh.position.z += moveZ
      seg.lineL.position.z += moveZ
      seg.lineR.position.z += moveZ
      seg.body.position.z += moveZ

      // Quando segmento passa o carro, reposicionar na frente
      if (seg.mesh.position.z > carPosition.z + SEGMENT_LENGTH) {
        const frontZ = Math.min(...this._segments.map(s => s.mesh.position.z)) - SEGMENT_LENGTH
        seg.mesh.position.z = frontZ
        seg.lineL.position.z = frontZ
        seg.lineR.position.z = frontZ
        seg.body.position.z = frontZ
      }
    })

    // Mover estrelas lentamente
    if (this._stars) {
      this._stars.position.z += moveZ * 0.05
      if (this._stars.position.z > 50) this._stars.position.z -= 50
    }

    // Mover inimigos
    this._enemyCars.forEach(enemy => {
      enemy.mesh.position.z += moveZ * 0.3 // inimigos mais lentos que a pista
      enemy.body.position.set(enemy.mesh.position.x, enemy.mesh.position.y, enemy.mesh.position.z)

      // Reposicionar inimigo quando passa o carro
      if (enemy.mesh.position.z > carPosition.z + 5) {
        enemy.mesh.position.z = carPosition.z - (20 + Math.random() * 30)
        enemy.mesh.position.x = (Math.random() - 0.5) * TRACK_WIDTH * 0.7
        enemy.body.position.set(enemy.mesh.position.x, enemy.mesh.position.y, enemy.mesh.position.z)
      }

      // Game over: colisão com inimigo
      const dx = Math.abs(enemy.mesh.position.x - carPosition.x)
      const dz = Math.abs(enemy.mesh.position.z - carPosition.z)
      if (dx < 1.5 && dz < 2.5) {
        this._running = false
        return { type: 'gameover', ...this._buildResult(0) }
      }
    })

    // Game over: saída da pista
    if (Math.abs(carPosition.x) > TRACK_WIDTH / 2 + 0.5) {
      this._running = false
      return { type: 'gameover', ...this._buildResult(0) }
    }

    return {
      type: 'running',
      currentLap: Math.floor(this.elapsedMs / 10000),
      totalLaps: '∞',
      score: this.score,
      timeMs: this.elapsedMs,
    }
  }

  _buildResult(stars = 1) {
    const ms = this.elapsedMs
    const min = Math.floor(ms / 60000)
    const sec = Math.floor((ms % 60000) / 1000)
    const cs = Math.floor((ms % 1000) / 10)
    return {
      score: Math.round(this.score),
      time: `${min}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`,
      stars: ms > 30000 ? 2 : ms > 60000 ? 3 : 1,
    }
  }

  dispose() {
    this.scene.background = new THREE.Color(0x1a0033)
    this.scene.fog = new THREE.Fog(0x1a0033, 60, 120)

    this.disposables.forEach(({ geo, mat, mesh, body }) => {
      if (mesh) this.scene.remove(mesh)
      if (geo) geo.dispose()
      if (mat) mat.dispose()
      if (body) this.world.removeBody(body)
    })
    this.disposables = []
    this._segments = []
    this._enemyCars = []
  }
}
