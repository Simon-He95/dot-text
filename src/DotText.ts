import type { DefineComponent } from 'vue'
import { defineComponent, h, onMounted, ref } from 'vue'
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
  },
  setup(props) {
    const dotText = new DotTextCanvas(props.text, +props.fontSize, props.color, +props.fontWeight)
    const dotTextEl = ref<HTMLElement>()
    onMounted(() => {
      const attributes = dotTextEl.value!.attributes
      Object.values(attributes).forEach((key) => {
        dotText.canvas.setAttribute(key.name, key.value)
      })
      const p = dotTextEl.value?.parentElement
      if (p)
        p.replaceChild(dotText.canvas, dotTextEl.value!)
    })
    props.clear(dotText.clearCanvas.bind(dotText))
    return () => h('div', { ref: dotTextEl })
  },
}) as DefineComponent<DotType>
