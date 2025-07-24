<script setup lang="ts">
defineOptions({
  name: "zy-video-view",
});
// 添加 props 的默认值
const props = defineProps<{ msg?: string }>(); // 将 msg 设为可选
</script>

<template>
  <h1>{{ props.msg || "默认消息" }}</h1>
  <!-- 添加默认消息 -->
  <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
</template>
