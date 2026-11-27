<script setup>
import { ref, computed, watch } from 'vue'
import { readShotTime } from '../composables/useExif'
import { formatDateKey } from '../composables/useCalendar'
import { compressImage } from '../composables/useImage' // 引入压缩/解码方法用于验证格式

const props = defineProps({
  visible: { type: Boolean, default: false },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  existingPhotos: { type: Object, required: true }
})
const emit = defineEmits(['close', 'confirm'])

const fileInput = ref(null)
const loading = ref(false)
const parsedFiles = ref([]) 
const startDay = ref(1)
const coverExisting = ref(false) // 新增：是否覆盖已有照片

const daysInMonth = computed(() => new Date(props.year, props.month, 0).getDate())

watch(() => props.visible, (val) => {
  if (val) {
    parsedFiles.value = []
    startDay.value = new Date().getDate()
    coverExisting.value = false
  }
})

// 核心分配算法
function assignDates() {
  parsedFiles.value.forEach(item => {
    item.assignedKey = ''
    item.isLocked = false
    item.isSkipped = false
  })

  // 如果勾选了覆盖，初始占用集合为空（无视已有照片）
  const usedKeys = coverExisting.value ? new Set() : new Set(Object.keys(props.existingPhotos))

  // 第一轮：有 EXIF 的直接放入对应日期
  parsedFiles.value.forEach(item => {
    if (item.isValid && item.exifDate) {
      const y = item.exifDate.getFullYear()
      const m = item.exifDate.getMonth() + 1
      const d = item.exifDate.getDate()
      const key = formatDateKey(y, m, d)
      
      if (!usedKeys.has(key)) {
        item.assignedKey = key
        item.isLocked = true
        usedKeys.add(key)
      } else if (coverExisting.value) {
        // 覆盖模式下，强行占用
        item.assignedKey = key
        item.isLocked = true
        item.isSkipped = !!props.existingPhotos[key] // 标记一下是覆盖了原有的
      } else {
        // 没开启覆盖，且日期已被占，标记为跳过，进入顺延
        item.isSkipped = true
      }
    }
  })

  // 第二轮：无 EXIF，或者原定日期被占用的，从起点日向后顺延
  let currY = props.year
  let currM = props.month
  let currD = Number(startDay.value)
  if (isNaN(currD) || currD < 1) currD = 1

  parsedFiles.value.forEach(item => {
    if (item.isValid && !item.assignedKey) {
      while (true) {
        const daysInCurrM = new Date(currY, currM, 0).getDate()
        if (currD > daysInCurrM) {
          currD = 1
          currM++
          if (currM > 12) {
            currM = 1
            currY++
          }
          continue
        }

        const key = formatDateKey(currY, currM, currD)
        if (!usedKeys.has(key)) {
          item.assignedKey = key
          usedKeys.add(key)
          currD++
          break
        }
        currD++
      }
    }
  })
}

function onFileChange(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  fileInput.value = '' 
  
  loading.value = true
  const processFiles = async () => {
    const results = []
    for (const file of files) {
      let shot = null
      let previewUrl = ''
      let isValid = false
      let errorMsg = ''

      try {
        // 1. 真实尝试压缩解码（限制到 200px 极小尺寸，只为了验证格式是否能被浏览器解开）
        const compressed = await compressImage(file, 200)
        previewUrl = URL.createObjectURL(compressed.blob)
        isValid = true
        // 2. 只有有效图片才去读 EXIF
        shot = await readShotTime(file)
      } catch (err) {
        isValid = false
        errorMsg = '浏览器不支持该格式或图片已损坏'
      }

      results.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        url: previewUrl,
        isValid,
        errorMsg,
        exifDate: shot,
        isLocked: false,
        isSkipped: false
      })
    }
    parsedFiles.value = results
    loading.value = false
    assignDates()
  }
  processFiles()
}

function removeItem(id) {
  const item = parsedFiles.value.find(f => f.id === id)
  if (item?.url) URL.revokeObjectURL(item.url)
  parsedFiles.value = parsedFiles.value.filter(f => f.id !== id)
  assignDates()
}

function onConfirm() {
  // 只提交有效且分配了日期的照片
  const ready = parsedFiles.value.filter(f => f.isValid && f.assignedKey)
  if (!ready.length) {
    alert('没有可导入的有效照片')
    return
  }
  emit('confirm', ready.map(f => ({ dateKey: f.assignedKey, file: f.file })))
  parsedFiles.value.forEach(f => f.url && URL.revokeObjectURL(f.url))
}

function formatDisplayDate(key) {
  if (!key) return ''
  const [y, m, d] = key.split('-')
  const cy = new Date().getFullYear()
  if (Number(y) === cy) return `${Number(m)}月${Number(d)}日`
  return `${y}年${Number(m)}月${Number(d)}日`
}
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="mask" @click="$emit('close')">
      <div class="sheet" @click.stop>
        <div class="handle" />
        <h3>批量导入照片</h3>
        
        <div v-if="!parsedFiles.length" class="upload-zone" @click="fileInput?.click()">
          <div class="icon">+</div>
          <p>点击选择多张照片</p>
          <p class="sub">自动识别拍摄日期并填入</p>
        </div>
        <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onFileChange" />

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          正在校验并解析照片…
        </div>

        <div v-if="parsedFiles.length && !loading" class="result-zone">
          <div class="control-bar">
            <div class="setting-row">
              <span>无日期照片从</span>
              <select v-model="startDay" @change="assignDates">
                <option v-for="d in daysInMonth" :key="d" :value="d">{{ d }} 日</option>
              </select>
              <span>开始填</span>
            </div>
            <label class="checkbox-row">
              <input type="checkbox" v-model="coverExisting" @change="assignDates">
              覆盖目标日期已有照片
            </label>
          </div>

          <div class="list">
            <div v-for="(item, index) in parsedFiles" :key="item.id" class="item" :class="{ 'is-error': !item.isValid }">
              <div class="index">{{ index + 1 }}</div>
              
              <img v-if="item.url" :src="item.url" class="thumb" />
              <div v-else class="thumb fallback">ERR</div>

              <div class="info">
                <p class="filename">{{ item.name }}</p>
                <p class="status" :class="{ warn: !item.isLocked && item.isValid, error: !item.isValid }">
                  <template v-if="!item.isValid">
                    ❌ {{ item.errorMsg }}
                  </template>
                  <template v-else-if="item.assignedKey">
                    <template v-if="item.isLocked">
                      <span v-if="item.isSkipped">🔄 覆盖填入 {{ formatDisplayDate(item.assignedKey) }}</span>
                      <span v-else>✅ 匹配拍摄日，填入 {{ formatDisplayDate(item.assignedKey) }}</span>
                    </template>
                    <template v-else>
                      ➡️ 顺延分配至 {{ formatDisplayDate(item.assignedKey) }}
                      <span v-if="item.isSkipped" class="exif-hint">
                        (原拍摄于 {{ formatDisplayDate(formatDateKey(item.exifDate.getFullYear(), item.exifDate.getMonth() + 1, item.exifDate.getDate())) }}，该日已有图)
                      </span>
                    </template>
                  </template>
                  <template v-else>❌ 无法分配</template>
                </p>
              </div>
              <button class="rm-btn" @click="removeItem(item.id)">×</button>
            </div>
          </div>
        </div>

        <div class="actions" v-if="parsedFiles.length && !loading">
          <button class="btn primary" @click="onConfirm">
            确认导入 ({{ parsedFiles.filter(f => f.isValid && f.assignedKey).length }} 张)
          </button>
          <button class="btn" @click="$emit('close')">取消</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* 样式在原有基础上微调 */
.mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }
.sheet { width: 100%; max-width: 560px; background: #fff; border-radius: 16px 16px 0 0; padding: 8px 18px calc(16px + env(safe-area-inset-bottom)); max-height: 90vh; display: flex; flex-direction: column; }
.handle { width: 36px; height: 4px; background: #ddd; border-radius: 2px; margin: 6px auto 10px; }
h3 { text-align: center; font-size: 15px; color: #333; margin: 4px 0 14px; }
.upload-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 160px; border: 2px dashed #ddd; border-radius: 12px; background: #fafafa; cursor: pointer; margin-bottom: 20px; }
.icon { font-size: 30px; color: #ccc; margin-bottom: 8px; line-height: 1; }
.upload-zone p { margin: 0; font-size: 14px; color: #555; }
.upload-zone .sub { font-size: 12px; color: #999; margin-top: 4px; }
.loading-state { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 40px; color: #888; font-size: 14px; }
.spinner { width: 20px; height: 20px; border: 2px solid #eee; border-top-color: #ff6b6b; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.result-zone { flex: 1; overflow-y: auto; margin-bottom: 14px; }
.control-bar { background: #f5f5f5; padding: 12px; border-radius: 8px; font-size: 13px; color: #333; margin-bottom: 12px; position: sticky; top: 0; z-index: 10; display: flex; flex-direction: column; gap: 10px; }
.setting-row { display: flex; align-items: center; gap: 6px; }
.control-bar select { padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; outline: none; }
.checkbox-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #555; cursor: pointer; }
.checkbox-row input { margin: 0; }
.list { display: flex; flex-direction: column; gap: 10px; }
.item { display: flex; align-items: center; gap: 12px; padding: 8px; background: #fff; border: 1px solid #f0f0f0; border-radius: 8px; }
.item.is-error { background: #fffafa; border-color: #fee; }
.index { width: 20px; font-size: 12px; color: #999; text-align: center; }
.thumb { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
.thumb.fallback { background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #e54; font-weight: 600; border: 1px solid #e5e5e5; }
.info { flex: 1; min-width: 0; }
.filename { margin: 0 0 4px; font-size: 13px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status { margin: 0; font-size: 12px; color: #22a06b; line-height: 1.4; }
.status.warn { color: #888; }
.status.error { color: #e54; }
.exif-hint { font-size: 11px; opacity: 0.8; margin-left: 4px; display: block; margin-top: 2px; color: #666; }
.rm-btn { width: 28px; height: 28px; border: none; background: #f5f5f5; border-radius: 50%; color: #999; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.actions { display: flex; gap: 10px; margin-top: auto; padding-top: 10px; }
.btn { flex: 1; padding: 14px; border: none; border-radius: 10px; font-size: 15px; cursor: pointer; background: #f2f2f2; color: #333; }
.btn.primary { flex: 2; background: #ff6b6b; color: #fff; font-weight: 600; }
</style>