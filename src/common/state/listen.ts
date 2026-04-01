import type { Settings, State, CachedTasks } from "./defaults";
import { DEFAULT_SETTINGS, DEFAULT_CACHED_TASKS } from "./defaults";
import { typesafeUnionMembers } from "../lang";

export const SETTING_NAMES = typesafeUnionMembers<keyof Settings>({
  connection: true,
  visibleTasks: true,
  taskSortType: true,
  notifications: true,
  shouldHandleDownloadLinks: true,
  badgeDisplayType: true,
  showInactiveTasks: true,
});

const STORAGE_KEYS = ["settings", "cachedTasks"] as const;

let cachedSettings: Settings = DEFAULT_SETTINGS;
let cachedCachedTasks: CachedTasks = DEFAULT_CACHED_TASKS;

const stateListeners: ((state: State) => void)[] = [];

let didAttachSingletonListener = false;

function notifyListeners() {
  const state: State = { settings: cachedSettings, cachedTasks: cachedCachedTasks };
  stateListeners.forEach((l) => l(state));
}

function attachSharedStateListener() {
  if (!didAttachSingletonListener) {
    didAttachSingletonListener = true;
    browser.storage.onChanged.addListener(
      (changes: Record<string, browser.storage.StorageChange>, areaName) => {
        if (areaName !== "local") return;

        let changed = false;
        if ("settings" in changes) {
          cachedSettings = (changes.settings.newValue as Settings) ?? DEFAULT_SETTINGS;
          changed = true;
        }
        if ("cachedTasks" in changes) {
          cachedCachedTasks = (changes.cachedTasks.newValue as CachedTasks) ?? DEFAULT_CACHED_TASKS;
          changed = true;
        }

        if (changed) {
          notifyListeners();
        }
      },
    );
  }
}

async function fetchInitialState() {
  const stored = await browser.storage.local.get(STORAGE_KEYS as unknown as string[]);
  cachedSettings = (stored.settings as Settings) ?? DEFAULT_SETTINGS;
  cachedCachedTasks = (stored.cachedTasks as CachedTasks) ?? DEFAULT_CACHED_TASKS;
}

export function onStoredStateChange(listener: (state: State) => void) {
  attachSharedStateListener();
  stateListeners.push(listener);
  fetchInitialState().then(() =>
    listener({ settings: cachedSettings, cachedTasks: cachedCachedTasks }),
  );
}
