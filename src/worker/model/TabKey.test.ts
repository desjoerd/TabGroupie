import { assert, describe, expect, test } from "vitest";
import { TabKey } from "./TabKey.js";

// Edit an assertion and save to see HMR in action

describe("TabKey.equals()", () => {
  test("[] equals []", () => {
    let left = new TabKey([]);
    let right = new TabKey([]);

    let result = left.equals(right);
    assert.isTrue(result);
  });

  test("[abc] equals [abc]", () => {
    let left = new TabKey(["abc"]);
    let right = new TabKey(["abc"]);

    let result = left.equals(right);
    assert.isTrue(result);
  });

  test("[abc,def] equals [abc,def]", () => {
    let left = new TabKey(["abc", "def"]);
    let right = new TabKey(["abc", "def"]);

    let result = left.equals(right);
    assert.isTrue(result);
  });

  test("[abc,def,ghi] equals [abc,def,ghi]", () => {
    let left = new TabKey(["abc", "def", "ghi"]);
    let right = new TabKey(["abc", "def", "ghi"]);

    let result = left.equals(right);
    assert.isTrue(result);
  });

  test("[] not equals [abc]", () => {
    let left = new TabKey([]);
    let right = new TabKey(["abc"]);

    let result = left.equals(right);
    assert.isFalse(result);
  });

  test("[abc] not equals [def]", () => {
    let left = new TabKey(["abc"]);
    let right = new TabKey(["def"]);

    let result = left.equals(right);
    assert.isFalse(result);
  });

  test("[abc,def] not equals [abc,ghi]", () => {
    let left = new TabKey(["abc", "def"]);
    let right = new TabKey(["abc", "ghi"]);

    let result = left.equals(right);
    assert.isFalse(result);
  });
});

describe("TabKey.startsWith()", () => {
  test("[] startsWith []", () => {
    assert.isTrue(new TabKey([]).startsWith(new TabKey([])));
  });

  test("[abc] startsWith []", () => {
    assert.isTrue(new TabKey(["abc"]).startsWith(new TabKey([])));
  });

  test("[abc] startsWith [abc]", () => {
    assert.isTrue(new TabKey(["abc"]).startsWith(new TabKey(["abc"])));
  });

  test("[abc,def] startsWith [abc]", () => {
    assert.isTrue(new TabKey(["abc", "def"]).startsWith(new TabKey(["abc"])));
  });

  test("[abc,def] startsWith [abc, def]", () => {
    assert.isTrue(
      new TabKey(["abc", "def"]).startsWith(new TabKey(["abc", "def"]))
    );
  });

  test("[] startsWith [abc] FALSE", () => {
    assert.isFalse(new TabKey([]).startsWith(new TabKey(["abc"])));
  });

  test("[abc,def] startsWith [abc,ghi] FALSE", () => {
    assert.isFalse(
      new TabKey(["abc", "def"]).startsWith(new TabKey(["abc", "ghi"]))
    );
  });
});

describe("TabKey.getOverlappingKey()", () => {
  test("[[abc,def], []] => []", () => {
    const overlapping = TabKey.getOverlappingKey([
      new TabKey(["abc", "def"]),
      TabKey.empty,
    ]);
    assert.isTrue(overlapping.equals(TabKey.empty));
  });

  test("[[abc,def], [abc]] => [abc]", () => {
    const overlapping = TabKey.getOverlappingKey([
      new TabKey(["abc", "def"]),
      new TabKey(["abc"]),
    ]);
    assert.isTrue(overlapping.equals(new TabKey(["abc"])));
  });
});
