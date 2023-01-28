import React from "react";
import {
  AppBar,
  Box,
  FormControlLabel,
  FormGroup,
  LinearProgress,
  Paper,
  Switch,
  Toolbar,
  Typography,
} from "@mui/material";
import { Stack } from "@mui/system";
import { useSettings } from "./SettingsContext";
import { usePrefersDarkMode } from "./usePrefersDarkMode";
import { observer } from "mobx-react-lite";
import { SettingsForm } from "./SettingsForm";

export const App = observer(function App() {
  const prefersDarkMode = usePrefersDarkMode();

  const settingsManager = useSettings();

  if (!settingsManager.settings) {
    return <Paper></Paper>;
  }

  return (
    <Paper>
      <Stack
        style={{
          width: "360px",
          maxHeight: "500px",
          overflowY: "auto",
        }}
      >
        <AppBar position="sticky" color="primary">
          <Toolbar>
            <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
              Tabgroupie
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch color={prefersDarkMode ? "primary" : "default"} />
                }
                disabled={!settingsManager.isLoaded}
                checked={settingsManager.settings.isEnabled}
                onChange={(_, value) =>
                  settingsManager.update({ isEnabled: value })
                }
                label={
                  settingsManager.settings.isEnabled ? "enabled" : "disabled"
                }
                labelPlacement="start"
              />
            </FormGroup>
          </Toolbar>
        </AppBar>

        {settingsManager.pendingChanges ? (
          <LinearProgress style={{ height: "2px" }} />
        ) : (
          <Box height="2px" />
        )}

        <SettingsForm />
      </Stack>
    </Paper>
  );
});
