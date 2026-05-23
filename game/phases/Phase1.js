import * as THREE from 'three'
import * as CANNON from 'cannon-es'

const TRACK_WIDTH = 10
const TOTAL_LAPS = 3

// Pontos da pista urbana (circuito oval simples com curvas suaves)
const TRACK_POINTS = [
  [0, 0, 30],
  [15, 0, 22],
  [22, 0, 8],
  [20, 0, -8],
  [12, 0, -22],
  [0, 0, -28],
  [-12, 0, -22],
  [-20, 0, -8],
  [-22, 0, 8],
  [-15, 0, 22],
]

// Tempo alvo para estrelas (em ms)
const TIME_3_STARS = 60000   // < 1 min = 3 estrelas
const TIME_2_STARS = 120000  // < 2 min = 2 estrelas

export default class Phase1 {
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
    this._lastCarSide = null // 'before' | 'after' — para detectar cruzamento direcional

    this._build()
  }

  _build() {
    // ---- Chão ----
    this._addMesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshToonMaterial({ color: 0x0a0018 }),
      { rx: -Math.PI / 2 }
    )

    // ---- Superfície da pista (oval procedural por segmentos) ----
    const points = TRACK_POINTS.map(([x, , z]) => new THREE.Vector3(x, 0, z))
    points.push(points[0].clone()) // fechar loop

    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i]
      const to = points[i + 1]
      const mid = from.clone().add(to).multiplyScalar(0.5)
      const len = from.distanceTo(to)
      const angle = Math.atan2(to.x - from.x, to.z - from.z)

      const segGeo = new THREE.BoxGeometry(TRACK_WIDTH, 0.05, len + 0.5)
      const segMat = new THREE.MeshToonMaterial({ color: 0x1a0044 })
      const seg = new THREE.Mesh(segGeo, segMat)
      seg.position.set(mid.x, 0.02, mid.z)
      seg.rotation.y = angle
      this._addToScene(seg, segGeo, segMat)

      // Corpo físico do chão deste segmento
      const body = new CANNON.Body({ mass: 0 })
      body.addShape(new CANNON.Box(new CANNON.Vec3(TRACK_WIDTH / 2, 0.05, len / 2 + 0.25)))
      body.position.set(mid.x, 0, mid.z)
      body.quaternion.setFromEuler(0, angle, 0)
      this._addBody(body)
    }

    // ---- Linhas laterais neon ----
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i]
      const to = points[i + 1]
      const mid = from.clone().add(to).multiplyScalar(0.5)
      const len = from.distanceTo(to)
      const angle = Math.atan2(to.x - from.x, to.z - from.z)

      const offset = TRACK_WIDTH / 2 + 0.1
      const dir = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle))

      ;[-1, 1].forEach(side => {
        const lineGeo = new THREE.BoxGeometry(0.2, 0.08, len)
        const lineMat = new THREE.MeshToonMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.7 })
        const line = new THREE.Mesh(lineGeo, lineMat)
        line.position.set(mid.x + dir.x * offset * side, 0.05, mid.z + dir.z * offset * side)
        line.rotation.y = angle
        this._addToScene(line, lineGeo, lineMat)
      })
    }

    // ---- Prédios nas laterais ----
    const buildingColors = [0x1a0033, 0x220055, 0x110028]
    const buildingAccents = [0x00ffff, 0xff2255, 0xffee00]
    for (let i = 0; i < TRACK_POINTS.length; i++) {
      const [tx, , tz] = TRACK_POINTS[i]
      const next = TRACK_POINTS[(i + 1) % TRACK_POINTS.length]
      const angle = Math.atan2(next[0] - tx, next[2] - tz)
      const outDir = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle))

      ;[-1, 1].forEach(side => {
        const w = 3 + Math.random() * 3
        const h = 4 + Math.random() * 8
        const d = 3 + Math.random() * 3
        const dist = TRACK_WIDTH / 2 + 3 + Math.random() * 3

        const bGeo = new THREE.BoxGeometry(w, h, d)
        const bMat = new THREE.MeshToonMaterial({ color: buildingColors[i % 3] })
        const b = new THREE.Mesh(bGeo, bMat)
        b.position.set(tx + outDir.x * dist * side, h / 2, tz + outDir.z * dist * side)
        this._addToScene(b, bGeo, bMat)

        // Janelas neon (acento)
        const winGeo = new THREE.BoxGeometry(w + 0.05, 0.3, d + 0.05)
        const winMat = new THREE.MeshToonMaterial({ color: buildingAccents[i % 3], emissive: buildingAccents[i % 3], emissiveIntensity: 0.5 })
        const win = new THREE.Mesh(winGeo, winMat)
        win.position.set(tx + outDir.x * dist * side, h * 0.6, tz + outDir.z * dist * side)
        this._addToScene(win, winGeo, winMat)
      })
    }

    // ---- Obstáculos (cones) ----
    const conePositions = [
      [5, 0, 10], [-5, 0, -5], [8, 0, -15], [-8, 0, 15], [0, 0, 0],
    ]
    conePositions.forEach(([x, , z]) => {
      const cGeo = new THREE.CylinderGeometry(0, 0.4, 1.2, 8)
      const cMat = new THREE.MeshToonMaterial({ color: 0xffee00 })
      const cone = new THREE.Mesh(cGeo, cMat)
      cone.position.set(x, 0.6, z)
      this._addToScene(cone, cGeo, cMat)

      const cBody = new CANNON.Body({ mass: 0 })
      cBody.addShape(new CANNON.Cylinder(0.05, 0.4, 1.2, 8))
      cBody.position.set(x, 0.6, z)
      this._addBody(cBody)
    })

    // ---- Linha de chegada (start/finish) ----
    const finGeo = new THREE.PlaneGeometry(TRACK_WIDTH, 2)
    const finMat = new THREE.MeshToonMaterial({ color: 0xffffff })
    const finish = new THREE.Mesh(finGeo, finMat)
    finish.rotation.x = -Math.PI / 2
    finish.position.set(0, 0.03, 30)
    this._addToScene(finish, finGeo, finMat)

    // Listras da linha de chegada
    for (let i = 0; i < 5; i++) {
      const stripeGeo = new THREE.PlaneGeometry(TRACK_WIDTH / 5 - 0.1, 2)
      const stripeMat = new THREE.MeshToonMaterial({ color: i % 2 === 0 ? 0x000000 : 0xffffff })
      const stripe = new THREE.Mesh(stripeGeo, stripeMat)
      stripe.rotation.x = -Math.PI / 2
      stripe.position.set(-TRACK_WIDTH / 2 + (TRACK_WIDTH / 5) * (i + 0.5), 0.04, 30)
      this._addToScene(stripe, stripeGeo, stripeMat)
    }

    // ---- Chão físico geral (backup, para não cair) ----
    const groundBody = new CANNON.Body({ mass: 0 })
    groundBody.addShape(new CANNON.Plane())
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this._addBody(groundBody)
  }

  // ---- Helpers de criação com rastreamento para dispose ----

  _addMesh(geo, mat, transform = {}) {
    const mesh = new THREE.Mesh(geo, mat)
    if (transform.rx) mesh.rotation.x = transform.rx
    if (transform.ry) mesh.rotation.y = transform.ry
    if (transform.pos) mesh.position.copy(transform.pos)
    this.scene.add(mesh)
    this.disposables.push({ geo, mat, mesh })
    return mesh
  }

  _addToScene(mesh, geo, mat) {
    this.scene.add(mesh)
    this.disposables.push({ geo, mat, mesh })
  }

  _addBody(body) {
    this.world.addBody(body)
    this.disposables.push({ body })
  }

  // ---- Lógica de jogo ----

  start() {
    this.startTime = Date.now()
    this.currentLap = 0
    this.score = 0
    this.elapsedMs = 0
  }

  update(carPosition, carSpeed, delta) {
    if (!this.startTime) return null

    this.elapsedMs = Date.now() - this.startTime
    this.score += carSpeed * delta * 2 // pontos por velocidade

    // Detectar cruzamento da linha de chegada (z ~ 30)
    const carZ = carPosition.z
    const FINISH_Z = 30
    const THRESHOLD = 2.5

    const side = carZ > FINISH_Z ? 'after' : 'before'

    if (this._lastCarSide === 'after' && side === 'before' && !this._finishTriggered) {
      // Carro cruzou de after para before = passou pela linha em direção correta
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
    const stars = this._calcStars(this.elapsedMs)
    return {
      score: Math.round(this.score),
      time: this._formatTime(this.elapsedMs),
      stars,
    }
  }

  _calcStars(ms) {
    if (ms <= TIME_3_STARS) return 3
    if (ms <= TIME_2_STARS) return 2
    return 1
  }

  _formatTime(ms) {
    const min = Math.floor(ms / 60000)
    const sec = Math.floor((ms % 60000) / 1000)
    const centesimos = Math.floor((ms % 1000) / 10)
    return `${min}:${String(sec).padStart(2, '0')}.${String(centesimos).padStart(2, '0')}`
  }

  dispose() {
    this.disposables.forEach(({ geo, mat, mesh, body }) => {
      if (mesh) this.scene.remove(mesh)
      if (geo) geo.dispose()
      if (mat) mat.dispose()
      if (body) this.world.removeBody(body)
    })
    this.disposables = []
  }
}
