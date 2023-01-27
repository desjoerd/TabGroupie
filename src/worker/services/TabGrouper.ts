import { TabItem, TabReference } from "../model/TabReference";
import { TabGroup } from "../model/TabGroup";
import { TabKey } from "../model/TabKey";
import { TabTreeNode } from "../model/TabTreeNode";
import { filter, maxBy } from "../collections";
import { SettingValues } from "../../shared/SettingsStore";

export class TabGrouper {
  settings: SettingValues;

  constructor(settings: SettingValues) {
    this.settings = settings;
  }

  run(tabs: Iterable<TabReference>): Iterable<TabItem> {
    // first sort
    tabs = this.sortTabs(tabs);

    // group tabs
    let tabItems: Iterable<TabItem> = this.groupTabs(tabs);

    // split groups when groups exceed maximum
    tabItems = this.splitGroups(tabItems);

    // push groups to top or bottom
    tabItems = this.pushGroups(tabItems);

    return tabItems;
  }

  sortTabs(tabs: Iterable<TabReference>): Iterable<TabReference> {
    if (this.settings.sort === "all") {
      return [...tabs].sort((a, b) => a.key.compare(b.key));
    }
    return tabs;
  }

  *groupTabs(tabs: Iterable<TabReference>): Generator<TabItem> {
    const possibleGroups: Map<string, TabReference[]> = new Map();
    for (const tab of tabs) {
      if (possibleGroups.has(tab.key.firstPart)) {
        possibleGroups.get(tab.key.firstPart)!.push(tab);
      } else {
        possibleGroups.set(tab.key.firstPart, [tab]);
      }
    }

    for (const [keyFirstPart, possibleGroup] of possibleGroups) {
      if (possibleGroup.length >= this.settings.minTabsInGroup) {
        yield new TabGroup(possibleGroup, new TabKey([keyFirstPart]));
      } else {
        for (const tab of possibleGroup) {
          yield tab;
        }
      }
    }
  }

  *splitGroups(tabItems: Iterable<TabItem>): Generator<TabItem> {
    for (const tabItem of tabItems) {
      if (TabGroup.isTabGroup(tabItem) && this.shouldSplitGroup(tabItem)) {
        for (const subGroup of this.splitGroup(tabItem)) {
          yield subGroup;
        }
      } else {
        yield tabItem;
      }
    }
  }

  shouldSplitGroup(group: TabGroup): boolean {
    return group.count > this.settings.maxTabsInGroup;
  }

  splitGroup(group: TabGroup): TabGroup[] {
    if (!this.shouldSplitGroup(group)) {
      return [group];
    }

    const tree = group.toTreeModel();

    let groups = [tree];
    let didSplit = false;

    do {
      didSplit = false;

      const newGroups: TabTreeNode<TabReference>[] = [];
      for (const group of groups) {
        newGroups.push(group);
        if (group.totalCount <= this.settings.maxTabsInGroup) {
          // no need to split
          continue;
        }

        let groupsPossibleToSplit = filter(
          group.getDescendants(),
          (x) =>
            x.totalCount >= this.settings.minTabsInGroup && // has enough tabs for a group
            x.parent!.totalCount - x.totalCount >= this.settings.minTabsInGroup // removing it should result in two possible groups
        );

        let groupToSplitOf = maxBy(groupsPossibleToSplit, (left, right) => {
          if (left.totalCount !== right.totalCount) {
            // highest total tabs
            return left.totalCount - right.totalCount;
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

    return groups
      .map(
        (treeNode) =>
          new TabGroup(
            group.tabs.filter((a) =>
              treeNode.allTabs.some((b) => b.id == a.id)
            ),
            treeNode.key
          )
      )
      .sort((left, right) => left.key.compare(right.key));
  }

  pushGroups(tabItems: Iterable<TabItem>): Iterable<TabItem> {
    if (this.settings.groupsLocation === "none") {
      return tabItems;
    }

    const tabs: TabReference[] = [];
    const groups: TabGroup[] = [];

    for (const item of tabItems) {
      if (TabGroup.isTabGroup(item)) {
        groups.push(item);
      } else {
        tabs.push(item);
      }
    }

    if (this.settings.sort === "groups") {
      groups.sort((a, b) => a.key.compare(b.key));
    }

    if (this.settings.groupsLocation === "top") {
      return [...groups, ...tabs];
    } else {
      return [...tabs, ...groups];
    }
  }
}
