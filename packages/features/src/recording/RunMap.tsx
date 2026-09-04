import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { ActivityMapPresenter, Cancel } from '@runtrack/core';
import { useTheme } from '@runtrack/ui';
import { ActivityMap } from '../map/ActivityMap';
import { useRuntime } from '../runtime/RuntimeProvider';
import { translate } from '../i18n';
import { useRecording } from './RecordingProvider';

/**
 * One map for the whole of a run (§7, §8).
 *
 * Before the start it shows where the runner is — a GPS shows you your dot
 * before anything else. Once the run begins it draws the line behind them,
 * point by point. **The same map, told different things**: swapping one map
 * component for another at the moment the run starts would tear the tiles down
 * and rebuild them, right as the runner sets off.
 *
 * Nothing here re-renders on a position. The dot and the line go through
 * `ActivityMapPresenter` imperatively, so three hours of points cost zero
 * renders.
 */
export function RunMap(): ReactNode {
  const theme = useTheme();
  const tracker = useRuntime().recording?.tracker;
  const status = useRecording((state) => state.status);
  const trace = useRecording((state) => state.trace);
  const onPoint = useRecording((state) => state.onPoint);
  const [presenter, setPresenter] = useState<ActivityMapPresenter | undefined>(undefined);
  const wasStarted = useRef(false);

  const started = status === 'recording' || status === 'paused' || status === 'finishing';

  // Synchronising an external system (§15), not fetching: the GPS pushes, the
  // presenter is told. The effect re-runs when the run starts, which is what
  // stops the preview watch — the recorder's own tracking has taken over.
  useEffect(() => {
    if (presenter === undefined) return undefined;

    if (started) {
      wasStarted.current = true;
      // Redrawn from what was captured, so leaving the tab and coming back
      // shows the whole run rather than the corner it is currently in. An
      // empty trace is left alone: it would wipe the dot for nothing.
      const captured = trace();
      if (captured.length > 0) presenter.showLiveSnapshot(captured);
      return onPoint((point) => {
        presenter.appendLive([point]);
      });
    }

    // La course vient de finir : la carte redevient celle d'avant le départ.
    // Sans cela, le tracé de la sortie précédente reste dessiné sous le bouton
    // « Démarrer », comme si elle courait encore. Au premier montage il n'y a
    // rien à effacer — d'où la mémoire de l'état précédent.
    if (wasStarted.current) presenter.showTrack([]);
    wasStarted.current = false;

    if (tracker === undefined) return undefined;

    let stop: Cancel | undefined;
    let abandoned = false;
    void tracker
      .watchWhileVisible((fix) => {
        presenter.showCurrentPosition(fix.position);
      })
      .then((cancel) => {
        // The run may have started by the time the watch is up.
        if (abandoned) cancel();
        else stop = cancel;
      });

    return () => {
      abandoned = true;
      stop?.();
    };
  }, [presenter, started, tracker, trace, onPoint]);

  return (
    <View style={{ flex: 1 }}>
      <ActivityMap
        live
        // La carte suit le thème de l'application : sombre avec lui, claire
        // avec lui. Une carte qui décide seule de son fond coupe l'écran en deux.
        dark={theme.name === 'dark'}
        points={undefined}
        onPresenter={setPresenter}
        accessibilityLabel={translate(started ? 'map.labelLive' : 'map.labelPosition')}
        testID="run-map"
      />
    </View>
  );
}
