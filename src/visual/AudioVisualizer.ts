import * as THREE from "three";
import { Spectrum } from "./modes/Spectrum";
import { Waveform } from "./modes/Waveform";
import {
  DEFAULT_SPECTRUM_GRADIENT,
  DEFAULT_WAVEFORM_GRADIENT,
  type GradientConfig,
} from "./gradient";

// 显示模式
export type VisualMode = "spectrum" | "waveform";

export type VisualFrame = {
  time: Float32Array;
  freq: Float32Array;
  dt: number;
  viewWidth: number;
  widthPx: number;
  heightPx: number;
};

export type AudioVisualizerOptions = {
  sampleRate: number;
  fftSize: number;
  gradients?: {
    spectrum?: GradientConfig;
    waveform?: GradientConfig;
  };
};

// 显示模式载体
//
// 负责持有各模式对象、切换可见性，并把每帧的分析数据分派给当前模式。
// main.ts 只与它交互。
export class AudioVisualizer {
  readonly object = new THREE.Group();

  private readonly waveform: Waveform;
  private readonly spectrum: Spectrum;
  private mode: VisualMode = "spectrum";

  constructor(options: AudioVisualizerOptions) {
    this.waveform = new Waveform(
      options.gradients?.waveform ?? DEFAULT_WAVEFORM_GRADIENT,
    );
    this.spectrum = new Spectrum({
      sampleRate: options.sampleRate,
      fftSize: options.fftSize,
      gradient: options.gradients?.spectrum ?? DEFAULT_SPECTRUM_GRADIENT,
    });

    this.object.add(this.waveform.object, this.spectrum.object);
    this.applyMode();
  }

  setGradients(gradients: {
    spectrum?: GradientConfig;
    waveform?: GradientConfig;
  }): void {
    if (gradients.spectrum) this.spectrum.setGradient(gradients.spectrum);
    if (gradients.waveform) this.waveform.setGradient(gradients.waveform);
  }

  get currentMode(): VisualMode {
    return this.mode;
  }

  setMode(mode: VisualMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.applyMode();
  }

  private applyMode(): void {
    this.waveform.object.visible = this.mode === "waveform";
    this.spectrum.object.visible = this.mode === "spectrum";
  }

  update(frame: VisualFrame): void {
    if (this.mode === "waveform") {
      this.waveform.update(frame.time, frame.viewWidth);
      this.waveform.setViewport(frame.widthPx, frame.heightPx);
      return;
    }

    this.spectrum.update(frame.freq, frame.dt, frame.viewWidth);
  }

  dispose(): void {
    this.waveform.dispose();
    this.spectrum.dispose();
    this.object.removeFromParent();
  }
}
