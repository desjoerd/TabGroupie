import { TabTreeNode } from "./TabTreeNode";

function compareByIndexAsc(left: TabInfo, right: TabInfo) {
  return left.index - right.index;
}

export async function chromeGetAllTabinfos() {
  const chromeTabs = await chrome.tabs.query({});
  return [...createTabInfos(chromeTabs)].sort(compareByIndexAsc);
}

export async function chromeTabsUngroup(tabs: TabInfo[]) {
  const tabIdsToUngroup = tabs
    .filter((t) => t.groupId !== undefined)
    .map((t) => t.id);

  if (tabIdsToUngroup.length > 0) {
    await chrome.tabs.ungroup(tabs.map((t) => t.id));
    for (const tab of tabs) {
      tab.groupId = undefined;
    }
  }
}

function getColor(
  group: TabTreeNode<TabInfo>
): chrome.tabGroups.ColorEnum | undefined {
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

function getTitle(group: TabTreeNode<TabInfo>) {
  return group.key.prettyString;
}

export async function chromeTabsGroup(
  windowId: number,
  group: TabTreeNode<TabInfo>,
  wantedGroupId?: number | undefined
) {
  let tabs = group.allTabs;
  let groupId: number;
  if (
    wantedGroupId === undefined ||
    wantedGroupId === chrome.tabs.TAB_ID_NONE
  ) {
    groupId = await chrome.tabs.group({
      tabIds: tabs.map((t) => t.id),
      groupId:
        wantedGroupId === undefined || wantedGroupId === chrome.tabs.TAB_ID_NONE
          ? undefined
          : wantedGroupId,
      createProperties: {
        windowId,
      },
    });
  } else if (tabs.some((t) => t.groupId !== wantedGroupId)) {
    groupId = await chrome.tabs.group({
      tabIds: tabs.map((t) => t.id),
      groupId: wantedGroupId,
    });
  } else {
    groupId = wantedGroupId!;
  }

  for (const tab of tabs) {
    tab.groupId = groupId;
  }

  const tabGroup = await chrome.tabGroups.get(groupId);
  const title = getTitle(group);
  if (tabGroup.title !== title) {
    await chrome.tabGroups.update(groupId, {
      title,
      color: getColor(group),
    });
  }

  return groupId;
}

export interface TabInfo {
  id: number;
  windowId: number;
  groupId: number | undefined;
  index: number;
  active: boolean;
  url: URL;
  urlParts: string[];
}

function* createTabInfos(tabs: chrome.tabs.Tab[]): Generator<TabInfo> {
  let prevValidUrl: URL | undefined = undefined;
  for (const tab of tabs) {
    if (tab.id === undefined) {
      continue;
    }

    let url = tryParseUrl(tab.url);
    if (url === undefined) {
      if (prevValidUrl) {
        url = prevValidUrl;
      } else {
        url = new URL("urn:invalid");
      }
    } else {
      prevValidUrl = url;
    }

    yield {
      id: tab.id,
      groupId: tab.groupId,
      windowId: tab.windowId,
      index: tab.index,
      active: tab.active,
      url,
      urlParts: splitUrlInParts(url),
    };
  }
}

function tryParseUrl(url: string | undefined): URL | undefined {
  try {
    if (url) {
      return new URL(url);
    }
  } catch {
    // something failed during parsing
    console.error(`could not parse: ${url}`);
  }
  return undefined;
}

function splitUrlInParts(url: URL) {
  const hostnameParts = url.hostname.toLowerCase().split(".");

  // remove www in front
  if (hostnameParts.length > 0 && hostnameParts[0] === "www") {
    hostnameParts.shift();
  }

  // remove tld
  if (hostnameParts.length > 1) {
    hostnameParts.pop();
  }

  const hostnamePort: string[] = [];
  if (url.port && url.port !== "80" && url.port !== "443") {
    hostnamePort.push(`:${url.port}`);
  }

  const pathNameParts = url.pathname
    .toLowerCase()
    .split("/")
    .filter((pathPart) => pathPart !== "")
    .filter(
      (pathPart) => !/^\w\w-\w\w$/.test(pathPart) && !/^\w\w$/.test(pathPart)
    ) // remove culture info (e.g. en-US)
    .map((pathPart) => `/${pathPart}`);

  const fragmentParts = url.hash
    .toLowerCase()
    .split("/")
    .filter((pathPart) => pathPart !== "")
    .map((pathPart) => `/${pathPart}`);

  return [
    hostnameParts.join("."),
    ...hostnamePort,
    ...pathNameParts,
    ...fragmentParts,
  ];
}
