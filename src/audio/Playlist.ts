// 播放列表
// 只维护 File 列表与当前索引，不接触 AudioEngine

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export class Playlist {
  private files: File[] = [];
  private index = -1;

  get size(): number {
    return this.files.length;
  }

  get currentIndex(): number {
    return this.index;
  }

  get current(): File | null {
    return this.files[this.index] ?? null;
  }

  list(): readonly File[] {
    return this.files;
  }

  // 追加并去重，保持传入顺序
  add(files: File[]): void {
    const seen = new Set(this.files.map(fileKey));

    for (const file of files) {
      const key = fileKey(file);
      if (seen.has(key)) continue;
      seen.add(key);
      this.files.push(file);
    }
  }

  // 环绕移动，并更新当前索引
  move(direction: 1 | -1): File | null {
    const count = this.files.length;
    if (count === 0) return null;

    if (this.index < 0) {
      this.index = 0;
    } else {
      this.index = (this.index + direction + count) % count;
    }
    return this.files[this.index];
  }

  setIndex(index: number): File | null {
    if (this.files.length === 0) {
      this.index = -1;
      return null;
    }

    this.index = Math.max(0, Math.min(index, this.files.length - 1));
    return this.files[this.index];
  }

  clear(): void {
    this.files = [];
    this.index = -1;
  }
}
