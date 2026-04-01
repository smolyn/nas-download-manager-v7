import type { Settings, CachedTasks } from "./defaults";
import { DEFAULT_SETTINGS, DEFAULT_CACHED_TASKS } from "./defaults";

const OLD_FLAT_KEYS = [
  "stateVersion",
  "tasks",
  "taskFetchFailureReason",
  "tasksLastInitiatedFetchTimestamp",
  "tasksLastCompletedFetchTimestamp",
  "lastSevereError",
];

export async function maybeMigrateState() {
  const stored = await browser.storage.local.get(null);

  const oldSettings = stored.settings as Partial<Settings> | undefined;
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...oldSettings,
    connection: { ...DEFAULT_SETTINGS.connection, ...(oldSettings?.connection as object) },
    visibleTasks: { ...DEFAULT_SETTINGS.visibleTasks, ...(oldSettings?.visibleTasks as object) },
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      ...(oldSettings?.notifications as object),
    },
  };

  // Preserve cachedTasks if it already exists (new format), otherwise reset
  const cachedTasks: CachedTasks = (stored.cachedTasks as CachedTasks) ?? {
    ...DEFAULT_CACHED_TASKS,
  };

  // Clean up old flat keys from pre-split storage layout
  const keysToRemove = OLD_FLAT_KEYS.filter((k) => k in stored);
  if (keysToRemove.length > 0) {
    await browser.storage.local.remove(keysToRemove);
  }

  await browser.storage.local.set({ settings, cachedTasks });
}
