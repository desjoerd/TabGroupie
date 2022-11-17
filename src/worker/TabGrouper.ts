import { TabInfo } from "./tabHelpers";
import {
  createTabsTreeModel,
  TabTreeNode,
  TabWithPartitionedUrl,
} from "./TabTreeNode";

export interface TabGrouperSettings {
  minTabsInGroup: number;
  maxTabsInGroup: number;
}

export interface Tab {
  id: number;
  index: number;
  urlParts: string[];
}

export class TabGrouper {
  settings: TabGrouperSettings;

  constructor(settings: TabGrouperSettings) {
    this.settings = settings;
  }

  // return groups and single tabs
  autoGroup(tabs: TabInfo[]) {
    // group tabs together based on the url parts
    const root = createTabsTreeModel(tabs);

    const topLevelNodes = root.children;

    // tabs which should not be grouped
    const tabsToNotGroup: TabInfo[] = [];
    const tabsToGroup: TabTreeNode<TabInfo>[] = [];

    for (const possibleGroup of topLevelNodes) {
      if (possibleGroup.totalCount >= this.settings.minTabsInGroup) {
        tabsToGroup.push(possibleGroup);
      } else {
        for (const tab of possibleGroup.getAllTabs()) {
          tabsToNotGroup.push(tab);
        }
      }
    }
  }

  autoSplit(root: TabTreeNode<TabWithPartitionedUrl>) {
    if (root.totalCount < this.settings.maxTabsInGroup) {
      return root;
    }
  }
}
