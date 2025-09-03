import { memorizeFn, useRic } from 'lazy-js-utils'
import type { Options } from './types'

export class DotTextCanvas {
  canvas: HTMLCanvasElement = document.createElement('canvas')
  ctx: CanvasRenderingContext2D = this.canvas.getContext('2d')!
  points: Map<string, Array<number[]>> = new Map()
  originText: string
  fontSize: number
  color: string
  fontWeight: number
  textPointSet: Array<number[]> = []
  status = 'pending'
  customShape?: (ctx: CanvasRenderingContext2D, posX: number, posY: number) => void
  animation?: { type?: 'random-fly-in'; duration?: number }
  // cache previous particle positions for morph animations
  lastParticles: { x: number; y: number }[] = []
  constructor(options: Options) {
    const { text, fontSize, color, fontWeight, customShape } = options
    this.originText = text
    this.fontSize = fontSize
    this.color = color
    this.fontWeight = fontWeight
    this.customShape = customShape
  this.animation = options.animation
    this.executor()
  }

  createTextPoint(text: string) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const pRatio = window.devicePixelRatio || 1
    const size = 16 * pRatio
    canvas.width = canvas.height = size
    ctx.font = `${size}px SimSun`
    ctx.fillText(text, 0, 14 * pRatio)
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
    this.points.set(text, textPointSet)
    return textPointSet
  }

  executor() {
    this.originText.split('').forEach(text => this.getText(text))
    this.textPointSet = this.combineText()
    this.getCanvas()
  }

  getText(text: string) {
    return this.points.has(text)
      ? this.points.get(text)
      : this.createTextPoint(text)
  }

  combineText() {
    const result: Array<number[]> = [[]]
    const len = this.originText.length

    for (let i = 0; i < len; i++) {
      (this.points.get(this.originText[i]) || []).forEach((item, index) => {
        result[index] = (result[index] || []).concat(item)
      })
    }
    return result
  }

  getCanvas() {
    const h = this.textPointSet.length
    const w = this.textPointSet[0].length
    const oneTempLength = this.fontSize / h
    const tasks: Function[] = []
    const getPoint = memorizeFn((i: number) => oneTempLength * (i + 0.5))
    const size = oneTempLength * this.fontWeight / h
    this.canvas.height = this.fontSize
    this.canvas.width = this.fontSize * this.originText.length
    for (let i = 0; i < h; i++) {
      tasks.push(() => {
        for (let j = 0; j < w; j++) {
          if (this.textPointSet[i][j]) {
            this.ctx.beginPath()
            if (this.customShape) {
              this.customShape(this.ctx, getPoint(j), getPoint(i))
            }
            else {
              this.ctx.arc(getPoint(j), getPoint(i), size, 0, Math.PI * 2)
              this.ctx.fillStyle = this.color
              this.ctx.fill()
            }
          }
        }
      })
    }
    useRic(tasks, {
      callback: () => {
        this.status = 'success'
        // after drawing the static dot layout, if animation requested, run it
        if (this.animation?.type === 'random-fly-in') {
          this.runRandomFlyIn(this.animation.duration || 1000)
        }
      },
    })
  }

  // collect particle positions from current canvas (alpha pixels)
  collectParticles(): { x: number; y: number }[] {
    const w = this.canvas.width
    const h = this.canvas.height
    if (w <= 0 || h <= 0) return []
    let data: Uint8ClampedArray
    try {
      data = this.ctx.getImageData(0, 0, w, h).data
    }
    catch (e) {
      return []
    }
    const particles: { x: number; y: number }[] = []
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        if (data[idx + 3]) particles.push({ x: x + 0.5, y: y + 0.5 })
      }
    }
    return particles
  }

  // Morph particles from oldPositions -> current canvas positions
  runMorphAnimation(oldPositions: { x: number; y: number }[], duration: number) {
    const newPositions = this.collectParticles()
    if (!oldPositions || oldPositions.length === 0 || newPositions.length === 0) {
      // fallback to random fly-in if no previous positions
      this.runRandomFlyIn(duration)
      return
    }

    // map particles: simple strategy - pair by index, reuse or randomize if counts differ
    const maxLen = Math.max(oldPositions.length, newPositions.length)
    const pairs: { sx: number; sy: number; tx: number; ty: number }[] = []
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
      if (t < 1) requestAnimationFrame(draw)
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
              if (this.customShape) this.customShape(ctx, getPoint(j), getPoint(i))
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

  // linear interpolation helper
  lerp(a: number, b: number, t: number) {
    return a + (b - a) * t
  }

  runRandomFlyIn(duration: number) {
    // build particle list from current canvas pixels that have alpha
    const w = this.canvas.width
    const h = this.canvas.height
    if (w <= 0 || h <= 0) return
    let imageData: ImageData
    try {
      imageData = this.ctx.getImageData(0, 0, w, h)
    }
    catch (e) {
      return
    }
    const particles: { tx: number; ty: number; sx: number; sy: number }[] = []
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
  }

  repaint(options: Options): DotTextCanvas {
    this.status = 'pending'

    // 如果text相同
    if (this.originText !== options.text)
      return new DotTextCanvas(options)

  this.fontSize = options.fontSize
  this.color = options.color
  this.fontWeight = options.fontWeight
  this.customShape = options.customShape
  this.animation = options.animation
    this.clearCanvas()
    this.getCanvas()
    return this
  }

  clearCanvas() {
    this.ctx?.clearRect(0, 0, this.canvas!.width, this.canvas!.height)
  }
}
