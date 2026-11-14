import type { BackgroundLayer } from "../visual/BackgroundLayer";
import { showToast } from "./toast";

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
}

// 壁纸入口 面板 footer 下的选择/清除按钮
export function bindWallpaper(background: BackgroundLayer): () => void {
  const setBtn = must<HTMLButtonElement>("wallpaper-set");
  const clearBtn = must<HTMLButtonElement>("wallpaper-clear");
  const input = must<HTMLInputElement>("wallpaper-input");

  const onPick = (): void => {
    input.click();
  };

  const onChange = (): void => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    void background.setImage(file).catch((err) => {
      console.warn("[wallpaper] load failed", err);
      showToast("无法加载这张图片", {
        id: "wallpaper-error",
        tone: "error",
      });
    });
  };

  const onClear = (): void => {
    background.clear();
  };

  setBtn.addEventListener("click", onPick);
  clearBtn.addEventListener("click", onClear);
  input.addEventListener("change", onChange);

  return () => {
    setBtn.removeEventListener("click", onPick);
    clearBtn.removeEventListener("click", onClear);
    input.removeEventListener("change", onChange);
  };
}
