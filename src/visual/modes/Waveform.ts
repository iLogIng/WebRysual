import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { VIEW_H, WAVE_POINTS } from "../constants";

const AMPLITUDE = VIEW_H * 0.35;

export class Waveform {
  readonly object = new THREE.Group();

  private readonly geometry = new LineGeometry();
  private readonly material: LineMaterial;
  private readonly line: Line2;
  private readonly positions = new Float32Array(WAVE_POINTS * 3);

  private readonly baseGeometry = new THREE.BufferGeometry();
  private readonly baseLine: THREE.Line;

  private rmsValue = 0;

  constructor() {
    this.material = new LineMaterial({
      color: 0x66ccff,
      linewidth: 2, // CSS 像素
    });

    // 初始为一条平直线，避免零长度线段
    for (let c = 0; c < WAVE_POINTS; c++) {
      this.positions[c * 3] = -1 + (2 * c) / (WAVE_POINTS - 1);
      this.positions[c * 3 + 1] = 0;
      this.positions[c * 3 + 2] = 0;
    }
    this.geometry.setPositions(this.positions);

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

  // widthPx/heightPx 用 CSS 像素，不是 devicePixelRatio 后的缓冲尺寸
  setViewport(widthPx: number, heightPx: number): void {
    this.material.resolution.set(widthPx, heightPx);
  }

  update(samples: Float32Array, viewWidth: number): void {
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

    // 响度决定亮度
    const lightness = 0.45 + Math.min(this.rmsValue * 2, 0.35);
    this.material.color.setHSL(0.52, 1, lightness, THREE.SRGBColorSpace);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.baseGeometry.dispose();
    (this.baseLine.material as THREE.LineBasicMaterial).dispose();
    this.object.removeFromParent();
  }
}
