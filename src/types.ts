export interface DotType {
  text: string
  color?: string
  fontWeight?: number
  fontSize?: number
  /**
   * Font family used for sampling characters into the dot matrix.
   * Note: this does not affect `customShape` rendering.
   */
  fontFamily?: string
  /**
   * Base sampling resolution per character (at DPR=1). Higher = more dots.
   * Default: 16 (keeps current look).
   */
  density?: number
  clear?: (callback: () => void) => void
  onload?: () => void
  customShape?: (ctx: CanvasRenderingContext2D, posX: number, posY: number) => void
  /**
   * animation controls entry/exit or other animations.
   * Example: { type: 'random-fly-in', duration: 1200 }
   */
  animation?: {
    type?: 'random-fly-in' | 'morph' | 'mouse-repel' | 'click-explode' | 'wave' | 'breath'
    duration?: number
    /**
     * Only for `mouse-repel`: effective radius in canvas pixels.
     */
    radius?: number
    /**
     * Only for `mouse-repel`: repulsion strength (bigger = more bouncy).
     */
    strength?: number
    /**
     * Only for `mouse-repel`: spring back strength to origin points.
     */
    returnStrength?: number
    /**
     * Only for `mouse-repel`: velocity damping (0~1). Default ~0.88.
     */
    damping?: number
    /**
     * For `wave`: amplitude in canvas pixels.
     * For `breath`: scale amplitude (e.g. 0.06 means 6%).
     */
    amplitude?: number
    /**
     * Only for `wave`: frequency (radians per pixel).
     */
    frequency?: number
    /**
     * For `wave`/`breath`: speed multiplier.
     */
    speed?: number
    /**
     * Keep text readable by drawing a faint static base layer (0~1).
     */
    ghostOpacity?: number
    /**
     * Only for physics-like effects: clamp max offset from base (canvas px).
     */
    maxOffset?: number
  }
}

export interface Options {
  text: string
  fontSize: number
  color: string
  fontWeight: number
  fontFamily?: string
  density?: number
  customShape?: (ctx: CanvasRenderingContext2D, posX: number, posY: number) => void
  animation?: {
    type?: 'random-fly-in' | 'morph' | 'mouse-repel' | 'click-explode' | 'wave' | 'breath'
    duration?: number
    radius?: number
    strength?: number
    returnStrength?: number
    damping?: number
    amplitude?: number
    frequency?: number
    speed?: number
    ghostOpacity?: number
    maxOffset?: number
  }
}
