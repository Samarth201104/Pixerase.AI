document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("objFile");
  const image = document.getElementById("beforeObj");
  const canvas = document.getElementById("overlayCanvas");
  const result = document.getElementById("objResult");
  const status = document.getElementById("objStatus");
  if (!input || !canvas || !window.Pixerase) return;
  const ctx = canvas.getContext("2d");
  const mask = document.createElement("canvas");
  const maskCtx = mask.getContext("2d", { willReadFrequently: true });
  const eraseMask = document.createElement("canvas");
  const eraseMaskCtx = eraseMask.getContext("2d", { willReadFrequently: true });
  let sourceFile = null;
  let resultUrl = "";
  let mode = "rect";
  let isDrawing = false;
  let start = null;
  let current = null;
  let selections = [];
  let brushColor = "paint";
  let brushWidth = 32;
  const maxRectangles = 20;
  let marks = [];
  let redoMarks = [];
  const undoBtn = document.getElementById("undoObjBtn");
  const redoBtn = document.getElementById("redoObjBtn");
  const rectBtn = document.getElementById("rectModeBtn");
  const brushBtn = document.getElementById("brushModeBtn");

  function history() { undoBtn.disabled = !marks.length; redoBtn.disabled = !redoMarks.length; }
  function drawAction(action) {
    if (action.type === "rect") {
      selections.push(action.rect);
      const [x, y, width, height] = action.rect;
      ctx.fillStyle = "rgba(255,56,96,.12)"; ctx.fillRect(x, y, width, height); ctx.strokeStyle = "#ff3860"; ctx.lineWidth = Math.max(2, canvas.width / 700); ctx.setLineDash([8, 5]); ctx.strokeRect(x, y, width, height); ctx.setLineDash([]);
      return;
    }
    const first = action.points[0];
    if (!first) return;
    ctx.beginPath(); ctx.moveTo(first.x, first.y); maskCtx.beginPath(); maskCtx.moveTo(first.x, first.y);
    eraseMaskCtx.beginPath(); eraseMaskCtx.moveTo(first.x, first.y);
    for (const p of action.points.slice(1)) { ctx.lineTo(p.x, p.y); maskCtx.lineTo(p.x, p.y); }
    for (const p of action.points.slice(1)) eraseMaskCtx.lineTo(p.x, p.y);
    if (action.points.length === 1) {
      ctx.lineTo(first.x + .01, first.y + .01); maskCtx.lineTo(first.x + .01, first.y + .01);
      eraseMaskCtx.lineTo(first.x + .01, first.y + .01);
    }
    ctx.strokeStyle = action.color === "erase" ? "rgba(90,130,255,.45)" : "rgba(255,56,96,.5)";
    maskCtx.strokeStyle = action.color === "erase" ? "black" : "white";
    eraseMaskCtx.strokeStyle = action.color === "erase" ? "white" : "black";
    ctx.lineWidth = maskCtx.lineWidth = eraseMaskCtx.lineWidth = action.width;
    ctx.lineCap = maskCtx.lineCap = eraseMaskCtx.lineCap = "round";
    ctx.lineJoin = maskCtx.lineJoin = eraseMaskCtx.lineJoin = "round";
    ctx.stroke(); maskCtx.stroke(); eraseMaskCtx.stroke();
  }
  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); maskCtx.clearRect(0, 0, mask.width, mask.height); eraseMaskCtx.clearRect(0, 0, eraseMask.width, eraseMask.height);
    maskCtx.fillStyle = "black"; maskCtx.fillRect(0, 0, mask.width, mask.height); selections = [];
    eraseMaskCtx.fillStyle = "black"; eraseMaskCtx.fillRect(0, 0, eraseMask.width, eraseMask.height);
    marks.forEach(drawAction);
  }
  function clearCanvases() {
    if (!canvas.width || !canvas.height) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    maskCtx.clearRect(0, 0, mask.width, mask.height);
    eraseMaskCtx.clearRect(0, 0, eraseMask.width, eraseMask.height);
    maskCtx.fillStyle = "black";
    maskCtx.fillRect(0, 0, mask.width, mask.height);
    eraseMaskCtx.fillStyle = "black";
    eraseMaskCtx.fillRect(0, 0, eraseMask.width, eraseMask.height);
    marks = []; redoMarks = []; current = null; selections = []; history();
  }
  function alignCanvas() {
    if (!image.naturalWidth || !image.isConnected) return;
    const box = image.parentElement.getBoundingClientRect();
    const rect = image.getBoundingClientRect();
    canvas.style.left = `${rect.left - box.left}px`;
    canvas.style.top = `${rect.top - box.top}px`;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }
  function setImage(file) {
    const error = Pixerase.validate(file);
    if (error) { Pixerase.setStatus(status, error, "error"); return; }
    sourceFile = file;
    image.src = URL.createObjectURL(file);
    image.style.display = "block";
    image.parentElement.classList.add("has-preview");
    result.style.display = "none";
    result.parentElement.classList.remove("has-preview");
    document.getElementById("downloadObjBtn").disabled = true;
    image.onload = () => {
      canvas.width = mask.width = eraseMask.width = image.naturalWidth;
      canvas.height = mask.height = eraseMask.height = image.naturalHeight;
      canvas.style.display = "block";
      clearCanvases();
      alignCanvas();
    };
    Pixerase.setStatus(status, "Mark objects with rectangles and/or brush strokes. Use Eraser to refine your selection.");
  }
  document.getElementById("objSelect")?.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); input.click(); });
  document.getElementById("objSelect")?.addEventListener("keydown", event => { if (["Enter", " "].includes(event.key)) input.click(); });
  input.addEventListener("change", () => setImage(input.files[0]));
  const drop = document.getElementById("objDrop");
  ["dragenter", "dragover"].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add("drag-over"); }));
  ["dragleave", "drop"].forEach(type => drop.addEventListener(type, event => { event.preventDefault(); drop.classList.remove("drag-over"); }));
  drop.addEventListener("drop", event => setImage(event.dataTransfer.files[0]));
  window.addEventListener("resize", alignCanvas);
  function setMode(next) {
    mode = next;
    if (mode === "rect") { brushColor = "paint"; eraserBtn?.setAttribute("aria-pressed", "false"); eraserBtn?.classList.remove("active-mode"); }
    rectBtn.classList.toggle("active-mode", mode === "rect");
    brushBtn.classList.toggle("active-mode", mode === "brush");
    rectBtn.setAttribute("aria-pressed", String(mode === "rect"));
    brushBtn.setAttribute("aria-pressed", String(mode === "brush"));
    canvas.style.cursor = mode === "rect" ? "crosshair" : "cell";
  }
  rectBtn.addEventListener("click", () => setMode("rect"));
  brushBtn.addEventListener("click", () => { brushColor = "paint"; eraserBtn?.setAttribute("aria-pressed", "false"); eraserBtn?.classList.remove("active-mode"); setMode("brush"); });
  document.getElementById("brushSize").addEventListener("input", event => { brushWidth = Number(event.target.value); document.getElementById("brushSizeValue").textContent = brushWidth; });
  const eraserBtn = document.getElementById("eraserModeBtn");
  eraserBtn?.addEventListener("click", () => { brushColor = "erase"; setMode("brush"); eraserBtn.setAttribute("aria-pressed", "true"); eraserBtn.classList.add("active-mode"); });
  function point(event) {
    const r = canvas.getBoundingClientRect();
    return { x: (event.clientX - r.left) * canvas.width / r.width, y: (event.clientY - r.top) * canvas.height / r.height };
  }
  canvas.addEventListener("pointerdown", event => {
    if (!sourceFile || !canvas.width) return;
    event.preventDefault(); canvas.setPointerCapture(event.pointerId); isDrawing = true; start = point(event); current = start;
    if (mode === "brush") {
      currentAction = { type: "brush", points: [start], color: brushColor, width: brushWidth * canvas.width / canvas.getBoundingClientRect().width };
      ctx.beginPath(); ctx.moveTo(start.x, start.y);
      ctx.strokeStyle = brushColor === "erase" ? "rgba(90,130,255,.45)" : "rgba(255,56,96,.5)";
      maskCtx.beginPath(); maskCtx.moveTo(start.x, start.y); maskCtx.strokeStyle = brushColor === "erase" ? "black" : "white";
      eraseMaskCtx.beginPath(); eraseMaskCtx.moveTo(start.x, start.y); eraseMaskCtx.strokeStyle = brushColor === "erase" ? "white" : "black";
      const width = currentAction.width;
      ctx.lineWidth = maskCtx.lineWidth = eraseMaskCtx.lineWidth = width;
      ctx.lineCap = maskCtx.lineCap = eraseMaskCtx.lineCap = "round";
      ctx.lineJoin = maskCtx.lineJoin = eraseMaskCtx.lineJoin = "round";
      ctx.lineTo(start.x + .01, start.y + .01); ctx.stroke();
      maskCtx.lineTo(start.x + .01, start.y + .01); maskCtx.stroke();
      eraseMaskCtx.lineTo(start.x + .01, start.y + .01); eraseMaskCtx.stroke();
    }
  });
  canvas.addEventListener("pointermove", event => {
    if (!isDrawing) return;
    event.preventDefault(); const p = point(event); current = p;
    if (mode === "brush") {
      currentAction.points.push(p); ctx.lineTo(p.x, p.y); ctx.stroke(); maskCtx.lineTo(p.x, p.y); maskCtx.stroke();
      eraseMaskCtx.lineTo(p.x, p.y); eraseMaskCtx.stroke();
    }
    else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sx = Math.min(start.x, p.x), sy = Math.min(start.y, p.y), width = Math.abs(p.x - start.x), height = Math.abs(p.y - start.y);
      ctx.fillStyle = "rgba(255,56,96,.12)"; ctx.fillRect(sx, sy, width, height);
      ctx.strokeStyle = "#ff3860"; ctx.lineWidth = Math.max(2, canvas.width / 700); ctx.setLineDash([8, 5]); ctx.strokeRect(sx, sy, width, height); ctx.setLineDash([]);
    }
  });
  function finish(event) {
    if (!isDrawing) return;
    isDrawing = false;
    let rectangleLimitReached = false;
    if (mode === "rect" && start && current) {
      const x = Math.floor(Math.min(start.x, current.x)), y = Math.floor(Math.min(start.y, current.y)), width = Math.max(1, Math.round(Math.abs(current.x - start.x))), height = Math.max(1, Math.round(Math.abs(current.y - start.y)));
      const rect = width > 2 && height > 2 ? [x, y, width, height] : null;
      if (rect && marks.filter(mark => mark.type === "rect").length < maxRectangles) marks.push({ type: "rect", rect });
      else if (rect) rectangleLimitReached = true;
    } else if (mode === "brush" && currentAction) marks.push(currentAction);
    if (start && current) { redoMarks = []; history(); }
    redraw();
    start = current = null;
    currentAction = null;
    if (rectangleLimitReached) {
      Pixerase.setStatus(status, `You can mark up to ${maxRectangles} areas per image.`, "error");
    } else if (mode === "rect" && selections.length) {
      const count = selections.length;
      Pixerase.setStatus(status, `${count} area${count === 1 ? "" : "s"} marked. Draw more boxes to remove multiple objects together.`);
    }
    if (event?.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  let currentAction = null;
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);
  undoBtn.addEventListener("click", () => { if (!marks.length) return; redoMarks.push(marks.pop()); redraw(); history(); });
  redoBtn.addEventListener("click", () => { if (!redoMarks.length) return; marks.push(redoMarks.pop()); redraw(); history(); });
  document.getElementById("removeObjBtn").addEventListener("click", async () => {
    if (!sourceFile) { Pixerase.setStatus(status, "Choose an image to continue.", "error"); return; }
    const pixels = maskCtx.getImageData(0, 0, mask.width, mask.height).data;
    const hasBrushSelection = pixels.some((value, index) => index % 4 === 0 && value > 0);
    const erasePixels = eraseMaskCtx.getImageData(0, 0, eraseMask.width, eraseMask.height).data;
    const hasEraserMarks = erasePixels.some((value, index) => index % 4 === 0 && value > 0);
    if (!selections.length && !hasBrushSelection) {
      Pixerase.setStatus(status, "Mark at least one object with a rectangle or brush before processing.", "error");
      return;
    }
    const form = new FormData();
    form.append("image", sourceFile, sourceFile.name);
    const modeForRequest = selections.length && hasBrushSelection ? "mixed" : (selections.length ? "rect" : "brush");
    form.append("mode", modeForRequest);
    if (selections.length) {
      form.append("rects", JSON.stringify(selections));
      form.append("canvas_w", String(canvas.width));
      form.append("canvas_h", String(canvas.height));
    }
    if (hasBrushSelection) {
      const blob = await new Promise(resolve => mask.toBlob(resolve, "image/png"));
      if (!blob) { Pixerase.setStatus(status, "The brush selection could not be prepared. Please try again.", "error"); return; }
      form.append("mask", blob, "mask.png");
    }
    if (hasEraserMarks) {
      const blob = await new Promise(resolve => eraseMask.toBlob(resolve, "image/png"));
      if (!blob) { Pixerase.setStatus(status, "The eraser selection could not be prepared. Please try again.", "error"); return; }
      form.append("erase_mask", blob, "erase-mask.png");
    }
    const button = document.getElementById("removeObjBtn"); button.disabled = true; drop.classList.add("processing");
    Pixerase.setStatus(status, "Processing your image. This can take a little while on a free server…");
    try {
      const blob = await Pixerase.request("/api/remove-object", form);
      if (resultUrl) URL.revokeObjectURL(resultUrl); resultUrl = URL.createObjectURL(blob); result.src = resultUrl; result.style.display = "block";
      result.parentElement.classList.add("has-preview"); document.getElementById("downloadObjBtn").disabled = false; Pixerase.setStatus(status, "Your image is ready to download.", "success");
    } catch (error) { Pixerase.setStatus(status, error.message, "error"); }
    finally { button.disabled = false; drop.classList.remove("processing"); }
  });
  document.getElementById("clearObjBtn").addEventListener("click", () => {
    if (image.src.startsWith("blob:")) URL.revokeObjectURL(image.src); if (resultUrl) URL.revokeObjectURL(resultUrl);
    image.removeAttribute("src"); image.style.display = "none"; image.parentElement.classList.remove("has-preview"); result.removeAttribute("src"); result.style.display = "none"; result.parentElement.classList.remove("has-preview"); canvas.style.display = "none"; input.value = ""; sourceFile = null; resultUrl = ""; clearCanvases(); document.getElementById("downloadObjBtn").disabled = true; Pixerase.setStatus(status, "");
  });
  document.getElementById("downloadObjBtn").addEventListener("click", () => { if (resultUrl) Pixerase.saveBlobUrl(resultUrl, "object-removed.png"); });
});
