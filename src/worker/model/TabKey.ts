export class TabKey {
  static readonly empty: TabKey = new TabKey([]);

  readonly parts: string[];

  constructor(parts: string[]);
  constructor(parent: TabKey, child: string);
  constructor(
    parentOrParts: TabKey | string[],
    child: string | undefined = undefined
  ) {
    if (Array.isArray(parentOrParts)) {
      this.parts = parentOrParts.filter((x) => x !== "");
    } else {
      if (typeof child !== "string") {
        throw new Error("Expected child to be a string");
      }

      this.parts = [...parentOrParts.parts, child];
    }
  }

  get length() {
    return this.parts.length;
  }

  get lastPart() {
    const length = this.parts.length;
    if (length !== 0) {
      return this.parts[this.parts.length - 1];
    } else {
      return "";
    }
  }

  get firstPart() {
    if (this.parts.length !== 0) {
      return this.parts[0];
    } else {
      return "";
    }
  }

  getPartAt(index: number): string {
    if (index < 0 || index >= this.length) {
      throw new Error("index out of bounds");
    }
    return this.parts[index];
  }

  partAfter(parent: TabKey) {
    if (!this.startsWith(parent)) {
      throw new Error("key should start with parent key");
    }
    if (parent.length >= this.length) {
      throw new Error("parent key should be smaller than key");
    }
    return this.parts[parent.length];
  }

  getOverlappingKey(other: TabKey): TabKey {
    if (this.length === 0) {
      return this;
    }
    if (other.length === 0) {
      return other;
    }

    let shortestLength =
      this.length < other.length ? this.length : other.length;

    let resultParts = [];
    for (let j = 0; j < shortestLength; j++) {
      if (this.parts[j] === other.parts[j]) {
        resultParts.push(this.parts[j]);
      }
    }
    return new TabKey(resultParts);
  }

  startsWith(other: TabKey) {
    if (this.length < other.length) {
      return false;
    }

    for (let j = other.length - 1; j >= 0; j--) {
      if (this.parts[j] !== other.parts[j]) {
        return false;
      }
    }
    return true;
  }

  equals(other: TabKey) {
    if (this.length !== other.length) {
      return false;
    }

    if (this.length === 0) {
      return true;
    }

    for (let j = this.parts.length - 1; j >= 0; j--) {
      if (this.parts[j] !== other.parts[j]) {
        return false;
      }
    }

    return true;
  }

  compare(other: TabKey) {
    for (let i = 0; i < this.length && i < other.length; i++) {
      let compareResult = this.parts[i].localeCompare(other.parts[i]);
      if (compareResult !== 0) {
        return compareResult;
      }
    }

    return this.length - other.length;
  }

  get prettyString() {
    switch (this.parts.length) {
      case 0:
        return "/";
      case 1:
        return this.parts[0];
      case 2:
      case 3:
        return this.parts.join("");
      default:
        const firstPart = this.parts[0];
        const beforeLast = this.parts[this.parts.length - 2];
        const last = this.parts[this.parts.length - 1];

        return [firstPart, "/..", beforeLast, last].join("");
    }
  }

  toString() {
    return `[${this.parts.map((part) => `"${part}"`).join(",")}]`;
  }
  [Symbol.toStringTag]() {
    return this.toString();
  }

  static getOverlappingKey(keys: TabKey[]) {
    if (keys.length === 0) {
      return TabKey.empty;
    }
    let result = keys[0];
    for (let i = 1; i < keys.length; i++) {
      if (result.equals(TabKey.empty)) {
        break;
      }

      result = result.getOverlappingKey(keys[i]);
    }
    return result;
  }
}
