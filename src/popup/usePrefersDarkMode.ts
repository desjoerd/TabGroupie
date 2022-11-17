import { useMediaQuery } from "@mui/material";

export function usePrefersDarkMode() {
  return useMediaQuery("(prefers-color-scheme: dark)");
}
