export type EngineSnapshot = {
  playing: boolean;
  currentTime: number;
  duration: number;
  gain: number;
  trackName: string | null;
  ctxState: AudioContextState;
};

// 钳制 min <= v <= max
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(v, max));
}

export class AudioEngine {
  // 解析器节点
  readonly analyser: AnalyserNode;
  // 音频上下文
  private ctx: AudioContext;
  // 音量节点
  private gainNode: GainNode;
  // 音量
  private _gain: number = 1.0;

  // 解码后的音频数据，表示尚未加载
  private buffer: AudioBuffer | null = null;
  // 当前正在播放的源节点，null表示没有活动的播放
  private source: AudioBufferSourceNode | null = null;

  // 停止时回调
  onEnded: (() => void) | null = null;

  // 当前曲目名称，null表示未加载
  private _trackName: string | null = null;

  // 播放起始的 AudioContext 时间锚点
  private startCtxTime = 0;
  // 上一次 start/seek 时指定的buffer内偏移
  private startOffset = 0;
  // 停止标记
  private paused = false;

  // 加载代次：丢弃过期的解码结果
  private loadId = 0;

  constructor() {
    this.ctx = new AudioContext();

    this.gainNode = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0;
    this.analyser.minDecibels = -80;
    this.analyser.maxDecibels = 0;

    // gainNode -> analyser -> ctx.dest
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  // 创建并打开音频源文件
  private createAndStartSource(offset: number): void {
    if (!this.buffer) return;

    // src -> gainNode -> ...
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.gainNode);

    // 更新音频上下文
    this.startCtxTime = this.ctx.currentTime;
    this.startOffset = offset;

    src.start(0, offset);

    src.onended = () => {
      if (this.source !== src) return; // 忽略手动stop()
      this.source = null;
      this.startOffset = this.buffer?.duration ?? 0;
      this.paused = true;
      this.onEnded?.(); // 停止回调
    };

    this.source = src;
  }

  private stopSource(): void {
    if (this.source) {
      const s = this.source;
      this.source = null;
      s.onended = null;
      try {
        s.stop();
      } catch {}
      s.disconnect();
    }
  }

  private isPlaying(): boolean {
    return this.source !== null && this.ctx.state === "running" && !this.paused;
  }

  // 当前的时间进度
  private currentTime(): number {
    if (!this.source || !this.buffer) {
      return this.startOffset;
    }
    // 已经经过的时间
    const elapsed = this.ctx.currentTime - this.startCtxTime;
    const current = Math.min(this.startOffset + elapsed, this.buffer.duration);
    return current;
  }

  async unlock(): Promise<void> {
    if (this.ctx.state == "suspended") {
      await this.ctx.resume();
    }
  }

  // 返回 false 表示本次加载已被更新的请求取代
  async load(file: File): Promise<boolean> {
    const id = ++this.loadId;

    if (!this.paused) this.pause();

    const arrayBuffer = await file.arrayBuffer();
    const buffer = await this.ctx.decodeAudioData(arrayBuffer);

    if (id !== this.loadId) return false;

    this.buffer = buffer;
    this._trackName = file.name;
    this.paused = false;
    this.startOffset = 0;
    this.startCtxTime = 0;
    return true;
  }

  async play(): Promise<void> {
    if (!this.buffer) return;

    await this.unlock();

    if (this.source) return;

    // 完播后从头开始
    if (this.startOffset >= this.buffer.duration - 1e-3) {
      this.startOffset = 0;
    }

    this.createAndStartSource(this.startOffset);
    this.paused = false;
  }

  async toggle(): Promise<void> {
    if (!this.buffer) return;
    if (this.isPlaying()) {
      this.pause();
    } else {
      await this.play();
    }
  }

  pause(): void {
    if (!this.source || !this.buffer) return;
    this.startOffset = this.currentTime();
    this.stopSource();
    this.paused = true;
  }

  seekTo(seconds: number): void {
    if (!this.buffer) return;

    const target = clamp(seconds, 0, this.buffer.duration);
    const wasPlaying = this.isPlaying();

    this.stopSource();
    this.startOffset = target;

    if (wasPlaying) {
      this.createAndStartSource(target);
    } else {
      this.paused = true;
    }
  }

  seekBy(seconds: number): void {
    this.seekTo(this.currentTime() + seconds);
  }

  // 停止播放并清空当前曲目（保持 AudioContext 可用）
  unload(): void {
    this.loadId++;
    this.stopSource();
    this.buffer = null;
    this._trackName = null;
    this.startOffset = 0;
    this.startCtxTime = 0;
    this.paused = true;
  }

  changeGain(delta: number): void {
    this._gain = clamp(this._gain + delta, 0, 1);
    this.gainNode.gain.setTargetAtTime(this._gain, this.ctx.currentTime, 0.01);
  }

  get sampleRate(): number {
    return this.ctx.sampleRate;
  }

  snapshot(): EngineSnapshot {
    return {
      playing: this.isPlaying(),
      currentTime: this.currentTime(),
      duration: this.buffer?.duration ?? 0,
      gain: this._gain,
      trackName: this._trackName,
      ctxState: this.ctx.state,
    };
  }

  dispose(): void {
    this.loadId++;
    this.stopSource();
    void this.ctx.close();
    this.buffer = null;
    this._trackName = null;
  }
}
