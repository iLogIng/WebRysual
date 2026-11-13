// 轻量 toast
//
// 同一 id 的消息只保留一条并重置计时，避免批量坏文件刷屏。

export type ToastTone = "info" | "error";

export type ToastOptions = {
  id?: string;
  tone?: ToastTone;
  timeout?: number;
};

const DEFAULT_TIMEOUT = 4000;
const MAX_TOASTS = 3;

let container: HTMLDivElement | null = null;
const nodes = new Map<string, HTMLDivElement>();
const timers = new Map<string, number>();

function ensureContainer(): HTMLDivElement {
  if (container && container.isConnected) return container;

  const el = document.createElement("div");
  el.className = "toasts";
  el.setAttribute("aria-live", "polite");
  document.body.appendChild(el);
  container = el;
  return el;
}

function trim(root: HTMLElement): void {
  while (root.children.length > MAX_TOASTS) {
    const first = root.firstElementChild;
    if (!first) return;

    for (const [id, node] of nodes) {
      if (node === first) {
        nodes.delete(id);
        const timer = timers.get(id);
        if (timer !== undefined) window.clearTimeout(timer);
        timers.delete(id);
        break;
      }
    }

    first.remove();
  }
}

function createNode(root: HTMLElement, tone: ToastTone): HTMLDivElement {
  const node = document.createElement("div");
  node.className = "toast";
  node.dataset.tone = tone;
  node.setAttribute("role", "status");
  root.appendChild(node);
  trim(root);
  return node;
}

export function showToast(message: string, options: ToastOptions = {}): void {
  const { id = message, tone = "info", timeout = DEFAULT_TIMEOUT } = options;
  const root = ensureContainer();

  const existing = nodes.get(id);
  const node =
    existing && existing.isConnected ? existing : createNode(root, tone);

  if (!existing || !existing.isConnected) {
    nodes.set(id, node);
  }

  node.textContent = message;
  node.dataset.tone = tone;

  const previous = timers.get(id);
  if (previous !== undefined) window.clearTimeout(previous);

  const timer = window.setTimeout(() => {
    timers.delete(id);
    nodes.delete(id);
    node.remove();
  }, timeout);

  timers.set(id, timer);
}

export function clearToasts(): void {
  for (const timer of timers.values()) window.clearTimeout(timer);
  timers.clear();
  nodes.clear();
  container?.remove();
  container = null;
}
