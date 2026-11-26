# 项目进展与交接说明

最后更新：2026-11-26

## 当前阶段
V1 MVP 代码已全部开发完毕，M4 埋点已接入，**准备部署上线**。

## 环境事实（换 AI 必读）
- 机器：Mac，用户名 rika
- Node：nvm 管理，v22/v26 LTS
- 项目路径：/Users/rika/Documents/0rika/pro/ai/photo-calendar
- 技术栈：Vue3 + Vite 5.4.21 + exifr
- 启动：`npm run dev` → http://localhost:5173/
- 真机测试：`npm run dev -- --host`
- 构建测试：`npm run build`
- 编辑器：Sublime Text + Mac 终端

## 已踩过的坑（核心教训）
1. 系统级 Node 导致 EACCES → 已改用 nvm。
2. Node 18 太旧 → 已升 LTS。
3. `npm create vite` 报 `cva` 找不到 → 用 `npx create-vite@5`。
4. iPhone Safari 上传会**剥离 EXIF**（平台限制）→ EXIF 是加分项，主路径设计为无 EXIF 也能直接填入。
5. 桌面 Chrome/Safari **不支持 HEIC 解码** → V1 不引入 heic2any，只给错误提示。
6. **iOS Safari 不支持 Canvas `ctx.filter`**（模糊滤镜无效）→ 导出时背景图放弃 blur，改用“原图 + 黑色遮罩层”。
7. **iOS 网页下载图片默认存进“文件”App，不进相册** → 导出弹窗加入强提示，引导用户“长按图片保存到照片”。
8. **排版视觉重心问题** → 导出单月图时，放弃垂直居中，改为“顶部紧凑 + 底部留白”，解决 5 行月份的突兀感。
9. **SnackBar 遮挡问题** → 从顶部移到底部 `90px`，既不影响顶部标题，也不遮挡底部操作按钮。

## 核心数据模型（IndexedDB）
- 数据库名：`photo-calendar`
- 表：`project`
- 主键：`default`（只存一份草稿）
- 存储：`photos`（Blob）、`style`（模板/背景/滤镜）、`year/month`（最后编辑月份）
- 防抖机制：300ms，所有 DOM 操作后自动触发。

## 已完成（M1 到 M4）
- [x] M1：选图解码、压缩、EXIF 桌面读取、Canvas 导出。
- [x] M2：月历网格、选图/替换/删除、EXIF 非阻塞提示、IndexedDB 草稿。
- [x] M3：3套模板 + 背景色/图 + 滤镜、单月导出（精修排版）、全年横版/竖版 Beta、复制小红书文案。
- [x] M4：轻量埋点（`useTrack.js`）、隐私说明弹窗。

## 下一步（给接手 AI 的指令）
当前项目已经可以直接部署。部署使用 Vercel：
1. 本地运行 `npm run build` 确认无报错。
2. 代码已推送到 GitHub (`lyler77/photo-calendar`)。
3. 在 Vercel 导入该仓库，Framework Preset 选 Vue，一键部署。
4. 部署后，测试真机导图保存、埋点控制台输出。
5. 后续迭代（V1.5/V2）需根据 PRD 基线扩展，不要直接在当前核心逻辑里加需求。