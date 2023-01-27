import { TabGroup } from "./TabGroup";
import { TabKey } from "./TabKey";

export type TabItem = TabReference | TabGroup;

export class TabReference {
  readonly id: number;
  readonly key: TabKey;

  constructor(id: number, key: TabKey) {
    this.id = id;
    this.key = key;
  }
}
