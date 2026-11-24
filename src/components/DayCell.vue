<script setup>
const props = defineProps({
  cell: { type: Object, required: true },
  photo: { type: Object, default: null },
  filterCss: { type: String, default: 'none' },
  borderColor: { type: String, default: '#eeeeee' },
  textColor: { type: String, default: '#333333' }
})
const emit = defineEmits(['cell-click'])

function onClick() {
  if (props.cell.type !== 'day') return
  emit('cell-click', props.cell.dateKey)
}
</script>

<template>
  <div v-if="cell.type === 'empty'" class="cell empty" />
  <div
    v-else
    class="cell day"
    :class="{ today: cell.isToday }"
    :style="cell.isToday ? null : { borderColor }"
    @click="onClick"
  >
    <img v-if="photo" :src="photo.url" class="photo" :style="{ filter: filterCss }" alt="" />
    <span
      class="day-num"
      :class="{ 'with-photo': photo }"
      :style="photo ? null : { color: textColor }"
    >{{ cell.day }}</span>
  </div>
</template>

<style scoped>
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
  color: #333;
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.9);
  pointer-events: none;
}
.day-num.with-photo {
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}
</style>