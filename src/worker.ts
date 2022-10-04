import {
  chromeGetAllTabinfos as chromeGetAllTabinfos,
  chromeTabsGroup,
  chromeTabsUngroup,
} from "./tabHelpers.js";
import type { TabInfo } from "./tabHelpers";
import { TabTreeNode } from "./TabTreeNode.js";
import { first, groupBy, maxBy, selectMany, some } from "./collections.js";

const debouncedGroupTabs = debounce(() => groupTabsRetry(), 1200);

chrome.action.onClicked.addListener(() => {
  debouncedGroupTabs(0);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    debouncedGroupTabs(300);
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

function debounce(
  func: () => void,
  defaultDelayMs: number = 2000
): (delayOverrideMs?: number) => void {
  let timeout: number | undefined = undefined;

  return function (delayMs = defaultDelayMs) {
    clearTimeout(timeout);

    if (delayMs === 0) {
      func();
    } else {
      timeout = setTimeout(func, delayMs);
    }
  };
}

let throttleTimeout: number | undefined = undefined;
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
    await groupTabs();
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

async function groupTabs() {
  const tabs = await chromeGetAllTabinfos();

  const tabsPerWindow = groupBy(tabs, (t) => t.windowId);

  for (let windowId of tabsPerWindow.keys()) {
    await groupTabsOfWindow(windowId, tabsPerWindow.get(windowId)!);
  }
}

function getBestGroupId(tabsByGroupId: Map<number, TabInfo[]>) {
  const mostCommonGroupEntry = maxBy(
    tabsByGroupId.entries(),
    ([leftGroupId, leftTabs], [rightGroupId, rightTabs]) => {
      if (leftGroupId === -1) {
        return -1;
      }
      if (rightGroupId === -1) {
        return 1;
      }
      return leftTabs.length - rightTabs.length;
    }
  );

  return mostCommonGroupEntry === undefined ? -1 : mostCommonGroupEntry[0];
}

async function groupTabsOfWindow(windowId: number, tabInfos: TabInfo[]) {
  const treeGroups = createGroups(tabInfos);
  console.log("splitted groups", treeGroups);

  // assign best group ids for each group
  const wantedGroupIdsOfGroups = groupBy(treeGroups, (group) => {
    const tabsByGroupId = groupBy(group.getAllTabs(), (t) => t.tab.groupId);

    return getBestGroupId(tabsByGroupId);
  });

  // check for collisions and assign final groupIds
  const assignedGroups = new Map<number, TabTreeNode>();
  const newGroups: TabTreeNode[] = [];
  for (const [wantedGroupId, groups] of wantedGroupIdsOfGroups.entries()) {
    if (wantedGroupId === -1 || assignedGroups.has(wantedGroupId)) {
      // new group, or already assigned group
      newGroups.push(...groups);
    } else if (groups.length > 1) {
      // get the best group to keep, the active one, or the biggest
      const bestGroupToKeep = maxBy(groups, (left, right) => {
        if (some(left.getAllTabs(), (t) => t.tab.active)) {
          return 1;
        }
        if (some(right.getAllTabs(), (t) => t.tab.active)) {
          return -1;
        }
        return left.totalCount - right.totalCount;
      })!;

      assignedGroups.set(wantedGroupId, bestGroupToKeep);
      for (const groupToAssign of groups) {
        if (groupToAssign !== bestGroupToKeep) {
          newGroups.push(groupToAssign);
        }
      }
    } else {
      assignedGroups.set(wantedGroupId, groups[0]);
    }
  }

  for (const newGroup of newGroups) {
    if (newGroup.totalCount > 1) {
      await chromeTabsGroup(windowId, newGroup);
    } else {
      await chromeTabsUngroup(newGroup.allTabs);
    }
  }

  for (const [assignedGroupId, group] of assignedGroups.entries()) {
    if (group.totalCount > 1) {
      await chromeTabsGroup(windowId, group, assignedGroupId);
    } else {
      await chromeTabsUngroup(group.allTabs);
    }
  }

  // move tabs and groups to the correct positions
  //
  await moveTabsSoDomainsGroupTogether(treeGroups);

  console.log("tabs grouped");
}

async function moveTabsAlphabetical(groups: TabTreeNode[]) {
  const sorted = [...groups].sort((left, right) => {
    return left.urlParts.join("").localeCompare(right.urlParts.join(""));
  });

  let tabIndex = 0;
  for (let group of sorted) {
    if (group.totalCount > 1) {
      await chrome.tabGroups.move(first(group.getAllTabs())!.tab.groupId, {
        index: tabIndex,
      });
    } else {
      await chrome.tabs.move(first(group.getAllTabs())!.tabId, {
        index: tabIndex,
      });
    }
    tabIndex += group.totalCount;
  }
}

async function moveTabsSoDomainsGroupTogether(groups: TabTreeNode[]) {
  const groupsByDomain = groupBy(groups, (g) => g.urlParts[1]);

  const sorted = [...groupsByDomain.values()].map((domainGroup) =>
    [...domainGroup].sort((left, right) =>
      left.urlPartsString.localeCompare(right.urlPartsString)
    )
  );

  let moveIndex = 0;
  for (let group of selectMany(sorted)) {
    if (group.totalCount > 1) {
      await chrome.tabGroups.move(first(group.getAllTabs())!.tab.groupId, {
        index: moveIndex,
      });
    } else {
      await chrome.tabs.move(first(group.getAllTabs())!.tabId, {
        index: moveIndex,
      });
    }
    moveIndex += group.totalCount;
  }
}

function createTabsTreeModel(tabInfos: TabInfo[]): TabTreeNode {
  const tree = new TabTreeNode(undefined, "");

  for (const tabInfo of tabInfos) {
    tree.add(tabInfo);
  }
  return tree;
}

const MAX_TABS_BEFORE_SPLIT = 7;

function createGroups(tabInfos: TabInfo[]) {
  const rootTree = createTabsTreeModel(tabInfos);

  let groups = rootTree.children;
  let didSplit = false;

  do {
    didSplit = false;

    const newGroups: TabTreeNode[] = [];
    for (const group of groups) {
      newGroups.push(group);
      if (group.totalCount <= MAX_TABS_BEFORE_SPLIT) {
        // no need to split
        continue;
      }

      let groupsPossibleToSplit = group.descendants;
      if (groupsPossibleToSplit.length === 0) {
        continue;
      }

      let groupToSplitOf = groupsPossibleToSplit.reduce<
        TabTreeNode | undefined
      >((currentHighest, current) => {
        // we don't want to split of a single tab
        if (current.totalCount <= 1) {
          return currentHighest;
        }
        // we don't want to split of a group which is too large
        if (current.totalCount > MAX_TABS_BEFORE_SPLIT) {
          return currentHighest;
        }

        if (currentHighest === undefined) {
          return current;
        }

        if (
          currentHighest.parent &&
          currentHighest.parent.totalCount - currentHighest.totalCount === 1
        ) {
          return current;
        }

        if (current.parent?.totalCount === current.totalCount) {
          return currentHighest;
        }

        if (current.totalCount > currentHighest.totalCount) {
          return current;
        }
        if (currentHighest.totalCount > current.totalCount) {
          return currentHighest;
        }

        if (current.depth < currentHighest.depth) {
          return current;
        }
        if (currentHighest.depth < current.depth) {
          return currentHighest;
        }

        if (current.itemCount < currentHighest.itemCount) {
          return current;
        }
        if (currentHighest.itemCount < current.itemCount) {
          return currentHighest;
        }

        // all comparisons till now are equal, shortest path wins
        if (
          current.urlPartsString.localeCompare(currentHighest.urlPartsString) <
          0
        ) {
          return current;
        } else {
          return currentHighest;
        }
      }, undefined);

      if (
        groupToSplitOf &&
        groupToSplitOf.parent &&
        groupToSplitOf.totalCount > 1 &&
        groupToSplitOf.parent.totalCount - groupToSplitOf.totalCount > 1
      ) {
        console.log("splittingof", groupToSplitOf);
        newGroups.push(groupToSplitOf.parent.remove(groupToSplitOf.urlPart));
        didSplit = true;
      } else {
        console.log("not splitting", groupToSplitOf);
      }
    }

    groups = newGroups;
  } while (didSplit);

  return groups;
}
