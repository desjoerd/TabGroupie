import React, { createContext, PropsWithChildren, useContext } from "react";
import { SettingsStore } from "../shared/SettingsStore";

const context = createContext<SettingsStore>(new SettingsStore());

export function useSettings() {
  return useContext(context);
}

export interface SettingsProviderProps extends PropsWithChildren {
  settings: SettingsStore;
}

export function SettingsProvider({
  children,
  settings,
}: SettingsProviderProps) {
  return <context.Provider value={settings}>{children}</context.Provider>;
}
