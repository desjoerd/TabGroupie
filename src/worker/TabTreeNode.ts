import type { TabInfo } from "./tabHelpers";
import { TabKey } from "./TabKey";

export interface TabWithPartitionedUrl {
  urlParts: string[];
}

export function createTabsTreeModel<TTab extends TabWithPartitionedUrl>(
  tabs: TTab[]
): TabTreeNode<TTab> {
  const tree = new TabTreeNode<TTab>();

  for (const tab of tabs) {
    tree.add(tab);
  }
  return tree;
}

export class TabTreeNode<TTab extends TabWithPartitionedUrl> {
  parent: TabTreeNode<TTab> | undefined;
  #items: TTab[];
  #totalCount: number;
  #children: Map<string, TabTreeNode<TTab>>;
  readonly key: TabKey;

  constructor();
  constructor(parent: TabTreeNode<TTab>, urlPart: string);
  constructor(
    parent: TabTreeNode<TTab> | undefined = undefined,
    urlPart: string | undefined = "root"
  ) {
    if (parent) {
      this.key = new TabKey(parent.key, urlPart);
    } else {
      this.key = new TabKey([]);
    }

    this.#items = [];
    this.#children = new Map();
    this.#totalCount = 0;
    this.parent = parent;
  }

  get itemCount() {
    return this.#items.length;
  }
  get totalCount() {
    return this.#totalCount;
  }
  get depth() {
    return this.key.length;
  }

  add(tab: TTab) {
    this.#totalCount++;
    if (tab.urlParts.length > this.depth) {
      const urlPart = tab.urlParts[this.depth];

      let node = this.#children.get(urlPart);
      if (node === undefined) {
        node = new TabTreeNode(this, urlPart);
        this.#children.set(urlPart, node);
      }
      node.add(tab);
    } else {
      this.#items.push(tab);
    }
  }

  remove(key: TabKey): TabTreeNode<TTab> {
    const childToRemove = key.partAfter(this.key);

    const removed = this.#children.get(childToRemove);
    if (removed === undefined) {
      throw new Error(`urlPart ${childToRemove} does not exist`);
    }

    this.#children.delete(childToRemove);

    let node: TabTreeNode<TTab> | undefined = this;
    while (node !== undefined) {
      node.#totalCount -= removed.#totalCount;

      node = node.parent;
    }

    removed.parent = undefined;

    return removed;
  }

  get children(): TabTreeNode<TTab>[] {
    return [...this.#children.values()];
  }

  get descendants(): TabTreeNode<TTab>[] {
    return [...this.getDescendants()];
  }

  get selfAndDescendants(): TabTreeNode<TTab>[] {
    return [this, ...this.getDescendants()];
  }

  *getDescendants(): Generator<TabTreeNode<TTab>> {
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

  *getAllTabs(): Generator<TTab> {
    for (const tab of this.#items) {
      yield tab;
    }

    for (const child of this.children) {
      for (const tab of child.getAllTabs()) {
        yield tab;
      }
    }
  }
}
