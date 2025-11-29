document.addEventListener('DOMContentLoaded', () => {

  // ---------------- ELEMENTS ----------------
  const STORAGE_KEY = "pixerase_uploaded_image";

  const bgFile = document.getElementById('bgFile');
  const bgSelect = document.getElementById('bgSelect');
  const customBgFile = document.getElementById('customBgFile');

  const removeBgOnlyBtn = document.getElementById("removeBgOnlyBtn");
  const replaceBgBtn = document.getElementById("replaceBgBtn");
  const clearBtn = document.getElementById('clearBgBtn');
  const downloadBtn = document.getElementById('downloadBgBtn');

  const beforeBg = document.getElementById('beforeBg');
  const bgResult = document.getElementById('bgResult');
  const bgDrop = document.getElementById('bgDrop');

  const templateInput = document.getElementById("bgTemplateSelect");

  let selectedTemplate = null;

  // ---------------- LOAD IMAGE FROM SESSION ----------------
  function loadFromSession() {
    const dataUrl = sessionStorage.getItem(STORAGE_KEY);
    if (dataUrl) {
      beforeBg.src = dataUrl;
      beforeBg.style.display = 'block';
      bgResult.style.display = 'none';
    }
  }
  loadFromSession();

  // ---------------- SELECT MAIN IMAGE ----------------
  bgSelect && bgSelect.addEventListener('click', () => bgFile.click());

  bgFile && bgFile.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = () => {
      sessionStorage.setItem(STORAGE_KEY, reader.result);
      beforeBg.src = reader.result;
      beforeBg.style.display = 'block';
      bgResult.style.display = 'none';
    };
    reader.readAsDataURL(f);
  });

  // ---------------- TEMPLATE SELECTION ----------------
  document.querySelectorAll(".selectable-template").forEach(img => {
    img.addEventListener("click", () => {
      document.querySelectorAll(".selectable-template")
        .forEach(i => i.classList.remove("selected"));

      img.classList.add("selected");
      selectedTemplate = img.dataset.name;
      templateInput.value = selectedTemplate;

      console.log("✅ Template selected:", selectedTemplate);
    });
  });

  // ---------------- CLEAR ----------------
  clearBtn && clearBtn.addEventListener('click', () => {
    beforeBg.src = "";
    beforeBg.style.display = "none";

    bgResult.src = "";
    bgResult.style.display = "none";

    sessionStorage.removeItem(STORAGE_KEY);
    selectedTemplate = null;
    templateInput.value = "";

    document.querySelectorAll(".selectable-template")
      .forEach(i => i.classList.remove("selected"));
  });

  // ---------------- DOWNLOAD ----------------
  downloadBtn && downloadBtn.addEventListener('click', () => {
    const link = document.createElement("a");
    link.href = bgResult.src || beforeBg.src;
    link.download = "bg_result.png";
    link.click();
  });

  // ---------------- REMOVE BACKGROUND ONLY ----------------
  removeBgOnlyBtn && removeBgOnlyBtn.addEventListener("click", async () => {

    if (!beforeBg.src) {
      alert("Upload image first");
      return;
    }

    const token = localStorage.getItem("jwt_token");
    if (!token) {
      alert("Please login first");
      return;
    }

    const blob = await fetch(beforeBg.src).then(r => r.blob());
    const formData = new FormData();
    formData.append("image", blob, "image.png");

    try {
      const res = await fetch("/api/remove-background", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token
        },
        body: formData
      });

      const outBlob = await res.blob();
      const outUrl = URL.createObjectURL(outBlob);

      bgResult.src = outUrl;
      bgResult.style.display = "block";

    } catch (err) {
      alert("Server error: " + err.message);
    }
  });

  // ---------------- REPLACE BACKGROUND ----------------
  replaceBgBtn && replaceBgBtn.addEventListener("click", async () => {

    if (!beforeBg.src) {
      alert("Upload image first");
      return;
    }

    const token = localStorage.getItem("jwt_token");
    if (!token) {
      alert("Please login first");
      return;
    }

    // check at least one background source selected
    if (!selectedTemplate && customBgFile.files.length === 0) {
      alert("Select a template or upload a background first");
      return;
    }

    const blob = await fetch(beforeBg.src).then(r => r.blob());
    const formData = new FormData();
    formData.append("image", blob, "image.png");

    // ✅ template
    if (selectedTemplate) {
      formData.append("bg_template", selectedTemplate);
    }

    // ✅ custom background
    if (customBgFile.files.length > 0) {
      formData.append("background", customBgFile.files[0]);
    }

    try {
      const res = await fetch("/api/remove-background", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token
        },
        body: formData
      });

      const outBlob = await res.blob();
      const outUrl = URL.createObjectURL(outBlob);

      bgResult.src = outUrl;
      bgResult.style.display = "block";

    } catch (err) {
      alert("Server error: " + err.message);
    }
  });

});
