import type { MapMarker } from '@runtrack/core';
import type { MapSurfaceColours } from '../mapSurface';

/**
 * The DOM node behind a MapLibre marker.
 *
 * A WebGL canvas is one opaque rectangle to a screen reader, so anything that
 * has to be *read* — and §5 says a marker that carries meaning does — has to be
 * a real element beside it. MapLibre allows exactly that, and this builds it.
 *
 * The shapes differ per kind on purpose: §15 forbids information carried by
 * colour alone, so a split is a small dot and the endpoints are rings. Colour
 * repeats the distinction, it does not make it.
 */
const MARKER_DIAMETER_PIXELS = 18;
const SPLIT_DIAMETER_PIXELS = 12;
const BORDER_PIXELS = 3;

function colourFor(kind: MapMarker['kind'], colours: MapSurfaceColours): string {
  switch (kind) {
    case 'start':
      return colours.start;
    case 'finish':
      return colours.finish;
    case 'runner':
      return colours.runner;
    case 'split':
      return colours.split;
  }
}

export function createMarkerElement(marker: MapMarker, colours: MapSurfaceColours): HTMLElement {
  const element = document.createElement('div');
  const diameter = marker.kind === 'split' ? SPLIT_DIAMETER_PIXELS : MARKER_DIAMETER_PIXELS;

  element.setAttribute('role', 'img');
  element.setAttribute('aria-label', marker.accessibilityLabel);
  element.dataset['markerKind'] = marker.kind;

  element.style.width = `${String(diameter)}px`;
  element.style.height = `${String(diameter)}px`;
  element.style.borderRadius = '50%';
  element.style.boxSizing = 'border-box';
  element.style.background = colourFor(marker.kind, colours);
  element.style.border = `${String(BORDER_PIXELS)}px solid ${colours.background}`;

  return element;
}
