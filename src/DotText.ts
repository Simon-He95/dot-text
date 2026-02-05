import type { DefineComponent, PropType } from 'vue'
import type { DotType, Options } from './types'
import { useRaf } from 'lazy-js-utils'
import { defineComponent, h, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue'
import { DotTextCanvas } from './DotTextCanvas'

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
    fontFamily: {
      type: String,
      default: 'SimSun',
    },
    density: {
      type: [Number, String],
      default: 16,
    },
    animation: {
      type: Object as PropType<Options['animation']>,
    },
    clear: {
      type: Function,
      default: () => { },
    },
    onload: {
      type: Function,
      default: () => { },
    },
    customShape: {
      type: Function as PropType<Options['customShape']>,
    },
  },
  setup(props, { expose }) {
    const dotText = new DotTextCanvas({
      text: props.text,
      fontSize: +props.fontSize!,
      color: props.color!,
      fontWeight: +props.fontWeight!,
      fontFamily: props.fontFamily,
      density: +props.density!,
      animation: props.animation,
      customShape: props.customShape,
    })
    const dotTextEl = ref<HTMLElement>()
    const attrs = useAttrs()

    expose({
      canvas: dotText.canvas,
      clear: () => dotText.clearCanvas(),
      repaint: (next?: Partial<Options>) => {
        dotText.repaint({
          text: next?.text ?? props.text,
          fontSize: next?.fontSize ?? +props.fontSize!,
          color: next?.color ?? props.color!,
          fontWeight: next?.fontWeight ?? +props.fontWeight!,
          fontFamily: next?.fontFamily ?? props.fontFamily,
          density: next?.density ?? +props.density!,
          animation: next?.animation ?? props.animation,
          customShape: next?.customShape ?? props.customShape,
        })
      },
    })

    let stopMountedRaf: undefined | (() => void)
    onMounted(() => {
      update(dotTextEl.value!, dotText.canvas!)
      stopMountedRaf = useRaf(() => {
        if (dotText.status === 'success') {
          props.onload?.()
          stopMountedRaf?.()
          stopMountedRaf = undefined
        }
      })
    })

    watch(
      [
        () => props.text,
        () => props.fontSize,
        () => props.color,
        () => props.fontWeight,
        () => props.fontFamily,
        () => props.density,
        () => props.customShape,
        () => props.animation?.type,
        () => props.animation?.duration,
        () => props.animation?.radius,
        () => props.animation?.strength,
        () => props.animation?.returnStrength,
        () => props.animation?.damping,
        () => props.animation?.amplitude,
        () => props.animation?.frequency,
        () => props.animation?.speed,
        () => props.animation?.ghostOpacity,
        () => props.animation?.maxOffset,
      ],
      (_next, _prev, onCleanup) => {
        dotText.repaint({
          text: props.text,
          fontSize: +props.fontSize!,
          color: props.color!,
          fontWeight: +props.fontWeight!,
          fontFamily: props.fontFamily,
          density: +props.density!,
          animation: props.animation,
          customShape: props.customShape,
        })

        const stop = useRaf(() => {
          if (dotText.status === 'success') {
            update(dotTextEl.value!, dotText.canvas!)
            props.clear!(dotText.clearCanvas.bind(dotText))
            props.onload?.()
            stop()
          }
        })
        onCleanup(() => stop())
      },
    )

    watch(
      () => ({ ...attrs }),
      () => update(dotTextEl.value!, dotText.canvas!),
      { deep: true, flush: 'post' },
    )

    onBeforeUnmount(() => {
      stopMountedRaf?.()
      stopMountedRaf = undefined
      dotText.dispose()
    })

    props.clear!(dotText.clearCanvas.bind(dotText))
    return () => h('div', { ref: dotTextEl })
  },
}) as DefineComponent<DotType>

function update(dotTextEl: HTMLElement, canvas: HTMLCanvasElement) {
  if (!dotTextEl)
    return
  const attributes = dotTextEl.attributes
  const keep = new Set<string>(['width', 'height'])
  const nextAttrNames = new Set<string>()

  Object.values(attributes).forEach((key) => {
    if (key.name === 'width' || key.name === 'height')
      return
    nextAttrNames.add(key.name)
    canvas.setAttribute(key.name, key.value)
  })

  // remove attributes that no longer exist on the wrapper
  Array.from(canvas.attributes).forEach((attr) => {
    if (keep.has(attr.name))
      return
    if (!nextAttrNames.has(attr.name))
      canvas.removeAttribute(attr.name)
  })

  const child = dotTextEl.childNodes[0]
  if (child && child !== canvas)
    dotTextEl.replaceChild(canvas, child)
  else if (!child)
    dotTextEl.appendChild(canvas)
}
