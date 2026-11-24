# 照片月历 — 项目开发约定

## 项目定位
移动端 H5 轻制作工具：把相册照片整理成可分享的月历图。
不是打卡工具、不是云相册、不是 AI 相册管理器。

## 基线文档
- PRD 基线：docs/PRD.md（V1.0，2026-11-24，已冻结）
- 进展与已知坑：docs/PROGRESS.md
- 任务清单：docs/TASKS.md
- 任何新需求先记入 PRD 第 14 节变更记录，不直接改基线。

## V1 范围（只做这些）
- 单月月历编辑：今日高亮、月份切换、一格一张、选图/替换/删除/查看
- EXIF 本地解析，非阻塞提示（不一致默认填入当前格）
- IndexedDB 本地草稿（只存压缩图 Blob）
- 3 套模板 + 背景色 + 照片滤镜 + 自定义背景图（自动模糊暗化）
- 导出：单月 3:4 竖版（主推）、全年横版 4×3 Beta、全年竖版 3×4 Beta
- 复制小红书文案、匿名埋点、导出后 AI 付费意愿问卷

## 坚决不做（出现即拒绝）
AI 自动选图/回填、账号、云端、跨设备同步、文字备注、AI 文案、
自定义时间段合集、拼图、多图格子、视频导出、强制水印、
饱和度/透明度滑杆、社区互动、多人协作、heic2any（V1 不引入）。

## 技术约束
- Vue3 + Vite，移动端 H5，HTTPS
- 照片不上传；只存压缩图：长边 1600–2000，JPEG 0.85，统一转 JPEG
- EXIF 时间优先级：DateTimeOriginal → DateTimeDigitized → CreateDate
- 导出用 Canvas 自绘，不用 html2canvas 做主方案
- 单月导出逻辑 1080×1440，2x 绘制；全年逐月绘制，避免一次性加载全部图
- IndexedDB 版本化，保存防抖 300ms，QuotaExceeded 要有提示
- 周起始固定周一；网格照片统一 1:1 cover

## 关键事实（M1 已验证，别推翻）
- **iPhone Safari 上传会剥离 EXIF**，真实用户大概率读不到拍摄时间。
  → 主路径不依赖 EXIF：读不到也照常填图，不弹窗不阻断。
- **桌面 Chrome/Safari 不支持 HEIC 解码**，iPhone 选 HEIC 会自动转 JPEG。
  → V1 不修 HEIC，选到 HEIC 解码失败时给引导文案即可。

## 编码规则
- 组件按职责拆：CalendarGrid / DayCell / StyleDrawer / ExportSheet / useExif / useDraftDB / useExportCanvas
- 业务逻辑放 composables，不塞进模板
- 所有用户可见文案集中管理，便于改
- 提交前过一遍 PRD 第 10 节验收清单

## 已知坑（改代码前先看）
- iOS HEIC/方向：统一转 JPEG 并处理 orientation，失败给换图提示
- iPhone Safari 剥离 EXIF：不要试图“修复”，按无 EXIF 设计
- 微信内保存图片：引导长按保存，准备新窗口/复制链接兜底
- IndexedDB 配额：只存压缩图，异常提示“导出后清理”
- 全年图空白多：空白格淡化，标 Beta，不阻止导出
- 小红书外链限制：HTTPS + 国内可访问 + 复制链接兜底
- Vite 运行期间新建文件可能不识别：重启 dev server

## 回答风格要求
- 先判断是否在 V1 范围内，超出范围先提醒并记变更记录
- 给方案时标注影响文件、验收标准、风险
- 不引入新依赖前先说明理由和体积影响