<script setup>
import { computed } from 'vue'

const props = defineProps({
  cell: { type: Object, required: true },
  photo: { type: Object, default: null },
  filterCss: { type: String, default: 'none' },
  borderColor: { type: String, default: '#eeeeee' },
  textColor: { type: String, default: '#333333' },
  hasBgImage: { type: Boolean, default: false }
})
const emit = defineEmits(['cell-click'])

function onClick() {
  if (props.cell.type !== 'day') return
  emit('cell-click', props.cell.dateKey)
}

const customStyle = computed(() => {
  if (props.hasBgImage) {
    // 有背景图时，当天格子也使用半透明背景，同时保留红色日期边框
    return {
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderColor: props.cell.isToday ? '#ff6b6b' : 'rgba(255,255,255,0.3)'
    }
  }
  if (props.cell.isToday) return {} // 无背景图时由 today class 保留红色边框
  return { borderColor: props.borderColor, backgroundColor: '#ffffff' }
})

const textStyle = computed(() => {
  if (props.photo) return {} // 有照片时强制白色
  if (props.hasBgImage) return { color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }
  return { color: props.textColor }
})
</script>

<template>
  <div v-if="cell.type === 'empty'" class="cell empty" />
  <div
    v-else
    class="cell day"
    :class="{ today: cell.isToday }"
    :style="customStyle"
    @click="onClick"
  >
    <img v-if="photo" :src="photo.url" class="photo" :style="{ filter: filterCss }" alt="" />
    <span
      class="day-num"
      :class="{ 'with-photo': photo }"
      :style="textStyle"
    >{{ cell.day }}</span>
  </div>
</template>

<style scoped>
/* 样式保持完全一致，不用改 */
.cell {
  position: relative;
  aspect-ratio: 1 / 1;
  border: 1px solid #eee;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.cell.empty {
  background: transparent;
  border-color: transparent;
}
.cell.day {
  cursor: pointer;
}
.cell.day:active {
  transform: scale(0.98);
}
.cell.today {
  border-color: #ff6b6b;
  border-width: 2px;
}
.photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.day-num {
  position: absolute;
  top: 4px;
  left: 6px;
  font-size: 12px;
  pointer-events: none;
}
.day-num.with-photo {
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}
</style>