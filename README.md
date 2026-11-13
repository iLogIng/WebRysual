# WebRysual

> 从基于 `SDL3` + `FFmpeg` 的 `Rysual` 项目迁移到依赖 `Web Audio API` + `Three.js` 的浏览器环境项目

**依赖**
- TypeScript
    - 无前端框架
- Web Audio API
- Three.js

## 功能

- [x] 本地音频文件播放（多选）
- [x] 播放列表：拖拽文件、移除、自动下一首、循环、坏文件跳过
- [x] Spectrum 频谱（48 个对数频段）
- [x] Waveform 波形（去直流 + RMS 亮度）
- [x] 播放进度条、拖动 seek、`seekTo`
- [x] 单曲无缝循环（不重新解码）
- [x] 播放列表面板（添加入口、移除、`L` 快捷键）
- [ ] 目录递归拖拽（P0）
- [ ] 图片壁纸背景（P1）
- [ ] 全屏（P2）
- [ ] 网络 URI 串流（延后）
- [ ] 播放速度（延后：需要不改变音高的方案）
- [ ] 3D / Bloom（P6）
- Simulated 模式：已移除（原项目仅用于测试显示链路）

添加音频的入口：右侧面板底部的“添加曲目”，或直接把文件拖入页面。

## 控制

| 按键 | 功能 |
|:---:|---|
| `Space` | 暂停 / 继续 |
| `,` `.` / `←` `→` | 后退 / 前进 5 秒 |
| `-` `=` | 音量 -/+ 0.05 |
| `n` `p` | 下一首 / 上一首 |
| `1` `2` | Spectrum / Waveform |
| `L` | 播放列表显隐 |
| `F` | 全屏（P2 待实现） |

> `F11` 是浏览器窗口级快捷键，跨平台不一致且页面无法可靠控制；全屏使用 Fullscreen API，`Esc` 退出为浏览器保留行为。

## 进度

| 阶段 | 内容 | 状态 |
|---|---|---|
| M0 | Vite + TS + Three.js、Stage、正交相机、DPR 与 Resize | 完成 |
| M1 | 音频引擎：`decodeAudioData` → source → gain → analyser、传输控制 | 完成 |
| M2 | Waveform：时域快照 → `Line2`、去直流、RMS 亮度 | 完成 |
| M3 | Spectrum：48 个对数频段、`InstancedMesh`、帧率无关 release | 完成 |
| M4 | 播放列表：多选与拖拽、自动下一首、循环、坏文件跳过 | 完成 |
| 附加 | 进度条、`seekTo`、单曲无缝循环、播放列表面板 | 完成 |
| 原 M4 | Simulated 模式 | 已移除（原项目仅用于测试） |
| 原 M5 | 全屏、目录拖拽 | 部分完成，余项见 P0 / P2 |
| 原 M6 | 3D / Bloom | 保留，见 P6 |

## TODO

### P0 · 收尾当前迭代

- [ ] 面板收尾：空状态、整行点击、删除后焦点恢复
- [ ] 目录拖拽：`webkitGetAsEntry` 递归、`readEntries` 循环、按 `fullPath` 排序、深度与数量上限
- [ ] 错误提示：`ui/toast.ts`，`aria-live`，解码失败与跳过文件有可见反馈

**验收**：目录递归完整；坏文件有提示而不是只写 Console；面板操作不丢焦点。

### P1 · 视觉配置与壁纸

- [ ] 共用渐变模型 `visual/gradient.ts`
- [ ] Waveform 渐变：`LineGeometry.setColors` + `LineMaterial({ vertexColors: true })`
- [ ] Spectrum 使用同一份渐变配置
- [ ] 图片壁纸背景 `BackgroundLayer`（添加节点早于持久化）
- [ ] 背景与 HUD 美术（暂缓，等视觉方向确定）

默认渐变：Spectrum `222° → 342°`，Waveform `187° → 307°`。

**验收**：两种模式共用一份渐变；修改默认色标能同时影响两者；壁纸可开关且不影响可视化可读性。

### P2 · 交互与配置

- [ ] 全屏 API（按钮 + `F`，不依赖 `F11`）
- [ ] controls 图标化（内联 SVG，`aria-label` / `title`，不引入图标库）
- [ ] 播放速度（**延后**，见“决策点”）
- [ ] 网络 URI 串流（**延后**）

### P3 · 工程质量（先于性能）

- [ ] Vitest：`Playlist`、`bands`、渐变采样
- [ ] README 与实际功能同步
- [ ] 浏览器矩阵：Chrome / Firefox / Safari（`decodeAudioData`、`inert`、`backdrop-filter`、Fullscreen）
- [ ] `npm run build && npm run preview` 生产验证
- [ ] 可选：Prettier / ESLint

### P4 · 性能调优

- [ ] HUD / controls 每帧 DOM 写入 → 10Hz 或变化时才写
- [ ] Waveform 预分配缓冲，避免每帧 `setPositions` 分配
- [ ] `backdrop-filter` 在低端设备降级
- [ ] 目标：1080p 稳定 60fps

### P5 · 部署与平台化

- [ ] 静态托管、Vite `base`、HTTPS
- [ ] 多面板 / 双窗口（`window.open` + `BroadcastChannel`）远期设计

### P6 · M6：3D / Bloom

- [ ] 先出设计：正交 ↔ 透视、柱子挤出、相机对 RMS 的反应
- [ ] `EffectComposer` + `UnrealBloomPass`
- [ ] 性能预算与降级路径

## 决策点

| 决策点 | 当前结论 | 触发时机 |
|---|---|---|
| 播放速度 | 不接受变调，**延后** | 出现不改变音高的方案（`<audio>` 的 `preservesPitch` 或 DSP）后 |
| 持久化 | **不提前设计** | P2 之后；壁纸节点之后 |
| 壁纸默认表现 | 待定（候选：cover + 固定暗化 / 用户可调） | P1 实现壁纸时 |
| 网络 URI 串流 | 延后 | 核心体验稳定后 |
| 3D / Bloom | 保留 | P6，平面视觉稳定后 |
| 多面板 / 双窗口 | 远期 | 平台化阶段 |

> 持久化候选方案：`AppConfig`（带版本）+ 内置 `config.default.json` + `localStorage` 覆盖 + 可选 JSON 导入/导出。浏览器不能直接读取任意路径的配置文件；播放列表的 `File` 对象也无法跨刷新恢复。
