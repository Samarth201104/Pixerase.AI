document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("jwt_token");

  const protectedPages = ["/background", "/object", "/dashboard"];

  if (protectedPages.includes(window.location.pathname)) {
    if (!token || token === "undefined" || token === "null") {
      window.location.href = "/login";
    }
  }
});
