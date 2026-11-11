# WebRysual

> 从基于 `SDL3` + `FFmpeg` 的 `Rysual` 项目迁移到依赖 `Web Audio API` + `Three.js` 的浏览器环境项目

**依赖**
- TypeScript
    - 无前端框架
- Web Audio API
- Three.js

## 功能

- 本地文件播放
- 网络URI串流
- 播放列表
- 美化材料提交

## 控制

- 停止/恢复
- 播放速度
- 显示美化
    - 音频可视化
    - 图片壁纸
    - 3D渲染

## milestone

### M0 · 脚手架
Vite + TS + three，全屏 canvas，正交相机，一个旋转立方体，ResizeObserver + DPR 适配。
验收：窗口缩放不变形；控制台无报错；npm run dev 可访问。
学到：ESM/打包、canvas 尺寸与 devicePixelRatio、rAF 循环。
### M1 · 音频传输层
文件选择 + 拖拽 → 建图 → 播放/暂停/seek ±5s/音量 ±0.05/上一首下一首；HUD 显示曲名与时间。
验收：键位与旧 README 表一致；刷新后首次播放必须先点击（自动播放策略）；audio.ended 自动下一首并循环。
学到：用户手势解锁 AudioContext、媒体元素与音频图的关系、blob URL 生命周期。
### M2 · Spectrum
48 根对数频段柱 + release 平滑 + HSL 色板。
验收：和旧程序同一首歌对比，柱高走势一致；改音量时柱高跟随；120Hz 屏上衰减速度与 60Hz 一致。
学到：频域 bin 与 fftSize/sampleRate 的关系、dB 归一化、实例化绘制。
### M3 · Waveform
时域快照 → 取每列绝对值最大样本 → Line2 绘制 + RMS 控制亮度 + 去直流。
验收：居中、削波不越界、亮度随响度变化。
学到：线宽陷阱、每帧 BufferGeometry 更新策略（预分配 + setDrawRange）。
### M4 · Simulated
ShaderMaterial 平面 + uTime，复刻正弦柱阵。
验收：与旧版节奏/形态一致；改分辨率不变形。
学到：uniform 与 GPU 时间、片元着色器。
### M5 · 播放列表与全屏
拖入整个文件夹（webkitGetAsEntry 或 File System Access API）、全屏 API、错误文件自动跳过。
验收：坏文件不会卡死；全屏进入/退出正常。
学到：Esc 退出全屏是浏览器保留行为，无法拦截（与 SDL 不同）；Space 要 preventDefault 防滚动。
### M6 · 3D 化与后处理
透视相机 + 柱子挤出 + 轻微相机漂移/对 RMS 反应；EffectComposer + UnrealBloomPass 做辉光。
验收：有"3D 感"且不掉帧（目标 1080p/60fps）。
学到：后期处理管线、色彩管理（SRGBColorSpace）、性能剖析（DevTools Performance）。

然后按此顺序写，每步都能看到东西：
1. Stage.ts：全屏 canvas + 正交相机 + 空场景 + 背景色 0x212425。
2. AudioEngine.ts：<audio> + ctx + gain + analyser，先只做 play/pause。第一次播放必须由点击触发。
3. Analyser.ts + bands.ts：先 console.log 前几个 dB 值，确认有数据。
4. Spectrum.ts：先用 Mesh 循环画 48 个柱子（别急着上 InstancedMesh），能动了再优化。
5. main.ts：requestAnimationFrame 里 read → update bands → 改柱子 scale.y。


