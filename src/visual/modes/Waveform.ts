import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { VIEW_H, WAVE_POINTS } from "../constants";
import {
  DEFAULT_WAVEFORM_GRADIENT,
  prepareGradient,
  sampleGradientHsl,
  type GradientConfig,
  type Hsl,
} from "../gradient";

const AMPLITUDE = VIEW_H * 0.35;

export class Waveform {
  readonly object = new THREE.Group();

  private readonly geometry = new LineGeometry();
  private readonly material: LineMaterial;
  private readonly line: Line2;
  private readonly positions = new Float32Array(WAVE_POINTS * 3);
  private readonly colors = new Float32Array(WAVE_POINTS * 3);
  private readonly color = new THREE.Color();

  private readonly baseGeometry = new THREE.BufferGeometry();
  private readonly baseLine: THREE.Line;

  private rmsValue = 0;

  constructor(gradient: GradientConfig = DEFAULT_WAVEFORM_GRADIENT) {
    this.material = new LineMaterial({
      color: 0xffffff,
      linewidth: 2, // CSS 像素
      vertexColors: true,
    });

    // 初始为一条平直线，避免零长度线段
    for (let c = 0; c < WAVE_POINTS; c++) {
      this.positions[c * 3] = -1 + (2 * c) / (WAVE_POINTS - 1);
      this.positions[c * 3 + 1] = 0;
      this.positions[c * 3 + 2] = 0;
    }
    this.geometry.setPositions(this.positions);
    this.setGradient(gradient);

    this.line = new Line2(this.geometry, this.material);
    this.line.frustumCulled = false;

    this.baseGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0]), 3),
    );
    this.baseLine = new THREE.Line(
      this.baseGeometry,
      new THREE.LineBasicMaterial({ color: 0x505050 }),
    );
    this.baseLine.frustumCulled = false;

    this.object.add(this.baseLine, this.line);
  }

  get rms(): number {
    return this.rmsValue;
  }

  // 重建顶点颜色；颜色只与横向位置有关，不需要每帧更新
  setGradient(config: GradientConfig): void {
    const gradient = prepareGradient(config);
    const hsl: Hsl = { h: 0, s: 0, l: 0 };

    for (let i = 0; i < WAVE_POINTS; i++) {
      sampleGradientHsl(gradient, i / (WAVE_POINTS - 1), hsl);
      this.color.setHSL(hsl.h, hsl.s, hsl.l, THREE.SRGBColorSpace);

      this.colors[i * 3] = this.color.r;
      this.colors[i * 3 + 1] = this.color.g;
      this.colors[i * 3 + 2] = this.color.b;
    }

    this.geometry.setColors(this.colors);
  }

  // widthPx/heightPx 用 CSS 像素，不是 devicePixelRatio 后的缓冲尺寸
  setViewport(widthPx: number, heightPx: number): void {
    this.material.resolution.set(widthPx, heightPx);
  }

  update(samples: Float32Array, viewWidth: number): void {
    // 采样数
    const n = samples.length;
    if (n === 0) return;

    // 去直流
    let mean = 0;
    for (let i = 0; i < n; i++) mean += samples[i];
    mean /= n;

    // RMS（用于亮度）
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const v = samples[i] - mean;
      sumSq += v * v;
    }
    this.rmsValue = Math.sqrt(sumSq / n);

    // 降采样: 每列取绝对值最大的样本，保留符号
    const step = n / WAVE_POINTS;
    for (let c = 0; c < WAVE_POINTS; c++) {
      const begin = Math.floor(c * step);
      const end = Math.max(begin + 1, Math.floor((c + 1) * step));

      let peak = 0;
      for (let i = begin; i < end && i < n; i++) {
        const v = samples[i] - mean;
        if (Math.abs(v) > Math.abs(peak)) peak = v;
      }

      this.positions[c * 3] =
        -viewWidth / 2 + (c / (WAVE_POINTS - 1)) * viewWidth;
      this.positions[c * 3 + 1] = peak * AMPLITUDE;
      this.positions[c * 3 + 2] = 0;
    }

    this.geometry.setPositions(this.positions);

    // 基线跟随视口宽度
    const base = this.baseGeometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    base.setXYZ(0, -viewWidth / 2, 0, 0);
    base.setXYZ(1, viewWidth / 2, 0, 0);
    base.needsUpdate = true;

    // 响度决定亮度：默认渐变基色明度为 0.8，目标区间 0.4 .. 0.8
    const targetLightness = 0.4 + Math.min(this.rmsValue * 2, 0.4);
    this.material.color.setScalar(targetLightness / 0.8);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.baseGeometry.dispose();
    (this.baseLine.material as THREE.LineBasicMaterial).dispose();
    this.object.removeFromParent();
  }
}
