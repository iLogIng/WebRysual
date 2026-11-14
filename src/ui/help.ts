import { SHORTCUT_GROUPS } from "./shortcuts";

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
}

export type HelpController = {
  toggle(): void;
  isOpen(): boolean;
  dispose(): void;
};

function renderShortcuts(container: HTMLElement): void {
  const frag = document.createDocumentFragment();

  for (const group of SHORTCUT_GROUPS) {
    const section = document.createElement("section");
    section.className = "help-group";

    const heading = document.createElement("h3");
    heading.textContent = group.title;
    section.append(heading);

    for (const item of group.items) {
      const row = document.createElement("div");
      row.className = "help-row";

      const keys = document.createElement("span");
      keys.className = "help-keys";

      for (const key of item.keys) {
        const kbd = document.createElement("kbd");
        kbd.textContent = key;
        keys.append(kbd);
      }

      const label = document.createElement("span");
      label.className = "help-label";
      label.textContent = item.label;

      row.append(keys, label);
      section.append(row);
    }

    frag.append(section);
  }

  container.replaceChildren(frag);
}

export function bindHelp(): HelpController {
  const root = must<HTMLElement>("help");
  const card = must<HTMLElement>("help-card");
  const toggleBtn = must<HTMLButtonElement>("help-toggle");
  const closeBtn = must<HTMLButtonElement>("help-close");
  const backdrop = must<HTMLElement>("help-backdrop");
  const content = must<HTMLElement>("help-content");

  let open = false;
  let lastFocus: HTMLElement | null = null;

  renderShortcuts(content);

  const setOpen = (next: boolean): void => {
    if (open === next) return;
    open = next;

    root.hidden = !next;
    toggleBtn.setAttribute("aria-expanded", String(next));

    if (next) {
      lastFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      closeBtn.focus();
      return;
    }

    if (lastFocus?.isConnected) {
      lastFocus.focus();
    }
    lastFocus = null;
  };

  const toggle = (): void => {
    setOpen(!open);
  };

  const onToggleClick = (): void => {
    setOpen(!open);
  };

  const onCloseClick = (): void => {
    setOpen(false);
  };

  const onBackdropClick = (): void => {
    setOpen(false);
  };

  // 对话框内只有关闭按钮可聚焦，Tab 保持在卡片内
  const onCardKeyDown = (e: KeyboardEvent): void => {
    if (!open) return;

    if (e.key === "Escape") {
      setOpen(false);
      return;
    }

    if (e.key !== "Tab") return;
    e.preventDefault();
    closeBtn.focus();
  };

  toggleBtn.addEventListener("click", onToggleClick);
  closeBtn.addEventListener("click", onCloseClick);
  backdrop.addEventListener("click", onBackdropClick);
  card.addEventListener("keydown", onCardKeyDown);

  return {
    toggle,
    isOpen: () => open,
    dispose(): void {
      toggleBtn.removeEventListener("click", onToggleClick);
      closeBtn.removeEventListener("click", onCloseClick);
      backdrop.removeEventListener("click", onBackdropClick);
      card.removeEventListener("keydown", onCardKeyDown);

      open = false;
      root.hidden = true;
      toggleBtn.setAttribute("aria-expanded", "false");
      lastFocus = null;
    },
  };
}
