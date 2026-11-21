"use strict";

// Theme switching with a same-document View Transition.
// Loaded in <head> WITHOUT defer so the saved theme is applied before the
// page first paints, which avoids a flash of the wrong theme.
// Not loaded on form-no-js.html, which must stay script-free.
(function () {
  const STORAGE_KEY = "theme";
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let button = null;

  function readSavedTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "dark" || saved === "light" ? saved : null;
    } catch (error) {
      return null; // storage blocked or unavailable
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // Saving failed; the theme still applies to this page.
    }
  }

  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (button) {
      // The label names the action the button performs.
      button.textContent = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
    }
  }

  function changeTheme(next) {
    saveTheme(next);
    if (document.startViewTransition && !reducedMotion.matches) {
      document.startViewTransition(function () { applyTheme(next); });
    } else {
      applyTheme(next); // no API support, or reduced motion: switch instantly
    }
  }

  // Default is light, not the operating system preference.
  applyTheme(readSavedTheme() || "light");

  function addButton() {
    if (document.getElementById("theme-toggle")) {
      return;
    }
    button = document.createElement("button");
    button.type = "button";
    button.id = "theme-toggle";
    button.className = "theme-toggle";
    button.addEventListener("click", function () {
      changeTheme(currentTheme() === "dark" ? "light" : "dark");
    });
    (document.querySelector("header") || document.body).append(button);
    applyTheme(currentTheme());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addButton);
  } else {
    addButton();
  }

  // Keep other open tabs and back/forward-cache pages in sync.
  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY) {
      applyTheme(readSavedTheme() || "light");
    }
  });
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      applyTheme(readSavedTheme() || currentTheme());
    }
  });
})();