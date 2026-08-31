import type { GeoPoint } from '../../measure/geo';
import type { Instant } from '../../shared/time/clock';

/** A fix as the device captured it, before any sequence number is assigned. */
export interface LocationFix {
  position: GeoPoint;
  elevationMetres: number;
  /** The device's own clock. It drifts — see `ClockSkew`. */
  recordedAt: Instant;
  accuracyMetres: number;
  heartRate?: number | undefined;
  cadence?: number | undefined;
}

/** The same fix once the recorder has given it its place in the sequence. */
export interface RecordedPoint extends LocationFix {
  sequenceNumber: number;
}

/** A point the server sent back on the live stream. */
export interface LivePosition {
  sequenceNumber: number;
  position: GeoPoint;
  elevationMetres: number;
  recordedAt: Instant;
  heartRate: number | undefined;
}

/** The historical track: encoded on the wire, decoded by `measure/polyline`. */
export interface Track {
  polyline: string;
  pointCount: number;
  /** Raw points are purged 90 days after archiving; past that, only the polyline remains. */
  pointsPurgedAt: Instant | undefined;
}

export interface Split {
  kilometreIndex: number;
  distanceMetres: number;
  timeSeconds: number;
  paceSecondsPerKm: number;
  elevationGain: number;
  averageHeartRate: number | undefined;
  /** A last partial kilometre is not comparable to the others. */
  complete: boolean;
}
