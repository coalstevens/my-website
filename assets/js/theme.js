/* Shared with the portfolio's theme preference; apply before first paint. */
(() => {
  const root = document.documentElement;
  let dark = false;
  function readPreference() {
    // Paper is the default unless dark mode was explicitly saved.
    try { dark = localStorage.getItem('theme') === 'dark'; } catch {}
    render();
  }
  function render() {
    root.classList.toggle('dark', dark);
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.checked = !dark;
  }
  readPreference();
  document.addEventListener('DOMContentLoaded', () => {
    render();
    document.getElementById('theme-toggle')?.addEventListener('change', event => {
      dark = !event.target.checked;
      render();
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch {}
    });
  });
  window.addEventListener('pageshow', readPreference);
  window.addEventListener('storage', event => {
    if (event.key === 'theme' || event.key === null) readPreference();
  });
})();
