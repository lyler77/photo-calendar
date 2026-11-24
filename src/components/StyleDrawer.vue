<script setup>
import { computed } from 'vue'
import { TEMPLATES, TEMPLATE_COLORS, FILTERS } from '../composables/useStyle'

const props = defineProps({
  visible: { type: Boolean, default: false },
  style: { type: Object, required: true }
})
const emit = defineEmits(['apply-template', 'set-bg', 'set-filter', 'close'])

const templates = Object.entries(TEMPLATES).map(([id, t]) => ({ id, ...t }))
const filters = Object.entries(FILTERS).map(([id, f]) => ({ id, ...f }))
const colors = computed(() => TEMPLATE_COLORS[props.style.templateId] || [])
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="mask" @click="$emit('close')">
      <div class="sheet" @click.stop>
        <div class="handle" />

        <section>
          <h3>模板</h3>
          <div class="row">
            <button
              v-for="t in templates"
              :key="t.id"
              class="template-card"
              :class="{ active: style.templateId === t.id }"
              @click="$emit('apply-template', t.id)"
            >
              <span class="swatch" :style="{ backgroundColor: t.backgroundColor, borderColor: t.cellBorderColor }" />
              <span class="label">{{ t.name }}</span>
            </button>
          </div>
        </section>

        <section>
          <h3>背景色</h3>
          <div class="row">
            <button
              v-for="c in colors"
              :key="c"
              class="color-dot"
              :class="{ active: style.backgroundColor === c }"
              :style="{ backgroundColor: c }"
              @click="$emit('set-bg', c)"
            />
          </div>
        </section>

        <section>
          <h3>照片滤镜</h3>
          <div class="row">
            <button
              v-for="f in filters"
              :key="f.id"
              class="chip"
              :class="{ active: style.filter === f.id }"
              @click="$emit('set-filter', f.id)"
            >{{ f.name }}</button>
          </div>
        </section>

        <button class="done" @click="$emit('close')">完成</button>
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
  padding: 8px 18px calc(16px + env(safe-area-inset-bottom));
  max-height: 80vh;
  overflow-y: auto;
}
.handle {
  width: 36px;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  margin: 6px auto 10px;
}
section {
  margin: 14px 0;
}
h3 {
  font-size: 13px;
  color: #888;
  font-weight: 500;
  margin: 0 0 10px;
}
.row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.template-card {
  flex: 1;
  min-width: 90px;
  border: 2px solid transparent;
  background: #fafafa;
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.template-card.active {
  border-color: #ff6b6b;
}
.swatch {
  width: 100%;
  height: 40px;
  border-radius: 6px;
  border: 1px solid #eee;
}
.label {
  font-size: 12px;
  color: #333;
}
.color-dot {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid #eee;
  cursor: pointer;
  padding: 0;
}
.color-dot.active {
  border-color: #ff6b6b;
  box-shadow: 0 0 0 2px #fff inset;
}
.chip {
  padding: 8px 16px;
  border-radius: 18px;
  border: 1px solid #eee;
  background: #fafafa;
  font-size: 13px;
  color: #333;
  cursor: pointer;
}
.chip.active {
  background: #222;
  color: #fff;
  border-color: #222;
}
.done {
  width: 100%;
  margin-top: 12px;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: #222;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
}
</style>