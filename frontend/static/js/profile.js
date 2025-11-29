document.addEventListener("DOMContentLoaded", () => {

  const token = localStorage.getItem("jwt_token");
  const user = JSON.parse(localStorage.getItem("user_data"));

  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const profileDropdown = document.getElementById("profileDropdown");

  const profileToggle = document.getElementById("profileToggle");
  const dropdownMenu = document.getElementById("dropdownMenu");

  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const logoutBtn = document.getElementById("logoutBtn");

  if (token && user) {
    loginBtn.style.display = "none";
    signupBtn.style.display = "none";
    profileDropdown.style.display = "block";

    userName.innerText = user.name;
    userEmail.innerText = user.email;
  }

  // Toggle dropdown
  profileToggle?.addEventListener("click", () => {
    dropdownMenu.classList.toggle("show");
  });

  // Logout
  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user_data");
    window.location.href = "/login";
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!profileDropdown.contains(e.target)) {
      dropdownMenu.classList.remove("show");
    }
  });

});
