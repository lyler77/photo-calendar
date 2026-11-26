import { reactive } from 'vue'
import { compressImage } from './useImage'

export const TEMPLATES = {
  'minimal-white': {
    name: '极简白',
    backgroundColor: '#ffffff',
    cellBorderColor: '#eeeeee',
    textColor: '#333333',
    weekLabelColor: '#888888'
  },
  'warm-paper': {
    name: '暖纸感',
    backgroundColor: '#f5efe0',
    cellBorderColor: '#e5dcc5',
    textColor: '#5a4a3a',
    weekLabelColor: '#9a8a7a'
  },
  'dark-film': {
    name: '深色胶片',
    backgroundColor: '#1a1a1a',
    cellBorderColor: '#333333',
    textColor: '#dddddd',
    weekLabelColor: '#888888'
  }
}

export const TEMPLATE_COLORS = {
  'minimal-white': ['#ffffff', '#f7f7f5', '#f0f4f8', '#fff5f0'],
  'warm-paper': ['#f5efe0', '#ede3cf', '#f0e8d8', '#e8dcc4'],
  'dark-film': ['#1a1a1a', '#232323', '#1c1f26', '#242018']
}

export const FILTERS = {
  original: { name: '原图', css: 'none' },
  warm: { name: '暖', css: 'sepia(0.35) saturate(1.15) brightness(1.05)' },
  bw: { name: '黑白', css: 'grayscale(1)' }
}

export function useStyle() {
  const style = reactive({
    templateId: 'minimal-white',
    backgroundColor: TEMPLATES['minimal-white'].backgroundColor,
    filter: 'original',
    backgroundImageBlob: null,
    backgroundImageUrl: '',
    backgroundOverlayOpacity: 0.5 // 新增：遮罩透明度，0 全透，1 全黑
  })

  function applyTemplate(id) {
    if (!TEMPLATES[id]) return
    style.templateId = id
    style.backgroundColor = TEMPLATES[id].backgroundColor
    if (style.backgroundImageUrl) {
      URL.revokeObjectURL(style.backgroundImageUrl)
      style.backgroundImageUrl = ''
      style.backgroundImageBlob = null
    }
  }

  function setBackgroundColor(color) {
    if (color) style.backgroundColor = color
  }

  function setFilter(id) {
    if (FILTERS[id]) style.filter = id
  }

  async function setBackgroundImage(file) {
    if (!file) return
    const { blob } = await compressImage(file, 2000)
    if (style.backgroundImageUrl) {
      URL.revokeObjectURL(style.backgroundImageUrl)
    }
    style.backgroundImageBlob = blob
    style.backgroundImageUrl = URL.createObjectURL(blob)
    style.backgroundOverlayOpacity = 0.5 // 重置为默认 50%
  }

  function setOverlayOpacity(opacity) {
    style.backgroundOverlayOpacity = opacity
  }

  function removeBackgroundImage() {
    if (style.backgroundImageUrl) {
      URL.revokeObjectURL(style.backgroundImageUrl)
    }
    style.backgroundImageBlob = null
    style.backgroundImageUrl = ''
  }

  function applyLoaded(loaded) {
    if (!loaded) return
    if (TEMPLATES[loaded.templateId]) style.templateId = loaded.templateId
    if (loaded.backgroundColor) style.backgroundColor = loaded.backgroundColor
    if (FILTERS[loaded.filter]) style.filter = loaded.filter
    if (loaded.backgroundOverlayOpacity !== undefined) style.backgroundOverlayOpacity = loaded.backgroundOverlayOpacity
    
    if (loaded.backgroundImageBlob) {
      style.backgroundImageBlob = loaded.backgroundImageBlob
      style.backgroundImageUrl = URL.createObjectURL(loaded.backgroundImageBlob)
    }
  }

  function getSnapshot() {
    return {
      templateId: style.templateId,
      backgroundColor: style.backgroundColor,
      filter: style.filter,
      backgroundImageBlob: style.backgroundImageBlob,
      backgroundOverlayOpacity: style.backgroundOverlayOpacity
    }
  }

  return {
    style,
    applyTemplate,
    setBackgroundColor,
    setFilter,
    setBackgroundImage,
    setOverlayOpacity,
    removeBackgroundImage,
    applyLoaded,
    getSnapshot
  }
}