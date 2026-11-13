import type { PlayerSnapshot, PlaylistPlayer } from "../audio/PlaylistPlayer";

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
}

// 去除.ext扩展名
function stripExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

export type PlaylistPanel = {
  render(s: PlayerSnapshot): void;
  toggle(): void;
  dispose(): void;
};

// 绑定 playlist 面板
export function bindPlaylistPanel(player: PlaylistPlayer): PlaylistPanel {
  const root = must<HTMLElement>("playlist");
  const toggleBtn = must<HTMLButtonElement>("panel-toggle");
  const listEl = must<HTMLUListElement>("playlist-list");
  const countEl = must<HTMLElement>("playlist-count");
  const addBtn = must<HTMLButtonElement>("playlist-add");
  const fileInput = must<HTMLInputElement>("file");

  let lastKey = "";
  let lastActiveIndex = -1;
  let pendingFocusIndex: number | null = null;

  const scrollToActive = (): void => {
    if (!root.classList.contains("open")) return;

    listEl
      .querySelector<HTMLElement>("li.active")
      ?.scrollIntoView({ block: "nearest" });
  };

  const setOpen = (open: boolean): void => {
    root.classList.toggle("open", open);
    // 关闭时移出 Tab 顺序，并阻止内部元素被聚焦/点击
    root.toggleAttribute("inert", !open);
    root.setAttribute("aria-hidden", String(!open));
    toggleBtn.setAttribute("aria-expanded", String(open));

    if (open) scrollToActive();
  };

  const onToggle = (): void => {
    setOpen(!root.classList.contains("open"));
  };

  const onAdd = (): void => {
    void player.unlock();
    fileInput.click();
  };

  const onListClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const removeBtn = target.closest<HTMLButtonElement>(
      "button[data-action='remove']",
    );
    if (removeBtn) {
      const li = removeBtn.closest<HTMLLIElement>("li[data-index]");
      if (li) {
        const index = Number(li.dataset.index);
        player.removeAt(index);

        // 下一帧重建后恢复焦点到相邻项
        pendingFocusIndex = Math.min(
          index,
          Math.max(0, player.files.length - 1),
        );
      }
      return;
    }

    // 整行可点: 文件名按钮、行背景都触发播放
    const li = target.closest<HTMLLIElement>("li[data-index]");
    if (li) {
      void player.playIndex(Number(li.dataset.index));
    }
  };

  toggleBtn.addEventListener("click", onToggle);
  addBtn.addEventListener("click", onAdd);
  listEl.addEventListener("click", onListClick);

  // 初始化关闭状态（inert / aria-hidden / aria-expanded）
  setOpen(root.classList.contains("open"));

  return {
    render(s: PlayerSnapshot): void {
      const key = `${s.revision}:${s.index}:${s.loading}`;
      if (key === lastKey) return;
      lastKey = key;

      countEl.textContent = String(s.count);

      const frag = document.createDocumentFragment();

      player.files.forEach((file, i) => {
        const li = document.createElement("li");
        li.className = "track-item";
        li.dataset.index = String(i);
        if (i === s.index) li.classList.add("active");

        const nameBtn = document.createElement("button");
        nameBtn.type = "button";
        nameBtn.className = "track-name";
        nameBtn.textContent = stripExt(file.name);
        nameBtn.title = file.name;

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "track-remove";
        removeBtn.dataset.action = "remove";
        removeBtn.setAttribute("aria-label", `移除 ${file.name}`);
        removeBtn.textContent = "×";

        li.append(nameBtn, removeBtn);
        frag.append(li);
      });

      if (player.files.length === 0) {
        const empty = document.createElement("li");
        empty.className = "playlist-empty";
        empty.textContent = "暂无曲目，请点击下方添加";
        frag.append(empty);
      }

      listEl.replaceChildren(frag);

      if (s.index !== lastActiveIndex) {
        lastActiveIndex = s.index;
        scrollToActive();
      }

      if (pendingFocusIndex !== null) {
        const idx = pendingFocusIndex;
        pendingFocusIndex = null;

        if (root.classList.contains("open")) {
          if (player.files.length === 0) {
            addBtn.focus();
          } else {
            const target = Math.min(idx, player.files.length - 1);
            listEl
              .querySelector<HTMLButtonElement>(
                `li[data-index="${target}"] .track-name`,
              )
              ?.focus();
          }
        }
      }
    },

    toggle(): void {
      setOpen(!root.classList.contains("open"));
    },

    dispose(): void {
      toggleBtn.removeEventListener("click", onToggle);
      addBtn.removeEventListener("click", onAdd);
      listEl.removeEventListener("click", onListClick);
      listEl.replaceChildren();
    },
  };
}
