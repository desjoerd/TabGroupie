import { describe, expect, test } from "vitest";
import { TabGroup } from "../model/TabGroup";
import { TabKey } from "../model/TabKey";
import { TabReference } from "../model/TabReference";
import { TabGrouper } from "./TabGrouper";
import { DefaultTabKeyFactory } from "./TabKeyFactory";

function createTabReferences(keys: TabKey[]) {
  return keys.map((tabKey, index) => new TabReference(index, tabKey));
}

function createTabGroup(keys: TabKey[]): TabGroup {
  return new TabGroup(
    keys.map((tabKey, index) => new TabReference(index, tabKey)),
    [keys[0].firstPart]
  );
}

describe("groupTabs (min: 2, max: 100)", () => {
  const sut = new TabGrouper({
    isEnabled: true,
    minTabsInGroup: 2,
    maxTabsInGroup: 100,
    groupsLocation: "none",
    sort: "none",
  });

  test("should group tabs by first key part", () => {
    const tabs = createTabReferences([
      new TabKey(["a", "a"]),
      new TabKey(["a", "b"]),
      new TabKey(["b", "a"]),
      new TabKey(["b", "b"]),
    ]);

    const result = [...sut.groupTabs(tabs)];

    expect(result).toHaveLength(2);

    expect(result[0]).toBeInstanceOf(TabGroup);
    expect(result[0].key).toStrictEqual(new TabKey(["a"]));

    expect(result[1]).toBeInstanceOf(TabGroup);
    expect(result[1].key).toStrictEqual(new TabKey(["b"]));
  });

  test("should not group single tabs", () => {
    const tabs = createTabReferences([
      new TabKey(["single1", "a"]),
      new TabKey(["a", "a"]),
      new TabKey(["a", "b"]),
      new TabKey(["single2", "a"]),
      new TabKey(["b", "a"]),
      new TabKey(["b", "b"]),
      new TabKey(["single3"]),
    ]);

    const result = [...sut.groupTabs(tabs)];

    expect(result).toHaveLength(5);

    expect(result[0]).toBeInstanceOf(TabReference);
    expect(result[0].key).toStrictEqual(new TabKey(["single1", "a"]));

    expect(result[1]).toBeInstanceOf(TabGroup);
    expect(result[1].key).toStrictEqual(new TabKey(["a"]));

    expect(result[2]).toBeInstanceOf(TabReference);
    expect(result[2].key).toStrictEqual(new TabKey(["single2", "a"]));

    expect(result[3]).toBeInstanceOf(TabGroup);
    expect(result[3].key).toStrictEqual(new TabKey(["b"]));

    expect(result[4]).toBeInstanceOf(TabReference);
    expect(result[4].key).toStrictEqual(new TabKey(["single3"]));
  });
});

describe("groupTabs (min: 3, max: 100)", () => {
  const sut = new TabGrouper({
    isEnabled: true,
    minTabsInGroup: 3,
    maxTabsInGroup: 100,
    groupsLocation: "none",
    sort: "none",
  });

  test("should group tabs when getting to the minimum", () => {
    const tabs = createTabReferences([
      new TabKey(["not", "a"]),
      new TabKey(["not", "b"]),
      new TabKey(["yes", "a"]),
      new TabKey(["yes", "b"]),
      new TabKey(["yes", "c"]),
    ]);

    const result = [...sut.groupTabs(tabs)];

    expect(result).toHaveLength(3);

    expect(result[0]).toBeInstanceOf(TabReference);
    expect(result[0].key).toStrictEqual(new TabKey(["not", "a"]));

    expect(result[1]).toBeInstanceOf(TabReference);
    expect(result[1].key).toStrictEqual(new TabKey(["not", "b"]));

    expect(result[2]).toBeInstanceOf(TabGroup);
    expect(result[2].key).toStrictEqual(new TabKey(["yes"]));
  });
});

describe("splitGroup (min 2, max 3)", () => {
  const sut = new TabGrouper({
    isEnabled: true,
    minTabsInGroup: 2,
    maxTabsInGroup: 3,
    groupsLocation: "none",
    sort: "none",
  });

  test("With 5 tabs, Should split of the largest group", () => {
    const tabGroup = createTabGroup([
      new TabKey(["test", "a"]),
      new TabKey(["test", "a", "sub"]),
      new TabKey(["test", "a", "sub"]),
      new TabKey(["test", "b"]),
      new TabKey(["test", "b", "sub"]),
    ]);

    const result = sut.splitGroup(tabGroup);

    expect(result).toHaveLength(2);

    expect(result[0].key).toStrictEqual(new TabKey(["test"]));
    expect(result[0].count).toEqual(2);

    expect(result[1].key).toStrictEqual(new TabKey(["test", "a"]));
    expect(result[1].count).toEqual(3);
  });

  test("Should not split group when 4 tabs have the same key, and 1 tab has a different key", () => {
    const tabGroup = createTabGroup([
      new TabKey(["test", "a"]),
      new TabKey(["test", "a"]),
      new TabKey(["test", "a"]),
      new TabKey(["test", "a"]),
      new TabKey(["test", "b", "sub"]),
    ]);

    const result = sut.splitGroup(tabGroup);

    expect(result).toHaveLength(1);

    expect(result[0].key).toStrictEqual(new TabKey(["test"]));
    expect(result[0].count).toEqual(5);
  });

  test("Should split nested groups", () => {
    const tabGroup = createTabGroup([
      new TabKey(["test", "a", "sub", "deep", "a"]),
      new TabKey(["test", "a", "sub", "deep", "b"]),
      new TabKey(["test", "a", "sub", "deep", "c"]),
      new TabKey(["test", "a", "sub2", "deep", "a"]),
      new TabKey(["test", "a", "sub2", "deep", "b"]),
    ]);

    const result = sut.splitGroup(tabGroup);

    expect(result).toHaveLength(2);

    expect(result[0].key).toStrictEqual(new TabKey(["test"]));
    expect(result[0].count).toEqual(2);

    expect(result[1].key).toStrictEqual(new TabKey(["test", "a", "sub"]));
    expect(result[1].count).toEqual(3);
  });

  test("Should split in multiple groups", () => {
    const tabGroup = createTabGroup([
      new TabKey(["test", "a", "a"]),
      new TabKey(["test", "a", "b"]),
      new TabKey(["test", "a", "c"]),
      new TabKey(["test", "b", "a"]),
      new TabKey(["test", "b", "b"]),
      new TabKey(["test", "b", "c"]),
      new TabKey(["test", "c", "a"]),
      new TabKey(["test", "c", "b"]),
      new TabKey(["test", "c", "c"]),
    ]);

    const result = sut.splitGroup(tabGroup);

    expect(result).toHaveLength(3);

    // left over first (c)
    expect(result[0].key).toStrictEqual(new TabKey(["test"]));
    expect(result[0].count).toEqual(3);

    expect(result[1].key).toStrictEqual(new TabKey(["test", "a"]));
    expect(result[1].count).toEqual(3);

    expect(result[2].key).toStrictEqual(new TabKey(["test", "b"]));
    expect(result[2].count).toEqual(3);
  });
});

describe("sortTabs", () => {
  const sut = new TabGrouper({
    isEnabled: true,
    minTabsInGroup: 2,
    maxTabsInGroup: 3,
    groupsLocation: "none",
    sort: "all",
  });

  test("Should sort tabs", () => {
    const tabKeyFactory = new DefaultTabKeyFactory();

    const tabs = createTabReferences([
      tabKeyFactory.createTabKey({
        url: "https://github.com/domaindrivendev/Swashbuckle.AspNetCore/search?q=writer&type=code",
      }),
      tabKeyFactory.createTabKey({
        url: "https://github.com/domaindrivendev/Swashbuckle.AspNetCore/search?q=OpenApiYamlWriter",
      }),
      tabKeyFactory.createTabKey({
        url: "https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/2105",
      }),
    ]);

    const result = [...sut.sortTabs(tabs)];

    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(0);
    expect(result[2].id).toBe(1);
  });

  test("Should sort tabs 2", () => {
    const tabKeyFactory = new DefaultTabKeyFactory();

    const tabs = createTabReferences([
      tabKeyFactory.createTabKey({
        url: "https://github.com/domaindrivendev/Swashbuckle.AspNetCore/issues/2105",
      }),
      tabKeyFactory.createTabKey({
        url: "https://github.com/domaindrivendev/Swashbuckle.AspNetCore/search?q=OpenApiYamlWriter",
      }),
      tabKeyFactory.createTabKey({
        url: "https://github.com/domaindrivendev/Swashbuckle.AspNetCore/search?q=writer&type=code",
      }),
    ]);

    const result = [...sut.sortTabs(tabs)];

    expect(result[0].id).toBe(0);
    expect(result[1].id).toBe(1);
    expect(result[2].id).toBe(2);
  });
});
