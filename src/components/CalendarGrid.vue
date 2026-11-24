<script setup>
import DayCell from './DayCell.vue'

defineProps({
  cells: { type: Array, required: true },
  photos: { type: Object, required: true },
  filterCss: { type: String, default: 'none' },
  borderColor: { type: String, default: '#eeeeee' },
  textColor: { type: String, default: '#333333' },
  weekLabelColor: { type: String, default: '#888888' }
})
defineEmits(['cell-click'])

const weekLabels = ['一', '二', '三', '四', '五', '六', '日']
</script>

<template>
  <div class="grid">
    <div
      v-for="(w, i) in weekLabels"
      :key="'w' + i"
      class="week-label"
      :style="{ color: weekLabelColor }"
    >{{ w }}</div>
    <DayCell
      v-for="(cell, i) in cells"
      :key="i"
      :cell="cell"
      :photo="cell.type === 'day' ? photos[cell.dateKey] : null"
      :filter-css="filterCss"
      :border-color="borderColor"
      :text-color="textColor"
      @cell-click="$emit('cell-click', $event)"
    />
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.week-label {
  text-align: center;
  font-size: 12px;
  padding: 4px 0;
}
</style>