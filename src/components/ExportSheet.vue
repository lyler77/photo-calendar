<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  previewUrl: { type: String, default: '' },
  error: { type: String, default: '' },
  exportType: { type: String, default: 'month' }
})
const emit = defineEmits(['close', 'save', 'copy', 'change-type', 'submit-survey'])

const showSurvey = ref(false)

// 每次打开弹窗，或者重新生成图片时，检查是否需要显示问卷
watch(
  () => [props.visible, props.previewUrl],
  ([isVisible, url]) => {
    if (isVisible && url && !props.loading) {
      const lastAsked = localStorage.getItem('ai_survey_time')
      // 临时去掉时间限制，只要没填过或想测试，就强制弹出（测完可恢复 7 天逻辑）
      if (!lastAsked) { 
        showSurvey.value = true
      }
    }
    if (!isVisible) {
      showSurvey.value = false
    }
  },
  { immediate: true }
)

function submitSurvey(price) {
  emit('submit-survey', price)
  localStorage.setItem('ai_survey_time', Date.now().toString())
  showSurvey.value = false
}

function closeSurvey() {
  localStorage.setItem('ai_survey_time', Date.now().toString())
  showSurvey.value = false
}
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="mask" @click="$emit('close')">
      <div class="sheet" @click.stop>
        <div class="handle" />
        
        <!-- Tab 切换 -->
        <div class="tabs">
          <button 
            :class="{ active: exportType === 'month' }" 
            @click="$emit('change-type', 'month')"
          >单月图</button>
          <button 
            :class="{ active: exportType === 'year-h' }" 
            @click="$emit('change-type', 'year-h')"
          >全年横版 <small>Beta</small></button>
          <button 
            :class="{ active: exportType === 'year-v' }" 
            @click="$emit('change-type', 'year-v')"
          >全年竖版 <small>Beta</small></button>
        </div>

        <div class="preview-wrap">
          <div v-if="loading" class="loading">生成中，请稍候…</div>
          <div v-else-if="error" class="error">{{ error }}</div>
          <img v-else-if="previewUrl" :src="previewUrl" alt="预览" class="preview-img" />
        </div>
        
        <p v-if="exportType !== 'month' && previewUrl" class="tip-warn">空白格会保留，填更多月份效果更好</p>

        <div class="actions">
          <button class="btn primary" :disabled="loading || !previewUrl" @click="$emit('save')">保存图片</button>
          <button class="btn" :disabled="loading || !previewUrl" @click="$emit('copy')">复制文案</button>
        </div>

        <p class="tip">导出高清 JPEG。<br>iPhone 用户请直接<b>长按上方图片</b>，选择“存储到照片”。</p>

        <!-- AI 意愿问卷 -->
        <div v-if="showSurvey" class="survey-card">
          <p class="survey-title">如果未来上线「AI 自动选图填满整月」，你愿意为此付费吗？</p>
          <div class="survey-options">
            <button @click="submitSurvey('9.9')">愿意付 9.9 元</button>
            <button @click="submitSurvey('19.9')">愿意付 19.9 元</button>
            <button @click="submitSurvey('no')">暂不感兴趣</button>
          </div>
          <button class="survey-close" @click="closeSurvey">以后再说</button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 150; display: flex; align-items: flex-end; justify-content: center; }
.sheet { width: 100%; max-width: 560px; background: #fff; border-radius: 16px 16px 0 0; padding: 8px 18px calc(16px + env(safe-area-inset-bottom)); max-height: 90vh; overflow-y: auto; }
.handle { width: 36px; height: 4px; background: #ddd; border-radius: 2px; margin: 6px auto 10px; }
.tabs { display: flex; gap: 8px; margin-bottom: 14px; background: #f2f2f2; padding: 4px; border-radius: 10px; }
.tabs button { flex: 1; padding: 8px 0; border: none; background: transparent; font-size: 13px; color: #666; border-radius: 8px; cursor: pointer; }
.tabs button small { font-size: 10px; opacity: 0.7; }
.tabs button.active { background: #fff; color: #222; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.preview-wrap { display: flex; align-items: center; justify-content: center; min-height: 220px; max-height: 50vh; background: #f7f7f7; border-radius: 10px; padding: 8px; overflow: hidden; }
.preview-img { max-width: 100%; max-height: 50vh; object-fit: contain; border-radius: 6px; }
.loading, .error { font-size: 14px; color: #888; padding: 60px 0; }
.error { color: #e54; }
.tip-warn { text-align: center; font-size: 12px; color: #e88f00; margin: 8px 0 0; }
.actions { display: flex; gap: 10px; margin-top: 14px; }
.btn { flex: 1; padding: 14px; border: none; border-radius: 10px; font-size: 15px; cursor: pointer; background: #f2f2f2; color: #333; }
.btn.primary { flex: 2; background: #222; color: #fff; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.tip { text-align: center; font-size: 12px; color: #888; line-height: 1.6; margin: 12px 0 0; }
.tip b { color: #333; }

.survey-card { margin-top: 16px; padding: 14px; background: #f9f6f0; border-radius: 10px; border: 1px solid #f0e8d8; text-align: center; }
.survey-title { font-size: 13px; color: #5a4a3a; margin: 0 0 10px; font-weight: 500; }
.survey-options { display: flex; gap: 8px; justify-content: center; }
.survey-options button { padding: 8px 12px; border: 1px solid #dcd1bf; background: #fff; color: #5a4a3a; border-radius: 16px; font-size: 12px; cursor: pointer; }
.survey-options button:active { background: #f0e8d8; }
.survey-close { margin-top: 10px; background: transparent; border: none; color: #a99c8a; font-size: 12px; cursor: pointer; text-decoration: underline; }
</style>