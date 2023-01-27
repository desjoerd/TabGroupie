import { autorun } from "mobx";
import React from "react";
import ReactDOM from "react-dom/client";
import { SettingsStore } from "../shared/SettingsStore";
import { App } from "./App";
import { AppThemeProvider } from "./AppThemeProvider";
import { SettingsProvider } from "./SettingsContext";

const settingsStore = new SettingsStore();
settingsStore.load();
settingsStore.enableAutosave(true);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppThemeProvider>
      <SettingsProvider settings={settingsStore}>
        <App />
      </SettingsProvider>
    </AppThemeProvider>
  </React.StrictMode>
);
