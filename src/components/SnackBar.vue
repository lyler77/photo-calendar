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
    <div v-if="visible" class="snackbar">
      <span class="msg">{{ message }}</span>
      <button v-if="actionLabel" class="action" @click="$emit('action')">{{ actionLabel }}</button>
      <button class="close" @click="$emit('close')">×</button>
    </div>
  </Transition>
</template>

<style scoped>
.snackbar {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  max-width: calc(100vw - 32px);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 300;
}
.msg {
  flex: 1;
  line-height: 1.4;
}
.action {
  border: none;
  background: transparent;
  color: #7ec8ff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 6px;
  white-space: nowrap;
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
}
</style>