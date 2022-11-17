import React from "react";
import ReactDOM from "react-dom/client";
import { Settings } from "../shared/Settings";
import { App } from "./App";
import { AppThemeProvider } from "./AppThemeProvider";
import { SettingsProvider } from "./SettingsContext";

const settings = new Settings();
settings.load();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppThemeProvider>
      <SettingsProvider settings={settings}>
        <App />
      </SettingsProvider>
    </AppThemeProvider>
  </React.StrictMode>
);
