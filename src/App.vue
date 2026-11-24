<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import CalendarGrid from './components/CalendarGrid.vue'
import PhotoActionSheet from './components/PhotoActionSheet.vue'
import PhotoViewer from './components/PhotoViewer.vue'
import SnackBar from './components/SnackBar.vue'
import StyleDrawer from './components/StyleDrawer.vue'
import { buildMonthGrid, prevMonth, nextMonth, formatDateKey } from './composables/useCalendar'
import { usePhotos } from './composables/usePhotos'
import { useStyle, TEMPLATES, FILTERS } from './composables/useStyle'
import { readShotTime } from './composables/useExif'

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const busy = ref(false)

const fileInput = ref(null)
const pickingDateKey = ref('')
const selectedDateKey = ref('')
const viewingUrl = ref('')
const styleDrawerVisible = ref(false)

const snackbar = ref(null)
let snackbarTimer = null

const {
  style,
  applyTemplate,
  setBackgroundColor,
  setFilter,
  applyLoaded,
  getSnapshot
} = useStyle()

const { photos, init, addPhoto, removePhoto, scheduleSave } = usePhotos({
  yearRef: year,
  monthRef: month,
  getStyleSnapshot: getSnapshot,
  onSaveError: err => {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      showSnackbar('存储空间不足，请导出后清理浏览器数据', '', null, 4000)
    } else {
      console.warn('保存草稿失败', err)
    }
  }
})

const currentTemplate = computed(() => TEMPLATES[style.templateId] || TEMPLATES['minimal-white'])
const currentFilterCss = computed(() => FILTERS[style.filter]?.css || 'none')

const cells = computed(() => buildMonthGrid(year.value, month.value))
const filledCount = computed(() =>
  Object.keys(photos).filter(k => {
    const [y, m] = k.split('-').map(Number)
    return y === year.value && m === month.value
  }).length
)

onMounted(async () => {
  const loadedStyle = await init()
  if (loadedStyle) applyLoaded(loadedStyle)
})

watch([year, month], () => {
  scheduleSave()
})

watch(
  () => ({ ...style }),
  () => {
    scheduleSave()
    document.body.style.backgroundColor = style.backgroundColor
  },
  { deep: true, immediate: true }
)

function goPrev() {
  const r = prevMonth(year.value, month.value)
  year.value = r.year
  month.value = r.month
}
function goNext() {
  const r = nextMonth(year.value, month.value)
  year.value = r.year
  month.value = r.month
}
function goToday() {
  const d = new Date()
  year.value = d.getFullYear()
  month.value = d.getMonth() + 1
}

function showSnackbar(message, actionLabel = '', onAction = null, duration = 5000) {
  snackbar.value = { message, actionLabel, onAction }
  clearTimeout(snackbarTimer)
  if (duration > 0) {
    snackbarTimer = setTimeout(() => (snackbar.value = null), duration)
  }
}
function closeSnackbar() {
  snackbar.value = null
  clearTimeout(snackbarTimer)
}
function onSnackbarAction() {
  const s = snackbar.value
  closeSnackbar()
  if (s?.onAction) s.onAction()
}

function openPicker(dateKey) {
  pickingDateKey.value = dateKey
  fileInput.value?.click()
}
function onCellClick(dateKey) {
  if (photos[dateKey]) selectedDateKey.value = dateKey
  else openPicker(dateKey)
}
function onReplace() {
  const key = selectedDateKey.value
  selectedDateKey.value = ''
  if (key) openPicker(key)
}
function onView() {
  viewingUrl.value = photos[selectedDateKey.value]?.url || ''
  selectedDateKey.value = ''
}
function onDelete() {
  const key = selectedDateKey.value
  selectedDateKey.value = ''
  if (!key) return
  removePhoto(key)
  showSnackbar('已删除', '', null, 1600)
}

function dayOf(dateKey) {
  return Number(dateKey.split('-')[2])
}

function movePhoto(fromKey, toKey) {
  const fromPhoto = photos[fromKey]
  if (!fromPhoto) return
  if (photos[toKey]) {
    if (!confirm('目标日期已有照片，确定替换吗？')) return
    removePhoto(toKey)
  }
  photos[toKey] = fromPhoto
  delete photos[fromKey]
  scheduleSave()
  showSnackbar('已移到对应日期', '', null, 1600)
}

async function onFileChange(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  const dateKey = pickingDateKey.value
  pickingDateKey.value = ''
  if (!f || !dateKey) return
  busy.value = true
  try {
    const shot = await readShotTime(f)
    await addPhoto(dateKey, f)

    if (!shot) {
      showSnackbar('未读取到拍摄时间，已放入当前格', '', null, 2400)
      return
    }
    const shotKey = formatDateKey(shot.getFullYear(), shot.getMonth() + 1, shot.getDate())
    if (shotKey === dateKey) {
      showSnackbar('已填入', '', null, 1400)
      return
    }
    const [sy, sm, sd] = shotKey.split('-').map(Number)
    const sameMonth = sy === year.value && sm === month.value
    if (sameMonth) {
      showSnackbar(
        `这张拍摄于 ${sm}月${sd}日，已放入 ${month.value}月${dayOf(dateKey)}日`,
        `移到 ${sm}月${sd}日`,
        () => movePhoto(dateKey, shotKey)
      )
    } else {
      showSnackbar(`这张拍摄于 ${sy}年${sm}月${sd}日，已放入当前格`, '', null, 3600)
    }
  } catch (err) {
    showSnackbar('这张图暂时无法识别，请在相册里截图或转成 JPEG 再选', '', null, 3600)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="app">
    <header class="header">
      <button class="nav-btn" :style="{ color: currentTemplate.textColor }" @click="goPrev">‹</button>
      <div class="title-wrap" @click="goToday">
        <div class="title" :style="{ color: currentTemplate.textColor }">{{ year }} 年 {{ month }} 月</div>
        <div class="subtitle" :style="{ color: currentTemplate.weekLabelColor }">已填 {{ filledCount }} 天</div>
      </div>
      <button class="nav-btn" :style="{ color: currentTemplate.textColor }" @click="goNext">›</button>
    </header>

    <p class="hint" :style="{ color: currentTemplate.weekLabelColor }">点空白格子选图；点已有照片可查看、更换或删除</p>

    <CalendarGrid
      :cells="cells"
      :photos="photos"
      :filter-css="currentFilterCss"
      :border-color="currentTemplate.cellBorderColor"
      :text-color="currentTemplate.textColor"
      :week-label-color="currentTemplate.weekLabelColor"
      @cell-click="onCellClick"
    />

    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />

    <p class="footer-note" :style="{ color: currentTemplate.weekLabelColor }">作品保存在本机浏览器，清除浏览器数据会丢失</p>

    <div class="bottom-bar">
      <button class="bar-btn" @click="styleDrawerVisible = true">样式</button>
    </div>

    <StyleDrawer
      :visible="styleDrawerVisible"
      :style="style"
      @apply-template="applyTemplate"
      @set-bg="setBackgroundColor"
      @set-filter="setFilter"
      @close="styleDrawerVisible = false"
    />

    <PhotoActionSheet
      :visible="!!selectedDateKey"
      @view="onView"
      @replace="onReplace"
      @delete="onDelete"
      @close="selectedDateKey = ''"
    />

    <PhotoViewer :url="viewingUrl" @close="viewingUrl = ''" />

    <SnackBar
      :visible="!!snackbar"
      :message="snackbar?.message || ''"
      :action-label="snackbar?.actionLabel || ''"
      @action="onSnackbarAction"
      @close="closeSnackbar"
    />

    <div v-if="busy" class="float-tip">处理中…</div>
  </main>
</template>

<style scoped>
.app {
  max-width: 560px;
  margin: 0 auto;
  padding: 12px 14px 100px;
  font-family: -apple-system, 'PingFang SC', sans-serif;
  color: #222;
  min-height: 100vh;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.nav-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 10px;
  font-size: 22px;
  cursor: pointer;
  backdrop-filter: blur(6px);
}
.title-wrap {
  text-align: center;
  flex: 1;
  cursor: pointer;
}
.title {
  font-size: 18px;
  font-weight: 600;
}
.subtitle {
  font-size: 12px;
  margin-top: 2px;
}
.hint {
  font-size: 12px;
  text-align: center;
  margin: 4px 0 10px;
}
.footer-note {
  font-size: 11px;
  text-align: center;
  margin-top: 16px;
}
.bottom-bar {
  position: fixed;
  left: 50%;
  bottom: calc(16px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 50;
}
.bar-btn {
  padding: 12px 28px;
  border: none;
  border-radius: 24px;
  background: rgba(0, 0, 0, 0.82);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.float-tip {
  position: fixed;
  left: 50%;
  bottom: 90px;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 10px 18px;
  border-radius: 20px;
  font-size: 13px;
  max-width: 80vw;
  text-align: center;
  z-index: 10;
}
</style>