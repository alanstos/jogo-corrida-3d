import * as THREE from 'three'

const POOL_SIZE = 60
const PARTICLE_LIFETIME = 0.5

export default class Particles {
  constructor(scene) {
    this.scene = scene
    this._pool = []
    this._active = []
    this._build()
  }

  _build() {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(POOL_SIZE * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const mat = new THREE.PointsMaterial({
      color: 0xffee00,
      size: 0.25,
      transparent: true,
      depthWrite: false,
    })

    this._points = new THREE.Points(geo, mat)
    this.scene.add(this._points)

    // Inicializar pool de partículas individuais (reutilizáveis)
    for (let i = 0; i < POOL_SIZE; i++) {
      this._pool.push({
        index: i,
        active: false,
        lifetime: 0,
        velocity: new THREE.Vector3(),
        position: new THREE.Vector3(0, -1000, 0),
      })
    }

    // Esconder todas inicialmente
    this._updateBuffers()
  }

  emit(position, count = 15) {
    let emitted = 0
    for (let i = 0; i < this._pool.length && emitted < count; i++) {
      const p = this._pool[i]
      if (!p.active) {
        p.active = true
        p.lifetime = PARTICLE_LIFETIME
        p.position.copy(position)
        p.velocity.set(
          (Math.random() - 0.5) * 8,
          Math.random() * 5 + 2,
          (Math.random() - 0.5) * 8
        )
        emitted++
      }
    }
  }

  update(delta) {
    let needsUpdate = false

    this._pool.forEach(p => {
      if (!p.active) return

      p.lifetime -= delta
      if (p.lifetime <= 0) {
        p.active = false
        p.position.set(0, -1000, 0)
        needsUpdate = true
        return
      }

      p.position.addScaledVector(p.velocity, delta)
      p.velocity.y -= 10 * delta // gravidade leve
      needsUpdate = true
    })

    if (needsUpdate) this._updateBuffers()
  }

  _updateBuffers() {
    const positions = this._points.geometry.attributes.position.array
    this._pool.forEach(p => {
      positions[p.index * 3] = p.position.x
      positions[p.index * 3 + 1] = p.position.y
      positions[p.index * 3 + 2] = p.position.z
    })
    this._points.geometry.attributes.position.needsUpdate = true
  }

  dispose() {
    this.scene.remove(this._points)
    this._points.geometry.dispose()
    this._points.material.dispose()
  }
}
