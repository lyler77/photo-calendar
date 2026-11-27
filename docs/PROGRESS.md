# 项目进展与交接说明

最后更新：2026-11-27

## 当前阶段

V1 MVP 已上线运行；V1.1 在独立开发分支进行体验改进，尚未合并或部署。

## 环境事实（换 AI 必读）
- 机器：Mac，用户名 rika
- Node：nvm 管理，v22/v26 LTS
- 项目路径：/Users/rika/Documents/0rika/pro/ai/photo-calendar
- 技术栈：Vue 3 + Vite 5.4.21 + exifr
- 启动：npm run dev → http://localhost:5173/
- 真机测试：npm run dev -- --host
- 构建测试：npm run build
- 编辑器：Sublime Text + Mac 终端

## 核心环境经验
1. 使用 nvm 管理 Node，避免系统级 Node 权限问题。
2. iPhone Safari 可能剥离照片 EXIF；无 EXIF 必须有可用的日期安排路径。
3. 桌面 Chrome/Safari 对 HEIC 解码支持有限；V1 不引入 heic2any，需给出明确错误提示。
4. iOS Safari 对 Canvas 滤镜支持有限；背景图采用原图与遮罩方案。
5. iOS 网页下载图片可能进入“文件”App，导出弹窗提示用户长按图片保存到照片。
6. 批量操作应保留原始选择顺序，不能受异步 EXIF 解析速度影响。

## 核心数据模型（IndexedDB）
- 数据库名：photo-calendar
- 表：project
- 主键：default（单份草稿）
- 存储照片 Blob、样式快照、最后编辑年月。
- 草稿保存采用 300ms 防抖。

## V1.1 最新进展（2026-11-27）

- 分支：v1.1/development
- PR：#2（Draft，尚未合并，不影响线上 main）
- AI 付费意愿问卷已从开发分支移除。
- 批量导入提供两种模式：按拍摄日期、按选择顺序。选择顺序模式忽略所有 EXIF 日期。
- 无日期照片可从指定起始日期连续填入；已有照片日期自动跳过。
- 批量列表支持日期修改、鼠标/触屏拖动和上下移动按钮。
- 批量列表支持单张移除；移除后重新计算自动分配日期。
- 不支持或无法解码的图片显示错误并禁用日期编辑、排序和导入，可单独移除，不阻断其他有效图片。
- 确认前校验已有日期冲突和列表内部重复日期；确认后统一写入，取消不写入。
- 首次引导已改为沿用当前模板色彩和底部面板布局；自定义背景下使用深色半透明面板。
- 以上新改动均已提交到 v1.1/development；尚未完成本地构建、桌面/手机交互回归，不得标记验收完成。

## 下一步

1. 本地切换/确认 v1.1/development 并执行 git pull --ff-only。
2. 执行 npm run build。
3. 启动 npm run dev -- --host，先测桌面批量导入与首次引导，再用手机测触屏拖动。
4. 完成回归后更新任务状态，再决定是否将 Draft PR 转为 Ready。
5. main 及线上部署在验收前保持不变。
