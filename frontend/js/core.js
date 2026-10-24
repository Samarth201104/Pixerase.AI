(() => {
  const maxBytes = 10 * 1024 * 1024;
  const types = new Set(["image/jpeg", "image/png", "image/webp"]);
  const base = (window.APP_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
  function setStatus(target, message, kind = "") {
    if (!target) return;
    target.textContent = message;
    target.classList.remove("error", "success");
    if (kind) target.classList.add(kind);
  }
  function validate(file) {
    if (!file) return "Choose an image to continue.";
    if (!types.has(file.type)) return "Please upload a valid JPG, PNG, or WebP image.";
    if (file.size > maxBytes) return "Your image is too large. Please choose a smaller image.";
    return "";
  }
  async function request(path, form) {
    let response;
    try {
      response = await fetch(`${base}${path}`, { method: "POST", body: form });
    } catch (_error) {
      throw new Error("We couldn't connect to the processing server. Please try again.");
    }
    if (!response.ok) {
      let message = "Something went wrong while processing your image. Please try again.";
      try { message = (await response.json()).message || message; } catch (_error) { /* non-JSON error response */ }
      throw new Error(message);
    }
    return response.blob();
  }
  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function saveBlobUrl(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  }
  window.Pixerase = { validate, request, saveBlob, saveBlobUrl, setStatus, maxBytes };
})();
