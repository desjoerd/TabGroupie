import {
  makeObservable,
  observable,
  action,
  runInAction,
  computed,
  autorun,
  toJS,
  reaction,
} from "mobx";
import { i } from "vitest/dist/index-220c1d70";
import { getAllStorageSyncData } from "./chromeHelpers";

export interface SettingValues {
  isEnabled: boolean;

  minTabsInGroup: number;
  maxTabsInGroup: number;

  groupsLocation: "top" | "bottom" | "none";
  sort: "all" | "groups" | "none";
}

export class SettingsStore {
  autorunDispose: (() => void) | undefined = undefined;
  settings: SettingValues | undefined;
  pendingChanges: boolean = false;
  savingChangesPromise: Promise<void> | undefined = undefined;

  constructor() {
    makeObservable(this, {
      settings: observable,
      pendingChanges: observable,
      savingChangesPromise: observable,
      isLoaded: computed,
      load: action,
      update: action,
      save: action,
    });
  }

  get isLoaded() {
    return this.settings !== undefined;
  }

  async load(): Promise<void> {
    const storageSettings = await getAllStorageSyncData();

    const loadedSettings: SettingValues = {
      isEnabled:
        typeof storageSettings.isEnabled === "boolean"
          ? storageSettings.isEnabled
          : true,
      minTabsInGroup:
        typeof storageSettings.minTabsInGroup === "number"
          ? storageSettings.minTabsInGroup
          : 2,
      maxTabsInGroup:
        typeof storageSettings.maxTabsInGroup === "number"
          ? storageSettings.maxTabsInGroup
          : 7,
      groupsLocation:
        typeof storageSettings.groupsLocation === "string"
          ? (storageSettings.groupsLocation as "top" | "bottom" | "none")
          : "none",

      sort:
        typeof storageSettings.sort === "string"
          ? (storageSettings.sort as "all" | "groups" | "none")
          : "none",
    };

    runInAction(() => (this.settings = loadedSettings));
  }

  update(updates: Partial<SettingValues>): void {
    if (!this.settings) {
      throw new Error("not loaded");
    }

    this.settings = {
      ...toJS(this.settings),
      ...toJS(updates),
    };
    this.pendingChanges = true;
  }

  async save(): Promise<void> {
    const settings = this.settings;
    console.log("saving");
    if (!this.pendingChanges || !settings) {
      return;
    }

    try {
      console.log("saving");
      if (this.savingChangesPromise) {
        await this.savingChangesPromise;
      }

      runInAction(() => {
        this.savingChangesPromise = chrome.storage.sync.set(toJS(settings));
      });
      await this.savingChangesPromise;
      console.log("saved");
      runInAction(() => {
        this.savingChangesPromise = undefined;
        this.pendingChanges = false;
      });
    } catch (error) {
      console.log(error);
      runInAction(() => {
        this.savingChangesPromise = undefined;
      });
    }
  }

  enableAutosave(enabled: boolean) {
    if (enabled && !this.autorunDispose) {
      this.autorunDispose = reaction(
        () => this.settings,
        () => {
          this.save();
        },
        { delay: 1000 }
      );
    }
    if (!enabled && this.autorunDispose) {
      this.autorunDispose();
    }
  }
}
