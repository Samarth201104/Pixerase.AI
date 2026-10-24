document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  btn && btn.addEventListener('click', () => {
    const open = links?.classList.toggle('open') || false;
    btn.setAttribute('aria-expanded', String(open));
  });
});
