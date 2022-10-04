import { TabTreeNode } from "./TabTreeNode";

export async function chromeGetAllTabinfos() {
  const chromeTabs = await chrome.tabs.query({});
  return [...createTabInfos(chromeTabs)].sort(
    (left, right) => left.tab.index - right.tab.index
  );
}

export async function chromeTabsUngroup(tabs: TabInfo[]) {
  const tabIdsToUngroup = tabs
    .filter((t) => t.tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE)
    .map((t) => t.tabId);

  if (tabIdsToUngroup.length > 0) {
    await chrome.tabs.ungroup(tabs.map((t) => t.tab.id!));
    for (const tab of tabs) {
      tab.tab.groupId = chrome.tabGroups.TAB_GROUP_ID_NONE;
    }
  }
}

function getColor(group: TabTreeNode): chrome.tabGroups.ColorEnum | undefined {
  if (group.urlParts.length < 2) {
    return undefined;
  }
  const domainParts = group.urlParts[1].split(".");
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

function getTitle(group: TabTreeNode) {
  switch (group.urlParts.length) {
    case 0:
    case 1:
      return "/";
    case 2:
      return group.urlParts[1];
    case 3:
    case 4:
      return group.urlParts.join("");
    default:
      const domain = group.urlParts[1];
      const beforeLast = group.urlParts[group.urlParts.length - 2];
      const last = group.urlParts[group.urlParts.length - 1];

      return [domain, "/..", beforeLast, last].join("");
  }
}

export async function chromeTabsGroup(
  windowId: number,
  group: TabTreeNode,
  wantedGroupId?: number | undefined
) {
  let tabs = group.allTabs;
  let groupId: number;
  if (
    wantedGroupId === undefined ||
    wantedGroupId === chrome.tabs.TAB_ID_NONE
  ) {
    groupId = await chrome.tabs.group({
      tabIds: tabs.map((t) => t.tabId),
      groupId:
        wantedGroupId === undefined || wantedGroupId === chrome.tabs.TAB_ID_NONE
          ? undefined
          : wantedGroupId,
      createProperties: {
        windowId,
      },
    });
  } else if (tabs.some((t) => t.tab.groupId !== wantedGroupId)) {
    groupId = await chrome.tabs.group({
      tabIds: tabs.map((t) => t.tabId),
      groupId: wantedGroupId,
    });
  } else {
    groupId = wantedGroupId!;
  }

  for (const tab of tabs) {
    tab.tab.groupId = groupId;
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
  tabId: number;
  windowId: number;
  tab: chrome.tabs.Tab;
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
      tabId: tab.id,
      windowId: tab.windowId,
      tab,
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
    .split("/")
    .filter((pathPart) => pathPart !== "")
    .filter(
      (pathPart) => !/^\w\w-\w\w$/.test(pathPart) && !/^\w\w$/.test(pathPart)
    ) // remove culture info (e.g. en-US)
    .map((pathPart, i) => `${i === 0 ? "/" : "/"}${pathPart}`.toLowerCase());

  const fragmentParts = url.hash
    .split("/")
    .filter((pathPart) => pathPart !== "")
    .map((pathPart, i) => `${i === 0 ? "/" : "/"}${pathPart}`.toLowerCase());

  return [
    "",
    hostnameParts.join("."),
    ...hostnamePort,
    ...pathNameParts,
    ...fragmentParts,
  ];
}
