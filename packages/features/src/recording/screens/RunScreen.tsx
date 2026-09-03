import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { ActivityId } from '@runtrack/core';
import { useTheme } from '@runtrack/ui';
import { RunMap } from '../RunMap';
import { useRecording } from '../RecordingProvider';
import { RunningOverlay } from './RunningOverlay';
import { StartOverlay } from './StartOverlay';

/**
 * The run, from the map to the finish — one screen.
 *
 * Starting a run used to leave for another route, which meant the map was torn
 * down and rebuilt at the exact moment the runner set off, and the trace began
 * on a map they had never seen frame itself. Here the map stays; only what
 * floats over it changes — one button before, three controls and the numbers
 * after.
 *
 * Finishing is the one thing that does leave: a run that is over has a
 * summary, with its track and its splits, and that is a different screen.
 */
export interface RunScreenProps {
  /** The finished run, for its summary. */
  onFinished: (id: ActivityId) => void;
  onOpenSettings?: (() => void) | undefined;
}

export function RunScreen({ onFinished, onOpenSettings }: RunScreenProps): ReactNode {
  const theme = useTheme();
  const status = useRecording((state) => state.status);
  const running = status === 'recording' || status === 'paused' || status === 'finishing';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colours.canvas }} testID="run-screen">
      <RunMap />
      {running ? (
        <RunningOverlay onFinished={onFinished} />
      ) : (
        <StartOverlay onOpenSettings={onOpenSettings} />
      )}
    </View>
  );
}
