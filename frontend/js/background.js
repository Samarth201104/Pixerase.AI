document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("bgFile");
  const before = document.getElementById("beforeBg");
  const result = document.getElementById("bgResult");
  const status = document.getElementById("bgStatus");
  if (!input || !window.Pixerase) return;
  let sourceFile = null;
  let resultUrl = "";
  let template = "";
  function select(file) {
    const error = Pixerase.validate(file);
    if (error) { Pixerase.setStatus(status, error, "error"); return; }
    sourceFile = file;
    before.src = URL.createObjectURL(file);
    before.style.display = "block";
    result.style.display = "none";
    document.getElementById("downloadBgBtn").disabled = true;
    Pixerase.setStatus(status, "Image ready. Choose an edit to continue.");
  }
  document.getElementById("bgSelect")?.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); input.click(); });
  document.getElementById("bgSelect")?.addEventListener("keydown", event => { if (["Enter", " "].includes(event.key)) input.click(); });
  input.addEventListener("change", () => select(input.files[0]));
  const drop = document.getElementById("bgDrop");
  ["dragenter", "dragover"].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add("drag-over"); }));
  ["dragleave", "drop"].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.remove("drag-over"); }));
  drop.addEventListener("drop", event => select(event.dataTransfer.files[0]));
  document.getElementById("customBgFile")?.addEventListener("change", event => {
    const file = event.target.files[0];
    if (file && Pixerase.validate(file)) Pixerase.setStatus(status, Pixerase.validate(file), "error");
    else if (file) { template = ""; document.getElementById("bgTemplateSelect").value = ""; document.querySelectorAll(".selectable-template").forEach(item => item.classList.remove("selected")); Pixerase.setStatus(status, `Custom background selected: ${file.name}`); }
  });
  document.querySelectorAll(".selectable-template").forEach(image => {
    const choose = () => { document.querySelectorAll(".selectable-template").forEach(item => item.classList.remove("selected")); image.classList.add("selected"); template = image.dataset.name; document.getElementById("bgTemplateSelect").value = template; Pixerase.setStatus(status, "Background selected.", "success"); };
    image.addEventListener("click", choose);
    image.addEventListener("keydown", event => { if (["Enter", " "].includes(event.key)) choose(); });
  });
  async function process(replace) {
    if (!sourceFile) { Pixerase.setStatus(status, "Choose an image to continue.", "error"); return; }
    const custom = document.getElementById("customBgFile").files[0];
    if (replace && !template && !custom) { Pixerase.setStatus(status, "Choose a background or upload your own first.", "error"); return; }
    const form = new FormData();
    form.append("image", sourceFile, sourceFile.name);
    if (replace && template) form.append("bg_template", template);
    if (replace && custom) form.append("background", custom, custom.name);
    const buttons = [document.getElementById("removeBgOnlyBtn"), document.getElementById("replaceBgBtn")];
    buttons.forEach(button => button.disabled = true);
    drop.classList.add("processing");
    Pixerase.setStatus(status, "Processing your image. This can take a little while on a free server…");
    try {
      const blob = await Pixerase.request("/api/remove-background", form);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      resultUrl = URL.createObjectURL(blob);
      result.src = resultUrl;
      result.style.display = "block";
      document.getElementById("downloadBgBtn").disabled = false;
      Pixerase.setStatus(status, "Your image is ready to download.", "success");
    } catch (error) { Pixerase.setStatus(status, error.message, "error"); }
    finally { buttons.forEach(button => button.disabled = false); drop.classList.remove("processing"); }
  }
  document.getElementById("removeBgOnlyBtn").addEventListener("click", () => process(false));
  document.getElementById("replaceBgBtn").addEventListener("click", () => process(true));
  document.getElementById("downloadBgBtn").addEventListener("click", () => { if (resultUrl) Pixerase.saveBlobUrl(resultUrl, "background-removed.png"); });
  document.getElementById("clearBgBtn").addEventListener("click", () => {
    [before, result].forEach(image => { if (image.src.startsWith("blob:")) URL.revokeObjectURL(image.src); image.removeAttribute("src"); image.style.display = "none"; });
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = ""; sourceFile = null; template = ""; input.value = ""; document.getElementById("customBgFile").value = ""; document.getElementById("bgTemplateSelect").value = ""; document.getElementById("downloadBgBtn").disabled = true;
    document.querySelectorAll(".selectable-template").forEach(item => item.classList.remove("selected")); Pixerase.setStatus(status, "");
  });
});
