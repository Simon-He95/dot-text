export interface DotType {
  text: string
  color?: string
  fontWeight?: number
  fontSize?: number
  clear?: Function
  onload?: Function
  customShape?: (ctx: CanvasRenderingContext2D, posX: number, posY: number) => void
}

export interface Options {
  text: string
  fontSize: number
  color: string
  fontWeight: number
  customShape?: (ctx: CanvasRenderingContext2D, posX: number, posY: number) => void
}
