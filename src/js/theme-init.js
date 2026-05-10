// theme-init.js — Must be loaded synchronously in <head> to prevent FOUC
// Reads saved theme and applies it BEFORE any paint occurs
(function () {
  try {
    const prefs = JSON.parse(localStorage.getItem('smc_prefs') || '{}');
    let theme = prefs.theme;
    if (!theme || theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);

    // Also apply accent colour early to avoid flash
    if (prefs.accentColour) {
      document.documentElement.style.setProperty('--brand', prefs.accentColour);
    }
    if (prefs.fontSize) {
      document.documentElement.style.fontSize = prefs.fontSize + 'px';
    }
  } catch (e) {
    // Fail silently — defaults will apply
  }
})();
