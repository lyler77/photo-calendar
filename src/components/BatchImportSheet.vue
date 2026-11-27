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
  () => [props.visible, props.initialDate],
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

  // 手动指定的日期始终保留；自动日期则按当前分配模式重新计算
  for (const item of localItems.value) {
    if (item.manualDate && item.targetDate) occupied.add(item.targetDate)
    else if (item.shotDate && !item.error) {
      item.targetDate = item.shotDate
      occupied.add(item.targetDate)
    } else {
      item.targetDate = ''
    }
  }

  let cursor = startDate.value || todayKey()
  for (const item of localItems.value) {
    if (item.error || item.manualDate || item.shotDate) continue
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
  if (field === 'targetDate') {
    localItems.value[index].manualDate = !!value
    assignMissingDates()
    return
  }
  emit('update:items', localItems.value.map(item => ({ ...item })))
}
function removeItem(index) {
  if (props.busy) return
  localItems.value.splice(index, 1)
  assignMissingDates()
}
function moveItem(from, to) {
  if (to < 0 || to >= localItems.value.length || from === to) return
  if (localItems.value[from]?.error || localItems.value[to]?.error) return
  const next = [...localItems.value]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  localItems.value = next
  assignMissingDates()
}
function onDragStart(event, id) {
  if (localItems.value.find(item => item.id === id)?.error) {
    event.preventDefault()
    return
  }
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
  if (event.pointerType === 'mouse' || localItems.value.find(item => item.id === id)?.error || event.target.closest('button, input')) return
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
  if (from >= 0 && to >= 0) moveItem(from, to)
}
function onPointerUp() {
  draggingId = null
}
function formatShotDate(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  return year + '年' + month + '月' + day + '日'
}
function confirm() {
  if (invalidCount.value || props.busy || !localItems.value.length) return
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
            <p>检查日期、调整顺序，确认后加入月历</p>
          </div>
          <button class="close" :disabled="busy" @click="$emit('close')">×</button>
        </header>

        <div class="batch-summary">
          <strong>{{ localItems.length }} 张照片</strong>
          <span>可导入 {{ readyCount }} 张</span>
          <span v-if="invalidCount" class="warning">{{ invalidCount }} 张需要处理</span>
        </div>

        <section class="date-options">
          <div class="option-heading">日期安排</div>
          <div class="date-control">
            <label for="batch-start-date">无拍摄日期的照片，从这天开始</label>
            <input id="batch-start-date" v-model="startDate" type="date" :disabled="busy" />
          </div>
          <p>有拍摄日期的照片会优先按原日期放置；其余照片按选择顺序填入空日期。</p>
        </section>

        <div class="batch-tip">按住照片行并拖动可调整顺序，也可以直接修改日期。已有照片的日期不会被覆盖。</div>

        <div class="batch-list" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp">
          <article
            v-for="(item, index) in localItems"
            :key="item.id"
            class="batch-item"
            :data-batch-id="item.id"
            :draggable="!item.error && !busy"
            @dragstart="onDragStart($event, item.id)"
            @pointerdown="onPointerDown($event, item.id)"
            :class="{ invalid: item.error || !item.targetDate || occupiedSet.has(item.targetDate) || duplicateKeys.has(item.targetDate), unsupported: item.error }"
            @dragover.prevent
            @drop="onDrop($event, item.id)"
          >
            <img v-if="item.previewUrl" :src="item.previewUrl" alt="" />
            <div v-else class="image-placeholder">!</div>
            <div class="item-info">
              <strong>{{ item.name }}</strong>
              <small v-if="item.error" class="warning">{{ item.error }}</small>
              <small v-else-if="item.shotDate">拍摄日期：{{ formatShotDate(item.shotDate) }}</small>
              <small v-else>未读取到拍摄日期</small>
              <small v-if="!item.error && item.targetDate && occupiedSet.has(item.targetDate)" class="warning">这一天已有照片，请换一个日期</small>
              <small v-else-if="!item.error && item.targetDate && duplicateKeys.has(item.targetDate)" class="warning">导入列表中有重复日期，请调整</small>
            </div>
            <input
              class="target-date"
              type="date"
              :value="item.targetDate || ''"
              :disabled="!!item.error || busy"
              :aria-label="'为' + item.name + '设置日期'"
              @change="updateItem(index, 'targetDate', $event.target.value)"
            />
            <button class="remove" :disabled="busy" aria-label="从本次导入中删除" title="从本次导入中删除" @click="removeItem(index)">×</button>
          </article>
          <p v-if="!localItems.length" class="empty-list">没有待导入的照片了</p>
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
.batch-mask { position:fixed; inset:0; z-index:180; background:rgba(0,0,0,.48); display:flex; align-items:flex-end; justify-content:center; }
.batch-sheet { width:100%; max-width:620px; max-height:92vh; overflow:auto; background:#fff; color:#222; border-radius:16px 16px 0 0; padding:18px 18px calc(18px + env(safe-area-inset-bottom)); box-sizing:border-box; }
.batch-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
.batch-header h2 { font-size:18px; margin:0 0 5px; font-weight:600; }
.batch-header p { color:#888; font-size:12px; margin:0; }
.close { border:0; background:#f3f3f3; border-radius:50%; width:32px; height:32px; font-size:22px; color:#555; }
.batch-summary { display:flex; gap:14px; align-items:center; flex-wrap:wrap; font-size:12px; color:#777; margin:16px 0 12px; }
.batch-summary strong { color:#222; font-size:14px; }
.warning { color:#c65d3a !important; }
.date-options { padding:12px; border:1px solid #eee; border-radius:10px; }
.option-heading { font-size:12px; font-weight:600; margin-bottom:9px; }
.date-control { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.date-options label { font-size:11px; color:#777; }
.date-options input { width:145px; border:1px solid #ddd; border-radius:7px; padding:6px 8px; font:inherit; color:#333; background:#fff; font-size:12px; }
.date-options p { font-size:10px; line-height:1.45; color:#888; margin:7px 0 0; }
.batch-tip { font-size:11px; line-height:1.6; color:#888; margin:10px 0; }
.batch-list { display:flex; flex-direction:column; gap:8px; max-height:38vh; overflow:auto; padding:2px; }
.batch-item { display:grid; grid-template-columns:52px minmax(0,1fr) auto 28px; align-items:center; gap:9px; border:1px solid #eee; border-radius:10px; padding:8px; min-width:0; cursor:grab; user-select:none; }
.batch-item:active { cursor:grabbing; }
.batch-item[draggable="true"] { -webkit-user-drag:element; }
.batch-item.invalid { border-color:#e6b49d; background:#fffaf7; }
.batch-item.unsupported { background:#fafafa; border-style:dashed; }
.batch-item img,.image-placeholder { width:52px; height:52px; object-fit:cover; border-radius:6px; background:#eee; }
.image-placeholder { display:flex; align-items:center; justify-content:center; color:#c65d3a; font-weight:600; }
.item-info { min-width:0; display:flex; flex-direction:column; gap:3px; }
.item-info strong { font-size:12px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.item-info small { font-size:10px; color:#888; line-height:1.4; }
.target-date { width:130px; min-width:0; border:1px solid #ddd; border-radius:7px; padding:7px; font:inherit; color:#333; background:#fff; font-size:11px; }
.target-date:disabled { opacity:.35; }
.remove { width:27px; height:27px; border:0; border-radius:7px; background:#fff0eb; color:#b75a3b; font-size:17px; }
.empty-list { text-align:center; color:#999; font-size:12px; padding:20px 0; }
.batch-actions { display:flex; gap:10px; margin-top:14px; }
.batch-actions button { border:0; border-radius:10px; padding:13px; font-size:14px; }
.batch-actions .secondary { flex:1; background:#f2f2f2; color:#333; }
.batch-actions .primary { flex:2; background:#222; color:#fff; }
.batch-actions button:disabled { opacity:.4; }
@media (max-width:420px) {
  .batch-item { grid-template-columns:44px minmax(0,1fr) 28px; gap:7px; }
  .batch-item img,.image-placeholder { width:44px; height:44px; }
  .target-date { grid-column:2 / 3; width:100%; box-sizing:border-box; }
  .remove { grid-column:3; grid-row:1 / span 2; }
}
</style>