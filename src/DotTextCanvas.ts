import type { Options } from './types'
import { memorizeFn, useRic } from 'lazy-js-utils'

type Particle = {
  bx: number
  by: number
  x: number
  y: number
  vx: number
  vy: number
}

export class DotTextCanvas {
  canvas: HTMLCanvasElement = document.createElement('canvas')
  ctx: CanvasRenderingContext2D = this.canvas.getContext('2d')!
  points: Map<string, Array<number[]>> = new Map()
  originText: string
  chars: string[] = []
  fontSize: number
  color: string
  fontWeight: number
  fontFamily: string
  density: number
  textPointSet: Array<number[]> = []
  status = 'pending'
  customShape?: (ctx: CanvasRenderingContext2D, posX: number, posY: number) => void
  animation?: Options['animation']
  // cache previous particle positions for morph animations
  lastParticles: { x: number, y: number }[] = []

  private disposed = false
  private interactionCleanup?: () => void
  private interactionRafId: number | undefined
  constructor(options: Options) {
    const { text, fontSize, color, fontWeight, customShape } = options
    this.originText = text
    this.chars = Array.from(text || '')
    this.fontSize = fontSize
    this.color = color
    this.fontWeight = fontWeight
    this.fontFamily = options.fontFamily || 'SimSun'
    this.density = this.normalizeDensity(options.density)
    this.customShape = customShape
    this.animation = options.animation
    this.executor()
  }

  dispose() {
    this.disposed = true
    this.stopInteraction()
  }

  normalizeDensity(density?: number) {
    const d = Number.isFinite(density as number) ? Number(density) : 16
    // keep it within a reasonable range; too low breaks sampling, too high is expensive
    return Math.min(64, Math.max(8, Math.round(d)))
  }

  getPointCacheKey(text: string) {
    // include sampling params so caches don't mix across different layouts
    return `${this.density}\0${this.fontFamily}\0${text}`
  }

  createTextPoint(text: string) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const pRatio = window.devicePixelRatio || 1
    const size = this.density * pRatio
    canvas.width = canvas.height = size
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = 'black'
    ctx.font = `${size}px ${this.fontFamily}`
    // Keep the previous baseline ratio: 14/16 => y = size - 2px@DPR
    ctx.fillText(text, 0, size - 2 * pRatio)
    const { data: imageData, width, height } = ctx.getImageData(0, 0, size, size)

    const textPointSet = []
    for (let i = 0; i < height; i++) {
      const temp: number[] = []
      textPointSet.push(temp)
      for (let j = 0; j < width; j++) {
        const pxStartIndex = (i * width * 4 + j * 4)
        temp.push(imageData[pxStartIndex + 3] ? 1 : 0)
      }
    }
    this.points.set(this.getPointCacheKey(text), textPointSet)
    return textPointSet
  }

  executor() {
    this.chars = Array.from(this.originText || '')
    this.chars.forEach(text => this.getText(text))
    this.textPointSet = this.combineText()
    this.getCanvas()
  }

  getText(text: string) {
    const key = this.getPointCacheKey(text)
    return this.points.has(key)
      ? this.points.get(key)
      : this.createTextPoint(text)
  }

  combineText() {
    if (this.chars.length === 0)
      return [[]]

    const first = this.getText(this.chars[0]) || [[]]
    const rowCount = first.length
    const result: Array<number[]> = Array.from({ length: rowCount }, () => [])

    for (let ci = 0; ci < this.chars.length; ci++) {
      const matrix = this.getText(this.chars[ci]) || []
      for (let r = 0; r < rowCount; r++) {
        const row = matrix[r] || []
        const out = result[r]
        for (let c = 0; c < row.length; c++)
          out.push(row[c])
      }
    }
    return result
  }

  getCanvas() {
    const h = this.textPointSet.length
    const w = this.textPointSet[0].length
    const oneTempLength = this.fontSize / h
    const tasks: (() => void)[] = []
    const getPoint = memorizeFn((i: number) => oneTempLength * (i + 0.5))
    const size = oneTempLength * this.fontWeight / h
    this.canvas.height = this.fontSize
    this.canvas.width = this.fontSize * this.chars.length
    for (let i = 0; i < h; i++) {
      tasks.push(() => {
        if (this.customShape) {
          for (let j = 0; j < w; j++) {
            if (this.textPointSet[i][j]) {
              this.ctx.beginPath()
              this.customShape(this.ctx, getPoint(j), getPoint(i))
            }
          }
          return
        }

        this.ctx.beginPath()
        for (let j = 0; j < w; j++) {
          if (this.textPointSet[i][j])
            this.ctx.arc(getPoint(j), getPoint(i), size, 0, Math.PI * 2)
        }
        this.ctx.fillStyle = this.color
        this.ctx.fill()
      })
    }
    useRic(tasks, {
      callback: () => {
        this.status = 'success'
        // after drawing the static dot layout, only run random fly-in when explicitly requested
        if (this.animation?.type === 'random-fly-in') {
          this.runRandomFlyIn(this.animation.duration || 1000)
        }
        else if (this.animation?.type === 'mouse-repel') {
          this.runMouseRepel()
        }
        else if (this.animation?.type === 'click-explode') {
          this.runClickExplode()
        }
        else if (this.animation?.type === 'wave') {
          this.runWave()
        }
        else if (this.animation?.type === 'breath') {
          this.runBreath()
        }
      },
    })
  }

  stopInteraction() {
    if (this.interactionRafId != null) {
      cancelAnimationFrame(this.interactionRafId)
      this.interactionRafId = undefined
    }
    this.interactionCleanup?.()
    this.interactionCleanup = undefined
  }

  buildParticlesFromGrid(): { particles: Particle[], dotRadius: number } {
    const hCells = this.textPointSet.length
    const wCells = this.textPointSet[0].length
    const oneTempLength = this.fontSize / hCells
    const getPoint = (i: number) => oneTempLength * (i + 0.5)
    const dotRadius = oneTempLength * this.fontWeight / hCells

    const particles: Particle[] = []
    for (let i = 0; i < hCells; i++) {
      for (let j = 0; j < wCells; j++) {
        if (!this.textPointSet[i][j])
          continue
        const x = getPoint(j)
        const y = getPoint(i)
        particles.push({ bx: x, by: y, x, y, vx: 0, vy: 0 })
      }
    }
    return { particles, dotRadius }
  }

  drawGhostBase(particles: Particle[], dotRadius: number, ghostOpacity: number) {
    if (ghostOpacity <= 0)
      return

    const ctx = this.ctx
    ctx.save()
    ctx.globalAlpha = Math.min(1, Math.max(0, ghostOpacity))

    if (this.customShape) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        ctx.beginPath()
        this.customShape(ctx, p.bx, p.by)
      }
    }
    else {
      ctx.beginPath()
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        ctx.arc(p.bx, p.by, dotRadius, 0, Math.PI * 2)
      }
      ctx.fillStyle = this.color
      ctx.fill()
    }

    ctx.restore()
  }

  runMouseRepel() {
    this.stopInteraction()
    if (this.disposed)
      return

    const { particles, dotRadius } = this.buildParticlesFromGrid()
    if (particles.length === 0)
      return

    const w = this.canvas.width
    const h = this.canvas.height
    const ctx = this.ctx

    const radius = Math.max(20, this.animation?.radius ?? Math.max(60, this.fontSize * 0.6))
    const strength = this.animation?.strength ?? 1400
    const returnStrength = this.animation?.returnStrength ?? 28
    const damping = Math.min(0.995, Math.max(0.5, this.animation?.damping ?? 0.88))
    const ghostOpacity = this.animation?.ghostOpacity ?? 0.12
    const maxOffset = Math.max(4, this.animation?.maxOffset ?? Math.max(this.fontSize * 0.12, dotRadius * 6))

    const pointer = {
      x: w / 2,
      y: h / 2,
      active: false,
    }

    const prevTouchAction = this.canvas.style.touchAction
    if (!prevTouchAction)
      this.canvas.style.touchAction = 'none'

    const updatePointerFromEvent = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect()
      if (!rect.width || !rect.height)
        return
      pointer.x = (event.clientX - rect.left) * (this.canvas.width / rect.width)
      pointer.y = (event.clientY - rect.top) * (this.canvas.height / rect.height)
      pointer.active = true
    }

    const onMove = (event: PointerEvent) => updatePointerFromEvent(event)
    const onDown = (event: PointerEvent) => updatePointerFromEvent(event)
    const onLeave = () => { pointer.active = false }

    this.canvas.addEventListener('pointermove', onMove, { passive: true })
    this.canvas.addEventListener('pointerdown', onDown, { passive: true })
    this.canvas.addEventListener('pointerleave', onLeave, { passive: true })

    this.interactionCleanup = () => {
      this.canvas.removeEventListener('pointermove', onMove)
      this.canvas.removeEventListener('pointerdown', onDown)
      this.canvas.removeEventListener('pointerleave', onLeave)
      this.canvas.style.touchAction = prevTouchAction
    }

    let last = performance.now()
    const draw = (now: number) => {
      if (this.disposed)
        return
      const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000))
      last = now

      // frame-rate independent damping (scale to 60fps baseline)
      const dampingScale = Math.pow(damping, dt * 60)
      const radiusSq = radius * radius

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // spring back to origin
        let ax = (p.bx - p.x) * returnStrength
        let ay = (p.by - p.y) * returnStrength

        if (pointer.active) {
          const dx = p.x - pointer.x
          const dy = p.y - pointer.y
          const d2 = dx * dx + dy * dy
          if (d2 > 0.0001 && d2 < radiusSq) {
            const d = Math.sqrt(d2)
            const f = (1 - d / radius) * strength
            ax += (dx / d) * f
            ay += (dy / d) * f
          }
        }

        p.vx = (p.vx + ax * dt) * dampingScale
        p.vy = (p.vy + ay * dt) * dampingScale
        p.x += p.vx * dt
        p.y += p.vy * dt

        const ox = p.x - p.bx
        const oy = p.y - p.by
        const d2 = ox * ox + oy * oy
        if (d2 > maxOffset * maxOffset) {
          const d = Math.sqrt(d2)
          const s = maxOffset / d
          p.x = p.bx + ox * s
          p.y = p.by + oy * s
          p.vx *= 0.6
          p.vy *= 0.6
        }
      }

      ctx.clearRect(0, 0, w, h)
      this.drawGhostBase(particles, dotRadius, ghostOpacity)

      if (this.customShape) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          ctx.beginPath()
          this.customShape(ctx, p.x, p.y)
        }
      }
      else {
        ctx.beginPath()
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2)
        }
        ctx.fillStyle = this.color
        ctx.fill()
      }

      this.interactionRafId = requestAnimationFrame(draw)
    }

    this.interactionRafId = requestAnimationFrame(draw)
  }

  runClickExplode() {
    this.stopInteraction()
    if (this.disposed)
      return

    const { particles, dotRadius } = this.buildParticlesFromGrid()
    if (particles.length === 0)
      return

    // prevent runaway perf on extremely large texts
    if (particles.length > 15000)
      return

    const w = this.canvas.width
    const h = this.canvas.height
    const ctx = this.ctx

    const radius = Math.max(30, this.animation?.radius ?? Math.max(90, this.fontSize * 0.75))
    const strength = this.animation?.strength ?? 2600
    const returnStrength = this.animation?.returnStrength ?? 26
    const damping = Math.min(0.995, Math.max(0.5, this.animation?.damping ?? 0.86))
    const ghostOpacity = this.animation?.ghostOpacity ?? 0.12
    const maxOffset = Math.max(6, this.animation?.maxOffset ?? Math.max(this.fontSize * 0.14, dotRadius * 7))
    const radiusSq = radius * radius

    const prevTouchAction = this.canvas.style.touchAction
    if (!prevTouchAction)
      this.canvas.style.touchAction = 'none'

    const impulse = (x: number, y: number) => {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const dx = p.x - x
        const dy = p.y - y
        const d2 = dx * dx + dy * dy
        if (d2 > 0.0001 && d2 < radiusSq) {
          const d = Math.sqrt(d2)
          const f = (1 - d / radius) * strength
          p.vx += (dx / d) * f * 0.02
          p.vy += (dy / d) * f * 0.02
        }
      }
    }

    const onDown = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect()
      if (!rect.width || !rect.height)
        return
      const x = (event.clientX - rect.left) * (this.canvas.width / rect.width)
      const y = (event.clientY - rect.top) * (this.canvas.height / rect.height)
      impulse(x, y)
    }

    this.canvas.addEventListener('pointerdown', onDown, { passive: true })
    this.interactionCleanup = () => {
      this.canvas.removeEventListener('pointerdown', onDown)
      this.canvas.style.touchAction = prevTouchAction
    }

    let last = performance.now()
    const draw = (now: number) => {
      if (this.disposed)
        return
      const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000))
      last = now

      const dampingScale = Math.pow(damping, dt * 60)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const ax = (p.bx - p.x) * returnStrength
        const ay = (p.by - p.y) * returnStrength
        p.vx = (p.vx + ax * dt) * dampingScale
        p.vy = (p.vy + ay * dt) * dampingScale
        p.x += p.vx * dt
        p.y += p.vy * dt

        const ox = p.x - p.bx
        const oy = p.y - p.by
        const d2 = ox * ox + oy * oy
        if (d2 > maxOffset * maxOffset) {
          const d = Math.sqrt(d2)
          const s = maxOffset / d
          p.x = p.bx + ox * s
          p.y = p.by + oy * s
          p.vx *= 0.6
          p.vy *= 0.6
        }
      }

      ctx.clearRect(0, 0, w, h)
      this.drawGhostBase(particles, dotRadius, ghostOpacity)
      if (this.customShape) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          ctx.beginPath()
          this.customShape(ctx, p.x, p.y)
        }
      }
      else {
        ctx.beginPath()
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2)
        }
        ctx.fillStyle = this.color
        ctx.fill()
      }

      this.interactionRafId = requestAnimationFrame(draw)
    }

    this.interactionRafId = requestAnimationFrame(draw)
  }

  runWave() {
    this.stopInteraction()
    if (this.disposed)
      return

    const { particles, dotRadius } = this.buildParticlesFromGrid()
    if (particles.length === 0)
      return
    if (particles.length > 18000)
      return

    const w = this.canvas.width
    const h = this.canvas.height
    const ctx = this.ctx

    const amplitude = Math.max(0, this.animation?.amplitude ?? Math.max(4, Math.min(10, this.fontSize * 0.06)))
    const frequency = Math.max(0.0001, this.animation?.frequency ?? 0.022)
    const speed = this.animation?.speed ?? 1.4
    const ghostOpacity = this.animation?.ghostOpacity ?? 0.18

    const start = performance.now()
    const draw = (now: number) => {
      if (this.disposed)
        return
      const t = (now - start) / 1000

      ctx.clearRect(0, 0, w, h)
      this.drawGhostBase(particles, dotRadius, ghostOpacity)
      if (this.customShape) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          const phase = (p.bx * frequency) + (p.by * frequency * 0.35) + t * speed
          const y = p.by + amplitude * Math.sin(phase)
          ctx.beginPath()
          this.customShape(ctx, p.bx, y)
        }
      }
      else {
        ctx.beginPath()
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          const phase = (p.bx * frequency) + (p.by * frequency * 0.35) + t * speed
          const y = p.by + amplitude * Math.sin(phase)
          ctx.arc(p.bx, y, dotRadius, 0, Math.PI * 2)
        }
        ctx.fillStyle = this.color
        ctx.fill()
      }

      this.interactionRafId = requestAnimationFrame(draw)
    }

    this.interactionRafId = requestAnimationFrame(draw)
  }

  runBreath() {
    this.stopInteraction()
    if (this.disposed)
      return

    const { particles, dotRadius } = this.buildParticlesFromGrid()
    if (particles.length === 0)
      return
    if (particles.length > 18000)
      return

    const w = this.canvas.width
    const h = this.canvas.height
    const ctx = this.ctx

    const amplitude = Math.min(0.2, Math.max(0, this.animation?.amplitude ?? 0.04))
    const speed = this.animation?.speed ?? 1.2
    const ghostOpacity = this.animation?.ghostOpacity ?? 0.16
    const start = performance.now()

    const draw = (now: number) => {
      if (this.disposed)
        return
      const t = (now - start) / 1000
      const s = 1 + amplitude * (0.5 + 0.5 * Math.sin(t * speed * 2 * Math.PI))

      ctx.clearRect(0, 0, w, h)
      this.drawGhostBase(particles, dotRadius, ghostOpacity)
      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.scale(s, s)
      ctx.translate(-w / 2, -h / 2)

      if (this.customShape) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          ctx.beginPath()
          this.customShape(ctx, p.bx, p.by)
        }
      }
      else {
        ctx.beginPath()
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          ctx.arc(p.bx, p.by, dotRadius, 0, Math.PI * 2)
        }
        ctx.fillStyle = this.color
        ctx.fill()
      }

      ctx.restore()
      this.interactionRafId = requestAnimationFrame(draw)
    }

    this.interactionRafId = requestAnimationFrame(draw)
  }

  // collect particle positions from current canvas (alpha pixels)
  collectParticles(): { x: number, y: number }[] {
    const w = this.canvas.width
    const h = this.canvas.height
    if (w <= 0 || h <= 0)
      return []
    let data: Uint8ClampedArray
    try {
      data = this.ctx.getImageData(0, 0, w, h).data
    }
    catch {
      return []
    }
    const particles: { x: number, y: number }[] = []
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        if (data[idx + 3])
          particles.push({ x: x + 0.5, y: y + 0.5 })
      }
    }
    return particles
  }

  // Morph particles from oldPositions -> current canvas positions
  runMorphAnimation(oldPositions: { x: number, y: number }[], duration: number) {
    const newPositions = this.collectParticles()
    if (!oldPositions || oldPositions.length === 0 || newPositions.length === 0) {
      // fallback to random fly-in if no previous positions
      this.runRandomFlyIn(duration)
      return
    }

    // map particles: simple strategy - pair by index, reuse or randomize if counts differ
    const maxLen = Math.max(oldPositions.length, newPositions.length)
    const pairs: { sx: number, sy: number, tx: number, ty: number }[] = []
    for (let i = 0; i < maxLen; i++) {
      const o = oldPositions[i % oldPositions.length]
      const n = newPositions[i % newPositions.length]
      pairs.push({ sx: o.x, sy: o.y, tx: n.x, ty: n.y })
    }

    const w = this.canvas.width
    const h = this.canvas.height
    const ctx = this.ctx
    const start = performance.now()
    const draw = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = this.color
      for (let i = 0; i < pairs.length; i++) {
        const p = pairs[i]
        const x = this.lerp(p.sx, p.tx, t)
        const y = this.lerp(p.sy, p.ty, t)
        ctx.fillRect(x, y, 1, 1)
      }
      if (t < 1) {
        requestAnimationFrame(draw)
      }
      else {
        // final redraw original method
        ctx.clearRect(0, 0, w, h)
        const hCells = this.textPointSet.length
        const wCells = this.textPointSet[0].length
        const oneTempLength = this.fontSize / hCells
        const getPoint = (i: number) => oneTempLength * (i + 0.5)
        const size = oneTempLength * this.fontWeight / hCells
        for (let i = 0; i < hCells; i++) {
          for (let j = 0; j < wCells; j++) {
            if (this.textPointSet[i][j]) {
              ctx.beginPath()
              if (this.customShape) {
                this.customShape(ctx, getPoint(j), getPoint(i))
              }
              else {
                ctx.arc(getPoint(j), getPoint(i), size, 0, Math.PI * 2)
                ctx.fillStyle = this.color
                ctx.fill()
              }
            }
          }
        }
      }
    }
    requestAnimationFrame(draw)
  }

  // compute pixel positions for a given textPointSet using an offscreen canvas
  positionsFromTextPointSet(textPointSet: number[][]) {
    const hCells = textPointSet.length
    const wCells = textPointSet[0].length
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = this.fontSize * this.chars.length
    tempCanvas.height = this.fontSize
    const tctx = tempCanvas.getContext('2d')!
    const oneTempLength = this.fontSize / hCells
    const getPoint = (i: number) => oneTempLength * (i + 0.5)
    const size = oneTempLength * this.fontWeight / hCells
    tctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
    tctx.fillStyle = this.color
    for (let i = 0; i < hCells; i++) {
      for (let j = 0; j < wCells; j++) {
        if (textPointSet[i][j]) {
          tctx.beginPath()
          if (this.customShape) {
            this.customShape(tctx, getPoint(j), getPoint(i))
          }
          else {
            tctx.arc(getPoint(j), getPoint(i), size, 0, Math.PI * 2)
            tctx.fill()
          }
        }
      }
    }
    let data: Uint8ClampedArray
    try {
      data = tctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data
    }
    catch {
      return []
    }
    const particles: { x: number, y: number }[] = []
    const w = tempCanvas.width
    const h = tempCanvas.height
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        if (data[idx + 3])
          particles.push({ x: x + 0.5, y: y + 0.5 })
      }
    }
    return particles
  }

  // Morph between two explicit particle arrays and finalize to finalTextPointSet
  runMorphBetween(oldPositions: { x: number, y: number }[], newPositions: { x: number, y: number }[], duration: number, finalTextPointSet: number[][]) {
    if (!oldPositions || oldPositions.length === 0 || !newPositions || newPositions.length === 0) {
      // fallback: set final layout and run random fly-in to populate lastParticles
      this.textPointSet = finalTextPointSet
      this.canvas.height = this.fontSize
      this.canvas.width = this.fontSize * this.chars.length
      const ctx = this.ctx
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      const hCells = this.textPointSet.length
      const wCells = this.textPointSet[0].length
      const oneTempLength = this.fontSize / hCells
      const getPoint = (i: number) => oneTempLength * (i + 0.5)
      const size = oneTempLength * this.fontWeight / hCells
      for (let i = 0; i < hCells; i++) {
        for (let j = 0; j < wCells; j++) {
          if (this.textPointSet[i][j]) {
            ctx.beginPath()
            if (this.customShape) {
              this.customShape(ctx, getPoint(j), getPoint(i))
            }
            else {
              ctx.arc(getPoint(j), getPoint(i), size, 0, Math.PI * 2)
              ctx.fillStyle = this.color
              ctx.fill()
            }
          }
        }
      }
      this.runRandomFlyIn(duration)
      return
    }

    const maxLen = Math.max(oldPositions.length, newPositions.length)
    const pairs: { sx: number, sy: number, tx: number, ty: number }[] = []
    for (let i = 0; i < maxLen; i++) {
      const o = oldPositions[i % oldPositions.length]
      const n = newPositions[i % newPositions.length]
      pairs.push({ sx: o.x, sy: o.y, tx: n.x, ty: n.y })
    }

    const w = this.canvas.width
    const h = this.canvas.height
    const ctx = this.ctx
    const start = performance.now()
    const draw = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = this.color
      for (let i = 0; i < pairs.length; i++) {
        const p = pairs[i]
        const x = this.lerp(p.sx, p.tx, t)
        const y = this.lerp(p.sy, p.ty, t)
        ctx.fillRect(x, y, 1, 1)
      }
      if (t < 1) {
        requestAnimationFrame(draw)
      }
      else {
        // finalize: set textPointSet to final and draw crisp dots
        this.textPointSet = finalTextPointSet
        ctx.clearRect(0, 0, w, h)
        const hCells = this.textPointSet.length
        const wCells = this.textPointSet[0].length
        const oneTempLength = this.fontSize / hCells
        const getPoint = (i: number) => oneTempLength * (i + 0.5)
        const size = oneTempLength * this.fontWeight / hCells
        for (let i = 0; i < hCells; i++) {
          for (let j = 0; j < wCells; j++) {
            if (this.textPointSet[i][j]) {
              ctx.beginPath()
              if (this.customShape) {
                this.customShape(ctx, getPoint(j), getPoint(i))
              }
              else {
                ctx.arc(getPoint(j), getPoint(i), size, 0, Math.PI * 2)
                ctx.fillStyle = this.color
                ctx.fill()
              }
            }
          }
        }
        // capture particles for next morph
        this.lastParticles = this.collectParticles()
      }
    }
    requestAnimationFrame(draw)
  }

  // linear interpolation helper
  lerp(a: number, b: number, t: number) {
    return a + (b - a) * t
  }

  runRandomFlyIn(duration: number) {
    // build particle list from current canvas pixels that have alpha
    const w = this.canvas.width
    const h = this.canvas.height
    if (w <= 0 || h <= 0)
      return
    let imageData: ImageData
    try {
      imageData = this.ctx.getImageData(0, 0, w, h)
    }
    catch {
      return
    }
    const particles: { tx: number, ty: number, sx: number, sy: number }[] = []
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        if (imageData.data[idx + 3]) {
          // target is this pixel center
          const tx = x + 0.5
          const ty = y + 0.5
          // start somewhere random around canvas bounds (four sides and corners)
          const side = Math.floor(Math.random() * 4)
          let sx = 0
          let sy = 0
          if (side === 0) {
            // left
            sx = -Math.random() * w
            sy = Math.random() * h
          }
          else if (side === 1) {
            // right
            sx = w + Math.random() * w
            sy = Math.random() * h
          }
          else if (side === 2) {
            // top
            sx = Math.random() * w
            sy = -Math.random() * h
          }
          else {
            // bottom
            sx = Math.random() * w
            sy = h + Math.random() * h
          }
          particles.push({ tx, ty, sx, sy })
        }
      }
    }

    // clear canvas and animate
    const start = performance.now()
    const ctx = this.ctx
    const draw = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = this.color
      // draw particles interpolated
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const x = this.lerp(p.sx, p.tx, t)
        const y = this.lerp(p.sy, p.ty, t)
        ctx.fillRect(x, y, 1, 1)
      }
      if (t < 1) {
        requestAnimationFrame(draw)
      }
      else {
        // final draw ensures crisp static dots
        // redraw original static layout
        ctx.clearRect(0, 0, w, h)
        // draw from stored textPointSet using existing method
        const hCells = this.textPointSet.length
        const wCells = this.textPointSet[0].length
        const oneTempLength = this.fontSize / hCells
        const getPoint = (i: number) => oneTempLength * (i + 0.5)
        const size = oneTempLength * this.fontWeight / hCells
        for (let i = 0; i < hCells; i++) {
          for (let j = 0; j < wCells; j++) {
            if (this.textPointSet[i][j]) {
              ctx.beginPath()
              if (this.customShape) {
                this.customShape(ctx, getPoint(j), getPoint(i))
              }
              else {
                ctx.arc(getPoint(j), getPoint(i), size, 0, Math.PI * 2)
                ctx.fillStyle = this.color
                ctx.fill()
              }
            }
          }
        }
      }
    }
    requestAnimationFrame(draw)
    // record lastParticles after animation completes
    setTimeout(() => {
      this.lastParticles = this.collectParticles()
    }, duration + 20)
  }

  repaint(options: Options): DotTextCanvas {
    this.status = 'pending'
    this.stopInteraction()

    const duration = options.animation?.duration || 1000
    const nextDensity = this.normalizeDensity(options.density)
    const nextFontFamily = options.fontFamily || 'SimSun'
    const layoutChanged = this.originText !== options.text
      || this.density !== nextDensity
      || this.fontFamily !== nextFontFamily

    this.fontSize = options.fontSize
    this.color = options.color
    this.fontWeight = options.fontWeight
    this.density = nextDensity
    this.fontFamily = nextFontFamily
    this.customShape = options.customShape
    this.animation = options.animation

    if (layoutChanged) {
      // if morph animation explicitly requested, do particle morph from current canvas
      if (options.animation?.type === 'morph') {
        // capture current visible particles
        const oldPositions = this.collectParticles()

        // prepare new text point set
        this.originText = options.text
        this.chars = Array.from(this.originText || '')
        this.chars.forEach(ch => this.getText(ch))
        const newTextPointSet = this.combineText()

        // set canvas size to match new text
        this.canvas.height = this.fontSize
        this.canvas.width = this.fontSize * this.chars.length

        // compute target positions and run morph
        const newPositions = this.positionsFromTextPointSet(newTextPointSet)
        this.runMorphBetween(oldPositions, newPositions, duration, newTextPointSet)
        return this
      }

      this.originText = options.text
      this.chars = Array.from(this.originText || '')
      this.chars.forEach(ch => this.getText(ch))
      this.textPointSet = this.combineText()
      this.clearCanvas()
      this.getCanvas()
      return this
    }

    this.clearCanvas()
    this.getCanvas()
    return this
  }

  clearCanvas() {
    this.ctx?.clearRect(0, 0, this.canvas!.width, this.canvas!.height)
  }
}
