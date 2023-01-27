import { TabKey } from "./TabKey";
import { TabReference } from "./TabReference";
import { TabTreeNode } from "./TabTreeNode";

export interface TabWithKey {
  readonly key: TabKey;
}

export class TabGroup {
  readonly key: TabKey;
  readonly tabs: TabReference[];

  constructor(
    tabs: TabReference[],
    key: string[] | TabKey | undefined = undefined
  ) {
    if (tabs.length === 0) {
      throw new Error("Group should have tabs");
    }

    this.tabs = tabs;

    if (key === undefined) {
      this.key = TabKey.getOverlappingKey(tabs.map((x) => x.key));
    } else if (Array.isArray(key)) {
      this.key = new TabKey(key);
    } else {
      this.key = key;
    }
  }

  get count() {
    return this.tabs.length;
  }

  toTreeModel(): TabTreeNode<TabReference> {
    const tree = new TabTreeNode<TabReference>(this.key);

    for (const tab of this.tabs) {
      tree.add(tab);
    }
    return tree;
  }

  toSortedGroup(): TabGroup {
    const newTabs = [...this.tabs];
    newTabs.sort((a, b) => a.key.compare(b.key));

    return new TabGroup(newTabs, this.key);
  }

  static isTabGroup(obj: unknown): obj is TabGroup {
    return obj instanceof TabGroup;
  }
}
