<script setup lang="ts">
import { formateDate, randomDate, randomRgb } from 'simon-js-tool'
const dotTextel = ref(null)
const color = ref('red')
const text = ref('Dot Text')
let start = null
const date = ref(formateDate(randomDate()))
function fn(timestamp) {
  if (start === null) {
    start = timestamp
  }
  else {
    const delta = timestamp - start
    if (delta > 1000) {
      date.value = formateDate(randomDate())
      color.value = randomRgb()
      start = timestamp
    }
  }
  requestAnimationFrame(fn)
}
requestAnimationFrame(fn)

const textInput = ref('')
</script>

<template>
  <main font-sans p="x-4 y-10" text="center gray-700 dark:gray-200">
    <dot-text
      ref="dotTextel"
      :text="text"
      :color="color"
      font-size="50"
      font-weight="10"
      ma
    />
    <dot-text text="Hi,Simon" color="grey" font-size="20" font-weight="5" ma m-y-20 />
    <dot-text :text="date" color="grey" font-size="20" font-weight="5" ma m-y-20 />
    <dot-text text="China No.1" color="grey" font-size="20" font-weight="5" ma m-y-10 />
    <div w-55 overflow-hidden ma>
      <dot-text
        text="壹 贰 叁 肆 伍 陆 柒 捌 玖 拾 百 千 万 円"
        color="grey"
        font-size="30"
        font-weight="5"
        ma
        m-y-5
        class="dot-text-wrap"
      />
    </div>
    <input
      v-model="textInput"
      type="text"
      placeholder="尝试输入吧"
      border-1
      border-dark
      border-rd-1
      indent-2
      color-black
    >
    <dot-text :text="textInput" color="grey" font-size="40" font-weight="5" ma m-y-20 />
    <Footer />
  </main>
</template>

<style scoped>
.dot-text-wrap {
  animation: dot-text-wrap-animation 5s linear infinite;
}
@keyframes dot-text-wrap-animation {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-90%);
  }
}
</style>
