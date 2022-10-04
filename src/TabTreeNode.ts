import type { TabInfo } from "./tabHelpers";

export class TabTreeNode {
  parent: TabTreeNode | undefined;
  _items: TabInfo[];
  _totalCount: number;
  _children: Map<string, TabTreeNode>;
  readonly urlParts: string[];
  readonly urlPartsString: string;
  readonly urlPart: string;

  constructor(parent: TabTreeNode | undefined, urlPart: string) {
    if (parent) {
      this.urlParts = [...parent.urlParts, urlPart];
    } else {
      this.urlParts = [urlPart];
    }
    this.urlPartsString = this.urlParts.join("");

    this._items = [];
    this._children = new Map();
    this._totalCount = 0;
    this.urlPart = urlPart;
    this.parent = parent;
  }

  get itemCount() {
    return this._items.length;
  }
  get totalCount() {
    return this._totalCount;
  }
  get depth() {
    return this.urlParts.length;
  }

  add(tab: TabInfo) {
    this._totalCount++;
    if (tab.urlParts.length > this.depth) {
      const urlPart = tab.urlParts[this.depth];

      let node = this._children.get(urlPart);
      if (node === undefined) {
        node = new TabTreeNode(this, urlPart);
        this._children.set(urlPart, node);
      }
      node.add(tab);
    } else {
      this._items.push(tab);
    }
  }

  hasTab(...tabId: number[]): boolean {
    for (const tab of this.getAllTabs()) {
      if (tabId.some((id) => tab.tabId === id)) {
        return true;
      }
    }
    return false;
  }

  remove(urlPart: string): TabTreeNode {
    const removed = this._children.get(urlPart);
    if (removed === undefined) {
      throw new Error(`urlPart ${urlPart} does not exist`);
    }

    this._children.delete(urlPart);

    let node: TabTreeNode | undefined = this;
    while (node !== undefined) {
      node._totalCount -= removed._totalCount;

      node = node.parent;
    }

    removed.parent = undefined;

    return removed;
  }

  get children() {
    return [...this._children.values()];
  }

  get descendants() {
    return [...this.getDescendants()];
  }

  get selfAndDescendants() {
    return [this, ...this.getDescendants()];
  }

  *getDescendants(): Generator<TabTreeNode> {
    for (const child of this.children) {
      yield child;

      for (const childDescendant of child.getDescendants()) {
        yield childDescendant;
      }
    }
  }

  get allTabs() {
    return [...this.getAllTabs()];
  }

  *getAllTabs(): Generator<TabInfo, any, any> {
    for (const tab of this._items) {
      yield tab;
    }

    for (const child of this.children) {
      for (const tab of child.getAllTabs()) {
        yield tab;
      }
    }
  }
}
