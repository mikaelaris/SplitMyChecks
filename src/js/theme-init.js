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

    // Apply brand colour family early so the loader dots are correct on first paint
    if (prefs.accentColour) {
      const hex = prefs.accentColour;
      const lighten = (h, amt) => {
        let r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
        r = Math.min(255, r+amt); g = Math.min(255, g+amt); b = Math.min(255, b+amt);
        return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
      };
      const light = lighten(hex, 20);
      document.documentElement.style.setProperty('--brand',       hex);
      document.documentElement.style.setProperty('--brand-light', light);
      document.documentElement.style.setProperty('--accent',      light);
      document.documentElement.style.setProperty('--brand-dark',  lighten(hex, -15));
      document.documentElement.style.setProperty('--brand-bg',    hex + '14');
    }

    if (prefs.fontSize) {
      document.documentElement.style.fontSize = prefs.fontSize + 'px';
    }
  } catch (e) {
    // Fail silently — defaults will apply
  }
})();
