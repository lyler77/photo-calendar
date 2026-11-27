<script setup>
defineProps({
  visible: { type: Boolean, default: false }
})
defineEmits(['close'])
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="onboarding-mask">
      <div class="onboarding-card">
        <h2>把相册拼成月历</h2>
        <p class="desc">一天一张，留住时间</p>
        
        <!-- 纯 CSS 画的示例图 -->
        <div class="mock-calendar">
          <div class="mock-header">
            <span>2026 年 11 月</span>
          </div>
          <div class="mock-grid">
            <div class="mock-cell empty"></div>
            <div class="mock-cell empty"></div>
            <div class="mock-cell has-photo" style="background-color: #f0e8d8;"></div>
            <div class="mock-cell empty"></div>
            <div class="mock-cell has-photo" style="background-color: #e5dcc5;"></div>
            <div class="mock-cell empty"></div>
            <div class="mock-cell empty"></div>
          </div>
          <div class="mock-arrow">↑ 点任意格子放照片</div>
        </div>

        <button class="start-btn" @click="$emit('close')">开始制作</button>
        <p class="tip">做好后，可导出高清大图发小红书</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.onboarding-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(4px);
}
.onboarding-card {
  background: #fff;
  width: 100%;
  max-width: 340px;
  border-radius: 20px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}
h2 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #222;
}
.desc {
  margin: 0 0 20px;
  font-size: 13px;
  color: #888;
}
.mock-calendar {
  background: #fafafa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  border: 1px solid #eee;
}
.mock-header {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}
.mock-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.mock-cell {
  aspect-ratio: 1/1;
  border-radius: 4px;
  background: #fff;
  border: 1px solid #f0f0f0;
}
.mock-cell.empty {
  background: transparent;
  border-color: transparent;
}
.mock-cell.has-photo {
  border: none;
}
.mock-arrow {
  font-size: 12px;
  color: #ff6b6b;
  margin-top: 12px;
  font-weight: 500;
}
.start-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: #ff6b6b;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 12px;
}
.start-btn:active {
  background: #e55a5a;
}
.tip {
  margin: 0;
  font-size: 11px;
  color: #aaa;
}
</style>