<script setup>
defineProps({
  url: { type: String, default: '' }
})
defineEmits(['close'])
</script>

<template>
  <Transition name="fade">
    <div v-if="url" class="viewer" @click="$emit('close')">
      <img :src="url" alt="" />
      <button class="close" @click.stop="$emit('close')">×</button>
    </div>
  </Transition>
</template>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}
.viewer img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.close {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  cursor: pointer;
  /* 新增：强制居中修复变形 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 24px;
  line-height: 1;
}
</style>