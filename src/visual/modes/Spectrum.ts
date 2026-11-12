import * as THREE from "three";
import { makeFftBands, updateLevels, type Band } from "../../audio/bands";
import { VIEW_H } from "../constants";

const DEFAULT_BAND_COUNT = 48;

// 频谱柱
export class Spectrum {
  readonly object: THREE.InstancedMesh;

  // 频带
  private readonly bands: Band[];
  // 柱高 dB
  private readonly levels: Float32Array;
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();

  constructor(
    sampleRate: number,
    fftSize: number,
    bandCount = DEFAULT_BAND_COUNT,
  ) {
    this.bands = makeFftBands(sampleRate, fftSize, bandCount);
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

      const ratio = i / count;
      const h = (222 + 120 * ratio) / 360;
      const s = 1 - level * 0.2;
      const l = 0.5 + level * 0.3;
      this.color.setHSL(h, s, l, THREE.SRGBColorSpace);
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
