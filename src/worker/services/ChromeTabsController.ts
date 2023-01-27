import { e } from "vitest/dist/index-220c1d70";
import { filter, groupBy, maxBy } from "../collections";
import { TabGroup } from "../model/TabGroup";
import { TabItem, TabReference } from "../model/TabReference";
import { ITabKeyFactory } from "./TabKeyFactory";

export class ChromeTabsControllerFactory {
  readonly tabKeyFactory: ITabKeyFactory;

  constructor(tabKeyFactory: ITabKeyFactory) {
    this.tabKeyFactory = tabKeyFactory;
  }

  create(): Promise<ChromeTabsController[]>;
  create(windowId: number): Promise<ChromeTabsController>;
  async create(
    windowId?: number | undefined
  ): Promise<ChromeTabsController | ChromeTabsController[]> {
    if (windowId) {
      const chromeTabs = await chrome.tabs.query({ windowId });
      return new ChromeTabsController(windowId, chromeTabs, this.tabKeyFactory);
    } else {
      const chromeTabs = await chrome.tabs.query({});

      const tabsGroupedByWindow = [
        ...groupBy(chromeTabs, (tab) => tab.windowId),
      ];
      return tabsGroupedByWindow.map(
        ([windowId, tabs]) =>
          new ChromeTabsController(windowId, tabs, this.tabKeyFactory)
      );
    }
  }
}

export class ChromeTabsController {
  readonly windowId: number;
  readonly tabLookup: Map<number, chrome.tabs.Tab>;
  readonly tabKeyFactory: ITabKeyFactory;

  activeTabId: number | undefined;

  pinnedTabCount: number;

  constructor(
    windowId: number,
    tabs: chrome.tabs.Tab[],
    tabKeyFactory: ITabKeyFactory
  ) {
    tabs = tabs
      .filter((t) => t.id !== undefined && t.id !== chrome.tabs.TAB_ID_NONE)
      .sort((a, b) => a.index - b.index);

    if (tabs.some((x) => x.windowId !== windowId)) {
      throw new Error("All tabs should be of the same window");
    }
    // set pinned tab count and remove
    this.pinnedTabCount = tabs.reduce(
      (sum, tab) => (tab.pinned ? sum + 1 : sum),
      0
    );
    tabs = tabs.filter((t) => !t.pinned);

    this.windowId = windowId;
    this.tabLookup = new Map(tabs.map((tab) => [tab.id!, tab]));
    this.tabKeyFactory = tabKeyFactory;

    this.activeTabId = tabs.find((t) => t.active)?.id;
  }

  getTabReferences() {
    return [...this.tabLookup.entries()].map(
      ([id, tab]) => new TabReference(id, this.tabKeyFactory.createTabKey(tab))
    );
  }

  getTab(tabId: number): chrome.tabs.Tab {
    const tab = this.tabLookup.get(tabId);

    if (tab) {
      return tab;
    } else {
      throw new Error("Tab does not exist");
    }
  }

  async updateChrome(desiredTabItems: TabItem[]) {
    await this.updateChromeTabGroups(desiredTabItems);

    let currentIndex = this.pinnedTabCount;
    for (const tabItem of desiredTabItems) {
      if (TabGroup.isTabGroup(tabItem)) {
        const tabs = tabItem.tabs.map((t) => this.getTab(t.id));
        const groupId = tabs[0].groupId;
        await chrome.tabGroups.move(groupId, { index: currentIndex });

        // make sure order is from lowest to highest
        if (!tabs.every((tab, i, all) => i > 0 || tab.index > all[i].index)) {
          for (const tab of tabs) {
            await chrome.tabs.move(tab.id!, { index: currentIndex });
            currentIndex++;
          }
        } else {
          currentIndex += tabs.length;
        }
      } else {
        await chrome.tabs.move(tabItem.id, { index: currentIndex });
        currentIndex++;
      }
    }
  }

  async updateChromeTabGroups(desiredTabItems: TabItem[]) {
    // ungroup single tabs
    const tabsToUngroup: chrome.tabs.Tab[] = [];
    for (const desiredTabItem of desiredTabItems) {
      if (!TabGroup.isTabGroup(desiredTabItem)) {
        const tab = this.getTab(desiredTabItem.id);
        tabsToUngroup.push(tab);
      }
    }
    this.chromeTabsUngroup(tabsToUngroup);

    // group
    const assignedGroupIds: Set<number> = new Set();
    for (const desiredTabItem of desiredTabItems) {
      if (TabGroup.isTabGroup(desiredTabItem)) {
        const tabsOfGroup = desiredTabItem.tabs.map((t) => this.getTab(t.id));
        const tabsWithPossibleGroupId = filter(
          tabsOfGroup,
          (tab) =>
            tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE &&
            !assignedGroupIds.has(tab.groupId)
        );

        const tabsByGroupId = groupBy(
          tabsWithPossibleGroupId,
          (tab) => tab.groupId
        );
        const bestGroupId = maxBy(
          tabsByGroupId.entries(),
          ([, leftTabs], [, rightTabs]) => leftTabs.length - rightTabs.length
        );

        if (bestGroupId !== undefined) {
          const assignedGroupId = await this.chromeTabsGroup(
            desiredTabItem,
            tabsOfGroup,
            bestGroupId[0]
          );
          assignedGroupIds.add(assignedGroupId);
        } else {
          const assignedGroupId = await this.chromeTabsGroup(
            desiredTabItem,
            tabsOfGroup
          );
          assignedGroupIds.add(assignedGroupId);
        }
      }
    }
  }

  async chromeTabsUngroup(tabs: readonly chrome.tabs.Tab[]) {
    const tabIdsToUngroup = tabs
      .filter((t) => t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE)
      .map((t) => t.id);

    if (tabIdsToUngroup.length > 0) {
      await chrome.tabs.ungroup(tabs.map((t) => t.id!));
      for (const tab of tabs) {
        tab.groupId = chrome.tabGroups.TAB_GROUP_ID_NONE;
      }
    }
  }

  async chromeTabsGroup(
    group: TabGroup,
    tabs: chrome.tabs.Tab[],
    wantedGroupId?: number | undefined
  ) {
    let groupId: number;
    if (
      wantedGroupId === undefined ||
      wantedGroupId === chrome.tabs.TAB_ID_NONE
    ) {
      groupId = await chrome.tabs.group({
        tabIds: tabs.map((t) => t.id!),
        createProperties: {
          windowId: this.windowId,
        },
      });
    } else if (tabs.some((t) => t.groupId !== wantedGroupId)) {
      groupId = await chrome.tabs.group({
        tabIds: tabs.map((t) => t.id!),
        groupId: wantedGroupId,
      });
    } else {
      groupId = wantedGroupId!;
    }

    for (const tab of tabs) {
      tab.groupId = groupId;
    }

    const tabGroup = await chrome.tabGroups.get(groupId);
    const title = this.getTitle(group);
    const color = this.getColor(group);
    if (tabGroup.title !== title || tabGroup.color !== color) {
      await chrome.tabGroups.update(groupId, {
        title,
        color: this.getColor(group),
      });
    }

    return groupId;
  }

  getColor(group: TabGroup): chrome.tabGroups.ColorEnum | undefined {
    const firstUrlPart = group.key.firstPart;
    if (firstUrlPart === undefined) {
      return undefined;
    }
    const domainParts = firstUrlPart.split(".");
    if (domainParts.length === 0) {
      return undefined;
    }

    const colors: chrome.tabGroups.ColorEnum[] = [
      "blue",
      "cyan",
      "green",
      "grey",
      "orange",
      "pink",
      "purple",
      "red",
      "yellow",
    ];

    const value =
      domainParts[domainParts.length - 1].charCodeAt(0) +
      domainParts[domainParts.length - 1].length +
      domainParts[0].charCodeAt(0) +
      domainParts[0].length;

    return colors[value % colors.length];
  }

  getTitle(group: TabGroup) {
    return group.key.prettyString;
  }
}
