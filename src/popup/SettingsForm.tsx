import {
  AppBar,
  Box,
  Card,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
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
import React, { useState } from "react";
import { Container, maxHeight, Stack } from "@mui/system";
import { observer } from "mobx-react-lite";
import { useSettings } from "./SettingsContext";
import { usePrefersDarkMode } from "./usePrefersDarkMode";
import { action, computed, makeObservable } from "mobx";

let marks: { value: number; label: string }[] = [];

let markValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, 15];
for (let value of markValues) {
  marks.push({
    value,
    label: `${value}`,
  });
}

export const SettingsForm = observer(function SettingsForm() {
  const settingsManager = useSettings();

  const [sliderValues] = useState(() =>
    makeObservable(
      {
        get value() {
          const settings = settingsManager.settings;
          if (settings) {
            return [settings.minTabsInGroup, settings.maxTabsInGroup];
          } else {
            return undefined;
          }
        },

        updateValue(minMax: number[]) {
          console.log(minMax);
          settingsManager.update({
            minTabsInGroup: minMax[0],
            maxTabsInGroup: minMax[1],
          });
        },
      },
      {
        value: computed,
        updateValue: action,
      }
    )
  );

  if (!settingsManager.settings) {
    return null;
  }

  return (
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
            value={sliderValues.value}
            onChange={(e, value) => sliderValues.updateValue(value as number[])}
            disabled={!settingsManager.settings.isEnabled}
            min={2}
            max={15}
            step={1}
            marks={marks}
          />
        </Box>
      </Stack>
      <FormGroup>
        <FormControl style={{ flexGrow: 1 }}>
          <InputLabel id="grouplocation-select">Group location</InputLabel>
          <Select
            id="grouplocation-select"
            value={
              settingsManager.settings.groupsLocation === undefined
                ? "none"
                : settingsManager.settings.groupsLocation
            }
            onChange={(event) =>
              settingsManager.update({
                groupsLocation: event.target.value as "top" | "bottom" | "none",
              })
            }
            size="small"
            disabled={!settingsManager.settings.isEnabled}
            label="Group location"
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="top">Top</MenuItem>
            <MenuItem value="bottom">Bottom</MenuItem>
          </Select>
        </FormControl>
      </FormGroup>
      <FormGroup>
        <FormControl style={{ flexGrow: 1 }}>
          <InputLabel id="sort-select">Sort</InputLabel>
          <Select
            id="sort-select"
            value={settingsManager.settings.sort}
            onChange={(event) =>
              settingsManager.update({
                sort: event.target.value as "all" | "groups" | "none",
              })
            }
            size="small"
            disabled={!settingsManager.settings.isEnabled}
            label="Sort"
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="groups">Groups</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </Select>
          {settingsManager.settings.groupsLocation === "none" &&
            settingsManager.settings.sort === "groups" && (
              <FormHelperText>
                Sorting of groups requires a fixed group location (Top or
                Bottom)
              </FormHelperText>
            )}
        </FormControl>
      </FormGroup>
    </Stack>
  );
});
