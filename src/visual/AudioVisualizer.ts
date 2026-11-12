import * as THREE from "three";
import { Spectrum } from "./modes/Spectrum";
import { Waveform } from "./modes/Waveform";

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
    this.waveform = new Waveform();
    this.spectrum = new Spectrum(options.sampleRate, options.fftSize);

    this.object.add(this.waveform.object, this.spectrum.object);
    this.applyMode();
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
