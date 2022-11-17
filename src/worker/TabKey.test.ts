import { assert, describe, expect, test } from "vitest";
import { TabKey } from "./TabKey";

// Edit an assertion and save to see HMR in action

describe("TabKey.equals()", () => {
  test("[] === []", () => {
    let left = new TabKey([]);
    let right = new TabKey([]);

    let result = left.equals(right);
    assert.isTrue(result);
  });

  test("[abc] === [abc]", () => {
    let left = new TabKey(["abc"]);
    let right = new TabKey(["abc"]);

    let result = left.equals(right);
    assert.isTrue(result);
  });

  test("[abc,def] === [abc,def]", () => {
    let left = new TabKey(["abc", "def"]);
    let right = new TabKey(["abc", "def"]);

    let result = left.equals(right);
    assert.isTrue(result);
  });

  test("[abc,def,ghi] === [abc,def,ghi]", () => {
    let left = new TabKey(["abc", "def", "ghi"]);
    let right = new TabKey(["abc", "def", "ghi"]);

    let result = left.equals(right);
    assert.isTrue(result);
  });

  test("[] !== [abc]", () => {
    let left = new TabKey([]);
    let right = new TabKey(["abc"]);

    let result = left.equals(right);
    assert.isFalse(result);
  });

  test("[abc] !== [def]", () => {
    let left = new TabKey(["abc"]);
    let right = new TabKey(["def"]);

    let result = left.equals(right);
    assert.isFalse(result);
  });

  test("[abc,def] !== [abc,ghi]", () => {
    let left = new TabKey(["abc", "def"]);
    let right = new TabKey(["abc", "ghi"]);

    let result = left.equals(right);
    assert.isFalse(result);
  });
});
