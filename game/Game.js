import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import Car from './Car.js'
import Controls from './Controls.js'
import HUD from './HUD.js'
import Particles from './Particles.js'
import Audio from './Audio.js'
import Phase1 from './phases/Phase1.js'
import Phase2 from './phases/Phase2.js'
import Phase3 from './phases/Phase3.js'

const CAMERA_LAG = 0.08
const CAMERA_OFFSET = new THREE.Vector3(0, 5, 10)

const PHASE_CLASSES = { 1: Phase1, 2: Phase2, 3: Phase3 }

export default class Game {
  constructor(canvas, difficulty = 'medium') {
    this.canvas = canvas
    this.difficulty = difficulty
    this.running = false
    this.animFrameId = null

    // Callbacks para orquestrador externo
    this.onPhaseComplete = null
    this.onGameOver = null

    this.currentPhaseNum = 1
    this.phase = null
    this._phaseComplete = false

    this.isMobile = window.innerWidth < 768 || /Mobi/i.test(navigator.userAgent)

    this._initRenderer()
    this._initScene()
    this._initPhysics()
    this._initCar()
    this._initControls()
    this._initHUD()
    this._initParticles()
    this._initAudio()
    this._initCollisionListener()

    this._clock = new THREE.Clock()
    this._cameraPos = new THREE.Vector3()
    this._cameraTarget = new THREE.Vector3()
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isMobile,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = false
  }

  _initScene() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a0033)
    this.scene.fog = new THREE.Fog(0x1a0033, 60, 120)

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500)

    const ambient = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0x00ffff, 1.2)
    dirLight.position.set(5, 10, 5)
    this.scene.add(dirLight)

    const fillLight = new THREE.DirectionalLight(0xff2255, 0.4)
    fillLight.position.set(-5, 5, -5)
    this.scene.add(fillLight)
  }

  _initPhysics() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -20, 0),
    })
    this.world.broadphase = new CANNON.SAPBroadphase(this.world)
    this.world.allowSleep = true
  }

  _initCar() {
    this.car = new Car()
    this.scene.add(this.car.getMesh())
    this.car.addToWorld(this.world)
  }

  _initControls() {
    this.controls = new Controls()
  }

  _initHUD() {
    this.hud = new HUD()
  }

  _initParticles() {
    this.particles = new Particles(this.scene)
  }

  _initAudio() {
    this.audio = new Audio()
  }

  _initCollisionListener() {
    this.car.body.addEventListener('collide', (event) => {
      const contact = event.contact
      if (!contact) return

      // Ponto de contato (aproximado)
      const pos = new THREE.Vector3(
        this.car.body.position.x,
        this.car.body.position.y,
        this.car.body.position.z
      )

      this.particles.emit(pos, 18)
      this.audio.playCollision()

      if (navigator.vibrate) navigator.vibrate(50)

      // Penalidade de pontuação
      if (this.phase) {
        this.phase.score = Math.max(0, (this.phase.score || 0) - 100)
      }
    })
  }

  // Inicializar AudioContext — chamar no user gesture
  initAudio() {
    this.audio.init()
  }

  loadPhase(phaseNum) {
    if (this.phase) {
      this.phase.dispose()
      this.phase = null
    }

    this.currentPhaseNum = phaseNum
    this._phaseComplete = false

    const PhaseClass = PHASE_CLASSES[phaseNum] || Phase1
    this.phase = new PhaseClass(this.scene, this.world)

    // Posição inicial por fase
    const startPos = new THREE.Vector3(0, 0.9, 25)
    this.car.setPosition(startPos.x, startPos.y, startPos.z)

    this._cameraPos.copy(startPos).add(CAMERA_OFFSET)
    this.camera.position.copy(this._cameraPos)

    this.phase.start()
    this.hud.show()
  }

  start(phaseNum = 1) {
    this.running = true
    this._clock.start()
    this.loadPhase(phaseNum)
    this._loop()
    window.addEventListener('resize', this._onResize)
  }

  stop() {
    this.running = false
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
    this.controls.destroy()
    if (this.phase) {
      this.phase.dispose()
      this.phase = null
    }
    this.particles.dispose()
    this.audio.destroy()
    this.hud.hide()
    window.removeEventListener('resize', this._onResize)
  }

  _loop = () => {
    if (!this.running) return
    this.animFrameId = requestAnimationFrame(this._loop)

    const delta = Math.min(this._clock.getDelta(), 0.05)
    this.update(delta)
    this.renderer.render(this.scene, this.camera)
  }

  update(delta) {
    const { left, right, turbo } = this.controls.state

    this.car.steer(left, right, turbo, delta)

    this.world.fixedStep()
    this.car.syncMesh()

    // Velocidade calculada APÓS o passo físico — reflete a integração atual
    const vel = this.car.body.velocity
    this.car.speed = Math.sqrt(vel.x ** 2 + vel.z ** 2)

    this.particles.update(delta)
    this.audio.updateEngine(this.car.speed)

    if (this.phase && !this._phaseComplete) {
      const result = this.phase.update(this.car.getPosition(), this.car.speed, delta)

      if (result) {
        if (result.type === 'complete' && !this._phaseComplete) {
          this._phaseComplete = true
          this.audio.playPhaseComplete()
          this.hud.hide()
          if (this.onPhaseComplete) this.onPhaseComplete(result)
        } else if (result.type === 'gameover' && !this._phaseComplete) {
          this._phaseComplete = true
          this.audio.playGameOver()
          this.hud.hide()
          if (this.onGameOver) this.onGameOver(result)
        } else if (result.type === 'running') {
          this.hud.update({
            speed: this.car.speed,
            score: result.score,
            currentLap: result.currentLap,
            totalLaps: result.totalLaps,
            timeMs: result.timeMs,
            phase: this.currentPhaseNum,
          })
        }
      }
    }

    // Chase cam
    const carPos = this.car.getPosition()
    const camOffset = CAMERA_OFFSET.clone()
    camOffset.applyQuaternion(this.car.getMesh().quaternion)
    this._cameraTarget.copy(carPos).add(camOffset)
    this._cameraPos.lerp(this._cameraTarget, CAMERA_LAG)
    this.camera.position.copy(this._cameraPos)
    this.camera.lookAt(carPos)
  }

  _onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}
