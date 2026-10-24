document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("homeFile");
  const drop = document.getElementById("homeDrop");
  const preview = document.getElementById("homePreview");
  const status = document.getElementById("homeStatus");
  if (!input || !drop || !window.Pixerase) return;

  function choose(file) {
    const error = Pixerase.validate(file);
    if (error) return Pixerase.setStatus(status, error, "error");
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
    Pixerase.setStatus(status, `${file.name} is ready. Choose a tool, then select the image there.`, "success");
  }

  document.getElementById("homeSelectBtn")?.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); input.click(); });
  document.getElementById("homeSelectBtn")?.addEventListener("keydown", event => { if (["Enter", " "].includes(event.key)) input.click(); });
  input.addEventListener("change", () => choose(input.files[0]));
  ["dragenter", "dragover"].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add("drag-over"); }));
  ["dragleave", "drop"].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.remove("drag-over"); }));
  drop.addEventListener("drop", event => choose(event.dataTransfer.files[0]));
  document.getElementById("goBgBtn")?.addEventListener("click", () => { window.location.href = "/background"; });
  document.getElementById("goObjBtn")?.addEventListener("click", () => { window.location.href = "/object"; });
});
