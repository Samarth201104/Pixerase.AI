function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')
  );

  return JSON.parse(jsonPayload);
}

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("jwt_token");

  if (!token) return;

  try {
    const decoded = parseJwt(token);
    const expiry = decoded.exp * 1000; // JWT expiry in ms
    const now = Date.now();

    if (now > expiry) {
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("user_data");
      window.location.href = "/login";
    }
  } catch (e) {
    console.log("Invalid token, logging out.");
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user_data");
    window.location.href = "/login";
  }
});
