# 项目进展与交接说明

最后更新：2026-11-24

## 当前阶段
M3 进行中：步 1（样式系统）已完成，步 2（单月导出）待开始。

## 环境事实（换 AI 必读）
- 机器：Mac，用户名 rika
- Node：nvm 管理，v22/v26 LTS
- npm：随 nvm 的 Node 附带
- 项目路径：/Users/rika/Documents/0rika/pro/ai/photo-calendar
- 技术栈：Vue3 + Vite 5.4.21 + exifr
- 启动：`npm run dev` → http://localhost:5173/
- 真机测试：`npm run dev -- --host`
- 编辑器：Sublime Text + Mac 终端

## 已踩过的坑
1. 系统级 Node 导致 EACCES → 已改用 nvm
2. Node 18 太旧 → 已升 LTS
3. `cva: command not found` → 改用 `npx create-vite@5`
4. 目录非空 → 选 Ignore files and continue
5. npm vulnerabilities / esbuild 警告 → 忽略，不跑 audit fix --force
6. Vite 运行中新建文件不识别 → 重启 dev server
7. iPhone Safari 上传剥离 EXIF → 平台限制，按无 EXIF 设计
8. 桌面 Chrome/Safari 不支持 HEIC 解码 → V1 不修，给引导文案

## M1 验证结果
| 假设 | 结果 |
|---|---|
| JPEG 解码 | ✅ |
| 压缩（2000px / 0.85） | ✅ |
| EXIF 读取（桌面原图） | ✅ |
| EXIF 读取（iPhone Safari） | ❌ 平台剥离 |
| HEIC 解码（桌面） | ❌ 预期内 |
| iPhone 选 HEIC | ✅ 自动转 JPEG |
| Canvas 单月导出（1080×1440 / 2x） | ✅ 清晰 |

## M2 验证结果
- ✅ 月历网格、今日高亮、月份切换、跨年
- ✅ 空格选图、已填格子菜单（查看/更换/删除）、全屏查看
- ✅ EXIF 非阻塞提示 + “移到对应日期” + 冲突确认
- ✅ IndexedDB 草稿：刷新恢复、删除不复活、月份记忆、换图持久化

## M3 已完成
- ✅ 步 1：3 套模板（极简白 / 暖纸感 / 深色胶片）、背景色、滤镜（原图/暖/黑白）
- ✅ 样式持久化（与照片共用同一条 IndexedDB project 记录）
- ✅ 样式变更同步到页面背景与月历视觉

## 进行中
- [ ] M3 步 2：单月导出（读取真实照片 + 当前样式，1080×1440 / 2x）

## 下一步
M3 步 2 → 步 3（自定义背景图）→ 步 4（全年图 Beta）→ M4（埋点 + 上线）

## 关键决策（已定）
- 本地优先，不上传照片，不做账号云端
- EXIF 是加分项，不是主路径
- 单月 3:4 竖版主导出，全年图 Beta
- Canvas 自绘导出，不用 html2canvas
- 照片压缩 JPEG，长边 1600–2000
- V1 不引入 heic2any
- 样式以 plain object 快照持久化（reactive Proxy 不能直接进 IndexedDB）