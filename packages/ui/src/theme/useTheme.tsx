import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme } from './dark';
import { lightTheme } from './light';
import { runTheme } from './run';
import type { Theme, ThemeName } from './theme';

const THEMES: Record<ThemeName, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  run: runTheme,
};

const ThemeContext = createContext<Theme>(lightTheme);

export interface ThemeProviderProps {
  children: ReactNode;
  /**
   * Forces a theme. The recording screen — and only it — passes `"run"`.
   * Left out, the system preference decides between light and dark.
   */
  name?: ThemeName | undefined;
}

export function ThemeProvider({ children, name }: ThemeProviderProps): ReactNode {
  const systemScheme = useColorScheme();
  const resolved = name ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const theme = useMemo(() => THEMES[resolved], [resolved]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/**
 * Builds a stylesheet from the active theme, and rebuilds it only when the
 * theme changes. Components call this instead of `StyleSheet.create` at module
 * level, because a stylesheet built at import time cannot know the theme.
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
