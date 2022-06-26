<script setup lang="ts">
const dotTextel = ref(null)
function clear(fn) {
  // fn();
}
</script>

<template>
  <main font-sans p="x-4 y-10" text="center gray-700 dark:gray-200">
    <dot-text
      ref="dotTextel"
      text="Dot Text"
      color="red"
      :clear="clear"
      font-size="100"
      font-weight="5"
      ma
      m-b-20
    />
    <dot-text text="Hi,Simon" color="grey" font-size="50" font-weight="10" ma />
    <Footer />
  </main>
</template>

<style scoped></style>
