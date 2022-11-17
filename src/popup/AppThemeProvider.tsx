import React from "react";
import { CssBaseline, useMediaQuery } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useMemo } from "react";
import type { PropsWithChildren } from "react";
import { usePrefersDarkMode } from "./usePrefersDarkMode";

export interface AppThemeProviderProps extends PropsWithChildren {}

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const prefersDarkMode = usePrefersDarkMode();

  const theme = useMemo(
    () =>
      createTheme({
        typography: {
          fontSize: 13,
        },
        palette: {
          mode: prefersDarkMode ? "dark" : "light",
        },
        spacing: 8,
      }),
    [prefersDarkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
