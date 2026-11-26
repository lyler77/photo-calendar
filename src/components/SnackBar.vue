<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  message: { type: String, default: '' },
  actionLabel: { type: String, default: '' }
})
defineEmits(['action', 'close'])
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="snackbar-wrapper">
      <div class="snackbar" @click="$emit('close')">
        <span class="msg">{{ message }}</span>
        <button v-if="actionLabel" class="action" @click.stop="$emit('action')">{{ actionLabel }}</button>
        <button class="close" @click.stop="$emit('close')">×</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.snackbar-wrapper {
  position: fixed;
  /* 改成距离底部 90px，不挡按钮也不挡顶部 */
  bottom: calc(90px + env(safe-area-inset-bottom));
  left: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  z-index: 300;
  pointer-events: none;
}
.snackbar {
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  max-width: calc(100vw - 32px);
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  pointer-events: auto;
  cursor: pointer;
}
.msg {
  flex: 1;
  min-width: 0;
  line-height: 1.5;
  word-break: break-word;
}
.action {
  border: none;
  background: transparent;
  color: #7ec8ff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 6px;
  white-space: nowrap;
  flex-shrink: 0;
}
.close {
  border: none;
  background: transparent;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  opacity: 0.7;
  flex-shrink: 0;
}
</style>