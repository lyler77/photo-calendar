<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  existingKeys: { type: Array, default: () => [] },
  initialDate: { type: String, default: '' },
  anchorDate: { type: String, default: '' },
  busy: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'confirm', 'update:items'])

const localItems = ref([])
const startDate = ref('')
const placementMode = ref('replace')

watch(
  () => [props.visible, props.initialDate, props.anchorDate],
  () => {
    if (!props.visible) return
    localItems.value = props.items.map(item => ({ ...item }))
    placementMode.value = 'replace'
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
function isReplacement(item) {
  return !!(
    item &&
    props.anchorDate &&
    placementMode.value === 'replace' &&
    props.existingKeys.includes(item.targetDate)
  )
}

function emitItems() {
  emit('update:items', localItems.value.map(item => ({
    ...item,
    replaceExisting: isReplacement(item)
  })))
}

function assignMissingDates() {
  const occupied = new Set(props.existingKeys)

  if (props.anchorDate) {
    // 从指定日期格发起批量导入时，按用户选择顺序连续安排，
    // 默认允许替换经过的已有日期；切换为“仅放入空格”时跳过已有日期。
    let cursor = props.anchorDate
    const reserved = new Set()
    for (const item of localItems.value) {
      if (item.error) {
        item.targetDate = ''
        continue
      }
      if (item.manualDate && item.targetDate) {
        // 手动指定的日期始终保持不变；重复日期交由校验提示，不自动挪动。
        reserved.add(item.targetDate)
        continue
      }
      if (placementMode.value === 'skip') {
        while (occupied.has(cursor) || reserved.has(cursor)) cursor = nextKey(cursor)
      } else {
        while (reserved.has(cursor)) cursor = nextKey(cursor)
      }
      item.targetDate = cursor
      reserved.add(cursor)
      cursor = nextKey(cursor)
    }
    emitItems()
    return
  }

  // 普通“添加照片”入口：保留 EXIF 日期优先，无日期照片填入空日期。
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
  emitItems()
}
watch(startDate, () => { if (!props.anchorDate) assignMissingDates() })
watch(placementMode, () => { if (props.anchorDate) assignMissingDates() })

const occupiedSet = computed(() => new Set(props.existingKeys))
const propsAnchorMode = computed(() => !!props.anchorDate)
const duplicateKeys = computed(() => {
  const counts = new Map()
  for (const item of localItems.value) {
    if (item.targetDate) counts.set(item.targetDate, (counts.get(item.targetDate) || 0) + 1)
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key))
})
const invalidCount = computed(() => localItems.value.filter(item =>
  item.error ||
  !item.targetDate ||
  (occupiedSet.value.has(item.targetDate) && !isReplacement(item)) ||
  duplicateKeys.value.has(item.targetDate)
).length)
const readyCount = computed(() => localItems.value.length - invalidCount.value)
const errorCount = computed(() => localItems.value.filter(item => item.error).length)

function updateItem(index, field, value) {
  localItems.value[index][field] = value
  if (field === 'targetDate') {
    // 修改一张照片的日期，不联动重排其他照片。
    localItems.value[index].manualDate = !!value
    emitItems()
    return
  }
  emitItems()
}
function removeItem(index) {
  if (props.busy) return
  localItems.value.splice(index, 1)
  assignMissingDates()
}
function removeErrorItems() {
  if (props.busy || !errorCount.value) return
  localItems.value = localItems.value.filter(item => !item.error)
  assignMissingDates()
}
function formatShotDate(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  return year + '年' + month + '月' + day + '日'
}
function confirm() {
  if (invalidCount.value || props.busy || !localItems.value.length) return
  emit('confirm', localItems.value.map(item => ({
    ...item,
    replaceExisting: isReplacement(item)
  })))
}

</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="batch-mask" @click.self="$emit('close')">
      <section class="batch-sheet">
        <header class="batch-header">
          <div>
            <h2>添加照片</h2>
          </div>
          <button class="close" :disabled="busy" @click="$emit('close')">×</button>
        </header>

        <div class="batch-summary">
          <strong>{{ localItems.length }} 张</strong>
          <span v-if="invalidCount" class="warning">{{ invalidCount }} 张需要调整，问题已标在照片下方</span>
          <button v-if="errorCount" class="remove-errors" :disabled="busy" @click="removeErrorItems">
            移除无法读取的 {{ errorCount }} 张
          </button>
        </div>

        <section class="date-options">
          <div v-if="anchorDate" class="placement-switch">
            <button :class="{ active: placementMode === 'replace' }" @click="placementMode = 'replace'">替换已有照片</button>
            <button :class="{ active: placementMode === 'skip' }" @click="placementMode = 'skip'">只放入空格</button>
          </div>
          <div v-if="!anchorDate" class="date-control">
            <label for="batch-start-date">无拍摄日期，从</label>
            <input id="batch-start-date" v-model="startDate" type="date" :disabled="busy" />
          </div>
        </section>

        <div class="batch-list">
          <article
            v-for="(item, index) in localItems"
            :key="item.id"
            class="batch-item"
            :class="{ invalid: item.error || !item.targetDate || duplicateKeys.has(item.targetDate) || (occupiedSet.has(item.targetDate) && !isReplacement(item)), unsupported: item.error }"
          >
            <img v-if="item.previewUrl" :src="item.previewUrl" alt="" />
            <div v-else class="image-placeholder">!</div>
            <div class="item-info">
              <small v-if="item.error" class="warning">{{ item.error }}</small>
              <small v-else>
                {{ item.shotDate ? '拍摄于 ' + formatShotDate(item.shotDate) : '未读到拍摄日期' }}<template v-if="item.targetDate && duplicateKeys.has(item.targetDate)"> · <span class="warning">与其他照片日期重复，请修改</span></template><template v-else-if="item.targetDate && occupiedSet.has(item.targetDate) && !isReplacement(item)"> · <span class="warning">该日期已有照片，请选择替换或其他日期</span></template><template v-else-if="isReplacement(item)"> · <span class="replace-notice">将替换原照片</span></template>
              </small>
            </div>
            <input
              class="target-date"
              type="date"
              :value="item.targetDate || ''"
              :disabled="!!item.error || busy"
              :aria-label="'安排日期'"
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
.batch-header { display:flex; justify-content:space-between; align-items:center; gap:12px; }
.batch-header h2 { font-size:18px; margin:0; font-weight:600; }
.close { display:grid; place-items:center; flex:0 0 34px; width:34px; height:34px; box-sizing:border-box; padding:0; margin:0; border:0; -webkit-appearance:none; appearance:none; background:#f3f3f3; border-radius:50%; font-family:Arial,sans-serif; font-size:21px; font-weight:400; line-height:1; color:#555; text-align:center; }
.batch-summary { display:flex; gap:14px; align-items:center; flex-wrap:wrap; font-size:12px; color:#777; margin:16px 0 12px; }
.batch-summary strong { color:#222; font-size:14px; }
.remove-errors { margin-left:auto; border:0; padding:5px 0; background:transparent; color:#b75a3b; font:inherit; font-size:11px; white-space:nowrap; }
.remove-errors:disabled { opacity:.45; }
.warning { color:#c65d3a !important; }
.replace-notice { color:#b35b35 !important; font-weight:600; }
.date-options { margin:4px 0 10px; }
.placement-switch { display:flex; gap:6px; }
.placement-switch button { flex:1; border:1px solid #ddd; border-radius:8px; padding:9px 8px; background:#fff; color:#555; font-size:12px; }
.placement-switch button.active { border-color:#222; background:#222; color:#fff; }
.date-control { display:flex; align-items:center; justify-content:flex-start; gap:10px; }
.date-control label { font-size:11px; color:#777; }
.date-control input { width:145px; border:1px solid #ddd; border-radius:7px; padding:6px 8px; font:inherit; color:#333; background:#fff; font-size:12px; }
.batch-list { display:flex; flex:0 1 auto; flex-direction:column; gap:8px; min-height:0; max-height:48vh; overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; padding:2px; }
.batch-item { display:grid; flex:0 0 auto; grid-template-columns:48px minmax(0,1fr) 132px 32px; align-items:center; gap:9px; min-width:0; min-height:66px; box-sizing:border-box; border:1px solid #eee; border-radius:10px; padding:8px; }
.batch-item.invalid { border-color:#e6b49d; background:#fffaf7; }
.batch-item.unsupported { background:#fafafa; border-style:dashed; }
.batch-item img,.image-placeholder { display:block; width:48px; height:48px; object-fit:cover; border-radius:6px; background:#eee; }
.image-placeholder { display:flex; align-items:center; justify-content:center; color:#c65d3a; font-weight:600; }
.item-info { min-width:0; display:flex; flex-direction:column; gap:3px; overflow:hidden; }
.item-info small { display:block; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; color:#888; line-height:1.35; }
.target-date { width:100%; min-width:0; box-sizing:border-box; border:1px solid #ddd; border-radius:7px; padding:7px 5px; font:inherit; color:#333; background:#fff; font-size:12px; }
.target-date:disabled { opacity:.35; }
.remove { display:grid; place-items:center; width:30px; height:30px; box-sizing:border-box; padding:0; margin:0; border:0; -webkit-appearance:none; appearance:none; border-radius:8px; background:#fff0eb; color:#b75a3b; font-family:Arial,sans-serif; font-size:18px; line-height:1; text-align:center; }
.empty-list { text-align:center; color:#999; font-size:12px; padding:20px 0; }
.batch-actions { display:flex; gap:10px; margin-top:14px; }
.batch-actions button { border:0; border-radius:10px; padding:13px; font-size:14px; }
.batch-actions .secondary { flex:1; background:#f2f2f2; color:#333; }
.batch-actions .primary { flex:2; background:#222; color:#fff; }
.batch-actions button:disabled { opacity:.4; }
@media (max-width:620px) {
  .batch-sheet { padding-left:14px; padding-right:14px; }
  .batch-list { max-height:48vh; }
  .batch-item {
    flex:0 0 auto;
    grid-template-columns:42px minmax(0,1fr) 32px;
    grid-template-rows:auto auto;
    align-content:center;
    align-items:center;
    column-gap:8px;
    row-gap:4px;
    min-height:72px;
    padding:9px;
  }
  .batch-item > img,.batch-item > .image-placeholder {
    grid-column:1;
    grid-row:1 / span 2;
    align-self:center;
  }
  .batch-item .item-info {
    grid-column:2;
    grid-row:1;
    align-self:center;
    min-width:0;
    min-height:16px;
  }
  .batch-item .target-date {
    grid-column:2;
    grid-row:2;
    width:100%;
    min-width:0;
    align-self:center;
    font-size:13px;
    padding:6px 7px;
    -webkit-appearance:none;
    appearance:none;
  }
  .batch-item .remove {
    grid-column:3;
    grid-row:1 / span 2;
    align-self:center;
    justify-self:center;
    width:32px;
    height:32px;
  }
  .batch-item img,.image-placeholder { width:42px; height:42px; }
  .item-info small { font-size:11px; line-height:1.25; }
}
</style>