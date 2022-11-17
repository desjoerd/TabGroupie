import { getAllStorageSyncData } from "./chromeHelpers";

export interface SettingValues {
  minTabsInGroup: number;
  maxTabsInGroup: number;
}

export class Settings {
  #loadingPromise: Promise<SettingValues> | undefined = undefined;

  #settings: SettingValues | undefined;

  load(): Promise<SettingValues> {
    if (this.#settings) {
      return Promise.resolve(this.#settings);
    }

    if (!this.#loadingPromise) {
      this.#loadingPromise = getAllStorageSyncData()
        .then((storageSettings) => {
          let result: SettingValues = {
            minTabsInGroup: 2,
            maxTabsInGroup: 7,
          };

          if (typeof storageSettings.minTabsInGroup === "number") {
            result.minTabsInGroup = storageSettings.minTabsInGroup;
          }
          if (typeof storageSettings.maxTabsInGroup === "number") {
            result.maxTabsInGroup = storageSettings.maxTabsInGroup;
          }

          this.#loadingPromise = undefined;
          return (this.#settings = result);
        })
        .catch((error) => {
          this.#loadingPromise = undefined;
          throw error;
        });
    }

    return this.#loadingPromise;
  }

  get loadedSettings(): SettingValues {
    if (this.#settings === undefined) {
      throw new Error("Settings not loaded");
    }

    return this.#settings;
  }

  reload(): Promise<SettingValues | undefined> {
    this.#settings = undefined;

    return this.load();
  }

  saveUpdate(updates: Partial<SettingValues>): Promise<void> {
    this.handleChanges(updates);

    const cleanUpdates = this.#cleanUpdates(updates);
    return chrome.storage.sync.set(cleanUpdates);
  }

  handleChanges(changes: Partial<SettingValues>) {
    const cleanUpdates = this.#cleanUpdates(changes);
    if (this.#settings !== undefined) {
      Object.assign(this.#settings, cleanUpdates);
    }
  }

  #cleanUpdates(updates: Partial<SettingValues>): Partial<SettingValues> {
    const updatesAsObject = Object.assign({}, updates) as any;
    for (let key in updates) {
      if (updatesAsObject[key] === undefined) {
        delete updatesAsObject[key];
      }
    }
    return updatesAsObject;
  }
}
