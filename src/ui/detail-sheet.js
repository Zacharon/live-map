// On phone widths the detail panel opens as its own screen above the list.
// Wider screens show list and detail side by side, so open() does nothing there.
// Filters start folded on phones so results are the first thing in view.
export function foldFiltersOnPhones(details) {
  if (!details) return;
  const phone = window.matchMedia("(max-width: 900px)");
  const apply = () => { details.open = !phone.matches; };
  phone.addEventListener("change", apply);
  apply();
}

export function createDetailSheet({ panel, restoreFocus }) {
  const isOpen = () => document.body.classList.contains("sheet-open");
  // While the sheet covers the screen, everything behind it is out of reach for Tab and screen readers.
  let inerted = [];
  const releaseBackground = () => {
    inerted.forEach((element) => { element.inert = false; });
    inerted = [];
  };
  const holdBackground = () => {
    releaseBackground();
    for (let node = panel; node && node !== document.body; node = node.parentElement) {
      for (const sibling of node.parentElement?.children || []) {
        if (sibling !== node && !sibling.inert && !["SCRIPT", "STYLE"].includes(sibling.tagName)) {
          sibling.inert = true;
          inerted.push(sibling);
        }
      }
    }
  };
  const close = () => {
    if (!isOpen()) return;
    document.body.classList.remove("sheet-open");
    releaseBackground();
    restoreFocus?.();
  };
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-sheet-back]")) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  window.addEventListener("resize", () => {
    if (isOpen() && !window.matchMedia("(max-width: 900px)").matches) {
      document.body.classList.remove("sheet-open");
      releaseBackground();
    }
  });
  return {
    close,
    open() {
      if (!window.matchMedia("(max-width: 900px)").matches) return;
      document.body.classList.add("sheet-open");
      holdBackground();
      panel.scrollTop = 0;
      panel.querySelector("[data-sheet-back]")?.focus();
    },
  };
}
