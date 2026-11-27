// 화면 테마: <html data-astro-theme="white|black|navy">
import { THEMES, DEFAULT_THEME } from "./config.js?v=202611271625";

const KEY = "astro-theme";

export function currentTheme() {
  return document.documentElement.dataset.astroTheme || DEFAULT_THEME;
}

export function applyTheme(id, save = true) {
  const t = THEMES.find((x) => x.id === id) || THEMES.find((x) => x.id === DEFAULT_THEME) || THEMES[0];
  document.documentElement.dataset.astroTheme = t.id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t.meta;
  if (save) { try { localStorage.setItem(KEY, t.id); } catch { /* 저장 불가 환경 */ } }
  return t.id;
}
