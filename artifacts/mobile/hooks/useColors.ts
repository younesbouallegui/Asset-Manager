import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { useThemeMode } from "@/contexts/ThemeContext";

export type Scheme = "dark" | "light";

export function useResolvedScheme(): Scheme {
  const system = useColorScheme();
  const { mode } = useThemeMode();
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return system === "dark" ? "dark" : "light";
}

export function useColors() {
  const scheme = useResolvedScheme();
  const palette = scheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius, scheme };
}
