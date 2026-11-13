// 从拖拽的 DataTransferItemList 收集音频文件
//
// 目录拖拽不会出现在 dataTransfer.files 里，必须走 webkitGetAsEntry。
// 注意：items 必须在 drop 事件的同步调用栈内读取，事件返回后会失效。

const AUDIO_EXT = /\.(mp3|wav|flac|ogg|oga|opus|m4a|aac|webm|mp4|wma)$/i;
const MAX_DEPTH = 32;
const MAX_FILES = 5000;

type Collected = {
  file: File;
  path: string;
};

function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/") || AUDIO_EXT.test(file.name);
}

// readEntries 每次最多返回 100 条，必须循环到返回空数组
function readAllEntries(
  dir: FileSystemDirectoryEntry,
): Promise<FileSystemEntry[]> {
  const reader = dir.createReader();
  const all: FileSystemEntry[] = [];

  return new Promise((resolve, reject) => {
    const readBatch = (): void => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(all);
            return;
          }
          all.push(...batch);
          readBatch();
        },
        (err) => reject(err),
      );
    };

    readBatch();
  });
}

function fileFromEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

// 遍历
async function walk(
  entry: FileSystemEntry,
  out: Collected[],
  depth: number,
): Promise<void> {
  if (out.length >= MAX_FILES) return;

  try {
    if (entry.isFile) {
      const file = await fileFromEntry(entry as FileSystemFileEntry);
      if (isAudioFile(file)) {
        out.push({ file, path: entry.fullPath });
      }
      return;
    }

    if (!entry.isDirectory || depth >= MAX_DEPTH) return;

    const children = await readAllEntries(entry as FileSystemDirectoryEntry);
    for (const child of children) {
      if (out.length >= MAX_FILES) return;
      await walk(child, out, depth + 1);
    }
  } catch (err) {
    // 单个子项失败不影响整体导入
    console.warn(`[fs] skip: ${entry.fullPath}`, err);
  }
}

// 文件收集
export async function collectFiles(
  items: DataTransferItemList,
): Promise<File[]> {
  const roots: FileSystemEntry[] = [];
  const direct: File[] = [];

  // 这段必须在第一个 await 之前完成
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind !== "file") continue;

    const entry =
      typeof item.webkitGetAsEntry === "function"
        ? item.webkitGetAsEntry()
        : null;

    if (entry) {
      roots.push(entry);
    } else {
      const file = item.getAsFile();
      if (file) direct.push(file);
    }
  }

  const collected: Collected[] = [];
  for (const root of roots) {
    await walk(root, collected, 0);
  }

  // 按完整路径排序，保持与原项目目录扫描一致的顺序
  collected.sort((a, b) => a.path.localeCompare(b.path));

  const files = collected.map((item) => item.file);
  for (const file of direct) {
    if (isAudioFile(file)) files.push(file);
  }

  return files;
}
