<script setup>
defineProps({
  visible: { type: Boolean, default: false }
})
defineEmits(['replace', 'view', 'delete', 'close'])
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="mask" @click="$emit('close')">
      <div class="sheet" @click.stop>
        <button class="item" @click="$emit('view')">查看大图</button>
        <button class="item" @click="$emit('replace')">更换照片</button>
        <button class="item danger" @click="$emit('delete')">删除照片</button>
        <button class="item cancel" @click="$emit('close')">取消</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet {
  width: 100%;
  max-width: 560px;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}
.item {
  border: none;
  background: transparent;
  padding: 16px;
  font-size: 16px;
  color: #333;
  border-bottom: 1px solid #f2f2f2;
  cursor: pointer;
}
.item:last-child {
  border-bottom: none;
}
.item.danger {
  color: #e54;
}
.item.cancel {
  color: #888;
  margin-top: 6px;
}
</style>