(() => {
  const storageKey = "pixerase-theme";
  let savedTheme = "";
  try { savedTheme = localStorage.getItem(storageKey) || ""; } catch (_error) { /* Storage can be disabled in private browsing. */ }
  let theme = ["light", "dark"].includes(savedTheme)
    ? savedTheme
    : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#11121a" : "#f7f8fc");
    const button = document.querySelector(".theme-toggle");
    if (!button) return;
    const next = theme === "dark" ? "light" : "dark";
    button.setAttribute("aria-label", `Switch to ${next} theme`);
    button.title = `Switch to ${next} theme`;
    button.textContent = theme === "dark" ? "☀" : "☾";
  }

  applyTheme();
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelector(".theme-toggle")?.addEventListener("click", () => {
      theme = theme === "dark" ? "light" : "dark";
      try { localStorage.setItem(storageKey, theme); } catch (_error) { /* Theme still works for this visit. */ }
      applyTheme();
    });
  });
})();
