<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  backgroundColor: { type: String, default: '#ffffff' },
  textColor: { type: String, default: '#333333' },
  mutedColor: { type: String, default: '#888888' },
  borderColor: { type: String, default: '#eeeeee' },
  hasBgImage: { type: Boolean, default: false }
})
defineEmits(['start', 'close'])
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="guide-mask" @click.self="$emit('close')">
      <section
        class="guide-sheet"
        :class="{ 'with-background-image': hasBgImage }"
        :style="{
          '--guide-bg': hasBgImage ? 'rgba(24,24,24,.88)' : backgroundColor,
          '--guide-text': hasBgImage ? '#fff' : textColor,
          '--guide-muted': hasBgImage ? 'rgba(255,255,255,.68)' : mutedColor,
          '--guide-border': hasBgImage ? 'rgba(255,255,255,.2)' : borderColor
        }"
      >
        <div class="handle" />
        <header class="guide-header">
          <div>
            <div class="eyebrow">照片月历 · 使用说明</div>
            <h2>把照片排进月历</h2>
          </div>
          <button class="guide-close" aria-label="关闭帮助" @click="$emit('close')">×</button>
        </header>

        <p class="intro">照片只保存在当前设备。添加后可随时调整，再导出月历。</p>

        <ol class="steps">
          <li>
            <span class="step-number">01</span>
            <div><strong>添加照片</strong><small>点击空白日期格可从这天开始添加；「添加照片」从当月 1 号开始。两种入口都可一次选择多张，使用相同的日期安排方式。</small></div>
          </li>
          <li>
            <span class="step-number">02</span>
            <div><strong>安排日期</strong><small>默认按选择顺序从起始日期连续安排，已有照片会被替换；也可切换为只放入空格。每张照片会显示是否读到拍摄日期，安排日期也可以修改。</small></div>
          </li>
          <li>
            <span class="step-number">03</span>
            <div><strong>调整照片</strong><small>在批量预览中修改照片的安排日期，或移除不需要的照片。确认后才会写入月历。</small></div>
          </li>
          <li>
            <span class="step-number">04</span>
            <div><strong>调整并导出</strong><small>点击顶部年月可直接选择其他月份，离开本月后可点「回到本月」；在「样式」中更换模板、背景和滤镜，点击「导出」保存单月或全年月历。</small></div>
          </li>
        </ol>

        <button class="guide-start" @click="$emit('start')">开始添加照片</button>
        <p class="privacy">照片和作品只保存在当前设备的浏览器中</p>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.guide-mask { position:fixed; inset:0; z-index:190; display:flex; align-items:flex-end; justify-content:center; padding:0; box-sizing:border-box; background:rgba(0,0,0,.42); }
.guide-sheet { position:relative; width:100%; max-width:560px; max-height:88vh; overflow:auto; box-sizing:border-box; background:var(--guide-bg); color:var(--guide-text); border-radius:16px 16px 0 0; padding:8px 18px calc(18px + env(safe-area-inset-bottom)); }
.handle { width:36px; height:4px; background:var(--guide-muted); opacity:.45; border-radius:2px; margin:6px auto 14px; }
.guide-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.eyebrow { font-size:11px; color:var(--guide-muted); margin-bottom:7px; }
h2 { font-size:19px; line-height:1.35; margin:0; font-weight:600; letter-spacing:-.3px; }
.guide-close { flex:0 0 auto; width:30px; height:30px; border:0; border-radius:50%; background:rgba(128,128,128,.12); color:var(--guide-text); font-size:20px; }
.intro { color:var(--guide-muted); font-size:12px; line-height:1.65; margin:10px 0 16px; }
.steps { list-style:none; padding:0; margin:0 0 18px; display:flex; flex-direction:column; gap:0; }
.steps li { display:grid; grid-template-columns:34px 1fr; gap:10px; align-items:start; padding:12px 0; border-top:1px solid var(--guide-border); }
.step-number { font-size:11px; color:var(--guide-muted); font-variant-numeric:tabular-nums; }
.steps strong { display:block; font-size:13px; font-weight:600; }
.steps small { display:block; font-size:11px; line-height:1.5; color:var(--guide-muted); margin-top:3px; }
.guide-start { width:100%; border:0; border-radius:10px; background:#222; color:#fff; padding:13px; font-size:14px; }
.with-background-image .guide-start { background:#fff; color:#222; }
.privacy { text-align:center; font-size:10px; color:var(--guide-muted); margin:10px 0 0; }
@media (min-width:700px) {
  .guide-mask { align-items:center; padding:16px; }
  .guide-sheet { border-radius:16px; }
}
</style>