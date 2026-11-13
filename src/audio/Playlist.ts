// 播放列表
// 只维护 File 列表与当前索引，不接触 AudioEngine

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export class Playlist {
  private files: File[] = [];
  private index = -1;
  private revisionValue = 0;

  get size(): number {
    return this.files.length;
  }

  get currentIndex(): number {
    return this.index;
  }

  // 列表内容变化计数，供 UI 判断是否需要重绘
  get revision(): number {
    return this.revisionValue;
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
    let changed = false;

    for (const file of files) {
      const key = fileKey(file);
      if (seen.has(key)) continue;
      seen.add(key);
      this.files.push(file);
      changed = true;
    }

    if (changed) this.revisionValue++;
  }

  // 移除并修正当前索引
  remove(index: number): File | null {
    // index: 被移除的文件位置索引
    if (index < 0 || index >= this.files.length) return null;

    const [removed] = this.files.splice(index, 1);
    this.revisionValue++;

    if (this.files.length === 0) {
      this.index = -1;
      return removed;
    }

    if (index < this.index) {
      // 删的是当前项之前
      // 索引左移，仍指向同一首
      this.index--;
    } else if (index === this.index) {
      // 删的是当前项指向下一首
      // 若删的是最后一项则落到新的最后一项
      this.index = Math.min(this.index, this.files.length - 1);
    }

    return removed;
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
    if (this.files.length === 0) return;

    this.files = [];
    this.index = -1;
    this.revisionValue++;
  }
}
