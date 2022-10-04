export function groupBy<T, TKey>(
  collection: Iterable<T>,
  keySelector: (item: T) => TKey
): Map<TKey, T[]> {
  const result = new Map<TKey, T[]>();

  for (const item of collection) {
    const key = keySelector(item);
    if (!result.has(key)) {
      result.set(key, []);
    }
    result.get(key)!.push(item);
  }
  return result;
}

export function maxBy<T>(
  collection: Iterable<T>,
  comparer: (left: T, right: T) => number
): T | undefined {
  let max: T | undefined = undefined;
  for (const item of collection) {
    if (max === undefined) {
      max = item;
    } else {
      if (comparer(item, max) > 0) {
        max = item;
      }
    }
  }
  return max;
}

export function first<T>(collection: Iterable<T>) {
  for (const item of collection) {
    return item;
  }
}

export function some<T>(
  collection: Iterable<T>,
  predicate: (value: T) => boolean
) {
  for (const item of collection) {
    if (predicate(item)) {
      return true;
    }
  }
  return false;
}

export function selectMany<T>(collectionOfCollections: T[][]): Generator<T>;
export function selectMany<T>(
  collectionOfCollections: Iterable<T>[]
): Generator<T>;
export function* selectMany<T>(
  collectionOfCollections: Iterable<Iterable<T>>
): Generator<T> {
  for (const collection of collectionOfCollections) {
    for (const item of collection) {
      yield item;
    }
  }
}
