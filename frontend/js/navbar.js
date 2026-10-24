document.addEventListener("DOMContentLoaded", () => {
  const button = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!button || !links) return;

  function setOpen(open) {
    links.classList.toggle("open", open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    button.textContent = open ? "×" : "☰";
  }

  button.addEventListener("click", () => setOpen(!links.classList.contains("open")));
  links.addEventListener("click", event => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") setOpen(false);
  });
  window.matchMedia("(min-width: 721px)").addEventListener?.("change", event => {
    if (event.matches) setOpen(false);
  });
});
