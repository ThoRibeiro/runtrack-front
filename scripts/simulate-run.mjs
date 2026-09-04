/**
 * Plays a running course through the iOS simulator's GPS, anywhere on earth.
 *
 * The four built-in scenarios (`simctl location list`) are welded to Cupertino
 * and to their own pace, which makes them useless for reading a trace against a
 * place you know. This builds a closed loop of a chosen length around a chosen
 * point and feeds it to `simctl location start`, which interpolates between the
 * waypoints and delivers one fix per second — exactly what `ExpoLocationTracker`
 * asks CoreLocation for.
 *
 * Two things the simulator cannot give, whatever the waypoints:
 *  - **altitude is always 0**, so elevation gain stays flat;
 *  - **a suspended app gets nothing**, so the locked-screen path of §6 is only
 *    testable on a real device.
 *
 *   node scripts/simulate-run.mjs --at=50.6292,3.0573 --km=5 --pace=5:30
 *   node scripts/simulate-run.mjs --at=48.8566,2.3522 --km=10 --laps=2 --dry-run
 *   node scripts/simulate-run.mjs --clear
 */
import { execFileSync, spawnSync } from 'node:child_process';

const METRES_PER_DEGREE_LATITUDE = 111_320;
/** Enough for the loop to read as a route rather than a polygon. */
const WAYPOINTS_PER_LAP = 180;

const flags = new Map(
  process.argv
    .slice(2)
    .map((argument) => argument.replace(/^--/, '').split('='))
    .map(([key, value]) => [key, value ?? 'true']),
);

const device = flags.get('device') ?? 'booted';

if (flags.has('clear')) {
  execFileSync('xcrun', ['simctl', 'location', device, 'clear'], { stdio: 'inherit' });
  console.log('Simulated location cleared.');
  process.exit(0);
}

const at = flags.get('at');
if (at === undefined) {
  console.error('Missing --at=<lat>,<lon> — where the run starts. --help for examples.');
  process.exit(1);
}

const [startLatitude, startLongitude] = at.split(',').map(Number);
if (!Number.isFinite(startLatitude) || !Number.isFinite(startLongitude)) {
  console.error(`--at=${at} is not a 'lat,lon' pair.`);
  process.exit(1);
}

const distanceMetres = Number(flags.get('km') ?? 5) * 1000;
const laps = Number(flags.get('laps') ?? 1);

/** Pace wins over speed: it is the unit a runner actually thinks in. */
function metresPerSecond() {
  const pace = flags.get('pace');
  if (pace === undefined) return Number(flags.get('speed') ?? 3);
  const [minutes, seconds] = pace.split(':').map(Number);
  return 1000 / (minutes * 60 + (seconds ?? 0));
}

const speed = metresPerSecond();

/**
 * A closed curve in arbitrary units — a wobbling ring, so consecutive fixes
 * change bearing the way streets do. A true circle produces a constant turn
 * rate no real course has.
 */
function shapeAt(fraction) {
  const angle = fraction * 2 * Math.PI;
  const radius = 1 + 0.28 * Math.sin(3 * angle) + 0.11 * Math.cos(5 * angle);
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

const unitPoints = Array.from({ length: WAYPOINTS_PER_LAP }, (_, index) =>
  shapeAt(index / WAYPOINTS_PER_LAP),
);

// The shape is drawn first and scaled second: measuring its perimeter in its own
// units is what lets --km mean the distance the app will actually record.
let perimeter = 0;
for (let index = 0; index < unitPoints.length; index += 1) {
  const from = unitPoints[index];
  const to = unitPoints[(index + 1) % unitPoints.length];
  perimeter += Math.hypot(to.x - from.x, to.y - from.y);
}

const scale = distanceMetres / laps / perimeter;
const metresPerDegreeLongitude =
  METRES_PER_DEGREE_LATITUDE * Math.cos((startLatitude * Math.PI) / 180);

// Translated so the first waypoint is the point that was asked for, rather than
// the centre of the loop: a run starts where you say it starts.
const origin = unitPoints[0];
const waypoints = [];
for (let lap = 0; lap < laps; lap += 1) {
  for (const point of unitPoints) {
    const latitude = startLatitude + ((point.y - origin.y) * scale) / METRES_PER_DEGREE_LATITUDE;
    const longitude = startLongitude + ((point.x - origin.x) * scale) / metresPerDegreeLongitude;
    waypoints.push(`${latitude.toFixed(6)},${longitude.toFixed(6)}`);
  }
}
waypoints.push(waypoints[0]);

const durationSeconds = Math.round(distanceMetres / speed);
const paceSeconds = Math.round(1000 / speed);
const asClock = (total) => `${Math.floor(total / 60)}'${String(total % 60).padStart(2, '0')}`;

console.log(
  `${(distanceMetres / 1000).toFixed(2)} km · ${asClock(paceSeconds)}/km · ` +
    `${asClock(durationSeconds)} · ${waypoints.length} waypoints · device ${device}`,
);

if (flags.has('dry-run')) {
  console.log(waypoints.join('\n'));
  process.exit(0);
}

const run = spawnSync(
  'xcrun',
  ['simctl', 'location', device, 'start', `--speed=${speed.toFixed(2)}`, '--interval=1', '-'],
  { input: waypoints.join('\n'), stdio: ['pipe', 'inherit', 'inherit'] },
);

if (run.status !== 0) process.exit(run.status ?? 1);
console.log('Running. Stop it with: node scripts/simulate-run.mjs --clear');
