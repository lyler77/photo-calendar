<script setup>
defineProps({
  visible: { type: Boolean, default: false }
})
defineEmits(['start', 'close'])
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="guide-mask">
      <section class="guide-card">
        <button class="guide-close" aria-label="关闭帮助" @click="$emit('close')">×</button>
        <div class="eyebrow">PHOTO CALENDAR</div>
        <h2>把相册里的日子，排成一张月历</h2>
        <p class="intro">选一组照片，自动整理日期，再调整成你喜欢的样子。</p>

        <div class="example">
          <div class="example-head">
            <strong>2026. 06</strong>
            <span>MONTHLY MEMORIES</span>
          </div>
          <div class="example-week">
            <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
          </div>
          <div class="example-grid">
            <i v-for="n in 35" :key="n" :class="'tile tile-' + (n % 7)" >
              <b v-if="n % 7 === 2 || n % 7 === 5">{{ n }}</b>
            </i>
          </div>
          <div class="example-foot">A MONTH OF LITTLE MOMENTS</div>
        </div>

        <ol class="steps">
          <li><b>添加照片</b><span>可一次选择多张，也可以逐格添加</span></li>
          <li><b>确认日期</b><span>自动读取拍摄日期，没有日期也能安排</span></li>
          <li><b>调整并导出</b><span>更换样式，生成高清月历图片</span></li>
        </ol>

        <button class="guide-start" @click="$emit('start')">开始添加照片</button>
        <p class="privacy">照片只保存在当前设备的浏览器中</p>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.guide-mask { position:fixed; inset:0; z-index:190; background:rgba(20,20,20,.58); display:flex; align-items:center; justify-content:center; padding:16px; box-sizing:border-box; }
.guide-card { position:relative; width:100%; max-width:390px; max-height:92vh; overflow:auto; box-sizing:border-box; background:#fff; color:#242424; border-radius:18px; padding:24px 22px 18px; box-shadow:0 18px 60px rgba(0,0,0,.2); }
.guide-close { position:absolute; right:14px; top:12px; border:0; background:#f3f3f3; border-radius:50%; width:30px; height:30px; font-size:20px; color:#666; }
.eyebrow { font-size:9px; letter-spacing:2px; color:#999; margin-bottom:9px; }
h2 { font-size:21px; line-height:1.35; margin:0; letter-spacing:-.5px; }
.intro { color:#888; font-size:12px; line-height:1.6; margin:7px 0 15px; }
.example { border:1px solid #eee; border-radius:10px; padding:12px; background:#fbfaf8; }
.example-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:9px; }
.example-head strong { font-family:Georgia,serif; font-size:16px; }
.example-head span,.example-foot { color:#aaa; font-size:8px; letter-spacing:1.2px; }
.example-week,.example-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
.example-week { margin-bottom:4px; }
.example-week span { text-align:center; color:#999; font-size:8px; }
.example-grid i { aspect-ratio:1; display:block; border-radius:3px; position:relative; background:#e8e2d8; overflow:hidden; }
.example-grid .tile-0 { background:linear-gradient(145deg,#d8c8b8,#b8c6bd); }
.example-grid .tile-1 { background:linear-gradient(35deg,#d5bba6,#e7d9c8); }
.example-grid .tile-2 { background:linear-gradient(145deg,#a9b9ac,#d9d1bf); }
.example-grid .tile-3 { background:linear-gradient(35deg,#c4b5a5,#e4d7c9); }
.example-grid .tile-4 { background:linear-gradient(145deg,#d2c0a8,#aebeb8); }
.example-grid .tile-5 { background:linear-gradient(35deg,#c6b6a8,#e2d3c0); }
.example-grid .tile-6 { background:#f0ece5; }
.example-grid b { position:absolute; left:3px; top:2px; font-size:7px; color:rgba(255,255,255,.9); font-style:normal; }
.example-foot { text-align:right; margin-top:8px; }
.steps { list-style:none; padding:0; margin:15px 0; display:flex; flex-direction:column; gap:10px; counter-reset:step; }
.steps li { display:grid; grid-template-columns:20px 1fr; column-gap:7px; align-items:baseline; counter-increment:step; }
.steps li:before { content:counter(step,decimal-leading-zero); color:#b0a18f; font-size:10px; grid-row:span 2; }
.steps b { font-size:12px; font-weight:600; }
.steps span { font-size:11px; color:#999; margin-top:2px; }
.guide-start { width:100%; border:0; border-radius:10px; background:#222; color:#fff; padding:13px; font-size:14px; }
.privacy { text-align:center; font-size:10px; color:#aaa; margin:10px 0 0; }
</style>
