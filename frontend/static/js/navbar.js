document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.nav-toggle');
  btn && btn.addEventListener('click', () => {
    document.body.classList.toggle('nav-active');
  });
});
