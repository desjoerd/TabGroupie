import {
  chromeGetAllTabinfos as chromeGetAllTabinfos,
  chromeTabsGroup,
  chromeTabsUngroup,
} from "./tabHelpers.js";
import type { TabInfo } from "./tabHelpers";
import { createTabsTreeModel, TabTreeNode } from "./TabTreeNode.js";
import {
  first,
  groupBy,
  maxBy,
  selectMany,
  some,
  filter,
} from "./collections.js";
import { debounce } from "./utils.js";
import { Settings } from "../shared/Settings.js";
import { TabGrouperSettings } from "./TabGrouper.js";
import { TabKey } from "./TabKey.js";

const debouncedGroupTabs = debounce(groupTabsRetry, 1200);

const settingsManager = new Settings();

let MIN_TABS_BEFORE_GROUP = 1;
let MAX_TABS_BEFORE_SPLIT = 7;

chrome.storage.onChanged.addListener((changes) => {
  settingsManager.handleChanges(changes);
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

function getBestGroupId(tabsByGroupId: Map<number | undefined, TabInfo[]>) {
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
  const settings = {
    minTabsInGroup: 2,
    maxTabsInGroup: 7,
  };

  const treeGroups = createGroups2(tabInfos, settings);
  console.log("splitted groups", treeGroups);

  // assign best group ids for each group
  const wantedGroupIdsOfGroups = groupBy(treeGroups, (group) => {
    const tabsByGroupId = groupBy(group.getAllTabs(), (t) => t.groupId);

    return getBestGroupId(tabsByGroupId);
  });

  // check for collisions and assign final groupIds
  const assignedGroups = new Map<number | undefined, TabTreeNode<TabInfo>>();
  const newGroups: TabTreeNode<TabInfo>[] = [];
  for (const [wantedGroupId, groups] of wantedGroupIdsOfGroups.entries()) {
    if (wantedGroupId === -1 || assignedGroups.has(wantedGroupId)) {
      // new group, or already assigned group
      newGroups.push(...groups);
    } else if (groups.length > 1) {
      // get the best group to keep, the active one, or the biggest
      const bestGroupToKeep = maxBy(groups, (left, right) => {
        if (some(left.getAllTabs(), (t) => t.active)) {
          return 1;
        }
        if (some(right.getAllTabs(), (t) => t.active)) {
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
    if (newGroup.totalCount >= settings.minTabsInGroup) {
      await chromeTabsGroup(windowId, newGroup);
    } else {
      await chromeTabsUngroup(newGroup.allTabs);
    }
  }

  for (const [assignedGroupId, group] of assignedGroups.entries()) {
    if (group.totalCount >= settings.minTabsInGroup) {
      await chromeTabsGroup(windowId, group, assignedGroupId);
    } else {
      await chromeTabsUngroup(group.allTabs);
    }
  }

  // move tabs and groups to the correct positions
  //
  await moveTabsSoDomainsGroupTogether(treeGroups, settings);

  console.log("tabs grouped");
}

async function moveTabsSoDomainsGroupTogether(
  groups: TabTreeNode<TabInfo>[],
  settings: TabGrouperSettings
) {
  const groupsByFirst = groupBy(groups, (g) => g.key.firstPart);

  const sorted = [...groupsByFirst.values()].map((domainGroup) =>
    [...domainGroup].sort((left, right) => left.key.compare(right.key))
  );

  let moveIndex = 0;
  for (let group of selectMany(sorted)) {
    if (group.totalCount >= settings.minTabsInGroup) {
      await chrome.tabGroups.move(first(group.getAllTabs())!.groupId!, {
        index: moveIndex,
      });
    } else {
      await chrome.tabs.move(first(group.getAllTabs())!.id, {
        index: moveIndex,
      });
    }
    moveIndex += group.totalCount;
  }
}

// function createGroups(tabInfos: TabInfo[]) {
//   const rootTree = createTabsTreeModel(tabInfos);

//   let groups = rootTree.children;
//   let didSplit = false;

//   do {
//     didSplit = false;

//     const newGroups: TabTreeNode<TabInfo>[] = [];
//     for (const group of groups) {
//       newGroups.push(group);
//       if (group.totalCount <= MAX_TABS_BEFORE_SPLIT) {
//         // no need to split
//         continue;
//       }

//       let groupsPossibleToSplit = group.descendants;
//       if (groupsPossibleToSplit.length === 0) {
//         continue;
//       }

//       let groupToSplitOf = groupsPossibleToSplit.reduce<
//         TabTreeNode<TabInfo> | undefined
//       >((currentBest, current) => {
//         // we don't want to split of a single tab
//         if (current.totalCount <= 1) {
//           return currentBest;
//         }
//         // we don't want to split of a group which is too large
//         if (current.totalCount > MAX_TABS_BEFORE_SPLIT) {
//           return currentBest;
//         }

//         if (currentBest === undefined) {
//           return current;
//         }

//         if (
//           currentBest.parent &&
//           currentBest.parent.totalCount - currentBest.totalCount === 1
//         ) {
//           return current;
//         }

//         if (current.parent?.totalCount === current.totalCount) {
//           return currentBest;
//         }

//         if (current.totalCount > currentBest.totalCount) {
//           return current;
//         }
//         if (currentBest.totalCount > current.totalCount) {
//           return currentBest;
//         }

//         if (current.depth < currentBest.depth) {
//           return current;
//         }
//         if (currentBest.depth < current.depth) {
//           return currentBest;
//         }

//         if (current.itemCount < currentBest.itemCount) {
//           return current;
//         }
//         if (currentBest.itemCount < current.itemCount) {
//           return currentBest;
//         }

//         // all comparisons till now are equal, shortest path wins
//         if (
//           current.urlPartsString.localeCompare(currentBest.urlPartsString) < 0
//         ) {
//           return current;
//         } else {
//           return currentBest;
//         }
//       }, undefined);

//       if (
//         groupToSplitOf &&
//         groupToSplitOf.parent &&
//         groupToSplitOf.totalCount > 1 &&
//         groupToSplitOf.parent.totalCount - groupToSplitOf.totalCount > 1
//       ) {
//         console.log("splittingof", groupToSplitOf);
//         newGroups.push(groupToSplitOf.parent.remove(groupToSplitOf.urlPart));
//         didSplit = true;
//       } else {
//         console.log("not splitting", groupToSplitOf);
//       }
//     }

//     groups = newGroups;
//   } while (didSplit);

//   return groups;
// }

function createGroups2(tabInfos: TabInfo[], settings: TabGrouperSettings) {
  const rootTree = createTabsTreeModel(tabInfos);

  let groups = rootTree.children;
  let didSplit = false;

  do {
    didSplit = false;

    const newGroups: TabTreeNode<TabInfo>[] = [];
    for (const group of groups) {
      newGroups.push(group);
      if (group.totalCount <= settings.maxTabsInGroup) {
        // no need to split
        continue;
      }

      let groupsPossibleToSplit = filter(
        group.getDescendants(),
        (x) =>
          x.totalCount >= settings.minTabsInGroup && // has enough tabs for a group
          x.parent!.totalCount - x.totalCount >= settings.minTabsInGroup // removing it should result in two possible groups
      );

      let groupToSplitOf = maxBy(groupsPossibleToSplit, (left, right) => {
        if (left.totalCount !== right.totalCount) {
          if (left.totalCount <= settings.maxTabsInGroup) {
            // highest total tabs
            return left.totalCount - right.totalCount;
          }
        }
        if (left.depth !== right.depth) {
          // lowest depth
          return 0 - (left.depth - right.depth);
        }
        if (left.itemCount !== right.itemCount) {
          // take the one with the least direct children
          return 0 - (left.itemCount - right.itemCount);
        }

        // alphabetical (a wins over z)
        return (
          // we're searching for the max, a is lowest so 0 - result reverse the order
          0 - left.key.compare(right.key)
        );
      });

      if (groupToSplitOf) {
        console.log("splittingof", groupToSplitOf);
        newGroups.push(groupToSplitOf.parent!.remove(groupToSplitOf.key));
        didSplit = true;
      }
    }

    groups = newGroups;
  } while (didSplit);

  return groups;
}
