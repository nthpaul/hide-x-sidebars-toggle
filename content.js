(function () {
  const STORAGE_KEY = "hxs_sidebar_toggle";
  const BUTTON_ID = "hxs-leaf-toggle";
  const ACTIVE_CLASS = "is-active";
  const ROOT_ATTRIBUTE = "data-hxs-sidebars-hidden";
  const THEME_ATTRIBUTE = "data-hxs-theme";
  const THEME_COOKIE = "night_mode";
  const THEME_CHECK_MS = 1500;

  const state = {
    button: null,
    enabled: true,
    theme: "light",
    themeTimer: null,
  };

  function getStorageArea() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return chrome.storage.local;
    }

    return null;
  }

  function storageGet(key) {
    const area = getStorageArea();
    if (!area) {
      return Promise.resolve(undefined);
    }

    return new Promise((resolve) => {
      area.get([key], (result) => {
        resolve(result ? result[key] : undefined);
      });
    });
  }

  function storageSet(key, value) {
    const area = getStorageArea();
    if (!area) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      area.set({ [key]: value }, () => resolve());
    });
  }

  async function loadEnabledState() {
    try {
      const stored = await storageGet(STORAGE_KEY);
      if (typeof stored === "boolean") {
        return stored;
      }
    } catch (_error) {
      // Fall through to localStorage.
    }

    try {
      const fallback = window.localStorage.getItem(STORAGE_KEY);
      return fallback === null ? true : fallback === "true";
    } catch (_error) {
      return true;
    }
  }

  async function persistEnabledState(enabled) {
    try {
      await storageSet(STORAGE_KEY, enabled);
    } catch (_error) {
      // Ignore storage errors and still try the fallback.
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch (_error) {
      // Ignore storage failures in fallback mode.
    }
  }

  function applyVisibility() {
    document.documentElement.setAttribute(ROOT_ATTRIBUTE, state.enabled ? "true" : "false");
  }

  function readCookie(name) {
    const cookies = document.cookie ? document.cookie.split("; ") : [];

    for (const cookie of cookies) {
      const [rawName, ...rest] = cookie.split("=");
      if (rawName === name) {
        return rest.join("=");
      }
    }

    return null;
  }

  function getThemeFromCookie() {
    const nightMode = readCookie(THEME_COOKIE);
    return nightMode && nightMode !== "0" ? "dark" : "light";
  }

  function applyTheme() {
    if (!state.button) {
      return;
    }

    state.button.setAttribute(THEME_ATTRIBUTE, state.theme);
  }

  function syncTheme() {
    const nextTheme = getThemeFromCookie();
    if (nextTheme === state.theme) {
      return;
    }

    state.theme = nextTheme;
    applyTheme();
  }

  function updateButtonState() {
    if (!state.button) {
      return;
    }

    state.button.classList.toggle(ACTIVE_CLASS, state.enabled);
    state.button.setAttribute("aria-pressed", String(state.enabled));
    state.button.title = state.enabled ? "Sidebars hidden" : "Sidebars visible";
    applyTheme();
  }

  async function setEnabled(enabled) {
    state.enabled = enabled;
    applyVisibility();
    updateButtonState();
    await persistEnabledState(enabled);
  }

  function watchStorage() {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.onChanged
    ) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[STORAGE_KEY]) {
        return;
      }

      const nextEnabled = changes[STORAGE_KEY].newValue;
      if (typeof nextEnabled !== "boolean" || nextEnabled === state.enabled) {
        return;
      }

      state.enabled = nextEnabled;
      applyVisibility();
      updateButtonState();

      try {
        window.localStorage.setItem(STORAGE_KEY, String(nextEnabled));
      } catch (_error) {
        // Ignore local fallback sync errors.
      }
    });
  }

  function createButton() {
    const existing = document.getElementById(BUTTON_ID);
    if (existing) {
      state.button = existing;
      updateButtonState();
      return;
    }

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.setAttribute("aria-label", "Toggle sidebars");
    button.innerHTML = `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path class="hxs-tree-trunk" d="M16 27.5V19.2" />
        <path class="hxs-tree-branch" d="M16 19.5C13.8 17.2 11.8 14.8 9.8 11.8" />
        <path class="hxs-tree-branch" d="M16 19.1C17.8 16.1 20.3 13.5 23.2 11.3" />
        <path class="hxs-tree-branch" d="M16 16.5C15.7 13.6 15.9 10.9 16.7 8.2" />
        <path class="hxs-tree-leaf" d="M8.7 11.6C9.8 9.9 12 9.5 13.5 10.8C12.9 12.9 11.2 14.1 8.9 14C7.9 13.2 7.8 12.3 8.7 11.6Z" />
        <path class="hxs-tree-leaf" d="M18.2 8.4C19.7 7.5 21.7 7.9 22.6 9.6C21.5 11.4 19.7 12 17.7 11.3C17.1 10 17.3 9 18.2 8.4Z" />
        <path class="hxs-tree-leaf" d="M21.6 12C23.3 11.3 25.2 12 25.8 13.9C24.5 15.5 22.5 15.8 20.7 14.7C20.4 13.3 20.7 12.4 21.6 12Z" />
      </svg>
    `;

    button.addEventListener("click", () => {
      void setEnabled(!state.enabled);
    });

    document.body.appendChild(button);
    state.button = button;
    updateButtonState();
  }

  function watchTheme() {
    if (state.themeTimer !== null) {
      return;
    }

    state.themeTimer = window.setInterval(() => {
      syncTheme();
    }, THEME_CHECK_MS);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        syncTheme();
      }
    });
  }

  function ensureUi() {
    if (!document.body) {
      return;
    }

    createButton();
  }

  async function init() {
    state.enabled = await loadEnabledState();
    state.theme = getThemeFromCookie();
    applyVisibility();
    watchTheme();
    watchStorage();

    if (document.body) {
      ensureUi();
      return;
    }

    document.addEventListener(
      "DOMContentLoaded",
      () => {
        ensureUi();
      },
      { once: true }
    );
  }

  void init();
})();
