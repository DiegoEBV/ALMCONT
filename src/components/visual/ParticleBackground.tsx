import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export interface ParticleBackgroundProps {
  count?: number
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({ count = 1000 }) => {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000)
    camera.position.z = 120

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    renderer.setPixelRatio(dpr)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.zIndex = '0'
    renderer.domElement.style.pointerEvents = 'none'
    containerRef.current.appendChild(renderer.domElement)

    const light = new THREE.AmbientLight(0x3355aa, 0.6)
    scene.add(light)

    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 200
      positions[i3 + 1] = (Math.random() - 0.5) * 120
      positions[i3 + 2] = (Math.random() - 0.5) * 100
      velocities[i3] = (Math.random() - 0.5) * 0.06
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.06
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.06
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const createCircleTexture = (): THREE.Texture => {
      const size = 64
      const c = document.createElement('canvas')
      c.width = size
      c.height = size
      const ctx = c.getContext('2d')!
      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
      gradient.addColorStop(0, 'rgba(59,130,246,0.95)')
      gradient.addColorStop(0.6, 'rgba(59,130,246,0.6)')
      gradient.addColorStop(1, 'rgba(59,130,246,0.0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2)
      ctx.fill()
      const tex = new THREE.CanvasTexture(c)
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.wrapS = THREE.ClampToEdgeWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      return tex
    }

    const circleTexture = createCircleTexture()
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      sizeAttenuation: true,
      map: circleTexture,
      transparent: true,
      alphaTest: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    const group = new THREE.Group()
    group.add(points)
    scene.add(group)

    const raycaster = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const mouseNDC = new THREE.Vector2(0, 0)
    let cursorPoint: THREE.Vector3 | null = null
    let interactionMode: 'attract' | 'repel' = 'attract'

    const onMouseMove = (e: MouseEvent) => {
      mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1
      raycaster.setFromCamera(mouseNDC, camera)
      const intersect = raycaster.ray.intersectPlane(plane, new THREE.Vector3())
      cursorPoint = intersect
    }
    window.addEventListener('mousemove', onMouseMove)
    const onMouseDown = () => { interactionMode = 'repel' }
    const onMouseUp = () => { interactionMode = 'attract' }
    const onMouseLeave = () => { interactionMode = 'attract'; cursorPoint = null }
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mouseleave', onMouseLeave)

    let rafId = 0
    const animate = () => {
      rafId = requestAnimationFrame(animate)
      group.rotation.y += 0.0008
      group.rotation.x += 0.0005

      const pos = geometry.getAttribute('position') as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        arr[i3] += velocities[i3]
        arr[i3 + 1] += velocities[i3 + 1]
        arr[i3 + 2] += velocities[i3 + 2]

        if (arr[i3] > 220 || arr[i3] < -220) velocities[i3] *= -1
        if (arr[i3 + 1] > 140 || arr[i3 + 1] < -140) velocities[i3 + 1] *= -1
        if (arr[i3 + 2] > 120 || arr[i3 + 2] < -120) velocities[i3 + 2] *= -1

        if (cursorPoint) {
          const dx = arr[i3] - cursorPoint.x
          const dy = arr[i3 + 1] - cursorPoint.y
          const dz = arr[i3 + 2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.0001
          const radius = 60
          if (dist < radius) {
            const base = (radius - dist) / radius
            const force = base * 0.0035
            const dirX = dx / dist
            const dirY = dy / dist
            if (interactionMode === 'repel') {
              velocities[i3] += dirX * force
              velocities[i3 + 1] += dirY * force
            } else {
              velocities[i3] -= dirX * force
              velocities[i3 + 1] -= dirY * force
            }
          }
        }
      }
      pos.needsUpdate = true
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(rafId)
      geometry.dispose()
      material.dispose()
      circleTexture.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
}

export default ParticleBackground
