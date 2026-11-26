<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  existingKeys: { type: Array, default: () => [] },
  initialDate: { type: String, default: '' },
  busy: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'confirm', 'update:items'])

const localItems = ref([])
const startDate = ref('')
let draggingId = null

watch(
  () => [props.visible, props.items, props.initialDate],
  () => {
    if (!props.visible) return
    localItems.value = props.items.map(item => ({ ...item }))
    startDate.value = props.initialDate || todayKey()
    assignMissingDates()
  },
  { deep: true, immediate: true }
)

function todayKey() {
  return toKey(new Date())
}
function toKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}
function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}
function nextKey(key) {
  const date = fromKey(key)
  date.setDate(date.getDate() + 1)
  return toKey(date)
}
function assignMissingDates() {
  const occupied = new Set(props.existingKeys)
  for (const item of localItems.value) {
    if (item.shotDate && item.targetDate) occupied.add(item.targetDate)
  }
  let cursor = startDate.value || todayKey()
  for (const item of localItems.value) {
    if (item.shotDate || item.error) continue
    while (occupied.has(cursor)) cursor = nextKey(cursor)
    item.targetDate = cursor
    occupied.add(cursor)
    cursor = nextKey(cursor)
  }
  emit('update:items', localItems.value.map(item => ({ ...item })))
}
watch(startDate, () => assignMissingDates())

const occupiedSet = computed(() => new Set(props.existingKeys))
const duplicateKeys = computed(() => {
  const counts = new Map()
  for (const item of localItems.value) {
    if (item.targetDate) counts.set(item.targetDate, (counts.get(item.targetDate) || 0) + 1)
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key))
})
const invalidCount = computed(() => localItems.value.filter(item =>
  item.error || !item.targetDate || occupiedSet.value.has(item.targetDate) || duplicateKeys.value.has(item.targetDate)
).length)
const readyCount = computed(() => localItems.value.length - invalidCount.value)

function updateItem(index, field, value) {
  localItems.value[index][field] = value
  emit('update:items', localItems.value.map(item => ({ ...item })))
}
function moveItem(from, to) {
  if (to < 0 || to >= localItems.value.length || from === to) return
  const next = [...localItems.value]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  localItems.value = next
  assignMissingDates()
}
function onDragStart(event, id) {
  draggingId = id
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', id)
}
function onDrop(event, targetId) {
  event.preventDefault()
  const id = draggingId || event.dataTransfer.getData('text/plain')
  const from = localItems.value.findIndex(item => item.id === id)
  const to = localItems.value.findIndex(item => item.id === targetId)
  if (from >= 0 && to >= 0) moveItem(from, to)
  draggingId = null
}
function onPointerDown(event, id) {
  if (event.pointerType === 'mouse') return
  draggingId = id
  event.currentTarget.setPointerCapture?.(event.pointerId)
}
function onPointerMove(event) {
  if (!draggingId || event.pointerType === 'mouse') return
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-batch-id]')
  const targetId = target?.getAttribute('data-batch-id')
  if (!targetId || targetId === draggingId) return
  const from = localItems.value.findIndex(item => item.id === draggingId)
  const to = localItems.value.findIndex(item => item.id === targetId)
  if (from >= 0 && to >= 0) {
    moveItem(from, to)
    draggingId = targetId
  }
}
function onPointerUp() {
  draggingId = null
}
function formatShotDate(value) {
  if (!value) return ''
  const d = new Date(value)
  return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'
}
function confirm() {
  if (invalidCount.value || props.busy) return
  emit('confirm', localItems.value.map(item => ({ ...item })))
}
onBeforeUnmount(() => { draggingId = null })
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="batch-mask" @click.self="$emit('close')">
      <section class="batch-sheet">
        <header class="batch-header">
          <div>
            <h2>批量导入照片</h2>
            <p>检查日期，调整顺序后再一次性加入月历</p>
          </div>
          <button class="close" :disabled="busy" @click="$emit('close')">×</button>
        </header>

        <div class="batch-summary">
          <strong>{{ items.length }} 张照片</strong>
          <span>可导入 {{ readyCount }} 张</span>
          <span v-if="invalidCount" class="warning">{{ invalidCount }} 张需要处理</span>
        </div>

        <div class="start-date">
          <label for="batch-start-date">无拍摄日期的照片，从这一天开始连续安排</label>
          <input id="batch-start-date" v-model="startDate" type="date" />
        </div>

        <p class="batch-tip">有拍摄日期的照片优先按拍摄日期安排；没有日期的按当前顺序填入空日期。拖动照片可调整顺序，也可以直接修改日期。</p>

        <div class="batch-list" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp">
          <article
            v-for="(item, index) in localItems"
            :key="item.id"
            class="batch-item"
            :data-batch-id="item.id"
            :class="{ invalid: item.error || !item.targetDate || occupiedSet.has(item.targetDate) || duplicateKeys.has(item.targetDate) }"
            @dragover.prevent
            @drop="onDrop($event, item.id)"
          >
            <div
              class="drag-handle"
              title="拖动调整顺序"
              draggable="true"
              @dragstart="onDragStart($event, item.id)"
              @pointerdown="onPointerDown($event, item.id)"
            >⠿</div>
            <img :src="item.previewUrl" alt="" />
            <div class="item-info">
              <strong>{{ item.name }}</strong>
              <small v-if="item.shotDate">拍摄日期：{{ formatShotDate(item.shotDate) }}</small>
              <small v-else>未读取到拍摄日期 · 按顺序安排</small>
              <small v-if="item.error" class="warning">{{ item.error }}</small>
              <small v-else-if="item.targetDate && occupiedSet.has(item.targetDate)" class="warning">这一天已有照片，请换一个日期</small>
              <small v-else-if="item.targetDate && duplicateKeys.has(item.targetDate)" class="warning">导入列表中有重复日期，请调整</small>
            </div>
            <input
              class="target-date"
              type="date"
              :value="item.targetDate || ''"
              :aria-label="'为' + item.name + '设置日期'"
              @change="updateItem(index, 'targetDate', $event.target.value)"
            />
            <div class="reorder">
              <button :disabled="index === 0" aria-label="上移" @click="moveItem(index, index - 1)">↑</button>
              <button :disabled="index === localItems.length - 1" aria-label="下移" @click="moveItem(index, index + 1)">↓</button>
            </div>
          </article>
        </div>

        <footer class="batch-actions">
          <button class="secondary" :disabled="busy" @click="$emit('close')">取消</button>
          <button class="primary" :disabled="busy || invalidCount > 0 || !localItems.length" @click="confirm">
            {{ busy ? '正在处理…' : '确认导入 ' + readyCount + ' 张' }}
          </button>
        </footer>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.batch-mask { position: fixed; inset: 0; z-index: 180; background: rgba(0,0,0,.52); display: flex; align-items: flex-end; justify-content: center; }
.batch-sheet { width: 100%; max-width: 620px; max-height: 92vh; overflow: auto; background: #fff; color: #222; border-radius: 18px 18px 0 0; padding: 18px 18px calc(18px + env(safe-area-inset-bottom)); box-sizing: border-box; }
.batch-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
.batch-header h2 { font-size:18px; margin:0 0 5px; }
.batch-header p { color:#888; font-size:12px; margin:0; }
.close { border:0; background:#f3f3f3; border-radius:50%; width:32px; height:32px; font-size:22px; }
.batch-summary { display:flex; gap:14px; align-items:center; flex-wrap:wrap; font-size:12px; color:#777; margin:16px 0 12px; }
.batch-summary strong { color:#222; font-size:14px; }
.warning { color:#d66a35 !important; }
.start-date { display:flex; justify-content:space-between; align-items:center; gap:10px; padding:12px; background:#f7f7f7; border-radius:10px; font-size:12px; }
.start-date input,.target-date { min-width:0; border:1px solid #ddd; border-radius:7px; padding:7px; font:inherit; color:#333; background:#fff; }
.batch-tip { font-size:12px; line-height:1.6; color:#888; margin:10px 0; }
.batch-list { display:flex; flex-direction:column; gap:8px; max-height:42vh; overflow:auto; padding:2px; }
.batch-item { display:grid; grid-template-columns:24px 52px minmax(0,1fr) auto 26px; align-items:center; gap:9px; border:1px solid #eee; border-radius:10px; padding:8px; min-width:0; }
.batch-item.invalid { border-color:#e8b69e; background:#fffaf7; }
.drag-handle { color:#999; font-size:21px; text-align:center; cursor:grab; touch-action:none; user-select:none; }
.batch-item img { width:52px; height:52px; object-fit:cover; border-radius:6px; background:#eee; }
.item-info { min-width:0; display:flex; flex-direction:column; gap:3px; }
.item-info strong { font-size:12px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.item-info small { font-size:10px; color:#888; }
.target-date { width:130px; font-size:11px; }
.reorder { display:flex; flex-direction:column; gap:3px; }
.reorder button { width:25px; height:22px; border:0; border-radius:5px; background:#f2f2f2; color:#555; }
.reorder button:disabled { opacity:.25; }
.batch-actions { display:flex; gap:10px; margin-top:14px; }
.batch-actions button { border:0; border-radius:10px; padding:13px; font-size:14px; }
.batch-actions .secondary { flex:1; background:#f2f2f2; color:#333; }
.batch-actions .primary { flex:2; background:#222; color:#fff; }
.batch-actions button:disabled { opacity:.4; }
@media (max-width:420px) {
  .batch-item { grid-template-columns:20px 44px minmax(0,1fr) 26px; gap:7px; }
  .batch-item img { width:44px; height:44px; }
  .target-date { grid-column:3 / 4; width:100%; box-sizing:border-box; }
  .reorder { grid-column:4; grid-row:1 / span 2; }
  .start-date { align-items:flex-start; flex-direction:column; }
}
</style>
