const STORAGE_KEY = "boots-pos-theme";

const applyTheme = (theme) => {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (err) {
    // ignore storage errors (private mode)
  }
};

export function initTheme() {
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  let theme = "light";
  try {
    theme = localStorage.getItem(STORAGE_KEY) || (prefersDark ? "dark" : "light");
  } catch (err) {
    theme = prefersDark ? "dark" : "light";
  }
  applyTheme(theme);
}

export function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  applyTheme(isDark ? "light" : "dark");
}
