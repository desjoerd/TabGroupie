import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from "react";
import { useAsync } from "react-use";
import { AsyncState } from "react-use/lib/useAsyncFn";
import { Settings, SettingValues } from "../shared/Settings";

const context = createContext<Settings>(new Settings());

export function useSettings() {
  return useContext(context);
}

export function useSettingsValues(): [
  state: AsyncState<SettingValues>,
  update: (updates: Partial<SettingValues>) => void
] {
  const settings = useSettings();

  const [changeCount, setChangeCount] = useState(0);

  const settingsAsyncValues = useAsync(
    () => settings.load(),
    [settings, changeCount]
  );

  const update = useCallback(
    (updates: Partial<SettingValues>) => {
      settings.saveUpdate(updates);
      setChangeCount((old) => old + 1);
    },
    [settings, setChangeCount]
  );

  return [settingsAsyncValues, update];
}

export interface SettingsProviderProps extends PropsWithChildren {
  settings: Settings;
}

export function SettingsProvider({
  children,
  settings,
}: SettingsProviderProps) {
  return <context.Provider value={settings}>{children}</context.Provider>;
}
