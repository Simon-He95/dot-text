import type { DefineComponent } from 'vue'
import { defineComponent, h, onMounted, ref, watch } from 'vue'
import { useRaf } from 'lazy-js-utils'
import { DotTextCanvas } from './DotTextCanvas'
import type { DotType } from './types'

export const DotText = defineComponent({
  props: {
    text: {
      type: String,
      required: true,
      default: '',
    },
    color: {
      type: String,
      default: 'black',
    },
    fontWeight: {
      type: [Number, String],
      default: 5,
    },
    fontSize: {
      type: [Number, String],
      default: 12,
    },
    clear: {
      type: Function,
      default: () => { },
    },
    onload: {
      type: Function,
      default: () => { },
    },
  },
  setup(props) {
    const dotText = new DotTextCanvas(props.text, +props.fontSize, props.color, +props.fontWeight)
    const dotTextEl = ref<HTMLElement>()
    onMounted(() => {
      update(dotTextEl.value!, dotText.canvas!)
      const stop = useRaf(() => {
        if (dotText.status === 'success')
          props.onload?.()
        stop()
      })
    })
    watch(props, async () => {
      const newDotText = await dotText.repaint(props.text, +props.fontSize, props.color, +props.fontWeight)
      const stop = useRaf(() => {
        if (newDotText.status === 'success') {
          update(dotTextEl.value!, newDotText.canvas!)
          props.clear(newDotText.clearCanvas.bind(newDotText))
          props.onload?.()
          stop()
        }
      })
    })
    props.clear(dotText.clearCanvas.bind(dotText))
    return () => h('div', { ref: dotTextEl })
  },
}) as DefineComponent<DotType>

function update(dotTextEl: HTMLElement, canvas: HTMLCanvasElement) {
  const attributes = dotTextEl.attributes
  Object.values(attributes).forEach((key) => {
    if (key.name === 'width' || key.name === 'height')
      return
    canvas.setAttribute(key.name, key.value)
  })
  const child = dotTextEl.childNodes[0]
  if (child)
    dotTextEl.replaceChild(canvas, child)
  else
    dotTextEl.appendChild(canvas)
}
