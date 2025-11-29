document.addEventListener("DOMContentLoaded", () => {

  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const forgotForm = document.getElementById("forgotForm");
  const resetForm = document.getElementById("resetForm");

  // ================= LOGIN =================
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        // ✅ Save token + user data
        localStorage.setItem("jwt_token", data.token);
        localStorage.setItem("user_data", JSON.stringify(data.user));

        // Go to dashboard after login
        window.location.href = "/dashboard";
      } else {
        const msg = document.getElementById("loginMessage");
        if (msg) msg.innerText = data.error || "Login failed";
      }
    });
  }

  // ================= SIGNUP =================
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("signupName").value;
      const email = document.getElementById("signupEmail").value;
      const password = document.getElementById("signupPassword").value;

      const res = await fetch("/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (res.ok) {
        // ✅ Save token + user data
        localStorage.setItem("jwt_token", data.token);
        localStorage.setItem("user_data", JSON.stringify(data.user));

        // Go to dashboard after signup
        window.location.href = "/dashboard";
      } else {
        const msg = document.getElementById("signupMessage");
        if (msg) msg.innerText = data.error || "Signup failed";
      }
    });
  }

  // ================= FORGOT PASSWORD =================
  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("forgotEmail").value;

      const res = await fetch("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      const msg = document.getElementById("forgotMessage");

      if (res.ok) {
        if (msg) msg.innerText = "OTP sent successfully! Check your email.";
        setTimeout(() => {
          window.location.href = "/reset-password";
        }, 1500);
      } else {
        if (msg) msg.innerText = data.error || "Failed to send OTP";
      }
    });
  }

  // ================= RESET PASSWORD =================
  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("resetEmail").value;
      const otp = document.getElementById("resetOtp").value;
      const new_password = document.getElementById("resetPassword").value;

      const res = await fetch("/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, new_password })
      });

      const data = await res.json();
      const msg = document.getElementById("resetMessage");

      if (res.ok) {
        if (msg) msg.innerText = "Password reset successful!";
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } else {
        if (msg) msg.innerText = data.error || "Reset failed";
      }
    });
  }

});
