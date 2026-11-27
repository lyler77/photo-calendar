<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import CalendarGrid from './components/CalendarGrid.vue'
import PhotoActionSheet from './components/PhotoActionSheet.vue'
import PhotoViewer from './components/PhotoViewer.vue'
import SnackBar from './components/SnackBar.vue'
import StyleDrawer from './components/StyleDrawer.vue'
import ExportSheet from './components/ExportSheet.vue'
import BatchImportSheet from './components/BatchImportSheet.vue'
import FirstUseGuide from './components/FirstUseGuide.vue'
import { buildMonthGrid, prevMonth, nextMonth, formatDateKey } from './composables/useCalendar'
import { usePhotos } from './composables/usePhotos'
import { useStyle, TEMPLATES, FILTERS } from './composables/useStyle'
import { readShotTime } from './composables/useExif'
import { renderMonth, renderYear } from './composables/useExport'
import { track } from './composables/useTrack'
import { compressImage, loadBitmap } from './composables/useImage'

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)

const batchFileInput = ref(null)
const batchVisible = ref(false)
const batchBusy = ref(false)
const batchItems = ref([])
const guideVisible = ref(false)
const batchAnchorDate = ref('')
const batchInitialDate = ref('')
const selectedDateKey = ref('')
const viewingUrl = ref('')
const styleDrawerVisible = ref(false)
const monthPickerValue = ref(year.value + '-' + String(month.value).padStart(2, '0'))
const isCurrentMonth = computed(() => {
  const current = new Date()
  return year.value === current.getFullYear() && month.value === current.getMonth() + 1
})

const exportVisible = ref(false)
const exportLoading = ref(false)
const exportError = ref('')
const exportPreviewUrl = ref('')
const exportType = ref('month')

const snackbar = ref(null)
let snackbarTimer = null

const {
  style, applyTemplate, setBackgroundColor, setFilter,
  setBackgroundImage, setOverlayOpacity, removeBackgroundImage,
  applyLoaded, getSnapshot
} = useStyle()

const { photos, init, addPreparedPhotos, removePhoto, scheduleSave } = usePhotos({
  yearRef: year,
  monthRef: month,
  getStyleSnapshot: getSnapshot,
  onSaveError: err => {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      showSnackbar('存储空间不足，请导出作品后清理浏览器数据', '', null, 4000)
    } else {
      showSnackbar('草稿保存失败，请及时导出作品备份', '', null, 4000)
    }
  }
})

const currentTemplate = computed(() => TEMPLATES[style.templateId] || TEMPLATES['minimal-white'])
const currentFilterCss = computed(() => FILTERS[style.filter]?.css || 'none')
const hasBgImage = computed(() => !!style.backgroundImageUrl)
const themeTextColor = computed(() => hasBgImage.value ? '#ffffff' : currentTemplate.value.textColor)
const themeSubColor = computed(() => hasBgImage.value ? 'rgba(255,255,255,0.7)' : currentTemplate.value.weekLabelColor)

const cells = computed(() => buildMonthGrid(year.value, month.value))
onMounted(async () => {
  track('app_open')
  const loadedStyle = await init()
  if (loadedStyle) applyLoaded(loadedStyle)
  try {
    guideVisible.value = Object.keys(photos).length === 0 &&
      localStorage.getItem('photo_calendar_guide_seen') !== '1'
  } catch {
    guideVisible.value = Object.keys(photos).length === 0
  }
})

onBeforeUnmount(() => {
  if (exportPreviewUrl.value) URL.revokeObjectURL(exportPreviewUrl.value)
})

watch([year, month], () => {\n  monthPickerValue.value = year.value + '-' + String(month.value).padStart(2, '0')\n  scheduleSave()\n})

watch(
  () => ({ ...style }),
  () => {
    scheduleSave()
    document.body.style.backgroundColor = hasBgImage.value ? '#000' : style.backgroundColor
  },
  { deep: true, immediate: true }
)

function goPrev() {
  const r = prevMonth(year.value, month.value)
  year.value = r.year
  month.value = r.month
  track('month_switch', { type: 'prev' })
}
function goNext() {
  const r = nextMonth(year.value, month.value)
  year.value = r.year
  month.value = r.month
  track('month_switch', { type: 'next' })
}
function goToday() {
  const d = new Date()
  year.value = d.getFullYear()
  month.value = d.getMonth() + 1
  monthPickerValue.value = year.value + '-' + String(month.value).padStart(2, '0')
}
function onMonthChange() {
  if (!/^\\d{4}-\\d{2}$/.test(monthPickerValue.value)) return
  const [y, m] = monthPickerValue.value.split('-').map(Number)
  if (m < 1 || m > 12) return
  year.value = y
  month.value = m
}

function showSnackbar(message, actionLabel = '', onAction = null, duration = 2500) {
  snackbar.value = { message, actionLabel, onAction }
  clearTimeout(snackbarTimer)
  if (duration > 0) snackbarTimer = setTimeout(() => (snackbar.value = null), duration)
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
  batchAnchorDate.value = dateKey
  batchInitialDate.value = dateKey
  batchFileInput.value?.click()
}

function openBatchPicker() {
  const firstDay = year.value + '-' + String(month.value).padStart(2, '0') + '-01'
  batchAnchorDate.value = firstDay
  batchInitialDate.value = firstDay
  batchFileInput.value?.click()
}

function dismissGuide() {
  guideVisible.value = false
  try {
    localStorage.setItem('photo_calendar_guide_seen', '1')
  } catch {
    // 浏览器禁用本地存储时，不影响照片月历的使用
  }
}
function startFromGuide() {
  dismissGuide()
  openBatchPicker()
}

function releaseBatchPreviews() {
  for (const item of batchItems.value) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  }
  batchItems.value = []
}

async function onBatchFileChange(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  if (!files.length) return

  releaseBatchPreviews()
  showSnackbar('正在读取 ' + files.length + ' 张照片…', '', null, 10000)

  // 每张图片独立检查解码能力；单张不支持不会影响其他照片
  const results = await Promise.all(files.map(async (file, index) => {
    const id = 'batch-' + Date.now() + '-' + index
    const name = file.name || ('照片 ' + (index + 1))
    try {
      if (file.type && !file.type.startsWith('image/')) {
        throw new Error('不是受支持的图片文件')
      }
      const bitmap = await loadBitmap(file)
      if (bitmap?.close) bitmap.close()
      const shotDate = await readShotTime(file)
      return {
        id,
        file,
        name,
        previewUrl: URL.createObjectURL(file),
        shotDate: shotDate ? formatDateKey(shotDate.getFullYear(), shotDate.getMonth() + 1, shotDate.getDate()) : '',
        targetDate: '',
        manualDate: false,
        error: ''
      }
    } catch (error) {
      return {
        id,
        file,
        name,
        previewUrl: '',
        shotDate: '',
        targetDate: '',
        manualDate: false,
        error: '格式暂不支持或图片已损坏，请移除后换用 JPG、PNG 或 WebP'
      }
    }
  }))

  batchItems.value = results
  batchVisible.value = true
  closeSnackbar()
}

function updateBatchItems(items) {
  const nextUrls = new Set(items.map(item => item.previewUrl).filter(Boolean))
  for (const item of batchItems.value) {
    if (item.previewUrl && !nextUrls.has(item.previewUrl)) URL.revokeObjectURL(item.previewUrl)
  }
  batchItems.value = items
}

function closeBatch() {
  if (batchBusy.value) return
  batchVisible.value = false
  releaseBatchPreviews()
}

async function confirmBatchImport(items) {
  const seen = new Set()
  for (const item of items) {
    if (
      item.error ||
      !item.targetDate ||
      (photos[item.targetDate] && !item.replaceExisting) ||
      seen.has(item.targetDate)
    ) {
      showSnackbar('请移除不支持的图片，并处理日期冲突后再导入')
      return
    }
    seen.add(item.targetDate)
  }

  batchBusy.value = true
  showSnackbar('正在处理照片，请稍候…', '', null, 10000)
  try {
    const results = await Promise.all(items.map(async item => {
      try {
        const image = await compressImage(item.file, 2000)
        return { dateKey: item.targetDate, ...image, error: '' }
      } catch (error) {
        return { dateKey: item.targetDate, error: error?.message || '图片处理失败' }
      }
    }))
    const succeeded = results.filter(item => !item.error)
    if (succeeded.length) {
      addPreparedPhotos(succeeded)
      dismissGuide()
    }
    const failed = results.length - succeeded.length
    track('photo_batch_import', { count: succeeded.length, failed })
    batchVisible.value = false
    releaseBatchPreviews()
    showSnackbar(
      failed ? '成功导入 ' + succeeded.length + ' 张，' + failed + ' 张处理失败' : '已导入 ' + succeeded.length + ' 张照片',
      '', null, 3500
    )
  } catch (err) {
    console.error('批量导入失败', err)
    showSnackbar('照片处理失败，请减少数量或检查图片格式后重试', '', null, 4000)
  } finally {
    batchBusy.value = false
  }
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
  track('photo_delete')
  showSnackbar('已删除', '', null, 1500)
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
  showSnackbar('已移到对应日期', '', null, 1500)
}


async function onUploadBg(file) {
  showSnackbar('背景图处理中…', '', null, 3000)
  try {
    await setBackgroundImage(file)
    track('upload_bg')
    showSnackbar('背景图已更新', '', null, 1500)
  } catch (err) {
    showSnackbar('背景图加载失败，请换一张试试', '', null, 3000)
  }
}

// --- 导出逻辑 ---

async function doGenerateExport() {
  exportLoading.value = true
  exportError.value = ''
  if (exportPreviewUrl.value) {
    URL.revokeObjectURL(exportPreviewUrl.value)
    exportPreviewUrl.value = ''
  }
  try {
    let res
    if (exportType.value === 'month') {
      res = await renderMonth({
        year: year.value, month: month.value, cells: cells.value, photos,
        style, template: currentTemplate.value, filterCss: currentFilterCss.value
      })
      track('export_single')
    } else {
      res = await renderYear({
        year: year.value, photos,
        style, template: currentTemplate.value, filterCss: currentFilterCss.value,
        layout: exportType.value === 'year-h' ? 'h' : 'v'
      })
      track(exportType.value === 'year-h' ? 'export_year_h' : 'export_year_v')
    }
    exportPreviewUrl.value = URL.createObjectURL(res.blob)
    track('export_success', { type: exportType.value })
  } catch (err) {
    exportError.value = err.message || '导出失败，请重试'
  } finally {
    exportLoading.value = false
  }
}

function openExport() {
  exportVisible.value = true
  doGenerateExport()
}

function onChangeExportType(type) {
  if (exportType.value === type) return
  exportType.value = type
  doGenerateExport()
}

function saveExport() {
  if (!exportPreviewUrl.value) return
  const a = document.createElement('a')
  a.href = exportPreviewUrl.value
  const suffix = exportType.value === 'month' ? '单月' : (exportType.value === 'year-h' ? '全年横版' : '全年竖版')
  a.download = `照片月历-${year.value}年-${suffix}.jpg`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  track('save_click', { type: exportType.value })
  showSnackbar('已触发保存，iPhone 请用长按图片保存到相册', '', null, 3000)
}

async function copyCaption() {
  const period = exportType.value === 'month'
    ? `${year.value}年${month.value}月`
    : `${year.value}年`
  const text = `我的 ${period}照片月历｜把相册里的日子拼回来了 📅✨\n#照片月历 #生活记录`
  try {
    await navigator.clipboard.writeText(text)
    track('caption_copy')
    showSnackbar('文案已复制，快去小红书发布吧！')
  } catch (err) {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      track('caption_copy')
      showSnackbar('文案已复制，快去小红书发布吧！')
    } catch (e) {
      showSnackbar('复制失败，请手动截图或输入')
    }
    document.body.removeChild(ta)
  }
}

function showPrivacy() {
  alert('照片和作品只保存在你当前使用的手机或电脑浏览器中，不会上传到服务器。清理浏览器数据或更换设备可能导致作品丢失，建议及时导出保存。')
}
</script>

<template>
  <div
    class="bg-layer"
    :style="hasBgImage ? { backgroundImage: `url(${style.backgroundImageUrl})` } : null"
  />
  <div
    class="bg-overlay"
    v-if="hasBgImage"
    :style="{ backgroundColor: `rgba(0, 0, 0, ${style.backgroundOverlayOpacity})` }"
  />

  <main class="app">
    <header class="header">
      <button class="nav-btn" :style="{ color: themeTextColor }" @click="goPrev">‹</button>
      <label class="title-wrap">
        <span class="title" :style="{ color: themeTextColor }">{{ year }} 年 {{ month }} 月</span>
        <input
          class="month-title-input"
          type="month"
          :value="monthPickerValue"
          aria-label="选择年月"
          @change="monthPickerValue = $event.target.value; onMonthChange()"
        />
      </label>
      <button class="nav-btn" :style="{ color: themeTextColor }" @click="goNext">›</button>
    </header>
    <div v-if="!isCurrentMonth" class="today-row">
      <button class="today-link" @click="goToday">回到本月</button>
    </div>

    <CalendarGrid
      :cells="cells"
      :photos="photos"
      :filter-css="currentFilterCss"
      :border-color="currentTemplate.cellBorderColor"
      :text-color="currentTemplate.textColor"
      :week-label-color="themeSubColor"
      :has-bg-image="hasBgImage"
      @cell-click="onCellClick"
    />

    <div class="import-actions">
      <button class="batch-import-btn" @click="openBatchPicker">添加照片</button>
      <button class="help-link" :style="{ color: themeSubColor }" @click="guideVisible = true">使用说明</button>
    </div>
    <input ref="batchFileInput" type="file" accept="image/*" multiple hidden @change="onBatchFileChange" />

    <p class="footer-note" :style="{ color: themeSubColor }">
      作品仅保存在本机浏览器，<span style="text-decoration:underline;cursor:pointer" @click="showPrivacy">隐私说明</span>
    </p>

    <div class="bottom-bar">
      <button class="bar-btn" @click="styleDrawerVisible = true">样式</button>
      <button class="bar-btn primary" @click="openExport">导出</button>
    </div>

    <FirstUseGuide
      :visible="guideVisible"
      :background-color="style.backgroundColor"
      :text-color="currentTemplate.textColor"
      :muted-color="currentTemplate.weekLabelColor"
      :border-color="currentTemplate.cellBorderColor"
      :has-bg-image="hasBgImage"
      @start="startFromGuide"
      @close="dismissGuide"
    />

    <BatchImportSheet
      :visible="batchVisible"
      :items="batchItems"
      :existing-keys="Object.keys(photos)"
      :initial-date="batchInitialDate"
      :anchor-date="batchAnchorDate"
      :busy="batchBusy"
      @update:items="updateBatchItems"
      @confirm="confirmBatchImport"
      @close="closeBatch"
    />

    <StyleDrawer
      :visible="styleDrawerVisible"
      :style="style"
      @apply-template="applyTemplate"
      @set-bg="setBackgroundColor"
      @set-filter="setFilter"
      @upload-bg="onUploadBg"
      @set-overlay="setOverlayOpacity"
      @remove-bg="removeBackgroundImage"
      @close="styleDrawerVisible = false"
    />

    <ExportSheet
      :visible="exportVisible"
      :loading="exportLoading"
      :preview-url="exportPreviewUrl"
      :error="exportError"
      :export-type="exportType"
      @change-type="onChangeExportType"
      @save="saveExport"
      @copy="copyCaption"
      @close="exportVisible = false"
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
  </main>
</template>

<style scoped>
.bg-layer { position:fixed; inset:0; background-size:cover; background-position:center; z-index:-2; }
.bg-overlay { position:fixed; inset:0; z-index:-1; }
.app { max-width:560px; margin:0 auto; padding:12px 14px 120px; font-family:-apple-system,'PingFang SC',sans-serif; color:#222; min-height:100vh; }
.header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }

.nav-btn { display:flex; align-items:center; justify-content:center; flex:0 0 40px; width:40px; height:40px; padding:0; line-height:1; border:1px solid rgba(128,128,128,.16); -webkit-appearance:none; appearance:none; background:rgba(255,255,255,.4); border-radius:10px; font-family:inherit; font-size:22px; cursor:pointer; backdrop-filter:blur(6px); box-sizing:border-box; }
.title-wrap { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; flex:1; min-width:0; min-height:40px; padding:0; border:0; background:transparent; font:inherit; cursor:pointer; }
.title { font-size:18px; line-height:1.35; font-weight:600; pointer-events:none; }
.month-title-input { position:absolute; inset:0; width:100%; height:100%; opacity:.001; border:0; padding:0; margin:0; cursor:pointer; }
.today-row { display:flex; justify-content:center; margin:-2px 0 8px; }
.today-link { border:0; background:transparent; color:#888; padding:3px 8px; font:inherit; font-size:11px; cursor:pointer; }
.import-actions { display:flex; flex-direction:column; align-items:center; gap:7px; margin:10px 0 12px; }
.help-link { border:0; background:transparent; padding:3px 8px; font-size:11px; cursor:pointer; opacity:.8; }
.batch-import-btn { border:1px solid rgba(128,128,128,.35); background:rgba(255,255,255,.55); color:inherit; padding:7px 14px; border-radius:18px; font-size:12px; cursor:pointer; }
.footer-note { font-size:11px; text-align:center; margin-top:16px; }
.bottom-bar { position:fixed; left:50%; bottom:calc(16px + env(safe-area-inset-bottom)); transform:translateX(-50%); z-index:50; display:flex; gap:10px; }
.bar-btn { padding:12px 28px; border:none; border-radius:24px; background:rgba(0,0,0,.82); color:#fff; font-size:14px; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,.2); }
.bar-btn.primary { background:#ff6b6b; }
</style>