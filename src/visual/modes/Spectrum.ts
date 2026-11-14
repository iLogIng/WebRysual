import * as THREE from "three";
import { makeFftBands, updateLevels, type Band } from "../../audio/bands";
import { VIEW_H } from "../constants";
import {
  DEFAULT_SPECTRUM_GRADIENT,
  prepareGradient,
  sampleGradientHsl,
  type GradientConfig,
  type Hsl,
} from "../gradient";

const DEFAULT_BAND_COUNT = 48;

export type SpectrumOptions = {
  sampleRate: number;
  fftSize: number;
  bandCount?: number;
  gradient?: GradientConfig;
};

// 频谱柱
export class Spectrum {
  readonly object: THREE.InstancedMesh;

  // 频带
  private readonly bands: Band[];
  // 柱高 dB
  private readonly levels: Float32Array;
  private bandHsl: Hsl[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();

  constructor(options: SpectrumOptions) {
    const bandCount = options.bandCount ?? DEFAULT_BAND_COUNT;

    this.bands = makeFftBands(
      options.sampleRate,
      options.fftSize,
      bandCount,
    );
    this.levels = new Float32Array(this.bands.length);

    const geometry = new THREE.BoxGeometry(1, 1, 0.1);
    const material = new THREE.MeshBasicMaterial();
    this.object = new THREE.InstancedMesh(
      geometry,
      material,
      this.bands.length,
    );
    this.object.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.object.frustumCulled = false;

    this.setGradient(options.gradient ?? DEFAULT_SPECTRUM_GRADIENT);
  }

  // 每个频段预采样一次，update 里只按电平调亮度
  setGradient(config: GradientConfig): void {
    const gradient = prepareGradient(config);
    const hsl: Hsl = { h: 0, s: 0, l: 0 };

    this.bandHsl = this.bands.map((_, i) => {
      sampleGradientHsl(gradient, i / this.bands.length, hsl);
      return { h: hsl.h, s: hsl.s, l: hsl.l };
    });
  }

  update(freqDb: Float32Array, dt: number, viewWidth: number): void {
    const count = this.bands.length;
    if (count === 0) return;

    updateLevels(freqDb, this.bands, this.levels, dt);

    const spacing = viewWidth / count;
    const barWidth = spacing * 0.8;
    const left = -viewWidth / 2;

    for (let i = 0; i < count; i++) {
      const level = this.levels[i];

      this.dummy.position.set(left + (i + 0.5) * spacing, 0, 0);
      this.dummy.scale.set(barWidth, VIEW_H * level, 1);
      this.dummy.updateMatrix();
      this.object.setMatrixAt(i, this.dummy.matrix);

      // 渐变提供色相/饱和度/基础明度，电平负责增亮
      const base = this.bandHsl[i] ?? { h: 0, s: 0, l: 0.5 };
      const s = Math.min(1, base.s * (1 - level * 0.2));
      const l = Math.min(1, base.l + level * 0.3);
      this.color.setHSL(base.h, s, l, THREE.SRGBColorSpace);
      this.object.setColorAt(i, this.color);
    }

    this.object.instanceMatrix.needsUpdate = true;
    if (this.object.instanceColor) {
      this.object.instanceColor.needsUpdate = true;
    }
  }

  dispose(): void {
    this.object.geometry.dispose();
    (this.object.material as THREE.MeshBasicMaterial).dispose();
    this.object.removeFromParent();
  }
}
