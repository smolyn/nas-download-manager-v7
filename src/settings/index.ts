import "../settings/index.css";
import { setupGlobalErrorHandler } from "../common/errorHandlers";

setupGlobalErrorHandler();

import { mount, unmount } from "svelte";
import type { Settings, CachedTasks } from "../common/state/defaults";
import { DEFAULT_CACHED_TASKS } from "../common/state/defaults";
import { onStoredStateChange } from "../common/state/listen";
import { saveLastSevereError } from "../common/errorHandlers";
import SettingsForm from "./SettingsForm.svelte";

function clearError() {
  browser.storage.local.get("cachedTasks").then((stored) => {
    const current = (stored.cachedTasks as CachedTasks) ?? { ...DEFAULT_CACHED_TASKS };
    browser.storage.local.set({
      cachedTasks: { ...current, lastSevereError: undefined },
    });
  });
}

async function saveSettings(settings: Settings): Promise<boolean> {
  try {
    await browser.storage.local.set({ settings });
    return true;
  } catch (e) {
    saveLastSevereError(e);
    return false;
  }
}

const ELEMENT = document.getElementById("body")!;

let currentComponent: Record<string, unknown> | undefined;

onStoredStateChange((state) => {
  if (!state.settings) return;

  if (currentComponent) {
    unmount(currentComponent);
  }

  currentComponent = mount(SettingsForm, {
    target: ELEMENT,
    props: {
      extensionState: state,
      saveSettings,
      lastSevereError: state.cachedTasks.lastSevereError,
      clearError,
    },
  });
});
