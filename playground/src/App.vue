<script setup lang="ts">
import { randomRgb } from 'simon-js-tool'
const dotTextel = ref(null)
const color = ref('red')
let start = null
function fn(timestamp) {
  if (start === null) { start = timestamp }
  else {
    const delta = timestamp - start
    if (delta > 1000) {
      color.value = randomRgb()
      start = timestamp
    }
  }
  requestAnimationFrame(fn)
}
requestAnimationFrame(fn)
</script>

<template>
  <main font-sans p="x-4 y-10" text="center gray-700 dark:gray-200">
    <dot-text
      ref="dotTextel"
      text="Dot Text"
      :color="color"
      font-size="50"
      font-weight="10"
      ma
    />
    <dot-text text="Hi,Simon" color="grey" font-size="20" font-weight="5" ma m-y-20 />
    <dot-text text="China No.1" color="grey" font-size="20" font-weight="5" ma m-y-20 />
    <div w-55 overflow-hidden ma>
      <dot-text
        text="壹 贰 叁 肆 伍 陆 柒 捌 玖 拾 百 千 万 円"
        color="grey"
        font-size="40"
        font-weight="5"
        ma
        m-y-20
        class="dot-text-wrap"
      />
    </div>

    <Footer />
  </main>
</template>

<style scoped>
.dot-text-wrap {
  animation: dot-text-wrap-animation 5s ease-in-out infinite;
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
