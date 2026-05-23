import * as THREE from 'three'
import * as CANNON from 'cannon-es'

const TRACK_WIDTH = 9
const TOTAL_LAPS = 5

// Tempo alvo para estrelas
const TIME_3_STARS = 90000
const TIME_2_STARS = 180000

// Circuito oval
const CIRCUIT_POINTS = [
  [0, 0, 28],
  [18, 0, 20],
  [26, 0, 5],
  [24, 0, -12],
  [14, 0, -24],
  [0, 0, -30],
  [-14, 0, -24],
  [-24, 0, -12],
  [-26, 0, 5],
  [-18, 0, 20],
]

export default class Phase2 {
  constructor(scene, world) {
    this.scene = scene
    this.world = world
    this.disposables = []

    this.currentLap = 0
    this.totalLaps = TOTAL_LAPS
    this.score = 0
    this.startTime = null
    this.elapsedMs = 0

    this._finishTriggered = false
    this._lastCarSide = null
    this._movingObstacles = []

    this._build()
  }

  _build() {
    // Fundo laranja neon
    this.scene.background = new THREE.Color(0x331100)
    this.scene.fog = new THREE.Fog(0x331100, 50, 110)

    // ---- Chão ----
    const groundGeo = new THREE.PlaneGeometry(200, 200)
    const groundMat = new THREE.MeshToonMaterial({ color: 0x110022 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    this._addToScene(ground, groundGeo, groundMat)

    const groundBody = new CANNON.Body({ mass: 0 })
    groundBody.addShape(new CANNON.Plane())
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this._addBody(groundBody)

    // ---- Segmentos de pista ----
    const pts = CIRCUIT_POINTS.map(([x, , z]) => new THREE.Vector3(x, 0, z))
    pts.push(pts[0].clone())

    for (let i = 0; i < pts.length - 1; i++) {
      const from = pts[i]
      const to = pts[i + 1]
      const mid = from.clone().add(to).multiplyScalar(0.5)
      const len = from.distanceTo(to)
      const angle = Math.atan2(to.x - from.x, to.z - from.z)

      const segGeo = new THREE.BoxGeometry(TRACK_WIDTH, 0.05, len + 0.5)
      const segMat = new THREE.MeshToonMaterial({ color: 0x220033 })
      const seg = new THREE.Mesh(segGeo, segMat)
      seg.position.set(mid.x, 0.02, mid.z)
      seg.rotation.y = angle
      this._addToScene(seg, segGeo, segMat)

      const body = new CANNON.Body({ mass: 0 })
      body.addShape(new CANNON.Box(new CANNON.Vec3(TRACK_WIDTH / 2, 0.05, len / 2 + 0.25)))
      body.position.set(mid.x, 0, mid.z)
      body.quaternion.setFromEuler(0, angle, 0)
      this._addBody(body)

      // Linhas ciano nas bordas
      const offset = TRACK_WIDTH / 2 + 0.1
      const dir = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle))
      ;[-1, 1].forEach(side => {
        const lineGeo = new THREE.BoxGeometry(0.2, 0.08, len)
        const lineMat = new THREE.MeshToonMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.6 })
        const line = new THREE.Mesh(lineGeo, lineMat)
        line.position.set(mid.x + dir.x * offset * side, 0.05, mid.z + dir.z * offset * side)
        line.rotation.y = angle
        this._addToScene(line, lineGeo, lineMat)
      })
    }

    // ---- Arquibancadas ----
    const standColors = [0x330055, 0x220044]
    for (let i = 0; i < CIRCUIT_POINTS.length; i++) {
      const [x, , z] = CIRCUIT_POINTS[i]
      const next = CIRCUIT_POINTS[(i + 1) % CIRCUIT_POINTS.length]
      const angle = Math.atan2(next[0] - x, next[2] - z)
      const outDir = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle))

      ;[-1, 1].forEach(side => {
        const dist = TRACK_WIDTH / 2 + 4
        for (let row = 0; row < 3; row++) {
          const rGeo = new THREE.BoxGeometry(5, 1.5, 2)
          const rMat = new THREE.MeshToonMaterial({ color: standColors[row % 2] })
          const r = new THREE.Mesh(rGeo, rMat)
          r.position.set(
            x + outDir.x * (dist + row * 2) * side,
            row * 1.5 + 0.75,
            z + outDir.z * (dist + row * 2) * side
          )
          this._addToScene(r, rGeo, rMat)
        }
      })
    }

    // ---- Chicanes (obstáculos estáticos em pares) ----
    const chicanePositions = [
      [[8, 0, 14], [-8, 0, 10]],
      [[-6, 0, -18], [6, 0, -22]],
      [[10, 0, -6], [-10, 0, -2]],
    ]
    chicanePositions.forEach(pair => {
      pair.forEach(([x, , z]) => {
        const cGeo = new THREE.BoxGeometry(2, 1.5, 0.6)
        const cMat = new THREE.MeshToonMaterial({ color: 0xff2255 })
        const c = new THREE.Mesh(cGeo, cMat)
        c.position.set(x, 0.75, z)
        this._addToScene(c, cGeo, cMat)

        const cBody = new CANNON.Body({ mass: 0 })
        cBody.addShape(new CANNON.Box(new CANNON.Vec3(1, 0.75, 0.3)))
        cBody.position.set(x, 0.75, z)
        this._addBody(cBody)
      })
    })

    // ---- Obstáculos móveis (kinematic) ----
    const movConfigs = [
      { pos: [12, 0.8, 8], axis: 'x', amp: 4, speed: 1.2 },
      { pos: [-10, 0.8, -8], axis: 'x', amp: 3, speed: 0.9 },
      { pos: [0, 0.8, -20], axis: 'z', amp: 3, speed: 1.5 },
    ]
    movConfigs.forEach(cfg => {
      const mGeo = new THREE.BoxGeometry(1.5, 1.6, 1.5)
      const mMat = new THREE.MeshToonMaterial({ color: 0xffee00, emissive: 0xffee00, emissiveIntensity: 0.3 })
      const mMesh = new THREE.Mesh(mGeo, mMat)
      mMesh.position.set(...cfg.pos)
      this._addToScene(mMesh, mGeo, mMat)

      const mBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC })
      mBody.addShape(new CANNON.Box(new CANNON.Vec3(0.75, 0.8, 0.75)))
      mBody.position.set(...cfg.pos)
      this._addBody(mBody)

      this._movingObstacles.push({ mesh: mMesh, body: mBody, ...cfg, t: Math.random() * Math.PI * 2 })
    })

    // ---- Linha de chegada ----
    const finGeo = new THREE.PlaneGeometry(TRACK_WIDTH, 2)
    const finMat = new THREE.MeshToonMaterial({ color: 0xffffff })
    const fin = new THREE.Mesh(finGeo, finMat)
    fin.rotation.x = -Math.PI / 2
    fin.position.set(0, 0.03, 28)
    this._addToScene(fin, finGeo, finMat)
  }

  _addToScene(mesh, geo, mat) {
    this.scene.add(mesh)
    this.disposables.push({ geo, mat, mesh })
  }

  _addBody(body) {
    this.world.addBody(body)
    this.disposables.push({ body })
  }

  start() {
    this.startTime = Date.now()
    this.currentLap = 0
    this.score = 0
    this.elapsedMs = 0
  }

  update(carPosition, carSpeed, delta) {
    if (!this.startTime) return null

    this.elapsedMs = Date.now() - this.startTime
    this.score += carSpeed * delta * 2.5

    // Mover obstáculos kinematic
    this._movingObstacles.forEach(obs => {
      obs.t += delta * obs.speed
      const offset = Math.sin(obs.t) * obs.amp
      const newPos = [...obs.pos]
      if (obs.axis === 'x') newPos[0] += offset
      else newPos[2] += offset

      obs.body.position.set(...newPos)
      obs.mesh.position.set(...newPos)
    })

    // Detecção de volta (z ~ 28)
    const side = carPosition.z > 28 ? 'after' : 'before'

    if (this._lastCarSide === 'after' && side === 'before' && !this._finishTriggered) {
      this._finishTriggered = true
      this.currentLap++
      setTimeout(() => { this._finishTriggered = false }, 3000)

      if (this.currentLap >= this.totalLaps) {
        return { type: 'complete', ...this._buildResult() }
      }
    }

    this._lastCarSide = side

    return {
      type: 'running',
      currentLap: this.currentLap,
      totalLaps: this.totalLaps,
      score: this.score,
      timeMs: this.elapsedMs,
    }
  }

  _buildResult() {
    const stars = this.elapsedMs <= TIME_3_STARS ? 3 : this.elapsedMs <= TIME_2_STARS ? 2 : 1
    const min = Math.floor(this.elapsedMs / 60000)
    const sec = Math.floor((this.elapsedMs % 60000) / 1000)
    const cs = Math.floor((this.elapsedMs % 1000) / 10)
    return {
      score: Math.round(this.score),
      time: `${min}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`,
      stars,
    }
  }

  dispose() {
    // Restaurar fundo
    this.scene.background = new THREE.Color(0x1a0033)
    this.scene.fog = new THREE.Fog(0x1a0033, 60, 120)

    this.disposables.forEach(({ geo, mat, mesh, body }) => {
      if (mesh) this.scene.remove(mesh)
      if (geo) geo.dispose()
      if (mat) mat.dispose()
      if (body) this.world.removeBody(body)
    })
    this.disposables = []
    this._movingObstacles = []
  }
}
