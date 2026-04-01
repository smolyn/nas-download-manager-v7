import type { RequestManager } from "../backgroundState";
import { SynologyClient, ClientRequestResult } from "../../common/apis/synology/client";
import { getErrorForFailedResponse, getErrorForConnectionFailure } from "../../common/apis/errors";
import type { CachedTasks } from "../../common/state/defaults";
import { DEFAULT_CACHED_TASKS } from "../../common/state/defaults";
import { saveLastSevereError } from "../../common/errorHandlers";
import { assertNever } from "../../common/lang";

function setCachedTasks(cachedTasks: CachedTasks) {
  return browser.storage.local.set({ cachedTasks });
}

export function clearCachedTasks() {
  return setCachedTasks({ ...DEFAULT_CACHED_TASKS });
}

export async function pollTasks(api: SynologyClient, manager: RequestManager): Promise<void> {
  const token = manager.startNewRequest();
  const initiatedTimestamp = Date.now();

  console.log(`(${token}) polling for tasks...`);

  try {
    let response;

    try {
      // When changing what this requests, you almost certainly want to update DEFAULT_CACHED_TASKS.
      response = await api.DownloadStation.Task.List({
        offset: 0,
        limit: -1,
        additional: ["transfer", "detail"],
        timeout: 45000,
      });
    } catch (e) {
      saveLastSevereError(e, "error while fetching list of tasks");
      return;
    }

    if (!manager.isRequestLatest(token)) {
      console.log(`(${token}) poll result outdated; ignoring`);
      return;
    } else {
      console.log(
        `(${token}) poll result: success=${!ClientRequestResult.isConnectionFailure(response) && response.success}`,
      );
    }

    const result: CachedTasks = {
      tasks: [],
      taskFetchFailureReason: null,
      tasksLastInitiatedFetchTimestamp: initiatedTimestamp,
      tasksLastCompletedFetchTimestamp: Date.now(),
      lastSevereError: undefined,
    };

    if (ClientRequestResult.isConnectionFailure(response)) {
      if (response.type === "missing-config") {
        if (response.which === "other") {
          result.taskFetchFailureReason = "missing-config";
        } else if (response.which === "password") {
          result.taskFetchFailureReason = "login-required";
        } else {
          assertNever(response.which);
        }
      } else {
        result.taskFetchFailureReason = {
          failureMessage: getErrorForConnectionFailure(response),
        };
      }
    } else if (response.success) {
      result.tasks = response.data.tasks;
    } else {
      result.taskFetchFailureReason = {
        failureMessage: getErrorForFailedResponse(response),
      };
    }

    await setCachedTasks(result);
  } catch (e) {
    saveLastSevereError(e);
  }
}
