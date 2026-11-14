import { showToast } from "./toast";

const CURSOR_IDLE_MS = 3000;

export type FullscreenController = {
  toggle(): Promise<void>;
  dispose(): void;
};

// 全屏控制器
//
// 只使用 Fullscreen API，不依赖 F11。
// Esc 退出全屏是浏览器保留行为，通过 fullscreenchange 同步状态。
export function bindFullscreen(
  button: HTMLButtonElement,
): FullscreenController {
  let pending = false;
  let idleTimer = 0;

  const clearIdle = (): void => {
    if (idleTimer !== 0) {
      window.clearTimeout(idleTimer);
      idleTimer = 0;
    }
  };

  const showCursor = (): void => {
    document.body.classList.remove("hide-cursor");
  };

  const scheduleHide = (): void => {
    showCursor();
    clearIdle();

    if (!document.fullscreenElement) return;

    idleTimer = window.setTimeout(() => {
      idleTimer = 0;
      if (document.fullscreenElement) {
        document.body.classList.add("hide-cursor");
      }
    }, CURSOR_IDLE_MS);
  };

  const syncButton = (): void => {
    const active = document.fullscreenElement !== null;
    const supported = document.fullscreenEnabled;

    button.textContent = active ? "退出全屏" : "全屏";
    button.setAttribute("aria-pressed", String(active));
    button.disabled = !supported && !active;
    button.title =
      supported || active ? "全屏 (F)" : "当前浏览器不支持全屏";

    if (!active) showCursor();
  };

  const onChange = (): void => {
    syncButton();
    scheduleHide();
  };

  const onActivity = (): void => {
    scheduleHide();
  };

  const toggle = async (): Promise<void> => {
    if (pending) return;
    pending = true;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        if (!document.fullscreenEnabled) {
          showToast("当前环境无法进入全屏", {
            id: "fullscreen",
            tone: "error",
          });
          return;
        }

        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("[fullscreen] toggle failed", err);
      showToast("当前环境无法进入全屏", {
        id: "fullscreen",
        tone: "error",
      });
    } finally {
      pending = false;
    }
  };

  const onClick = (): void => {
    void toggle();
  };

  button.addEventListener("click", onClick);
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("mousemove", onActivity);
  document.addEventListener("keydown", onActivity);

  syncButton();

  return {
    toggle,
    dispose(): void {
      button.removeEventListener("click", onClick);
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("mousemove", onActivity);
      document.removeEventListener("keydown", onActivity);
      clearIdle();
      showCursor();
    },
  };
}
