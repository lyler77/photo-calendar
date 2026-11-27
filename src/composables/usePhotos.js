import { reactive, ref, onBeforeUnmount } from 'vue'
import { compressImage } from './useImage'
import { loadProject, saveProject } from './useDraftDB'

export function usePhotos({ yearRef, monthRef, getStyleSnapshot, onSaveError } = {}) {
  const photos = reactive({})
  const ready = ref(false)
  const loadError = ref(null)
  let saveTimer = null
  let loading = true
  let saveQueue = Promise.resolve()

  async function init() {
    let loadedStyle = null
    try {
      const project = await loadProject()
      if (project) {
        for (const [key, entry] of Object.entries(project.entries || {})) {
          photos[key] = {
            blob: entry.blob,
            url: URL.createObjectURL(entry.blob),
            width: entry.width,
            height: entry.height
          }
        }
        if (project.year && yearRef) yearRef.value = project.year
        if (project.month && monthRef) monthRef.value = project.month
        loadedStyle = project.style || null
      }
    } catch (e) {
      loadError.value = e
      console.error('加载本地作品失败，已暂停自动保存以保护原数据', e)
    } finally {
      ready.value = true
      setTimeout(() => { loading = false }, 0)
    }
    return loadedStyle
  }

  function doSave() {
    if (loadError.value) return Promise.resolve()
    // 串行写入 IndexedDB；每次真正执行时再读取最新状态，
    // 避免较早发起的异步保存晚到并覆盖更新的照片/背景状态。
    saveQueue = saveQueue.catch(() => {}).then(async () => {
      const entries = {}
      for (const [key, p] of Object.entries(photos)) {
        entries[key] = { blob: p.blob, width: p.width, height: p.height }
      }
      await saveProject({
        year: yearRef?.value,
        month: monthRef?.value,
        entries,
        style: getStyleSnapshot ? getStyleSnapshot() : null
      })
    })

    return saveQueue.catch(err => {
      if (onSaveError) onSaveError(err)
      else console.warn('保存草稿失败', err)
    })
  }

  function scheduleSave() {
    if (loading || !ready.value || loadError.value) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveTimer = null
      doSave()
    }, 300)
  }

  function flushSave() {
    if (loading || !ready.value || loadError.value) return Promise.resolve()
    clearTimeout(saveTimer)
    saveTimer = null
    return doSave()
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') flushSave()
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flushSave)
  }

  async function addPhoto(dateKey, file) {
    const { blob, width, height } = await compressImage(file, 2000)
    if (photos[dateKey]?.url) {
      URL.revokeObjectURL(photos[dateKey].url)
    }
    photos[dateKey] = {
      blob,
      url: URL.createObjectURL(blob),
      width,
      height
    }
    scheduleSave()
    return photos[dateKey]
  }

  function addPreparedPhotos(entries) {
    // 所有图片已在调用方完成压缩；这里一次性写入并只触发一次草稿保存
    for (const entry of entries) {
      if (photos[entry.dateKey]?.url) URL.revokeObjectURL(photos[entry.dateKey].url)
      photos[entry.dateKey] = {
        blob: entry.blob,
        url: URL.createObjectURL(entry.blob),
        width: entry.width,
        height: entry.height
      }
    }
    scheduleSave()
  }

  function removePhoto(dateKey) {
    if (photos[dateKey]?.url) {
      URL.revokeObjectURL(photos[dateKey].url)
    }
    delete photos[dateKey]
    scheduleSave()
  }

  onBeforeUnmount(() => {
    flushSave()
    clearTimeout(saveTimer)
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', flushSave)
    }
    Object.values(photos).forEach(p => p.url && URL.revokeObjectURL(p.url))
  })

  return { photos, ready, loadError, init, addPhoto, addPreparedPhotos, removePhoto, scheduleSave }
}