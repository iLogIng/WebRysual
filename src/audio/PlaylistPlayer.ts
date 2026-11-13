import type { AudioEngine, EngineSnapshot } from "./AudioEngine";
import { Playlist } from "./Playlist";

export type PlayerSnapshot = EngineSnapshot & {
  // 0-based，-1 表示空列表
  index: number;
  count: number;
  loading: boolean;
};

type LoadResult = "ok" | "skip" | "stale";

// 负责协调播放列表
//
// 把 File 列表接入 AudioEngine、自然结束时自动下一首、
// 加载失败时跳过、以及忽略过期的解码结果。
export class PlaylistPlayer {
  readonly engine: AudioEngine;

  private readonly playlist = new Playlist();
  private loading = false;

  // 每次请求自增，用于丢弃过期的异步加载
  private requestId = 0;

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

    return this.loadAndPlay(file).then(() => undefined);
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

  changeGain(delta: number): void {
    this.engine.changeGain(delta);
  }

  snapshot(): PlayerSnapshot {
    return {
      ...this.engine.snapshot(),
      index: this.playlist.currentIndex,
      count: this.playlist.size,
      loading: this.loading,
    };
  }

  dispose(): void {
    this.requestId++;
    this.engine.onEnded = null;
    this.playlist.clear();
  }

  // 最多尝试一圈，失败则跳过
  private async advance(direction: 1 | -1): Promise<void> {
    const count = this.playlist.size;
    if (count === 0) return;

    for (let attempt = 0; attempt < count; attempt++) {
      const file = this.playlist.move(direction);
      if (!file) return;

      const result = await this.loadAndPlay(file);
      if (result === "ok" || result === "stale") return;
      // "skip": 尝试下一首
    }
  }

  private async loadAndPlay(file: File): Promise<LoadResult> {
    const id = ++this.requestId;
    this.loading = true;

    try {
      const loaded = await this.engine.load(file);

      // 被更晚的请求取代
      if (id !== this.requestId || !loaded) return "stale";

      await this.engine.play();
      if (id !== this.requestId) return "stale";

      return "ok";
    } catch (err) {
      if (id !== this.requestId) return "stale";

      console.warn(`[playlist] skip: ${file.name}`, err);
      return "skip";
    } finally {
      if (id === this.requestId) {
        this.loading = false;
      }
    }
  }
}
