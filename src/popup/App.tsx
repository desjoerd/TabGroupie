import React from "react";
import {
  AppBar,
  Box,
  Card,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  InputLabel,
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
import { useSettingsValues } from "./SettingsContext";
import { usePrefersDarkMode } from "./usePrefersDarkMode";

let marks: { value: number; label: string }[] = [];

let markValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, 15];
for (let value of markValues) {
  marks.push({
    value,
    label: `${value}`,
  });
}

type FromTo = [from: number, to: number];

export function App() {
  const prefersDarkMode = usePrefersDarkMode();

  const [settings, updateSettings] = useSettingsValues();

  const allControlsDisabled = settings.loading;

  const sendMessage = useCallback(() => {
    chrome.runtime.sendMessage({ greeting: "hello" }, function (response) {
      console.log(response.farewell);
    });
  }, []);

  //chrome.storage.sync.get("key");

  const [isEnabled, setIsEnabled] = useState<boolean>(true);

  const handleIsEnabledChanged = (event: unknown, checked: boolean) => {
    setIsEnabled(checked);
  };

  //const [value, setValue] = useState<FromTo>([1, 7]);

  const handleMinMaxTabsChange = (
    event: Event,
    newValue: number | number[]
  ) => {
    const fromTo = newValue as FromTo;
    updateSettings({
      minTabsInGroup: fromTo[0],
      maxTabsInGroup: fromTo[1],
    });
  };

  const [groupLocation, setGroupLocation] = useState("top");

  const handleGroupLocationChange = (event: SelectChangeEvent) => {
    setGroupLocation(event.target.value as string);
  };

  const [pinGroupsEnabled, setPinGroupsEnabled] = useState<boolean>(false);

  const handlePinGroupsEnabledChanged = (event: unknown, checked: boolean) => {
    setPinGroupsEnabled(checked);
  };

  const sliderValues = useMemo(
    () => [
      settings.value?.minTabsInGroup ?? 2,
      settings.value?.maxTabsInGroup ?? 7,
    ],
    [settings.value]
  );

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
                disabled={allControlsDisabled}
                checked={isEnabled}
                onChange={handleIsEnabledChanged}
                label={isEnabled ? "enabled" : "disabled"}
                labelPlacement="start"
              />
            </FormGroup>
          </Toolbar>
        </AppBar>
        <Stack
          spacing={2}
          padding={3}
          divider={<Divider orientation="horizontal" flexItem />}
        >
          <Stack>
            <Typography id="track-false-slider" variant="body1" gutterBottom>
              Desired number of tabs in group
            </Typography>
            <Box marginX={1}>
              <Slider
                aria-labelledby="track-false-slider"
                getAriaValueText={(x) => x.toString()}
                value={sliderValues}
                onChange={handleMinMaxTabsChange}
                disabled={allControlsDisabled}
                min={2}
                max={15}
                step={1}
                marks={marks}
              />
            </Box>
          </Stack>
          {/* <FormGroup>
            <Stack direction="row">
              <FormControlLabel
                control={<Checkbox />}
                checked={pinGroupsEnabled}
                onChange={handlePinGroupsEnabledChanged}
                label="Move groups to"
              />
              <FormControl style={{ flexGrow: 1 }}>
                <Select
                  inputProps={{ "aria-label": "Move location" }}
                  id="demo-simple-select"
                  value={groupLocation}
                  onChange={handleGroupLocationChange}
                  size="small"
                  disabled={!pinGroupsEnabled}
                  // variant="filled"
                >
                  <MenuItem value={"top"}>Top</MenuItem>
                  <MenuItem value={"bottom"}>Bottom</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </FormGroup> */}
        </Stack>
      </Stack>
    </Paper>
  );
}
