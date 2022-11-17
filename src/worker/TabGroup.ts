import { TabInfo } from "./tabHelpers";
import { TabKey } from "./TabKey";

export class TabGroup {
  #key: TabKey;
  #tabs: TabInfo[];

  constructor(tabs: TabInfo[], key: string[] | undefined) {
    this.#tabs = tabs;

    if (key === undefined) {
      let current =
        tabs.length > 0 ? new TabKey(tabs[0].urlParts) : new TabKey([]);

      for (let tab of tabs) {
        current = current.getOverlappingKey(new TabKey(tab.urlParts));
      }

      this.#key = current;
    } else {
      this.#key = new TabKey(key);
    }
  }

  get count() {
    return this.#tabs.length;
  }
}
