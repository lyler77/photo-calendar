import { reactive, ref, onBeforeUnmount } from 'vue'
import { compressImage } from './useImage'
import { loadProject, saveProject } from './useDraftDB'

export function usePhotos({ yearRef, monthRef, getStyleSnapshot, onSaveError } = {}) {
  const photos = reactive({})
  const ready = ref(false)
  let saveTimer = null
  let loading = true

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
      console.warn('加载草稿失败', e)
    } finally {
      ready.value = true
      setTimeout(() => { loading = false }, 0)
    }
    return loadedStyle
  }

  async function doSave() {
    const entries = {}
    for (const [key, p] of Object.entries(photos)) {
      entries[key] = { blob: p.blob, width: p.width, height: p.height }
    }
    try {
      await saveProject({
        year: yearRef?.value,
        month: monthRef?.value,
        entries,
        style: getStyleSnapshot ? getStyleSnapshot() : null
      })
    } catch (err) {
      if (onSaveError) onSaveError(err)
      else console.warn('保存草稿失败', err)
    }
  }

  function scheduleSave() {
    if (loading || !ready.value) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(doSave, 300)
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
    clearTimeout(saveTimer)
    Object.values(photos).forEach(p => p.url && URL.revokeObjectURL(p.url))
  })

  return { photos, ready, init, addPhoto, addPreparedPhotos, removePhoto, scheduleSave }
}