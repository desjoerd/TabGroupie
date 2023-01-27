import { debounce } from "./utils.js";
import { SettingsStore, SettingValues } from "../shared/SettingsStore.js";
import {
  ChromeTabsController,
  ChromeTabsControllerFactory,
} from "./services/ChromeTabsController.js";
import { TabGrouper } from "./services/TabGrouper.js";
import { DefaultTabKeyFactory } from "./services/TabKeyFactory.js";
import { autorun, toJS } from "mobx";

const debouncedGroupTabs = debounce(groupTabsRetry, 1200);

const settingsManager = new SettingsStore();

let currentSettings: SettingValues | undefined;

autorun(() => {
  if (!settingsManager.isLoaded) {
    settingsManager.load();
  } else {
    currentSettings = toJS(settingsManager.settings);
    debouncedGroupTabs(0);
  }
});

let MIN_TABS_BEFORE_GROUP = 1;
let MAX_TABS_BEFORE_SPLIT = 7;

chrome.storage.onChanged.addListener((changes) => {
  const newValues = Object.keys(changes).reduce((result, key) => {
    result[key] = changes[key].newValue;
    return result;
  }, {} as { [key: string]: any });

  settingsManager.update(newValues);

  debouncedGroupTabs();
});

chrome.action.onClicked.addListener(() => {
  debouncedGroupTabs(0);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    debouncedGroupTabs(600);
  }
});

chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  debouncedGroupTabs();
});

chrome.tabs.onCreated.addListener((tab) => {
  debouncedGroupTabs();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  debouncedGroupTabs();
});

chrome.tabs.onAttached.addListener((tabId) => {
  debouncedGroupTabs();
});

chrome.tabs.onDetached.addListener((tabId) => {
  debouncedGroupTabs();
});

let throttleTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
let isRunning = false;
let lastRunDateMs: number = 0;

async function groupTabsRetry(retryCount: number = 0) {
  if (isRunning) {
    console.log("Already doing a run, skipping");
    return;
  }

  if (throttleTimeout !== undefined) {
    clearTimeout(throttleTimeout);
    throttleTimeout = undefined;
  }

  if (retryCount > 10) {
    console.log("Retry count too high, stopping");
    return;
  }
  if (retryCount > 0) {
    console.log("retrying");
  }

  const nowMs = Date.now();
  if (lastRunDateMs + 500 > nowMs) {
    console.log("throttling");
    throttleTimeout = setTimeout(() => groupTabsRetry(retryCount), 500);
    return;
  }

  try {
    isRunning = true;
    lastRunDateMs = nowMs;
    await run();
  } catch (error) {
    if (
      error ==
      "Error: Tabs cannot be edited right now (user may be dragging a tab)."
    ) {
      throttleTimeout = setTimeout(
        () => groupTabsRetry(retryCount + 1),
        500 + retryCount * 250
      );
    } else {
      console.error(error);
    }
  } finally {
    isRunning = false;
  }
}

export async function run() {
  if (!currentSettings || !currentSettings.isEnabled) {
    return;
  }

  const controllers = await new ChromeTabsControllerFactory(
    new DefaultTabKeyFactory()
  ).create();

  for (let controller of controllers) {
    await runOnWindow(controller, currentSettings);
  }
}

async function runOnWindow(
  controller: ChromeTabsController,
  settings: SettingValues
) {
  const tabGrouper = new TabGrouper(settings);

  let tabItems = [...tabGrouper.run(controller.getTabReferences())];

  await controller.updateChrome(tabItems);
}
