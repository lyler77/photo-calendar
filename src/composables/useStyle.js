import { reactive } from 'vue'

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
    filter: 'original'
  })

  function applyTemplate(id) {
    if (!TEMPLATES[id]) return
    style.templateId = id
    style.backgroundColor = TEMPLATES[id].backgroundColor
  }

  function setBackgroundColor(color) {
    if (color) style.backgroundColor = color
  }

  function setFilter(id) {
    if (FILTERS[id]) style.filter = id
  }

  function applyLoaded(loaded) {
    if (!loaded) return
    if (TEMPLATES[loaded.templateId]) style.templateId = loaded.templateId
    if (loaded.backgroundColor) style.backgroundColor = loaded.backgroundColor
    if (FILTERS[loaded.filter]) style.filter = loaded.filter
  }

  function getSnapshot() {
    return {
      templateId: style.templateId,
      backgroundColor: style.backgroundColor,
      filter: style.filter
    }
  }

  return { style, applyTemplate, setBackgroundColor, setFilter, applyLoaded, getSnapshot }
}