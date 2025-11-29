document.addEventListener("DOMContentLoaded", () => {
  const homeFile = document.getElementById("homeFile");
  const homeDrop = document.getElementById("homeDrop");
  const homePreview = document.getElementById("homePreview");
  const goBgBtn = document.getElementById("goBgBtn");
  const goObjBtn = document.getElementById("goObjBtn");
  const homeSelectBtn = document.getElementById("homeSelectBtn");

  const STORAGE_KEY = "pixerase_uploaded_image";
  let uploadedImage = null;

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      uploadedImage = e.target.result;
      try { sessionStorage.setItem(STORAGE_KEY, uploadedImage); } catch (err) { console.warn("sessionStorage set failed:", err); }
      homePreview.src = uploadedImage;
      homePreview.style.display = "block";
    };
    reader.readAsDataURL(file);
  }

  homeSelectBtn && homeSelectBtn.addEventListener("click", () => homeFile.click());
  homeFile && homeFile.addEventListener("change", e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

  homeDrop.addEventListener("dragover", e => { e.preventDefault(); homeDrop.classList.add("drag-over"); });
  homeDrop.addEventListener("dragleave", () => homeDrop.classList.remove("drag-over"));
  homeDrop.addEventListener("drop", e => {
    e.preventDefault(); homeDrop.classList.remove("drag-over");
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  function goToTool(path) {
    const image = sessionStorage.getItem(STORAGE_KEY);
    if (!image) { alert("Please upload an image first."); return; }
    window.location.href = path;
  }

  goBgBtn && goBgBtn.addEventListener("click", () => goToTool("/background"));
  goObjBtn && goObjBtn.addEventListener("click", () => goToTool("/object"));
});
