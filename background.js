const STORAGE_KEY = "hxs_sidebar_toggle";
const TOGGLE_COMMAND = "toggle-sidebars";

function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result ? result[key] : undefined);
    });
  });
}

function storageSet(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

async function loadEnabledState() {
  const stored = await storageGet(STORAGE_KEY);
  return typeof stored === "boolean" ? stored : true;
}

function updateAction(enabled) {
  chrome.action.setTitle({
    title: enabled ? "Hide X sidebars: on" : "Hide X sidebars: off",
  });
}

async function syncActionState() {
  const enabled = await loadEnabledState();
  updateAction(enabled);
}

async function toggleEnabledState() {
  const enabled = await loadEnabledState();
  const nextEnabled = !enabled;
  await storageSet(STORAGE_KEY, nextEnabled);
  updateAction(nextEnabled);
}

chrome.action.onClicked.addListener(async () => {
  await toggleEnabledState();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== TOGGLE_COMMAND) {
    return;
  }

  await toggleEnabledState();
});

chrome.runtime.onInstalled.addListener(() => {
  void syncActionState();
});

chrome.runtime.onStartup.addListener(() => {
  void syncActionState();
});
