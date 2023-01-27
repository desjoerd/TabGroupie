import React from "react";
import {
  AppBar,
  Box,
  Card,
  Checkbox,
  Divider,
  Fade,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Slider,
  Switch,
  Toolbar,
  Typography,
} from "@mui/material";
import { Container, maxHeight, Stack } from "@mui/system";
import { useCallback, useMemo, useState } from "react";
import { useSettings } from "./SettingsContext";
import { usePrefersDarkMode } from "./usePrefersDarkMode";
import { observer } from "mobx-react-lite";
import { SettingsForm } from "./SettingsForm";

// let marks: { value: number; label: string }[] = [];

// let markValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, 15];
// for (let value of markValues) {
//   marks.push({
//     value,
//     label: `${value}`,
//   });
// }

// type FromTo = [from: number, to: number];

export const App = observer(function App() {
  const prefersDarkMode = usePrefersDarkMode();

  const settingsManager = useSettings();

  // const [isEnabled, setIsEnabled] = useState<boolean>(
  //   settingsManager.loadedSettings.isEnabled === true
  // );

  // const [minMaxTabs, setMinMaxTabs] = useState([
  //   settingsManager.loadedSettings.minTabsInGroup,
  //   settingsManager.loadedSettings.maxTabsInGroup,
  // ]);

  // //const [settings, updateSettings] = useSettingsValues();

  // const handleIsEnabledChanged = (event: unknown, checked: boolean) => {
  //   setIsEnabled(checked);
  // };

  // //const [value, setValue] = useState<FromTo>([1, 7]);

  // const handleMinMaxTabsChange = (
  //   event: Event,
  //   newValue: number | number[]
  // ) => {
  //   const fromTo = newValue as FromTo;
  //   setMinMaxTabs(fromTo);
  // };

  // const [groupLocation, setGroupLocation] = useState(
  //   settingsManager.loadedSettings.groupsLocation
  // );

  // const handleGroupLocationChange = (event: SelectChangeEvent) => {
  //   if (event.target.value === "top" || event.target.value === "bottom") {
  //     setGroupLocation(event.target.value);
  //   }
  // };

  // const [pinGroupsEnabled, setPinGroupsEnabled] = useState<boolean>(false);

  // const handlePinGroupsEnabledChanged = (event: unknown, checked: boolean) => {
  //   setPinGroupsEnabled(checked);
  // };

  // const sliderValues = useMemo(
  //   () => [
  //     settings.value?.minTabsInGroup ?? 2,
  //     settings.value?.maxTabsInGroup ?? 7,
  //   ],
  //   [settings.value]
  // );

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
