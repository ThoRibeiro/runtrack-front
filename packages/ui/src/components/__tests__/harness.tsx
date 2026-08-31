import { render, type RenderResult } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { ThemeProvider, type ThemeName } from '../../theme';

/**
 * Every component test mounts through a theme, because every component reads
 * one. Rendering outside a `ThemeProvider` would test the default rather than
 * the thing.
 *
 * `render` is asynchronous in Testing Library 14 — React 19 wants its `act`
 * awaited — so every test here awaits it.
 */
export function renderInTheme(
  node: ReactElement,
  name: ThemeName = 'light',
): Promise<RenderResult> {
  return render(<ThemeProvider name={name}>{node}</ThemeProvider>);
}

/** The three themes, for the tests that must hold in all of them. */
export const THEMES: ThemeName[] = ['light', 'dark', 'run'];
