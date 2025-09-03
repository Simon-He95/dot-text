export interface DotType {
  text: string
  color?: string
  fontWeight?: number
  fontSize?: number
  clear?: (callback: () => void) => void
  onload?: () => void
  customShape?: (ctx: CanvasRenderingContext2D, posX: number, posY: number) => void
  /**
   * animation controls entry/exit or other animations.
   * Example: { type: 'random-fly-in', duration: 1200 }
   */
  animation?: {
    type?: 'random-fly-in' | 'morph'
    duration?: number
  }
}

export interface Options {
  text: string
  fontSize: number
  color: string
  fontWeight: number
  customShape?: (ctx: CanvasRenderingContext2D, posX: number, posY: number) => void
  animation?: {
    type?: 'random-fly-in' | 'morph'
    duration?: number
  }
}
