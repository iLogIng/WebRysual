import type { AudioEngine, EngineSnapshot } from "./AudioEngine";
import { Playlist } from "./Playlist";

export type PlayerSnapshot = EngineSnapshot & {
  // 0-based，-1 表示空列表
  index: number;
  count: number;
  loading: boolean;
  // 列表内容变化计数
  revision: number;
};

type LoadResult = "ok" | "skip" | "stale";

export type PlayerError =
  | { kind: "decode"; file: File; error: unknown }
  | { kind: "play"; file: File; error: unknown };

function isNotAllowedError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "NotAllowedError";
}

// 负责协调播放列表
//
// 把 File 列表接入 AudioEngine、自然结束时自动下一首、
// 加载失败时跳过、以及忽略过期的解码结果。
export class PlaylistPlayer {
  readonly engine: AudioEngine;

  private readonly playlist = new Playlist();
  private loading = false;

  // 当前已成功加载的 File，用于单曲循环时免解码
  private currentFile: File | null = null;

  // 每次请求自增，用于丢弃过期的异步加载
  private requestId = 0;

  // 解码/播放错误回调，由 UI 层接 toast
  onError: ((e: PlayerError) => void) | null = null;

  constructor(engine: AudioEngine) {
    this.engine = engine;
    this.engine.onEnded = () => {
      void this.advance(1);
    };
  }

  get count(): number {
    return this.playlist.size;
  }

  get index(): number {
    return this.playlist.currentIndex;
  }

  get files(): readonly File[] {
    return this.playlist.list();
  }

  get isLoading(): boolean {
    return this.loading;
  }

  unlock(): Promise<void> {
    return this.engine.unlock();
  }

  addFiles(files: File[]): void {
    if (files.length === 0) return;

    const wasEmpty = this.playlist.size === 0;
    this.playlist.add(files);

    // 空列表时自动开始第一首；追加时不打断当前播放
    if (wasEmpty) {
      void this.playIndex(0);
    }
  }

  playIndex(index: number): Promise<void> {
    const file = this.playlist.setIndex(index);
    if (!file) return Promise.resolve();

    return this.loadFromCurrent(true);
  }

  // 移除指定曲目；若移除的是当前项，则续播/加载新的当前项
  removeAt(index: number): void {
    const wasCurrent = index === this.playlist.currentIndex;
    const wasPlaying = this.engine.snapshot().playing;

    const removed = this.playlist.remove(index);
    if (!removed) return;

    // 列表空: 停播并清空引擎状态
    if (this.playlist.size === 0) {
      this.currentFile = null;
      this.engine.unload();
      return;
    }

    // 删的不是当前项: 索引已修正，音频不受影响
    if (!wasCurrent) return;

    const file = this.playlist.current;
    if (!file) return;

    // 当前项被删: 播放中续播，暂停中只加载
    void this.loadFromCurrent(wasPlaying);
  }

  next(): Promise<void> {
    return this.advance(1);
  }

  prev(): Promise<void> {
    return this.advance(-1);
  }

  async toggle(): Promise<void> {
    await this.engine.toggle();
  }

  seekBy(seconds: number): void {
    this.engine.seekBy(seconds);
  }

  seekTo(seconds: number): void {
    this.engine.seekTo(seconds);
  }

  changeGain(delta: number): void {
    this.engine.changeGain(delta);
  }

  snapshot(): PlayerSnapshot {
    return {
      ...this.engine.snapshot(),
      index: this.playlist.currentIndex,
      count: this.playlist.size,
      loading: this.loading,
      revision: this.playlist.revision,
    };
  }

  dispose(): void {
    this.requestId++;
    this.engine.onEnded = null;
    this.onError = null;
    this.currentFile = null;
    this.playlist.clear();
  }

  // 最多尝试一圈，失败则跳过
  private async advance(direction: 1 | -1): Promise<void> {
    const count = this.playlist.size;
    if (count === 0) return;

    const file = this.playlist.move(direction);
    if (!file) return;

    // 单曲循环: 当前 buffer 就是这首，直接从头重播，免解码
    if (count === 1 && this.currentFile === file) {
      this.engine.seekTo(0);
      await this.engine.play();
      return;
    }

    await this.loadFromCurrent(true);
  }

  // 从当前索引开始加载，失败则向后跳过，最多一圈
  private async loadFromCurrent(autoplay: boolean): Promise<void> {
    const count = this.playlist.size;

    for (let attempt = 0; attempt < count; attempt++) {
      const file = this.playlist.current;
      if (!file) return;

      const result = await this.loadAndPlay(file, autoplay);
      if (result === "ok" || result === "stale") return;

      // "skip": 尝试下一首
      this.playlist.move(1);
    }
  }

  private async loadAndPlay(file: File, autoplay = true): Promise<LoadResult> {
    const id = ++this.requestId;
    this.loading = true;

    try {
      let loaded: boolean;

      try {
        loaded = await this.engine.load(file);
      } catch (err) {
        if (id !== this.requestId) return "stale";

        console.warn(`[playlist] decode failed: ${file.name}`, err);
        this.onError?.({ kind: "decode", file, error: err });
        return "skip";
      }

      // 被更晚的请求取代
      if (id !== this.requestId || !loaded) return "stale";

      this.currentFile = file;

      if (autoplay) {
        try {
          await this.engine.play();
        } catch (err) {
          if (id !== this.requestId) return "stale";

          console.warn(`[playlist] play failed: ${file.name}`, err);
          this.onError?.({ kind: "play", file, error: err });

          // 自动播放被策略拦截时保留当前曲目，不跳过
          if (isNotAllowedError(err)) return "ok";
          return "skip";
        }

        if (id !== this.requestId) return "stale";
      }

      return "ok";
    } finally {
      if (id === this.requestId) {
        this.loading = false;
      }
    }
  }
}
