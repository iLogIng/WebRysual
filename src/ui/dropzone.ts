// 全窗口拖拽入口
//
// Ctrl/脚本触发的无效拖拽在部分浏览器也会触发事件，
// 这里只负责把"用户放下的文件"过滤后交给上层

const AUDIO_EXT = /\.(mp3|wav|flac|ogg|oga|opus|m4a|aac|webm|mp4|wma)$/i;

function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/") || AUDIO_EXT.test(file.name);
}

export function bindDropzone(onFiles: (files: File[]) => void): () => void {
  // dragenter/dragleave 会因为进入子元素反复触发，用计数避免提示层闪烁
  let depth = 0;

  const setDragging = (active: boolean): void => {
    document.body.classList.toggle("dragging", active);
  };

  const onDragEnter = (e: DragEvent): void => {
    e.preventDefault();
    // 只对"文件"拖拽显示提示层
    if (!e.dataTransfer?.types.includes("Files")) return;
    depth++;
    setDragging(true);
  };

  // 必须是文件类型
  const onDragOver = (e: DragEvent): void => {
    if (e.dataTransfer?.types.includes("Files")) {
      e.preventDefault();
    }
  };

  const onDragLeave = (e: DragEvent): void => {
    e.preventDefault();
    depth = Math.max(0, depth - 1);
    if (depth === 0) setDragging(false);
  };

  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    depth = 0;
    setDragging(false);

    // FileList 是 array-like，不是数组
    const files = Array.from(e.dataTransfer?.files ?? []).filter(isAudioFile);
    if (files.length > 0) onFiles(files);
  };

  window.addEventListener("dragenter", onDragEnter);
  window.addEventListener("dragover", onDragOver);
  window.addEventListener("dragleave", onDragLeave);
  window.addEventListener("drop", onDrop);
  const reset = (): void => {
    depth = 0;
    setDragging(false);
  };
  window.addEventListener("blur", reset);
  window.addEventListener("dragend", reset);

  return () => {
    depth = 0;
    setDragging(false);
    window.removeEventListener("dragenter", onDragEnter);
    window.removeEventListener("dragover", onDragOver);
    window.removeEventListener("dragleave", onDragLeave);
    window.removeEventListener("drop", onDrop);
    window.removeEventListener("blur", reset);
    window.removeEventListener("dragend", reset);
  };
}
