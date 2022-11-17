// Reads all data out of storage.sync and exposes it via a promise.
//
// Note: Once the Storage API gains promise support, this function
// can be greatly simplified.
export function getAllStorageSyncData(): Promise<{ [key: string]: any }> {
  return chrome.storage.sync.get(null);
}
