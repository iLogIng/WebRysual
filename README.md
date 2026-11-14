# WebRysual

> 浏览器端音频可视化器，从 `SDL3 + FFmpeg` 版 Rysual 迁移到 `Web Audio API + Three.js`。

**技术栈**
- TypeScript + Vite（无前端框架）
- Three.js
- Web Audio API
- Vitest

## 功能

- [x] 本地音频播放（多选）
- [x] 播放列表：拖拽文件与目录、移除、自动下一首、循环、坏文件跳过
- [x] Spectrum（48 个对数频段）与 Waveform（去直流 + RMS 亮度）
- [x] 两种模式共用可配置渐变
- [x] 进度条、拖动 seek、单曲无缝循环
- [x] 图片壁纸（cover + 暗化）
- [x] 全屏（Fullscreen API，空闲 3 秒隐藏光标）
- [x] 解码/播放错误 toast
- [ ] 网络 URI 串流（延后）
- [ ] 播放速度（延后，需要不改变音高的方案）
- [ ] controls 图标化（延后）
- [ ] 3D / Bloom（P6）
- Simulated 模式：已移除

## 控制

| 按键 | 功能 |
|:---:|---|
| `Space` | 暂停 / 继续 |
| `,` `.` / `←` `→` | 后退 / 前进 5 秒 |
| `-` `=` | 音量 -/+ 0.05 |
| `n` `p` | 下一首 / 上一首 |
| `1` `2` | Spectrum / Waveform |
| `L` | 播放列表显隐 |
| `F` | 进入 / 退出全屏 |

> 全屏使用 Fullscreen API；`Esc` 退出为浏览器保留行为。`F11` 是浏览器窗口级快捷键，不作为应用控制。

## 开发

```bash
npm run dev       # 开发服务器
npm test          # Vitest
npm run build     # 类型检查 + 生产构建
npm run preview   # 预览生产构建
```

## 进度

| 阶段 | 内容 | 状态 |
|---|---|---|
| M0 | 脚手架、Stage、正交相机、DPR 与 Resize | 完成 |
| M1 | 音频引擎与传输控制 | 完成 |
| M2 | Waveform | 完成 |
| M3 | Spectrum | 完成 |
| M4 | 播放列表：拖拽、自动下一首、错误跳过 | 完成 |
| P0 | 面板收尾、目录拖拽、toast | 完成 |
| P1 | 共用渐变、两种模式渐变、图片壁纸 | 完成 |
| P2 | 全屏 API、空闲光标隐藏 | 完成 |
| P3 | 单元测试、README 同步、浏览器矩阵 | 完成（矩阵待实测） |
| P4 | 性能调优 | 待开始 |
| P5 | 部署与平台化 | 待开始 |
| P6 | 3D / Bloom | 待开始 |

原 M4 Simulated 已移除；原 M5 的全屏与目录拖拽已完成。

## TODO

### P4 · 性能调优

- [ ] HUD / controls 每帧 DOM 写入 → 10Hz 或变化时才写
- [ ] Waveform 预分配缓冲，避免每帧 `setPositions` 分配
- [ ] `backdrop-filter` 在低端设备降级
- [ ] 目标：1080p 稳定 60fps

### P5 · 部署与平台化

- [ ] 静态托管、Vite `base`、HTTPS
- [ ] 多面板 / 双窗口远期设计

### P6 · 3D / Bloom

- [ ] 设计：正交 ↔ 透视、柱子挤出、相机对 RMS 的反应
- [ ] `EffectComposer` + `UnrealBloomPass`
- [ ] 性能预算与降级路径

### 延后与决策

| 项 | 当前结论 |
|---|---|
| 播放速度 | 延后；不接受变调，需要 `preservesPitch` 或 DSP 方案 |
| 持久化 | 不提前设计；候选 `AppConfig` + 内置默认配置 + `localStorage` + 导入/导出 |
| 壁纸默认表现 | 当前为 cover + dim 0.35；是否暴露可调待定 |
| controls 图标化 | 延后 |
| 网络 URI 串流 | 延后 |
| 多面板 / 双窗口 | 远期 |

## 浏览器矩阵

目标：Chrome / Edge 最新两版、Firefox 最新两版、Safari 最新版；移动端仅观察。

| 验证项 | Chrome / Edge | Firefox | Safari |
|---|:---:|:---:|:---:|
| 启动与 WebGL 渲染 | 待测 | 待测 | 待测 |
| 文件选择、多选、解码 | 待测 | 待测 | 待测 |
| 播放 / 暂停 / seek / 音量 | 待测 | 待测 | 待测 |
| 列表增删、自动下一首、坏文件跳过 | 待测 | 待测 | 待测 |
| 拖拽文件与目录 | 待测 | 待测 | 待测 |
| 全屏 / Esc / 光标隐藏 | 待测 | 待测 | 待测 |
| 壁纸加载 / 清除 / cover | 待测 | 待测 | 待测 |
| 键盘与面板焦点 | 待测 | 待测 | 待测 |
| 后台播放时自动切歌 | 待测 | 待测 | 待测 |

已知差异与处理：

| 项 | 差异 | 处理 |
|---|---|---|
| `.wma` | 浏览器普遍不支持 | toast 跳过 |
| Ogg / Opus | Safari 版本差异 | 解码失败 → toast 跳过 |
| m4a / AAC | Firefox 依赖系统编解码 | 同上 |
| 全屏 | iOS 可能不支持任意元素全屏 | `fullscreenEnabled` 检测，按钮禁用 |
| `backdrop-filter` | 旧版本不支持 | 纯色背景兜底 |
| 自动播放 | 所有浏览器都需要用户手势 | 首次交互解锁 AudioContext |
| `inert` | 旧版本不支持 | 当前面向现代浏览器 |
