document.addEventListener('DOMContentLoaded', () => {

  // ---------------- ELEMENTS ----------------
  const objFile = document.getElementById('objFile');
  const objSelect = document.getElementById('objSelect');
  const beforeObj = document.getElementById('beforeObj');
  const overlay = document.getElementById('overlayCanvas');
  const removeBtn = document.getElementById('removeObjBtn');
  const downloadBtn = document.getElementById('downloadObjBtn');
  const rectModeBtn = document.getElementById('rectModeBtn');
  const brushModeBtn = document.getElementById('brushModeBtn');
  const clearBtn = document.getElementById('clearObjBtn');
  const objResult = document.getElementById('objResult');

  let ctx = null;
  let maskCanvas = document.createElement("canvas");
  let maskCtx = maskCanvas.getContext("2d");

  let mode = "rect";
  let drawing = false;
  let startX = 0, startY = 0;
  let lastRect = null;
  let latestObjectResult = null;

  // ---------------- RESIZE CANVAS ----------------
  function resizeCanvas() {
    if (!overlay) return;

    overlay.width = overlay.clientWidth;
    overlay.height = overlay.clientHeight;
    maskCanvas.width = overlay.width;
    maskCanvas.height = overlay.height;

    ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Black = keep, White = remove
    maskCtx.fillStyle = "black";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ---------------- SELECT IMAGE ----------------
  objSelect && objSelect.addEventListener('click', () => objFile.click());

  objFile && objFile.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;

    const r = new FileReader();
    r.onload = () => {
      beforeObj.src = r.result;
      beforeObj.style.display = 'block';
      setTimeout(resizeCanvas, 100);
    };
    r.readAsDataURL(f);
  });

  // ---------------- MODE UI ----------------
  function setActiveMode(button) {
    rectModeBtn.classList.remove("active-mode");
    brushModeBtn.classList.remove("active-mode");
    button.classList.add("active-mode");
  }

  rectModeBtn.addEventListener('click', () => {
    mode = "rect";
    setActiveMode(rectModeBtn);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  });

  brushModeBtn.addEventListener('click', () => {
    mode = "brush";
    setActiveMode(brushModeBtn);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  });

  // ---------------- DRAWING EVENTS ----------------
  overlay.addEventListener('mousedown', (e) => {
    drawing = true;
    const r = overlay.getBoundingClientRect();

    startX = Math.round((e.clientX - r.left) * (overlay.width / r.width));
    startY = Math.round((e.clientY - r.top) * (overlay.height / r.height));

    if (mode === 'brush') {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.strokeStyle = "red";
      ctx.lineWidth = 15;

      maskCtx.beginPath();
      maskCtx.moveTo(startX, startY);
      maskCtx.strokeStyle = "white";
      maskCtx.lineWidth = 15;
    }
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!drawing) return;

    const r = overlay.getBoundingClientRect();
    const x = Math.round((e.clientX - r.left) * (overlay.width / r.width));
    const y = Math.round((e.clientY - r.top) * (overlay.height / r.height));

    if (mode === 'brush') {
      ctx.lineTo(x, y);
      ctx.stroke();
      maskCtx.lineTo(x, y);
      maskCtx.stroke();
    } 
    else {
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      const w = x - startX;
      const h = y - startY;
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, startY, w, h);
      lastRect = [startX, startY, w, h];
    }
  });

  overlay.addEventListener('mouseup', () => drawing = false);
  overlay.addEventListener('mouseleave', () => drawing = false);

  // ---------------- REMOVE OBJECT ----------------
  removeBtn.addEventListener('click', async () => {
    if (!beforeObj.src) {
      alert("Upload image first");
      return;
    }

    const token = localStorage.getItem("jwt_token");
    if (!token) {
      alert("Login first");
      return;
    }

    const imgBlob = await fetch(beforeObj.src).then(r => r.blob());
    const formData = new FormData();
    formData.append("image", imgBlob, "image.png");

    if (mode === "rect" && lastRect) {
      let [x, y, w, h] = lastRect;
      if (w < 0) { x += w; w = Math.abs(w); }
      if (h < 0) { y += h; h = Math.abs(h); }

      formData.append("mode", "rect");
      formData.append("rect", `${x},${y},${w},${h}`);
      formData.append("canvas_w", overlay.width);
      formData.append("canvas_h", overlay.height);
    } 
    else if (mode === "brush") {
      const maskBlob = await new Promise(resolve =>
        maskCanvas.toBlob(resolve, "image/png")
      );
      formData.append("mode", "brush");
      formData.append("mask", maskBlob, "mask.png");
    }

    const res = await fetch("/api/remove-object", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token },
      body: formData
    });

    const outBlob = await res.blob();
    const url = URL.createObjectURL(outBlob);

    objResult.src = url;
    objResult.style.display = "block";
    latestObjectResult = url;
  });

  // ---------------- CLEAR ----------------
  clearBtn && clearBtn.addEventListener("click", () => {

    beforeObj.src = "";
    beforeObj.style.display = "none";

    objResult.src = "";
    objResult.style.display = "none";

    ctx.clearRect(0, 0, overlay.width, overlay.height);
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    maskCtx.fillStyle = "black";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    lastRect = null;
    latestObjectResult = null;
  });

  // ---------------- DOWNLOAD ----------------
  downloadBtn.addEventListener("click", () => {
    if (!latestObjectResult) {
      alert("No image to download");
      return;
    }
    const a = document.createElement("a");
    a.href = latestObjectResult;
    a.download = "object_removed.png";
    a.click();
  });

});
