import { TabKey } from "../model/TabKey";

export interface ITabKeyFactory {
  createTabKey(chromeTab: chrome.tabs.Tab): TabKey;
}

export class DefaultTabKeyFactory implements ITabKeyFactory {
  createTabKey(chromeTab: Partial<chrome.tabs.Tab>): TabKey {
    const url = DefaultTabKeyFactory.getUrl(chromeTab);

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

    return new TabKey([
      hostnameParts.join("."),
      ...hostnamePort,
      ...pathNameParts,
      ...fragmentParts,
    ]);
  }

  static getUrl(chromeTab: Partial<chrome.tabs.Tab>): URL {
    return (
      DefaultTabKeyFactory.tryParseUrl(chromeTab.pendingUrl) ??
      DefaultTabKeyFactory.tryParseUrl(chromeTab.url) ??
      new URL("urn:invalid")
    );
  }

  static tryParseUrl(url: string | undefined): URL | undefined {
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
}
