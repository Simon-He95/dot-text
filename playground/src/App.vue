<script setup lang="ts">
import { formateDate, randomDate, randomRgba, useRaf } from 'lazy-js-utils'
const dotTextel = ref(null)
const color = ref('red')
const text = ref('Dot Text')
const date = ref(formateDate(randomDate()))

const textInput = ref('')

function onload() {
  const stop = useRaf(() => {
    date.value = formateDate(randomDate())
    color.value = randomRgba(1)
    stop()
  }, 1000)
}
const onShape1 = (ctx, x, y) => {
  ctx.font = '10px serif'
  ctx.fillText('🐼', x, y)
}
const onShape2 = (ctx, x, y) => {
  ctx.font = '10px serif'
  ctx.fillText('💩', x, y)
}
</script>

<template>
  <main font-sans p="x-4 y-10" text="center gray-700 dark:gray-200" w-full>
    <dot-text ref="dotTextel" :text="text" :color="color" font-size="40" font-weight="10" ma />
    <dot-text text="China No.1" color="grey" font-size="20" font-weight="44" ma m-y-10 />
    <dot-text :text="date" color="grey" :onload="onload" font-size="20" font-weight="20" ma m-y-10 />
    <dot-text text="熊猫哥" color="grey" font-size="100" :custom-shape="onShape1" font-weight="10" ma m-y-5 />
    <dot-text text="熊猫哥" color="grey" font-size="500" :custom-shape="onShape2" font-weight="10" ma m-y-5 />
    <div w-55 overflow-hidden ma>
      <dot-text
        text="壹 贰 叁 肆 伍 陆 柒 捌 玖 拾 百 千 万 円" color="grey" font-size="30" font-weight="10" ma m-y-5
        class="dot-text-wrap"
      />
    </div>
    <input v-model="textInput" type="text" placeholder="尝试输入吧" border-1 border-dark border-rd-1 indent-2 color-black>
    <dot-text :text="textInput" color="grey" font-size="100" font-weight="10" ma m-y-5 />
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
